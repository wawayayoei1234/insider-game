
import React from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  FormControlLabel, 
  Switch
} from "@mui/material";

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
}) {
  const nonJudgeCount = room.judgeId
    ? players.filter((p) => p.id !== room.judgeId).length
    : players.length;

  const canStart =
    !!room.judgeId &&
    nonJudgeCount >= 3 &&
    nonJudgeCount % 2 === 1 &&
    secretWord.trim() !== "";


  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Lobby – เตรียมตัวก่อนเริ่มรอบ
      </Typography>
      <Typography variant="body2" color="text.secondary">
        เลือกกรรมการ แล้วให้{" "}
        <Box component="span" fontWeight="bold">
          กรรมการพิมพ์คำปริศนา
        </Box>{" "}
        ให้เรียบร้อยก่อนเริ่มเกม
      </Typography>

      <Box sx={{ mt: 2, mb: 2 }}>
        {isHost && (
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>กรรมการ</InputLabel>
              <Select
                label="กรรมการ"
                value={room.judgeId || ""}
                onChange={(e) => onSetJudge(e.target.value)}
              >
                <MenuItem value="">-- เลือกกรรมการ --</MenuItem>
                {players.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              * Host สามารถเปลี่ยนกรรมการได้ก่อนเริ่มเกม
            </Typography>
          </Box>
        )}

        {isJudge ? (
          <>
            <Typography
              variant="body2"
              color="success.main"
              sx={{ mb: 1, mt: 1 }}
            >
              คุณเป็นกรรมการ กรุณาพิมพ์{" "}
              <Box component="span" fontWeight="bold">
                คำปริศนา
              </Box>{" "}
              ที่ผู้เล่นต้องทาย
            </Typography>
            <TextField
              label="คำปริศนา"
              placeholder="เช่น ส้มตำ, รถไฟฟ้า, โดเรมอน ..."
              value={secretWord}
              onChange={(e) => setSecretWord(e.target.value)}
              size="small"
              sx={{ maxWidth: 320 }}
            />
            {secretWord.trim() !== "" && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                คำปริศนาปัจจุบัน:{" "}
                <Box component="span" fontWeight="bold">
                  {secretWord}
                </Box>{" "}
                (อย่าให้ผู้เล่นคนอื่นเห็น!)
              </Typography>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#22c55e",
                  "&:hover": { bgcolor: "#16a34a" },
                }}
                onClick={onStartRound}
                disabled={!canStart}
              >
                เริ่มรอบใหม่
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                * เงื่อนไข: ผู้เล่น (ไม่นับกรรมการ) ≥ 3 คน และเป็นจำนวนคี่
                และต้องพิมพ์คำปริศนาแล้ว
              </Typography>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            รอกรรมการ (
            {room.judgeId
              ? players.find((p) => p.id === room.judgeId)?.name
              : "ยังไม่เลือกกรรมการ"}
            ) พิมพ์คำปริศนาและเริ่มเกม
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary">
        Tip: ตอนดูบทบาท / คำปริศนา ให้คนอื่นหันหลังหรือปิดตา
        เพื่อไม่ให้รู้ว่าใครเป็น Insider
      </Typography>
            {isHost && (
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={chatEnabled}
                onChange={(e) => onToggleChat(e.target.checked)}
                color="primary"
              />
            }
            label="เปิดแชทในห้องนี้"
          />
        </Box>
      )}

    {!isHost && !chatEnabled && (
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        🔇 แชทถูกปิดโดย Host
      </Typography>
    )}
    </Box>
  );
}
