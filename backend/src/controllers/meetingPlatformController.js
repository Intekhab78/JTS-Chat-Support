import { MeetingPlatform } from "../models/MeetingPlatform.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import crypto from "crypto";

// Default seed platforms for new websites
const DEFAULT_PLATFORMS = [
  { name: "JTS Meet", key: "jts_meet", icon: "🎯", color: "#6366f1", urlTemplate: "https://meet.jtsmiddleeast.com/#/{roomId}", description: "JTS built-in video meeting", isDefault: true, sortOrder: 0 },
  { name: "Zoom", key: "zoom", icon: "📹", color: "#2D8CFF", urlTemplate: "https://zoom.us/j/{roomId}", description: "Zoom video conferencing", isDefault: false, sortOrder: 1 },
  { name: "Google Meet", key: "google_meet", icon: "🟢", color: "#34A853", urlTemplate: "https://meet.google.com/{roomId}", description: "Google Meet video calls", isDefault: false, sortOrder: 2 },
  { name: "Microsoft Teams", key: "ms_teams", icon: "🟣", color: "#6264A7", urlTemplate: "", description: "Microsoft Teams meetings", isDefault: false, sortOrder: 3 },
  { name: "Phone Call", key: "phone", icon: "📞", color: "#10B981", urlTemplate: "", description: "Regular phone call", isDefault: false, sortOrder: 4 },
  { name: "In Person", key: "in_person", icon: "🤝", color: "#F59E0B", urlTemplate: "", description: "Face to face meeting", isDefault: false, sortOrder: 5 },
];

// Generate a unique room ID for platforms with urlTemplate
function generateRoomId(platformKey) {
  const prefix = platformKey === "jts_meet" ? "jts" : platformKey.substring(0, 3);
  const randomPart = crypto.randomBytes(5).toString("hex"); // 10 hex chars
  return `${prefix}-${randomPart}`.toLowerCase();
}

// Replace {roomId} in URL template
export function buildMeetingLink(platform, roomId) {
  if (!platform?.urlTemplate || !roomId) return null;
  return platform.urlTemplate.replace("{roomId}", roomId);
}

// ── LIST all platforms for a website ──────────────────────────────────────────
export const listPlatforms = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const wid = websiteId || ownedWebsiteIds[0];
  if (!wid) return res.json({ platforms: [] });

  let platforms = await MeetingPlatform.find({ websiteId: wid, isActive: true }).sort({ sortOrder: 1, createdAt: 1 });

  // Auto-seed defaults if none exist yet
  if (platforms.length === 0) {
    const seeds = DEFAULT_PLATFORMS.map(p => ({ ...p, websiteId: wid, createdBy: req.user._id }));
    await MeetingPlatform.insertMany(seeds, { ordered: false }).catch(() => {}); // ignore dup key errors
    platforms = await MeetingPlatform.find({ websiteId: wid, isActive: true }).sort({ sortOrder: 1 });
  }

  res.json({ platforms });
});

// ── GET ALL (including inactive) — for admin management ───────────────────────
export const listAllPlatforms = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const wid = websiteId || ownedWebsiteIds[0];
  if (!wid) return res.json({ platforms: [] });

  let platforms = await MeetingPlatform.find({ websiteId: wid }).sort({ sortOrder: 1, createdAt: 1 });

  // Auto-seed defaults if none exist yet
  if (platforms.length === 0) {
    const seeds = DEFAULT_PLATFORMS.map(p => ({ ...p, websiteId: wid, createdBy: req.user._id }));
    await MeetingPlatform.insertMany(seeds, { ordered: false }).catch(() => {});
    platforms = await MeetingPlatform.find({ websiteId: wid }).sort({ sortOrder: 1 });
  }

  res.json({ platforms });
});

// ── CREATE a new platform ──────────────────────────────────────────────────────
export const createPlatform = asyncHandler(async (req, res) => {
  const { websiteId, name, icon, color, urlTemplate, description, isDefault, sortOrder } = req.body;
  if (!websiteId || !name) throw new AppError("websiteId and name are required", 400);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
    throw new AppError("Unauthorized", 403);
  }

  // Generate key from name
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

  // If new platform is marked as default, unset others
  if (isDefault) {
    await MeetingPlatform.updateMany({ websiteId }, { isDefault: false });
  }

  const platform = await MeetingPlatform.create({
    websiteId, name, key, icon: icon || "🎥", color: color || "#6366f1",
    urlTemplate: urlTemplate || "", description: description || "",
    isDefault: !!isDefault, sortOrder: sortOrder || 99,
    createdBy: req.user._id
  });

  res.status(201).json({ platform });
});

// ── UPDATE a platform ──────────────────────────────────────────────────────────
export const updatePlatform = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const platform = await MeetingPlatform.findById(id);
  if (!platform) throw new AppError("Platform not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(i => i.toString()).includes(platform.websiteId.toString())) {
    throw new AppError("Unauthorized", 403);
  }

  // If setting as default, unset others
  if (updates.isDefault) {
    await MeetingPlatform.updateMany({ websiteId: platform.websiteId, _id: { $ne: id } }, { isDefault: false });
  }

  // Regenerate key if name changed
  if (updates.name && updates.name !== platform.name) {
    updates.key = updates.name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  }

  const updated = await MeetingPlatform.findByIdAndUpdate(id, updates, { new: true });
  res.json({ platform: updated });
});

// ── DELETE / toggle active ─────────────────────────────────────────────────────
export const deletePlatform = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const platform = await MeetingPlatform.findById(id);
  if (!platform) throw new AppError("Platform not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(i => i.toString()).includes(platform.websiteId.toString())) {
    throw new AppError("Unauthorized", 403);
  }

  await MeetingPlatform.findByIdAndDelete(id);
  res.json({ message: "Platform deleted" });
});

// ── GENERATE a room link for a meeting (call from activityService) ─────────────
export const generateRoomLink = asyncHandler(async (req, res) => {
  const { platformKey, websiteId } = req.body;
  if (!platformKey || !websiteId) throw new AppError("platformKey and websiteId required", 400);

  const platform = await MeetingPlatform.findOne({ key: platformKey, websiteId, isActive: true });
  if (!platform || !platform.urlTemplate) {
    return res.json({ link: null, roomId: null });
  }

  const roomId = generateRoomId(platformKey);
  const link = buildMeetingLink(platform, roomId);
  res.json({ link, roomId });
});

export { generateRoomId };
