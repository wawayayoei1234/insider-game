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
} from "@mui/material";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";

export default function PlayerTable({ players, selfId, room, isHost, onKick }) {
  if (!players || players.length === 0) return null;

  const seats = players;
  const radius = 38; // % จาก center

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
            inset: "10%",
            borderRadius: "999px",
            bgcolor: "#f1f5f9",
            border: "3px solid #cbd5f5",
          }}
        />

        {/* ที่นั่งแต่ละคนวางรอบโต๊ะ */}
        {seats.map((p, index) => {
          const angle = (2 * Math.PI * index) / seats.length - Math.PI / 2;
          const top = 50 + radius * Math.sin(angle);
          const left = 50 + radius * Math.cos(angle);

          const isMe = p.id === selfId;
          const isJudge = p.id === room?.judgeId;
          const isHostSeat = p.id === room?.hostId;

          return (
            <Box
              key={p.id}
              sx={{
                position: "absolute",
                top: `${top}%`,
                left: `${left}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {/* เก้าอี้ + ชื่อ */}
              <Paper
                elevation={isMe ? 4 : 1}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  bgcolor: isMe ? "#e0f2fe" : "white",
                  border: isMe ? "2px solid #38bdf8" : "1px solid #e5e7eb",
                  minWidth: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    fontWeight: isMe ? "bold" : "normal",
                    color: isMe ? "#0f172a" : "#111827",
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
                      sx={{
                        ml: 0.5,
                        p: 0.2,
                        color: "#b91c1c",
                        "&:hover": {
                          bgcolor: "#fee2e2",
                        },
                      }}
                    >
                      <PersonRemoveIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Paper>

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
