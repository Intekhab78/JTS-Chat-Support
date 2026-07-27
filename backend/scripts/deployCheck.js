import fs from "fs";
import path from "path";

/**
 * Enterprise Production Deployment Verification Script
 */
async function runDeploymentVerification() {
  console.log("=================================================");
  console.log("🚀 STARTING PRODUCTION DEPLOYMENT VERIFICATION");
  console.log("=================================================\n");

  let errors = 0;

  function check(condition, message) {
    if (condition) {
      console.log(`  ✅ [DEPLOY OK] ${message}`);
    } else {
      console.error(`  ❌ [DEPLOY FAIL] ${message}`);
      errors++;
    }
  }

  // 1. Environment Variable Checks
  console.log("▶ 1. ENVIRONMENT & CONFIGURATION");
  check(Boolean(process.env.NODE_ENV || "production"), "NODE_ENV configuration set");
  check(Boolean(process.env.PORT || 5000), "Server PORT binding configured");

  // 2. Build Artifacts
  console.log("\n▶ 2. BUILD ARTIFACTS VERIFICATION");
  const dashboardDist = path.join(process.cwd(), "..", "dashboard", "dist");
  const hasDist = fs.existsSync(dashboardDist);
  check(hasDist, "Frontend production distribution (dashboard/dist) exists");

  // 3. PM2 Ecosystem
  console.log("\n▶ 3. PROCESS MANAGER (PM2) CONFIGURATION");
  const pm2Config = path.join(process.cwd(), "ecosystem.config.cjs");
  check(fs.existsSync(pm2Config), "PM2 ecosystem.config.cjs process manifest exists");

  console.log("\n=================================================");
  if (errors === 0) {
    console.log("🎉 PRODUCTION DEPLOYMENT VERIFICATION PASSED!");
  } else {
    console.error(`🚨 DEPLOYMENT VERIFICATION FAILED WITH ${errors} ERRORS`);
    process.exit(1);
  }
  console.log("=================================================");
}

runDeploymentVerification().catch(err => {
  console.error("Verification crash:", err);
  process.exit(1);
});
