// ScoreboardView.js
"use client";

import { useState } from "react";
import {
  Box, Typography, Table, TableBody, TableRow, TableCell,
  Button, Paper, List, ListItem, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";

export default function ScoreboardView({ room, players, insiderId, me, onNextRound }) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const insider = insiderId ? players.find((p) => p.id === insiderId) : null;
  const lastVotes = room.lastVotes || [];

  const nameById = {};
  players.forEach((p) => { nameById[p.id] = p.name; });

  // คำนวณว่า insider ถูกจับหรือไม่
  const voteCounts = {};
  lastVotes.forEach((v) => {
    voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
  });
  const maxVotes = Object.values(voteCounts).length > 0 ? Math.max(...Object.values(voteCounts)) : 0;
  const topVotedIds = Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVotes);
  const insiderCaught = !!insiderId && topVotedIds.length === 1 && topVotedIds[0] === insiderId;
  const insiderWon = !room.roundEndByTimeout && !!insiderId && !insiderCaught && lastVotes.length > 0;

  const isMe = (id) => me?.id === id;
  const amInsider = isMe(insiderId);
  const amCorrectGuesser = room.correctGuesserId && isMe(room.correctGuesserId);

  // ผลของฉัน
  let resultEmoji = "";
  let resultTitle = "";
  let resultDesc = "";
  if (!room.roundEndByTimeout && lastVotes.length > 0) {
    if (insiderWon) {
      if (amInsider) {
        resultEmoji = "🎉"; resultTitle = "คุณชนะ!";
        resultDesc = "ไม่มีใครจับคุณได้ คุณคือ Insider ที่แสนแนบเนียน";
      } else {
        resultEmoji = "😔"; resultTitle = "คุณแพ้";
        resultDesc = "Insider หลบรอดไปได้ ลองใหม่รอบหน้า!";
      }
    } else if (insiderCaught) {
      if (amInsider) {
        resultEmoji = "😱"; resultTitle = "คุณถูกจับ!";
        resultDesc = "ทุกคนรู้แล้วว่าคุณเป็น Insider";
      } else {
        resultEmoji = "🎉"; resultTitle = "คุณชนะ!";
        resultDesc = "ทีมจับ Insider ได้สำเร็จ!";
      }
    }
  }

  const [resultOpen, setResultOpen] = useState(!!resultTitle);
  const [guesserOpen, setGuesserOpen] = useState(!!amCorrectGuesser);

  return (
    <>
      {/* Dialog ผลแพ้/ชนะ */}
      {resultTitle && (
        <Dialog open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="xs" fullWidth>
          <DialogContent sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ fontSize: "3.5rem", lineHeight: 1, mb: 1 }}>{resultEmoji}</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>{resultTitle}</Typography>
            <Typography variant="body2" color="text.secondary">{resultDesc}</Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button variant="contained" onClick={() => setResultOpen(false)} sx={{ borderRadius: 999, px: 4 }}>
              รับทราบ
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Dialog คุณตอบถูก */}
      {amCorrectGuesser && (
        <Dialog open={guesserOpen} onClose={() => setGuesserOpen(false)} maxWidth="xs" fullWidth>
          <DialogContent sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ fontSize: "3.5rem", lineHeight: 1, mb: 1 }}>⭐</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>คุณตอบถูก!</Typography>
            <Typography variant="body2" color="text.secondary">
              คุณคือคนที่ทายคำปริศนา{" "}
              <Box component="span" fontWeight="bold">"{room.secretWord}"</Box>{" "}
              ได้ถูกต้อง
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button variant="contained" onClick={() => setGuesserOpen(false)} sx={{ borderRadius: 999, px: 4, bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}>
              เย้!
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Scoreboard Dialog */}
      <Dialog open fullWidth maxWidth="xs" disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: "bold", pb: 0 }}>
          กระดานคะแนน (จบรอบ)
        </DialogTitle>
        <DialogContent>
          <Box>
            {room.roundEndByTimeout ? (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#fef3c7" }}>
                <Typography variant="body2">
                  เวลาหมดก่อนทายคำได้ รอบนี้{" "}
                  <Box component="span" fontWeight="bold">ไม่มีใครได้แต้ม</Box>
                </Typography>
                {room.secretWord && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    คำปริศนาคือ: <Box component="span" fontWeight="bold">{room.secretWord}</Box>
                  </Typography>
                )}
              </Paper>
            ) : (
              insider && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: insiderWon ? "#fef2f2" : "#ecfeff" }}>
                  <Typography variant="body2">
                    Insider คือ{" "}
                    <Box component="span" fontWeight="bold">{insider.name}</Box>
                    {" — "}
                    <Box component="span" fontWeight="bold" sx={{ color: insiderWon ? "#b91c1c" : "#0891b2" }}>
                      {insiderWon ? "Insider ชนะ!" : "ถูกจับได้!"}
                    </Box>
                  </Typography>
                  {room.secretWord && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      คำปริศนา: <Box component="span" fontWeight="bold">{room.secretWord}</Box>
                    </Typography>
                  )}
                  {room.correctGuesserId && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      ผู้ทายถูก: <Box component="span" fontWeight="bold">{nameById[room.correctGuesserId] || "—"}</Box> ⭐
                    </Typography>
                  )}
                </Paper>
              )
            )}

            <Table size="small" sx={{ mb: 2 }}>
              <TableBody>
                {sorted.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell width={32}>{idx + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: p.id === me?.id ? 700 : 400 }}>
                          {p.name}
                        </Typography>
                        {p.id === insiderId && (
                          <Typography variant="caption" sx={{ px: 1, py: 0.2, borderRadius: 999, bgcolor: "#fee2e2", color: "#b91c1c" }}>
                            INSIDER
                          </Typography>
                        )}
                        {p.id === room.correctGuesserId && (
                          <Typography variant="caption">⭐</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: p.id === me?.id ? 700 : 400 }}>
                        {p.score ?? 0}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {lastVotes.length > 0 && !room.roundEndByTimeout && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>สรุปการโหวต</Typography>
                <List dense>
                  {lastVotes.map((v, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.2 }}>
                      <Typography variant="body2">
                        <Box component="span" fontWeight="bold">{nameById[v.voterId] || "?"}</Box>
                        {" โหวต "}
                        <Box component="span" fontWeight="bold">{nameById[v.targetId] || "?"}</Box>
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {me && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  คะแนนคุณ: <Box component="span" fontWeight="bold">{me.score ?? 0} แต้ม</Box>
                </Typography>
                <Button variant="contained" onClick={onNextRound} sx={{ borderRadius: 999 }}>
                  เริ่มรอบถัดไป
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
