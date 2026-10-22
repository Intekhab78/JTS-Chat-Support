import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import IncomingCallModal from "./IncomingCallModal.jsx";
import ActiveCallBar from "./ActiveCallBar.jsx";
import TransferCallModal from "./TransferCallModal.jsx";

const WEBRTC_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" }
];

export default function VoiceCallHandler() {
  const socket = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCallHeld, setIsCallHeld] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const targetSocketIdRef = useRef(null);
  const ringbackCtxRef = useRef(null);
  const ringbackIntervalRef = useRef(null);
  const lastEndedCallToastRef = useRef(null);
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const showCallEndToast = (callId, message = "Call ended / cancelled.") => {
    if (callId && lastEndedCallToastRef.current === callId) return;
    if (callId) lastEndedCallToastRef.current = callId;
    toastRef.current?.info?.(message);
  };

  const stopRingbackTone = () => {
    if (ringbackIntervalRef.current) {
      clearInterval(ringbackIntervalRef.current);
      ringbackIntervalRef.current = null;
    }
    if (ringbackCtxRef.current) {
      try {
        if (ringbackCtxRef.current.state !== "closed") {
          ringbackCtxRef.current.close().catch(() => {});
        }
      } catch {}
      ringbackCtxRef.current = null;
    }
  };

  const startRingbackTone = async () => {
    try {
      stopRingbackTone();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringbackCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      const playCadence = () => {
        if (!ringbackCtxRef.current || ringbackCtxRef.current.state === "closed") return;
        if (ringbackCtxRef.current.state === "suspended") {
          ringbackCtxRef.current.resume().catch(() => {});
        }
        const now = ringbackCtxRef.current.currentTime;
        const osc1 = ringbackCtxRef.current.createOscillator();
        const osc2 = ringbackCtxRef.current.createOscillator();
        const gain = ringbackCtxRef.current.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.setValueAtTime(0.28, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ringbackCtxRef.current.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      };

      playCadence();
      ringbackIntervalRef.current = setInterval(playCadence, 3200);
    } catch (e) {
      console.warn("[VoiceCallHandler] Ringback tone init error:", e);
    }
  };

  useEffect(() => {
    if (!socket || !user) return;

    const handleIncoming = (callData) => {
      console.log("[VoiceCallHandler] Incoming voice call:", callData);
      setIncomingCall((prev) => (prev?.callId === callData?.callId ? prev : callData));
    };

    const handleAnswered = ({ callId }) => {
      setIncomingCall((prev) => (prev?.callId === callId ? null : prev));
    };

    const handleWebRtcSignal = async ({ senderSocketId, callId, signalData }) => {
      const pc = peerConnectionRef.current;
      if (!pc || !signalData) return;
      try {
        if (signalData.sdp) {
          if (signalData.sdp.type === "answer") {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
            } else {
              console.warn("[VoiceCallHandler] Ignoring answer in unexpected state:", pc.signalingState);
            }
          } else if (signalData.sdp.type === "offer") {
            if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("call:webrtc-signal", {
                callId: callId || activeCallRef.current?.callId,
                targetSocketId: senderSocketId,
                signalData: { sdp: pc.localDescription }
              });
            }
          }
          if (pendingIceCandidatesRef.current.length > 0) {
            for (const cand of pendingIceCandidatesRef.current) {
              await pc.addIceCandidate(cand).catch((e) => console.warn("Buffered candidate err:", e));
            }
            pendingIceCandidatesRef.current = [];
          }
        } else if (signalData.candidate) {
          const iceCand = new RTCIceCandidate(signalData.candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(iceCand).catch(e => console.warn("Add candidate err:", e));
          } else {
            pendingIceCandidatesRef.current.push(iceCand);
          }
        }
      } catch (err) {
        console.error("[VoiceCallHandler] WebRTC signal error:", err);
      }
    };

    const handleTransferredSuccess = ({ callId, newAgentName }) => {
      toastRef.current?.success?.(`Call successfully transferred to ${newAgentName || "Senior Specialist"}!`);
      endActiveCall();
    };

    const handleCallEnded = (payload = {}) => {
      const callId = payload?.callId;
      console.log("[VoiceCallHandler] call:ended received:", callId);
      stopRingbackTone();
      setIncomingCall((prev) => (!callId || prev?.callId === callId ? null : prev));
      endActiveCall(false);
    };

    const handleCallCancelled = (payload = {}) => {
      const callId = payload?.callId;
      console.log("[VoiceCallHandler] call:cancelled received:", callId);
      stopRingbackTone();
      setIncomingCall((prev) => (!callId || prev?.callId === callId ? null : prev));
      showCallEndToast(callId, "Call ended / cancelled.");
      endActiveCall(false);
    };

    const handleVisitorAccepted = async (payload) => {
      const { callId, visitorSocketId } = payload || {};
      console.log("[VoiceCallHandler] Visitor accepted outbound call:", payload);
      stopRingbackTone();
      targetSocketIdRef.current = visitorSocketId;

      setActiveCall((prev) => (prev ? { ...prev, status: "connected", visitorSocketId } : prev));
      toastRef.current?.success?.("Visitor answered! Call connected.");

      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          if (pc.signalingState === "stable") {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("call:webrtc-signal", {
              callId: callId || activeCallRef.current?.callId,
              targetSocketId: visitorSocketId,
              signalData: { sdp: pc.localDescription }
            });
          }
        } catch (offerErr) {
          console.error("[VoiceCallHandler] Error creating WebRTC offer on visitor accept:", offerErr);
        }
      }
    };

    const handleVisitorDeclined = (payload) => {
      console.log("[VoiceCallHandler] Visitor declined outbound call:", payload);
      stopRingbackTone();
      toastRef.current?.info?.("Visitor declined or line unavailable.");
      endActiveCall(false);
    };

    const handleStartOutboundCall = async (e) => {
      const { sessionId, visitorId, visitorName, websiteId, crn } = e.detail || {};
      if (!sessionId) {
        toastRef.current?.error?.("Call failed: No active visitor session selected.");
        return;
      }
      if (!socket) {
        toastRef.current?.error?.("Realtime voice server is connecting. Please wait a moment and try again.");
        return;
      }
      if (activeCallRef.current) {
        console.warn("[VoiceCallHandler] Previous activeCall detected. Resetting previous call.");
        endActiveCall(true);
      }

      const callId = `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const outboundCallData = {
        callId,
        sessionId,
        visitorId,
        visitorName: visitorName || "Visitor",
        websiteId,
        crn,
        direction: "outbound",
        status: "ringing"
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection({
          iceServers: WEBRTC_ICE_SERVERS
        });
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate && targetSocketIdRef.current) {
            socket.emit("call:webrtc-signal", {
              callId,
              targetSocketId: targetSocketIdRef.current,
              signalData: { candidate: event.candidate }
            });
          }
        };

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0] && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch((err) => console.warn("Remote audio play error:", err));
          }
        };

        setActiveCall(outboundCallData);
        startRingbackTone();

        socket.emit("call:agent-outbound", {
          callId,
          sessionId,
          visitorId,
          visitorName,
          crn,
          agentName: user.name,
          agentId: user._id,
          websiteId
        });

        toastRef.current?.info?.(`Calling ${outboundCallData.visitorName}... Ringing visitor.`);
      } catch (micErr) {
        console.error("[VoiceCallHandler] Mic access error:", micErr);
        toastRef.current?.error?.("Microphone permission required to make a voice call.");
      }
    };

    window.addEventListener("agent:start-call", handleStartOutboundCall);

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answered", handleAnswered);
    socket.on("call:webrtc-signal", handleWebRtcSignal);
    socket.on("call:transferred-success", handleTransferredSuccess);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:cancelled", handleCallCancelled);
    socket.on("call:visitor-accepted", handleVisitorAccepted);
    socket.on("call:visitor-declined", handleVisitorDeclined);

    return () => {
      stopRingbackTone();
      window.removeEventListener("agent:start-call", handleStartOutboundCall);
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answered", handleAnswered);
      socket.off("call:webrtc-signal", handleWebRtcSignal);
      socket.off("call:transferred-success", handleTransferredSuccess);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:cancelled", handleCallCancelled);
      socket.off("call:visitor-accepted", handleVisitorAccepted);
      socket.off("call:visitor-declined", handleVisitorDeclined);
    };
  }, [socket, user?._id]);

  const handleAcceptCall = async () => {
    if (!incomingCall || !socket) return;
    const currentCall = incomingCall;
    setIncomingCall(null);
    setActiveCall(currentCall);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: WEBRTC_ICE_SERVERS
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:webrtc-signal", {
            callId: currentCall.callId,
            targetSocketId: currentCall.visitorSocketId,
            signalData: { candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((e) => console.warn("Remote audio play error:", e));
        }
      };

      socket.emit("call:accept", {
        callId: currentCall.callId,
        sessionId: currentCall.sessionId,
        visitorSocketId: currentCall.visitorSocketId,
        visitorId: currentCall.visitorId,
        isTransferred: currentCall.isTransferred,
        transferredBySocketId: currentCall.transferredBySocketId
      });

      const vName = (currentCall.visitorName && currentCall.visitorName !== "Website Visitor") ? currentCall.visitorName : "Visitor";
      toast.success(`Call connected with ${vName}`);
    } catch (err) {
      console.error("[VoiceCallHandler] Mic access or WebRTC error:", err);
      toast.error("Microphone permission required to accept voice call.");
      setActiveCall(null);
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall && socket) {
      socket.emit("call:reject", {
        callId: incomingCall.callId,
        visitorSocketId: incomingCall.visitorSocketId,
        sessionId: incomingCall.sessionId
      });
    }
    setIncomingCall(null);
  };

  const handleTransferCall = (targetAgentId, transferNote) => {
    if (!activeCall || !socket) return;
    socket.emit("call:transfer", {
      callId: activeCall.callId,
      sessionId: activeCall.sessionId,
      visitorSocketId: activeCall.visitorSocketId,
      targetAgentId,
      transferNote,
      callerDetails: activeCall
    });

    toast.info("Call transfer initiated. Ringing specialist...");
  };

  const endActiveCall = (shouldEmit = true) => {
    stopRingbackTone();
    const currentCall = activeCallRef.current || activeCall;
    if (shouldEmit && currentCall && socket) {
      const targetSocketId = currentCall.visitorSocketId || targetSocketIdRef.current;
      if (currentCall.status === "ringing") {
        socket.emit("call:cancel", {
          callId: currentCall.callId,
          targetSocketId,
          sessionId: currentCall.sessionId
        });
      } else {
        socket.emit("call:end", {
          callId: currentCall.callId,
          targetSocketId,
          sessionId: currentCall.sessionId
        });
      }
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    targetSocketIdRef.current = null;
    pendingIceCandidatesRef.current = [];
    setActiveCall(null);
    setIncomingCall(null);
    setIsCallMuted(false);
    setIsCallHeld(false);
  };

  const toggleMuteCall = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsCallMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleHoldCall = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isCallHeld;
      }
    }
    setIsCallHeld((prev) => !prev);
  };

  return (
    <>
      {/* Hidden audio element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {activeCall && (
        <ActiveCallBar
          callData={activeCall}
          onEndCall={endActiveCall}
          onToggleMute={toggleMuteCall}
          onToggleHold={toggleHoldCall}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          isMuted={isCallMuted}
          isHeld={isCallHeld}
        />
      )}

      {activeCall && (
        <TransferCallModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          activeCall={activeCall}
          onConfirmTransfer={handleTransferCall}
        />
      )}
    </>
  );
}
