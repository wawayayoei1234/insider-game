"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Container, TextField, Typography, Alert, CircularProgress, Chip, IconButton, Tooltip, Paper, Divider, Dialog, DialogTitle, DialogContent } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardVoiceIcon from "@mui/icons-material/KeyboardVoice";
import MicOffIcon from "@mui/icons-material/MicOff";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LobbyView from "./LobbyView";
import TimerView from "./TimerView";
import VotingView from "./VotingView";
import ScoreboardView from "./ScoreboardView";
import ChatPanel from "./ChatPanel";
import PlayerTable from "./PlayerTable";
import useAgoraVoice from "../../hooks/useAgoraVoice";

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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

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

  const { isMuted, toggleMic, speakingList, voiceActive, errorMsg: voiceError } = useAgoraVoice(
    room?.code,
    selfId,
    phase === "game"
  );
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
      try {
        wsRef.current.send(JSON.stringify({ type: "leave" }));
      } catch (e) {}
      wsRef.current.close();
    }
    wsRef.current = null;
  };

  const connectToRoom = (mode, creds = null) => {
    const name = creds?.name || nameInput.trim();
    let roomCode = creds?.roomCode || roomCodeInput.trim();

    setError("");

    if (!name) { setError("กรุณากรอกชื่อผู้เล่น"); return; }
    
    if (mode === "create" && !roomCode) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let randomCode = "";
      for (let i = 0; i < 4; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      roomCode = randomCode;
      setRoomCodeInput(randomCode);
    }
    
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

  const handleCopyCode = () => {
    const code = room?.code || roomCodeInput;
    if (!code) return;
    try {
      navigator.clipboard?.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {}
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
            {/* โลโก้อภิมหาคิ้วท์ประจำเกม */}
            <Box
              component="img"
              src="/game_logo.png"
              alt="Insider Party Logo"
              sx={{
                width: 80,
                height: 80,
                mb: 1.5,
                borderRadius: "50%",
                border: "3.5px solid #4a3e3d",
                boxShadow: "0 4px 0 #4a3e3d",
                objectFit: "cover",
                bgcolor: "white",
              }}
            />


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
                sx={{ color: "#7a6e6d", fontWeight: "800", fontSize: "0.82rem", py: 0.5 }}
              >
                👀 ขอเป็นเพียงผู้ชม (Spectate)
              </Button>

              <Divider sx={{ my: 0.5, borderStyle: "dashed", borderColor: "#4a3e3d", borderWidth: "1.5px" }} />

              <Button
                fullWidth
                variant="outlined"
                onClick={() => setRulesOpen(true)}
                sx={{
                  color: "#ff7b90",
                  borderColor: "#ff7b90",
                  borderWidth: "2px",
                  borderRadius: "14px",
                  fontWeight: "900",
                  fontSize: "0.82rem",
                  py: 0.8,
                  "&:hover": { borderWidth: "2px", borderColor: "#ff4b6b", bgcolor: "#fff0f3" }
                }}
              >
                📖 วิธีการเล่นเกม (How to Play)
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

  // สถานะป้ายไมค์ (สะท้อนสถานะจริง: ปิด / เปิด / กำลังเชื่อมต่อ / ขัดข้อง)
  const micStatus = voiceError
    ? { label: "ไมค์ขัดข้อง", Icon: ErrorOutlineIcon, bg: "#fee2e2", color: "#dc2626", pulse: false }
    : !voiceActive
    ? { label: "กำลังเชื่อมต่อ...", Icon: HourglassEmptyIcon, bg: "#f1f5f9", color: "#64748b", pulse: false }
    : isMuted
    ? { label: "ไมค์ปิด", Icon: MicOffIcon, bg: "#f1f5f9", color: "#64748b", pulse: false }
    : { label: "ไมค์เปิด", Icon: KeyboardVoiceIcon, bg: "#d1faf0", color: "#0d9488", pulse: true };

  const sharedTableProps = {
    players, selfId, room, isHost, voteTarget, onVote: handleVote, speakingList,
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

      {/* Header สไตล์การ์ดสะอาด 2 แถว */}
      <Box sx={{ bgcolor: "white", borderRadius: "22px", px: { xs: 2, sm: 2.5 }, py: { xs: 1.2, sm: 1.5 }, mb: 2, boxShadow: "0 6px 20px rgba(74,62,61,0.12)", border: "1px solid rgba(74,62,61,0.08)" }}>
        {/* แถวบน: รหัสห้อง + สถานะไมค์ */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
            <Typography sx={{ color: "#6b6463", fontWeight: "700", fontSize: { xs: "0.95rem", sm: "1.05rem" }, whiteSpace: "nowrap" }}>
              รหัสห้องสืบ:
            </Typography>
            <Typography fontWeight="900" sx={{ color: "#0e7490", fontSize: { xs: "1.3rem", sm: "1.5rem" }, lineHeight: 1, letterSpacing: "0.02em" }}>
              {room.code || roomCodeInput}
            </Typography>
            <Tooltip title={codeCopied ? "คัดลอกแล้ว!" : "คัดลอกรหัสห้อง"}>
              <IconButton size="small" onClick={handleCopyCode} sx={{ color: codeCopied ? "#16a34a" : "#9ca3af", p: 0.4, "&:hover": { color: "#0e7490", bgcolor: "#ecfeff" } }}>
                {codeCopied ? <CheckIcon sx={{ fontSize: 18 }} /> : <ContentCopyIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="วิธีเล่นเกม">
              <IconButton size="small" onClick={() => setRulesOpen(true)} sx={{ color: "#ff9aa2", p: 0.4, "&:hover": { color: "#ff4b6b", bgcolor: "#fff0f3" } }}>
                <MenuBookIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* ป้ายสถานะไมค์ (สะท้อนสถานะจริง) */}
          {process.env.NEXT_PUBLIC_AGORA_APP_ID && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                flexShrink: 0,
                bgcolor: micStatus.bg,
                color: micStatus.color,
                borderRadius: "99px",
                px: 1.2,
                py: 0.4,
                ...(micStatus.pulse && { animation: "micPulse 1.4s ease-in-out infinite" }),
              }}
            >
              <micStatus.Icon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontWeight: "800", fontSize: { xs: "0.72rem", sm: "0.8rem" }, whiteSpace: "nowrap" }}>
                {micStatus.label}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: { xs: 1, sm: 1.2 }, borderColor: "rgba(74,62,61,0.1)" }} />

        {/* แถวล่าง: ชื่อผู้เล่น + นาฬิกา */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, minWidth: 0 }}>
            <Typography sx={{ color: "#6b6463", fontWeight: "700", fontSize: { xs: "0.95rem", sm: "1.05rem" }, whiteSpace: "nowrap" }}>
              คุณคือ:
            </Typography>
            <RecordVoiceOverIcon sx={{ fontSize: 22, color: "#94a3b8", flexShrink: 0 }} />
            <Typography fontWeight="900" sx={{ color: "#4a3e3d", fontSize: { xs: "1.05rem", sm: "1.15rem" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {me?.name || nameInput}
            </Typography>
            {me?.role && !isSpectator && (
              <Chip size="small" label={me.role.toUpperCase()} sx={{ bgcolor: "#ff9aa2", color: "#fff", height: 18, fontSize: "0.58rem", fontWeight: "800", flexShrink: 0 }} />
            )}
            {isSpectator && (
              <Chip size="small" label="ผู้ชม" sx={{ bgcolor: "#cbd5e1", color: "#475569", height: 18, fontSize: "0.58rem", fontWeight: "800", flexShrink: 0 }} />
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <Box sx={{ bgcolor: "#7c6aa8", borderRadius: "99px", px: { xs: 1.6, sm: 2 }, py: 0.4 }}>
              <Typography fontWeight="900" sx={{ color: "white", fontSize: { xs: "1.15rem", sm: "1.3rem" }, lineHeight: 1.1, letterSpacing: "0.04em" }}>
                {formatTime(room.timer ?? 0)}
              </Typography>
            </Box>
            <Typography sx={{ color: "#9ca3af", fontWeight: "700", fontSize: "0.6rem", mt: 0.2, whiteSpace: "nowrap" }}>
              {currentState === "countdown" && "เฟสทายคำ"}
              {currentState === "voting" && "เฟสสืบสวน"}
              {currentState === "lobby" && "รอจัดเตรียมรอบ"}
              {currentState === "scoreboard" && "รอบสิ้นสุดแล้ว"}
              {currentState === "assign_roles" && "กำลังแจกบทบาท..."}
            </Typography>
          </Box>
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
                <Box
                  key={r.id}
                  className="anime-float"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    animation: "floatUp 2s ease-out forwards"
                  }}
                >
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
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: { xs: "center", sm: "space-between" }, alignItems: "center", gap: 1, mt: 2, p: { xs: 1, sm: 1.5 }, bgcolor: "white", border: "3px solid #4a3e3d", borderRadius: "18px", boxShadow: "0 4px 0 #4a3e3d" }}>
        {/* แถบ Reactions */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.3, justifyContent: "center" }}>
          {["👍", "😂", "😮", "😡", "❓", "🎉"].map((e) => (
            <IconButton key={e} size="small" onClick={() => handleReact(e)} sx={{ fontSize: { xs: "1rem", sm: "1.2rem" }, p: { xs: 0.4, sm: 0.5 }, border: "2px solid transparent", "&:hover": { border: "2px solid #4a3e3d", bgcolor: "#fff0f3" } }}>
              {e}
            </IconButton>
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexShrink: 0, flexWrap: "wrap", justifyContent: "center" }}>
          <Tooltip title={!process.env.NEXT_PUBLIC_AGORA_APP_ID ? "ไม่ได้ตั้งค่าระบบคุยเสียง (.env)" : isMuted ? "เปิดไมโครโฟน" : "ปิดไมโครโฟน"}>
            <span>
              <Button
                onClick={toggleMic}
                disabled={!voiceActive || !process.env.NEXT_PUBLIC_AGORA_APP_ID}
                sx={{
                  bgcolor: isMuted ? "white" : "#bbf7d0",
                  color: "#4a3e3d",
                  border: "2px solid #4a3e3d",
                  boxShadow: "0 3px 0 #4a3e3d",
                  borderRadius: "12px",
                  fontWeight: "900",
                  fontSize: "0.8rem",
                  px: { xs: 1.2, sm: 2 },
                  minWidth: 0,
                  "&:hover": { bgcolor: isMuted ? "#f1f5f9" : "#86efac" },
                  "&.Mui-disabled": { opacity: 0.5, bgcolor: "#e2e8f0", border: "2px solid #cbd5e1", boxShadow: "0 3px 0 #cbd5e1" }
                }}
              >
                {!process.env.NEXT_PUBLIC_AGORA_APP_ID ? "🎤⚠️" : isMuted ? "🎤❌" : "🎤🟢"}
              </Button>
            </span>
          </Tooltip>
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
                px: { xs: 1.2, sm: 2 },
                minWidth: 0,
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
              px: { xs: 1.8, sm: 3 },
              whiteSpace: "nowrap",
              "&:hover": { bgcolor: "#ff8b8b" }
            }}
          >
            ออกจากห้อง 🚪
          </Button>
        </Box>
      </Box>

      {/* Dialog วิธีการเล่นเกม */}
      <Dialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: "24px",
            border: "3px solid #4a3e3d",
            boxShadow: "0 8px 0 #4a3e3d",
            backgroundColor: "#fffdfb"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: "900", color: "#4a3e3d", pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="900" sx={{ color: "#4a3e3d" }}>
            📖 วิธีการเล่นเกม Insider Party!
          </Typography>
          <IconButton size="small" onClick={() => setRulesOpen(false)} sx={{ color: "#4a3e3d" }}>✕</IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Typography variant="body2" sx={{ color: "#7a6e6d", fontWeight: "bold" }}>
              เกมปาร์ตี้ทายคำแนวจับโกหก! ฝ่ายนักสืบและกรรมการจะต้องร่วมมือกันทายคำศัพท์ปริศนา ในขณะที่มี "สายลับอินไซเดอร์" แอบรู้คำเฉลยและกำลังชักใยการเดาอยู่เบื้องหลังโดยไม่ให้ใครจับได้
            </Typography>

            <Divider sx={{ borderStyle: "dashed", borderColor: "#4a3e3d", borderWidth: "1.5px" }} />

            <Typography variant="subtitle2" fontWeight="900" sx={{ color: "#4a3e3d", mb: -1 }}>👥 บทบาทในแต่ละรอบ</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: "#eff6ff", borderRadius: "14px", border: "2px solid #4a3e3d" }}>
                <Typography variant="body2" fontWeight="900" sx={{ color: "#1d4ed8", mb: 0.5 }}>⚖️ กรรมการ (Judge)</Typography>
                <Typography variant="caption" sx={{ color: "#4a3e3d", fontWeight: "bold", display: "block" }}>
                  มีหน้าที่ป้อนคำปริศนา (หรือใช้สุ่ม) คอยตอบคำถามและให้คำใบ้แก่ผู้เล่น และกดยืนยันเมื่อมีผู้เล่นเดาคำปริศนาได้ถูกต้อง
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "#fff5f5", borderRadius: "14px", border: "2px solid #4a3e3d" }}>
                <Typography variant="body2" fontWeight="900" sx={{ color: "#ff4b5c", mb: 0.5 }}>🦊 อินไซเดอร์ (Insider)</Typography>
                <Typography variant="caption" sx={{ color: "#4a3e3d", fontWeight: "bold", display: "block" }}>
                  **รู้คำปริศนาตั้งแต่เริ่ม!** ต้องแอบชี้นำหรือง้างคำตอบให้ Commons ทายถูกก่อนเวลาหมด โดยห้ามให้คนอื่นจับได้ว่าตนคือผู้อยู่เบื้องหลัง
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "#f0fdf4", borderRadius: "14px", border: "2px solid #4a3e3d" }}>
                <Typography variant="body2" fontWeight="900" sx={{ color: "#0f766e", mb: 0.5 }}>🔍 ผู้เล่นทั่วไป (Commons)</Typography>
                <Typography variant="caption" sx={{ color: "#4a3e3d", fontWeight: "bold", display: "block" }}>
                  **ไม่รู้คำปริศนา!** ต้องถามคำถามเพื่อเดาคำให้ถูก และคอยจับสังเกตว่าผู้เล่นคนใดแอบรู้คำศัพท์ล่วงหน้าหรือพยายามชักจูงคำตอบ
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderStyle: "dashed", borderColor: "#4a3e3d", borderWidth: "1.5px" }} />

            <Typography variant="subtitle2" fontWeight="900" sx={{ color: "#4a3e3d", mb: -1 }}>🏁 ขั้นตอนและกติกาเกม</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ color: "#4a3e3d" }}>
                1. เฟสทายคำ:
              </Typography>
              <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "bold", pl: 1, display: "block" }}>
                • ช่วยกันพิมพ์แชทสืบหาคำปริศนาจากกรรมการ (เช่น "เป็นของกินใช่ไหม?", "ใช้ในบ้านรึเปล่า?")
                <br />• ต้องเดาให้ถูกก่อนหมดเวลา ไม่เช่นนั้นจะแพ้ทั้งหมด (ไม่มีใครได้รับคะแนน)
              </Typography>

              <Typography variant="body2" fontWeight="bold" sx={{ color: "#4a3e3d", mt: 1 }}>
                2. เฟสโหวตจับโปหก:
              </Typography>
              <Typography variant="caption" sx={{ color: "#7a6e6d", fontWeight: "bold", pl: 1, display: "block" }}>
                • หลังทายถูก ทุกคนจะร่วมกันพูดคุยและกดโหวตผู้ต้องสงสัยบน **"โต๊ะประชุมหลัก"**
                <br />• หากโหวตจับ Insider ได้ถูกต้อง ฝ่าย Commons จะชนะ
                <br />• **หากโหวตจับผิดคน หรือผลโหวตเสมอกัน** ถือว่าโหวตล้มเหลว ฝ่าย Insider จะเป็นผู้ชนะ
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: "dashed", borderColor: "#4a3e3d", borderWidth: "1.5px" }} />

            <Typography variant="subtitle2" fontWeight="900" sx={{ color: "#4a3e3d", mb: -1 }}>🏆 เกณฑ์คะแนนที่ได้รับ</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#fffdf5", borderRadius: "14px", border: "2px solid #4a3e3d" }}>
              <Typography variant="caption" sx={{ color: "#854d0e", fontWeight: "bold", display: "block" }}>
                • **หากจับกุม Insider สำเร็จ**: ผู้เล่นทั่วไป (Commons) ได้คนละ **+1 คะแนน** (ยกเว้นกรรมการ และคนทายคำปริศนาถูก)
                <br />• **หาก Insider รอดการจับกุม (หรือโหวตเสมอ)**: อินไซเดอร์ ได้ **+2 คะแนน** และคนทายคำถูก ได้ **+1 คะแนน**
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

    </Box>
  );
}
