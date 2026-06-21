"use client";
import { Box, Paper, Typography, TextField, IconButton, List, ListItem } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

export default function ChatPanel({ messages, me, value, onChange, onSend, enabled }) {
  const handleKeyDown = (e) => {
    if (!enabled) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        borderRadius: "24px",
        p: 2,
        bgcolor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        border: "3px solid #4a3e3d",
        boxShadow: "0 8px 0 #4a3e3d",
        display: "flex",
        flexDirection: "column",
        height: 250,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.2, color: "#4a3e3d", fontWeight: "800", display: "flex", alignItems: "center", gap: 0.5 }}>
        💬 บันทึกการสนทนานักสืบ
      </Typography>

      {/* รายการข้อความ */}
      <Box sx={{ flex: 1, overflowY: "auto", mb: 1, pr: 0.5 }}>
        <List dense sx={{ p: 0 }}>
          {messages.map((m, idx) => {
            const isMe = m.from?.id === me?.id;

            return (
              <ListItem
                key={idx}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  px: 0,
                  py: 0.4,
                }}
              >
                {/* ชื่อ */}
                <Typography
                  variant="caption"
                  sx={{
                    mb: 0.2,
                    fontWeight: "bold",
                    color: isMe ? "#5b21b6" : "#4a3e3d",
                    fontSize: "0.65rem",
                  }}
                >
                  {isMe ? "คุณ (You)" : m.from?.name || "ผู้เล่น"}
                </Typography>

                {/* กล่องคำพูดการ์ตูน (Speech bubble) */}
                <Box
                  sx={{
                    maxWidth: "85%",
                    bgcolor: isMe ? "#ffeef2" : "#f1f5f9",
                    color: "#4a3e3d",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    px: 1.8,
                    py: 0.8,
                    border: "2px solid #4a3e3d",
                    boxShadow: "0 3px 0 #4a3e3d",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: "600" }}>
                    {m.text}
                  </Typography>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* ช่องกรอกข้อความ */}
      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
        <TextField
          size="small"
          placeholder={enabled ? "พิมพ์ถามคำถามเพื่อสืบคำปริศนา..." : "🔇 โฮสต์ปิดระบบแชท"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          disabled={!enabled}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "99px",
              bgcolor: "white",
              border: "2px solid #4a3e3d",
              "& fieldset": { border: "none" },
              "&.Mui-focused": {
                border: "2px solid #ff9aa2",
              }
            },
            "& .MuiInputBase-input": {
              fontSize: "0.8rem",
              fontWeight: "600",
              color: "#4a3e3d",
              py: 0.8,
              px: 2,
            }
          }}
        />
        <IconButton
          onClick={onSend}
          disabled={!enabled || !value.trim()}
          sx={{
            bgcolor: "#ff9aa2",
            color: "white",
            border: "2px solid #4a3e3d",
            boxShadow: "0 3px 0 #4a3e3d",
            p: 0.8,
            "&:hover": { bgcolor: "#ff829d" },
            "&.Mui-disabled": { bgcolor: "#f1f5f9", color: "#cbd5e1", border: "2px solid #cbd5e1", boxShadow: "none" }
          }}
        >
          <SendIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Paper>
  );
}
