"use client";
import React, { useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";

export default function TimerView({ room, me, isJudge, onGuessCorrect, players, onAddHint, onAskQuestion }) {
  const word = room.secretWord || "";
  const isInsider = me?.role === "insider";
  const isSpectator = me?.spectator === true;
  const [guesserOpen, setGuesserOpen] = useState(false);
  const [selectedGuesser, setSelectedGuesser] = useState("");
  const [hintInput, setHintInput] = useState("");

  const hints = room.hints || [];
  const questionCount = room.questionCount || 0;

  const submitHint = () => {
    const t = hintInput.trim();
    if (!t) return;
    onAddHint && onAddHint(t);
    setHintInput("");
  };

  const nonJudgePlayers = (players || []).filter((p) => p.id !== room.judgeId && !p.spectator);

  const handleConfirm = () => {
    onGuessCorrect(selectedGuesser || null);
    setGuesserOpen(false);
    setSelectedGuesser("");
  };

  return (
    <Box
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
        🗣️ เฟสทายคำและสืบสวนหาเป้าหมาย
      </Typography>
      <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "600" }}>
        ผู้เล่นสามารถแชทหรือถาม-ตอบเพื่อสืบคำปริศนาจากกรรมการ หากทายคำสำเร็จก่อนหมดเวลา ให้กรรมการกดยืนยันทายถูกด้านล่างนี้
      </Typography>

      <DividerLabel label="ข้อมูลของคุณ" />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#f8fafc", p: 1.8, borderRadius: "16px", border: "2px solid #4a3e3d" }}>
        <Typography variant="body2" fontWeight="800" sx={{ color: "#4a3e3d" }}>
          บทบาทของคุณในรอบนี้:
        </Typography>
        <Typography variant="body2" fontWeight="900" sx={{ color: isJudge ? "#1d4ed8" : isInsider ? "#ff4b5c" : "#0f766e" }}>
          {isJudge ? "⚖️ กรรมการ (Judge)" : isInsider ? "🦊 อินไซเดอร์ (Insider)" : "🔍 ผู้เล่นทั่วไป (Commons)"}
        </Typography>
      </Box>

      {/* บล็อกแสดงคำลับให้แก่กรรมการและอินไซเดอร์ */}
      {(isJudge || isInsider) && (
        <Box sx={{ mt: 1, p: 2, borderRadius: "18px", bgcolor: isJudge ? "#eff6ff" : "#fff5f5", border: "2px solid #4a3e3d", boxShadow: "0 4px 0 #4a3e3d", textAlign: "center" }}>
          <Typography variant="caption" fontWeight="800" sx={{ color: isJudge ? "#1e40af" : "#991b1b", textTransform: "uppercase", display: "block", mb: 0.5 }}>
            🔑 คำปริศนาประจำตานี้
          </Typography>
          <Typography variant="h6" fontWeight="900" sx={{ color: "#4a3e3d" }}>
            {word || "(ไม่พบคำลับ)"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "600", display: "block", mt: 0.8 }}>
            *ห้ามเอ่ยชื่อคำนี้ตรง ๆ พยายามหลอกล่อ/ให้คำใบ้โดยไม่ให้ Commons ผิดสังเกต
          </Typography>
        </Box>
      )}

      {!isJudge && !isInsider && (
        <Box sx={{ mt: 1, p: 2, borderRadius: "18px", bgcolor: "#fffdf5", border: "2.5px dashed #eab308", textAlign: "center" }}>
          <Typography variant="body2" fontWeight="800" sx={{ color: "#854d0e" }}>
            🤫 คำปริศนาถูกปกปิดเป็นความลับ!
          </Typography>
          <Typography variant="caption" sx={{ color: "#7a6e6d", display: "block", mt: 0.5 }}>
            พยายามช่วยกันทายคำให้ถูก และวิเคราะห์ว่าใครกำลังโน้มน้าวคำตอบอยู่...
          </Typography>
        </Box>
      )}

      {/* บล็อกใบ้จากกรรมการและเครื่องมือนับคำถาม */}
      <Box sx={{ p: 2, borderRadius: "18px", bgcolor: "white", border: "2px solid #4a3e3d", boxShadow: "0 4px 0 #4a3e3d", display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" fontWeight="800" sx={{ color: "#4a3e3d" }}>
            💡 คำใบ้สาธารณะจากกรรมการ
          </Typography>
          <Typography variant="caption" fontWeight="800" sx={{ color: "#64748b", bgcolor: "#f1f5f9", px: 1, py: 0.2, borderRadius: "12px", border: "1.5px solid #cbd5e1" }}>
            ❓ จำนวนคำถาม: {questionCount} ข้อ
          </Typography>
        </Box>

        {hints.length > 0 ? (
          <Box sx={{ pl: 2, py: 0.5, bgcolor: "#fffbeb", borderRadius: "12px", border: "1.5px solid #fde047" }}>
            {hints.map((h, i) => (
              <Typography key={i} variant="body2" fontWeight="bold" sx={{ color: "#854d0e", py: 0.2 }}>
                - {h}
              </Typography>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic", pl: 1 }}>
            ขณะนี้ยังไม่มีคำใบ้จากกรรมการ
          </Typography>
        )}

        {isJudge && (
          <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
            <TextField
              size="small"
              placeholder="พิมพ์คำใบ้เพิ่มเติม (อย่าบอกตรง ๆ)"
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitHint(); }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "14px",
                  bgcolor: "#f8fafc",
                  border: "2px solid #4a3e3d",
                  "& fieldset": { border: "none" }
                },
                "& .MuiInputBase-input": { fontSize: "0.8rem", fontWeight: "bold", color: "#4a3e3d" }
              }}
              fullWidth
            />
            <Button
              variant="contained"
              size="small"
              onClick={submitHint}
              sx={{
                bgcolor: "#9bf6ff",
                color: "#1d4ed8",
                border: "2px solid #4a3e3d",
                boxShadow: "0 3px 0 #4a3e3d",
                borderRadius: "12px",
                fontWeight: "900",
                px: 2,
                "&:hover": { bgcolor: "#8ae5ee" }
              }}
            >
              ใบ้คำ
            </Button>
          </Box>
        )}

        {!isJudge && !isSpectator && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => onAskQuestion && onAskQuestion()}
            sx={{
              color: "#4a3e3d",
              borderColor: "#4a3e3d",
              borderWidth: "2px",
              boxShadow: "0 3px 0 #4a3e3d",
              borderRadius: "14px",
              fontWeight: "800",
              py: 0.6,
              "&:hover": { borderWidth: "2px", borderColor: "#ff9aa2", bgcolor: "#fff0f3" }
            }}
          >
            ❓ ฉันเป็นคนถามคำถาม (+1 คำถาม)
          </Button>
        )}
      </Box>

      {/* กึ่งกลางปุ่มกรรมการกดยอมรับ */}
      <Box sx={{ mt: 1 }}>
        {isJudge ? (
          <Button
            variant="contained"
            fullWidth
            onClick={() => setGuesserOpen(true)}
            sx={{
              bgcolor: "#caffbf",
              color: "#275a24",
              border: "3px solid #4a3e3d",
              boxShadow: "0 5px 0 #4a3e3d",
              borderRadius: "18px",
              fontWeight: "900",
              py: 1.2,
              fontSize: "1rem",
              "&:hover": { bgcolor: "#b4f4a5" }
            }}
          >
            🎯 มีผู้ตอบคำถามถูกแล้ว! (โหวตต่อ)
          </Button>
        ) : (
          <Typography variant="caption" align="center" sx={{ color: "#7a6e6d", fontWeight: "600", display: "block" }}>
            *รอกรรมการกดยืนยันเมื่อมีเพื่อนทายคำศัพท์สำเร็จ
          </Typography>
        )}
      </Box>

      {/* Dialog เลือกว่าคนไหนตอบถูก */}
      <Dialog open={guesserOpen} onClose={() => setGuesserOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{
          style: {
            borderRadius: "24px",
            border: "3px solid #4a3e3d",
            boxShadow: "0 8px 0 #4a3e3d",
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: "900", color: "#4a3e3d" }}>🎯 เลือกผู้เล่นที่ทายถูก</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "bold", mb: 2 }}>
            เลือกผู้เล่นที่สามารถเดาคำปริศนาได้ถูกต้อง (หากไม่มีใครกดตอบ ให้เลือกไม่ระบุได้ครับ)
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="select-guesser-label">ผู้ทายถูก</InputLabel>
            <Select
              labelId="select-guesser-label"
              label="ผู้ทายถูก"
              value={selectedGuesser}
              onChange={(e) => setSelectedGuesser(e.target.value)}
              sx={{
                borderRadius: "14px",
                border: "2px solid #4a3e3d",
                bgcolor: "white",
                "& fieldset": { border: "none" },
                "& .MuiSelect-select": { py: 1.2, fontWeight: "bold", color: "#4a3e3d" }
              }}
            >
              <MenuItem value="" sx={{ fontWeight: "bold" }}>-- ไม่ระบุ --</MenuItem>
              {nonJudgePlayers.map((p) => (
                <MenuItem key={p.id} value={p.id} sx={{ fontWeight: "bold" }}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGuesserOpen(false)} sx={{ color: "#4a3e3d", fontWeight: "bold" }}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              bgcolor: "#ff9aa2",
              color: "white",
              border: "2px solid #4a3e3d",
              boxShadow: "0 3px 0 #4a3e3d",
              borderRadius: "12px",
              fontWeight: "bold",
              px: 3,
              "&:hover": { bgcolor: "#ff829d" }
            }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DividerLabel({ label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%", my: 0.5 }}>
      <Box sx={{ flex: 1, height: "2px", bgcolor: "#e2e8f0" }} />
      <Typography variant="caption" sx={{ px: 1.5, color: "#64748b", fontWeight: "800", fontSize: "0.65rem", textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "2px", bgcolor: "#e2e8f0" }} />
    </Box>
  );
}
