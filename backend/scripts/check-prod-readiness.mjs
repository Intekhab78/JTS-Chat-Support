import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath, "utf8"));
}

const backendEnv = parseEnvFile(path.join(backendRoot, ".env"));
const prodDashboardEnv = parseEnvFile(path.join(repoRoot, "dashboard", ".env.production"));

const blockers = [];
const warnings = [];
const ok = [];

const checkRequired = (obj, key, label) => {
  const val = (obj[key] || "").trim();
  if (!val) {
    blockers.push(`${label}: ${key} is missing`);
  } else {
    ok.push(`${label}: ${key} is set`);
  }
};

checkRequired(backendEnv, "MONGODB_URI", "Backend");
checkRequired(backendEnv, "JWT_SECRET", "Backend");

if (backendEnv.JWT_SECRET && (backendEnv.JWT_SECRET === "change-me" || backendEnv.JWT_SECRET.length < 32)) {
  blockers.push("Backend: JWT_SECRET is weak or still set to 'change-me' (use >= 32 random chars in production)");
}

if (backendEnv.NODE_ENV !== "production") {
  warnings.push(`Backend: NODE_ENV is '${backendEnv.NODE_ENV || "unset"}' (set NODE_ENV=production on live server)`);
}

if (backendEnv.ENABLE_MOCK_BILLING === "true") {
  warnings.push("Backend: ENABLE_MOCK_BILLING=true (disable in production)");
}

if (!backendEnv.CLIENT_URL || backendEnv.CLIENT_URL.includes("localhost")) {
  warnings.push(`Backend: CLIENT_URL is '${backendEnv.CLIENT_URL || "unset"}' (point to live dashboard URL)`);
}

if (!backendEnv.RAZORPAY_KEY_ID && !backendEnv.STRIPE_SECRET_KEY) {
  warnings.push("Backend: Neither RAZORPAY_KEY_ID nor STRIPE_SECRET_KEY is configured");
}

if (!backendEnv.SMTP_HOST || !backendEnv.SMTP_USER) {
  warnings.push("Backend: SMTP_HOST / SMTP_USER not configured (email notifications/reset links disabled)");
}

if (!prodDashboardEnv.VITE_REMOTE_API_URL) {
  blockers.push("Dashboard (.env.production): VITE_REMOTE_API_URL is missing");
} else {
  ok.push(`Dashboard (.env.production): VITE_REMOTE_API_URL=${prodDashboardEnv.VITE_REMOTE_API_URL}`);
}

console.log("=== Production Preflight Summary ===");
console.log(`OK (${ok.length}):`);
for (const item of ok) console.log(`  [OK] ${item}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}) — update before going live:`);
  for (const item of warnings) console.log(`  [WARN] ${item}`);
}

if (blockers.length) {
  console.log(`\nBlockers (${blockers.length}):`);
  for (const item of blockers) console.log(`  [BLOCKER] ${item}`);
}
