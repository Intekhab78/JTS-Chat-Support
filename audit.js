const fs = require('fs');
const glob = require('glob');
const path = require('path');

const replacements = [
  { from: /Knowledge Base/g, to: "Help Center" },
  { from: /KnowledgeBase/g, to: "HelpCenter" },
  { from: /knowledgeBase/g, to: "helpCenter" },
  { from: /Generate Service Request/g, to: "Request a Service" },
  { from: /Initiate Customer Engagement/g, to: "Start Chat" },
  { from: /Validation Failed/g, to: "Please check the highlighted fields and try again." },
  { from: /Operation Successful/g, to: "Your changes have been saved successfully." },
  // Empty states replacements (case-insensitive where needed, but let's be careful)
  { from: />No records found</g, to: "><EmptyState /></" }, // We will manually handle EmptyState import if needed
  { from: /No records found/g, to: "You don't have any records yet. Create your first item to get started." },
  { from: /No matching items found/g, to: "You don't have any records yet. Create your first item to get started." },
  { from: /No data available/g, to: "You don't have any records yet. Create your first item to get started." }
];

const dashboardFiles = glob.sync('dashboard/src/**/*.jsx');
const chatWidgetFiles = glob.sync('chat-widget/src/**/*.js');

const allFiles = [...dashboardFiles, ...chatWidgetFiles];

let changedCount = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  replacements.forEach(rep => {
    newContent = newContent.replace(rep.from, rep.to);
  });

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
    changedCount++;
  }
});

console.log(`Total files updated: ${changedCount}`);
