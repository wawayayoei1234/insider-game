
"use client";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
} from "@mui/material";
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
      elevation={3}
      sx={{
        mt: 3,
        borderRadius: 3,
        p: 2,
        bgcolor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        height: 260,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, color: "#334155", fontWeight: 600 }}
      >
        แชทในห้อง
      </Typography>

      {/* รายการข้อความ */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          mb: 1,
          pr: 1,
        }}
      >
        <List dense>
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
                  mb: 0.5,
                }}
              >
                {/* ชื่ออยู่นอกกล่องข้อความ */}
                <Typography
                  variant="caption"
                  sx={{
                    mb: 0.25,
                    fontWeight: 600,
                    color: isMe ? "#9ca3af" : "#475569",
                    alignSelf: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  {isMe ? "คุณ" : m.from?.name || "ผู้เล่น"}
                </Typography>

     
                <Box
                  sx={{
                    maxWidth: "80%",
                    bgcolor: isMe ? "#4f46e5" : "#ffffff",
                    color: isMe ? "white" : "#111827",
                    borderRadius: 3,
                    px: 1.6,
                    py: 0.9,
                    boxShadow: 1,
                    border: isMe ? "none" : "1px solid #e5e7eb",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <Typography variant="body2">{m.text}</Typography>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          placeholder={
            enabled ? "พิมพ์ข้อความคุยกับเพื่อน..." : "แชทถูกปิดโดย Host"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          disabled={!enabled}
        />
        <IconButton
          color="primary"
          onClick={onSend}
          disabled={!enabled || !value.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
