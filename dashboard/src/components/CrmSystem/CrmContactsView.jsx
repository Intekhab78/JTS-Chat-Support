import React, { useState, useEffect } from "react";
import { Search, UserPlus, Grid, List, Mail, Phone, Building, Trash2, Edit3, X, Check } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";

export default function CrmContactsView({ websiteId }) {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Confirmation modal states
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    loading: false
  });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", whatsApp: "",
    phone: "", jobTitle: "", department: "", companyId: ""
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page,
        search,
        websiteId,
        limit: 10
      }).toString();
      const res = await api(`/api/crm/contacts?${q}`);
      setContacts(res.contacts || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api(`/api/crm/companies?websiteId=${websiteId}&limit=100`);
      setCompanies(res.companies || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, search, websiteId]);

  useEffect(() => {
    if (websiteId) fetchCompanies();
  }, [websiteId]);

  const handleOpenCreate = () => {
    setEditingContact(null);
    setForm({
      firstName: "", lastName: "", email: "", whatsApp: "",
      phone: "", jobTitle: "", department: "", companyId: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setForm({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      whatsApp: contact.whatsApp || "",
      phone: contact.phones?.[0]?.phone || "",
      jobTitle: contact.jobTitle || "",
      department: contact.department || "",
      companyId: contact.companyId?._id || contact.companyId || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      phones: form.phone ? [{ phone: form.phone, label: "work" }] : [],
      websiteId
    };

    try {
      if (editingContact) {
        await api(`/api/crm/contacts/${editingContact._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/api/crm/contacts", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setShowModal(false);
      fetchContacts();
    } catch (err) {
      alert("Failed to save contact: " + err.message);
    }
  };

  const triggerDeleteConfirm = (id) => {
    setConfirmModalConfig({
      open: true,
      title: "Delete Contact",
      message: "Are you sure you want to delete this contact? This action cannot be undone.",
      loading: false,
      onConfirm: () => executeDeleteContact(id)
    });
  };

  const executeDeleteContact = async (id) => {
    setConfirmModalConfig(prev => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/contacts/${id}`, { method: "DELETE" });
      fetchContacts();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      alert(err.message);
      setConfirmModalConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const triggerBulkDeleteConfirm = () => {
    setConfirmModalConfig({
      open: true,
      title: "Bulk Delete Contacts",
      message: `Are you sure you want to delete ${selectedIds.length} contacts? This action cannot be undone.`,
      loading: false,
      onConfirm: executeBulkDeleteContact
    });
  };

  const executeBulkDeleteContact = async () => {
    setConfirmModalConfig(prev => ({ ...prev, loading: true }));
    try {
      for (const id of selectedIds) {
        await api(`/api/crm/contacts/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      fetchContacts();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      alert(err.message);
      setConfirmModalConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-xl ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><List size={16} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-xl ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><Grid size={16} /></button>
          </div>
          {selectedIds.length > 0 && (
            <button onClick={triggerBulkDeleteConfirm} className="bg-red-50 text-red-600 hover:bg-red-100 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
              <Trash2 size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
            <UserPlus size={14} /> Add Contact
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-xs uppercase tracking-widest">No contacts found</div>
      ) : viewMode === "list" ? (
        /* List Mode */
        <div className="bg-white border border-slate-200/80 rounded-[30px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 w-12 text-center">Select</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Name</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Email</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Phone</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Company</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(contact._id)}
                      onChange={() => toggleSelect(contact._id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-5 font-black text-slate-900">
                    <div>{contact.displayName || `${contact.firstName} ${contact.lastName}`}</div>
                    {contact.jobTitle && <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{contact.jobTitle}</div>}
                  </td>
                  <td className="p-5 font-bold text-slate-600">{contact.email || "-"}</td>
                  <td className="p-5 font-bold text-slate-600">{contact.phones?.[0]?.phone || contact.phone || "-"}</td>
                  <td className="p-5 font-bold text-slate-600">
                    {contact.companyId?.companyName || contact.companyName || "-"}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenEdit(contact)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"><Edit3 size={14} /></button>
                      <button onClick={() => triggerDeleteConfirm(contact._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact) => (
            <div key={contact._id} className="premium-card p-6 bg-white border border-slate-100 rounded-[28px] hover:shadow-lg transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{contact.displayName || `${contact.firstName} ${contact.lastName}`}</h4>
                  {contact.jobTitle && <p className="text-[9px] font-black uppercase text-indigo-500 tracking-wider mt-1">{contact.jobTitle}</p>}
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(contact._id)}
                  onChange={() => toggleSelect(contact._id)}
                  className="rounded border-slate-300 text-indigo-600 w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="space-y-2 text-xs font-bold text-slate-500">
                {contact.email && <div className="flex items-center gap-2.5"><Mail size={14} className="text-slate-400" /> {contact.email}</div>}
                {(contact.phones?.[0]?.phone || contact.phone) && <div className="flex items-center gap-2.5"><Phone size={14} className="text-slate-400" /> {contact.phones?.[0]?.phone || contact.phone}</div>}
                {contact.companyId?.companyName && <div className="flex items-center gap-2.5"><Building size={14} className="text-slate-400" /> {contact.companyId.companyName}</div>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                <button onClick={() => handleOpenEdit(contact)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"><Edit3 size={14} /></button>
                <button onClick={() => triggerDeleteConfirm(contact._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${page === p ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">{editingContact ? "Edit Contact" : "Create Contact"}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Name</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Name</label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp</label>
                <input
                  value={form.whatsApp}
                  onChange={(e) => setForm({ ...form, whatsApp: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Job Title</label>
                <input
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Company</label>
              <select
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
              >
                <option value="">No Company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="w-full py-4.5 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <Check size={16} /> Save Contact
            </button>
          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmModalConfig.open}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        loading={confirmModalConfig.loading}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false })}
      />
    </div>
  );
}
