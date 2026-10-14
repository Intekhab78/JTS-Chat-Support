import { io } from "socket.io-client";
import "./style.css";

(function () {
  const currentScript = document.currentScript || document.querySelector("script[data-website-id]");
  const apiKey = currentScript ? currentScript.getAttribute("data-website-id") : null;
  const apiUrl = currentScript ? currentScript.getAttribute("data-api-url") : null;

  if (!apiKey) {
    console.error("ChatWidget: Missing data-website-id attribute on script tag.");
    return;
  }

  const sessionKey = `csw_session_${apiKey}`;
  const visitorKey = `csw_visitor_${apiKey}`;
  const panelOpenKey = `csw_panel_open_${apiKey}`;

  const origin = apiUrl || (currentScript ? new URL(currentScript.src).origin : "https://chatapi.jtsmiddleeast.com");

  let socket = null;
  let activeSessionId = localStorage.getItem(sessionKey);
  let visitorId = localStorage.getItem(visitorKey);
  let latestConfig = null;
  let feedbackSent = false;
  let botPath = [];
  let botSelections = {};

  function setLauncherContent(element, icon) {
    element.innerHTML = icon || "💬";
  }

  function setStatusMessage(ui, message, color = "") {
    if (ui && ui.statusBar) {
      ui.statusBar.textContent = message;
      ui.statusBar.style.color = color || "";
    }
    const statusTextEl = ui?.panel ? ui.panel.querySelector("#csw-status-text") : null;
    if (statusTextEl) {
      statusTextEl.textContent = message || "Online | Instant Replies";
      statusTextEl.style.color = color || "";
    }
  }

  function shouldShowFeedback(config) {
    return config && config.feedbackEnabled !== false;
  }

  function resetFeedbackUI(ui) {
    ui.feedback.innerHTML = `
      <div class="csw-feedback-card-inner">
        <div class="csw-feedback-header">
          <div class="csw-feedback-icon-badge">✨</div>
          <div class="csw-feedback-title-wrap">
            <span class="csw-feedback-label">How was your experience?</span>
            <span class="csw-feedback-sub" id="csw-star-sentiment">Tap a star to rate support</span>
          </div>
        </div>

        <div class="csw-stars" role="radiogroup" aria-label="Rating (1 to 5)">
          <button class="csw-star" type="button" data-rating="1" data-sentiment="😞 Needs improvement" aria-label="1 star">★</button>
          <button class="csw-star" type="button" data-rating="2" data-sentiment="😐 Fair support" aria-label="2 stars">★</button>
          <button class="csw-star" type="button" data-rating="3" data-sentiment="🙂 Good experience" aria-label="3 stars">★</button>
          <button class="csw-star" type="button" data-rating="4" data-sentiment="😊 Great service!" aria-label="4 stars">★</button>
          <button class="csw-star" type="button" data-rating="5" data-sentiment="🤩 Outstanding!" aria-label="5 stars">★</button>
        </div>

        <div class="csw-feedback-input-row">
          <input class="csw-feedback-comment" id="csw-feedback-comment" placeholder="Leave an optional comment..." maxlength="500" />
          <button class="csw-feedback-submit" type="button" disabled>Submit ⭐</button>
        </div>
      </div>
    `;
    ui.feedback.dataset.rating = "0";
    ui.feedback.classList.remove("show");
  }

  function showNewChatButton(ui) {
    setStatusMessage(ui, "Conversation Closed");
    ui.feedback.innerHTML = `
      <button class="csw-new-chat-btn" type="button">🔄 Start New Conversation</button>
    `;
    ui.feedback.classList.add("show");
    ui.form.style.display = "none";
  }

  function handleStartNewChat(ui) {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(visitorKey);
    ui.messages.innerHTML = "";
    ui.prechat.style.display = "block";
    ui.chatInterface.style.display = "none";
    setStatusMessage(ui, "Online | Instant Replies");
    ui.feedback.classList.remove("show");
    ui.form.style.display = "flex";
    boot(ui);
  }

  function setBranding(colors) {
    const root = document.documentElement;
    root.style.setProperty("--csw-primary", colors?.primary || "#059669");
    root.style.setProperty("--csw-accent", colors?.accent || "#0d9488");
  }

  function sendVisitorMessage(payload) {
    if (!socket || !socket.connected || !activeSessionId) {
      return false;
    }
    socket.emit("visitor:message", { sessionId: activeSessionId, ...payload });
    return true;
  }

  function createUi() {
    const launcher = document.createElement("div");
    launcher.id = "csw-launcher";
    launcher.classList.add("right");
    launcher.innerHTML = "💬";

    const panel = document.createElement("div");
    panel.id = "csw-panel";
    panel.classList.add("right");
    panel.innerHTML = `
      <div id="csw-status-bar" style="display:none;"></div>
      <div id="csw-header">
        <div class="csw-header-agent-info">
          <div class="csw-agent-avatar-wrap">
            <span>💬</span>
            <span class="csw-avatar-online-dot"></span>
          </div>
          <div class="csw-header-text">
            <div id="csw-header-title">Support Team</div>
            <div id="csw-header-subtitle">
              <span class="csw-online-pulse-bullet"></span>
              <span id="csw-status-text">Online | Instant Replies</span>
            </div>
          </div>
        </div>
        <div class="csw-header-actions">
          <button id="csw-voice-btn" title="Call 24/7 AI Voice Agent" type="button">
            📞 Call AI
          </button>
          
          <button id="csw-close-chat" title="Close Chat" type="button">&times;</button>
        </div>
      </div>

      <!-- CLOSE CONFIRMATION OVERLAY -->
      <div id="csw-confirm-overlay" style="display:none; position:absolute; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9998; padding:20px; align-items:center; justify-content:center; text-align:center;">
        <div style="background:#ffffff; border-radius:18px; padding:18px 16px; width:100%; max-width:280px; box-shadow:0 20px 40px -10px rgba(0,0,0,0.3); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:24px; line-height:1;">💬</div>
          <div style="font-size:13px; font-weight:800; color:#0f172a; line-height:1.2;">Do you want to close this chat?</div>
          <div style="font-size:10.5px; color:#64748b; font-weight:500; line-height:1.35;">Ending the chat will prompt for quick feedback and start a fresh session.</div>
          <div style="display:flex; gap:8px; margin-top:4px;">
            <button id="csw-cancel-close" type="button" style="flex:1; padding:8px 10px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.2s;">Minimize</button>
            <button id="csw-confirm-close" type="button" style="flex:1; padding:8px 10px; border-radius:10px; border:none; background:#ef4444; color:#ffffff; font-size:11px; font-weight:800; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 12px -2px rgba(239,68,68,0.4);">End Chat</button>
          </div>
        </div>
      </div>

      <!-- VOICE CALL OVERLAY -->
      <div id="csw-voice-overlay" style="display:none; position:absolute; inset:0; background:radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #080d1a 100%); z-index:9999; padding:20px 16px; color:#fff; flex-direction:column; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; overflow:hidden;">
        <div style="width:50px; height:50px; border-radius:50%; background:radial-gradient(circle at 30% 30%, #38bdf8, #6366f1, #10b981); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 12px auto; box-shadow:0 0 24px rgba(56,189,248,0.45); border:2px solid rgba(255,255,255,0.35);">
          🤖
        </div>
        <div style="font-size:15.5px; font-weight:900; margin-bottom:4px; letter-spacing:-0.02em; color:#ffffff;">
          24/7 AI Voice Agent
        </div>
        <div style="font-size:10.5px; color:#94a3b8; margin-bottom:18px; line-height:1.45; max-width:250px; font-weight:500;">
          Speak directly with our AI Agent for instant support, status, or live assistance.
        </div>
        
        <button id="csw-start-web-call" type="button" style="width:100%; max-width:240px; background:linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%); border:1px solid rgba(255,255,255,0.35); color:#ffffff; font-weight:800; font-size:11.5px; padding:10px 14px; border-radius:11px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s; box-shadow:0 6px 18px rgba(16,185,129,0.35); margin-bottom:8px;">
          🎙️ Start Free AI Voice Call
        </button>

        <a href="tel:+971508492019" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; max-width:240px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#e2e8f0; font-weight:700; font-size:11px; text-decoration:none; padding:9px 14px; border-radius:11px; transition:all 0.2s;">
          📞 Direct Phone: +971-50-8492019
        </a>
        
        <button id="csw-close-voice" type="button" style="margin-top:14px; background:transparent; border:none; color:#64748b; font-size:10.5px; font-weight:600; cursor:pointer; text-decoration:underline; transition:color 0.2s;">
          Close & Back to Chat
        </button>
      </div>

      <div id="csw-prechat">
        <div id="csw-prechat-welcome">Hi there! How can we help you today?</div>
        <div class="csw-prechat-card">
          <div class="csw-prechat-field">
            <label class="csw-prechat-label">Full Name</label>
            <input class="csw-prechat-input" id="csw-pre-name" placeholder="John Doe" autocomplete="name" required />
          </div>
          <div class="csw-prechat-field">
            <label class="csw-prechat-label">Email Address</label>
            <input class="csw-prechat-input" id="csw-pre-email" type="email" placeholder="john@example.com" autocomplete="email" required />
          </div>
        </div>
        <button class="csw-prechat-submit" id="csw-pre-submit" type="button">
          <span>Start Conversation</span>
          <span style="font-size: 14px;">➔</span>
        </button>
      </div>

      <div id="csw-chat-interface" style="display:none;">
        <div id="csw-messages"></div>
        <div id="csw-typing">
          <div class="csw-typing-bubble">
            <div class="csw-typing-dot"></div>
            <div class="csw-typing-dot"></div>
            <div class="csw-typing-dot"></div>
          </div>
          <span class="csw-typing-text">Typing...</span>
        </div>
        <div id="csw-quick-replies"></div>
        <div id="csw-feedback"></div>
        <form id="csw-form">
          <input id="csw-input" autocomplete="off" maxlength="1000" placeholder="Type your message..." />
          <button id="csw-emoji-btn" type="button" title="Add emoji">😊</button>
          <button id="csw-send" type="submit">&#10148;</button>
        </form>
        
        <div id="csw-emoji-picker">
          <div class="csw-emoji-grid" id="csw-emoji-grid"></div>
        </div>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    // Persist panel open/closed state on refresh
    const isPanelOpen = localStorage.getItem(panelOpenKey) === "true";
    if (isPanelOpen) {
      panel.classList.add("open");
    }

    const voiceBtn = panel.querySelector("#csw-voice-btn");
    const voiceOverlay = panel.querySelector("#csw-voice-overlay");
    const closeVoiceBtn = panel.querySelector("#csw-close-voice");

    if (voiceBtn && voiceOverlay) {
      voiceBtn.onclick = () => {
        voiceOverlay.style.display = "flex";
      };
      if (closeVoiceBtn) {
        closeVoiceBtn.onclick = () => {
          voiceOverlay.style.display = "none";
        };
      }
      setupVoiceCalling({ panel }, apiKey, origin);
    }

    return {
      launcher,
      panel,
      prechat: panel.querySelector("#csw-prechat"),
      chatInterface: panel.querySelector("#csw-chat-interface"),
      messages: panel.querySelector("#csw-messages"),
      typing: panel.querySelector("#csw-typing"),
      feedback: panel.querySelector("#csw-feedback"),
      form: panel.querySelector("#csw-form"),
      input: panel.querySelector("#csw-input"),
      quickReplies: panel.querySelector("#csw-quick-replies"),
      preName: panel.querySelector("#csw-pre-name"),
      preEmail: panel.querySelector("#csw-pre-email"),
      preSubmit: panel.querySelector("#csw-pre-submit"),
      statusBar: panel.querySelector("#csw-status-bar") || document.createElement("div"),
      headerSubtitle: panel.querySelector("#csw-header-subtitle"),
      headerTitle: panel.querySelector("#csw-header-title"),
      closeBtn: panel.querySelector("#csw-close-chat"),
      emojiBtn: panel.querySelector("#csw-emoji-btn"),
      emojiPicker: panel.querySelector("#csw-emoji-picker"),
      attachBtn: null,
      fileInput: null
    };
  }

  function setupVoiceCalling(ui, websiteApiKey, originUrl) {
    const voiceOverlay = ui.panel.querySelector("#csw-voice-overlay");
    const voiceBtn = ui.panel.querySelector("#csw-voice-btn");

    function renderDefaultVoiceUI() {
      if (!voiceOverlay) return;
      voiceOverlay.style.padding = "20px 16px";
      voiceOverlay.style.justifyContent = "center";
      voiceOverlay.style.alignItems = "center";
      voiceOverlay.style.background = "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #080d1a 100%)";
      voiceOverlay.innerHTML = `
        <div style="width:50px; height:50px; border-radius:50%; background:radial-gradient(circle at 30% 30%, #38bdf8, #6366f1, #10b981); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 12px auto; box-shadow:0 0 24px rgba(56,189,248,0.45); border:2px solid rgba(255,255,255,0.35);">
          🤖
        </div>
        <div style="font-size:15.5px; font-weight:900; margin-bottom:4px; letter-spacing:-0.02em; color:#ffffff;">
          24/7 AI Voice Agent
        </div>
        <div style="font-size:10.5px; color:#94a3b8; margin-bottom:18px; line-height:1.45; max-width:250px; font-weight:500;">
          Speak directly with our AI Agent for instant support, status, or live assistance.
        </div>
        
        <button id="csw-start-web-call" type="button" style="width:100%; max-width:240px; background:linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%); border:1px solid rgba(255,255,255,0.35); color:#ffffff; font-weight:800; font-size:11.5px; padding:10px 14px; border-radius:11px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s; box-shadow:0 6px 18px rgba(16,185,129,0.35); margin-bottom:8px;">
          🎙️ Start Free AI Voice Call
        </button>

        <a href="tel:+971508492019" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; max-width:240px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#e2e8f0; font-weight:700; font-size:11px; text-decoration:none; padding:9px 14px; border-radius:11px; transition:all 0.2s;">
          📞 Direct Phone: +971-50-8492019
        </a>
        
        <button id="csw-close-voice" type="button" style="margin-top:14px; background:transparent; border:none; color:#64748b; font-size:10.5px; font-weight:600; cursor:pointer; text-decoration:underline; transition:color 0.2s;">
          Close & Back to Chat
        </button>
      `;
      bindEvents();
    }

    function bindEvents() {
      const btnClose = voiceOverlay.querySelector("#csw-close-voice");
      const btnStart = voiceOverlay.querySelector("#csw-start-web-call");

      if (btnClose) {
        btnClose.onclick = () => {
          voiceOverlay.style.display = "none";
        };
      }

      if (btnStart) {
        btnStart.onclick = async () => {
          try {
            voiceOverlay.style.padding = "6px 8px 1px 8px";
            voiceOverlay.style.justifyContent = "space-between";
            voiceOverlay.style.alignItems = "stretch";
            voiceOverlay.innerHTML = `
              <!-- Ultra-Compact Top Header with Embedded Mini AI Bot -->
              <div style="width:100%; display:flex; flex-direction:column; align-items:center; flex-shrink:0; padding:0; margin-bottom:4px;">
                <!-- Top Navigation Row -->
                <div style="width:100%; display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; padding:0 2px;">
                  <div style="display:flex; align-items:center; gap:5px;">
                    <span style="width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                    <span style="font-size:9.5px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em;">LIVE AI VOICE SESSION</span>
                  </div>
                  <button id="csw-close-live-top-btn" type="button" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:10px; transition:all 0.2s;">✕</button>
                </div>

                <!-- Compact Soundwave AI Bot Avatar Sphere (Ultra-low height) -->
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:3px;">
                  <div style="width:36px; height:36px; border-radius:50%; background:radial-gradient(circle at 30% 30%, #38bdf8, #6366f1, #10b981); display:flex; align-items:center; justify-content:center; font-size:18px; animation:csw-voice-pulse-ring 2.5s infinite ease-in-out; cursor:pointer; border:1.5px solid rgba(255,255,255,0.4); box-shadow:0 0 14px rgba(56,189,248,0.45); flex-shrink:0;">
                    🤖
                  </div>
                  
                  <!-- Audio Frequency Equalizer Waves -->
                  <div style="display:flex; align-items:flex-end; gap:2.5px; height:9px;">
                    <div class="csw-voice-eq-bar" style="width:2.5px;"></div>
                    <div class="csw-voice-eq-bar" style="width:2.5px;"></div>
                    <div class="csw-voice-eq-bar" style="width:2.5px;"></div>
                    <div class="csw-voice-eq-bar" style="width:2.5px;"></div>
                    <div class="csw-voice-eq-bar" style="width:2.5px;"></div>
                  </div>
                </div>

                <!-- Dynamic Real-time Status Badge -->
                <div id="csw-voice-status-badge" style="display:inline-flex; align-items:center; gap:4px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); padding:1.5px 8px; border-radius:12px; font-size:8.5px; font-weight:800; color:#34d399; text-transform:uppercase; letter-spacing:0.04em;">
                  <span style="width:5px; height:5px; border-radius:50%; background:#10b981; display:inline-block; box-shadow:0 0 4px #10b981;"></span>
                  <span>MIC LISTENING... (SPEAK NOW)</span>
                </div>
              </div>

              <!-- Real-Time Interactive Voice Speech Display Container (Takes Maximum Space) -->
              <div id="csw-voice-conversation-feed" style="width:100%; flex:1 1 0%; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:5px; padding:2px 2px; margin-bottom:3px; text-align:left;">
                <div class="csw-speech-card-ai" style="align-self:center !important; width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; padding:9px 8px; border-radius:10px; background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08);">
                  <span style="font-size:16px; margin-bottom:2px;">🤖</span>
                  <span style="font-size:11px; font-weight:800; color:#fff; margin-bottom:1px;">Live AI Voice Call Connected.</span>
                  <span style="font-size:9.5px; color:#94a3b8;">Speak your query into your microphone!</span>
                </div>
              </div>

              <!-- Bottom Call Controls Suite (Lighter, Attractive & Increased Gap) -->
              <div style="width:100%; display:flex; align-items:stretch; gap:10px; flex-shrink:0; margin-bottom:2px; padding:0 3px;">
                <button id="csw-speak-mic-btn" class="csw-voice-action-btn csw-voice-btn-mic" type="button" style="flex:1 1 0; min-width:0; height:34px; background:linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%); color:#ffffff; border:1px solid rgba(255,255,255,0.35); border-radius:11px; padding:0 6px; font-weight:800; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; box-shadow:0 4px 14px -1px rgba(52,211,153,0.45); transition:all 0.2s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  🎙️ Speak
                </button>
                <button id="csw-transfer-agent-btn" type="button" style="flex:1 1 0; min-width:0; height:34px; background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color:#ffffff; border:1px solid rgba(255,255,255,0.35); border-radius:11px; padding:0 6px; font-weight:800; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; box-shadow:0 4px 14px -1px rgba(99,102,241,0.45); transition:all 0.2s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  👨‍💼 Agent
                </button>
                <button id="csw-end-live-call" class="csw-voice-action-btn csw-voice-btn-end" type="button" style="flex:1 1 0; min-width:0; height:34px; background:linear-gradient(135deg, #fb7185 0%, #f43f5e 55%, #e11d48 100%); color:#ffffff; border:1px solid rgba(255,255,255,0.35); border-radius:11px; padding:0 6px; font-weight:800; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; box-shadow:0 4px 14px -1px rgba(251,113,133,0.45); transition:all 0.2s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  🔴 End
                </button>
              </div>
            `;

            let isCallActive = true;
            let isAiSpeaking = false;
            let isHumanAgentCallActive = false;
            let voiceHistory = [];

            const statusBadge = voiceOverlay.querySelector("#csw-voice-status-badge");
            const conversationFeed = voiceOverlay.querySelector("#csw-voice-conversation-feed");
            const speakMicBtn = voiceOverlay.querySelector("#csw-speak-mic-btn");
            const endBtn = voiceOverlay.querySelector("#csw-end-live-call");
            const transferBtn = voiceOverlay.querySelector("#csw-transfer-agent-btn");

            let widgetPeerConnection = null;
            let widgetLocalStream = null;
            let widgetRemoteAudio = new Audio();

            function initiateAgentHandoff(reason = "Human assistance requested") {
              if (!isCallActive) return;
              isHumanAgentCallActive = true;
              if ("speechSynthesis" in window) window.speechSynthesis.cancel();
              isAiSpeaking = false;
              if (recognition) { try { recognition.stop(); } catch(e) {} }
              if (silenceTimer) clearTimeout(silenceTimer);
              accumulatedTranscript = "";

              if (statusBadge) {
                statusBadge.style.color = "#fbbf24";
                statusBadge.style.borderColor = "rgba(251,191,36,0.4)";
                statusBadge.style.background = "rgba(251,191,36,0.15)";
                statusBadge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#fbbf24;"></span> Calling Agent...`;
              }

              voiceHistory.push({ role: 'ai', text: "Connecting you to a live support specialist. Please stay on the line..." });
              renderVoiceFeed(false);

              // Ensure socket connection exists
              if (!socket) {
                socket = io(originUrl || origin, {
                  auth: { apiKey: websiteApiKey, visitorId, sessionId: activeSessionId || `voice_${Date.now()}`, type: "visitor" },
                  transports: ["polling", "websocket"],
                  reconnection: true
                });
              }

              const triggerEmit = () => {
                const transcript = voiceHistory.map(h => `${h.role === 'user' ? 'Visitor' : 'AI'}: ${h.text}`).join('\n');
                console.log("[ChatWidget] Emitting call:request-human via socket", socket.id);
                socket.emit("call:request-human", {
                  sessionId: activeSessionId || `voice_${Date.now()}`,
                  websiteId: websiteApiKey,
                  visitorName: (latestConfig && latestConfig.visitorName) || (typeof window !== "undefined" && window.__chatWidgetConfig && window.__chatWidgetConfig.visitorName) || "Mohit Kumar Maurya",
                  visitorId: visitorId,
                  callerPhone: "Web Voice Call",
                  transcript,
                  aiSummary: reason,
                  telemetry: {
                    os: navigator.userAgent.includes("Windows") ? "Windows 10" : "Web",
                    browser: navigator.userAgent.includes("Chrome") ? "Chrome" : "Browser",
                    city: "Chicago"
                  }
                });
              };

              if (socket.connected) {
                triggerEmit();
              } else {
                socket.connect();
                socket.once("connect", triggerEmit);
              }

              socket.off("call:accepted");
              socket.on("call:accepted", async ({ agentName, agentSocketId }) => {
                isHumanAgentCallActive = true;
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                isAiSpeaking = false;
                if (recognition) { try { recognition.stop(); } catch(e) {} }
                if (silenceTimer) clearTimeout(silenceTimer);
                accumulatedTranscript = "";
                console.log("[ChatWidget] Call accepted by agent:", agentName, agentSocketId);
                if (statusBadge) {
                  statusBadge.style.color = "#34d399";
                  statusBadge.style.borderColor = "rgba(52,211,153,0.4)";
                  statusBadge.style.background = "rgba(52,211,153,0.15)";
                  statusBadge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981;"></span> Live with ${agentName || 'Agent'}`;
                }

                voiceHistory.push({ role: 'ai', text: `Connected live with ${agentName || 'Agent'}! You can speak now.` });
                renderVoiceFeed(false);

                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                  widgetLocalStream = stream;

                  const pc = new RTCPeerConnection({
                    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
                  });
                  widgetPeerConnection = pc;

                  stream.getTracks().forEach(track => pc.addTrack(track, stream));

                  pc.onicecandidate = (event) => {
                    if (event.candidate) {
                      socket.emit("call:webrtc-signal", {
                        targetSocketId: agentSocketId,
                        signalData: { candidate: event.candidate }
                      });
                    }
                  };

                  pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                      widgetRemoteAudio.srcObject = event.streams[0];
                      widgetRemoteAudio.play().catch(e => console.warn("Remote audio play error:", e));
                    }
                  };

                  socket.off("call:webrtc-signal");
                  socket.on("call:webrtc-signal", async ({ signalData }) => {
                    if (!pc) return;
                    if (signalData.sdp) {
                      await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                    } else if (signalData.candidate) {
                      await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
                    }
                  });

                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  socket.emit("call:webrtc-signal", {
                    targetSocketId: agentSocketId,
                    signalData: { sdp: pc.localDescription }
                  });

                } catch (err) {
                  console.error("Widget WebRTC error:", err);
                }
              });

              socket.off("call:busy");
              socket.on("call:busy", () => {
                if (statusBadge) {
                  statusBadge.innerHTML = "Agents are busy";
                }
                voiceHistory.push({ role: 'ai', text: "All agents are currently busy. Our AI assistant will continue helping you!" });
                renderVoiceFeed(false);
              });

              socket.off("call:ended");
              socket.on("call:ended", () => {
                if (widgetLocalStream) {
                  widgetLocalStream.getTracks().forEach(t => t.stop());
                  widgetLocalStream = null;
                }
                if (widgetPeerConnection) {
                  widgetPeerConnection.close();
                  widgetPeerConnection = null;
                }
                if (statusBadge) {
                  statusBadge.innerHTML = "Call Ended";
                }
              });
            }

            if (transferBtn) {
              transferBtn.onclick = () => {
                initiateAgentHandoff("Visitor requested human agent via Agent button");
              };
            }
            const closeTopBtn = voiceOverlay.querySelector("#csw-close-live-top-btn");

            if (closeTopBtn) {
              closeTopBtn.onclick = () => {
                isCallActive = false;
                isAiSpeaking = false;
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                if (recognition) {
                  try { recognition.stop(); } catch(e) {}
                }
                voiceOverlay.style.display = "none";
                renderDefaultVoiceUI();
              };
            }

            function renderVoiceFeed(isThinking = false) {
              if (!conversationFeed) return;
              conversationFeed.innerHTML = "";

              voiceHistory.forEach(item => {
                const card = document.createElement("div");
                if (item.role === 'user') {
                  card.className = "csw-speech-card-visitor";
                  card.innerHTML = `
                    <div style="font-size:8.5px; font-weight:800; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px; display:flex; align-items:center; justify-content:flex-end; gap:3px;">
                      <span>You 👤</span>
                    </div>
                    <div style="font-size:11.5px; color:#ffffff; font-weight:500; text-align:right;">${item.text}</div>
                  `;
                } else {
                  card.className = "csw-speech-card-ai";
                  card.innerHTML = `
                    <div style="font-size:8.5px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px; display:flex; align-items:center; gap:3px;">
                      <span>🤖 AI Agent</span>
                    </div>
                    <div style="font-size:11.5px; color:#f8fafc; font-weight:500; line-height:1.4;">${item.text}</div>
                    ${item.ticketId ? `<div style="margin-top:4px; padding:3px 6px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); border-radius:6px; font-size:9px; color:#34d399; font-weight:700; display:inline-block;">🎫 Ticket: ${item.ticketId}</div>` : ''}
                  `;
                }
                conversationFeed.appendChild(card);
              });

              if (isThinking) {
                const thinkingCard = document.createElement("div");
                thinkingCard.className = "csw-speech-card-ai";
                thinkingCard.innerHTML = `
                  <div style="display:flex; align-items:center; gap:6px;">
                    <div class="csw-typing-dot" style="background:#38bdf8; width:5px; height:5px;"></div>
                    <div class="csw-typing-dot" style="background:#38bdf8; width:5px; height:5px;"></div>
                    <div class="csw-typing-dot" style="background:#38bdf8; width:5px; height:5px;"></div>
                    <span style="font-size:11px; color:#38bdf8; font-weight:700; margin-left:4px;">AI is thinking...</span>
                  </div>
                `;
                conversationFeed.appendChild(thinkingCard);
              }

              conversationFeed.scrollTop = conversationFeed.scrollHeight;
            }

            async function processQueryAndRespond(promptText) {
              if (!isCallActive || isHumanAgentCallActive) return;
              
              const lower = (promptText || "").toLowerCase();
              const isTransferIntent = 
                lower.includes("agent") || 
                lower.includes("human") || 
                lower.includes("representative") ||
                lower.includes("customer care") ||
                lower.includes("baat karni") || 
                lower.includes("call agent") || 
                lower.includes("connect") || 
                lower.includes("transfer") ||
                lower.includes("live support") ||
                lower.includes("real person");

              if (isTransferIntent) {
                initiateAgentHandoff(promptText);
                return;
              }

              voiceHistory.push({ role: 'user', text: promptText });
              renderVoiceFeed(true);

              statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#38bdf8; display:inline-block; box-shadow:0 0 8px #38bdf8;"></span> AI THINKING & RESPONDING...`;

              // Mute mic while AI thinks and speaks
              isAiSpeaking = true;
              if (recognition) {
                try { recognition.stop(); } catch(e) {}
              }

              try {
                const res = await fetch(`${originUrl}/api/voice/call-simulated`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ websiteId: websiteApiKey, prompt: promptText })
                });
                const data = await res.json();

                if (data && data.voiceResponse) {
                  const ticketId = data.ticket?.ticketId || null;
                  voiceHistory.push({ role: 'ai', text: data.voiceResponse, ticketId });
                  renderVoiceFeed(false);

                  statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#38bdf8; display:inline-block; box-shadow:0 0 8px #38bdf8;"></span> 🔊 AI SPEAKING RESPONSE...`;

                  let speechFinished = false;
                  const onSpeechDone = () => {
                    if (speechFinished) return;
                    speechFinished = true;
                    isAiSpeaking = false;
                    if (isCallActive) {
                      statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#34d399; display:inline-block; box-shadow:0 0 8px #34d399;"></span> 🟢 MIC LISTENING (SPEAK NOW)...`;
                      setTimeout(() => {
                        if (isCallActive && !isAiSpeaking) startListening();
                      }, 500);
                    }
                  };

                  // Speak response using Web Speech API
                  if ("speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(data.voiceResponse);
                    utterance.rate = data.voiceSettings?.speed || 0.95;
                    
                    const targetGender = data.voiceSettings?.gender || "female";
                    if (targetGender === "male") {
                      utterance.pitch = 0.75;
                    } else {
                      utterance.pitch = 1.05;
                    }

                    if (data.detectedLanguage) {
                      utterance.lang = data.detectedLanguage;
                    }
                    
                    let availableVoices = window.speechSynthesis.getVoices();
                    if (availableVoices && availableVoices.length > 0) {
                      const matchVoice = availableVoices.find(v => {
                        const name = v.name.toLowerCase();
                        if (targetGender === "male") {
                          return name.includes("david") || name.includes("male") || name.includes("george") || name.includes("mark") || name.includes("guy") || name.includes("ravi") || name.includes("hemant") || name.includes("james") || name.includes("richard") || name.includes("alex");
                        } else {
                          return name.includes("zira") || name.includes("female") || name.includes("samantha") || name.includes("victoria") || name.includes("heera") || name.includes("kalpana") || name.includes("karen");
                        }
                      });
                      if (matchVoice) utterance.voice = matchVoice;
                    }

                    utterance.onend = onSpeechDone;
                    utterance.onerror = onSpeechDone;
                    window.speechSynthesis.speak(utterance);
                    setTimeout(onSpeechDone, 6000);
                  } else {
                    onSpeechDone();
                  }
                }
              } catch (err) {
                console.error("Voice response error:", err);
                isAiSpeaking = false;
                renderVoiceFeed(false);
                statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#34d399; display:inline-block; box-shadow:0 0 8px #34d399;"></span> 🟢 MIC LISTENING (SPEAK NOW)...`;
              }
            }

            let recognition = null;
            let silenceTimer = null;
            let accumulatedTranscript = "";

            function startListening() {
              if (!isCallActive || isAiSpeaking || isHumanAgentCallActive) return;

              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (!SpeechRecognition) {
                console.warn("SpeechRecognition not supported in browser");
                return;
              }

              try {
                if (recognition) {
                  try { recognition.stop(); } catch(e) {}
                }

                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onstart = () => {
                  if (speakMicBtn) {
                    speakMicBtn.innerHTML = "🟢 Listening...";
                    speakMicBtn.style.background = "linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%)";
                  }
                  statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block;"></span> 🟢 MIC LISTENING... (SPEAK NOW)`;
                };

                recognition.onresult = (event) => {
                  if (isAiSpeaking || isHumanAgentCallActive) return;
                  let interimText = "";
                  let finalText = "";

                  for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                      finalText += event.results[i][0].transcript;
                    } else {
                      interimText += event.results[i][0].transcript;
                    }
                  }

                  const liveText = finalText || interimText;
                  if (liveText && liveText.trim()) {
                    accumulatedTranscript = liveText.trim();
                    statusBadge.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#10b981; display:inline-block; box-shadow:0 0 8px #10b981;"></span> 🗣️ HEARD: "${accumulatedTranscript}"`;

                    if (silenceTimer) clearTimeout(silenceTimer);
                    silenceTimer = setTimeout(() => {
                      if (accumulatedTranscript && accumulatedTranscript.length > 2 && !isAiSpeaking) {
                        const sendText = accumulatedTranscript;
                        accumulatedTranscript = "";
                        try { recognition.stop(); } catch(e) {}
                        processQueryAndRespond(sendText);
                      }
                    }, 1200);
                  }
                };

                recognition.onerror = (err) => {
                  console.log("Mic recognition status:", err);
                };

                recognition.onend = () => {
                  if (isCallActive && !isAiSpeaking) {
                    try { recognition.start(); } catch(e) {}
                  }
                };

                recognition.start();
              } catch (e) {
                console.warn("SpeechRecognition start exception:", e);
              }
            }

            if (speakMicBtn) {
              speakMicBtn.onclick = () => {
                startListening();
              };
            }

            if (endBtn) {
              endBtn.onclick = () => {
                if (isHumanAgentCallActive && socket) {
                  socket.emit("call:end", { sessionId: activeSessionId });
                }
                if (widgetLocalStream) {
                  widgetLocalStream.getTracks().forEach(t => t.stop());
                  widgetLocalStream = null;
                }
                if (widgetPeerConnection) {
                  widgetPeerConnection.close();
                  widgetPeerConnection = null;
                }
                isHumanAgentCallActive = false;
                isCallActive = false;
                isAiSpeaking = false;
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                if (recognition) {
                  try { recognition.stop(); } catch(e) {}
                }
                voiceOverlay.style.display = "none";
                renderDefaultVoiceUI();
              };
            }

            // Start initial mic listening on call connect
            startListening();
          } catch (err) {
            console.error("Live call error:", err);
          }
        };
      }
    }

    if (voiceBtn && voiceOverlay) {
      voiceBtn.onclick = () => {
        voiceOverlay.style.display = "flex";
      };
    }
    bindEvents();
  }

      async function getClientTelemetry() {
      let os = "Windows 10";
      const ua = navigator.userAgent;
      if (/Windows NT 10.0/.test(ua)) os = "Windows 10";
      else if (/Windows NT 6.3/.test(ua)) os = "Windows 8.1";
      else if (/Windows NT 6.1/.test(ua)) os = "Windows 7";
      else if (/Macintosh|Mac OS X/.test(ua)) os = "macOS";
      else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
      else if (/Android/.test(ua)) os = "Android";
      else if (/Linux/.test(ua) && !/Android/.test(ua)) os = "Linux";

      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        try {
          const uaData = await navigator.userAgentData.getHighEntropyValues(["platformVersion", "platform"]);
          if (uaData.platform === "Windows") {
            const major = parseInt((uaData.platformVersion || "").split(".")[0] || "0", 10);
            os = major >= 13 ? "Windows 11" : "Windows 10";
          }
        } catch (e) {}
      }

      let browser = "Chrome";
      if (/Edg\/([\d.]+)/.test(ua)) {
        browser = "Microsoft Edge " + RegExp.$1.split('.')[0];
      } else if (/Chrome\/([\d.]+)/.test(ua)) {
        browser = "Chrome " + RegExp.$1.split('.')[0];
      } else if (/Version\/([\d.]+).*Safari/.test(ua)) {
        browser = "Safari " + RegExp.$1.split('.')[0];
      } else if (/Firefox\/([\d.]+)/.test(ua)) {
        browser = "Firefox " + RegExp.$1.split('.')[0];
      }

      let device = "Desktop";
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || /Android|iOS/i.test(os)) {
        device = "Mobile";
      }

      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      let realIp = "";
      let realCity = "";
      let realRegion = "";
      let realCountry = "";

      // Smart timezone to country fallback
      if (clientTimezone.includes("Kolkata") || clientTimezone.includes("Calcutta") || clientTimezone.includes("India")) {
        realCountry = "India";
        realCity = "India";
      } else if (clientTimezone.includes("Dubai") || clientTimezone.includes("Abu_Dhabi")) {
        realCountry = "United Arab Emirates";
        realCity = "Dubai";
      } else if (clientTimezone.includes("New_York") || clientTimezone.includes("Los_Angeles") || clientTimezone.includes("Chicago")) {
        realCountry = "United States";
        realCity = clientTimezone.split("/")[1]?.replace(/_/g, " ") || "New York";
      } else if (clientTimezone.includes("/")) {
        const parts = clientTimezone.split("/");
        realCity = parts[parts.length - 1]?.replace(/_/g, " ");
        realCountry = parts[0];
      }

      try {
        const geoController = new AbortController();
        const timeoutId = setTimeout(() => geoController.abort(), 2000);
        const res = await fetch("https://ipwho.is/", { signal: geoController.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success !== false) {
            if (data.ip) realIp = data.ip;
            if (data.city) realCity = data.city;
            if (data.region) realRegion = data.region;
            if (data.country) realCountry = data.country;
          }
        }
      } catch (err) {}

      return {
        os,
        browser,
        device,
        ipAddress: realIp,
        city: realCity,
        region: realRegion,
        country: realCountry,
        timeZone: clientTimezone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || "en-US"
      };
    }

    async function boot(ui, preData) {
    try {
      const savedName = localStorage.getItem(`csw_name_${apiKey}`);
      const savedEmail = localStorage.getItem(`csw_email_${apiKey}`);
      if (!preData && savedName && savedEmail) {
        preData = { name: savedName, email: savedEmail };
      }

      // 1. Fetch Config
      const configRes = await fetch(`${origin}/api/widget/config`, {
        headers: { "x-api-key": apiKey }
      });
      const config = await configRes.json();
      latestConfig = config;

      // 2. Set Branding & Position
      setBranding({
        primary: config.primaryColor || config.branding?.primary,
        accent: config.accentColor || config.branding?.accent
      });

      const scriptPos = currentScript ? currentScript.getAttribute("data-position") : null;
      const position = scriptPos === "left" || scriptPos === "right" ? scriptPos : (config.position === "left" ? "left" : "right");

      ui.launcher.classList.remove("left", "right");
      ui.launcher.classList.add(position);
      ui.panel.classList.remove("left", "right");
      ui.panel.classList.add(position);

      if (config.launcherIcon) {
        setLauncherContent(ui.launcher, config.launcherIcon);
        const avatarSpan = ui.panel.querySelector(".csw-agent-avatar-wrap span");
        if (avatarSpan) avatarSpan.textContent = config.launcherIcon;
      }

      if (ui.headerTitle) {
        ui.headerTitle.textContent = config.websiteName || "Support Team";
      }
      const welcomeEl = ui.panel.querySelector('#csw-prechat-welcome') || ui.prechat.querySelector('div');
      if (welcomeEl) {
        welcomeEl.textContent = config.welcomeMessage || "Hi there! How can we help you today?";
      }
      ui.preSubmit.textContent = "Start Conversation";

      // 3. Client Telemetry
      const telemetry = await getClientTelemetry();

      // 4. Initialize Session
      const initRes = await fetch(`${origin}/api/widget/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          visitorToken: visitorId,
          deviceInfo: `${telemetry.os} • ${telemetry.browser}`,
          os: telemetry.os,
          browser: telemetry.browser,
          ipAddress: telemetry.ipAddress || undefined,
          city: telemetry.city || undefined,
          region: telemetry.region || undefined,
          country: telemetry.country || undefined,
          timeZone: telemetry.timeZone,
          currentPage: window.location.href,
          name: preData?.name,
          email: preData?.email,
          sessionId: localStorage.getItem(sessionKey)
        })
      });
      const data = await initRes.json();

      visitorId = data.visitorId || (data.visitor && data.visitor.visitorId);
      activeSessionId = data.sessionId;
      feedbackSent = !!(data.session && data.session.satisfactionStatus);

      // If existing session is already closed on initial boot without preData, clear sessionKey so a new chat can start
      if (data.session?.status === "closed" && !preData) {
        localStorage.removeItem(sessionKey);
      } else {
        localStorage.setItem(sessionKey, activeSessionId);
      }
      localStorage.setItem(visitorKey, visitorId);

      // Reset UI for session
      resetFeedbackUI(ui);
      if (!shouldShowFeedback(config)) {
        ui.feedback.classList.remove("show");
      }

      // UI Transition
      const isIdentified = (data.visitor && data.visitor.name) || (data.session && data.session.visitorId && data.session.visitorId.name);
      const isSessionClosed = data.session?.status === "closed";
      
      if (preData || (isIdentified && !isSessionClosed)) {
        ui.prechat.style.display = "none";
        ui.chatInterface.style.display = "flex";
        setStatusMessage(ui, "Online | Instant Replies");
        setupUpload(ui, apiKey);
        ui.quickReplies.innerHTML = "";
        ui.feedback.classList.remove("show");
        ui.form.style.display = "flex";
      } else {
        ui.prechat.style.display = "flex";
        ui.chatInterface.style.display = "none";
        ui.feedback.classList.remove("show");
      }

      // Render Messages
      ui.messages.innerHTML = "";
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(ui, msg.sender === "visitor" ? "visitor" : "agent", msg.message, msg.attachmentUrl, msg.attachmentType, msg.senderName, msg.isAi, msg._id, msg.deliveredAt, msg.readAt);
        });
      }

      // Bot Flow Initialization & Resumption
      const hasBotFlow = config.botEnabled && config.botFlow && config.botFlow.nodes && Object.keys(config.botFlow.nodes).length > 0;
      if (hasBotFlow && data.botStatus !== "escalated" && data.session?.status !== "closed") {
        if (!data.messages || data.messages.length === 0) {
          ui.form.style.display = "none";
          renderBotNode(ui, "root");
        } else {
          // Check if flow can be resumed based on last interaction
          const lastMsg = data.messages[data.messages.length - 1];
          let matchedNodeKey = null;

          if (lastMsg) {
            // Case 1: Last message was a bot message with options
            if (lastMsg.sender === "agent" || lastMsg.isAi) {
              for (const [nKey, nVal] of Object.entries(config.botFlow.nodes)) {
                if (nVal.message?.trim() === lastMsg.message?.trim() && nVal.options && nVal.options.length > 0) {
                  matchedNodeKey = nKey;
                  break;
                }
              }
            }
            // Case 2: Last message was a visitor selection that points to a next node
            if (!matchedNodeKey && lastMsg.sender === "visitor") {
              for (const [nKey, nVal] of Object.entries(config.botFlow.nodes)) {
                const opt = nVal.options?.find(o => o.text?.trim().toLowerCase() === lastMsg.message?.trim().toLowerCase());
                if (opt && opt.next && config.botFlow.nodes[opt.next]) {
                  matchedNodeKey = opt.next;
                  break;
                }
              }
            }
          }

          if (matchedNodeKey && config.botFlow.nodes[matchedNodeKey]) {
            const targetNode = config.botFlow.nodes[matchedNodeKey];
            const alreadyRendered = data.messages.some(m => m.message?.trim() === targetNode.message?.trim());
            renderBotNode(ui, matchedNodeKey, alreadyRendered);
          } else {
            ui.form.style.display = "flex";
          }
        }
      } else {
        ui.form.style.display = "flex";
        if (!data.messages || data.messages.length === 0) {
          const greeting = (!config.isAgentOnline)
            ? (config.awayMessage || "We're currently away. Leave a message and we'll reply soon.")
            : (config.welcomeMessage || "Hi! How can we help?");
          appendMessage(ui, "agent", greeting, null, null, config.websiteName || "Support", false);
        }
      }

      if (data.session?.status === "closed" && ui.chatInterface.style.display === "flex") {
        if (shouldShowFeedback(config) && !feedbackSent) {
          ui.feedback.classList.add("show");
        } else {
          showNewChatButton(ui);
        }
        ui.form.style.display = "none";
      } else if (ui.chatInterface.style.display === "flex") {
        ui.feedback.classList.remove("show");
        ui.form.style.display = "flex";
      }

      // 6. Connect Socket
      if (socket) socket.disconnect();
      console.log("ChatWidget: Connecting socket for session", activeSessionId);
      socket = io(origin, {
        auth: { apiKey, visitorId, sessionId: activeSessionId, type: "visitor" },
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 15
      });

      socket.on("connect_error", (error) => {
        console.error("ChatWidget: Connection Error:", error.message);
        setStatusMessage(ui, "Connecting...", "#f59e0b");
      });

      socket.on("disconnect", (reason) => {
        console.warn("ChatWidget: Socket disconnected", reason);
        setStatusMessage(ui, "Reconnecting...", "#ef4444");
      });

      socket.on("connect", () => {
        console.log("ChatWidget: Socket connected to", origin, "Joining room:", activeSessionId);
        setStatusMessage(ui, "Online | Instant Replies", "");
        if (ui.chatInterface.style.display === "flex") {
          setupUpload(ui, apiKey);
        }
        if (activeSessionId) {
          socket.emit("visitor:join-room", { sessionId: activeSessionId });
        }
      });

      socket.on("chat:message", (msg) => {
        try {
          // Strict deduplication by tempId OR database _id
          const existing = (msg.tempId && ui.panel.querySelector(`[data-temp-id="${msg.tempId}"]`)) ||
                           (msg._id && ui.panel.querySelector(`[data-msg-id="${msg._id}"]`));
          if (existing) {
            if (msg._id) existing.setAttribute('data-msg-id', msg._id);
            if (msg.tempId) existing.removeAttribute('data-temp-id');
            const status = existing.querySelector('.csw-status');
            if (status) status.textContent = "Delivered";
            return;
          }

          if (msg.sender === "agent") {
            ui.typing.classList.remove("active");
            if (!msg.isAi) {
              ui.quickReplies.innerHTML = "";
            }
          }

          appendMessage(ui, msg.sender === "visitor" ? "visitor" : "agent", msg.message, msg.attachmentUrl, msg.attachmentType, msg.senderName, msg.isAi, msg._id, msg.deliveredAt, msg.readAt);
          if (msg.sender !== "visitor") {
            socket.emit("chat:ack:delivered", { messageId: msg._id, sessionId: activeSessionId });
          }
        } catch (err) {
          console.error("ChatWidget: Error processing message", err);
        }
      });

      socket.on("chat:delivered", ({ messageId }) => {
        const el = ui.panel.querySelector(`[data-msg-id="${messageId}"] .csw-status`);
        if (el) el.textContent = "Delivered";
      });

      socket.on("chat:read", ({ messageId }) => {
        const el = ui.panel.querySelector(`[data-msg-id="${messageId}"] .csw-status`);
        if (el) {
          el.textContent = "Read";
          el.classList.add("csw-read");
        }
      });

      const handleAgentTyping = (payload) => {
        const isTyping = typeof payload === 'object' ? Boolean(payload.isTyping) : Boolean(payload);
        if (isTyping) {
          const label = ui.typing.querySelector(".csw-typing-text");
          if (label) label.textContent = "Typing...";
          ui.typing.classList.add("active");
          ui.messages.scrollTop = ui.messages.scrollHeight;
        } else {
          ui.typing.classList.remove("active");
        }
      };

      socket.on("agent:typing", handleAgentTyping);
      socket.on("chat:typing", (payload) => {
        if (payload?.sender === "agent") handleAgentTyping(payload);
      });

      socket.on("chat:closed", () => {
        if (shouldShowFeedback(latestConfig) && !feedbackSent) {
          ui.feedback.classList.add("show");
          appendMessage(ui, "agent", "This conversation has ended. We'd love to hear your feedback!", null, null, "System", false);
        } else {
          showNewChatButton(ui);
        }
        ui.form.style.display = "none";
      });

      const confirmOverlay = ui.panel.querySelector("#csw-confirm-overlay");
      const btnCancelClose = ui.panel.querySelector("#csw-cancel-close");
      const btnConfirmClose = ui.panel.querySelector("#csw-confirm-close");

      if (btnCancelClose && confirmOverlay) {
        btnCancelClose.onclick = () => {
          confirmOverlay.style.display = "none";
          ui.panel.classList.remove("open");
          localStorage.setItem(panelOpenKey, "false");
        };
      }

      if (btnConfirmClose && confirmOverlay) {
        btnConfirmClose.onclick = () => {
          confirmOverlay.style.display = "none";
          if (socket && activeSessionId) {
            socket.emit("visitor:close-session", { sessionId: activeSessionId });
          }
          if (shouldShowFeedback(latestConfig) && !feedbackSent) {
            ui.feedback.classList.add("show");
            ui.form.style.display = "none";
          } else {
            localStorage.removeItem(sessionKey);
            activeSessionId = null;
            feedbackSent = false;
            resetFeedbackUI(ui);
            ui.messages.innerHTML = "";
            boot(ui);
          }
        };
      }

      ui.closeBtn.onclick = (e) => {
        e.stopPropagation();
        const isInActiveChat = ui.chatInterface.style.display === "flex" && activeSessionId;
        if (isInActiveChat && confirmOverlay) {
          confirmOverlay.style.display = "flex";
        } else {
          ui.panel.classList.remove("open");
          localStorage.setItem(panelOpenKey, "false");
        }
      };

    } catch (err) {
      console.error("ChatWidget: Boot error", err);
      setStatusMessage(ui, "Connection failed", "#ef4444");
    }
  }

  function setupUpload(ui, websiteId) {
    const input = ui.panel.querySelector("#csw-input");
    const form = ui.panel.querySelector("#csw-form");

    let fileInput = ui.fileInput;
    let attachBtn = ui.attachBtn;

    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*,.pdf";
      fileInput.style.display = "none";
      ui.panel.appendChild(fileInput);
      ui.fileInput = fileInput;
    }

    if (!attachBtn) {
      attachBtn = document.createElement("button");
      attachBtn.id = "csw-attach-btn";
      attachBtn.type = "button";
      attachBtn.title = "Attach file";
      attachBtn.innerHTML = "📎";
      form.insertBefore(attachBtn, input);
      ui.attachBtn = attachBtn;
    }

    attachBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setStatusMessage(ui, "File too large (max 10MB)", "#ef4444");
        setTimeout(() => setStatusMessage(ui, "Online | Instant Replies"), 3000);
        fileInput.value = "";
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setStatusMessage(ui, "Unsupported format (images & PDF only)", "#ef4444");
        setTimeout(() => setStatusMessage(ui, "Online | Instant Replies"), 3000);
        fileInput.value = "";
        return;
      }

      setStatusMessage(ui, "Uploading file...", "#f59e0b");
      const formData = new FormData();
      formData.append("file", file);
        formData.append("attachment", file);
      formData.append("sessionId", activeSessionId);

      try {
        const uploadRes = await fetch(`${origin}/api/widget/upload`, {
          method: "POST",
          headers: { "x-api-key": apiKey },
          body: formData
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();

        const fileUrl = uploadData?.file?.url || uploadData?.url;
          const fileName = uploadData?.file?.filename || uploadData?.filename || (fileUrl ? fileUrl.split("/").pop() : "Attachment");
          const fileMime = uploadData?.file?.mimeType || uploadData?.attachmentType || file.type || "";
          const attachType = (fileMime.startsWith("image/") || file.type.startsWith("image/")) ? "image" : (fileMime.includes("pdf") || file.type.includes("pdf")) ? "pdf" : "file";
          sendVisitorMessage({
            message: fileName,
            attachmentUrl: fileUrl,
            attachmentType: attachType
          });

        setStatusMessage(ui, "File sent successfully", "#10b981");
        setTimeout(() => setStatusMessage(ui, "Online | Instant Replies"), 3000);
      } catch (err) {
        console.error("Upload error:", err);
        setStatusMessage(ui, "Upload failed", "#ef4444");
        setTimeout(() => setStatusMessage(ui, "Online | Instant Replies"), 3000);
      } finally {
        fileInput.value = "";
      }
    };
  }

  function formatFirstName(name) {
    if (!name) return "Support";
    const clean = name.trim();
    if (!clean) return "Support";
    const first = clean.split(/\s+/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  function appendMessage(ui, sender, text, attachmentUrl, attachmentType, senderName, isAi, messageId, deliveredAt, readAt, tempId) {
    const msg = document.createElement("div");
    msg.className = `csw-message csw-${sender}`;
    if (messageId) msg.setAttribute("data-msg-id", messageId);
    if (tempId) msg.setAttribute("data-temp-id", tempId);

    let html = "";
    if (sender === "agent") {
      const displayName = isAi ? (senderName || "AI Assistant") : formatFirstName(senderName);
      html += `<div class="csw-agent-name">${escapeHtml(displayName)}${isAi ? ' <span class="csw-ai-badge">AI</span>' : ''}</div>`;
    }

    if (attachmentUrl) {
      if (attachmentType === "image" || attachmentType?.startsWith("image/")) {
        html += `<img src="${attachmentUrl}" style="max-width:100%; border-radius:10px; margin-bottom:4px; display:block;" />`;
      } else {
        html += `<a href="${attachmentUrl}" target="_blank" style="color:inherit; text-decoration:underline; display:inline-flex; align-items:center; gap:4px; margin-bottom:4px;">📄 ${text || "View Document"}</a>`;
      }
    } else if (text) {
      html += `<div>${escapeHtml(text)}</div>`;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let statusText = "";
    let readClass = "";
    if (sender === "visitor") {
      if (readAt) {
        statusText = "Read";
        readClass = "csw-read";
      } else if (deliveredAt) {
        statusText = "Delivered";
      } else {
        statusText = "Sent";
      }
    }

    html += `<div class="csw-meta"><span class="csw-time">${time}</span>${statusText ? `<span class="csw-status ${readClass}">${statusText}</span>` : ''}</div>`;
    msg.innerHTML = html;
    ui.messages.appendChild(msg);
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function appendPendingVisitorMessage(ui, text, tempId) {
    appendMessage(ui, "visitor", text, null, null, "You", false, null, null, null, tempId);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function submitFeedback(ui, rating, comment = "") {
    if (!activeSessionId || feedbackSent) return;
    const parsed = Number(rating);
    fetch(`${origin}/api/widget/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ sessionId: activeSessionId, rating: parsed, comment })
    }).then(() => {
      feedbackSent = true;
      ui.feedback.innerHTML = '<span class="csw-feedback-label" style="text-align:center; padding:8px 0; color:#059669; font-weight:800;">✨ Thanks for your feedback!</span>';
      setTimeout(() => {
        localStorage.removeItem(sessionKey);
        activeSessionId = null;
        feedbackSent = false;
        resetFeedbackUI(ui);
        ui.messages.innerHTML = "";
        boot(ui);
      }, 1400);
    }).catch(err => {
      console.error("Feedback submit error:", err);
      localStorage.removeItem(sessionKey);
      activeSessionId = null;
      feedbackSent = false;
      resetFeedbackUI(ui);
      ui.messages.innerHTML = "";
      boot(ui);
    });
  }

  function renderBotNode(ui, nodeKey, skipLocalAppend = false) {
    if (!latestConfig || !latestConfig.botFlow || !latestConfig.botFlow.nodes) return;
    const node = latestConfig.botFlow.nodes[nodeKey];
    if (!node) return;

    const tempId = `bot-prompt-${nodeKey}-${Date.now()}`;

    if (node.message && !skipLocalAppend) {
      appendMessage(ui, "agent", node.message, null, null, latestConfig.websiteName ? `${latestConfig.websiteName} AI` : "Support Bot", true, null, null, null, tempId);
    }

    // Persist bot message to backend database and agent dashboard
    if (node.message && socket && activeSessionId) {
      socket.emit("visitor:bot-prompt", { sessionId: activeSessionId, message: node.message, nodeKey, tempId });
    }

    ui.quickReplies.innerHTML = "";

    // 1. Check if node is an interactive form
    if ((node.type === "form" || (node.fields && node.fields.length > 0)) && Array.isArray(node.fields) && node.fields.length > 0) {
      ui.form.style.display = "none";
      const formCard = document.createElement("div");
      formCard.className = "csw-bot-form-card";
      formCard.style.cssText = "background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin: 8px 0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);";

      let formHtml = `<div style="font-size:11.5px; font-weight:800; color:#1e293b; margin-bottom:8px; display:flex; align-items:center; gap:5px;">📋 ${escapeHtml(node.label || "Please complete details:")}</div>`;
      formHtml += `<form class="csw-bot-dynamic-form" style="display:flex; flex-direction:column; gap:8px;">`;

      node.fields.forEach(f => {
        const fieldName = f.name || f.label?.toLowerCase().replace(/\s+/g, '_') || "field";
        const isReq = f.required ? ' *' : '';
        formHtml += `<div style="display:flex; flex-direction:column; gap:2px;">
          <label style="font-size:10px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.03em;">${escapeHtml(f.label || f.name)}${isReq}</label>`;

        if (f.type === "dropdown" || (f.options && Array.isArray(f.options) && f.options.length > 0)) {
          formHtml += `<select name="${fieldName}" ${f.required ? 'required' : ''} style="font-size:11.5px; padding:7px 9px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff; color:#1e293b; outline:none;">
            <option value="">Select an option...</option>
            ${(f.options || []).map(opt => `<option value="${escapeHtml(typeof opt === 'string' ? opt : opt.text || opt.value)}">${escapeHtml(typeof opt === 'string' ? opt : opt.text || opt.value)}</option>`).join('')}
          </select>`;
        } else if (f.type === "textarea") {
          formHtml += `<textarea name="${fieldName}" rows="2" ${f.required ? 'required' : ''} placeholder="${escapeHtml(f.placeholder || '')}" style="font-size:11.5px; padding:7px 9px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff; color:#1e293b; outline:none; resize:none;"></textarea>`;
        } else {
          formHtml += `<input type="${f.type === 'tel' ? 'tel' : (f.type === 'email' ? 'email' : 'text')}" name="${fieldName}" ${f.required ? 'required' : ''} placeholder="${escapeHtml(f.placeholder || '')}" style="font-size:11.5px; padding:7px 9px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff; color:#1e293b; outline:none;" />`;
        }
        formHtml += `</div>`;
      });

      formHtml += `<button type="submit" class="csw-bot-form-submit-btn" style="margin-top:4px; padding:9px 14px; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:#ffffff; font-weight:800; font-size:11.5px; border:none; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 3px 10px rgba(16,185,129,0.35); transition:all 0.2s;">
        <span>Submit Details 🚀</span>
      </button>`;
      formHtml += `</form>`;

      formCard.innerHTML = formHtml;
      ui.messages.appendChild(formCard);
      ui.messages.scrollTop = ui.messages.scrollHeight;

      const dynamicForm = formCard.querySelector(".csw-bot-dynamic-form");
      dynamicForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = dynamicForm.querySelector(".csw-bot-form-submit-btn");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = "<span>Submitting...</span>";
        }

        const formData = new FormData(dynamicForm);
        const dataObj = {};
        formData.forEach((val, key) => { dataObj[key] = val; });

        try {
          await fetch(`${origin}/api/widget/lead`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({
              name: dataObj.full_name || dataObj.name || "Sales Lead",
              email: dataObj.email || "",
              phone: dataObj.phone || "",
              companyName: dataObj.company || "",
              budget: (dataObj.budget && !isNaN(Number(dataObj.budget))) ? Number(dataObj.budget) : 0,
              requirement: dataObj.requirements || dataObj.service_interest || JSON.stringify(dataObj),
              sessionId: activeSessionId
            })
          });
        } catch (err) {
          console.warn("Lead form submit error:", err);
        }

        formCard.innerHTML = `<div style="font-size:11.5px; font-weight:700; color:#059669; text-align:center; padding:6px 0;">✅ Details Submitted Successfully!</div>`;

        const summaryMsg = `Submitted Form: ${dataObj.full_name || 'Inquiry'} (${dataObj.service_interest || dataObj.email || dataObj.phone || 'Details Provided'})`;
        const vTempId = `temp-${Date.now()}`;
        appendMessage(ui, "visitor", summaryMsg, null, null, "You", false, null, null, null, vTempId);
        if (socket && activeSessionId) {
          socket.emit("visitor:message", { sessionId: activeSessionId, message: summaryMsg, tempId: vTempId });
        }

        if (node.next && latestConfig.botFlow.nodes[node.next]) {
          setTimeout(() => {
            renderBotNode(ui, node.next);
          }, 400);
        } else {
          ui.form.style.display = "flex";
        }
      };
      return;
    }

    // 2. Check if node is an action
    if (node.type === "action") {
      if (node.actionType === "escalate" && socket && activeSessionId) {
        socket.emit("visitor:message", { sessionId: activeSessionId, message: "Requested agent transfer" });
      }
      if (node.next && latestConfig.botFlow.nodes[node.next]) {
        setTimeout(() => {
          renderBotNode(ui, node.next);
        }, 300);
        return;
      }
    }

    // 3. Render quick replies / button options
    if (node.options && node.options.length > 0) {
      node.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "csw-qr-pill";
        btn.textContent = opt.text;
        btn.onclick = () => {
          const vTempId = `temp-${Date.now()}`;
          appendMessage(ui, "visitor", opt.text, null, null, "You", false, null, null, null, vTempId);
          botPath.push(opt.text);
          botSelections[nodeKey] = opt.text;
          if (socket && activeSessionId) {
            socket.emit("visitor:message", { sessionId: activeSessionId, message: opt.text, tempId: vTempId });
          }
          ui.quickReplies.innerHTML = "";
          if (opt.next && latestConfig.botFlow.nodes[opt.next]) {
            setTimeout(() => {
              renderBotNode(ui, opt.next);
            }, 300);
          } else {
            ui.form.style.display = "flex";
          }
        };
        ui.quickReplies.appendChild(btn);
      });
    } else {
      ui.quickReplies.innerHTML = "";
      ui.form.style.display = "flex";
    }
  }

  // Init UI & start
  const ui = createUi();

  ui.launcher.onclick = () => {
    const isOpen = ui.panel.classList.toggle("open");
    localStorage.setItem(panelOpenKey, isOpen ? "true" : "false");
  };

  ui.preSubmit.onclick = () => {
    const name = ui.preName.value.trim();
    const email = ui.preEmail.value.trim();
    if (!name || !email) return;
    boot(ui, { name, email });
  };

  let typingTimer = null;
  if (ui.input) {
    ui.input.addEventListener("input", () => {
      if (socket && activeSessionId) {
        socket.emit("visitor:typing", { sessionId: activeSessionId, isTyping: true });
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          if (socket && activeSessionId) {
            socket.emit("visitor:typing", { sessionId: activeSessionId, isTyping: false });
          }
        }, 1200);
      }
    });
  }

  ui.form.onsubmit = (e) => {
    e.preventDefault();
    const message = ui.input.value.trim();
    if (!message) return;
    const tempId = `temp-${Date.now()}`;
    if (typingTimer) clearTimeout(typingTimer);
    if (socket && activeSessionId) {
      socket.emit("visitor:typing", { sessionId: activeSessionId, isTyping: false });
    }
    if (!sendVisitorMessage({ message, tempId })) {
      setStatusMessage(ui, "Connecting... Please try again");
      return;
    }
    appendPendingVisitorMessage(ui, message, tempId);
    ui.input.value = "";
  };

  // Emoji picker
  ui.emojiBtn.onclick = () => {
    ui.emojiPicker.style.display = ui.emojiPicker.style.display === 'none' ? 'block' : 'none';
  };

  const commonEmojis = ["😊", "👍", "👋", "❤️", "🔥", "🎉", "🙏", "⭐", "💼", "📦", "💳", "✅"];
  const emojiGrid = ui.panel.querySelector("#csw-emoji-grid");
  if (emojiGrid) {
    commonEmojis.forEach(em => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "csw-emoji-item";
      btn.textContent = em;
      btn.onclick = () => {
        ui.input.value += em;
        ui.emojiPicker.style.display = "none";
        ui.input.focus();
      };
      emojiGrid.appendChild(btn);
    });
  }

  // Event Delegation for Feedback
  ui.panel.addEventListener("click", (e) => {
    if (e.target.classList.contains("csw-new-chat-btn")) {
      handleStartNewChat(ui);
      return;
    }

    if (e.target.classList.contains("csw-star")) {
      const rating = Number(e.target.dataset.rating || 0);
      if (!Number.isFinite(rating)) return;

      ui.feedback.dataset.rating = String(rating);
      ui.panel.querySelectorAll(".csw-star").forEach((btn) => {
        const r = Number(btn.dataset.rating || 0);
        btn.classList.toggle("active", r <= rating);
      });

      const sentimentEl = ui.panel.querySelector("#csw-star-sentiment");
      if (sentimentEl) {
        const sentiments = ["", "😞 Needs improvement", "😐 Fair support", "🙂 Good experience", "😊 Great service!", "🤩 Outstanding!"];
        sentimentEl.textContent = sentiments[rating] || "Tap a star to rate support";
        sentimentEl.style.color = rating >= 4 ? "#059669" : rating >= 3 ? "#d97706" : "#ef4444";
      }

      const submit = ui.panel.querySelector(".csw-feedback-submit");
      if (submit) submit.disabled = rating <= 0;
      return;
    }

    if (e.target.classList.contains("csw-feedback-submit")) {
      const rating = Number(ui.feedback.dataset.rating || 0);
      const commentEl = ui.panel.querySelector("#csw-feedback-comment");
      const comment = commentEl ? String(commentEl.value || "").trim() : "";
      submitFeedback(ui, rating, comment);
    }
  });

  boot(ui);
})();
