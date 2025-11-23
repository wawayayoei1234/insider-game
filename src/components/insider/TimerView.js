// src/components/insider/TimerView.jsx
import React from "react";
import { Box, Typography, Button } from "@mui/material";

export default function TimerView({ room, me, isJudge, onGuessCorrect }) {
  const word = room.secretWord || "";
  const isInsider = me?.role === "insider";

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Phase พูดคุย / ทายคำ
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ทุกคนถาม-ตอบ / แลกเปลี่ยนคำใบ้กันได้ตามกติกา
        ถ้าทายคำถูกก่อนหมดเวลา ให้กรรมการกดปุ่มด้านล่าง
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          สถานะของคุณ:{" "}
          <Box component="span" fontWeight="bold">
            {me?.role === "judge"
              ? "กรรมการ"
              : isInsider
              ? "Insider"
              : "ผู้เล่นทั่วไป"}
          </Box>
        </Typography>

        {/* ⭐ ให้กรรมการ + Insider เห็นคำปริศนา */}
        {(isJudge || isInsider) ? (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="body2"
              color={isJudge ? "success.main" : "error.main"}
            >
              {isJudge ? "คำปริศนาของรอบนี้:" : "คุณคือ Insider คำปริศนาคือ:"}
            </Typography>
            <Box
              sx={{
                mt: 1,
                px: 2,
                py: 1,
                bgcolor: "#eef2ff",
                borderRadius: 2,
                display: "inline-block",
              }}
            >
              <Typography fontWeight="bold">
                {word || "(ไม่มีคำปริศนา – มีบางอย่างผิดพลาด)"}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              อย่าพูดคำนี้ออกมาตรง ๆ ให้ใบ้แบบแนบเนียนแทน
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            กรรมการได้กำหนดคำปริศนาแล้ว ให้คุณช่วยกันถาม-ตอบ / ถกเถียงเพื่อเดาคำให้ถูก
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        {isJudge ? (
          <Button
            variant="contained"
            sx={{
              bgcolor: "#22c55e",
              "&:hover": { bgcolor: "#16a34a" },
            }}
            onClick={onGuessCorrect}
          >
            ทายคำถูกแล้ว (จบรอบนี้ → ไปโหวต)
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">
            รอกรรมการกด “ทายคำถูกแล้ว” เมื่อทีมตอบคำได้ถูกต้อง
          </Typography>
        )}
      </Box>
    </Box>
  );
}
