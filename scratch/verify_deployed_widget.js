import fs from 'fs';
const content = fs.readFileSync('backend/src/public/chat-widget.js', 'utf8');
console.log('Includes csw-new-chat-btn:', content.includes('csw-new-chat-btn'));
console.log('Length of file:', content.length);
