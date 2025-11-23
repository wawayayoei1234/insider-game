"use client";

import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip,
} from "@mui/material";

import LobbyView from "./LobbyView";
import TimerView from "./TimerView";
import VotingView from "./VotingView";
import ScoreboardView from "./ScoreboardView";
import PlayerTable from "./PlayerTable";


const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

function formatTime(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function InsiderGamePage() {
  const [phase, setPhase] = useState("join"); // join | game
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  const wsRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(null);

  const [voteTarget, setVoteTarget] = useState(null);
  const [secretWord, setSecretWord] = useState("");

  const connectToRoom = (mode) => {
    setError("");

    if (!nameInput.trim()) {
      setError("กรุณากรอกชื่อผู้เล่น");
      return;
    }

    if (!roomCodeInput.trim()) {
      setError("กรุณากรอกรหัสห้อง");
      return;
    }

    setConnecting(mode); 

    const url =
      WS_URL +
      `?room=${encodeURIComponent(roomCodeInput.trim())}&name=${encodeURIComponent(
        nameInput.trim()
      )}&mode=${mode}`;

    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log("WS connected");
      setPhase("game");
      setConnecting(null); 
    };

    socket.onclose = () => {
      console.log("WS closed");
      wsRef.current = null;
      setConnecting(null); 
    };

    socket.onerror = (e) => {
      console.error("WS error", e);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setConnecting(null); 
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "error") {
          setError(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
          setConnecting(null);
          return;
        }

        if (msg.type === "room") {
          setRoom(msg.room || null);
          if (msg.selfId) {
            setSelfId(msg.selfId);
          }
        }
      } catch (err) {
        console.error("parse message error", err);
      }
    };

    wsRef.current = socket;
  };


  const send = (payload) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WS not ready");
      return;
    }
    socket.send(JSON.stringify(payload));
  };

  const players = useMemo(() => {
    if (!room || !room.players) return [];
    if (Array.isArray(room.players)) return room.players;
    return Object.values(room.players);
  }, [room]);

  const me = useMemo(() => {
    if (!selfId) return null;
    return players.find((p) => p.id === selfId) || null;
  }, [players, selfId]);

  const isHost = room && me && room.hostId === me.id;
  const isJudge = room && me && room.judgeId === me.id;

  const handleSetJudge = (id) => {
    send({ type: "set_judge", targetId: id });
    setSecretWord("");
  };

  const handleStartRound = () => {
    send({ type: "start_round", duration: 180, secretWord });
  };

  const handleGuessCorrect = () => {
    if (!isJudge) return;
    send({ type: "guess_correct" });
  };

  const handleVote = (suspectId) => {
    setVoteTarget(suspectId);
    send({ type: "vote_insider", suspectId });
  };

  const handleNextRound = () => {
    setVoteTarget(null);
    setSecretWord("");
    send({ type: "next_round" });
  };

  if (phase === "join") {
    return (
      <Box sx={{minHeight: "100vh",bgcolor: "linear-gradient(135deg, #e0f2fe, #f5e9ff)",display: "flex",alignItems: "center",justifyContent: "center",}}>
        <Container maxWidth="sm">
          <Paper
            elevation={8}
            sx={{
              p: 4,
              borderRadius: 4,
              bgcolor: "#ffffff",
              boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
            }}
          >
            <Typography
              variant="h4"
              align="center"
              fontWeight="bold"
              sx={{
                mb: 1,
                background:
                  "linear-gradient(120deg, #6366f1, #ec4899 50%, #22c55e)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Insider Party
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              สร้างห้องเล่นกับเพื่อน แล้วลองเดาว่าใครคือ Insider 🎉
            </Typography>

            <TextField
              fullWidth
              label="ชื่อผู้เล่น"
              variant="outlined"
              margin="normal"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <TextField
              fullWidth
              label="รหัสห้อง (เช่น ABCD)"
              variant="outlined"
              margin="normal"
              value={roomCodeInput}
              onChange={(e) =>
                setRoomCodeInput(e.target.value.toUpperCase())
              }
            />

            {error && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error" variant="outlined">
                  {error}
                </Alert>
              </Box>
            )}

           <Box sx={{mt: 3,display: "flex",gap: 2,}}>
              <Button fullWidth variant="contained" sx={{
                  bgcolor: "#6366f1",
                  "&:hover": { bgcolor: "#4f46e5" },
                }}
                onClick={() => connectToRoom("create")}
                disabled={connecting !== null} 
                startIcon={
                  connecting === "create" ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : null
                }
              >
                {connecting === "create" ? "กำลังสร้าง..." : "สร้างห้องใหม่"}
              </Button>

              {/* ปุ่มเข้าห้อง */}
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: "#6366f1",
                  color: "#4f46e5",
                  "&:hover": {
                    borderColor: "#4f46e5",
                    bgcolor: "rgba(99,102,241,0.06)",
                  },
                }}
                onClick={() => connectToRoom("join")}
                disabled={connecting !== null}
                startIcon={
                  connecting === "join" ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : null
                }
              >
                {connecting === "join" ? "กำลังเข้าห้อง..." : "เข้าห้อง"}
              </Button>
            </Box>

          </Paper>
        </Container>
      </Box>
    );
  }

  if (!room) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#eef2ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">
          กำลังเชื่อมต่อเซิร์ฟเวอร์...
        </Typography>
      </Box>
    );
  }

  const currentState = room.state;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "linear-gradient(135deg, #eff6ff, #fdf2ff)",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Paper
            elevation={4}
            sx={{
              p: 2.5,
              borderRadius: 3,
              background:
                "linear-gradient(120deg, #6366f1, #ec4899 60%, #22c55e)",
              color: "white",
            }}
          >
            <Grid
              container
              columns={12}
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h5" fontWeight="bold">
                  Insider Game
                </Typography>
                <Typography variant="body2" component="div">
                  ห้อง:{" "}
                  <Box component="span" sx={{ fontFamily: "monospace" }}>
                    {room.code || roomCodeInput}
                  </Box>
                </Typography>
              </Grid>
              <Grid
                size={{ xs: 12, md: 6 }}
                sx={{ textAlign: { xs: "left", md: "right" } }}
              >
                <Typography variant="body2" component="div">
                  คุณคือ{" "}
                    <Box component="span" fontWeight="bold">
                      {me?.name || nameInput}
                    </Box>
                  {me?.role && (
                    <Chip
                      size="small"
                      label={me.role.toUpperCase()}
                      sx={{
                        ml: 1,
                        bgcolor: "rgba(255,255,255,0.18)",
                        color: "white",
                        borderRadius: 999,
                      }}
                    />
                  )}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Status + Timer */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            bgcolor: "white",
            border: "1px solid #e5e7eb",
          }}
        >
          <Grid
            container
            columns={12}
            alignItems="center"
            justifyContent="space-between"
          >
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="body2" component="div">
                สถานะเกม:{" "}
                <Box component="span" fontWeight="bold">
                  {currentState === "lobby" && "เตรียมตัว (Lobby)"}
                  {currentState === "assign_roles" && "กำลังแจกบทบาท"}
                  {currentState === "countdown" && "กำลังเล่น / นับถอยหลัง"}
                  {currentState === "voting" && "โหวตหา Insider"}
                  {currentState === "scoreboard" && "สรุปคะแนน (จบรอบ)"}
                  {![
                    "lobby",
                    "assign_roles",
                    "countdown",
                    "voting",
                    "scoreboard",
                  ].includes(currentState) && currentState}
                </Box>
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Host:{" "}
                {players.find((p) => p.id === room.hostId)?.name || "ไม่ทราบ"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                กรรมการ:{" "}
                {room.judgeId
                  ? players.find((p) => p.id === room.judgeId)?.name ||
                    "(ยังไม่เลือก)"
                  : "(ยังไม่เลือก)"}
              </Typography>
            </Grid>
            <Grid
              size={{ xs: 12, md: 4 }}
              sx={{ textAlign: { xs: "left", md: "right" }, mt: { xs: 2, md: 0 } }}
            >
              <Typography variant="caption" color="text.secondary">
                เวลาที่เหลือ
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontFamily: "monospace", fontWeight: "bold" }}
              >
                {formatTime(room.timer ?? 0)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Grid container columns={12} spacing={3}>
  
      <Grid size={{ xs: 12, md: 5 }}>
        <PlayerTable
          players={players}
          selfId={selfId}
          room={room}
          isHost={isHost}
          onKick={(targetId) => {
            const ok = window.confirm("ต้องการเตะผู้เล่นคนนี้ออกจากห้องหรือไม่?");
            if (!ok) return;
            send({ type: "kick", targetId });
          }}
        />
      </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
        <Paper
            elevation={2}
            sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: "white",
            border: "1px solid #e5e7eb",
            minHeight: 260,
            }}
        >
              {currentState === "lobby" && (
                <LobbyView
                  room={room}
                  players={players}
                  me={me}
                  isHost={isHost}
                  isJudge={isJudge}
                  secretWord={secretWord}
                  setSecretWord={setSecretWord}
                  onSetJudge={handleSetJudge}
                  onStartRound={handleStartRound}
                />
              )}

              {currentState === "countdown" && (
                <TimerView
                  room={room}
                  me={me}
                  isJudge={isJudge}
                  onGuessCorrect={handleGuessCorrect}
                />
              )}

              {currentState === "voting" && (
                <VotingView
                  room={room}
                  players={players}
                  me={me}
                  voteTarget={voteTarget}
                  onVote={handleVote}
                />
              )}

              {currentState === "scoreboard" && (
                <ScoreboardView
                  room={room}
                  players={players}
                  insiderId={room.insiderId}
                  me={me}
                  onNextRound={handleNextRound}
                />
              )}

              {!["lobby", "countdown", "voting", "scoreboard"].includes(
                currentState
              ) && (
                <Typography variant="body2" color="text.secondary">
                  รอเซิร์ฟเวอร์อัปเดตสถานะเกม...
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
