import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  {
    file: "dashboard/src/components/CrmSystem/CrmReportsView.jsx",
    pattern: /dangerouslySetInnerHTML/,
    message: "CRM reports view should not use dangerouslySetInnerHTML."
  },
  {
    files: [
      "backend/src/controllers/crmAnalyticsController.js",
      "backend/src/controllers/crmCustomerController.js",
      "backend/src/controllers/crmInteractionController.js",
      "backend/src/controllers/crmInvoiceController.js",
      "backend/src/controllers/crmQuotationController.js",
      "backend/src/controllers/crmTaskController.js",
      "backend/src/controllers/crmWorkflowController.js"
    ],
    pattern: /requireRole\(/,
    message: "CRM controllers should not use controller-level requireRole calls."
  },
  {
    file: "backend/src/services/pdfService.js",
    pattern: /\/api\/uploads\//,
    message: "PDF service should publish files under /uploads/."
  },
  {
    file: "backend/.env",
    pattern: /^JWT_SECRET=change-me$/m,
    message: "JWT_SECRET should not remain on the default placeholder."
  }
];

const failures = [];

for (const check of checks) {
  const files = check.files || [check.file];
  for (const file of files) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) {
      failures.push(`${file}: static check target does not exist.`);
      continue;
    }

    const contents = fs.readFileSync(fullPath, "utf8");
    if (check.pattern.test(contents)) {
      failures.push(`${file}: ${check.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Static checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Static checks passed");
