"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Container, TextField, Typography, Alert, CircularProgress, Chip, IconButton, Tooltip, Paper } from "@mui/material";
import LobbyView from "./LobbyView";
import TimerView from "./TimerView";
import VotingView from "./VotingView";
import ScoreboardView from "./ScoreboardView";
import ChatPanel from "./ChatPanel";
import PlayerTable from "./PlayerTable";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://api.insider-game.org/ws";
const MAX_RECONNECT = 5;

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function InsiderGamePage() {
  const [phase, setPhase] = useState("join");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  const wsRef = useRef(null);
  const inGameRef = useRef(false);
  const savedCredsRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [voteTarget, setVoteTarget] = useState(null);
  const [secretWord, setSecretWord] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [notice, setNotice] = useState("");
  const [categories, setCategories] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef(null);
  const prevStateRef = useRef(null);

  useEffect(() => {
    if (room?.state === "voting") {
      setVoteTarget(null);
    }
  }, [room?.state]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const playBeep = (freq = 440, dur = 0.15, type = "sine", vol = 0.18) => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0);
      o.stop(t0 + dur);
    } catch {}
  };

  useEffect(() => {
    const s = room?.state;
    if (!s || prevStateRef.current === s) return;
    prevStateRef.current = s;
    if (s === "countdown") playBeep(660, 0.18, "sine");
    else if (s === "voting") playBeep(520, 0.22, "triangle");
    else if (s === "scoreboard") playBeep(400, 0.32, "sawtooth");
  }, [room?.state]);

  useEffect(() => {
    const s = room?.state;
    if (s !== "countdown" && s !== "voting") return;
    const t = room?.timer ?? 0;
    if (t > 0 && t <= 10) playBeep(900, 0.07, "square", 0.12);
  }, [room?.timer]);

  useEffect(() => {
    const saved = localStorage.getItem("insider_session");
    if (!saved) return;
    try {
      const creds = JSON.parse(saved);
      setRoomCodeInput(creds.roomCode);
      setNameInput(creds.name);
      savedCredsRef.current = creds;
      setReconnecting(true);
      reconnectTimerRef.current = setTimeout(() => {
        connectToRoom("join", creds);
      }, 500);
    } catch {
      localStorage.removeItem("insider_session");
    }
  }, []);

  const clearSession = () => {
    inGameRef.current = false;
    savedCredsRef.current = null;
    reconnectCountRef.current = 0;
    setReconnecting(false);
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    localStorage.removeItem("insider_session");
  };

  const handleKicked = (message) => {
    clearSession();
    setError(message || "คุณถูกเชิญออกจากห้อง");
    setPhase("join");
    setRoom(null);
    setSelfId(null);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  };

  const handleLeaveRoom = () => {
    clearSession();
    setError("");
    setRoom(null);
    setSelfId(null);
    setPhase("join");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  };

  const connectToRoom = (mode, creds = null) => {
    const name = creds?.name || nameInput.trim();
    const roomCode = creds?.roomCode || roomCodeInput.trim();

    setError("");

    if (!name) { setError("กรุณากรอกชื่อผู้เล่น"); return; }
    if (!roomCode) { setError("กรุณากรอกรหัสห้อง"); return; }

    setConnecting(mode);

    let token = creds?.token || "";
    if (!token && mode === "join") {
      try {
        const s = JSON.parse(localStorage.getItem("insider_session") || "{}");
        if (s.roomCode === roomCode) token = s.token || "";
      } catch {}
    }

    let url = WS_URL + `?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(name)}&mode=${mode}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("WS connected");
      reconnectCountRef.current = 0;
      setReconnecting(false);
    };

    socket.onclose = () => {
      console.log("WS closed");
      wsRef.current = null;
      setConnecting(null);

      if (inGameRef.current && savedCredsRef.current) {
        const attempt = reconnectCountRef.current;
        if (attempt >= MAX_RECONNECT) {
          setReconnecting(false);
          setError("เชื่อมต่อไม่ได้หลังจากลองซ้ำหลายครั้ง กรุณาเข้าห้องใหม่");
          clearSession();
          setPhase("join");
          setRoom(null);
          setSelfId(null);
          return;
        }
        reconnectCountRef.current += 1;
        setReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        reconnectTimerRef.current = setTimeout(() => {
          connectToRoom("join", savedCredsRef.current);
        }, delay);
      }
    };

    socket.onerror = (e) => {
      console.error("WS error", e);
      if (!inGameRef.current) {
        setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        setConnecting(null);
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "error") {
          const text = msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์";
          if (mode === "create" && text.includes("ห้องนี้มีอยู่แล้ว")) {
            setError(text);
            setConnecting(null);
            return;
          }
          if (text.includes("ถูกเชิญออกจากห้องโดย Host")) {
            handleKicked(text);
            return;
          }
          if (mode === "join" && text.includes("room not found")) {
            if (inGameRef.current) {
              clearSession();
              setError("ห้องหายไปแล้ว (server อาจ restart) กรุณาสร้างห้องใหม่");
            } else {
              setError("ไม่พบห้องนี้ อาจพิมพ์รหัสผิด หรือห้องถูกลบแล้ว");
            }
            setPhase("join");
            setRoom(null);
            setSelfId(null);
            setConnecting(null);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.close();
            }
            wsRef.current = null;
            return;
          }
          setError(text);
          setConnecting(null);
          return;
        }

        if (msg.type === "chat") {
          setMessages((prev) => [...prev, msg]);
          return;
        }

        if (msg.type === "notice") {
          setNotice(msg.message || "");
          return;
        }

        if (msg.type === "reaction") {
          const rid = `${msg.ts || Date.now()}-${Math.random().toString(36).slice(2)}`;
          setReactions((prev) => [...prev, { id: rid, emoji: msg.emoji, name: msg.from?.name }]);
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== rid));
          }, 3000);
          return;
        }

        if (msg.type === "room") {
          setRoom(msg.room || null);
          if (Array.isArray(msg.categories) && msg.categories.length) {
            setCategories(msg.categories);
          }
          if (msg.selfId) {
            setSelfId(msg.selfId);
            inGameRef.current = true;
            const newToken = msg.token || savedCredsRef.current?.token || token;
            const sess = { roomCode, name, token: newToken };
            savedCredsRef.current = sess;
            localStorage.setItem("insider_session", JSON.stringify(sess));
          }
          setPhase("game");
          setConnecting(null);
        }
      } catch (err) {
        console.error("parse message error", err);
      }
    };
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

  const handleStartRound = (opts = {}) => {
    send({ type: "start_round", secretWord, random: !!opts.random, category: opts.category || "" });
  };

  const handleAddHint = (text) => {
    const t = (text || "").trim();
    if (!t) return;
    send({ type: "add_hint", text: t });
  };

  const handleAskQuestion = () => {
    send({ type: "ask_question" });
  };

  const handleReact = (emoji) => {
    if (!emoji) return;
    send({ type: "react", emoji });
  };

  const handleGuessCorrect = (correctGuesserId) => {
    if (!isJudge) return;
    send({ type: "guess_correct", ...(correctGuesserId ? { correctGuesserId } : {}) });
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

  const chatEnabled = room?.chatEnabled ?? true;
  const handleSendChat = () => {
    if (!chatEnabled) return;
    const text = chatInput.trim();
    if (!text) return;
    send({ type: "chat", text });
    setChatInput("");
  };
  
  const handleToggleChat = (enabled) => {
    send({ type: "set_chat_enabled", chatEnabled: enabled });
  };

  // ---------- PHASE: JOIN ROOM (ออกแบบใหม่แบบ Anime คิ้วท์ ๆ) ----------
  if (phase === "join") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "url('/detective_bg.png') no-repeat center center fixed",
          backgroundSize: "cover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={0}
            className="anime-bob"
            sx={{
              p: 4,
              borderRadius: "28px",
              bgcolor: "rgba(255, 255, 255, 0.72)",
              backdropFilter: "blur(12px)",
              border: "4px solid #4a3e3d",
              boxShadow: "0 10px 0 #4a3e3d",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* สปายสาวนักสืบ Chibi Emoji เกร๋ ๆ */}
            <Box sx={{ width: 70, height: 70, mb: 1.5, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#ffeef2", border: "3.5px solid #4a3e3d", borderRadius: "50%", boxShadow: "0 4px 0 #4a3e3d", fontSize: "2.5rem" }}>
              🕵️‍♀️
            </Box>


            <Typography variant="h4" align="center" fontWeight="900" sx={{ color: "#4a3e3d", mb: 1, letterSpacing: "-0.01em" }}>
              Insider Party!
            </Typography>
            <Typography variant="body2" align="center" sx={{ color: "#7a6e6d", fontWeight: "bold", mb: 3 }}>
              ร่วมไขคดีทายคำปริศนาและจับโกหกอินไซเดอร์ 🌸
            </Typography>

            <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="กรอกชื่อเล่นของคุณ"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    bgcolor: "white",
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "2.5px solid #4a3e3d",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "2.5px solid #4a3e3d",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "2.5px solid #ff9aa2",
                    }
                  },
                  "& .MuiInputLabel-root": { color: "#7a6e6d", fontWeight: "bold" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#ff9aa2" },
                  "& .MuiInputLabel-shrink": { bgcolor: "white", px: 1, borderRadius: "4px" },
                  "& .MuiInputBase-input": { fontWeight: "bold", color: "#4a3e3d" }
                }}
              />
              <TextField
                fullWidth
                label="รหัสห้อง (Room Code)"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    bgcolor: "white",
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "2.5px solid #4a3e3d",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "2.5px solid #4a3e3d",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "2.5px solid #ff9aa2",
                    }
                  },
                  "& .MuiInputLabel-root": { color: "#7a6e6d", fontWeight: "bold" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#ff9aa2" },
                  "& .MuiInputLabel-shrink": { bgcolor: "white", px: 1, borderRadius: "4px" },
                  "& .MuiInputBase-input": { fontWeight: "bold", color: "#4a3e3d" }
                }}
              />

              {error && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: "14px", border: "2px solid #ef4444", color: "#b91c1c", fontWeight: "bold", bgcolor: "#fef2f2" }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => connectToRoom("create")}
                  disabled={connecting !== null}
                  sx={{
                    bgcolor: "#ff9aa2",
                    color: "white",
                    border: "3px solid #4a3e3d",
                    boxShadow: "0 4px 0 #4a3e3d",
                    borderRadius: "16px",
                    fontWeight: "900",
                    py: 1.1,
                    fontSize: "0.9rem",
                    "&:hover": { bgcolor: "#ff829d" },
                    "&.Mui-disabled": { bgcolor: "#f1f5f9", color: "#cbd5e1", border: "2.5px solid #cbd5e1" }
                  }}
                >
                  {connecting === "create" ? "กำลังสร้าง..." : "สร้างห้องใหม่"}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => connectToRoom("join")}
                  disabled={connecting !== null}
                  sx={{
                    color: "#4a3e3d",
                    borderColor: "#4a3e3d",
                    borderWidth: "3px",
                    boxShadow: "0 4px 0 #4a3e3d",
                    borderRadius: "16px",
                    fontWeight: "900",
                    py: 1.1,
                    fontSize: "0.9rem",
                    "&:hover": { borderWidth: "3px", borderColor: "#ff9aa2", bgcolor: "#fff0f3" },
                    "&.Mui-disabled": { bgcolor: "#f1f5f9", color: "#cbd5e1", border: "2.5px solid #cbd5e1" }
                  }}
                >
                  {connecting === "join" ? "กำลังเข้า..." : "เข้าร่วมห้อง"}
                </Button>
              </Box>

              <Button
                fullWidth
                variant="text"
                onClick={() => connectToRoom("spectate")}
                disabled={connecting !== null}
                sx={{ color: "#7a6e6d", fontWeight: "800", fontSize: "0.82rem", py: 1 }}
              >
                👀 ขอเป็นเพียงผู้ชม (Spectate)
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!room) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={30} sx={{ color: "#ff9aa2", mr: 1.5 }} />
        <Typography fontWeight="bold" sx={{ color: "#4a3e3d" }}>กำลังโหลดการเชื่อมต่อหน้าคดี...</Typography>
      </Box>
    );
  }

  const currentState = room.state;
  const isVoting = currentState === "voting";
  const votedMap = room?.voted || {};
  const blockedMap = room?.blockedVoters || {};
  const iAmBlocked = !!blockedMap[selfId];
  const iVoted = !!votedMap[selfId];
  const isSpectator = me?.spectator === true;
  const canVote = isVoting && !iAmBlocked && !iVoted && me?.role !== "judge" && !isSpectator;

  const sharedTableProps = {
    players, selfId, room, isHost, voteTarget, onVote: handleVote,
    onKick: (targetId) => {
      if (window.confirm("คุณต้องการเตะนักสืบคนนี้ออกจากโต๊ะประชุมจริงหรือไม่?")) {
        send({ type: "kick", targetId });
      }
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #FFF0F5 0%, #E6F2FF 50%, #F0F3FF 100%)", display: "flex", flexDirection: "column", p: { xs: 1, sm: 2 } }}>
      
      {/* ป้ายเตือนต่าง ๆ ด้านบนสุด */}
      {reconnecting && (
        <Box sx={{ bgcolor: "#fde047", border: "2px solid #4a3e3d", borderRadius: "12px", px: 2, py: 0.6, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={12} sx={{ color: "#4a3e3d" }} />
          <Typography variant="caption" sx={{ color: "#4a3e3d", fontWeight: "bold" }}>
            กำลังพยายามกู้คืนห้อง... (ลองรอบที่ {reconnectCountRef.current}/{MAX_RECONNECT})
          </Typography>
        </Box>
      )}

      {notice && (
        <Box sx={{ bgcolor: "#fecdd3", border: "2px solid #ef4444", borderRadius: "12px", px: 2, py: 0.8, mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: "#9f1239", fontWeight: "bold" }}>
            ⚠️ {notice}
          </Typography>
          <IconButton size="small" onClick={() => setNotice("")} sx={{ color: "#9f1239", p: 0 }}>✕</IconButton>
        </Box>
      )}

      {/* Header สไตล์ Visual Novel */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "white", border: "3px solid #4a3e3d", borderRadius: "20px", px: 2.5, py: 1.2, mb: 2, boxShadow: "0 4px 0 #4a3e3d" }}>
        <Box>
          <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "800", display: "block" }}>รหัสห้องสืบ</Typography>
          <Typography fontWeight="900" sx={{ color: "#4a3e3d", fontSize: "1.1rem" }}>
            {room.code || roomCodeInput}
          </Typography>
        </Box>

        <Box sx={{ textAlign: "center", bgcolor: "#fff0f3", px: 3, py: 0.4, border: "2px solid #4a3e3d", borderRadius: "99px", boxShadow: "0 2px 0 #4a3e3d" }}>
          <Typography fontWeight="900" sx={{ color: "#4a3e3d", fontSize: "1.5rem", lineHeight: 1.1 }}>
            ⏱️ {formatTime(room.timer ?? 0)}
          </Typography>
          <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "bold", fontSize: "0.62rem" }}>
            {currentState === "countdown" && "เฟสทายคำ"}
            {currentState === "voting" && "เฟสโหวตฆาตกร"}
            {currentState === "lobby" && "รอจัดเตรียมรอบ"}
            {currentState === "scoreboard" && "รอบสิ้นสุดลงแล้ว"}
            {currentState === "assign_roles" && "กำลังแอบแจกบทบาท..."}
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right" }}>
          <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "800", display: "block" }}>คุณคือนักสืบ</Typography>
          <Typography fontWeight="900" sx={{ color: "#4a3e3d", fontSize: "0.95rem" }}>
            {me?.name || nameInput}
          </Typography>
          {me?.role && !isSpectator && (
            <Chip size="small" label={me.role.toUpperCase()} sx={{ bgcolor: "#ff9aa2", color: "#fff", border: "1.5px solid #4a3e3d", height: 16, fontSize: "0.55rem", fontWeight: "bold" }} />
          )}
          {isSpectator && (
            <Chip size="small" label="ผู้ชม" sx={{ bgcolor: "#cbd5e1", color: "#475569", border: "1.5px solid #4a3e3d", height: 16, fontSize: "0.55rem", fontWeight: "bold" }} />
          )}
        </Box>
      </Box>

      {/* Main Layout 2 ฝั่งแบบ Dashboard (แก้วิกฤตมือถือ) */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, overflow: "hidden" }}>
        
        {/* ฝั่งซ้าย: โต๊ะประชุมล้อมวง (58% ของหน้าจอฝั่งเดสก์ท็อป) */}
        <Box sx={{ flex: { xs: "none", md: 5.8 }, display: "flex", flexDirection: "column" }}>
          <PlayerTable {...sharedTableProps} />
        </Box>

        {/* ฝั่งขวา: คอนเทนต์หลัก + ห้องแชท (42% ของหน้าจอฝั่งเดสก์ท็อป) */}
        <Box sx={{ flex: { xs: "none", md: 4.2 }, display: "flex", flexDirection: "column", gap: 2 }}>
          
          {/* ส่วนเปลี่ยนผ่านเฟสควบคุมของเกม */}
          <Box sx={{ flex: 1 }}>
            {currentState === "lobby" && (
              <LobbyView room={room} players={players} me={me} isHost={isHost} isJudge={isJudge} secretWord={secretWord} setSecretWord={setSecretWord} onSetJudge={handleSetJudge} onStartRound={handleStartRound} chatEnabled={chatEnabled} onToggleChat={handleToggleChat} categories={categories} />
            )}
            {currentState === "countdown" && (
              <TimerView room={room} me={me} isJudge={isJudge} onGuessCorrect={handleGuessCorrect} players={players} onAddHint={handleAddHint} onAskQuestion={handleAskQuestion} />
            )}
            {currentState === "voting" && (
              <VotingView room={room} players={players} me={me} />
            )}
            {currentState === "scoreboard" && (
              <ScoreboardView room={room} players={players} insiderId={room.insiderId} me={me} onNextRound={handleNextRound} />
            )}
            {currentState === "assign_roles" && (
              <Paper sx={{ p: 4, borderRadius: "24px", border: "3px solid #4a3e3d", boxShadow: "0 8px 0 #4a3e3d", textAlign: "center" }}>
                <CircularProgress size={24} sx={{ color: "#ff9aa2", mb: 1 }} />
                <Typography fontWeight="bold" sx={{ color: "#4a3e3d" }}>กำลังแอบตรวจสอบและแจกบทบาท...</Typography>
              </Paper>
            )}
          </Box>

          {/* คอนเทนต์ Reactions Floating Overlay */}
          {reactions.length > 0 && (
            <Box sx={{ position: "fixed", bottom: 120, left: 0, right: 0, zIndex: 1250, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              {reactions.map((r) => (
                <Box key={r.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, className: "anime-float", animation: "floatUp 2s ease-out forwards" }}>
                  <Typography sx={{ fontSize: "1.8rem" }}>{r.emoji}</Typography>
                  {r.name && <Typography variant="caption" sx={{ color: "#4a3e3d", fontWeight: "bold", bgcolor: "white", px: 0.8, py: 0.1, border: "1.5px solid #4a3e3d", borderRadius: "8px" }}>{r.name}</Typography>}
                </Box>
              ))}
            </Box>
          )}

          {/* เมนูแชทข้อความ */}
          {chatEnabled && (
            <ChatPanel messages={messages} me={me} value={chatInput} onChange={setChatInput} onSend={handleSendChat} enabled={chatEnabled} />
          )}
        </Box>
      </Box>

      {/* แผงปุ่มลอยสำหรับสวิตช์เปิดปิดเสียงและออกจากห้อง */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, p: 1.5, bgcolor: "white", border: "3px solid #4a3e3d", borderRadius: "18px", boxShadow: "0 4px 0 #4a3e3d" }}>
        {/* แถบ Reactions */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {["👍", "😂", "😮", "😡", "❓", "🎉"].map((e) => (
            <IconButton key={e} size="small" onClick={() => handleReact(e)} sx={{ fontSize: "1.2rem", p: 0.5, border: "2px solid transparent", "&:hover": { border: "2px solid #4a3e3d", bgcolor: "#fff0f3" } }}>
              {e}
            </IconButton>
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title={soundOn ? "ปิดเอฟเฟกต์เสียง" : "เปิดเอฟเฟกต์เสียง"}>
            <Button
              onClick={() => setSoundOn(!soundOn)}
              sx={{
                bgcolor: "white",
                color: "#4a3e3d",
                border: "2px solid #4a3e3d",
                boxShadow: "0 3px 0 #4a3e3d",
                borderRadius: "12px",
                fontWeight: "900",
                fontSize: "0.8rem",
                px: 2,
                minWidth: 42,
                "&:hover": { bgcolor: "#f1f5f9" }
              }}
            >
              {soundOn ? "🔊" : "🔇"}
            </Button>
          </Tooltip>
          
          <Button
            variant="contained"
            color="error"
            onClick={handleLeaveRoom}
            sx={{
              bgcolor: "#ffadad",
              color: "#7c1a1a",
              border: "2px solid #4a3e3d",
              boxShadow: "0 3px 0 #4a3e3d",
              borderRadius: "12px",
              fontWeight: "900",
              fontSize: "0.8rem",
              px: 3,
              "&:hover": { bgcolor: "#ff8b8b" }
            }}
          >
            ออกจากห้อง 🚪
          </Button>
        </Box>
      </Box>

    </Box>
  );
}
