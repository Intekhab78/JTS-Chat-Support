const fs = require('fs');
const path = require('path');

const targetFile = 'chat-widget/src/main.js';
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize CRLF to LF for reliable replacements
content = content.replace(/\r\n/g, '\n');

// 1. Add showNewChatButton and handleStartNewChat helper functions below resetFeedbackUI
const resetFeedbackUIBlock = `  function resetFeedbackUI(ui) {
    ui.feedback.innerHTML = \`
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
    \`;
    ui.feedback.dataset.rating = "0";
    ui.feedback.classList.remove("show");
  }`;

const helperReplacement = `${resetFeedbackUIBlock}

  function showNewChatButton(ui) {
    ui.statusBar.textContent = "Conversation Closed";
    ui.feedback.innerHTML = \`
      <button class="csw-new-chat-btn" type="button">Start New Chat</button>
    \`;
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
  }`;

if (!content.includes(resetFeedbackUIBlock)) {
  console.error("❌ ERROR: resetFeedbackUIBlock pattern not found!");
} else {
  content = content.replace(resetFeedbackUIBlock, helperReplacement);
}

// 2. Update boot() status closed check
const bootClosedBlock = `      if (shouldShowFeedback(config) && data.session?.status === "closed" && !feedbackSent) {
        ui.feedback.classList.add("show");
        ui.form.style.display = "none";
      } else {
        ui.feedback.classList.remove("show");
        if (!config.botEnabled || data.botStatus === "escalated" || data.messages?.length > 0) {
          ui.form.style.display = "flex";
        }
      }`;

const bootClosedReplacement = `      if (shouldShowFeedback(config) && data.session?.status === "closed" && !feedbackSent) {
        ui.feedback.classList.add("show");
        ui.form.style.display = "none";
      } else if (data.session?.status === "closed") {
        showNewChatButton(ui);
      } else {
        ui.feedback.classList.remove("show");
        if (!config.botEnabled || data.botStatus === "escalated" || data.messages?.length > 0) {
          ui.form.style.display = "flex";
        }
      }`;

if (!content.includes(bootClosedBlock)) {
  console.error("❌ ERROR: bootClosedBlock pattern not found!");
} else {
  content = content.replace(bootClosedBlock, bootClosedReplacement);
}

// 3. Update chat:closed socket listener
const socketClosedBlock = `      socket.on("chat:closed", () => {
        ui.statusBar.textContent = "Chat Session Ended";
        ui.form.style.display = "none";

        if (shouldShowFeedback(config) && !feedbackSent) {
          ui.feedback.classList.add("show");
          appendMessage(ui, "agent", "This conversation has ended. We'd love to hear your feedback!", null, null, "System", false);
        } else {
          // If already sent, we can clear immediately or show 'thanks'
          ui.statusBar.textContent = "Conversation Closed";
        }
      });`;

const socketClosedReplacement = `      socket.on("chat:closed", () => {
        ui.statusBar.textContent = "Chat Session Ended";
        ui.form.style.display = "none";

        if (shouldShowFeedback(config) && !feedbackSent) {
          ui.feedback.classList.add("show");
          appendMessage(ui, "agent", "This conversation has ended. We'd love to hear your feedback!", null, null, "System", false);
        } else {
          showNewChatButton(ui);
        }
      });`;

if (!content.includes(socketClosedBlock)) {
  console.error("❌ ERROR: socketClosedBlock pattern not found!");
} else {
  content = content.replace(socketClosedBlock, socketClosedReplacement);
}

// 4. Update click delegation to support .csw-new-chat-btn
const delegationBlock = `  // Event Delegation for Feedback (crucial for reconstructed UI)
  ui.panel.addEventListener("click", (e) => {
    if (e.target.classList.contains("csw-star")) {`;

const delegationReplacement = `  // Event Delegation for Feedback (crucial for reconstructed UI)
  ui.panel.addEventListener("click", (e) => {
    if (e.target.classList.contains("csw-new-chat-btn")) {
      handleStartNewChat(ui);
      return;
    }

    if (e.target.classList.contains("csw-star")) {`;

if (!content.includes(delegationBlock)) {
  console.error("❌ ERROR: delegationBlock pattern not found!");
} else {
  content = content.replace(delegationBlock, delegationReplacement);
}

// Restore CRLF line endings for Windows environment
const finalContent = content.replace(/\n/g, '\r\n');
fs.writeFileSync(targetFile, finalContent, 'utf8');
console.log('✅ chat-widget/src/main.js successfully updated and verified');
