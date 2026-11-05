import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const TARGET_DIRS = [
  path.join(rootDir, "backend", "src"),
  path.join(rootDir, "dashboard", "src"),
  path.join(rootDir, "chat-widget", "src")
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "uploads", "backups", "public"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let issues = 0;
let checked = 0;

for (const dir of TARGET_DIRS) {
  for (const file of walk(dir)) {
    checked++;
    const content = fs.readFileSync(file, "utf8");

    // Check for unresolved git merge conflict markers
    if (/^(<{7}|={7}|>{7})(\s|$)/m.test(content)) {
      console.error(`[static-check] Merge conflict marker found in ${path.relative(rootDir, file)}`);
      issues++;
    }

    // Verify relative imports resolve on disk
    const importRegex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const rel = match[1];
      const baseResolved = path.resolve(path.dirname(file), rel);
      const candidates = [
        baseResolved,
        `${baseResolved}.js`,
        `${baseResolved}.jsx`,
        `${baseResolved}.mjs`,
        `${baseResolved}.css`,
        path.join(baseResolved, "index.js"),
        path.join(baseResolved, "index.jsx")
      ];
      if (!candidates.some((c) => fs.existsSync(c))) {
        console.error(`[static-check] Unresolved relative import "${rel}" in ${path.relative(rootDir, file)}`);
        issues++;
      }
    }
  }
}

if (issues > 0) {
  console.error(`[static-check] Failed with ${issues} issue(s) across ${checked} files.`);
  process.exit(1);
}

console.log(`[static-check] Passed (${checked} source files verified).`);

