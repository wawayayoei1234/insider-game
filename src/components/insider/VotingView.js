// VotingView.js
"use client";

import { Box, Typography, Chip, List, ListItem } from "@mui/material";

export default function VotingView({ room, players, me }) {
  const isJudge = me?.role === "judge";
  const votedMap = room.voted || {};
  const blockedMap = room.blockedVoters || {};
  const myId = me?.id;
  const iAmBlocked = !!blockedMap[myId];
  const iVoted = !!votedMap[myId];

  return (
    <Box>
      <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: "bold", mb: 0.5 }}>
        Phase โหวตหา Insider
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
        กดที่ชื่อหรือ avatar ของผู้เล่นที่ต้องการโหวต
      </Typography>

      {isJudge && (
        <Typography variant="body2" sx={{ color: "#60a5fa", mt: 1 }}>
          คุณเป็นกรรมการ จึงไม่ร่วมโหวตในรอบนี้
        </Typography>
      )}

      {iAmBlocked && (
        <Typography variant="body2" sx={{ color: "#f87171", mt: 1, fontWeight: 500 }}>
          คุณอยู่ในกลุ่มที่ถูกสงสัยจากรอบที่แล้ว{" "}
          <Box component="span" fontWeight="bold">ไม่มีสิทธิ์โหวตรอบนี้</Box>
        </Typography>
      )}

      {!isJudge && !iAmBlocked && (
        <Box sx={{ mt: 1 }}>
          {iVoted ? (
            <Typography variant="body2" sx={{ color: "#4ade80" }}>
              คุณโหวตแล้ว รอเพื่อน ๆ โหวตให้ครบ
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
              ยังไม่ได้โหวต กดที่ avatar ของคนที่สงสัย
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
          สถานะการโหวต
        </Typography>
        <List dense>
          {players.map((p) => {
            const pIsJudge = p.id === room.judgeId;
            const isBlocked = !!blockedMap[p.id];
            const hasVoted = !!votedMap[p.id];
            let label = "ยังไม่โหวต";
            let color = "default";
            if (pIsJudge)       { label = "กรรมการ"; color = "info"; }
            else if (isBlocked) { label = "โหวตไม่ได้"; color = "warning"; }
            else if (hasVoted)  { label = "โหวตแล้ว"; color = "success"; }

            return (
              <ListItem key={p.id} sx={{ display: "flex", justifyContent: "space-between", px: 0, py: 0.3 }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>{p.name}</Typography>
                <Chip size="small" label={label} color={color} sx={{ fontSize: "0.65rem", height: 20 }} />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}
