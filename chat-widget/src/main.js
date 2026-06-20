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

    const emojiGrid = panel.querySelector("#csw-emoji-grid");
    const emojis = "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾".split(" ");
    emojis.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.className = "csw-emoji-item";
      btn.type = "button";
      btn.textContent = emoji;
      emojiGrid.appendChild(btn);
    });

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
      ui.statusBar.textContent = "Connected";

      if (node.next) {
        renderBotNode(ui, node.next);
      } else {
        handleBotResolution(ui);
      }
    } catch (err) {
      console.error("Action execution failed", err);
      ui.statusBar.textContent = "Action Failed";
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

          formContainer.innerHTML = `<div style="color:#10b981;font-weight:bold;text-align:center;font-size:12px;">✅ Ticket ${data.ticketId} created! You will be notified via email on updates.</div>`;
          handleBotResolution(ui);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Create Ticket";
          alert("Failed to create ticket.");
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
      } else {
        // Show Welcome or Away Message from Config ONLY if Bot is disabled
        if (!config.botEnabled) {
          const greeting = (!config.isAgentOnline) ? (config.awayMessage || "We're currently away.") :
            (data.session?.status === 'queued') ? (config.awayMessage || "All agents are busy. We'll be with you shortly!") :
              (config.welcomeMessage || "Hi! How can we help?");
          appendMessage(ui, "agent", greeting, null, null, config.websiteName, false);
        }
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
          // If already sent, we can clear immediately or show 'thanks'
          ui.statusBar.textContent = "Conversation Closed";
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
