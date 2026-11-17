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
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import { PERMISSIONS, requireAnyPermission } from "../utils/permissions.js";

const router = Router();

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("inventory"));

// Search is open to all CRM roles (for quotation item autocomplete)
router.get("/search", requireRole("admin", "client", "manager", "sales", "agent", "purchase"), searchInventoryItems);

// READ access for inventory (Meta, Items, Movements, Masters)
const requireInventoryView = requireAnyPermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE);
router.get("/meta", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), requireInventoryView, getInventoryMeta);
router.get("/items", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), requireInventoryView, listInventoryItems);
router.get("/items/:id", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), requireInventoryView, getInventoryItem);
router.get("/movements", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), requireInventoryView, listInventoryMovements);
router.get("/masters/:type", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), requireInventoryView, listMasters);

// WRITE access (Mutations)
const requireWriteRoles = requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant");
const requireInventoryCreate = requireAnyPermission(PERMISSIONS.INVENTORY_CREATE, PERMISSIONS.INVENTORY_MANAGE);
const requireInventoryUpdate = requireAnyPermission(PERMISSIONS.INVENTORY_UPDATE, PERMISSIONS.INVENTORY_MANAGE);
const requireInventoryDelete = requireAnyPermission(PERMISSIONS.INVENTORY_DELETE, PERMISSIONS.INVENTORY_MANAGE);

router.post("/items", requireWriteRoles, requireInventoryCreate, createInventoryItem);
router.patch("/items/:id", requireWriteRoles, requireInventoryUpdate, updateInventoryItem);
router.delete("/items/:id", requireWriteRoles, requireInventoryDelete, deleteInventoryItem);

// Movements WRITE (Allowed for sales too)
router.post("/movements", requireRole("admin", "client", "purchase", "sales", "manager"), requireInventoryUpdate, createInventoryMovement);

// Masters WRITE
router.post("/masters/:type", requireWriteRoles, requireInventoryCreate, createMaster);
router.patch("/masters/:type/:id", requireWriteRoles, requireInventoryUpdate, updateMaster);
router.delete("/masters/:type/:id", requireWriteRoles, requireInventoryDelete, deleteMaster);

export default router;
