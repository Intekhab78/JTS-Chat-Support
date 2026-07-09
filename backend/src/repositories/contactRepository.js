import { Contact } from "../models/Contact.js";

export const find = async (query = {}, { skip = 0, limit = 20, populate = [] } = {}) => {
  const activeQuery = { ...query, isDeleted: { $ne: true } };
  let q = Contact.find(activeQuery).sort({ createdAt: -1 }).skip(skip).limit(limit);
  populate.forEach(p => {
    q = q.populate(p);
  });
  return q.exec();
};

export const findById = async (id, populate = []) => {
  let q = Contact.findOne({ _id: id, isDeleted: { $ne: true } });
  populate.forEach(p => {
    q = q.populate(p);
  });
  return q.exec();
};

export const create = async (data) => {
  return Contact.create(data);
};

export const update = async (id, data) => {
  return Contact.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    data,
    { new: true, runValidators: true }
  );
};

export const softDelete = async (id) => {
  return Contact.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { isDeleted: true },
    { new: true }
  );
};

export const count = async (query = {}) => {
  const activeQuery = { ...query, isDeleted: { $ne: true } };
  return Contact.countDocuments(activeQuery);
};
