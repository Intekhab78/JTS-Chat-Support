import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus,
  Mail,
  Shield,
  Activity,
  Search,
  Trash2,
  Building2,
  Globe,
  Users,
  X,
  ChevronLeft,
  MessageSquare,
  EyeOff,
  MonitorSmartphone,
  Key,
  Edit2,
  RefreshCw,
  FileSpreadsheet,
  Eye
} from "lucide-react";
import { api } from "../api/client.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useToast } from "../context/ToastContext.jsx";
import { exportToCsv } from "../utils/exportUtils.js";

function ClientDetailView({ client, details, onBack, onResetPassword, onEditClient }) {
  const [detailTab, setDetailTab] = useState("overview");
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [chatPage, setChatPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  if (!details) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
        <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[11px] font-semibold text-slate-500">Loading Client Ecosystem...</p>
      </div>
    );
  }

  const stats = details.stats || {
    totalDomains: details.websites?.length || 0,
    totalPersonnel: details.personnel?.length || 0,
    totalChats: details.chats?.length || 0,
    totalVisitors: details.visitors?.length || 0,
    totalTickets: details.tickets?.length || 0,
    totalCustomers: details.customers?.length || 0
  };

  const filteredPersonnel = (details.personnel || []).filter((p) => {
    if (websiteFilter === "all") return true;
    if (!p.websiteIds || p.websiteIds.length === 0) return false;
    return p.websiteIds.some((w) => String(w._id || w) === String(websiteFilter));
  });

  const filteredChats = (details.chats || []).filter((c) =>
    websiteFilter === "all" ? true : String(c.websiteId?._id || c.websiteId) === String(websiteFilter)
  );

  const filteredTickets = (details.tickets || []).filter((t) =>
    websiteFilter === "all" ? true : String(t.websiteId?._id || t.websiteId) === String(websiteFilter)
  );

  const filteredCustomers = (details.customers || []).filter((c) =>
    websiteFilter === "all" ? true : String(c.websiteId?._id || c.websiteId) === String(websiteFilter)
  );

  const chatsPagination = getPaginationMeta(filteredChats, chatPage);
  const ticketsPagination = getPaginationMeta(filteredTickets, ticketPage);
  const customersPagination = getPaginationMeta(filteredCustomers, customerPage);

  return (
    <div className="space-y-3">
      {/* Detail Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 cursor-pointer shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 truncate">{client.name}</h3>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold uppercase">
                {client.subscription?.plan || "pro"} plan
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${client.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
              >
                {client.isActive !== false ? "Active" : "Suspended"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <Mail size={11} className="text-slate-400" /> {client.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEditClient(client)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Edit2 size={12} /> Edit Client
          </button>
          <button
            type="button"
            onClick={() => onResetPassword(client)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Key size={12} /> Reset Password
          </button>
        </div>
      </div>

      {/* Accurate Real-Time KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Domains</span>
          <span className="text-base font-bold text-slate-900 mt-0.5 block">{stats.totalDomains}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Personnel</span>
          <span className="text-base font-bold text-slate-900 mt-0.5 block">{stats.totalPersonnel}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Chats</span>
          <span className="text-base font-bold text-indigo-600 mt-0.5 block">{stats.totalChats}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Tickets</span>
          <span className="text-base font-bold text-amber-600 mt-0.5 block">{stats.totalTickets}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Customers / Leads</span>
          <span className="text-base font-bold text-emerald-600 mt-0.5 block">{stats.totalCustomers}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Visitors</span>
          <span className="text-base font-bold text-slate-900 mt-0.5 block">{stats.totalVisitors}</span>
        </div>
      </div>

      {/* Sub-navigation tabs + Website Scope Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 w-fit">
          {[
            { id: "overview", label: "Domains & Personnel" },
            { id: "chats", label: `Chats (${websiteFilter === "all" ? stats.totalChats : filteredChats.length})` },
            { id: "tickets", label: `Tickets (${websiteFilter === "all" ? stats.totalTickets : filteredTickets.length})` },
            { id: "customers", label: `Customers (${websiteFilter === "all" ? stats.totalCustomers : filteredCustomers.length})` }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetailTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${detailTab === t.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={websiteFilter}
            onChange={(e) => {
              setWebsiteFilter(e.target.value);
              setChatPage(1);
              setTicketPage(1);
              setCustomerPage(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Websites ({details.websites.length})</option>
            {details.websites.map((w) => (
              <option key={w._id} value={w._id}>{w.websiteName}</option>
            ))}
          </select>
          {websiteFilter !== "all" && (
            <button
              type="button"
              onClick={() => setWebsiteFilter("all")}
              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {detailTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Globe size={14} className="text-indigo-600" /> Managed Domains ({details.websites.length})
              </h4>
              <span className="text-[10px] text-slate-400">Click domain to filter users</span>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {details.websites.map((w) => {
                const isSelected = String(websiteFilter) === String(w._id);
                return (
                  <div
                    key={w._id}
                    onClick={() => setWebsiteFilter(isSelected ? "all" : w._id)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${isSelected
                      ? "bg-indigo-50/70 border-indigo-400"
                      : "border-slate-100 bg-slate-50/60 hover:border-slate-300"
                      }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{w.websiteName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{w.domain}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${w.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {w.isActive ? "Online" : "Offline"}
                    </span>
                  </div>
                );
              })}
              {details.websites.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">No domains mapped.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Shield size={14} className="text-indigo-600" /> Deployed Personnel ({filteredPersonnel.length})
            </h4>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {filteredPersonnel.map((p) => (
                <div key={p._id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {p.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {p.websiteIds && p.websiteIds.length > 0 ? (
                          p.websiteIds.map((w) => (
                            <span
                              key={w._id || w}
                              className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-medium"
                            >
                              {w.websiteName || w}
                            </span>
                          ))
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px]">
                            Unassigned / Global
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-semibold uppercase text-slate-600">
                      {p.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResetPassword(p)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                      title="Reset User Password"
                    >
                      <Key size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredPersonnel.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">No personnel mapped to this website.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {detailTab === "chats" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Activity size={14} className="text-indigo-600" /> Recent Conversations ({details.chats.length} of {stats.totalChats})
            </h4>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Domain</th>
                  <th className="px-3 py-2 font-semibold">Visitor</th>
                  <th className="px-3 py-2 font-semibold">Assigned Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chatsPagination.pageItems.map((chat) => (
                  <tr key={chat._id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${chat.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {chat.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{chat.websiteId?.websiteName || "Unknown"}</td>
                    <td className="px-3 py-2 text-slate-700 truncate max-w-[160px]">{chat.visitorId?.name || chat.visitorId?.visitorId || "Guest"}</td>
                    <td className="px-3 py-2 text-slate-600">{chat.assignedAgent?.name || "—"}</td>
                  </tr>
                ))}
                {details.chats.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-xs text-slate-400">No chat history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {details.chats.length > 0 && (
            <PaginationControls
              currentPage={chatsPagination.currentPage}
              totalPages={chatsPagination.totalPages}
              totalItems={chatsPagination.totalItems}
              itemLabel="chats"
              onPageChange={setChatPage}
            />
          )}
        </div>
      )}

      {detailTab === "tickets" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900">Support Tickets ({details.tickets?.length || 0} of {stats.totalTickets})</h4>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Ticket ID</th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Priority</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ticketsPagination.pageItems.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono text-slate-700">{t.ticketId || String(t._id).slice(-6)}</td>
                    <td className="px-3 py-2 text-slate-800 truncate max-w-[240px]">{t.subject}</td>
                    <td className="px-3 py-2 uppercase text-[10px] text-slate-600">{t.priority}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase">{t.status}</span>
                    </td>
                  </tr>
                ))}
                {(details.tickets || []).length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-xs text-slate-400">No tickets found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(details.tickets || []).length > 0 && (
            <PaginationControls
              currentPage={ticketsPagination.currentPage}
              totalPages={ticketsPagination.totalPages}
              totalItems={ticketsPagination.totalItems}
              itemLabel="tickets"
              onPageChange={setTicketPage}
            />
          )}
        </div>
      )}

      {detailTab === "customers" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900">Customers & Leads ({details.customers?.length || 0} of {stats.totalCustomers})</h4>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name / Company</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Stage</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customersPagination.pageItems.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-800">{c.companyName || c.name}</td>
                    <td className="px-3 py-2 text-slate-600">{c.email}</td>
                    <td className="px-3 py-2 uppercase text-[10px] text-slate-600">{c.pipelineStage || "new"}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">{c.status || "lead"}</span>
                    </td>
                  </tr>
                ))}
                {(details.customers || []).length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-xs text-slate-400">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(details.customers || []).length > 0 && (
            <PaginationControls
              currentPage={customersPagination.currentPage}
              totalPages={customersPagination.totalPages}
              totalItems={customersPagination.totalItems}
              itemLabel="customers"
              onPageChange={setCustomerPage}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientManager() {
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail View
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);

  // Create / Edit Modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    plan: "pro",
    isActive: true
  });

  // Delete Confirm Modal
  const [deletingClient, setDeletingClient] = useState(null);

  // Password reset states
  const [resettingUser, setResettingUser] = useState(null);
  const [customPassword, setCustomPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/users/clients");
      setClients(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message);
      toast.error("Failed to load clients: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const loadClientDetails = async (client) => {
    try {
      setSelectedClient(client);
      setClientDetails(null);
      const data = await api(`/api/users/clients/${client._id}/details`);
      setClientDetails(data);
    } catch (err) {
      setError(err.message);
      toast.error("Failed to load client details: " + err.message);
      setSelectedClient(null);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, planFilter, statusFilter, clients.length]);

  useEffect(() => {
    const anyModal = showClientModal || resettingUser || deletingClient;
    if (!anyModal) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowClientModal(false);
        setResettingUser(null);
        setDeletingClient(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [showClientModal, resettingUser, deletingClient]);

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({ name: "", email: "", password: "", plan: "pro", isActive: true });
    setShowClientModal(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || "",
      email: client.email || "",
      password: "",
      plan: client.subscription?.plan || "pro",
      isActive: client.isActive !== false
    });
    setShowClientModal(true);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClient) {
        const updated = await api(`/api/users/clients/${editingClient._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            plan: formData.plan,
            isActive: formData.isActive
          })
        });
        toast.success("Client updated successfully");
        if (selectedClient?._id === editingClient._id) {
          setSelectedClient((prev) => ({ ...prev, ...updated }));
        }
      } else {
        await api("/api/users/clients", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            plan: formData.plan
          })
        });
        toast.success("Client created successfully");
      }
      setShowClientModal(false);
      await fetchClients();
    } catch (err) {
      toast.error(err.message || "Failed to save client");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      await api(`/api/users/clients/${deletingClient._id}`, { method: "DELETE" });
      toast.success("Client removed");
      setDeletingClient(null);
      if (selectedClient?._id === deletingClient._id) {
        setSelectedClient(null);
      }
      await fetchClients();
    } catch (err) {
      toast.error(err.message || "Failed to delete client");
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetLoading(true);
    try {
      const data = await api(`/api/users/${resettingUser._id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: customPassword })
      });
      setTempPassword(data.password);
      setResetSuccess(true);
      toast.success("Password reset email sent successfully!");
      if (selectedClient) loadClientDetails(selectedClient);
    } catch (err) {
      toast.error("Failed to reset password: " + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const dashboardStats = useMemo(() => {
    const active = clients.filter((c) => c.isActive !== false).length;
    const domains = clients.reduce((sum, c) => sum + (Number(c.websiteCount) || 0), 0);
    const personnel = clients.reduce((sum, c) => sum + (Number(c.agentCount) || 0), 0);
    const highTier = clients.filter((c) => ["pro", "enterprise"].includes((c.subscription?.plan || "").toLowerCase())).length;
    return { total: clients.length, active, domains, personnel, highTier };
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const plan = (client.subscription?.plan || "pro").toLowerCase();
      const isAct = client.isActive !== false;
      if (planFilter !== "all" && plan !== planFilter) return false;
      if (statusFilter === "active" && !isAct) return false;
      if (statusFilter === "suspended" && isAct) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          (client.name || "").toLowerCase().includes(q) ||
          (client.email || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clients, searchTerm, planFilter, statusFilter]);

  const paginatedClients = getPaginationMeta(filteredClients, page);

  if (loading && clients.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
        <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[11px] font-semibold text-slate-500">Synchronizing Client Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedClient ? (
        <ClientDetailView
          client={selectedClient}
          details={clientDetails}
          onResetPassword={(u) => { setResettingUser(u); setCustomPassword(""); setResetSuccess(false); }}
          onEditClient={openEditModal}
          onBack={() => {
            setSelectedClient(null);
            setClientDetails(null);
            fetchClients();
          }}
        />
      ) : (
        <>
          {/* ── Clean White Header ───────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Building2 size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Client Infrastructure</h3>
                <p className="text-[11px] text-slate-500 truncate">
                  Manage client organizations, subscription plans, domains, and personnel
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={fetchClients}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 cursor-pointer"
                title="Refresh Clients"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const cols = [
                    { key: "name", label: "Client Name" },
                    { key: "email", label: "Email" },
                    { key: "plan", label: "Plan", accessor: (c) => c.subscription?.plan || "pro" },
                    { key: "websiteCount", label: "Domains" },
                    { key: "agentCount", label: "Personnel" },
                    { key: "status", label: "Status", accessor: (c) => (c.isActive !== false ? "Active" : "Suspended") }
                  ];
                  exportToCsv(filteredClients, cols, "Client_Infrastructure");
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={13} /> Export CSV
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={13} /> Add Client
              </button>
            </div>
          </div>

          {/* ── Clean White KPI Cards ────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Clients</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-900">{dashboardStats.total}</span>
                <span className="text-[10px] text-emerald-600 font-medium">{dashboardStats.active} active</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Active Domains</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-indigo-600">{dashboardStats.domains}</span>
                <span className="text-[10px] text-slate-500">Websites mapped</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Deployed Personnel</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-900">{dashboardStats.personnel}</span>
                <span className="text-[10px] text-slate-500">Agents & Staff</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Pro & Enterprise</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-emerald-600">{dashboardStats.highTier}</span>
                <span className="text-[10px] text-slate-500">Upgraded tiers</span>
              </div>
            </div>
          </div>

          {/* ── Compact Filter Bar ───────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search client name or email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-400"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* ── Compact Client Cards Grid ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {paginatedClients.pageItems.map((client) => {
              const planName = client.subscription?.plan || "pro";
              const isAct = client.isActive !== false;
              return (
                <div
                  key={client._id}
                  onClick={() => loadClientDetails(client)}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase truncate">{client.name}</h4>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isAct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                              }`}
                          >
                            {isAct ? "Active" : "Suspended"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          {client.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => loadClientDetails(client)}
                        title="View Ecosystem"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(client)}
                        title="Edit Client & Plan"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setResettingUser(client); setCustomPassword(""); setResetSuccess(false); }}
                        title="Reset Password"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md cursor-pointer"
                      >
                        <Key size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingClient(client)}
                        title="Delete Client"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 inline-flex items-center gap-1">
                        <Globe size={10} className="text-emerald-600" /> {client.websiteCount || 0} Domains
                      </span>
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 inline-flex items-center gap-1">
                        <Users size={10} className="text-amber-600" /> {client.agentCount || 0} Personnel
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-bold uppercase text-indigo-700 inline-flex items-center gap-1">
                        <Shield size={10} /> {planName} Plan
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600">View Ecosystem →</span>
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="col-span-full py-12 bg-white border border-slate-200 rounded-xl text-center space-y-1.5">
                <Building2 size={24} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No clients match your filter</p>
                <p className="text-[11px] text-slate-400">Adjust filters or click + Add Client to create one.</p>
              </div>
            )}
          </div>

          {filteredClients.length > 0 && (
            <PaginationControls
              currentPage={paginatedClients.currentPage}
              totalPages={paginatedClients.totalPages}
              totalItems={paginatedClients.totalItems}
              itemLabel="clients"
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* ── Create / Edit Client Modal (Portal) ──────────────── */}
      {showClientModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setShowClientModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                {editingClient ? "Edit Client Account" : "Add New Client"}
              </h3>
              <button type="button" onClick={() => setShowClientModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Entity / Client Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corporation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Master Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@acme.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {!editingClient && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={formData.showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-9 py-2 text-xs outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, showPassword: !formData.showPassword })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title={formData.showPassword ? "Hide password" : "Show password"}
                    >
                      {formData.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subscription Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                {editingClient && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Account Status</label>
                    <select
                      value={formData.isActive ? "active" : "suspended"}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowClientModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  {submitting ? "Saving..." : editingClient ? "Save Changes" : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirmation Modal (Portal) ───────────────── */}
      {deletingClient && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setDeletingClient(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Delete Client Account?</h4>
            <p className="text-xs text-slate-600">
              Remove <strong>{deletingClient.name}</strong> ({deletingClient.email}) from Client Infrastructure?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingClient(null)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteClient} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                Delete Client
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Password Reset Dialog Modal (Portal) ─────────────── */}
      {resettingUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Key size={15} className="text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {!resetSuccess ? (
              <form onSubmit={handleAdminResetPassword} className="p-4 space-y-3 text-xs">
                <p className="text-[11px] text-slate-600">
                  Target Account: <strong className="text-slate-900">{resettingUser.name}</strong> ({resettingUser.email})
                </p>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Custom Password (Optional)</label>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    {resetLoading ? "Updating..." : "Reset & Send Email"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 space-y-3 text-xs">
                <p className="text-xs font-semibold text-emerald-700">Password reset & dispatched via email.</p>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Temporary Password</span>
                  <span className="text-sm font-mono font-bold text-indigo-700 select-all">{tempPassword}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
