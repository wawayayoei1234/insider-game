// src/components/insider/PlayerTable.jsx
import React from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Avatar,
} from "@mui/material";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PanToolIcon from "@mui/icons-material/PanTool";

function nameToColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`;
}

export default function PlayerTable({ players, selfId, room, isHost, onKick, onVote, voteTarget }) {
  if (!players || players.length === 0) return null;

  const judgePlayer = players.find((p) => p.id === room?.judgeId) || null;
  const nonJudgePlayers = players.filter((p) => p.id !== room?.judgeId);

  // แบ่งผู้เล่น (ไม่นับกรรมการ) ซ้าย/ขวาเท่าๆ กัน
  const leftPlayers = nonJudgePlayers.filter((_, i) => i % 2 === 0);
  const rightPlayers = nonJudgePlayers.filter((_, i) => i % 2 !== 0);

  function getSideTop(index, total) {
    return ((index + 1) / (total + 1)) * 76 + 12;
  }

  const isVoting = room?.state === "voting";
  const votedMap = room?.voted || {};
  const blockedMap = room?.blockedVoters || {};
  const iVoted = !!votedMap[selfId];
  const iAmBlocked = !!blockedMap[selfId];
  const selfRole = players.find((p) => p.id === selfId)?.role;
  const isJudgeSelf = selfRole === "judge";
  const canVote = isVoting && !iAmBlocked && !iVoted && !isJudgeSelf;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "white",
        border: "1px solid #e5e7eb",
        height: { xs: 320, md: 420 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight="bold"
        sx={{ mb: 1, textAlign: "center" }}
      >
        โต๊ะเกม
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1, textAlign: "center" }}
      >
        มองจากมุมบน เหมือนทุกคนนั่งล้อมโต๊ะ 🪑
      </Typography>

      <Box
        sx={{
          flex: 1,
          position: "relative",
          mt: 1,
        }}
      >
        {/* วงกลมโต๊ะ */}
        <Box
          sx={{
            position: "absolute",
            top: "18%",
            left: "16%",
            right: "16%",
            bottom: "18%",
            borderRadius: 4,
            bgcolor: "#f1f5f9",
            border: "3px solid #cbd5f5",
          }}
        />

        {/* ที่นั่งผู้เล่น */}
        {[
          ...(judgePlayer ? [{ p: judgePlayer, top: 8, left: 50 }] : []),
          ...leftPlayers.map((p, i) => ({ p, top: getSideTop(i, leftPlayers.length), left: 10 })),
          ...rightPlayers.map((p, i) => ({ p, top: getSideTop(i, rightPlayers.length), left: 90 })),
        ].map(({ p, top, left }) => {
          const isMe = p.id === selfId;
          const isJudge = p.id === room?.judgeId;
          const isHostSeat = p.id === room?.hostId;
          const isVotable = canVote && !isMe && !isJudge;
          const isSelected = voteTarget === p.id;

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
                gap: 0.5,
                cursor: isVotable ? "pointer" : "default",
                "&:hover .vote-avatar": isVotable ? { transform: "scale(1.15)" } : {},
              }}
            >
              {/* Avatar */}
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <Avatar
                  className="vote-avatar"
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: nameToColor(p.name),
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    border: isSelected
                      ? "2px solid #f43f5e"
                      : isMe
                      ? "2px solid #38bdf8"
                      : "2px solid white",
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(244,63,94,0.35)"
                      : "0 2px 6px rgba(0,0,0,0.18)",
                    transition: "transform 0.15s",
                  }}
                >
                  {(p.name || "?")[0].toUpperCase()}
                </Avatar>
                {isVoting && !votedMap[p.id] && !isJudge && !blockedMap[p.id] && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -6,
                      right: -8,
                      bgcolor: "#fef9c3",
                      borderRadius: "50%",
                      width: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                    <PanToolIcon sx={{ fontSize: 10, color: "#b45309" }} />
                  </Box>
                )}
              </Box>

              {/* ชื่อ */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    fontWeight: isMe ? "bold" : "normal",
                    color: isMe ? "#0369a1" : "#111827",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </Typography>

                {/* ปุ่มเตะ – เฉพาะ Host และห้ามเตะตัวเอง */}
                {isHost && !isMe && (
                  <Tooltip title="เตะออกจากห้อง">
                    <IconButton
                      size="small"
                      onClick={() => onKick && onKick(p.id)}
                      sx={{ p: 0.2, color: "#b91c1c", "&:hover": { bgcolor: "#fee2e2" } }}
                    >
                      <PersonRemoveIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {/* role badge */}
              <Stack direction="row" spacing={0.5}>
                {isHostSeat && (
                  <Chip
                    label="HOST"
                    size="small"
                    sx={{
                      bgcolor: "#fef9c3",
                      color: "#854d0e",
                      fontSize: "0.7rem",
                      height: 20,
                    }}
                  />
                )}
                {isJudge && (
                  <Chip
                    label="JUDGE"
                    size="small"
                    sx={{
                      bgcolor: "#dbeafe",
                      color: "#1d4ed8",
                      fontSize: "0.7rem",
                      height: 20,
                    }}
                  />
                )}
              </Stack>

              {/* คะแนนเล็ก ๆ ใต้เก้าอี้ */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.2 }}
              >
                {p.score ?? 0} pts
              </Typography>
            </Box>
          );
        })}

        {/* label ตรงกลางโต๊ะ */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 1, py: 0.5, bgcolor: "white", borderRadius: 999 }}
          >
            INSIDER GAME TABLE
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
