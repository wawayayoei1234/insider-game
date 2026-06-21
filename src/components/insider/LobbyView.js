"use client";
import React, { useState } from "react";
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, Divider, FormControlLabel, Switch, Paper } from "@mui/material";

export default function LobbyView({
  room,
  players,
  me,
  isHost,
  isJudge,
  secretWord,
  setSecretWord,
  onSetJudge,
  onStartRound,
  chatEnabled,
  onToggleChat,
  categories = [],
}) {
  const [useRandom, setUseRandom] = useState(false);
  const [category, setCategory] = useState("");

  const nonJudgeCount = players.filter(
    (p) => p.id !== room.judgeId && p.connected !== false && !p.spectator
  ).length;

  const canStart =
    // !!room.judgeId &&   // Wait! In lobby, the host chooses a judge first. Let's make sure it's valid.
    !!room.judgeId &&
    nonJudgeCount >= 3 &&
    (useRandom || secretWord.trim() !== "");

  const handleStart = () => {
    onStartRound(useRandom ? { random: true, category } : {});
  };

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" fontWeight="800" sx={{ color: "#4a3e3d" }}>
          🏫 ห้องเตรียมความพร้อม (Lobby)
        </Typography>
      </Box>
      
      <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "600" }}>
        ก่อนเริ่มเกม โปรดเลือกผู้เล่นที่จะทำหน้าที่เป็น ⚖️ <b>กรรมการ (Judge)</b> และตั้งค่าคำศัพท์ปริศนาด้านล่างนี้
      </Typography>

      <Divider sx={{ borderStyle: "dashed", borderColor: "#4a3e3d", borderWidth: "1.5px" }} />

      {/* เลือกกรรมการ - เฉพาะโฮสต์เท่านั้น */}
      {isHost && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="subtitle2" fontWeight="800" sx={{ color: "#4a3e3d" }}>
            ⚖️ สิทธิ์ของโฮสต์: เลือกกรรมการของรอบนี้
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel id="select-judge-label">กรรมการ</InputLabel>
              <Select
                labelId="select-judge-label"
                label="กรรมการ"
                value={room.judgeId || ""}
                onChange={(e) => onSetJudge(e.target.value)}
                sx={{
                  borderRadius: "16px",
                  border: "2px solid #4a3e3d",
                  bgcolor: "white",
                  "& fieldset": { border: "none" },
                  "& .MuiSelect-select": { py: 1.2, fontWeight: "bold", color: "#4a3e3d" }
                }}
              >
                <MenuItem value="" sx={{ fontWeight: "bold" }}>-- เลือกกรรมการ --</MenuItem>
                {players.filter(p => !p.spectator).map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontWeight: "bold" }}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                const activeOnes = players.filter(p => !p.spectator && p.connected);
                if (activeOnes.length > 0) {
                  const pick = activeOnes[Math.floor(Math.random() * activeOnes.length)];
                  onSetJudge(pick.id);
                }
              }}
              sx={{
                bgcolor: "#b5ead7",
                color: "#275947",
                border: "2px solid #4a3e3d",
                boxShadow: "0 3px 0 #4a3e3d",
                borderRadius: "12px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                px: 2,
                py: 1,
                "&:hover": { bgcolor: "#9fe0ca" }
              }}
            >
              🎲 สุ่ม
            </Button>
          </Box>
        </Box>
      )}

      {/* สิทธิ์ของกรรมการในการป้อนคำลับ */}
      {isJudge ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "#fff0f3", p: 2, borderRadius: "18px", border: "2.5px solid #4a3e3d" }}>
          <Typography variant="body2" fontWeight="800" sx={{ color: "#ff4b5c" }}>
            ✨ คุณคือ “กรรมการ” ของตานี้! พิมพ์คำปริศนาเอง หรือสุ่มคำอัตโนมัติ:
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={useRandom}
                onChange={(e) => setUseRandom(e.target.checked)}
                color="primary"
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#ff9aa2" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#ff9aa2" }
                }}
              />
            }
            label={
              <Typography variant="body2" fontWeight="800" sx={{ color: "#4a3e3d" }}>
                🎲 ใช้ระบบสุ่มคำศัพท์อัตโนมัติ
              </Typography>
            }
          />

          {useRandom ? (
            <FormControl size="small" fullWidth>
              <InputLabel id="select-category-label">หมวดหมู่คำศัพท์</InputLabel>
              <Select
                labelId="select-category-label"
                label="หมวดหมู่คำศัพท์"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{
                  borderRadius: "14px",
                  border: "2px solid #4a3e3d",
                  bgcolor: "white",
                  "& fieldset": { border: "none" },
                  "& .MuiSelect-select": { py: 1, fontWeight: "bold", color: "#4a3e3d" }
                }}
              >
                <MenuItem value="" sx={{ fontWeight: "bold" }}>ทุกหมวดหมู่ (สุ่มทั้งหมด)</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c} value={c} sx={{ fontWeight: "bold" }}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                label="คำปริศนาประจำรอบ"
                placeholder="เช่น ส้มตำ, โดเรมอน, นาฬิกาปลุก ..."
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    bgcolor: "white",
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "2px solid #4a3e3d",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "2px solid #4a3e3d",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "2px solid #ff9aa2",
                    }
                  },
                  "& .MuiInputLabel-root": { color: "#7a6e6d", fontWeight: "bold" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#ff9aa2" },
                  "& .MuiInputLabel-shrink": { bgcolor: "white", px: 1, borderRadius: "4px" },
                  "& .MuiInputBase-input": {
                    fontWeight: "bold",
                    color: "#4a3e3d"
                  }
                }}
              />
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleStart}
            disabled={!canStart}
            sx={{
              bgcolor: "#ff9aa2",
              color: "white",
              border: "3px solid #4a3e3d",
              boxShadow: "0 4px 0 #4a3e3d",
              borderRadius: "16px",
              fontWeight: "900",
              py: 1.2,
              fontSize: "1rem",
              textTransform: "none",
              "&:hover": { bgcolor: "#ff829d" },
              "&.Mui-disabled": { bgcolor: "#f1f5f9", color: "#cbd5e1", border: "2px solid #cbd5e1", boxShadow: "none" }
            }}
          >
            🏁 เริ่มเกมจับผิด (Start Game)
          </Button>

          <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "600", mt: 0.5 }}>
            *เงื่อนไขการเริ่มรอบ: ต้องมีกรรมการ + มีผู้เล่นฝ่าย Commons ≥ 3 คน และกรอกคำใบ้แล้ว
          </Typography>
        </Box>
      ) : (
        <Box sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: "18px", border: "2.5px dashed #cbd5e1", textAlign: "center" }}>
          <Typography variant="body2" fontWeight="800" sx={{ color: "#64748b" }}>
            🔍 รอกรรมการ (
            {room.judgeId
              ? players.find((p) => p.id === room.judgeId)?.name
              : "ยังไม่ได้เลือกกรรมการ"}
            ) พิมพ์คำลับและเริ่มรันรอบถัดไป...
          </Typography>
        </Box>
      )}

      {/* แชทปิดเปิด - สิทธิ์โฮสต์ */}
      {isHost && (
        <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
          <FormControlLabel
            control={
              <Switch
                checked={chatEnabled}
                onChange={(e) => onToggleChat(e.target.checked)}
                color="primary"
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#b5ead7" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#b5ead7" }
                }}
              />
            }
            label={
              <Typography variant="caption" fontWeight="800" sx={{ color: "#4a3e3d" }}>
                🔒 เปิดระบบกล่องแชทระหว่างล็อบบี้
              </Typography>
            }
          />
        </Box>
      )}

      {!isHost && !chatEnabled && (
        <Typography variant="caption" align="center" sx={{ color: "#ef4444", fontWeight: "bold", display: "block" }}>
          🔇 ระบบแชทถูกปิดใช้งานชั่วคราวโดยโฮสต์
        </Typography>
      )}
    </Paper>
  );
}
