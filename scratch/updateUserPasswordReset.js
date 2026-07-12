const fs = require('fs');

const controllerFile = 'backend/src/controllers/userController.js';
let controllerContent = fs.readFileSync(controllerFile, 'utf8');

const targetMethod = 'export const deleteAgent = asyncHandler(async (req, res) => {';
const insertResetMethod = `export const adminResetPassword = asyncHandler(async (req, res) => {
  if (normalizeRole(req.user.role) !== "admin") {
    throw new AppError("Admin access required", 403);
  }

  const { id } = req.params;
  const { newPassword } = req.body;

  const targetUser = await User.findById(id);
  if (!targetUser) throw new AppError("User not found", 404);

  // Generate a random secure password if none is provided
  const generatedPassword = newPassword || Math.random().toString(36).substring(2, 10) + "Jts@1";
  
  // Hash the password
  targetUser.password = await bcrypt.hash(generatedPassword, 12);
  await targetUser.save();

  // Send password reset email
  const { sendEmail, getEmailTemplate } = await import("../services/emailService.js");
  const emailHtml = getEmailTemplate(
    "Administrative Password Reset",
    "<p>Hello <strong>" + targetUser.name + "</strong>,</p>" +
    "<p>Your password has been administratively reset by the JTS Command Center Admin.</p>" +
    "<p>Please find your temporary login credentials below:</p>" +
    "<table style='width:100%; border-collapse:collapse; margin:20px 0;'>" +
    "  <tr>" +
    "    <td style='padding:8px; border:1px solid #e2e8f0; font-weight:bold; width:30%;'>Email:</td>" +
    "    <td style='padding:8px; border:1px solid #e2e8f0;'>" + targetUser.email + "</td>" +
    "  </tr>" +
    "  <tr>" +
    "    <td style='padding:8px; border:1px solid #e2e8f0; font-weight:bold;'>Temporary Password:</td>" +
    "    <td style='padding:8px; border:1px solid #e2e8f0; font-family:monospace; font-size:16px; color:#6366f1; font-weight:bold;'>" + generatedPassword + "</td>" +
    "  </tr>" +
    "</table>" +
    "<p>Please change your password immediately upon logging in to secure your account.</p>",
    "Go to Dashboard",
    "https://chat.jtsmiddleeast.com/login"
  );

  await sendEmail({
    to: targetUser.email,
    subject: "🔐 JTS Command Center: Administrative Password Reset",
    html: emailHtml
  });

  return res.json({
    success: true,
    message: "Password reset successfully and email dispatched",
    userId: targetUser._id,
    email: targetUser.email,
    password: generatedPassword
  });
});

export const deleteAgent = asyncHandler(async (req, res) => {`;

controllerContent = controllerContent.replace(targetMethod, insertResetMethod);
fs.writeFileSync(controllerFile, controllerContent, 'utf8');
console.log('✅ userController.js patched with adminResetPassword');

// 2. Update userRoutes.js to mount the endpoint
const routesFile = 'backend/src/routes/userRoutes.js';
let routesContent = fs.readFileSync(routesFile, 'utf8');

const importTarget = 'createClient, updateProfile, updateDashboardPreferences, updateAgent, deleteAgent, getClientDetails } from "../controllers/userController.js";';
const importReplacement = 'createClient, updateProfile, updateDashboardPreferences, updateAgent, deleteAgent, getClientDetails, adminResetPassword } from "../controllers/userController.js";';

routesContent = routesContent.replace(importTarget, importReplacement);

const routeTarget = 'router.get("/clients/:id/details", requireAuth, requireRole("admin"), getClientDetails);';
const routeReplacement = `router.get("/clients/:id/details", requireAuth, requireRole("admin"), getClientDetails);
router.post("/users/:id/reset-password", requireAuth, requireRole("admin"), adminResetPassword);`;

routesContent = routesContent.replace(routeTarget, routeReplacement);
fs.writeFileSync(routesFile, routesContent, 'utf8');
console.log('✅ userRoutes.js patched with reset-password route');
