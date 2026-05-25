// src/components/insider/TimerView.jsx
import React from "react";
import { Box, Typography, Button } from "@mui/material";

export default function TimerView({ room, me, isJudge, onGuessCorrect }) {
  const word = room.secretWord || "";
  const isInsider = me?.role === "insider";

  return (
    <Box>
      <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: "bold", mb: 0.5 }}>
        Phase พูดคุย / ทายคำ
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
        ทุกคนถาม-ตอบ / แลกเปลี่ยนคำใบ้กันได้ตามกติกา
        ถ้าทายคำถูกก่อนหมดเวลา ให้กรรมการกดปุ่มด้านล่าง
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
          สถานะของคุณ:{" "}
          <Box component="span" fontWeight="bold" sx={{ color: "rgba(255,255,255,0.9)" }}>
            {me?.role === "judge" ? "กรรมการ" : isInsider ? "Insider" : "ผู้เล่นทั่วไป"}
          </Box>
        </Typography>

        {(isJudge || isInsider) ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: isJudge ? "#4ade80" : "#f87171" }}>
              {isJudge ? "คำปริศนาของรอบนี้:" : "คุณคือ Insider คำปริศนาคือ:"}
            </Typography>
            <Box sx={{ mt: 1, px: 2, py: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2, display: "inline-block", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Typography fontWeight="bold" sx={{ color: "white" }}>
                {word || "(ไม่มีคำปริศนา – มีบางอย่างผิดพลาด)"}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", display: "block", mt: 1 }}>
              อย่าพูดคำนี้ออกมาตรง ๆ ให้ใบ้แบบแนบเนียนแทน
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", mt: 2 }}>
            กรรมการได้กำหนดคำปริศนาแล้ว ให้คุณช่วยกันถาม-ตอบ / ถกเถียงเพื่อเดาคำให้ถูก
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        {isJudge ? (
          <Button variant="contained" sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }} onClick={onGuessCorrect}>
            ทายคำถูกแล้ว (จบรอบนี้ → ไปโหวต)
          </Button>
        ) : (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.45)" }}>
            รอกรรมการกด "ทายคำถูกแล้ว" เมื่อทีมตอบคำได้ถูกต้อง
          </Typography>
        )}
      </Box>
    </Box>
  );
}
