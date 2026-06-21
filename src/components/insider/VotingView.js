"use client";
import React from "react";
import { Box, Typography, Chip, List, ListItem, Paper } from "@mui/material";

export default function VotingView({ room, players, me }) {
  const isJudge = me?.role === "judge";
  const votedMap = room.voted || {};
  const blockedMap = room.blockedVoters || {};
  const myId = me?.id;
  const iAmBlocked = !!blockedMap[myId];
  const iVoted = !!votedMap[myId];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "24px",
        bgcolor: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(10px)",
        border: "3px solid #4a3e3d",
        boxShadow: "0 8px 0 #4a3e3d",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h6" fontWeight="800" sx={{ color: "#4a3e3d" }}>
        🗳️ โหวตหาตัวอินไซเดอร์ (Voting Phase)
      </Typography>
      <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "600" }}>
        ร่วมมือกันประเมินบทสนทนาที่ผ่านมา! กดที่ชื่อหรืออวาตาร์อวตารของผู้เล่นที่คุณสงสัยบน <b>“โต๊ะประชุมลับ”</b> ด้านบนเพื่อทำการโหวต
      </Typography>

      {/* แบนเนอร์แสดงสถานะสิทธิ์ของผู้เล่น */}
      <Box sx={{ mt: 1 }}>
        {isJudge && (
          <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: "#eff6ff", border: "2px solid #3b82f6", textAlign: "center" }}>
            <Typography variant="body2" fontWeight="800" sx={{ color: "#1e3050" }}>
              ⚖️ คุณคือ “กรรมการ” จึงไม่มีสิทธิ์ร่วมลงคะแนนโหวต
            </Typography>
          </Box>
        )}

        {iAmBlocked && (
          <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: "#fff5f5", border: "2px solid #ef4444", textAlign: "center" }}>
            <Typography variant="body2" fontWeight="800" sx={{ color: "#991b1b" }}>
              ⚠️ คุณอยู่ในกลุ่มผู้ต้องสงสัยที่มีคะแนนเท่ากันในรอบที่แล้ว จึงถูกระงับสิทธิ์การโหวต
            </Typography>
          </Box>
        )}

        {!isJudge && !iAmBlocked && (
          <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: iVoted ? "#f0fdf4" : "#fffdf5", border: iVoted ? "2px solid #22c55e" : "2px solid #eab308", textAlign: "center" }}>
            <Typography variant="body2" fontWeight="800" sx={{ color: iVoted ? "#166534" : "#854d0e" }}>
              {iVoted ? "✅ คุณลงคะแนนเสร็จสิ้นแล้ว! รอนักสืบคนอื่นโหวตให้ครบ..." : "🔍 โปรดเคาะโหวตผู้เล่นที่คุณคิดว่าเป็น Insider บนโต๊ะหลัก"}
            </Typography>
          </Box>
        )}
      </Box>

      {/* รายการแสดงสถานะของผู้เล่นแต่ละคน */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1, color: "#4a3e3d" }}>
          สถานะโหวตของนักสืบแต่ละคน:
        </Typography>
        <List dense sx={{ py: 0 }}>
          {players.map((p) => {
            const pIsJudge = p.id === room.judgeId;
            const isBlocked = !!blockedMap[p.id];
            const hasVoted = !!votedMap[p.id];
            let label = "ยังไม่ได้โหวต";
            let color = "warning";
            let labelEmoji = "⏳";
            if (pIsJudge)       { label = "กรรมการ"; color = "info"; labelEmoji = "⚖️"; }
            else if (isBlocked) { label = "ถูกงดสิทธิ์"; color = "error"; labelEmoji = "🚫"; }
            else if (hasVoted)  { label = "โหวตเสร็จแล้ว"; color = "success"; labelEmoji = "✅"; }

            return (
              <ListItem key={p.id} sx={{ display: "flex", justifyContent: "space-between", px: 1, py: 0.5, borderBottom: "1.5px dashed #cbd5e1" }}>
                <Typography variant="body2" fontWeight="bold" sx={{ color: "#4a3e3d", fontSize: "0.8rem" }}>
                  {p.name}
                </Typography>
                <Chip
                  size="small"
                  label={`${labelEmoji} ${label}`}
                  color={color}
                  sx={{
                    fontSize: "0.68rem",
                    height: 22,
                    fontWeight: "bold",
                    border: "1.5px solid #4a3e3d",
                    boxShadow: "0 1.5px 0 #4a3e3d"
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
}
