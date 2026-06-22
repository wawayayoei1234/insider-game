import { useEffect, useState, useRef } from "react";

let AgoraRTC = null;
if (typeof window !== "undefined") {
  try {
    AgoraRTC = require("agora-rtc-sdk-ng");
    // Set level to warning (2) or error (3) to avoid spamming the console
    AgoraRTC.setLogLevel(2);
  } catch (e) {
    console.error("Failed to load agora-rtc-sdk-ng", e);
  }
}

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;

export default function useAgoraVoice(roomCode, selfId, isConnected) {
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [speakingList, setSpeakingList] = useState([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const rtcClientRef = useRef(null);

  useEffect(() => {
    if (!isConnected || !roomCode || !selfId || !AgoraRTC) {
      return;
    }

    if (!AGORA_APP_ID) {
      console.warn("Agora APP ID is missing. Voice chat is disabled.");
      setErrorMsg("กรุณาตั้งค่า Agora App ID ในไฟล์ .env เพื่อใช้ระบบคุยเสียง");
      return;
    }

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    rtcClientRef.current = client;

    const joinChannel = async () => {
      try {
        // Enable volume indicator to track active speakers (every 200ms)
        client.enableAudioVolumeIndicator();

        // Listen for when other users publish audio tracks
        client.on("user-published", async (user, mediaType) => {
          if (mediaType === "audio") {
            await client.subscribe(user, mediaType);
            user.audioTrack.play();
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "audio" && user.audioTrack) {
            user.audioTrack.stop();
          }
        });

        // Listen for volume indicators of speaking players
        client.on("volume-indicator", (volumes) => {
          const speakers = [];
          volumes.forEach((v) => {
            if (v.level > 5) {
              speakers.push(v.uid);
            }
          });
          setSpeakingList(speakers);
        });

        // Extract HTTP base URL from WS_URL
        const getApiUrl = () => {
          const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";
          let base = wsUrl.replace(/^ws/, "http");
          base = base.replace(/\/ws$/, "");
          return base;
        };

        // Fetch dynamic token from Go Backend
        let token = null;
        try {
          const res = await fetch(`${getApiUrl()}/api/agora-token?channelName=${encodeURIComponent(roomCode)}&uid=${encodeURIComponent(selfId)}`);
          if (res.ok) {
            const data = await res.json();
            token = data.token;
          } else {
            console.warn("Failed to fetch Agora token. Status:", res.status);
          }
        } catch (e) {
          console.error("Error fetching Agora token from backend:", e);
        }

        // Join channel using roomCode as channelName, selfId as String UID, and dynamic token
        await client.join(AGORA_APP_ID, roomCode, token, selfId);
        setVoiceActive(true);
        setErrorMsg("");
      } catch (err) {
        console.error("Agora voice connection error:", err);
        setErrorMsg("เชื่อมต่อระบบเสียงล้มเหลว");
      }
    };

    joinChannel();

    return () => {
      const leaveChannel = async () => {
        if (localAudioTrack) {
          localAudioTrack.stop();
          localAudioTrack.close();
          setLocalAudioTrack(null);
        }
        if (rtcClientRef.current) {
          try {
            await rtcClientRef.current.leave();
          } catch (e) {
            console.error("Agora leave error", e);
          }
          rtcClientRef.current = null;
        }
        setVoiceActive(false);
        setSpeakingList([]);
        setIsMuted(true);
      };
      leaveChannel();
    };
  }, [roomCode, selfId, isConnected]);

  const toggleMic = async () => {
    if (!rtcClientRef.current || !AgoraRTC || !AGORA_APP_ID) return;

    try {
      if (!localAudioTrack) {
        // Create microphone audio track
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);
        await rtcClientRef.current.publish(audioTrack);
        setIsMuted(false);
      } else {
        if (isMuted) {
          await localAudioTrack.setEnabled(true);
          setIsMuted(false);
        } else {
          await localAudioTrack.setEnabled(false);
          setIsMuted(true);
        }
      }
    } catch (err) {
      console.error("Microphone toggle failed:", err);
    }
  };

  return { isMuted, toggleMic, speakingList, voiceActive, errorMsg };
}
