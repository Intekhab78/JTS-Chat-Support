import { Router } from "express";
import {
  createInventoryMovement,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItem,
  getInventoryMeta,
  listInventoryItems,
  listInventoryMovements,
  searchInventoryItems,
  updateInventoryItem,
} from "../controllers/inventoryController.js";
import {
  listMasters,
  createMaster,
  updateMaster,
  deleteMaster
} from "../controllers/masterController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Search is open to all CRM roles (for quotation item autocomplete)
router.get("/search", requireAuth, requireRole("admin", "client", "manager", "sales", "agent", "purchase"), searchInventoryItems);

// READ access for inventory (Meta, Items, Movements, Masters)
// Allowed for admin, client, manager, sales, purchase
router.get("/meta", requireAuth, requireRole("admin", "client", "manager", "sales", "purchase"), getInventoryMeta);
router.get("/items", requireAuth, requireRole("admin", "client", "manager", "sales", "purchase"), listInventoryItems);
router.get("/items/:id", requireAuth, requireRole("admin", "client", "manager", "sales", "purchase"), getInventoryItem);
router.get("/movements", requireAuth, requireRole("admin", "client", "manager", "sales", "purchase"), listInventoryMovements);
router.get("/masters/:type", requireAuth, requireRole("admin", "client", "manager", "sales", "purchase"), listMasters);

// WRITE access (Mutations)
// Allowed for admin, client, purchase
const requireWriteAccess = requireRole("admin", "client", "purchase");

router.post("/items", requireAuth, requireWriteAccess, createInventoryItem);
router.patch("/items/:id", requireAuth, requireWriteAccess, updateInventoryItem);
router.delete("/items/:id", requireAuth, requireWriteAccess, deleteInventoryItem);

// Movements WRITE (Allowed for sales too)
router.post("/movements", requireAuth, requireRole("admin", "client", "purchase", "sales"), createInventoryMovement);

// Masters WRITE
router.post("/masters/:type", requireAuth, requireWriteAccess, createMaster);
router.patch("/masters/:type/:id", requireAuth, requireWriteAccess, updateMaster);
router.delete("/masters/:type/:id", requireAuth, requireWriteAccess, deleteMaster);

export default router;
