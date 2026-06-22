"use client";
import React, { useState } from "react";
import { Box, Typography, Table, TableBody, TableRow, TableCell, Button, Paper, List, ListItem, Dialog, DialogContent, DialogActions, DialogTitle, Divider, Chip } from "@mui/material";

export default function ScoreboardView({ room, players, insiderId, me, onNextRound }) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const insider = insiderId ? players.find((p) => p.id === insiderId) : null;
  const lastVotes = room.lastVotes || [];

  const nameById = {};
  players.forEach((p) => { nameById[p.id] = p.name; });

  const voteCounts = {};
  lastVotes.forEach((v) => {
    voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
  });

  // Trust the server's authoritative outcome instead of recomputing the winner
  // from raw votes (which can disagree on tie + revote + random-tiebreak cases).
  const insiderCaught = room.roundResult === "commons";
  const insiderWon = room.roundResult === "insider";

  const isMe = (id) => me?.id === id;
  const amInsider = isMe(insiderId);
  const amCorrectGuesser = room.correctGuesserId && isMe(room.correctGuesserId);
  const isHost = room && me && room.hostId === me.id;

  let resultEmoji = "🤫";
  let resultTitle = "";
  let resultDesc = "";
  if (insiderWon || insiderCaught) {
    if (insiderWon) {
      if (amInsider) {
        resultEmoji = "🏆🦊";
        resultTitle = "คุณชนะแล้ว!";
        resultDesc = "ไม่มีผู้ใดสามารถจับกุมคุณได้! คุณปิดบังสถานะได้อย่างแนบเนียนสมเป็นสุดยอดนักตบตา";
      } else {
        resultEmoji = "😭";
        resultTitle = "ฝ่ายคุณพ่ายแพ้!";
        resultDesc = "อินไซเดอร์หลบหนีไปได้สำเร็จ! ลองวางแผนใหม่ในการเล่นตารอบถัดไปนะ";
      }
    } else if (insiderCaught) {
      if (amInsider) {
        resultEmoji = "😱";
        resultTitle = "คุณโดนจับกุม!";
        resultDesc = "กรรมาธิการและเหล่านักสืบ Commons จับทางได้และจับกุมคุณได้สำเร็จ!";
      } else {
        resultEmoji = "🎉🔍";
        resultTitle = "ฝ่ายคุณชนะแล้ว!";
        resultDesc = "สำเร็จแล้ว! ทีมสามารถจับตัวอินไซเดอร์ที่แฝงตัวอยู่กับพวกเราได้สำเร็จ";
      }
    }
  }

  const [resultOpen, setResultOpen] = useState(!!resultTitle);
  const [guesserOpen, setGuesserOpen] = useState(!!amCorrectGuesser);

  return (
    <>
      {/* Dialog ประกาศชัยชนะสไตล์ Anime Visual Novel */}
      {resultTitle && (
        <Dialog open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{
            style: {
              borderRadius: "24px",
              border: "3px solid #4a3e3d",
              boxShadow: "0 8px 0 #4a3e3d",
              bgcolor: "#fffbfb"
            }
          }}
        >
          <DialogContent sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ fontSize: "4.5rem", lineHeight: 1, mb: 1, filter: "drop-shadow(0 4px 0 #4a3e3d)" }}>
              {resultEmoji}
            </Typography>
            <Typography variant="h5" fontWeight="900" sx={{ color: "#4a3e3d", mb: 1.5 }}>
              {resultTitle}
            </Typography>
            <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "bold", px: 2 }}>
              {resultDesc}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
            <Button
              variant="contained"
              onClick={() => setResultOpen(false)}
              sx={{
                bgcolor: "#ff9aa2",
                color: "white",
                border: "2px solid #4a3e3d",
                boxShadow: "0 3px 0 #4a3e3d",
                borderRadius: "12px",
                fontWeight: "900",
                px: 5,
                "&:hover": { bgcolor: "#ff829d" }
              }}
            >
              รับทราบผล
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Dialog แนะนำผู้ตอบคำถามปริศนาถูกต้อง */}
      {amCorrectGuesser && (
        <Dialog open={guesserOpen} onClose={() => setGuesserOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{
            style: {
              borderRadius: "24px",
              border: "3px solid #4a3e3d",
              boxShadow: "0 8px 0 #4a3e3d",
              bgcolor: "#fffdf0"
            }
          }}
        >
          <DialogContent sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ fontSize: "4.5rem", lineHeight: 1, mb: 1, filter: "drop-shadow(0 4px 0 #4a3e3d)" }}>
              ⭐🕵️‍♀️
            </Typography>
            <Typography variant="h5" fontWeight="900" sx={{ color: "#4a3e3d", mb: 1.5 }}>
              คุณเดาคำปริศนาถูกต้อง!
            </Typography>
            <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "bold", px: 2 }}>
              คุณตอบคำปริศนาคำว่า <span style={{ color: "#ff4b5c", fontSize: "1.1rem" }}><b>“{room.secretWord}”</b></span> ได้สำเร็จ! 
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
            <Button
              variant="contained"
              onClick={() => setGuesserOpen(false)}
              sx={{
                bgcolor: "#fdffb6",
                color: "#854d0e",
                border: "2px solid #4a3e3d",
                boxShadow: "0 3px 0 #4a3e3d",
                borderRadius: "12px",
                fontWeight: "900",
                px: 5,
                "&:hover": { bgcolor: "#fdf89e" }
              }}
            >
              เย้! (Yay!)
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* บล็อกแสดงกระดานคะแนน */}
      <Dialog open fullWidth maxWidth="xs" disableEscapeKeyDown
        PaperProps={{
          style: {
            borderRadius: "24px",
            border: "3px solid #4a3e3d",
            boxShadow: "0 8px 0 #4a3e3d",
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: "900", color: "#4a3e3d", pb: 1 }}>
          กระดานผลคะแนนประจำรอบ
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* บล็อกเฉลยคำลับและสถานะชัยชนะ */}
            {room.roundEndByTimeout ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px", bgcolor: "#fffbeb", border: "2px solid #eab308", boxShadow: "0 3px 0 #eab308" }}>
                <Typography variant="body2" fontWeight="bold" sx={{ color: "#854d0e" }}>
                  ⏰ เวลาหมดก่อนจะทายคำสำเร็จ! รอบนี้จึงโมฆะและ <b>ไม่มีใครได้รับแต้ม</b>
                </Typography>
                {room.secretWord && (
                  <Typography variant="body2" fontWeight="bold" sx={{ mt: 1, color: "#4a3e3d" }}>
                    คำเฉลยประจำตาคือ: <span style={{ color: "#ff4b5c" }}>“{room.secretWord}”</span>
                  </Typography>
                )}
              </Paper>
            ) : (
              insider && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px", bgcolor: insiderWon ? "#fff5f5" : "#f0fdf4", border: insiderWon ? "2.5px solid #ff4b5c" : "2.5px solid #22c55e", boxShadow: insiderWon ? "0 4px 0 #ff4b5c" : "0 4px 0 #22c55e" }}>
                  <Typography variant="body2" fontWeight="800" sx={{ color: "#4a3e3d" }}>
                    🦊 ผู้เป็นอินไซเดอร์ (Insider): <span style={{ textDecoration: "underline" }}><b>{insider.name}</b></span>
                  </Typography>
                  {(insiderWon || insiderCaught) && (
                    <Typography variant="body2" fontWeight="900" sx={{ mt: 0.5, color: insiderWon ? "#ff4b5c" : "#22c55e" }}>
                      ผลการแข่ง: {insiderWon ? "🏆 ฝ่าย Insider ชนะ!" : "🎉 ฝ่าย Commons ชนะ (จับโกหกได้สำเร็จ)!"}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1, borderColor: "rgba(0,0,0,0.1)" }} />
                  {room.secretWord && (
                    <Typography variant="body2" fontWeight="bold" sx={{ color: "#4a3e3d" }}>
                      คำเฉลยประจำตาคือ: <span style={{ color: "#ff4b5c" }}>“{room.secretWord}”</span>
                    </Typography>
                  )}
                  {room.correctGuesserId && (
                    <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, color: "#4a3e3d" }}>
                      🏆 คนทายถูก (Guesser): {nameById[room.correctGuesserId] || "—"} ⭐
                    </Typography>
                  )}
                </Paper>
              )
            )}

            {/* ตารางแสดงคะแนนสะสม */}
            <Typography variant="subtitle2" fontWeight="800" sx={{ color: "#4a3e3d", mb: -1 }}>
              อันดับคะแนนสะสม:
            </Typography>
            <Table size="small" sx={{ border: "2px solid #4a3e3d", borderRadius: "14px", overflow: "hidden", display: "table" }}>
              <TableBody>
                {sorted.map((p, idx) => (
                  <TableRow key={p.id} sx={{ bgcolor: p.id === me?.id ? "#fff0f3" : "white" }}>
                    <TableCell width={32} sx={{ fontWeight: "900", color: "#4a3e3d" }}>{idx + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: p.id === me?.id ? "900" : "bold", color: "#4a3e3d" }}>
                          {p.name}
                        </Typography>
                        {p.id === insiderId && (
                          <Chip label="INSIDER" size="small" color="error" sx={{ height: 16, fontSize: "0.55rem", fontWeight: "bold", border: "1px solid #4a3e3d" }} />
                        )}
                        {p.id === room.correctGuesserId && (
                          <Typography variant="caption">⭐</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "900", fontFamily: "monospace", color: "#4a3e3d" }}>
                      {p.score ?? 0} pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* สรุปคะแนนการโหวต */}
            {lastVotes.length > 0 && !room.roundEndByTimeout && (
              <Box>
                <Typography variant="subtitle2" fontWeight="800" sx={{ color: "#4a3e3d", mb: 0.8 }}>
                  🗳️ สรุปเส้นทางการโหวต:
                </Typography>
                <List dense sx={{ p: 1, border: "2px solid #4a3e3d", borderRadius: "14px", bgcolor: "#f8fafc" }}>
                  {lastVotes.map((v, idx) => (
                    <ListItem key={idx} sx={{ px: 1, py: 0.2 }}>
                      <Typography variant="body2" sx={{ color: "#4a3e3d", fontSize: "0.78rem" }}>
                        💬 <b>{nameById[v.voterId] || "?"}</b> เลือกโหวตสืบหา 👉 <b>{nameById[v.targetId] || "?"}</b>
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* เกณฑ์การให้คะแนน */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px", bgcolor: "#fffdf5", border: "2px solid #4a3e3d" }}>
              <Typography variant="caption" fontWeight="bold" sx={{ color: "#854d0e", display: "block" }}>
                💡 <b>คำอธิบายการคิดคะแนนและผลโหวต:</b>
                <br />• หากผลโหวตเสมอกัน ➡️ คนที่คะแนนเท่ากันจะถูกตัดสิทธิ์ แล้วโหวตใหม่จนกว่าจะได้ผู้ต้องสงสัยเพียงคนเดียว
                <br />• หาก Commons ชนะ (โหวตจับกุม Insider สำเร็จ) ➡️ Commons ทุกคนได้ **+1 แต้ม** (ยกเว้นกรรมการและคนทายคำปริศนาถูก)
                <br />• หาก Insider ชนะ (รอดการจับกุม) ➡️ Insider ได้ **+2 แต้ม** และคนเดาคำถูกได้ **+1 แต้ม**
              </Typography>
            </Paper>

            {/* ปุ่มเพื่อไปต่อรอบใหม่ */}
            {me && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <Typography variant="body2" fontWeight="bold" sx={{ color: "#7a6e6d" }}>
                  แต้มปัจจุบันของคุณ: <span style={{ color: "#ff4b5c", fontSize: "1.1rem" }}><b>{me.score ?? 0}</b></span> แต้ม
                </Typography>
                
                {isHost ? (
                  <Button
                    variant="contained"
                    onClick={onNextRound}
                    sx={{
                      bgcolor: "#caffbf",
                      color: "#275a24",
                      border: "2px solid #4a3e3d",
                      boxShadow: "0 3px 0 #4a3e3d",
                      borderRadius: "12px",
                      fontWeight: "900",
                      px: 3.5,
                      "&:hover": { bgcolor: "#b4f4a5" }
                    }}
                  >
                    เริ่มรอบถัดไป 🎬
                  </Button>
                ) : (
                  <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: "bold", maxWidth: 180, textAlign: "right" }}>
                    *เฉพาะโฮสต์เท่านั้นที่มีสิทธิ์กดเริ่มรอบถัดไป
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
