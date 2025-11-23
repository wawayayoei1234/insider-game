// src/components/insider/ScoreboardView.jsx
import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
} from "@mui/material";

export default function ScoreboardView({
  room,
  players,
  insiderId,
  me,
  onNextRound,
}) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const insider = insiderId
    ? players.find((p) => p.id === insiderId)
    : null;
  const judge = room.judgeId
    ? players.find((p) => p.id === room.judgeId)
    : null;

  const endedByTimeout = room.roundEndByTimeout;   // ⭐ มาจาก backend
  const secretWord = room.secretWord || "";

  // ไม่แสดงกรรมการในตารางคะแนน
  const visiblePlayers = sorted.filter((p) => p.id !== room.judgeId);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        กระดานคะแนน (จบรอบนี้)
      </Typography>

      {/* ✅ เคสเวลาหมด: ไม่มีโหวต, ไม่มีใครได้แต้ม, โชว์แค่คำปริศนา */}
      {endedByTimeout ? (
        <Card
          sx={{
            mb: 2,
            bgcolor: "#fee2e2",
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              เวลาหมดก่อนที่จะทายคำถูก รอบนี้ไม่มีใครได้แต้ม
            </Typography>
            {secretWord && (
              <Typography
                variant="h6"
                sx={{ mt: 1 }}
                color="#b91c1c"
                fontWeight="bold"
              >
                คำปริศนาคือ: {secretWord}
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        // 🎯 เคสปกติ: ทายถูก → ไปโหวต → เฉลย Insider + แสดงคำ
        insider && (
          <Card
            sx={{
              mb: 2,
              bgcolor: "#ecfdf5",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Insider ในรอบนี้คือ:
              </Typography>
              <Typography
                variant="h6"
                sx={{ mt: 1 }}
                color="#16a34a"
                fontWeight="bold"
              >
                {insider.name}
              </Typography>
              {secretWord && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  คำปริศนาที่ใช้ในรอบนี้:{" "}
                  <Box component="span" fontWeight="bold">
                    {secretWord}
                  </Box>
                </Typography>
              )}
            </CardContent>
          </Card>
        )
      )}

      {judge && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          กรรมการในรอบนี้:{" "}
          <Box component="span" fontWeight="bold">
            {judge.name}
          </Box>{" "}
          (ไม่สะสมคะแนน และไม่แสดงในตารางคะแนน)
        </Alert>
      )}

      {/* ตารางคะแนนรวม (คะแนนสะสมจากทุก ๆ รอบ) */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        คะแนนรวมทั้งหมด
      </Typography>
      <Table size="small">
        <TableBody>
          {visiblePlayers.map((p, idx) => (
            <TableRow
              key={p.id}
              sx={{
                "& td": {
                  borderBottomColor: "#e5e7eb",
                },
                bgcolor: p.id === me?.id ? "#eef2ff" : "white",
              }}
            >
              <TableCell width={40}>
                <Typography variant="caption" color="text.secondary">
                  {idx + 1}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2">{p.name}</Typography>
                  {/* จะซ่อน tag INSIDER ตอน timeout ก็ได้ (ตรงนี้เช็คแล้วว่า !endedByTimeout) */}
                  {!endedByTimeout && p.id === insiderId && (
                    <Chip
                      label="INSIDER"
                      size="small"
                      sx={{
                        bgcolor: "#fee2e2",
                        color: "#b91c1c",
                        fontSize: "0.7rem",
                      }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "monospace" }}
                >
                  {p.score ?? 0}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {me && (
        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            คะแนนของคุณตอนนี้:{" "}
            <Box component="span" fontWeight="bold">
              {me.score ?? 0} แต้ม
            </Box>
          </Typography>
          <Button
            variant="contained"
            sx={{
              bgcolor: "#6366f1",
              "&:hover": { bgcolor: "#4f46e5" },
            }}
            onClick={onNextRound}
          >
            เริ่มรอบถัดไป
          </Button>
        </Box>
      )}
    </Box>
  );
}
