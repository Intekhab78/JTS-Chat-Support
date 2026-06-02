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
  let visitorId = localStorage.getItem(visitorKey) || "";
  let activeSessionId = localStorage.getItem(sessionKey) || "";
  let socket;
  let latestConfig = null;
  let currentBotNode = "root";
  let botPath = [];
  let botSelections = {};
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
    return !config?.showOfflineForm;
  }

  function showOfflineSubmissionSuccess(ui) {
    ui.feedback.classList.remove("show");
    ui.prechat.replaceChildren();
    const message = document.createElement("div");
    message.style.fontSize = "14px";
    message.style.color = "var(--csw-text-muted)";
    message.style.lineHeight = "1.6";
    message.textContent = "Your message has been submitted. Our team will follow up by email.";
    ui.prechat.appendChild(message);
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
        <button id="csw-close-chat" title="End Chat">&times;</button>
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
        <div class="csw-prechat-field" id="csw-pre-message-field" style="display:none">
          <label class="csw-prechat-label">Your Message</label>
          <textarea class="csw-prechat-input" id="csw-pre-message" placeholder="Describe your issue or question..." rows="3" style="resize:none; min-height:80px;"></textarea>
        </div>
        <button class="csw-prechat-submit" id="csw-pre-submit">Start Conversation</button>
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
        <div id="csw-emoji-picker" style="display:none; position:absolute; bottom:60px; right:10px; background:white; border:1px solid #ccc; border-radius:8px; padding:8px; max-width:200px; z-index:1000;">
          <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:4px;">
            😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    launcher.onclick = () => panel.classList.toggle("open");

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
      preMessage: panel.querySelector("#csw-pre-message"),
      preMessageField: panel.querySelector("#csw-pre-message-field"),
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

  function hasHumanAgentReply(messages = []) {
    return messages.some((msg) => {
      if (msg.sender !== "agent" || msg.isAi) return false;
      const senderName = String(msg.senderName || "").trim().toLowerCase();
      const websiteName = String(latestConfig?.websiteName || "").trim().toLowerCase();
      return senderName !== "system" && senderName !== websiteName;
    });
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
          ui.statusBar.textContent = "Start New Conversation";
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
    if (!latestConfig?.botFlow || !latestConfig.botFlow.nodes) return;
    const node = latestConfig.botFlow.nodes[nodeKey];
    if (!node) return;

    currentBotNode = nodeKey;

    // Append bot message
    appendMessage(ui, "agent", node.message, null, null, latestConfig.websiteName || "Support Bot", true);

    // Clear previous quick replies
    ui.quickReplies.innerHTML = "";

    if (node.isSolution) {
      // Step 5: Final Decision Buttons
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
    } else if (node.options) {
      node.options.forEach((opt, idx) => {
        const pill = document.createElement("button");
        pill.className = "csw-qr-pill";
        pill.textContent = opt.text;
        pill.style.animationDelay = `${idx * 0.1}s`;
        pill.onclick = () => {
          appendMessage(ui, "visitor", opt.text, null, null, "You", false);
          botPath.push(opt.text);
          botSelections[nodeKey] = opt.text;
          renderBotNode(ui, opt.next);

          // Sync with backend
          submitBotStatus("in_progress", botPath, botSelections);
        };
        ui.quickReplies.appendChild(pill);
      });
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

  async function handleBotEscalation(ui) {
    ui.quickReplies.innerHTML = "";
    appendMessage(ui, "agent", "Connecting you to an agent... Please wait.", null, null, "System", false);

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
        ui.prechat.querySelector('div').textContent = config.showOfflineForm
          ? (config.awayMessage || "We're currently offline. Leave your details and we will get back to you.")
          : (config.welcomeMessage || "Hello! Please introduce yourself to start a live conversation with our team.");
      }
      ui.preSubmit.textContent = config.showOfflineForm ? "Leave a Message" : "Start Conversation";
      // Show message textarea only in offline mode
      if (ui.preMessageField) {
        ui.preMessageField.style.display = config.showOfflineForm ? "block" : "none";
      }

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

        ui.statusBar.textContent = config.showOfflineForm
          ? "Offline | Message Form"
          : (config.isAgentOnline ? "Online | Support Team" : "Away | Leaving a Message");
        if (!config.showOfflineForm) {
          setupUpload(ui, apiKey);
        }

        // 4b. Render Quick Replies
        ui.quickReplies.innerHTML = "";
        const shouldShowQuickReplies = !hasHumanAgentReply(data.messages);
        if (shouldShowQuickReplies && config.quickReplies && config.quickReplies.length > 0) {
          config.quickReplies.forEach((qr, idx) => {
            const pill = document.createElement("button");
            pill.className = "csw-qr-pill";
            pill.textContent = qr.text;
            pill.style.animationDelay = `${idx * 0.1}s`;
            pill.onclick = () => {
              const tempId = `temp-${Date.now()}`;
              if (!sendVisitorMessage({ message: qr.text, tempId })) {
                ui.statusBar.textContent = "Connecting... Please try again";
                return;
              }
              appendPendingVisitorMessage(ui, qr.text, tempId);
              ui.quickReplies.innerHTML = ""; // Clear after use to keep chat clean
            };
            ui.quickReplies.appendChild(pill);
          });
        }
      }

      // 5. Render Messages
      ui.messages.innerHTML = "";
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(ui, msg.sender === "visitor" ? "visitor" : "agent", msg.message, msg.attachmentUrl, msg.attachmentType, msg.senderName, msg.isAi, msg._id, msg.deliveredAt, msg.readAt);
        });
      } else {
        // Show Welcome or Away Message from Config
        const greeting = (!config.isAgentOnline) ? (config.awayMessage || "We're currently away. Please leave a message!") :
          (data.session?.status === 'queued') ? (config.awayMessage || "All agents are busy. We'll be with you shortly!") :
            (config.welcomeMessage || "Hi! How can we help?");
        appendMessage(ui, "agent", greeting, null, null, config.websiteName, false);
      }

      // 5b. Bot Flow Initialization
      if (config.botEnabled && (!data.messages || data.messages.length === 0) && data.botStatus !== "escalated" && data.session?.status !== "closed") {
        ui.form.style.display = "none";
        renderBotNode(ui, "root");
      } else if (data.botStatus === "escalated" || data.messages?.length > 0) {
        ui.form.style.display = "flex";
      }

      if (shouldShowFeedback(config) && data.session?.status === "closed" && !feedbackSent) {
        ui.feedback.classList.add("show");
        ui.form.style.display = "none";
      } else {
        ui.feedback.classList.remove("show");
        if (!config.botEnabled || data.botStatus === "escalated" || data.messages?.length > 0) {
          ui.form.style.display = "flex";
        }
      }

      if (config.showOfflineForm) {
        ui.form.style.display = "none";
        return;
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
        setStatusMessage(ui, "Reconnecting...", "orange");
      });

      socket.on("connect", () => {
        console.log("ChatWidget: Socket connected to", origin, "Joining room:", activeSessionId);
        ui.statusBar.textContent = config.isAgentOnline ? "Online | Support Team" : "Away | Messaging Support";
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
          // If already sent, we can clear immediately or show 'thanks'
          ui.statusBar.textContent = "Conversation Closed";
        }
      });

      socket.on("disconnect", (reason) => {
        console.warn("ChatWidget: Socket disconnected:", reason);
        ui.statusBar.textContent = "Reconnecting...";
        ui.statusBar.style.color = "#ef4444";
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
    if (!name || !email) return;

    if (latestConfig?.showOfflineForm) {
      fetch(`${origin}/api/widget/offline-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          sessionId: activeSessionId,
          visitorId,
          name,
          email,
          message: (ui.preMessage?.value?.trim()) || (latestConfig.awayMessage || "Offline support request")
        })
      })
        .then((res) => res.json())
        .then(() => {
          ui.statusBar.textContent = "Offline | Message sent";
          showOfflineSubmissionSuccess(ui);
        })
        .catch((err) => {
          ui.statusBar.textContent = "Offline | Submit failed";
          console.error("Offline form error", err);
        });
      return;
    }

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
    if (e.target.textContent && e.target.textContent !== ' ') {
      ui.input.value += e.target.textContent;
      ui.input.focus();
      ui.emojiPicker.style.display = 'none';
    }
  };

  // Close emoji picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!ui.emojiBtn.contains(e.target) && !ui.emojiPicker.contains(e.target)) {
      ui.emojiPicker.style.display = 'none';
    }
  });

  // Event Delegation for Feedback (crucial for reconstructed UI)
  ui.panel.addEventListener("click", (e) => {
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
