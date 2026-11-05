import { getSocketServer } from "../sockets/index.js";

/**
 * Broadcasts a real-time data sync event across connected Socket.IO clients.
 * Allows instant live updates for Add, Edit, Delete operations without page refresh.
 * 
 * @param {Object} options
 * @param {string} options.entity - "customer", "crm", "website", "ticket", "inventory", "shortcut", "category", "department"
 * @param {string} options.action - "created", "updated", "deleted"
 * @param {string} [options.websiteId] - Optional website scope
 * @param {Object} [options.data] - Optional payload/summary
 */
export function broadcastDataChange({ entity, action, websiteId = null, data = null }) {
  try {
    const io = getSocketServer();
    if (!io) return;

    const payload = {
      entity,
      action,
      websiteId: websiteId ? String(websiteId) : null,
      data,
      timestamp: new Date().toISOString()
    };

    if (websiteId) {
      const target = io.to(`ws_${websiteId}`).to("us_admin");
      target.emit("data:change", payload);
      target.emit(`${entity}:${action}`, payload);
    } else {
      io.emit("data:change", payload);
      io.emit(`${entity}:${action}`, payload);
    }
  } catch (err) {
    console.error("DataSync Broadcast Error:", err.message);
  }
}
