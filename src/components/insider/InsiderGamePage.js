"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Container, TextField, Typography, Alert, CircularProgress, Chip, Avatar, IconButton, Tooltip, Paper } from "@mui/material";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PanToolIcon from "@mui/icons-material/PanTool";
import LobbyView from "./LobbyView";
import TimerView from "./TimerView";
import VotingView from "./VotingView";
import ScoreboardView from "./ScoreboardView";
import ChatPanel from "./ChatPanel";

function nameToColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 42%)`;
}

function PlayerCard({ player, number, selfId, room, isHost, onKick, onVote, voteTarget, canVote, isVoting, votedMap, blockedMap }) {
  const isMe = player.id === selfId;
  const isJudge = player.id === room?.judgeId;
  const isHostSeat = player.id === room?.hostId;
  const isVotable = canVote && !isMe && !isJudge;
  const isSelected = voteTarget === player.id;
  const hasVoted = !!votedMap[player.id];
  const isBlocked = !!blockedMap[player.id];
  const showHandIcon = isVoting && !hasVoted && !isJudge && !isBlocked;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: isVotable ? "pointer" : "default", "&:hover .pcard-avatar": isVotable ? { transform: "scale(1.08)" } : {} }}
      onClick={() => isVotable && onVote && onVote(player.id)}>

      <Box sx={{ position: "relative" }}>
        {/* Number badge */}
        <Box sx={{ position: "absolute", top: -3, left: -5, zIndex: 2, minWidth: 18, height: 18, borderRadius: 999, bgcolor: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", px: 0.4, border: "1.5px solid #0c1f3f" }}>
          <Typography sx={{ color: "white", fontSize: "0.6rem", fontWeight: "bold", lineHeight: 1 }}>{number}</Typography>
        </Box>

        {/* Avatar */}
        <Avatar className="pcard-avatar" sx={{ width: 54, height: 54, bgcolor: nameToColor(player.name), fontSize: "1.2rem", fontWeight: "bold", border: isSelected ? "2.5px solid #f43f5e" : isMe ? "2.5px solid #38bdf8" : "2px solid rgba(255,255,255,0.15)", boxShadow: isSelected ? "0 0 0 3px rgba(244,63,94,0.35)" : "none", transition: "transform 0.15s" }}>
          {(player.name || "?")[0].toUpperCase()}
        </Avatar>

        {/* Hand icon overlay */}
        {showHandIcon && (
          <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PanToolIcon sx={{ color: "white", fontSize: 24 }} />
          </Box>
        )}
      </Box>

      {/* Name */}
      <Typography sx={{ color: isMe ? "#7dd3fc" : "rgba(255,255,255,0.85)", fontSize: "0.68rem", fontWeight: isMe ? 700 : 400, mt: 0.4, maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
        {player.name}
      </Typography>

      {/* Badges */}
      <Box sx={{ display: "flex", gap: 0.3, flexWrap: "wrap", justifyContent: "center", minHeight: 18 }}>
        {isJudge && <Chip label="JUDGE" size="small" sx={{ bgcolor: "#1d4ed8", color: "white", fontSize: "0.55rem", height: 16, "& .MuiChip-label": { px: 0.6 } }} />}
        {isHostSeat && <Chip label="HOST" size="small" sx={{ bgcolor: "#92400e", color: "white", fontSize: "0.55rem", height: 16, "& .MuiChip-label": { px: 0.6 } }} />}
      </Box>

      {/* Vote button */}
      {isVoting && !isJudge && (
        <Button size="small" onClick={(e) => { e.stopPropagation(); isVotable && onVote && onVote(player.id); }} disabled={!canVote}
          sx={{ mt: 0.3, bgcolor: isSelected ? "#dc2626" : "#f97316", color: "white", borderRadius: 999, minWidth: 54, fontSize: "0.65rem", py: 0.25, px: 1, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: isSelected ? "#b91c1c" : "#ea580c" }, "&.Mui-disabled": { bgcolor: "rgba(249,115,22,0.3)", color: "rgba(255,255,255,0.5)" } }}>
          โหวต
        </Button>
      )}

      {/* Kick button */}
      {isHost && !isMe && (
        <Tooltip title="เตะออกจากห้อง">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onKick && onKick(player.id); }} sx={{ mt: 0.2, p: 0.2, color: "#f87171", "&:hover": { bgcolor: "rgba(248,113,113,0.12)" } }}>
            <PersonRemoveIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

const WS_URL =   process.env.NEXT_PUBLIC_WS_URL || "wss://api.insider-game.org/ws";

function formatTime(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
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
  const MAX_RECONNECT = 5;

  const [room, setRoom] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [voteTarget, setVoteTarget] = useState(null);
  const [secretWord, setSecretWord] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // reset voteTarget เมื่อเข้า voting phase ใหม่
  useEffect(() => {
    if (room?.state === "voting") {
      setVoteTarget(null);
    }
  }, [room?.state]);

  // restore session เมื่อ refresh หน้า
  useEffect(() => {
    const saved = sessionStorage.getItem("insider_session");
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
      sessionStorage.removeItem("insider_session");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    sessionStorage.removeItem("insider_session");
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

    const url = WS_URL + `?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(name)}&mode=${mode}`;

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
              // server crash — ห้องหายไป หยุด reconnect
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

   
        if (msg.type === "room") {
          setRoom(msg.room || null);
          if (msg.selfId) {
            setSelfId(msg.selfId);
            // บันทึก session สำหรับ reconnect
            inGameRef.current = true;
            savedCredsRef.current = { roomCode, name };
            sessionStorage.setItem("insider_session", JSON.stringify({ roomCode, name }));
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

  const handleStartRound = () => {
    send({ type: "start_round", secretWord });
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
  
  if (phase === "join") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 15% 10%, rgba(56,189,248,0.24), transparent 38%), radial-gradient(circle at 85% 85%, rgba(251,113,133,0.2), transparent 34%), linear-gradient(135deg, #f8fafc, #eef2ff 45%, #fdf2f8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 5,
              bgcolor: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(99,102,241,0.14)",
              boxShadow: "0 24px 55px rgba(15,23,42,0.14)",
            }}
          >
            <Typography
              variant="h4"
              align="center"
              fontWeight="bold"
              sx={{
                mb: 1.2,
                background:
                  "linear-gradient(120deg, #2563eb, #7c3aed 45%, #f43f5e)",
                WebkitBackgroundClip: "text",
                color: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              Insider Party
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3, lineHeight: 1.75 }}
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

            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  bgcolor: "#2563eb",
                  borderRadius: 999,
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#1d4ed8" },
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

              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: "#2563eb",
                  color: "#1d4ed8",
                  borderRadius: 999,
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": {
                    borderColor: "#1d4ed8",
                    bgcolor: "rgba(37,99,235,0.06)",
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

  // ---------- phase: GAME แต่ยังไม่มี room ----------
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

  const isVoting = currentState === "voting";
  const votedMap = room?.voted || {};
  const blockedMap = room?.blockedVoters || {};
  const iVoted = !!votedMap[selfId];
  const iAmBlocked = !!blockedMap[selfId];
  const canVote = isVoting && !iAmBlocked && !iVoted && me?.role !== "judge";

  // deadlock: ทุกคน (ไม่นับ judge) อยู่ใน blockedVoters → ไม่มีใครโหวตได้
  const eligibleVoters = players.filter(
    (p) => p.id !== room?.judgeId && !blockedMap[p.id]
  );
  const isVoteDeadlock = isVoting && eligibleVoters.length === 0;

  const half = Math.ceil(players.length / 2);
  const leftPlayers = players.slice(0, half);
  const rightPlayers = players.slice(half);

  const sharedCardProps = {
    selfId, room, isHost, onVote: handleVote, voteTarget,
    canVote, isVoting, votedMap, blockedMap,
    onKick: (targetId) => {
      if (window.confirm("ต้องการเตะผู้เล่นคนนี้ออกจากห้องหรือไม่?")) {
        send({ type: "kick", targetId });
      }
    },
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(170deg, #1b3a6b 0%, #0c1f3f 100%)", display: "flex", flexDirection: "column" }}>

      {/* Reconnecting banner */}
      {reconnecting && (
        <Box sx={{ bgcolor: "#b45309", px: 2, py: 0.6, display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={14} sx={{ color: "white" }} />
          <Typography variant="caption" sx={{ color: "white", fontWeight: 600 }}>
            กำลังเชื่อมต่อใหม่... (ครั้งที่ {reconnectCountRef.current}/{MAX_RECONNECT})
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.2, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", display: "block", lineHeight: 1 }}>ห้อง</Typography>
          <Typography sx={{ color: "white", fontFamily: "monospace", fontWeight: "bold", fontSize: "1rem" }}>
            {room.code || roomCodeInput}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ color: "white", fontFamily: "monospace", fontWeight: "bold", fontSize: "2rem", lineHeight: 1 }}>
            {formatTime(room.timer ?? 0)}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
            {currentState === "countdown" && "กำลังเล่น"}
            {currentState === "voting" && "โหวตหา Insider"}
            {currentState === "lobby" && "รอเริ่ม"}
            {currentState === "scoreboard" && "จบรอบ"}
            {currentState === "assign_roles" && "กำลังแจกบทบาท"}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", display: "block", lineHeight: 1 }}>คุณคือ</Typography>
          <Typography sx={{ color: "white", fontWeight: "bold", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>
            {me?.name || nameInput}
          </Typography>
          {me?.role && (
            <Chip size="small" label={me.role.toUpperCase()} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white", height: 16, fontSize: "0.58rem", "& .MuiChip-label": { px: 0.7 } }} />
          )}
        </Box>
      </Box>

      {/* 3-column layout */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left players */}
        <Box sx={{ width: { xs: 92, sm: 112 }, flexShrink: 0, py: 2, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", alignItems: "center" }}>
          {leftPlayers.map((p, i) => (
            <PlayerCard key={p.id} player={p} number={i + 1} {...sharedCardProps} />
          ))}
        </Box>

        {/* Center content */}
        <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {currentState === "lobby" && (
            <LobbyView room={room} players={players} me={me} isHost={isHost} isJudge={isJudge} secretWord={secretWord} setSecretWord={setSecretWord} onSetJudge={handleSetJudge} onStartRound={handleStartRound} chatEnabled={chatEnabled} onToggleChat={handleToggleChat} />
          )}
          {currentState === "countdown" && (
            <Box sx={{ p: 2 }}>
              <TimerView room={room} me={me} isJudge={isJudge} onGuessCorrect={handleGuessCorrect} players={players} />
            </Box>
          )}
          {currentState === "voting" && (
            <Box sx={{ p: 2 }}>
              {isVoteDeadlock && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  <Typography variant="body2" sx={{ color: "#fca5a5", fontWeight: 600 }}>
                    ⚠️ ทุกคนได้คะแนนเท่ากัน ไม่มีใครโหวตได้
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(252,165,165,0.8)" }}>
                    รอ server ตัดสิน หรือให้ Host เริ่มรอบใหม่
                  </Typography>
                </Box>
              )}
              <VotingView room={room} players={players} me={me} />
            </Box>
          )}
          {currentState === "scoreboard" && (
            <ScoreboardView room={room} players={players} insiderId={room.insiderId} me={me} onNextRound={handleNextRound} />
          )}
          {currentState === "assign_roles" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>กำลังแจกบทบาท...</Typography>
            </Box>
          )}
        </Box>

        {/* Right players */}
        <Box sx={{ width: { xs: 92, sm: 112 }, flexShrink: 0, py: 2, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", alignItems: "center" }}>
          {rightPlayers.map((p, i) => (
            <PlayerCard key={p.id} player={p} number={half + i + 1} {...sharedCardProps} />
          ))}
        </Box>
      </Box>

      {/* Chat */}
      {chatEnabled && (
        <ChatPanel messages={messages} me={me} value={chatInput} onChange={setChatInput} onSend={handleSendChat} enabled={chatEnabled} />
      )}

      {/* Leave button */}
      <Box sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1300 }}>
        <Button variant="contained" color="error" onClick={handleLeaveRoom} sx={{ borderRadius: 999, px: 2.5, py: 1, boxShadow: 6, fontSize: "0.8rem" }}>
          ออกจากห้อง
        </Button>
      </Box>
    </Box>
  );
}
