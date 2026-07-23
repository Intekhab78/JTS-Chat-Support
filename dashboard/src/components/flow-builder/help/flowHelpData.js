/**
 * Complete Production-Ready In-App Documentation, FAQ (50 Items), Node Guides & Best Practices
 */

export const NODE_DOCUMENTATION = [
  {
    type: "message",
    title: "Message Node (Text & Quick Replies)",
    purpose: "Sends text responses to website visitors and optionally presents action buttons for navigation.",
    bestPractices: "Keep message text concise (under 200 characters). Use quick-reply buttons to guide visitors smoothly.",
    commonMistakes: "Leaving button target node links blank causes broken link validation errors.",
    example: "Welcome! 👋 How can we help your team today?"
  },
  {
    type: "button_group",
    title: "Button Group Node (Menu Choices)",
    purpose: "Presents a decision menu with multiple choices routing to distinct branches.",
    bestPractices: "Limit choices to 3-4 options per menu to prevent decision fatigue.",
    commonMistakes: "Creating multiple options with identical labels.",
    example: "Choose Topic: [Technical Support] [Billing] [Sales]"
  },
  {
    type: "form",
    title: "Form Collection Node",
    purpose: "Collects structured visitor inputs such as Name, Email, Phone Number, or Dropdown selections.",
    bestPractices: "Ask only for required fields. Mark non-critical inputs as optional.",
    commonMistakes: "Forgetting to set the 'After Submit Go To' next node target.",
    example: "Collect Full Name, Work Email, and Company Size."
  },
  {
    type: "action",
    title: "Action Execution Node",
    purpose: "Executes automated backend operations like escalating chat to a live support department or creating CRM leads.",
    bestPractices: "Always configure a next transition node to inform the visitor after action execution.",
    commonMistakes: "Leaving department target empty when using 'Escalate to Live Agent'.",
    example: "Escalate chat session to 'Technical Support' department."
  },
  {
    type: "condition",
    title: "Condition (IF / THEN Logic) Node",
    purpose: "Evaluates business logic rules (e.g. IF Live Agents Online or Business Hours Open).",
    bestPractices: "Configure both IF TRUE and ELSE (False) paths to avoid dead ends.",
    commonMistakes: "Leaving the ELSE false branch unlinked.",
    example: "IF Agents are Online ➔ Connect Agent, ELSE ➔ Offline Ticket Form."
  },
  {
    type: "delay",
    title: "Delay Timer Node",
    purpose: "Pauses flow execution for a specified number of seconds to simulate natural typing speed.",
    bestPractices: "Use 2-5 second delays for realistic bot behavior.",
    commonMistakes: "Setting excessively long delays (>30s) causing visitor drop-offs.",
    example: "Wait 3 seconds before sending follow-up message."
  },
  {
    type: "webhook",
    title: "Webhook / REST API Node",
    purpose: "Sends external HTTP POST/GET requests to third-party endpoints or webhooks.",
    bestPractices: "Test endpoint URLs in the Flow Debugger before publishing.",
    commonMistakes: "Entering malformed HTTP URLs without https:// protocol.",
    example: "POST https://api.crm.com/leads"
  },
  {
    type: "ai_response",
    title: "AI Smart Agent Node",
    purpose: "Generates dynamic AI responses using LLMs and trained Knowledge Base documentation.",
    bestPractices: "Write clear prompt instructions defining tone and boundaries.",
    commonMistakes: "Not providing fallback escalation when AI is uncertain.",
    example: "Answer visitor questions politely using company documentation."
  }
];

