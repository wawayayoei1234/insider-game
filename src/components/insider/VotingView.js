// VotingView.js
"use client";

import { Box, Typography, Button, Grid, Chip, List, ListItem } from "@mui/material";

export default function VotingView({ room, players, me, voteTarget, onVote }) {
  const candidates = players.filter((p) => p.id !== room.judgeId);

  const isJudge = me?.role === "judge";
  const votedMap = room.voted || {};              // { voterId: true }
  const blockedMap = room.blockedVoters || {};    // { playerId: true }
  const myId = me?.id;
  const iAmBlocked = !!blockedMap[myId];
  const iVoted = !!votedMap[myId];

  // ถ้าเป็นกรรมการ → ไม่ร่วมโหวต
  if (isJudge) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Phase โหวตหา Insider
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ตอนนี้เป็นช่วงที่ผู้เล่นทุกคนโหวตหา Insider
          คุณเป็น{" "}
          <Box component="span" fontWeight="bold">
            กรรมการ
          </Box>{" "}
          จึงไม่ร่วมโหวตและไม่มีคะแนนในเกมนี้
        </Typography>

        <VoteStatusList
          players={players}
          room={room}
          votedMap={votedMap}
          blockedMap={blockedMap}
        />
      </Box>
    );
  }

  // ไม่ใช่กรรมการ แต่ถูกบล็อก (เป็นกลุ่มที่ถูกสงสัย)
  const canVote = !iAmBlocked;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Phase โหวตหา Insider
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ทุกคนอภิปราย / อธิบายเหตุผล แล้วเลือก 1 คนที่คิดว่าเป็น Insider
      </Typography>

      {iAmBlocked && (
        <Typography
          variant="body2"
          color="error"
          sx={{ mt: 1, fontWeight: 500 }}
        >
          คุณอยู่ในกลุ่มที่ถูกสงสัยจากรอบที่แล้ว
          จึง{" "}
          <Box component="span" fontWeight="bold">
            ไม่มีสิทธิ์โหวตรอบนี้
          </Box>
        </Typography>
      )}

      {/* ปุ่มโหวต */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          เลือกคนที่คุณสงสัย (โหวตได้ 1 คน)
        </Typography>
        <Grid container spacing={1}>
          {candidates.map((p) => {
            const isSelected = voteTarget === p.id;
            const isSuspectFromTie = !!blockedMap[p.id];

            return (
              <Grid item xs={12} sm={6} key={p.id}>
                <Button
                  fullWidth
                  variant={isSelected ? "contained" : "outlined"}
                  color={isSelected ? "primary" : "inherit"}
                  onClick={() => onVote(p.id)}
                  disabled={!canVote || iVoted}
                  sx={{
                    justifyContent: "space-between",
                    textTransform: "none",
                    borderRadius: 3,
                  }}
                >
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      แต้มปัจจุบัน: {p.score ?? 0}
                    </Typography>
                  </Box>
                  <Box>
                    {isSuspectFromTie && (
                      <Chip
                        label="ผู้ต้องสงสัยรอบที่แล้ว"
                        size="small"
                        color="warning"
                        sx={{ mr: 1 }}
                      />
                    )}
                  </Box>
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* สเตตัสของเราเอง */}
      <Box sx={{ mt: 1.5 }}>
        {canVote ? (
          iVoted ? (
            <Typography variant="body2" color="success.main">
              คุณโหวตแล้ว รอเพื่อน ๆ โหวตให้ครบ หรือให้เวลาหมด
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              ยังไม่ได้โหวต ลองคุยกับเพื่อนก่อนแล้วค่อยเลือกคนที่สงสัย 😊
            </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.secondary">
            คุณโหวตไม่ได้ แต่ยังร่วมคุย / ให้เหตุผลได้ตามกติกา
          </Typography>
        )}
      </Box>

      {/* รายการว่าตอนนี้ใครโหวตแล้ว / โหวตไม่ได้ */}
      <Box sx={{ mt: 3 }}>
        <VoteStatusList
          players={players}
          room={room}
          votedMap={votedMap}
          blockedMap={blockedMap}
        />
      </Box>
    </Box>
  );
}

function VoteStatusList({ players, room, votedMap, blockedMap }) {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, color: "#334155", fontWeight: 600 }}
      >
        สถานะการโหวตของผู้เล่น
      </Typography>
      <List dense sx={{ maxHeight: 180, overflowY: "auto" }}>
        {players.map((p) => {
          let label = "";
          let color = "default";
          const isJudge = p.id === room.judgeId;
          const isBlocked = !!blockedMap[p.id];
          const hasVoted = !!votedMap[p.id];

          if (isJudge) {
            label = "กรรมการ (ไม่ร่วมโหวต)";
            color = "info";
          } else if (isBlocked) {
            label = "ผู้ต้องสงสัย (โหวตไม่ได้)";
            color = "warning";
          } else if (hasVoted) {
            label = "โหวตแล้ว";
            color = "success";
          } else {
            label = "ยังไม่โหวต";
            color = "default";
          }

          return (
            <ListItem
              key={p.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                px: 0,
              }}
            >
              <Typography variant="body2">{p.name}</Typography>
              <Chip size="small" label={label} color={color} />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
