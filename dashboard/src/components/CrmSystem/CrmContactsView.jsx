import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  UserPlus,
  Grid,
  List,
  Mail,
  Phone,
  Building,
  Trash2,
  Edit3,
  X,
  Eye,
  Users,
  ChevronRight,
  MessageSquare,
  Briefcase,
  ShieldCheck,
  Download,
  Printer,
  RefreshCw
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";
import ConfirmModal from "../ConfirmModal.jsx";

const isValidWebsiteId = (id) =>
  Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

const getContactName = (c) =>
  (c?.displayName || `${c?.firstName || ""} ${c?.lastName || ""}`).trim() || "Unnamed Contact";

const getContactPhone = (c) =>
  c?.phones?.[0]?.phone || c?.phone || c?.whatsApp || "";

const isAnonymousContact = (c) => {
  const name = getContactName(c).toLowerCase();
  const email = (c?.email || "").toLowerCase();
  return name.includes("anonymous visitor") || email.endsWith("@visitor.local");
};

export default function CrmContactsView({ websiteId }) {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
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
    firstName: "",
    lastName: "",
    email: "",
    whatsApp: "",
    phone: "",
    jobTitle: "",
    department: "",
    companyId: ""
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const qs = isValidWebsiteId(websiteId)
        ? `?websiteId=${encodeURIComponent(websiteId)}&limit=300`
        : "?limit=300";
      const res = await api(`/api/crm/contacts${qs}`);
      const list = Array.isArray(res) ? res : res?.contacts || res?.data || [];
      setContacts(list);
    } catch (err) {
      console.error(err);
      toast?.error?.(err?.message || "Failed to load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const qs = isValidWebsiteId(websiteId)
        ? `?websiteId=${encodeURIComponent(websiteId)}&limit=200`
        : "?limit=200";
      const res = await api(`/api/crm/companies${qs}`);
      const list = Array.isArray(res) ? res : res?.companies || res?.data || [];
      setCompanies(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, [websiteId]);

  // KPI Analytics Metrics for Contacts
  const metrics = useMemo(() => {
    const totalCount = contacts.length;
    const withCompanyCount = contacts.filter((c) => c.companyId || c.companyName).length;
    const withEmailCount = contacts.filter((c) => Boolean(c.email)).length;
    const withPhoneCount = contacts.filter((c) => Boolean(getContactPhone(c))).length;

    return { totalCount, withCompanyCount, withEmailCount, withPhoneCount };
  }, [contacts]);

  // Filtered & Paginated Contacts
  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const fullName = getContactName(c).toLowerCase();
      const emailStr = (c.email || "").toLowerCase();
      const phoneStr = getContactPhone(c).toLowerCase();
      const compName = (c.companyId?.companyName || c.companyName || "").toLowerCase();

      const matchesSearch =
        q === "" ||
        fullName.includes(q) ||
        emailStr.includes(q) ||
        phoneStr.includes(q) ||
        compName.includes(q);

      const matchesCompany =
        companyFilter === "all" || String(c.companyId?._id || c.companyId) === companyFilter;

      const isAnon = isAnonymousContact(c);
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "named" && !isAnon) ||
        (typeFilter === "anonymous" && isAnon);

      return matchesSearch && matchesCompany && matchesType;
    });
  }, [contacts, search, companyFilter, typeFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);

  const paginatedContacts = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, safePage, itemsPerPage]);

  const allPageSelected =
    paginatedContacts.length > 0 &&
    paginatedContacts.every((c) => selectedIds.includes(c._id));

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedContacts.map((c) => c._id);
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleOpenCreate = () => {
    setEditingContact(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      whatsApp: "",
      phone: "",
      jobTitle: "",
      department: "",
      companyId: "",
      source: "manual",
      status: "active",
      notes: ""
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
      companyId: contact.companyId?._id || contact.companyId || "",
      source: contact.source || "manual",
      status: contact.status || "active",
      notes: contact.notes || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      whatsApp: form.whatsApp.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      department: form.department.trim() || undefined,
      companyId: form.companyId || null,
      source: form.source || "manual",
      status: form.status || "active",
      notes: form.notes.trim(),
      phones: form.phone.trim() ? [{ phone: form.phone.trim(), label: "work" }] : []
    };
    if (isValidWebsiteId(websiteId)) {
      payload.websiteId = websiteId;
    }

    try {
      if (editingContact) {
        await api(`/api/crm/contacts/${editingContact._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Contact updated");
      } else {
        await api("/api/crm/contacts", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Contact created");
      }
      setShowModal(false);
      await fetchContacts();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to save contact");
    } finally {
      setSaving(false);
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
    setConfirmModalConfig((prev) => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/contacts/${id}`, { method: "DELETE" });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (viewingContact?._id === id) setViewingContact(null);
      toast?.success?.("Contact deleted");
      await fetchContacts();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete contact");
      setConfirmModalConfig((prev) => ({ ...prev, loading: false }));
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
    setConfirmModalConfig((prev) => ({ ...prev, loading: true }));
    try {
      await Promise.all(selectedIds.map((id) => api(`/api/crm/contacts/${id}`, { method: "DELETE" })));
      toast?.success?.(`${selectedIds.length} contacts deleted`);
      setSelectedIds([]);
      await fetchContacts();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete selected contacts");
      setConfirmModalConfig((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleExportCSV = () => {
    const data = filteredContacts.map((c) => ({
      "Full Name": getContactName(c),
      Company: c.companyId?.companyName || c.companyName || "—",
      Email: c.email || "—",
      "Phone / WhatsApp": getContactPhone(c) || "—",
      "Job Title": c.jobTitle || "—",
      Department: c.department || "—",
      "Created Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"
    }));
    exportToCSV(data, `Contacts_Directory_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const data = filteredContacts.map((c) => ({
      Name: getContactName(c),
      Email: c.email || "—",
      Phone: getContactPhone(c) || "—",
      Company: c.companyId?.companyName || c.companyName || "—"
    }));
    exportToPDF(data, `Contacts_Directory_${new Date().toISOString().slice(0, 10)}`, "CONTACTS & ACCOUNTS DIRECTORY");
  };

  const hasActiveFilters = search.trim() !== "" || companyFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-3 bg-white">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2.5 border-slate-100">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Contacts &amp; Accounts Management
          </h3>
          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
            Manage customer directory, key decision makers, and corporate profiles
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
              {selectedIds.length} selected
            </span>
          )}
          <button
            onClick={handleExportCSV}
            disabled={filteredContacts.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export contacts to CSV"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredContacts.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export contacts to PDF"
          >
            <Printer size={12} /> Export PDF
          </button>
          <button
            onClick={fetchContacts}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
            title="Refresh contacts"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Compact KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Total Directory Contacts
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.totalCount} Contacts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Building size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Linked to Companies
            </span>
            <span className="text-sm font-black text-emerald-700">{metrics.withCompanyCount} Contacts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Mail size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Email Profiles
            </span>
            <span className="text-sm font-black text-blue-700">{metrics.withEmailCount} Profiles</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Phone size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Direct Phone Lines
            </span>
            <span className="text-sm font-black text-amber-700">{metrics.withPhoneCount} Contacts</span>
          </div>
        </div>
      </div>

      {/* Compact Action and Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-xs flex flex-col lg:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search contacts by name, email, phone, or company…"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Profiles</option>
            <option value="named">Named Contacts</option>
            <option value="anonymous">Anonymous Visitors</option>
          </select>

          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${
                viewMode === "list" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400"
              }`}
              title="List view"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${
                viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400"
              }`}
              title="Grid view"
            >
              <Grid size={13} />
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch("");
                setCompanyFilter("all");
                setTypeFilter("all");
                setPage(1);
              }}
              className="px-2 py-1.5 text-[9.5px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              Reset
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={triggerBulkDeleteConfirm}
              className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all"
          >
            <UserPlus size={12} /> Add Contact
          </button>
        </div>
      </div>

      {/* Loading / Empty / Data Views */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-10 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : paginatedContacts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-wider">
          No contacts found matching filters
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-3 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Name &amp; Title
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Email
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Phone
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Company
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10.5px] font-semibold text-slate-700">
                {paginatedContacts.map((contact) => {
                  const name = getContactName(contact);
                  const phone = getContactPhone(contact);
                  const compName = contact.companyId?.companyName || contact.companyName;
                  const isAnon = isAnonymousContact(contact);

                  return (
                    <tr
                      key={contact._id}
                      onClick={() => setViewingContact(contact)}
                      className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(contact._id)}
                          onChange={(e) => toggleSelect(contact._id, e)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="truncate max-w-[180px]">{name}</span>
                          {isAnon && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              Visitor
                            </span>
                          )}
                          <ChevronRight
                            size={12}
                            className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                        {contact.jobTitle && (
                          <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                            {contact.jobTitle}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]">
                        {contact.email || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{phone || "—"}</td>
                      <td className="px-3 py-2 text-indigo-600 font-bold truncate max-w-[160px]">
                        {compName || "—"}
                      </td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingContact(contact);
                            }}
                            title="View Details"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(contact, e)}
                            title="Edit Contact"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => triggerDeleteConfirm(contact._id, e)}
                            title="Delete Contact"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compact Pagination Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400">
              Showing {(safePage - 1) * itemsPerPage + 1}–
              {Math.min(safePage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Prev
              </button>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9.5px] font-black">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Grid Mode */
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {paginatedContacts.map((contact) => {
              const name = getContactName(contact);
              const phone = getContactPhone(contact);
              const compName = contact.companyId?.companyName || contact.companyName;
              return (
                <div
                  key={contact._id}
                  onClick={() => setViewingContact(contact)}
                  className="p-3.5 bg-white border border-slate-200/80 rounded-xl hover:shadow-sm hover:border-indigo-200 cursor-pointer transition-all space-y-2.5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {name}
                      </h4>
                      {contact.jobTitle && (
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">
                          {contact.jobTitle}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleOpenEdit(contact, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>

                  <div className="space-y-1 text-[10px] font-semibold text-slate-600">
                    {contact.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-slate-400 shrink-0" />
                        <span>{phone}</span>
                      </div>
                    )}
                    {compName && (
                      <div className="flex items-center gap-1.5">
                        <Building size={11} className="text-slate-400 shrink-0" />
                        <span className="text-indigo-600 font-bold truncate">{compName}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-[10px] font-bold text-slate-600">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400">
              Showing {(safePage - 1) * itemsPerPage + 1}–
              {Math.min(safePage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Prev
              </button>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9.5px] font-black">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED 360 CONTACT PROFILE MODAL */}
      {viewingContact &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingContact(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {getContactName(viewingContact)[0]?.toUpperCase() || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black text-slate-900">{getContactName(viewingContact)}</h3>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Active
                    </span>
                  </div>
                  {(viewingContact.jobTitle || viewingContact.department) && (
                    <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {[viewingContact.jobTitle, viewingContact.department].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingContact(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[10.5px] font-semibold text-slate-700">
              <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-2">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block border-b pb-1.5 border-slate-200/50">
                  Contact Channels
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <Mail size={12} />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Email</span>
                      <span className="truncate block font-bold text-slate-900">
                        {viewingContact.email || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <Phone size={12} />
                    </div>
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Work Phone</span>
                      <span className="font-bold text-slate-900">
                        {viewingContact.phones?.[0]?.phone || viewingContact.phone || "—"}
                      </span>
                    </div>
                  </div>
                  {viewingContact.whatsApp && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-green-50 text-green-600 shrink-0">
                        <MessageSquare size={12} />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block">WhatsApp</span>
                        <span className="font-bold text-slate-900">{viewingContact.whatsApp}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-2">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block border-b pb-1.5 border-slate-200/50">
                  Corporate Profile
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <Building size={12} />
                    </div>
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Company</span>
                      <span className="font-bold text-indigo-700">
                        {viewingContact.companyId?.companyName || viewingContact.companyName || "Independent"}
                      </span>
                    </div>
                  </div>
                  {(viewingContact.companyId?.trn || viewingContact.trn) && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                        <ShieldCheck size={12} />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block">TRN</span>
                        <span className="font-bold text-slate-900">
                          {viewingContact.companyId?.trn || viewingContact.trn}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                      <Briefcase size={12} />
                    </div>
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">
                        Lifecycle Stage
                      </span>
                      <span className="font-bold text-slate-900 uppercase text-[9.5px]">
                        {viewingContact.lifecycleStage || viewingContact.stage || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl flex justify-between items-center text-[10px] font-bold text-slate-600">
              <span>
                Created:{" "}
                <span className="text-slate-900">
                  {viewingContact.createdAt ? new Date(viewingContact.createdAt).toLocaleDateString() : "—"}
                </span>
              </span>
              <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                {isValidWebsiteId(websiteId) ? "Scoped Website" : "All Websites"}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-2.5 border-slate-100">
              <button
                onClick={(e) => {
                  const c = viewingContact;
                  setViewingContact(null);
                  handleOpenEdit(c, e);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black rounded-lg uppercase transition-all"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setViewingContact(null)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg uppercase transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE / EDIT CONTACT MODAL */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {editingContact ? "Edit Contact" : "Create New Contact"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      First Name *
                    </label>
                    <input
                      required
                      placeholder="e.g. Aarav"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Last Name
                    </label>
                    <input
                      placeholder="e.g. Sharma"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Work Phone
                    </label>
                    <input
                      placeholder="+971 50 123 4567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      WhatsApp
                    </label>
                    <input
                      placeholder="+971 50 123 4567"
                      value={form.whatsApp}
                      onChange={(e) => setForm({ ...form, whatsApp: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Job Title
                    </label>
                    <input
                      placeholder="e.g. Operations Head"
                      value={form.jobTitle}
                      onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Department
                    </label>
                    <input
                      placeholder="e.g. Sales & CRM"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Source
                    </label>
                    <select
                      value={form.source || "manual"}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer"
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="website">Website / Widget</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="referral">Referral</option>
                      <option value="import">CSV Import</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Status
                    </label>
                    <select
                      value={form.status || "active"}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="lead">Lead</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Associated Company
                  </label>
                  <select
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer"
                  >
                    <option value="">None (Independent Contact)</option>
                    {companies.map((comp) => (
                      <option key={comp._id} value={comp._id}>
                        {comp.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional internal note about this contact..."
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-xl uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black rounded-xl uppercase shadow-sm transition-all"
                  >
                    {saving ? "Saving…" : editingContact ? "Save Changes" : "Create Contact"}
                  </button>
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
        onCancel={() =>
          setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false })
        }
        loading={confirmModalConfig.loading}
      />
    </div>
  );
}