export const FAQ_ITEMS = [
  { q: "How do I create my first chatbot flow?", a: "Start at the mandatory 'root' node. Edit its message, add button options, and connect them to new target nodes using the Inspector panel or drag handles." },
  { q: "How do I connect two nodes on the canvas?", a: "Drag from the right connection handle (blue circle) of a source node to the left handle of the target node." },
  { q: "How do I rename a Node ID?", a: "Select the node, click the pencil edit icon next to its name in the Inspector panel header, type a new ID, and press Enter. All connection references update automatically." },
  { q: "How do I publish my flow to my live website widget?", a: "Ensure the top bar status badge reads 'Published', check that the Flow Health indicator is green ('Flow Healthy'), and click 'Save Flow'." },
  { q: "Can I save my flow as a Draft while fixing errors?", a: "Yes! Switch the top bar badge to 'Draft Mode' and click 'Save Flow'. Drafts allow saving work-in-progress flows even with validation warnings." },
  { q: "How do I undo an accidental edit or node deletion?", a: "Press Ctrl+Z or click the Undo button in the top toolbar." },
  { q: "How do I redo an undone change?", a: "Press Ctrl+Y (or Ctrl+Shift+Z) or click the Redo button in the top toolbar." },
  { q: "How do I restore an older version of my flow?", a: "Click the History icon in the top toolbar to open the Version History modal, then click 'Restore' next to any saved snapshot timestamp." },
  { q: "How do I test my flow before publishing?", a: "Click 'Test Simulator' in the top toolbar to open the live interactive chatbot testing window." },
  { q: "What does the red badge on a node mean?", a: "A red border or badge indicates a validation error (such as a broken target link or missing required field). Click the health shield to inspect details." },
  { q: "What does an amber dot on a node mean?", a: "An amber dot indicates a validation warning or moderate visitor drop-off rate (15%-30%)." },
  { q: "What does a green dot on a node mean?", a: "A green dot indicates a healthy high-completion path with less than 15% visitor drop-off." },
  { q: "How do I auto-arrange my messy flow canvas?", a: "Click the 'Auto Layout' button in the top toolbar to automatically organize nodes into a clean left-to-right hierarchy using Dagre layout." },
  { q: "How do I export a JSON backup of my flow?", a: "Click the Download icon in the top right of the toolbar to save a JSON file to your computer." },
  { q: "How do I import a JSON flow file?", a: "Click the Upload icon in the top right of the toolbar and select your valid JSON flow file." },
  { q: "How do I copy and paste a node?", a: "Select a node and press Ctrl+C to copy, then press Ctrl+V to paste a duplicate onto the canvas." },
  { q: "How do I duplicate a node with one click?", a: "Click the Copy icon in the header of any node card." },
  { q: "How do I delete a node safely?", a: "Click the Trash icon on the node card or in the Inspector header. A confirmation dialog will highlight all affected connections before deletion." },
  { q: "Can I delete the 'root' start node?", a: "No. The 'root' node is mandatory as every chatbot flow begins there." },
  { q: "How do I add a Form to collect lead information?", a: "Add a 'Form Collection' node, define inputs (Name, Email, Dropdown), and set the 'After Submit Go To' target node." },
  { q: "How do I escalate a conversation to a live agent?", a: "Add an 'Action Execution' node, select 'Escalate to Live Agent', and specify the target department (e.g. Sales, Technical Support)." },
  { q: "How do I check if agents are online before connecting?", a: "Add a 'Condition (IF/THEN)' node, select 'IF Live Agents Online', and link the TRUE path to Escalate and FALSE path to an offline email form." },
  { q: "How do I pause between messages?", a: "Add a 'Delay Timer' node and set the delay seconds (e.g. 3 seconds)." },
  { q: "How do I trigger an external REST API?", a: "Add a 'Webhook / REST API' node, enter the endpoint URL, select HTTP method (POST/GET), and set the next node transition." },
  { q: "How do I configure AI automated answers?", a: "Add an 'AI Smart Agent' node, select the AI model, and enter prompt guidelines for answering visitor questions." },
  { q: "How do I search for a specific node in a large flow?", a: "Use the search bar at the top of the left sidebar to filter nodes by ID, type, or message content." },
  { q: "How do I right-click quick add nodes?", a: "Right-click anywhere on the canvas grid to open the Quick Add context menu." },
  { q: "How do I zoom in and out of the canvas?", a: "Use the mouse scroll wheel or the +/- buttons on the bottom-left canvas controls panel." },
  { q: "What is the Mini Map for?", a: "The Mini Map in the bottom-right corner provides an overview of your entire graph layout. Drag inside it to pan quickly." },
  { q: "What causes a 'Broken Link' error?", a: "A button or transition pointing to a node ID that has been deleted or does not exist." },
  { q: "What is an 'Orphan Node' warning?", a: "A node that exists on the canvas but is not connected to any path originating from the root start node." },
  { q: "What is a 'Dead End' warning?", a: "A node with no outgoing buttons or next transition that is not marked as an End or Solution node." },
  { q: "What is a 'Circular Reference' warning?", a: "A loop where nodes point back to each other without an exit path." },
  { q: "How do I open the Flow Debugger?", a: "Click the Bug icon in the top toolbar to open the Dry Run Execution Trace console." },
  { q: "How do I load pre-built flow templates?", a: "Click the Template icon in the top toolbar to browse ready-made templates like Lead Generation or Support Triage." },
  { q: "Where are visitor analytics recorded?", a: "Visits, drop-offs, and completion rates update automatically in real time under the Inspector's Analytics tab." },
  { q: "Can I customize the primary color of the chatbot widget?", a: "Yes, primary and accent widget colors are configured under Website Settings." },
  { q: "How do I handle offline business hours?", a: "Use a Condition node set to 'IF Business Hours Open' to route visitors to offline forms outside operational hours." },
  { q: "What happens if a visitor closes the chat widget?", a: "The session records a drop-off at the visitor's current node step for analytics tracking." },
  { q: "How do I create drop-down options in a Form?", a: "Add a Form field, select type 'Dropdown Select', and enter choices separated by commas." },
  { q: "Is there a limit on how many nodes I can add?", a: "No. The canvas supports 200+ nodes with high-performance viewport rendering." },
  { q: "How do I open the Diagnostic Health Report?", a: "Click the 'Flow Healthy' or 'Errors' shield badge in the top toolbar." },
  { q: "What is the keyboard shortcut for Save Flow?", a: "Press Ctrl+S." },
  { q: "What is the keyboard shortcut for Copy Node?", a: "Select a node and press Ctrl+C." },
  { q: "What is the keyboard shortcut for Paste Node?", a: "Press Ctrl+V." },
  { q: "How do I mark a node as a Solution?", a: "Check 'Mark as Solution' in the Inspector panel so the chat widget shows 'Close Chat' or 'Talk to Agent'." },
  { q: "Can I import a flow from another website?", a: "Yes! Export JSON from Website A, then Import JSON into Website B." },
  { q: "Where can I report bugs or submit feature requests?", a: "Click the Help icon in the toolbar and select 'Contact Support / Report Bug'." },
  { q: "What browsers are supported by the Flow Builder?", a: "All modern browsers including Google Chrome, Microsoft Edge, Mozilla Firefox, and Apple Safari." },
  { q: "Does saving a flow affect active ongoing visitor chats?", a: "No. Active chats complete on their initialized revision; new visitors receive the published flow immediately." }
];
