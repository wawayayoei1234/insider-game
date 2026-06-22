"use client";
import { Box, Typography } from "@mui/material";

const CHIBI = ["🐱","🐰","🦊","🐻","🐼","🐸","🦁","🐮","🐷","🐶","🐨","🐭","🐹","🐯","🦋"];

function getAvatar(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CHIBI[Math.abs(h) % CHIBI.length];
}

export default function VirtualTable({
  players, selfId, room, onVote, voteTarget,
  canVote, isVoting, votedMap = {}, blockedMap = {},
  isHost, onKick,
}) {
  const n = players.length;

  const seats = players.map((p, i) => {
    const angle = (2 * Math.PI * i) / (n || 1) - Math.PI / 2;
    return {
      p,
      x: 50 + 43 * Math.cos(angle),
      y: 50 + 38 * Math.sin(angle),
    };
  });

  const stateLabel =
    room?.state === "voting" ? { icon: "🗳️", text: "โหวตหา Insider!", color: "#fca5a5" }
    : room?.state === "countdown" ? { icon: "🔍", text: "กำลังทายคำ...", color: "#fde68a" }
    : room?.state === "scoreboard" ? { icon: "🏆", text: "จบรอบ!", color: "#86efac" }
    : null;

  return (
    <Box sx={{ position: "relative", width: "100%", paddingBottom: "90%", userSelect: "none" }}>

      {/* Wooden table oval */}
      <Box sx={{
        position: "absolute",
        top: "10%", left: "18%",
        width: "64%", height: "80%",
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 32%, #daa870 0%, #b07840 40%, #7a4e20 100%)",
        border: "5px solid #4a3e3d",
        boxShadow: "0 16px 0 #2c1810, inset 0 -10px 24px rgba(0,0,0,0.3), inset 0 8px 20px rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 0.5,
        overflow: "hidden",
        zIndex: 1,
      }}>
        {/* Wood grain rings */}
        {[30, 42, 54, 66].map((t) => (
          <Box key={t} sx={{
            position: "absolute",
            top: `${t}%`, left: "10%",
            width: "80%", height: "1px",
            bgcolor: "rgba(255,255,255,0.07)",
            borderRadius: "50%",
          }} />
        ))}
        <Typography sx={{ fontSize: { xs: "1.8rem", sm: "2.4rem" }, lineHeight: 1, zIndex: 1 }}>🕵️</Typography>
        <Typography sx={{
          color: "rgba(255,255,255,0.92)", fontWeight: 900,
          fontSize: { xs: "0.6rem", sm: "0.72rem" },
          letterSpacing: "0.06em", textAlign: "center",
          textShadow: "0 2px 5px rgba(0,0,0,0.7)", zIndex: 1,
        }}>
          Insider Party
        </Typography>
        {stateLabel && (
          <Typography sx={{
            color: stateLabel.color,
            fontSize: { xs: "0.55rem", sm: "0.65rem" },
            fontWeight: 800, zIndex: 1,
            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
          }}>
            {stateLabel.icon} {stateLabel.text}
          </Typography>
        )}
      </Box>

      {/* Player seats */}
      {seats.map(({ p, x, y }) => {
        const isMe = p.id === selfId;
        const isJudge = p.id === room?.judgeId;
        const isOffline = p.connected === false;
        const isSpec = p.spectator === true;
        const isVotable = canVote && !isMe && !isJudge && !isSpec;
        const isSelected = voteTarget === p.id;
        const hasVoted = !!votedMap[p.id];
        const isBlocked = !!blockedMap[p.id];

        return (
          <Box
            key={p.id}
            onClick={() => isVotable && onVote?.(p.id)}
            onContextMenu={(e) => {
              if (isHost && !isMe) { e.preventDefault(); onKick?.(p.id); }
            }}
            sx={{
              position: "absolute",
              left: `${x}%`, top: `${y}%`,
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 0.3,
              cursor: isVotable ? "pointer" : "default",
              opacity: isOffline ? 0.38 : 1,
              transition: "transform 0.15s, filter 0.15s",
              filter: isSelected ? "drop-shadow(0 0 8px #e879a0)" : "none",
              "&:hover": isVotable ? { transform: "translate(-50%, -62%) scale(1.14)" } : {},
              zIndex: 10,
            }}
          >
            {/* Judge crown (above avatar) */}
            {isJudge && (
              <Typography sx={{ fontSize: { xs: "0.8rem", sm: "1rem" }, lineHeight: 1, mb: -0.3 }}>👑</Typography>
            )}

            {/* Avatar circle */}
            <Box sx={{
              width: { xs: 42, sm: 54 }, height: { xs: 42, sm: 54 },
              borderRadius: "50%",
              border: isSelected
                ? "3.5px solid #e879a0"
                : isMe
                  ? "3.5px solid #7bb3f0"
                  : "3px solid #4a3e3d",
              boxShadow: isSelected
                ? "0 0 0 3px rgba(232,121,160,0.38), 3px 4px 0 #4a3e3d"
                : "3px 4px 0 #4a3e3d",
              bgcolor: isMe ? "#dbeafe" : isJudge ? "#fef9c3" : "#fdf2f8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: { xs: "1.1rem", sm: "1.4rem" },
              position: "relative",
            }}>
              {getAvatar(p.name)}

              {/* Voted check */}
              {isVoting && hasVoted && !isJudge && !isBlocked && (
                <Box sx={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 17, height: 17,
                  bgcolor: "#22c55e", border: "2px solid white", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.5rem", color: "white", fontWeight: 900,
                }}>✓</Box>
              )}

              {/* Blocked X */}
              {isVoting && isBlocked && (
                <Box sx={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 17, height: 17,
                  bgcolor: "#f87171", border: "2px solid white", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.5rem", color: "white", fontWeight: 900,
                }}>✕</Box>
              )}
            </Box>

            {/* Name tag */}
            <Box sx={{
              bgcolor: isMe ? "#dbeafe" : "rgba(255,255,255,0.97)",
              border: "2px solid #4a3e3d",
              borderRadius: "8px",
              px: 0.8, py: 0.15,
              boxShadow: "1px 2px 0 #4a3e3d",
              maxWidth: { xs: 60, sm: 80 },
            }}>
              <Typography sx={{
                fontSize: { xs: "0.5rem", sm: "0.58rem" },
                fontWeight: 800, color: "#4a3e3d",
                textAlign: "center",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                lineHeight: 1.4,
              }}>
                {p.name}
              </Typography>
            </Box>

            {/* Spectator badge */}
            {isSpec && (
              <Typography sx={{
                fontSize: "0.46rem", bgcolor: "#e0f2fe", color: "#0369a1",
                px: 0.6, py: 0.1, borderRadius: "6px",
                border: "1.5px solid #0369a1", fontWeight: 800, lineHeight: 1.3,
              }}>ชม</Typography>
            )}
          </Box>
        );
      })}

      {/* Empty state */}
      {n === 0 && (
        <Box sx={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 5,
        }}>
          <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>รอผู้เล่น...</Typography>
        </Box>
      )}
    </Box>
  );
}
