import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, UserPlus, Grid, List, Mail, Phone, Building, Trash2, Edit3, X, Check, Eye, Users, ChevronRight, MessageSquare, Briefcase, ShieldCheck } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";

export default function CrmContactsView({ websiteId }) {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Detail View State
  const [viewingContact, setViewingContact] = useState(null);

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
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? websiteId : "";
      const res = await api(`/api/crm/contacts?websiteId=${qWebsite}&limit=300`);
      const list = Array.isArray(res) ? res : (res?.contacts || res?.data || []);
      setContacts(list);
    } catch (err) {
      console.error(err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? websiteId : "";
      const res = await api(`/api/crm/companies?websiteId=${qWebsite}&limit=200`);
      const list = Array.isArray(res) ? res : (res?.companies || res?.data || []);
      setCompanies(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [websiteId]);

  useEffect(() => {
    fetchCompanies();
  }, [websiteId]);

  // KPI Analytics Metrics for Contacts
  const metrics = useMemo(() => {
    const totalCount = contacts.length;
    const withCompanyCount = contacts.filter(c => c.companyId || c.companyName).length;
    const withEmailCount = contacts.filter(c => c.email).length;
    const withPhoneCount = contacts.filter(c => (c.phones?.[0]?.phone || c.phone || c.whatsApp)).length;

    return { totalCount, withCompanyCount, withEmailCount, withPhoneCount };
  }, [contacts]);

  // Filtered & Paginated Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const fullName = (c.displayName || `${c.firstName || ""} ${c.lastName || ""}`).toLowerCase();
      const emailStr = (c.email || "").toLowerCase();
      const phoneStr = (c.phones?.[0]?.phone || c.phone || c.whatsApp || "").toLowerCase();
      const compName = (c.companyId?.companyName || c.companyName || "").toLowerCase();

      const matchesSearch = search.trim() === "" ||
        fullName.includes(search.toLowerCase()) ||
        emailStr.includes(search.toLowerCase()) ||
        phoneStr.includes(search.toLowerCase()) ||
        compName.includes(search.toLowerCase());

      const matchesCompany = companyFilter === "all" ||
        String(c.companyId?._id || c.companyId) === companyFilter;

      return matchesSearch && matchesCompany;
    });
  }, [contacts, search, companyFilter]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage) || 1;

  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, page, itemsPerPage]);

  const handleOpenCreate = () => {
    setEditingContact(null);
    setForm({
      firstName: "", lastName: "", email: "", whatsApp: "",
      phone: "", jobTitle: "", department: "", companyId: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (contact, e) => {
    if (e) e.stopPropagation();
    setEditingContact(contact);
    setForm({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      whatsApp: contact.whatsApp || "",
      phone: contact.phones?.[0]?.phone || contact.phone || "",
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
          method: "PUT",
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
      alert(err.message);
    }
  };

  const triggerDeleteConfirm = (id, e) => {
    if (e) e.stopPropagation();
    setConfirmModalConfig({
      open: true,
      title: "Delete Contact",
      message: "Are you sure you want to delete this contact? This action cannot be undone.",
      onConfirm: () => executeDeleteContact(id),
      loading: false
    });
  };

  const executeDeleteContact = async (id) => {
    setConfirmModalConfig(prev => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/contacts/${id}`, { method: "DELETE" });
      setSelectedIds(prev => prev.filter(x => x !== id));
      if (viewingContact?._id === id) setViewingContact(null);
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
      message: `Are you sure you want to delete ${selectedIds.length} selected contacts?`,
      onConfirm: executeBulkDeleteContact,
      loading: false
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

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Contacts & Accounts Management</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage customer directory, key decision makers, and corporate profiles</p>
        </div>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">CRM Directory</span>
      </div>

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Directory Contacts</span>
            <span className="text-lg font-black text-slate-900">{metrics.totalCount} Contacts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Building size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Linked to Companies</span>
            <span className="text-lg font-black text-emerald-700">{metrics.withCompanyCount} Contacts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Mail size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Verified Emails</span>
            <span className="text-lg font-black text-blue-700">{metrics.withEmailCount} Email Profiles</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Phone size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Direct Phone Lines</span>
            <span className="text-lg font-black text-amber-700">{metrics.withPhoneCount} Contacts</span>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search contacts by name, email, phone, or company…"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        {/* Company Filter Dropdown & Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
            className="w-full sm:w-44 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.companyName}</option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><List size={16} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><Grid size={16} /></button>
          </div>

          {selectedIds.length > 0 && (
            <button onClick={triggerBulkDeleteConfirm} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all">
              <Trash2 size={13} /> Delete ({selectedIds.length})
            </button>
          )}

          <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-100 transition-all">
            <UserPlus size={13} /> Add Contact
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : paginatedContacts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-xs uppercase tracking-widest">
          No contacts found matching filters
        </div>
      ) : viewMode === "list" ? (
        /* List Mode */
        <div className="bg-white border border-slate-200/80 rounded-[30px] overflow-hidden shadow-sm flex flex-col justify-between min-h-[420px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 w-12 text-center">Select</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Name & Title</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Email</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Phone</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Company</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-xs text-slate-700">
              {paginatedContacts.map((contact) => (
                <tr
                  key={contact._id}
                  onClick={() => setViewingContact(contact)}
                  className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(contact._id)}
                      onChange={(e) => toggleSelect(contact._id, e)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-black text-slate-900 flex items-center gap-2">
                      <span>{contact.displayName || `${contact.firstName || ""} ${contact.lastName || ""}`}</span>
                      <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {contact.jobTitle && <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{contact.jobTitle}</div>}
                  </td>
                  <td className="p-4 font-semibold text-slate-600">{contact.email || "—"}</td>
                  <td className="p-4 font-semibold text-slate-600">{contact.phones?.[0]?.phone || contact.phone || contact.whatsApp || "—"}</td>
                  <td className="p-4 font-semibold text-indigo-600">
                    {contact.companyId?.companyName || contact.companyName || "—"}
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setViewingContact(contact); }} title="View Details" className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"><Eye size={13} /></button>
                      <button onClick={(e) => handleOpenEdit(contact, e)} title="Edit Contact" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"><Edit3 size={13} /></button>
                      <button onClick={(e) => triggerDeleteConfirm(contact._id, e)} title="Delete Contact" className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs font-bold text-slate-600 mt-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} Contacts
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Prev
                </button>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid Mode */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedContacts.map((contact) => (
              <div
                key={contact._id}
                onClick={() => setViewingContact(contact)}
                className="p-6 bg-white border border-slate-200/80 rounded-[28px] hover:shadow-lg cursor-pointer transition-all space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{contact.displayName || `${contact.firstName || ""} ${contact.lastName || ""}`}</h4>
                    {contact.jobTitle && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{contact.jobTitle}</p>}
                  </div>
                  <button onClick={(e) => handleOpenEdit(contact, e)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={14} /></button>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  {contact.email && <div className="flex items-center gap-2"><Mail size={13} className="text-slate-400 shrink-0" /><span className="truncate">{contact.email}</span></div>}
                  {(contact.phones?.[0]?.phone || contact.phone) && <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400 shrink-0" /><span>{contact.phones?.[0]?.phone || contact.phone}</span></div>}
                  {(contact.companyId?.companyName || contact.companyName) && <div className="flex items-center gap-2"><Building size={13} className="text-slate-400 shrink-0" /><span className="text-indigo-600 font-bold">{contact.companyId?.companyName || contact.companyName}</span></div>}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-[24px] text-xs font-bold text-slate-600">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} Contacts
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Prev
                </button>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED 360 CUSTOMER & CONTACT PROFILE VIEW MODAL */}
      {viewingContact && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200">
                  {(viewingContact.firstName?.[0] || viewingContact.displayName?.[0] || "C").toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{viewingContact.displayName || `${viewingContact.firstName || ""} ${viewingContact.lastName || ""}`}</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Active Profile</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {viewingContact.jobTitle || "Executive Manager"} {viewingContact.department ? `• ${viewingContact.department}` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingContact(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            {/* Profile Grid (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              {/* Left Column: Direct Communication Channels */}
              <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b pb-2 border-slate-200/50">Contact Channels</span>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-slate-800">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"><Mail size={14} /></div>
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Email Address</span>
                      <span className="truncate block font-extrabold text-slate-900">{viewingContact.email || "No email registered"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-800">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><Phone size={14} /></div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Work Phone</span>
                      <span className="font-extrabold text-slate-900">{viewingContact.phones?.[0]?.phone || viewingContact.phone || "No phone registered"}</span>
                    </div>
                  </div>

                  {viewingContact.whatsApp && (
                    <div className="flex items-center gap-2.5 text-slate-800">
                      <div className="p-2 rounded-lg bg-green-50 text-green-600 shrink-0"><MessageSquare size={14} /></div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">WhatsApp Direct</span>
                        <span className="font-extrabold text-slate-900">{viewingContact.whatsApp}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Corporate Affiliation & Account Info */}
              <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b pb-2 border-slate-200/50">Corporate & Account Profile</span>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Building size={14} /></div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Company Name</span>
                      <span className="font-extrabold text-indigo-700">{viewingContact.companyId?.companyName || viewingContact.companyName || "Independent Client"}</span>
                    </div>
                  </div>

                  {(viewingContact.companyId?.trn || viewingContact.trn) && (
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0"><ShieldCheck size={14} /></div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Tax Registration (TRN)</span>
                        <span className="font-extrabold text-slate-900">{viewingContact.companyId?.trn || viewingContact.trn}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0"><Briefcase size={14} /></div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Lifecycle Stage</span>
                      <span className="font-extrabold text-slate-900 uppercase text-[10px]">{viewingContact.lifecycleStage || "Qualified Account"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Account Metadata Summary Bar */}
            <div className="bg-indigo-50/40 border border-indigo-100/60 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <span>Account Created: <span className="font-black text-slate-900">{viewingContact.createdAt ? new Date(viewingContact.createdAt).toLocaleDateString() : "Active"}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-full">
                  Website ID: {websiteId ? "Scoped Asset" : "Global Asset"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t pt-4 border-slate-100">
              <button
                onClick={(e) => { const c = viewingContact; setViewingContact(null); handleOpenEdit(c, e); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl uppercase transition-all"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setViewingContact(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase shadow-lg shadow-indigo-100 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE / EDIT CONTACT MODAL */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{editingContact ? "Edit Contact" : "Create New Contact"}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">First Name</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Last Name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Work Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">WhatsApp</label>
                  <input
                    value={form.whatsApp}
                    onChange={(e) => setForm({ ...form, whatsApp: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Job Title</label>
                  <input
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Department</label>
                  <input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Associated Company</label>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white cursor-pointer"
                >
                  <option value="">None (Independent Contact)</option>
                  {companies.map((comp) => (
                    <option key={comp._id} value={comp._id}>{comp.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase transition-all">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase shadow-lg shadow-indigo-100 transition-all">{editingContact ? "Save Changes" : "Create Contact"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        open={confirmModalConfig.open}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false })}
        loading={confirmModalConfig.loading}
      />
    </div>
  );
}
