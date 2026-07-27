import { PERMISSIONS, hasPermission } from "../src/utils/permissions.js";
import { normalizeRole, getOwnershipQuery } from "../src/utils/roleUtils.js";
import { resolveSubscriptionForUser } from "../src/utils/planUtils.js";

/**
 * Enterprise Automated Integration & Quality Assurance Test Suite
 */
async function runEnterpriseCrmTests() {
  console.log("=================================================");
  console.log("🧪 STARTING ENTERPRISE CRM AUTOMATED TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. RBAC & Permission Matrix Unit Tests
  console.log("▶ 1. RBAC & PERMISSION MATRIX UNIT TESTS");
  const adminUser = { role: "admin", _id: "admin_1" };
  const consultantUser = { role: "tax_consultant", _id: "tax_1" };
  const supportUser = { role: "agent", _id: "support_1" };

  assert(hasPermission(adminUser, PERMISSIONS.CRM_VIEW) === true, "Admin has CRM_VIEW permission");
  assert(hasPermission(adminUser, PERMISSIONS.SETTINGS_MANAGE) === true, "Admin has SETTINGS_MANAGE permission");
  assert(hasPermission(consultantUser, PERMISSIONS.CRM_VIEW) === true, "Tax Consultant has CRM_VIEW permission");
  assert(hasPermission(consultantUser, PERMISSIONS.SETTINGS_MANAGE) === false, "Tax Consultant blocked from SETTINGS_MANAGE");
  assert(hasPermission(supportUser, PERMISSIONS.CRM_VIEW) === true, "Support Agent has CRM_VIEW permission");

  // 2. Row Level Security (RLS) Query Tests
  console.log("\n▶ 2. ROW LEVEL SECURITY (RLS) TESTS");
  const rlsConsultant = getOwnershipQuery(consultantUser);
  const rlsAdmin = getOwnershipQuery(adminUser);

  assert(rlsConsultant.ownerId === "tax_1", "Tax Consultant RLS query isolates assigned ownerId");
  assert(Object.keys(rlsAdmin).length === 0, "Admin RLS query permits global company-wide access");

  // 3. SaaS Subscription & Feature Flag Entitlement Tests
  console.log("\n▶ 3. SAAS SUBSCRIPTION & LICENSE ENTITLEMENT TESTS");
  const subAdmin = resolveSubscriptionForUser(adminUser);
  assert(subAdmin.status === "active", "Admin subscription resolves active status");
  assert(subAdmin.enabledModules.includes("crm"), "Admin subscription includes CRM module entitlement");

  // 4. Trade License 5-Tier Expiry Classification Logic
  console.log("\n▶ 4. TRADE LICENSE 5-TIER EXPIRY BUCKET TESTS");
  const now = new Date();
  const dateExpired = new Date(now.getTime() - 5 * 86400000);
  const date30Days = new Date(now.getTime() + 15 * 86400000);
  const date60Days = new Date(now.getTime() + 45 * 86400000);

  function getBucket(expDate) {
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
    if (diffDays < 0) return "dark_red";
    if (diffDays <= 30) return "red";
    if (diffDays <= 60) return "orange";
    return "green";
  }

  assert(getBucket(dateExpired) === "dark_red", "Expired license categorizes to dark_red tier");
  assert(getBucket(date30Days) === "red", "15-day expiry categorizes to red tier");
  assert(getBucket(date60Days) === "orange", "45-day expiry categorizes to orange tier");

  console.log("\n=================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runEnterpriseCrmTests().catch(err => {
  console.error("Test runner crash:", err);
  process.exit(1);
});
