"use client";
import React from "react";
import { Box, Typography, Chip, Paper, Stack, IconButton, Tooltip, Avatar } from "@mui/material";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PanToolIcon from "@mui/icons-material/PanTool";

// พาเลทสีอวาตาร์อนิเมะน่ารัก ๆ
const chibiColors = [
  "#FF9AA2", "#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA",
  "#FFC6FF", "#BDB2FF", "#9BF6FF", "#CAFFBF", "#FDFFB6", "#FFADAD"
];

function getChibiColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return chibiColors[Math.abs(hash) % chibiColors.length];
}

// อาร์เรย์ของ Chibi Emoji กวน ๆ น่ารัก ๆ เพื่อให้เข้ากับสไตล์อนิเมะ
const chibiEmojis = ["🕵️‍♀️", "🔍", "🧐", "🤫", "🤪", "🥺", "😎", "🦊", "🌸", "🍕", "🎮", "🧸"];
function getChibiEmoji(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return chibiEmojis[Math.abs(hash) % chibiEmojis.length];
}

export default function PlayerTable({ players, selfId, room, isHost, onKick, onVote, voteTarget }) {
  if (!players || players.length === 0) return null;

  const judgePlayer = players.find((p) => p.id === room?.judgeId) || null;
  const nonJudgePlayers = players.filter((p) => p.id !== room?.judgeId);

  // แบ่งผู้เล่นครึ่งซ้ายขวาอย่างสมดุลรอบโต๊ะ
  const leftPlayers = nonJudgePlayers.filter((_, i) => i % 2 === 0);
  const rightPlayers = nonJudgePlayers.filter((_, i) => i % 2 !== 0);

  function getSideTop(index, total) {
    if (total <= 1) return 50;
    return ((index) / (total - 1)) * 60 + 20; // 20% ถึง 80%
  }

  const isVoting = room?.state === "voting";
  const votedMap = room?.voted || {};
  const blockedMap = room?.blockedVoters || {};
  const iVoted = !!votedMap[selfId];
  const iAmBlocked = !!blockedMap[selfId];
  const selfRole = players.find((p) => p.id === selfId)?.role;
  const isJudgeSelf = selfRole === "judge";
  const canVote = isVoting && !iAmBlocked && !iVoted && !isJudgeSelf;

  const seats = [
    ...(judgePlayer ? [{ p: judgePlayer, top: 12, left: 50, isJudgeSeat: true }] : []),
    ...leftPlayers.map((p, i) => ({ p, top: getSideTop(i, leftPlayers.length), left: 16 })),
    ...rightPlayers.map((p, i) => ({ p, top: getSideTop(i, rightPlayers.length), left: 84 })),
  ];

  return (
    <Paper
      elevation={0}
      className="anime-bob"
      sx={{
        p: 2.5,
        borderRadius: "24px",
        bgcolor: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(10px)",
        border: "3px solid #4a3e3d",
        boxShadow: "0 8px 0 #4a3e3d",
        height: { xs: 340, sm: 400, md: 440 },
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Typography variant="subtitle1" fontWeight="800" align="center" sx={{ color: "#4a3e3d", fontSize: "1.1rem" }}>
        🔮 โต๊ะประชุมลับนักสืบ
      </Typography>
      <Typography variant="caption" align="center" sx={{ color: "#7a6e6d", mb: 2 }}>
        *ผู้เล่นที่นั่งล้อมโต๊ะกำลังปรึกษาทายคำปริศนา...
      </Typography>

      <Box sx={{ flex: 1, position: "relative", mt: 1 }}>
        {/* รูปโต๊ะไม้บอร์ดเกมอนิเมะตรงกลาง */}
        <Box
          sx={{
            position: "absolute",
            top: "22%",
            left: "24%",
            right: "24%",
            bottom: "22%",
            borderRadius: "50%",
            background: "radial-gradient(circle, #ffe3e8 0%, #ffc0cb 70%, #ff9aa2 100%)",
            border: "4px solid #4a3e3d",
            boxShadow: "0 6px 0 #4a3e3d, inset 0 0 20px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" fontWeight="800" sx={{ color: "#4a3e3d", letterSpacing: "0.05em", fontSize: "0.65rem", textTransform: "uppercase", px: 1, py: 0.5, bgcolor: "rgba(255,255,255,0.75)", borderRadius: "99px", border: "1.5px solid #4a3e3d" }}>
            INSIDER
          </Typography>
        </Box>

        {/* ที่นั่งแต่ละคน */}
        {seats.map(({ p, top, left, isJudgeSeat }) => {
          const isMe = p.id === selfId;
          const isJudge = p.id === room?.judgeId;
          const isHostSeat = p.id === room?.hostId;
          const isOffline = p.connected === false;
          const isVotable = canVote && !isMe && !isJudge && !p.spectator;
          const isSelected = voteTarget === p.id;
          const isBlocked = !!blockedMap[p.id];
          const hasVoted = !!votedMap[p.id];

          return (
            <Box
              key={p.id}
              onClick={() => isVotable && onVote && onVote(p.id)}
              sx={{
                position: "absolute",
                top: `${top}%`,
                left: `${left}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: isVotable ? "pointer" : "default",
                opacity: isOffline ? 0.5 : 1,
                zIndex: 10,
                transition: "all 0.2s ease-in-out",
                "&:hover": isVotable ? { transform: "translate(-50%, -50%) scale(1.15)" } : {},
              }}
            >
              {/* อวาตาร์แบบ Chibi จี๊ดจ๊าด */}
              <Box sx={{ position: "relative" }}>
                <Avatar
                  sx={{
                    width: isJudgeSeat ? 46 : 40,
                    height: isJudgeSeat ? 46 : 40,
                    bgcolor: getChibiColor(p.name),
                    fontSize: isJudgeSeat ? "1.5rem" : "1.3rem",
                    border: isSelected 
                      ? "3px solid #ff4b5c" 
                      : isMe 
                      ? "3px solid #38bdf8" 
                      : "3.5px solid #4a3e3d",
                    boxShadow: isSelected 
                      ? "0 0 12px rgba(255,75,92,0.6)" 
                      : "0 4px 0 #4a3e3d",
                    transition: "transform 0.15s",
                  }}
                >
                  {getChibiEmoji(p.name)}
                </Avatar>

                {/* Badge สถานะโหวตและยกมือ */}
                {isVoting && !hasVoted && !isJudge && !isBlocked && !isOffline && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      bgcolor: "#ffe885",
                      border: "2px solid #4a3e3d",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: "gentleBob 1s infinite alternate",
                    }}
                  >
                    <PanToolIcon sx={{ fontSize: 10, color: "#4a3e3d" }} />
                  </Box>
                )}
              </Box>

              {/* ชื่อผู้เล่น */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, mt: 0.8, bgcolor: isMe ? "#e0f2fe" : "rgba(255,255,255,0.9)", border: "2px solid #4a3e3d", borderRadius: "12px", px: 1, py: 0.1, boxShadow: "0 2px 0 #4a3e3d" }}>
                <Typography variant="caption" fontWeight="800" sx={{ color: "#4a3e3d", fontSize: "0.68rem", maxWidth: 66, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </Typography>
                
                {isHost && !isMe && (
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onKick && onKick(p.id); }}
                    sx={{ p: 0, color: "#ff4b5c", ml: 0.2, "&:hover": { color: "#ff0000" } }}
                  >
                    <PersonRemoveIcon sx={{ fontSize: 10 }} />
                  </IconButton>
                )}
              </Box>

              {/* Badges บทบาทเล็ก ๆ */}
              <Stack direction="row" spacing={0.2} sx={{ mt: 0.4 }}>
                {isHostSeat && (
                  <Chip label="👑 HOST" size="small" sx={{ bgcolor: "#fef9c3", color: "#854d0e", border: "1.5px solid #4a3e3d", fontSize: "0.5rem", height: 14, "& .MuiChip-label": { px: 0.4, fontWeight: "bold" } }} />
                )}
                {isJudge && (
                  <Chip label="⚖️ JUDGE" size="small" sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", border: "1.5px solid #4a3e3d", fontSize: "0.5rem", height: 14, "& .MuiChip-label": { px: 0.4, fontWeight: "bold" } }} />
                )}
                {isOffline && (
                  <Chip label="💤 หลุด" size="small" sx={{ bgcolor: "#f1f5f9", color: "#64748b", border: "1.5px solid #4a3e3d", fontSize: "0.5rem", height: 14, "& .MuiChip-label": { px: 0.4, fontWeight: "bold" } }} />
                )}
              </Stack>

              {/* คะแนน */}
              <Typography variant="caption" fontWeight="bold" sx={{ color: "#7a6e6d", fontSize: "0.6rem", mt: 0.2 }}>
                {p.score ?? 0} pts
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
