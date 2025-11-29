// ScoreboardView.js
"use client";

import { Box, Typography, Table, TableBody, TableRow, TableCell, Button, Paper, List, ListItem } from "@mui/material";

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

  const nameById = {};
  players.forEach((p) => {
    nameById[p.id] = p.name;
  });

  const lastVotes = room.lastVotes || [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        กระดานคะแนน (จบรอบ)
      </Typography>

      {room.roundEndByTimeout ? (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#fef3c7" }}
        >
          <Typography variant="body2" color="text.primary">
            เวลาหมดก่อนที่จะทายคำได้
            รอบนี้{" "}
            <Box component="span" fontWeight="bold">
              ไม่มีใครได้แต้ม
            </Box>{" "}
            และไม่มีการโหวต
          </Typography>
          {room.secretWord && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              คำปริศนาคือ:{" "}
              <Box component="span" fontWeight="bold">
                {room.secretWord}
              </Box>
            </Typography>
          )}
        </Paper>
      ) : (
        <>
          {insider && (
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#ecfeff" }}
            >
              <Typography variant="body2">
                Insider ในรอบนี้คือ{" "}
                <Box component="span" fontWeight="bold">
                  {insider.name}
                </Box>
              </Typography>
              {room.secretWord && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  คำปริศนาคือ:{" "}
                  <Box component="span" fontWeight="bold">
                    {room.secretWord}
                  </Box>
                </Typography>
              )}
            </Paper>
          )}
        </>
      )}

      {/* ตารางคะแนนรวม */}
      <Table size="small" sx={{ mb: 3 }}>
        <TableBody>
          {sorted.map((p, idx) => (
            <TableRow key={p.id}>
              <TableCell width={40}>{idx + 1}</TableCell>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: p.id === me?.id ? 700 : 400,
                    }}
                  >
                    {p.name}
                  </Typography>
                  {p.id === insiderId && (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.2,
                        borderRadius: 999,
                        bgcolor: "#fee2e2",
                        color: "#b91c1c",
                      }}
                    >
                      INSIDER
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: p.id === me?.id ? 700 : 400,
                  }}
                >
                  {p.score ?? 0}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ✅ สรุปว่าใครโหวตใครบ้าง */}
      {lastVotes.length > 0 && !room.roundEndByTimeout && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1, color: "#334155", fontWeight: 600 }}
          >
            สรุปการโหวตในรอบนี้
          </Typography>
          <List dense>
            {lastVotes.map((v, idx) => (
              <ListItem key={idx} sx={{ px: 0 }}>
                <Typography variant="body2">
                  <Box component="span" fontWeight="bold">
                    {nameById[v.voterId] || "ไม่ทราบ"}
                  </Box>{" "}
                  โหวตว่า{" "}
                  <Box component="span" fontWeight="bold">
                    {nameById[v.targetId] || "ไม่ทราบ"}
                  </Box>{" "}
                  เป็น Insider
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* ปุ่มไปต่อ */}
      {me && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            คะแนนของคุณตอนนี้:{" "}
            <Box component="span" fontWeight="bold">
              {me.score ?? 0} แต้ม
            </Box>
          </Typography>
          <Button
            variant="contained"
            onClick={onNextRound}
            sx={{ borderRadius: 999 }}
          >
            เริ่มรอบถัดไป
          </Button>
        </Box>
      )}
    </Box>
  );
}
