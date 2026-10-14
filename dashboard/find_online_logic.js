import fs from 'fs';
import path from 'path';

function searchInDir(dir, term) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') searchInDir(full, term);
    } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(term.toLowerCase())) {
        console.log(`[${term}] in ${full}`);
      }
    }
  }
}

searchInDir(path.resolve('../dashboard/src'), 'isOnline');
searchInDir(path.resolve('../backend/src'), 'visitor_status');
searchInDir(path.resolve('../backend/src'), 'visitor:status');
searchInDir(path.resolve('../backend/src'), 'isOnline');
