// src/components/insider/TimerView.jsx
"use client";
import React, { useState } from "react";
import {
  Box, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";

export default function TimerView({ room, me, isJudge, onGuessCorrect, players }) {
  const word = room.secretWord || "";
  const isInsider = me?.role === "insider";
  const [guesserOpen, setGuesserOpen] = useState(false);
  const [selectedGuesser, setSelectedGuesser] = useState("");

  const nonJudgePlayers = (players || []).filter((p) => p.id !== room.judgeId);

  const handleConfirm = () => {
    onGuessCorrect(selectedGuesser || null);
    setGuesserOpen(false);
    setSelectedGuesser("");
  };

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

        {(isJudge || isInsider) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: isJudge ? "#4ade80" : "#f87171" }}>
              {isJudge ? "คำปริศนาของรอบนี้:" : "คุณคือ Insider คำปริศนาคือ:"}
            </Typography>
            <Box sx={{ mt: 1, px: 2, py: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2, display: "inline-block", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Typography fontWeight="bold" sx={{ color: "white" }}>
                {word || "(ไม่มีคำปริศนา)"}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", display: "block", mt: 1 }}>
              อย่าพูดคำนี้ออกมาตรง ๆ ให้ใบ้แบบแนบเนียนแทน
            </Typography>
          </Box>
        )}

        {!isJudge && !isInsider && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", mt: 2 }}>
            กรรมการได้กำหนดคำปริศนาแล้ว ให้คุณช่วยกันถาม-ตอบ / ถกเถียงเพื่อเดาคำให้ถูก
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        {isJudge ? (
          <Button
            variant="contained"
            sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
            onClick={() => setGuesserOpen(true)}
          >
            ทายคำถูกแล้ว (จบรอบนี้ → ไปโหวต)
          </Button>
        ) : (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.45)" }}>
            รอกรรมการกด "ทายคำถูกแล้ว" เมื่อทีมตอบคำได้ถูกต้อง
          </Typography>
        )}
      </Box>

      {/* Dialog เลือกว่าใครตอบถูก */}
      <Dialog open={guesserOpen} onClose={() => setGuesserOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">ใครตอบถูก?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            เลือกผู้เล่นที่ทายคำปริศนาได้ถูกต้อง (ถ้าไม่มีให้กด ข้ามได้เลย)
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>ผู้เล่น</InputLabel>
            <Select
              label="ผู้เล่น"
              value={selectedGuesser}
              onChange={(e) => setSelectedGuesser(e.target.value)}
            >
              <MenuItem value="">-- ไม่ระบุ --</MenuItem>
              {nonJudgePlayers.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuesserOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleConfirm}
            sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}>
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
