import { Role } from "../models/Role.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ createdAt: -1 });
  res.status(200).json({
    status: "success",
    data: roles,
  });
});

export const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions, isActive } = req.body;

  const existingRole = await Role.findOne({ name: name.trim() });
  if (existingRole) {
    throw new AppError("Role with this name already exists", 400);
  }

  const role = await Role.create({
    name,
    description,
    permissions,
    isActive,
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: "success",
    data: role,
  });
});

export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions, isActive } = req.body;

  const role = await Role.findById(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (permissions) role.permissions = permissions;
  if (isActive !== undefined) role.isActive = isActive;

  await role.save();

  res.status(200).json({
    status: "success",
    data: role,
  });
});

export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await Role.findById(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  // Prevent deleting system roles if they were somehow in the master
  // For now, let's just allow deletion
  await role.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
