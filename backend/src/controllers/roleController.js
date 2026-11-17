import { Role } from "../models/Role.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { normalizeRole } from "../utils/roleUtils.js";

function resolveTenantOwnerId(user) {
  const role = normalizeRole(user?.role);
  if (role === "client") return user._id;
  return user?.managerId || user?._id;
}

export const getRoles = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.user?.role);
  const tenantOwnerId = resolveTenantOwnerId(req.user);
  const defaultTeamRoles = ["agent", "sales", "manager", "accounts", "purchase", "management", "user"];
  const filter = role === "admin"
    ? {}
    : {
      $or: [
        { createdBy: tenantOwnerId },
        { isActive: true, name: { $in: defaultTeamRoles } }
      ]
    };
  const roles = await Role.find(filter).sort({ updatedAt: -1, createdAt: -1 });
  if (role === "admin") {
    const byNameAdmin = new Map();
    for (const r of roles) {
      const key = String(r.name || "").trim().toLowerCase();
      if (!byNameAdmin.has(key)) byNameAdmin.set(key, r);
    }
    return res.status(200).json({ status: "success", data: Array.from(byNameAdmin.values()) });
  }

  // Deduplicate by role name, preferring this tenant's custom/overridden role (or most recently updated)
  const byName = new Map();
  for (const r of roles) {
    const key = String(r.name || "").trim().toLowerCase();
    const isTenantOwned = r.createdBy && String(r.createdBy) === String(tenantOwnerId);
    if (!byName.has(key) || (isTenantOwned && !(byName.get(key).createdBy && String(byName.get(key).createdBy) === String(tenantOwnerId)))) {
      byName.set(key, r);
    }
  }

  res.status(200).json({
    status: "success",
    data: Array.from(byName.values()),
  });
});

export const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions, isActive } = req.body;
  const tenantOwnerId = resolveTenantOwnerId(req.user);

  const existingRole = await Role.findOne({ name: name.trim(), createdBy: tenantOwnerId });
  if (existingRole) {
    throw new AppError("Role with this name already exists in your organization", 400);
  }

  const role = await Role.create({
    name: name.trim(),
    description,
    permissions,
    isActive,
    createdBy: tenantOwnerId,
  });

  res.status(201).json({
    status: "success",
    data: role,
  });
});

export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions, isActive } = req.body;
  const userRole = normalizeRole(req.user?.role);
  const tenantOwnerId = resolveTenantOwnerId(req.user);

  const role = await Role.findById(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  if (userRole !== "admin" && String(role.createdBy || "") !== String(tenantOwnerId)) {
    // Allow Client to customize a system default role (createdBy is null/unset) by creating a tenant override
    if (role.createdBy) {
      throw new AppError("Access denied: Unauthorized role modification", 403);
    }
    const targetName = (name ? name.trim() : role.name).toLowerCase();
    const nextPermissions = Array.isArray(permissions) ? permissions : role.permissions;
    const nextIsActive = isActive !== undefined ? isActive : role.isActive;
    const nextDesc = description !== undefined ? description : role.description;

    // Also keep the global default role in sync so seeded users (managerId: null) get the updated permissions
    await Role.updateMany(
      { name: targetName, createdBy: null },
      { $set: { permissions: nextPermissions, isActive: nextIsActive, description: nextDesc } }
    );

    const overridden = await Role.findOneAndUpdate(
      { name: targetName, createdBy: tenantOwnerId },
      {
        $set: {
          name: targetName,
          description: nextDesc,
          permissions: nextPermissions,
          isActive: nextIsActive,
          createdBy: tenantOwnerId,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({
      status: "success",
      data: overridden,
    });
  }

  if (name) role.name = name.trim().toLowerCase();
  if (description !== undefined) role.description = description;
  if (permissions) role.permissions = permissions;
  if (isActive !== undefined) role.isActive = isActive;

  await role.save();
  // Sync across any other matching role record for the same role name so all team members stay aligned
  await Role.updateMany(
    { name: role.name, _id: { $ne: role._id }, $or: [{ createdBy: null }, { createdBy: tenantOwnerId }] },
    { $set: { permissions: role.permissions, isActive: role.isActive, description: role.description } }
  );

  res.status(200).json({
    status: "success",
    data: role,
  });
});

export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userRole = normalizeRole(req.user?.role);
  const tenantOwnerId = resolveTenantOwnerId(req.user);

  const role = await Role.findById(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  if (userRole !== "admin" && String(role.createdBy) !== String(tenantOwnerId)) {
    throw new AppError("Access denied: Unauthorized role deletion", 403);
  }

  await role.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
