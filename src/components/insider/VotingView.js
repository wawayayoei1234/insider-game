// src/components/insider/VotingView.jsx
import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
} from "@mui/material";

export default function VotingView({ room, players, me, voteTarget, onVote }) {
  // ไม่รวมกรรมการและตัวเราเอง
  const candidates = players.filter(
    (p) => p.id !== room.judgeId && p.id !== me?.id
  );
  const isJudge = me?.role === "judge";
  const word = room.secretWord || "";

  if (isJudge) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Phase โหวตหา Insider
        </Typography>

        {word && (
          <Card
            sx={{
              mb: 2,
              bgcolor: "#f5f3ff",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                คำปริศนาของรอบนี้คือ:{" "}
                <Box component="span" fontWeight="bold" color="#4f46e5">
                  {word}
                </Box>
              </Typography>
            </CardContent>
          </Card>
        )}

        <Typography variant="body2" color="text.secondary">
          ตอนนี้เป็นช่วงที่ผู้เล่นทุกคนโหวตหา Insider
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          คุณเป็น <Box component="span" fontWeight="bold">กรรมการ</Box>{" "}
          จึงไม่ร่วมโหวต และไม่มีคะแนนในเกมนี้
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Phase โหวตหา Insider
      </Typography>

      {word && (
        <Card
          sx={{
            mb: 2,
            bgcolor: "#ecfeff",
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              คำปริศนาที่ใช้ในรอบนี้คือ:{" "}
              <Box component="span" fontWeight="bold" color="#0369a1">
                {word}
              </Box>
            </Typography>
          </CardContent>
        </Card>
      )}

      <Typography variant="body2" color="text.secondary">
        ทุกคนอภิปราย / อธิบายเหตุผล แล้วเลือก 1 คนที่คิดว่าเป็น Insider
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          เลือกคนที่คุณสงสัย (โหวตได้ 1 คน)
        </Typography>
        <Grid container columns={12} spacing={1}>
          {candidates.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant={voteTarget === p.id ? "contained" : "outlined"}
                sx={
                  voteTarget === p.id
                    ? {
                        bgcolor: "#22c55e",
                        "&:hover": { bgcolor: "#16a34a" },
                      }
                    : {
                        borderColor: "#e5e7eb",
                        "&:hover": {
                          borderColor: "#22c55e",
                          bgcolor: "#f0fdf4",
                        },
                      }
                }
                onClick={() => onVote(p.id)}
              >
                {p.name}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mt: 2 }}>
        {voteTarget ? (
          <Typography variant="body2" color="#16a34a">
            คุณเลือกโหวต:{" "}
            <Box component="span" fontWeight="bold">
              {players.find((p) => p.id === voteTarget)?.name}
            </Box>{" "}
            (สามารถเปลี่ยนได้จนกว่าเซิร์ฟเวอร์จะปิดรับโหวต)
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            ยังไม่ได้เลือกใคร ลองคุยกับเพื่อนก่อนแล้วค่อยโหวต 😊
          </Typography>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          * เซิร์ฟเวอร์จะนับผลโหวตเมื่อทุกคนโหวตครบ (ยกเว้นกรรมการที่ไม่ร่วมโหวต)
        </Typography>
      </Box>
    </Box>
  );
}
