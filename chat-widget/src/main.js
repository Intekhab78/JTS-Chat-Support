import { io } from "socket.io-client";
import "./style.css";

(function () {
  if (window.__CHAT_SUPPORT_WIDGET__) return;
  window.__CHAT_SUPPORT_WIDGET__ = true;

  const currentScript = document.currentScript;
  const apiKey = currentScript && currentScript.getAttribute("data-api-key");
  const apiUrl = currentScript && currentScript.getAttribute("data-api-url");

  if (!apiKey) {
    console.error("Chat widget: missing data-api-key");
    return;
  }

  // Support data-api-url attribute or fall back to script's origin
  const origin = apiUrl || (currentScript ? new URL(currentScript.src).origin : "http://localhost:5000");
  const API_BASE = origin;
  console.log("ChatWidget: Using API Origin:", origin);
  const visitorKey = `chat_support_visitor_${apiKey}`;
  const sessionKey = `chat_support_session_${apiKey}`;
  const panelOpenKey = `chat_support_panel_open_${apiKey}`;
  let visitorId = localStorage.getItem(visitorKey) || "";
  let activeSessionId = localStorage.getItem(sessionKey) || "";
  let socket;
  let latestConfig = null;
  let currentBotNode = "root";
  let botPath = [];
  let botSelections = {};
  let contextVariables = {};
  let feedbackSent = false;
  let isResetting = false;
  let activePreData = null;

  function setLauncherContent(element, icon) {
    element.textContent = icon || "💬";
  }

  function setStatusMessage(ui, message, color = "") {
    ui.statusBar.textContent = message;
    ui.statusBar.style.color = color;
  }

  function shouldShowFeedback(config) {
    return true;
  }

  function resetFeedbackUI(ui) {
    ui.feedback.innerHTML = `
      <span class="csw-feedback-label">Rate your experience</span>
      <div class="csw-stars" role="radiogroup" aria-label="Rating (1 to 5)">
        <button class="csw-star" type="button" data-rating="1" aria-label="1 star">★</button>
        <button class="csw-star" type="button" data-rating="2" aria-label="2 stars">★</button>
        <button class="csw-star" type="button" data-rating="3" aria-label="3 stars">★</button>
        <button class="csw-star" type="button" data-rating="4" aria-label="4 stars">★</button>
        <button class="csw-star" type="button" data-rating="5" aria-label="5 stars">★</button>
      </div>
      <input class="csw-feedback-comment" id="csw-feedback-comment" placeholder="Optional feedback..." maxlength="500" />
      <button class="csw-feedback-submit" type="button" disabled>Submit</button>
    `;
    ui.feedback.dataset.rating = "0";
    ui.feedback.classList.remove("show");
  }

  function showNewChatButton(ui) {
    ui.statusBar.textContent = "Conversation Closed";
    ui.feedback.innerHTML = `
      <button class="csw-new-chat-btn" type="button">Start New Chat</button>
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
    ui.statusBar.textContent = "Start New Chat";
    ui.feedback.classList.remove("show");
    ui.form.style.display = "flex";
    boot(ui);
  }

  function setBranding(colors) {
    const root = document.documentElement;
    root.style.setProperty("--csw-primary", colors?.primary || "#004e64");
    root.style.setProperty("--csw-accent", colors?.accent || "#00a5cf");
  }

  function sendVisitorMessage(payload) {
    if (!socket || !socket.connected || !activeSessionId) {
      return false;
    }

    socket.emit("visitor:message", {
      sessionId: activeSessionId,
      ...payload
    });
    return true;
  }

  function createUi() {
    setBranding();
    const launcher = document.createElement("button");
    launcher.id = "csw-launcher";
    setLauncherContent(launcher, "💬");

    const panel = document.createElement("div");
    panel.id = "csw-panel";
    panel.innerHTML = `
      <div id="csw-status-bar">Connecting to support...</div>
      <div id="csw-header">
        <div style="flex: 1">
          <div id="csw-header-title">Support Chat</div>
          <div id="csw-header-subtitle">We usually reply in a few minutes</div>
        </div>
        <button id="csw-voice-btn" title="Call 24/7 AI Voice Agent" type="button" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:#fff; cursor:pointer; font-size:11px; padding:6px 12px; border-radius:12px; display:inline-flex; align-items:center; gap:5px; font-weight:800; transition:all 0.2s; white-space:nowrap; margin-right:4px;">
          📞 Call AI
        </button>
        <button id="csw-close-chat" title="End Chat">&times;</button>
      </div>

      <!-- VOICE CALL OVERLAY -->
      <div id="csw-voice-overlay" style="display:none; position:absolute; inset:0; background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%); z-index:9999; padding:24px; color:#fff; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
        <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#10b981,#06b6d4); display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px; box-shadow:0 0 30px rgba(16,185,129,0.5);">
          🎙️
        </div>
        <div style="font-size:18px; font-weight:900; margin-bottom:6px; letter-spacing:-0.02em;">24/7 AI Telephone Voice Agent</div>
        <div style="font-size:11px; color:#cbd5e1; margin-bottom:20px; line-height:1.5; max-width:280px;">Speak directly with our AI Agent for instant support, visa status, or billing queries.</div>
        
        <a href="tel:+971508492019" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; max-width:260px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:800; font-size:12px; text-decoration:none; padding:13px 18px; border-radius:14px; box-shadow:0 10px 25px rgba(16,185,129,0.4); margin-bottom:10px;">
          📞 Phone Call: +971-50-8492019
        </a>
        <button id="csw-start-web-call" type="button" style="width:100%; max-width:260px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); color:#fff; font-weight:800; font-size:12px; padding:12px 18px; border-radius:14px; cursor:pointer; transition:all 0.2s;">
          🎙️ Web Browser Voice Call
        </button>
        <button id="csw-close-voice" type="button" style="margin-top:18px; background:none; border:none; color:#94a3b8; font-size:12px; font-weight:700; cursor:pointer; text-decoration:underline;">
          Close & Back to Chat
        </button>
      </div>
      <div id="csw-prechat">
        <div style="font-size:14px; color:var(--csw-text-muted); margin-bottom:12px; line-height:1.6">
          Hello! Please introduce yourself to start a live conversation with our team.
        </div>
        <div class="csw-prechat-field">
          <label class="csw-prechat-label">Full Name</label>
          <input class="csw-prechat-input" id="csw-pre-name" placeholder="e.g. John Doe" required />
        </div>
        <div class="csw-prechat-field">
          <label class="csw-prechat-label">Email Address</label>
          <input class="csw-prechat-input" id="csw-pre-email" type="email" placeholder="e.g. john@example.com" required />
        </div>

        <button class="csw-prechat-submit" id="csw-pre-submit">Start Chat</button>
      </div>
      <div id="csw-chat-interface">
        <div id="csw-messages"></div>
        <div id="csw-typing"></div>
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
    const startWebCallBtn = panel.querySelector("#csw-start-web-call");

    function renderDefaultVoiceUI() {
      if (!voiceOverlay) return;
      voiceOverlay.innerHTML = `
        <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#10b981,#06b6d4); display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px; box-shadow:0 0 30px rgba(16,185,129,0.5);">
          🎙️
        </div>
        <div style="font-size:18px; font-weight:900; margin-bottom:6px; letter-spacing:-0.02em;">24/7 AI Telephone Voice Agent</div>
        <div style="font-size:11px; color:#cbd5e1; margin-bottom:20px; line-height:1.5; max-width:280px;">Speak directly with our AI Agent for instant support, visa status, or billing queries.</div>
        
        <a href="tel:+971508492019" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; max-width:260px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:800; font-size:12px; text-decoration:none; padding:13px 18px; border-radius:14px; box-shadow:0 10px 25px rgba(16,185,129,0.4); margin-bottom:10px;">
          📞 Phone Call: +971-50-8492019
        </a>
        <button id="csw-start-web-call" type="button" style="width:100%; max-width:260px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); color:#fff; font-weight:800; font-size:12px; padding:12px 18px; border-radius:14px; cursor:pointer; transition:all 0.2s;">
          🎙️ Web Browser Voice Call
        </button>
        <button id="csw-close-voice" type="button" style="margin-top:18px; background:none; border:none; color:#94a3b8; font-size:12px; font-weight:700; cursor:pointer; text-decoration:underline;">
          Close & Back to Chat
        </button>
      `;
      bindVoiceOverlayEvents();
    }

    function bindVoiceOverlayEvents() {
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
            voiceOverlay.innerHTML = `
              <!-- Compact Top Glass Navigation Bar -->
              <div style="width:100%; display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding:0 4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></span>
                  <span style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;">LIVE AI VOICE SESSION</span>
                </div>
                <button id="csw-close-live-top-btn" type="button" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; transition:all 0.2s;">✕</button>
              </div>

              <!-- Animated Soundwave Avatar Sphere -->
              <div style="position:relative; margin-bottom:8px; display:flex; flex-direction:column; align-items:center;">
                <div style="width:70px; height:70px; border-radius:50%; background:radial-gradient(circle at 30% 30%, #38bdf8, #10b981, #6366f1); display:flex; align-items:center; justify-content:center; font-size:32px; animation:csw-voice-pulse-ring 2.5s infinite ease-in-out; margin:0 auto; cursor:pointer; border:2px solid rgba(255,255,255,0.3);">
                  🎙️
                </div>
                
                <!-- Audio Frequency Equalizer Waves -->
                <div style="display:flex; align-items:flex-end; gap:4px; height:18px; margin-top:6px;">
                  <div class="csw-voice-eq-bar"></div>
                  <div class="csw-voice-eq-bar"></div>
                  <div class="csw-voice-eq-bar"></div>
                  <div class="csw-voice-eq-bar"></div>
                  <div class="csw-voice-eq-bar"></div>
                </div>
              </div>

              <!-- Sleek Glass Status Pill -->
              <div id="csw-voice-status-badge" style="display:inline-flex; align-items:center; gap:6px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#34d399; font-size:9px; font-weight:800; padding:4px 14px; border-radius:20px; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; backdrop-filter:blur(10px);">
                <span style="width:6px; height:6px; border-radius:50%; background:#34d399; display:inline-block; box-shadow:0 0 8px #34d399;"></span>
                MIC LISTENING... (SPEAK NOW)
              </div>

              <!-- Full Scrollable Voice Conversation History Feed -->
              <div id="csw-voice-conversation-feed" style="width:100%; max-width:320px; height:240px; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:10px; margin-bottom:10px; background:rgba(15,23,42,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:18px; backdrop-filter:blur(16px);">
                <div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:11px; font-weight:600;">
                  <span style="font-size:22px; display:block; margin-bottom:6px;">🎙️</span>
                  Live AI Voice Call Connected.<br/><span style="color:#a7f3d0; font-size:10px; font-weight:700;">Speak your query into your microphone!</span>
                </div>
              </div>

              <!-- Apple-Style Action Dock -->
              <div style="display:flex; gap:8px; width:100%; max-width:320px;">
                <button id="csw-speak-mic-btn" type="button" style="flex:1.2; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:800; font-size:11px; padding:11px 14px; border-radius:14px; cursor:pointer; border:none; box-shadow:0 6px 20px rgba(16,185,129,0.35); display:flex; align-items:center; justify-content:center; gap:6px;">
                  🎙️ Speak Now (Mic Active)
                </button>
                <button id="csw-end-live-call" type="button" style="flex:0.8; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; font-weight:800; font-size:11px; padding:11px 14px; border-radius:14px; cursor:pointer; border:none; box-shadow:0 6px 20px rgba(239,68,68,0.35); display:flex; align-items:center; justify-content:center; gap:4px;">
                  🔴 End Call
                </button>
              </div>
            `;

            const feedContainer = voiceOverlay.querySelector("#csw-voice-conversation-feed");
            const speakMicBtn = voiceOverlay.querySelector("#csw-speak-mic-btn");
            const statusBadge = voiceOverlay.querySelector("#csw-voice-status-badge");
            const endBtn = voiceOverlay.querySelector("#csw-end-live-call");
            const topCloseBtn = voiceOverlay.querySelector("#csw-close-live-top-btn");

            let isCallActive = true;
            let isAiSpeaking = false;
            let voiceHistory = []; // Persistent Spoken Conversation History

            function renderVoiceFeed(isThinking = false) {
              const feedEl = voiceOverlay.querySelector("#csw-voice-conversation-feed");
              if (!feedEl) return;

              if (voiceHistory.length === 0 && !isThinking) {
                feedEl.innerHTML = `
                  <div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:11px; font-weight:600;">
                    <span style="font-size:22px; display:block; margin-bottom:6px;">🎙️</span>
                    Live AI Voice Call Connected.<br/><span style="color:#a7f3d0; font-size:10px; font-weight:700;">Speak your query into your microphone!</span>
                  </div>
                `;
                return;
              }

              let html = voiceHistory.map(item => {
                if (item.role === 'user') {
                  return `
                    <div style="display:flex; flex-direction:column; align-items:flex-end; margin-bottom:4px;">
                      <div style="font-size:8.5px; font-weight:800; color:#a7f3d0; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; display:flex; align-items:center; gap:4px;">
                        <span>🗣️</span> YOU (CALLER SPOKEN VOICE)
                      </div>
                      <div style="background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.35); color:#f8fafc; font-size:11.5px; font-weight:600; padding:10px 14px; border-radius:16px 16px 4px 16px; max-width:90%; line-height:1.45; backdrop-filter:blur(10px); box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                        "${item.text}"
                      </div>
                    </div>
                  `;
                } else {
                  return `
                    <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:6px;">
                      <div style="font-size:8.5px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; display:flex; align-items:center; gap:4px;">
                        <span>🤖</span> AI VOICE AGENT <span style="font-size:7.5px; background:rgba(56,189,248,0.18); color:#38bdf8; padding:1px 5px; border-radius:4px;">Gemini Live</span>
                      </div>
                      <div style="background:linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95)); border:1px solid rgba(56,189,248,0.35); color:#f1f5f9; font-size:11.5px; font-weight:700; padding:12px 14px; border-radius:16px 16px 16px 4px; max-width:92%; line-height:1.5; box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                        "${item.text}"
                        ${item.ticketId ? `<div style="margin-top:6px; font-size:9px; color:#34d399; font-weight:800; background:rgba(16,185,129,0.15); padding:3px 8px; border-radius:6px; display:inline-block; border:1px solid rgba(16,185,129,0.25);">🎫 Ticket Logged: ${item.ticketId}</div>` : ''}
                      </div>
                    </div>
                  `;
                }
              }).join("");

              if (isThinking) {
                html += `
                  <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:6px;">
                    <div style="font-size:8.5px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; display:flex; align-items:center; gap:4px;">
                      <span>🤖</span> AI THINKING...
                    </div>
                    <div style="background:rgba(56,189,248,0.1); border:1px dashed rgba(56,189,248,0.35); color:#38bdf8; font-size:11px; font-style:italic; padding:10px 14px; border-radius:14px;">
                      Generating spoken response from system database...
                    </div>
                  </div>
                `;
              }

              feedEl.innerHTML = html;
              feedEl.scrollTop = feedEl.scrollHeight;
            }

            if (topCloseBtn) {
              topCloseBtn.onclick = () => {
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

            // Request explicit browser mic access
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (permErr) {
                console.log("Microphone access prompt:", permErr);
              }
            }

            async function processQueryAndRespond(promptText) {
              voiceHistory.push({ role: 'user', text: promptText });
              renderVoiceFeed(true);

              statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#38bdf8; display:inline-block; box-shadow:0 0 8px #38bdf8;"></span> AI THINKING & RESPONDING...`;

              // Mute mic while AI thinks and speaks
              isAiSpeaking = true;
              if (recognition) {
                try { recognition.stop(); } catch(e) {}
              }

              try {
                const res = await fetch(`${API_BASE}/api/voice/call-simulated`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ websiteId: apiKey, prompt: promptText })
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
                      utterance.pitch = 0.75; // Deep male pitch frequency
                    } else {
                      utterance.pitch = 1.05; // Higher female pitch frequency
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
                    setTimeout(onSpeechDone, 5000);
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
              if (!isCallActive || isAiSpeaking) return;

              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (!SpeechRecognition) {
                console.warn("SpeechRecognition not supported");
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
                    speakMicBtn.textContent = "🟢 Mic Active - Listening...";
                    speakMicBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
                  }
                  statusBadge.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block;"></span> 🟢 MIC LISTENING... (SPEAK NOW)`;
                };

                recognition.onresult = (event) => {
                  if (isAiSpeaking) return;
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
                  console.log("Mic recognition notice/status:", err);
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
    bindVoiceOverlayEvents();

    const emojiGrid = panel.querySelector("#csw-emoji-grid");
    const emojis = "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾".split(" ");
    emojis.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.className = "csw-emoji-item";
      btn.type = "button";
      btn.textContent = emoji;
      emojiGrid.appendChild(btn);
    });

    launcher.onclick = () => {
      panel.classList.toggle("open");
      const isOpen = panel.classList.contains("open");
      localStorage.setItem(panelOpenKey, isOpen ? "true" : "false");
    };

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
      statusBar: panel.querySelector("#csw-status-bar"),
      headerTitle: panel.querySelector("#csw-header-title"),
      closeBtn: panel.querySelector("#csw-close-chat"),
      emojiBtn: panel.querySelector("#csw-emoji-btn"),
      emojiPicker: panel.querySelector("#csw-emoji-picker"),
      attachBtn: null,
      fileInput: null // Will be added below
    };
  }

  function setupUpload(ui, websiteId) {
    const input = ui.panel.querySelector("#csw-input");
    const form = ui.panel.querySelector("#csw-form");

    let fileInput = ui.fileInput;
    let attachBtn = ui.attachBtn;

    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.style.display = "none";
      fileInput.accept = "image/*,application/pdf";
      document.body.appendChild(fileInput);
      ui.fileInput = fileInput;
    }

    if (!attachBtn) {
      attachBtn = document.createElement("button");
      attachBtn.id = "csw-attach-btn";
      attachBtn.type = "button";
      attachBtn.innerHTML = "&#128206;";
      attachBtn.style.cssText = `
        background: none; border: none; color: #64748b; font-size: 20px;
        cursor: pointer; padding: 4px; transition: color 0.2s;
      `;
      attachBtn.onmouseover = () => attachBtn.style.color = "var(--csw-primary)";
      attachBtn.onmouseout = () => attachBtn.style.color = "#64748b";

      form.insertBefore(attachBtn, input);
      ui.attachBtn = attachBtn;
    }

    attachBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        ui.statusBar.textContent = "File too large. Maximum size is 10MB.";
        setTimeout(() => ui.statusBar.textContent = "Connected", 3000);
        fileInput.value = "";
        return;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf'
      ];
      if (!allowedTypes.includes(file.type)) {
        ui.statusBar.textContent = "File type not supported. Only images and PDFs allowed.";
        setTimeout(() => ui.statusBar.textContent = "Connected", 3000);
        fileInput.value = "";
        return;
      }

      ui.statusBar.textContent = "Uploading file...";
      const formData = new FormData();
      formData.append("attachment", file);

      try {
        const res = await fetch(`${API_BASE}/api/widget/upload`, {
          method: "POST",
          headers: { "x-api-key": websiteId },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Upload failed");

        if (!sendVisitorMessage({
          message: "Sent an attachment",
          attachmentUrl: data.url,
          attachmentType: data.attachmentType
        })) {
          throw new Error("Chat is still connecting. Please try again.");
        }
        ui.statusBar.textContent = "File sent successfully";
        setTimeout(() => ui.statusBar.textContent = "Connected", 3000);
      } catch (err) {
        ui.statusBar.textContent = "Upload failed: " + err.message;
        setTimeout(() => ui.statusBar.textContent = "Connected", 3000);
      } finally {
        fileInput.value = "";
      }
    };
  }

  function appendMessage(ui, sender, message, attachmentUrl, attachmentType, senderName, isAi, msgId, deliveredAt, readAt) {
    const item = document.createElement("div");
    item.className = `csw-message ${sender === "visitor" ? "csw-visitor" : "csw-agent"}`;
    if (msgId) item.setAttribute('data-msg-id', msgId);

    if (sender !== "visitor") {
      const nameTag = document.createElement("div");
      nameTag.className = "csw-agent-name";
      nameTag.append(document.createTextNode(senderName || "Support Agent"));
      if (isAi) {
        nameTag.append(document.createTextNode(" "));
        const badge = document.createElement("span");
        badge.className = "csw-ai-badge";
        badge.textContent = "AI";
        nameTag.appendChild(badge);
      }
      item.appendChild(nameTag);
    }

    if (attachmentUrl) {
      if (attachmentType === "image") {
        const img = document.createElement("img");
        img.src = attachmentUrl;
        img.className = "csw-attachment-preview";
        img.style.cssText = "max-width: 100%; border-radius: 12px; margin-bottom: 8px; display: block; cursor: pointer; border: 1px solid rgba(0,0,0,0.05);";
        img.onclick = () => window.open(attachmentUrl, "_blank");
        item.appendChild(img);
      } else {
        const link = document.createElement("a");
        link.href = attachmentUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "csw-file-link";
        link.style.cssText = `
          display: flex; align-items: center; gap: 8px; padding: 10px 12px; 
          background: rgba(0,0,0,0.05); border-radius: 10px; color: inherit; 
          text-decoration: none; font-size: 12px; font-weight: 600; margin-bottom: 8px;
        `;
        const icon = document.createElement("span");
        icon.textContent = "📄";
        link.appendChild(icon);
        link.append(document.createTextNode(` ${attachmentType?.toUpperCase() || "FILE"}`));
        item.appendChild(link);
      }
    }

    if (message && message !== "Sent an attachment") {
      const text = document.createElement("div");
      text.className = "csw-text";

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = message.split(urlRegex);

      parts.forEach(part => {
        if (part.match(urlRegex)) {
          const link = document.createElement("a");
          link.href = part;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = part;
          link.className = "csw-hyperlink";
          link.style.cssText = "color: #2563eb !important; text-decoration: underline !important; font-weight: 700 !important; cursor: pointer; display: inline; word-break: break-all;";
          link.onclick = (e) => e.stopPropagation();
          text.appendChild(link);
        } else if (part) {
          text.appendChild(document.createTextNode(part));
        }
      });

      item.appendChild(text);
    }

    const meta = document.createElement("div");
    meta.className = "csw-meta";

    const time = document.createElement("span");
    time.className = "csw-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(time);

    if (sender === "visitor") {
      const status = document.createElement("span");
      status.className = `csw-status ${readAt ? 'csw-read' : ''}`;
      status.textContent = readAt || deliveredAt ? "Delivered" : "Sent";
      meta.appendChild(status);
    }

    item.appendChild(meta);
    ui.messages.appendChild(item);
    ui.messages.scrollTo({
      top: ui.messages.scrollHeight,
      behavior: 'smooth'
    });
  }

  function appendPendingVisitorMessage(ui, message, tempId) {
    appendMessage(ui, "visitor", message, null, null, "You", false, tempId);
    const item = ui.panel.querySelector(`[data-msg-id="${tempId}"]`);
    if (!item) return;

    item.setAttribute("data-temp-id", tempId);
    const status = item.querySelector(".csw-status");
    if (status) status.textContent = "Sending";
  }

  function appendTicketCard(ui, ticketId, ticketStatusUrl, agentName) {
    const item = document.createElement("div");
    item.className = "csw-message csw-agent";

    const nameTag = document.createElement("div");
    nameTag.className = "csw-agent-name";
    nameTag.textContent = agentName || latestConfig?.websiteName || "Support";

    // Ticket card container
    const card = document.createElement("div");
    card.style.cssText = `
      background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
      border: 1.5px solid var(--csw-primary, #004e64);
      border-radius: 14px;
      padding: 14px 16px;
      margin-top: 4px;
      min-width: 180px;
    `;

    // Icon + title row
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";
    header.innerHTML = `
      <div style="width:30px;height:30px;border-radius:8px;background:var(--csw-primary,#004e64);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Ticket Created</div>
        <div style="font-size:13px;font-weight:800;color:var(--csw-primary,#004e64);">${ticketId}</div>
      </div>
    `;

    // Description
    const desc = document.createElement("div");
    desc.style.cssText = "font-size:11px;color:#475569;margin-bottom:12px;line-height:1.5;";
    desc.textContent = "Your support ticket has been submitted. Click below to track its status in real time.";

    // Track button
    const btn = document.createElement("a");
    btn.href = ticketStatusUrl;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: var(--csw-primary, #004e64);
      color: white;
      border-radius: 10px;
      padding: 9px 14px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s;
      cursor: pointer;
    `;
    btn.onmouseover = () => btn.style.opacity = "0.85";
    btn.onmouseout = () => btn.style.opacity = "1";
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Track Ticket Status
    `;

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(btn);

    item.appendChild(nameTag);
    item.appendChild(card);

    const meta = document.createElement("div");
    meta.className = "csw-meta";
    const time = document.createElement("span");
    time.className = "csw-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(time);
    item.appendChild(meta);

    ui.messages.appendChild(item);
    ui.messages.scrollTo({ top: ui.messages.scrollHeight, behavior: 'smooth' });
  }


  function submitFeedback(ui, rating, comment = "") {
    if (!activeSessionId || feedbackSent) return;
    const parsed = Number(rating);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return;
    fetch(`${origin}/api/widget/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ sessionId: activeSessionId, rating: parsed, comment })
    })
      .then(() => {
        feedbackSent = true;
        ui.feedback.innerHTML = '<span class="csw-feedback-label">Thanks for your feedback!</span>';
        ui.feedback.classList.add("show");

        // Automatic Refresh Flow: Clear and Reset after feedback
        setTimeout(() => {
          if (isResetting) return;
          isResetting = true;

          localStorage.removeItem(sessionKey);
          localStorage.removeItem(visitorKey);
          ui.messages.innerHTML = "";
          ui.prechat.style.display = "block";
          ui.chatInterface.style.display = "none";
          ui.statusBar.textContent = "Start New Chat";
          ui.feedback.classList.remove("show");
          ui.form.style.display = "flex";

          // Re-boot fresh state for the next session
          boot(ui).then(() => {
            isResetting = false;
          });
        }, 2500);
      })
      .catch(err => console.error("Feedback error", err));
  }

  function renderBotNode(ui, nodeKey) {
    // ── DEBUG: Root Node Loaded ─────────────────────────────────────────────
    if (!latestConfig?.botFlow || !latestConfig.botFlow.nodes) {
      console.warn('[FlowBot] ❌ No botFlow or nodes in config. botFlow:', latestConfig?.botFlow);
      return;
    }

    const node = latestConfig.botFlow.nodes[nodeKey];

    if (!node) {
      console.warn('[FlowBot] ❌ Node not found in flow tree. nodeKey:', nodeKey,
        '| Available nodes:', Object.keys(latestConfig.botFlow.nodes));
      return;
    }

    console.log('[FlowBot] ✅ Root Node Loaded:', nodeKey, '| type:', node.type,
      '| message:', node.message?.substring(0, 50),
      '| options count:', node.options?.length ?? 0);

    currentBotNode = nodeKey;

    let nodeType = node.type;
    if (!nodeType) {
      if (node.isForm) nodeType = "form";
      else if (node.escalate) nodeType = "action";
      else if (node.options && node.options.length > 0) nodeType = "button_group";
      else nodeType = "message";
    }

    if (nodeType === "condition") {
      console.log('[FlowBot] 🔀 Condition node detected:', nodeKey);
      handleConditionNode(ui, node);
      return;
    }

    if (nodeType === "action") {
      console.log('[FlowBot] ⚡ Action node detected:', nodeKey, '| actionType:', node.actionType);
      handleActionNode(ui, node);
      return;
    }

    if (node.message) {
      appendMessage(ui, "agent", node.message, null, null, latestConfig.websiteName || "Support Bot", true);
    }

    ui.quickReplies.innerHTML = "";
    ui.quickReplies.classList.remove("bot-mode");

    if (nodeType === "message" || nodeType === "button_group") {
      if (node.isSolution) {
        console.log('[FlowBot] ✅ Solution node — rendering close/agent buttons');
        renderSolutionButtons(ui);
      } else if (node.options && node.options.length > 0) {
        // ── DEBUG: Child Nodes Found ──────────────────────────────────────
        console.log('[FlowBot] 🔗 Child Nodes Found:', node.options.length,
          '| Labels:', node.options.map(o => o.text).join(', '));
        renderOptions(ui, node, nodeKey);
      } else if (node.next) {
        console.log('[FlowBot] ➡️ No options — advancing to next node:', node.next);
        renderBotNode(ui, node.next);
      } else {
        // ── FALLBACK: options array empty or missing, nothing to navigate to
        console.warn('[FlowBot] ⚠️ Node', nodeKey,
          'has no options and no next. Flow ends here.',
          '| options:', JSON.stringify(node.options));
        if (node.options !== undefined) {
          // options key exists but is empty — show error to visitor
          renderFlowError(ui, 'Flow options failed to load. Please try again or contact support.');
        }
      }
    } else if (nodeType === "form") {
      if (node.fields) {
        renderDynamicForm(ui, node, nodeKey);
      } else {
        renderBotForm(ui, node.formType);
      }
    }
  }

  function handleConditionNode(ui, node) {
    if (node.conditionType === "agents_online") {
      if (latestConfig.isAgentOnline) {
        renderBotNode(ui, node.trueNext);
      } else {
        renderBotNode(ui, node.falseNext);
      }
    } else {
      renderBotNode(ui, node.trueNext || node.falseNext);
    }
  }

  async function handleActionNode(ui, node) {
    const actionType = node.actionType || (node.escalate ? "escalate" : "unknown");

    if (actionType === "escalate") {
      handleBotEscalation(ui, node.department);
      return;
    }

    if (node.message) {
      appendMessage(ui, "agent", node.message, null, null, latestConfig.websiteName || "Support Bot", true);
    }

    try {
      ui.statusBar.textContent = "Processing...";
      const res = await fetch(`${API_BASE}/api/widget/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          sessionId: activeSessionId,
          actionType: actionType,
          nodeData: node,
          context: contextVariables
        })
      });

      if (!res.ok) {
        // Action failed on the server — show error and allow retry via agent
        const errData = await res.json().catch(() => ({}));
        console.error("Action failed:", res.status, errData.message || "Unknown error");
        ui.statusBar.textContent = "Connected";
        appendMessage(ui, "agent",
          "Sorry, we couldn't complete that action. A support agent will assist you shortly.",
          null, null, latestConfig.websiteName || "Support Bot", true
        );
        // Escalate to live agent so the visitor isn't stuck
        handleBotEscalation(ui, node.department || "general");
        return;
      }

      ui.statusBar.textContent = "Connected";

      // If the action created a ticket, show the ticket status link card
      const resData = await res.json().catch(() => ({}));
      if (resData.ticketStatusUrl && resData.ticketId) {
        appendTicketCard(ui, resData.ticketId, resData.ticketStatusUrl, latestConfig.websiteName || "Support Bot");
      }

      if (node.next) {
        renderBotNode(ui, node.next);
      } else {
        handleBotResolution(ui);
      }
    } catch (err) {
      console.error("Action execution failed", err);
      ui.statusBar.textContent = "Action Failed";
      appendMessage(ui, "agent",
        "Sorry, there was a connection issue. Please try again or contact support.",
        null, null, latestConfig.websiteName || "Support Bot", true
      );
    }
  }

  function renderOptions(ui, node, nodeKey) {
    ui.quickReplies.classList.add("bot-mode");
    node.options.forEach((opt, idx) => {
      const pill = document.createElement("button");
      pill.className = "csw-qr-pill";
      pill.textContent = opt.text;
      pill.style.animationDelay = `${idx * 0.1}s`;
      pill.onclick = () => {
        // ── DEBUG: Button Rendered & clicked ───────────────────────────
        console.log('[FlowBot] 🖱️ Button clicked:', opt.text, '→ next node:', opt.next);
        ui.quickReplies.innerHTML = "";
        ui.quickReplies.classList.remove("bot-mode");
        appendMessage(ui, "visitor", opt.text, null, null, "You", false);
        botPath.push(opt.text);
        botSelections[nodeKey] = opt.text;
        if (!opt.next || !latestConfig.botFlow.nodes[opt.next]) {
          console.error('[FlowBot] ❌ Broken link! next node not found:', opt.next,
            '| Available:', Object.keys(latestConfig.botFlow.nodes));
          renderFlowError(ui, 'Flow options failed to load. The next step could not be found.');
          return;
        }
        renderBotNode(ui, opt.next);
        submitBotStatus("in_progress", botPath, botSelections);
      };
      ui.quickReplies.appendChild(pill);
      // ── DEBUG: Buttons Rendered ────────────────────────────────────
      console.log('[FlowBot] 🔘 Button Rendered:', opt.text, '→', opt.next);
    });
    console.log('[FlowBot] ✅ Buttons Generated:', node.options.length, 'buttons for node:', nodeKey);
  }

  function renderFlowError(ui, message) {
    // Fallback protection: show user-facing error instead of blank widget
    const errorDiv = document.createElement('div');
    errorDiv.className = 'csw-flow-error';
    errorDiv.innerHTML = `
      <span>⚠️</span>
      <span>${message}</span>
    `;
    ui.quickReplies.innerHTML = '';
    ui.quickReplies.appendChild(errorDiv);
    console.error('[FlowBot] 🚨 Flow error displayed to visitor:', message);
  }

  function renderSolutionButtons(ui) {
    const resolvedBtn = document.createElement("button");
    resolvedBtn.className = "csw-qr-pill csw-bot-resolved";
    resolvedBtn.innerHTML = "✅ Close Chat";
    resolvedBtn.onclick = () => handleBotResolution(ui);

    const agentBtn = document.createElement("button");
    agentBtn.className = "csw-qr-pill csw-bot-agent";
    agentBtn.innerHTML = "💬 Talk to Agent";
    agentBtn.onclick = () => handleBotEscalation(ui);

    ui.quickReplies.appendChild(resolvedBtn);
    ui.quickReplies.appendChild(agentBtn);
  }

  function renderDynamicForm(ui, node, nodeKey) {
    const formContainer = document.createElement("div");
    formContainer.className = "csw-bot-form-container";
    formContainer.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:12px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:12px;";

    let formHtml = "";
    node.fields.forEach(f => {
      const req = f.required ? 'required' : '';
      if (f.type === "dropdown") {
        let optionsHtml = f.options.map(o => `<option value="${o}">${o}</option>`).join("");
        formHtml += `<select id="dyn_${f.name}" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;background:white;" ${req}>
             <option value="" disabled selected>${f.label}</option>
             ${optionsHtml}
           </select>`;
      } else if (f.type === "textarea" || f.name === "description" || f.name === "requirements") {
        formHtml += `<textarea id="dyn_${f.name}" placeholder="${f.label}" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;min-height:60px;" ${req}></textarea>`;
      } else {
        const inputType = f.type === "email" ? "email" : (f.type === "number" ? "number" : "text");
        formHtml += `<input type="${inputType}" id="dyn_${f.name}" placeholder="${f.label}" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;" ${req}/>`;
      }
    });

    formHtml += `<button id="dyn_submit_${nodeKey}" style="background:#4f46e5;color:white;border:none;padding:8px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;">Submit</button>`;
    formContainer.innerHTML = formHtml;
    ui.quickReplies.appendChild(formContainer);

    document.getElementById(`dyn_submit_${nodeKey}`).onclick = async (e) => {
      const btn = e.target;

      let isValid = true;
      let formData = {};
      node.fields.forEach(f => {
        const el = document.getElementById(`dyn_${f.name}`);
        if (f.required && !el.value.trim()) {
          isValid = false;
          el.style.borderColor = "red";
        } else {
          el.style.borderColor = "#cbd5e1";
          formData[f.name] = el.value.trim();
        }
      });

      if (!isValid) return;

      btn.disabled = true;
      btn.textContent = "Submitting...";

      contextVariables = { ...contextVariables, ...formData };
      await submitBotStatus("in_progress", botPath, { ...botSelections, [nodeKey]: "Form Submitted" });

      if (node.next) {
        renderBotNode(ui, node.next);
      } else {
        handleBotResolution(ui);
      }
    };
  }

  function renderBotForm(ui, formType) {
    const formContainer = document.createElement("div");
    formContainer.className = "csw-bot-form-container";
    formContainer.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:12px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:12px;";

    if (formType === "service_inquiry") {
      formContainer.innerHTML = `
        <input type="text" id="csw-lead-name" placeholder="Full Name" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;"/>
        <input type="email" id="csw-lead-email" placeholder="Email Address" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;"/>
        <input type="tel" id="csw-lead-phone" placeholder="Phone Number" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;"/>
        <input type="text" id="csw-lead-company" placeholder="Company Name" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;"/>
        <input type="number" id="csw-lead-budget" placeholder="Estimated Budget ($)" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;"/>
        <textarea id="csw-lead-req" placeholder="Project Requirements" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;min-height:60px;"></textarea>
        <button id="csw-lead-submit" style="background:#4f46e5;color:white;border:none;padding:8px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;">Submit Request</button>
      `;
      ui.quickReplies.appendChild(formContainer);

      document.getElementById("csw-lead-submit").onclick = async (e) => {
        const btn = e.target;
        const nameEl = document.getElementById("csw-lead-name");
        const emailEl = document.getElementById("csw-lead-email");

        let isValid = true;
        if (!nameEl.value.trim()) {
          nameEl.style.borderColor = "red";
          isValid = false;
        } else {
          nameEl.style.borderColor = "";
        }
        if (!emailEl.value.trim()) {
          emailEl.style.borderColor = "red";
          isValid = false;
        } else {
          emailEl.style.borderColor = "";
        }

        if (!isValid) return;

        btn.disabled = true;
        btn.textContent = "Submitting...";

        try {
          const payload = {
            name: document.getElementById("csw-lead-name").value,
            email: document.getElementById("csw-lead-email").value,
            phone: document.getElementById("csw-lead-phone").value,
            companyName: document.getElementById("csw-lead-company").value,
            budget: document.getElementById("csw-lead-budget").value,
            requirement: document.getElementById("csw-lead-req").value,
            sessionId: activeSessionId
          };

          await fetch(`${API_BASE}/api/widget/lead`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify(payload)
          });

          formContainer.innerHTML = '<div style="color:#10b981;font-weight:bold;text-align:center;font-size:12px;">✅ Inquiry submitted! Our sales team will contact you shortly.</div>';
          handleBotResolution(ui);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Submit Inquiry";
          alert("Submission failed. Please try again.");
        }
      };
    } else if (formType === "raise_ticket") {
      formContainer.innerHTML = `
        <input type="text" id="csw-ticket-subject" placeholder="Ticket Subject" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;"/>
        <select id="csw-ticket-dept" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;background:white;">
           <option value="support">Technical Support</option>
           <option value="billing">Billing</option>
           <option value="sales">Sales</option>
        </select>
        <select id="csw-ticket-priority" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;background:white;">
           <option value="low">Low Priority</option>
           <option value="medium" selected>Medium Priority</option>
           <option value="high">High Priority</option>
           <option value="urgent">Urgent</option>
        </select>
        <textarea id="csw-ticket-desc" placeholder="Describe your issue in detail..." style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;min-height:80px;"></textarea>
        <button id="csw-ticket-submit" style="background:#4f46e5;color:white;border:none;padding:8px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;">Create Ticket</button>
      `;
      ui.quickReplies.appendChild(formContainer);

      document.getElementById("csw-ticket-submit").onclick = async (e) => {
        const btn = e.target;
        const subjectEl = document.getElementById("csw-ticket-subject");
        const descEl = document.getElementById("csw-ticket-desc");

        let isValid = true;
        if (!subjectEl.value.trim()) {
          subjectEl.style.borderColor = "red";
          isValid = false;
        } else {
          subjectEl.style.borderColor = "";
        }
        if (!descEl.value.trim()) {
          descEl.style.borderColor = "red";
          isValid = false;
        } else {
          descEl.style.borderColor = "";
        }

        if (!isValid) return;

        btn.disabled = true;
        btn.textContent = "Creating...";

        try {
          const payload = {
            subject: document.getElementById("csw-ticket-subject").value,
            department: document.getElementById("csw-ticket-dept").value,
            priority: document.getElementById("csw-ticket-priority").value,
            description: document.getElementById("csw-ticket-desc").value,
            sessionId: activeSessionId
          };

          const res = await fetch(`${API_BASE}/api/widget/ticket`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (!res.ok) throw new Error(data.message || "Failed to create ticket");

          // Replace the form with a compact success message
          formContainer.innerHTML = `<div style="color:#10b981;font-weight:bold;text-align:center;font-size:12px;padding:4px 0;">✅ Ticket submitted successfully!</div>`;

          // Show the rich ticket card with status link
          if (data.ticketStatusUrl && data.ticketId) {
            appendTicketCard(ui, data.ticketId, data.ticketStatusUrl, latestConfig.websiteName || "Support Bot");
          }

          handleBotResolution(ui);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Create Ticket";
          alert("Failed to create ticket. Please try again.");
        }
      };
    }
  }

  async function handleBotResolution(ui) {
    ui.quickReplies.innerHTML = "";
    appendMessage(ui, "agent", "Glad we could help 😊", null, null, latestConfig.websiteName || "Support Bot", true);
    ui.form.style.display = "none";
    ui.statusBar.textContent = "Resolved by Bot";

    await submitBotStatus("resolved", botPath, botSelections);

    // Show feedback after a small delay
    setTimeout(() => {
      ui.feedback.classList.add("show");
    }, 1500);
  }

  async function handleBotEscalation(ui, department = "general") {
    ui.quickReplies.innerHTML = "";
    appendMessage(ui, "agent", `Connecting you to the ${department} department... Please wait.`, null, null, "System", false);

    await submitBotStatus("escalated", botPath, botSelections);

    // Resume normal chat flow (show input form)
    ui.form.style.display = "flex";
    ui.statusBar.textContent = "Connecting to Agent...";

    // Re-boot to establish socket connection for live chat
    boot(ui, activePreData);
  }

  async function submitBotStatus(status, path, selections) {
    try {
      await fetch(`${API_BASE}/api/widget/bot-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ sessionId: activeSessionId, botStatus: status, path, selections })
      });
    } catch (err) {
      console.error("Bot status sync failed", err);
    }
  }

  async function boot(ui, preData) {
    if (preData) activePreData = preData;
    try {
      // 1. Fetch Branding Config
      const configRes = await fetch(`${origin}/api/widget/config?apiKey=${apiKey}`);
      const config = await configRes.json();
      latestConfig = config;

      // 2. Apply Custom Styles & Branding
      setBranding({ primary: config.primaryColor, accent: config.accentColor });

      const pos = config.position === "left" ? "left" : "right";
      ui.launcher.classList.add(pos);
      ui.panel.classList.add(pos);
      setLauncherContent(ui.launcher, config.launcherIcon);
      ui.headerTitle.textContent = config.websiteName || "Support Chat";

      // Apply Welcome Message to Pre-chat screen
      if (ui.prechat.querySelector('div')) {
        ui.prechat.querySelector('div').textContent = config.welcomeMessage || "Hello! Please introduce yourself to start a live conversation with our team.";
      }
      ui.preSubmit.textContent = "Start Conversation";

      // 3. Initialize Session
      const initRes = await fetch(`${origin}/api/widget/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          visitorToken: visitorId,
          deviceInfo: navigator.userAgent,
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

      localStorage.setItem(visitorKey, visitorId);
      localStorage.setItem(sessionKey, activeSessionId);

      // 3b. Reset UI for new session
      resetFeedbackUI(ui);
      if (!shouldShowFeedback(config)) {
        ui.feedback.classList.remove("show");
      }

      // 4. UI Transition
      const isIdentified = (data.visitor && data.visitor.name) || (data.session && data.session.visitorId && data.session.visitorId.name);
      if (isIdentified || preData) {
        ui.prechat.style.display = "none";
        ui.chatInterface.style.display = "flex";

        // Update Subtitle with Last Seen
        if (!config.isAgentOnline && config.lastActiveAt) {
          const diff = Math.floor((new Date() - new Date(config.lastActiveAt)) / 60000);
          const timeStr = diff < 1 ? "Just now" : diff < 60 ? `${diff}m ago` : `${Math.floor(diff / 60)}h ago`;
          ui.panel.querySelector("#csw-header-subtitle").textContent = `Last active: ${timeStr}`;
        }

        ui.statusBar.textContent = config.isAgentOnline ? "Online | Support Team" : "Away | Support Team";
        setupUpload(ui, apiKey);

        // 4b. Render Quick Replies
        ui.quickReplies.innerHTML = "";
      }

      // 5. Render Messages
      ui.messages.innerHTML = "";
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(ui, msg.sender === "visitor" ? "visitor" : "agent", msg.message, msg.attachmentUrl, msg.attachmentType, msg.senderName, msg.isAi, msg._id, msg.deliveredAt, msg.readAt);
        });
      }

      // 5b. Bot Flow Initialization
      // Only run the bot if botEnabled AND there is a valid flow with nodes configured
      const hasBotFlow = config.botEnabled && config.botFlow && config.botFlow.nodes && Object.keys(config.botFlow.nodes).length > 0;
      if (hasBotFlow && (!data.messages || data.messages.length === 0) && data.botStatus !== "escalated" && data.session?.status !== "closed") {
        ui.form.style.display = "none";
        renderBotNode(ui, "root");
      } else {
        // No valid bot flow or existing messages — show normal chat input
        ui.form.style.display = "flex";
        if (!data.messages || data.messages.length === 0) {
          // Show a greeting message if no history and bot isn't handling it
          const greeting = (!config.isAgentOnline)
            ? (config.awayMessage || "We're currently away. Leave a message and we'll reply soon.")
            : (config.welcomeMessage || "Hi! How can we help?");
          appendMessage(ui, "agent", greeting, null, null, config.websiteName || "Support", false);
        }
      }

      if (shouldShowFeedback(config) && data.session?.status === "closed" && !feedbackSent) {
        ui.feedback.classList.add("show");
        ui.form.style.display = "none";
      } else if (data.session?.status === "closed") {
        showNewChatButton(ui);
      } else {
        ui.feedback.classList.remove("show");
        if (!config.botEnabled || data.botStatus === "escalated" || data.messages?.length > 0) {
          ui.form.style.display = "flex";
        }
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
        console.error("ChatWidget: Connection Error:", error.message, "Target:", origin);
        ui.statusBar.textContent = "Connecting...";
      });

      socket.on("disconnect", (reason) => {
        console.warn("ChatWidget: Socket disconnected", reason);
        setStatusMessage(ui, "Reconnecting...", "#ef4444");
      });

      socket.on("connect", () => {
        console.log("ChatWidget: Socket connected to", origin, "Joining room:", activeSessionId);
        ui.statusBar.textContent = config.isAgentOnline ? "Online | Support Team" : "Away | Messaging Support";
        ui.statusBar.style.color = ""; // Reset status bar text color on success
        if (ui.chatInterface.style.display === "flex") {
          setupUpload(ui, apiKey);
        }
        // Force re-join on every connect to handle server restarts
        if (activeSessionId) {
          socket.emit("visitor:join-room", { sessionId: activeSessionId });
        }
      });

      socket.on("chat:message", (msg) => {
        console.log("ChatWidget: Received message", msg);
        try {
          // Find if this message was already locally prepended as 'Sent'
          const existing = ui.panel.querySelector(`[data-temp-id="${msg.tempId}"]`);
          if (existing) {
            existing.setAttribute('data-msg-id', msg._id);
            existing.removeAttribute('data-temp-id');
            const status = existing.querySelector('.csw-status');
            if (status) status.textContent = "Delivered";
            return;
          }

          if (msg.sender === "agent" && !msg.isAi) {
            ui.quickReplies.innerHTML = "";
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
        const item = ui.panel.querySelector(`[data-msg-id="${messageId}"]`);
        const statusEl = item?.querySelector(".csw-status");
        if (statusEl) statusEl.textContent = "Delivered";
      });

      socket.on("chat:read", () => {
        ui.panel.querySelectorAll('.csw-visitor .csw-status:not(.csw-read)').forEach(el => {
          if (el.textContent !== "Sending") {
            el.textContent = "Read";
            el.classList.add('csw-read');
          }
        });
      });

      socket.on("chat:typing", (data) => {
        if (data.sender === "agent") {
          ui.typing.textContent = data.isTyping ? "Agent is typing..." : "";
        }
      });

      socket.on("chat:queued", (data) => {
        ui.statusBar.textContent = "In Queue | All Agents Busy";
        ui.statusBar.style.color = "#f59e0b"; // Amber color
        appendMessage(ui, "agent", data.message || "All agents are currently busy. We'll be with you shortly!", null, null, "System", false);
      });

      socket.on("chat:assigned", (data) => {
        ui.statusBar.textContent = "Online | Connected to Agent";
        ui.statusBar.style.color = "var(--csw-primary)";
        appendMessage(ui, "agent", `${data.agentName || "An agent"} has joined the conversation.`, null, null, "System", false);
      });

      socket.on("chat:closed", () => {
        ui.statusBar.textContent = "Chat Session Ended";
        ui.form.style.display = "none";

        if (shouldShowFeedback(config) && !feedbackSent) {
          ui.feedback.classList.add("show");
          appendMessage(ui, "agent", "This conversation has ended. We'd love to hear your feedback!", null, null, "System", false);
        } else {
          showNewChatButton(ui);
        }
      });


      ui.closeBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to end this chat?")) {
          socket.emit("visitor:close-session", { sessionId: activeSessionId });
        }
      };

      socket.on("agent:status", (data) => {
        const subtitle = ui.panel.querySelector("#csw-header-subtitle");
        if (data.isOnline) {
          subtitle.textContent = "Active Now";
          ui.statusBar.textContent = "Online | Support Team";
        } else {
          const diff = Math.floor((new Date() - new Date(data.lastActiveAt)) / 60000);
          const timeStr = diff < 1 ? "Just now" : diff < 60 ? `${diff}m ago` : `${Math.floor(diff / 60)}h ago`;
          subtitle.textContent = `Last active: ${timeStr}`;
          ui.statusBar.textContent = "Away | Messaging Support";
        }
      });

    } catch (err) {
      ui.statusBar.textContent = "Offline | Team Unavailable";
      ui.statusBar.style.color = "#ef4444";
      console.error("Boot error", err);
    }
  }

  const ui = createUi();
  boot(ui);

  ui.preSubmit.onclick = () => {
    const name = ui.preName.value.trim();
    const email = ui.preEmail.value.trim();

    let isValid = true;
    if (!name) {
      ui.preName.style.borderColor = "red";
      isValid = false;
    } else {
      ui.preName.style.borderColor = "";
    }

    if (!email) {
      ui.preEmail.style.borderColor = "red";
      isValid = false;
    } else {
      ui.preEmail.style.borderColor = "";
    }

    if (!isValid) return;

    // If starting fresh with pre-data, we clear any previous session ID to ensure a new one is created
    // rather than resuming a potentially closed one.
    localStorage.removeItem(sessionKey);
    boot(ui, { name, email });
  };

  ui.form.onsubmit = (e) => {
    e.preventDefault();
    const message = ui.input.value.trim();
    if (!message || !socket) return;

    const tempId = `temp-${Date.now()}`;
    if (!sendVisitorMessage({ message, tempId })) {
      ui.statusBar.textContent = "Connecting... Please try again";
      return;
    }
    appendPendingVisitorMessage(ui, message, tempId);
    ui.input.value = "";
  };

  // Emoji picker functionality
  ui.emojiBtn.onclick = () => {
    ui.emojiPicker.style.display = ui.emojiPicker.style.display === 'none' ? 'block' : 'none';
  };

  ui.emojiPicker.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const emojiItem = e.target.closest('.csw-emoji-item');
    if (!emojiItem) return;

    const emoji = emojiItem.textContent.trim();
    console.log("[Emoji Picker] Clicked Emoji:", emoji);

    const input = ui.input;
    const start = input.selectionStart !== null ? input.selectionStart : input.value.length;
    const end = input.selectionEnd !== null ? input.selectionEnd : input.value.length;
    const text = input.value;

    input.value = text.substring(0, start) + emoji + text.substring(end);
    console.log("[Emoji Picker] Inserted Emoji:", emoji);
    console.log("[Emoji Picker] Message Sent: false");

    const newPos = start + emoji.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    ui.emojiPicker.style.display = 'none';
  };

  // Close emoji picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!ui.emojiBtn.contains(e.target) && !ui.emojiPicker.contains(e.target)) {
      ui.emojiPicker.style.display = 'none';
    }
  });

  // Event Delegation for Feedback (crucial for reconstructed UI)
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
})();
