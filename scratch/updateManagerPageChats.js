const fs = require('fs');

const targetFile = 'dashboard/src/pages/ManagerPage.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add imports to ManagerPage.jsx
content = content.replace(
  `import React, { useState, useEffect } from "react";`,
  `import React, { useState, useEffect } from "react";
import ConversationHub from "../components/ConversationHub.jsx";
import { useSocket } from "../context/SocketContext.jsx";`
);

// 2. Retrieve socket inside ManagerPage component
content = content.replace(
  `  const { user } = useAuth();`,
  `  const { user } = useAuth();
  const socket = useSocket();`
);

// 3. Inject Chats menu item
content = content.replace(
  `  const menuItems = [
    { label: "Overview", href: "/manager" },
  ];`,
  `  const menuItems = [
    { label: "Overview", href: "/manager" },
    { label: "Chats", href: "/manager?tab=chats" },
  ];`
);

// 4. Render ConversationHub when tab === "chats"
const crmTabString = `  /* ── CRM Tab ── */
  if (tab === "crm") {`;

const chatHubReplacement = `  /* ── Chats Tab ── */
  if (tab === "chats") {
    return (
      <Layout
        menuItems={menuItems}
        title="Conversation Hub"
        subtitle="Manage and oversee real-time agent interactions"
      >
        <ConversationHub socket={socket} initialSessions={sessions} websiteId={selectedWebsiteId} currentUser={user} />
      </Layout>
    );
  }

  /* ── CRM Tab ── */
  if (tab === "crm") {`;

content = content.replace(crmTabString, chatHubReplacement);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ ManagerPage.jsx updated with Chats/ConversationHub support');
