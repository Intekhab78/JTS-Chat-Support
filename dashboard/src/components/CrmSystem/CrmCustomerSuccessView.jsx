import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  Download,
  Printer,
  RefreshCw,
  Search,
  Plus,
  X,
  CheckCircle2
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmCustomerSuccessView({ websiteId }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchSuccessProfiles = async () => {
    setLoading(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${websiteId}` : "";
      const [profRes, custRes] = await Promise.allSettled([
        api(`/api/crm/customersuccess${qs}`),
        api(`/api/crm/customers${qs}`)
      ]);

      const list =
        profRes.status === "fulfilled" && Array.isArray(profRes.value) ? profRes.value : [];
      setProfiles(list);
      setCustomers(
        custRes.status === "fulfilled" && Array.isArray(custRes.value) ? custRes.value : []
      );

      if (selectedProfile) {
        const refreshed = list.find((p) => p._id === selectedProfile._id);
        setSelectedProfile(refreshed || null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load customer success profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuccessProfiles();
  }, [websiteId]);

  const getClientLabel = (p) =>
    p?.customerId?.name ||
    p?.customerId?.companyName ||
    p?.customerId?.email ||
    "Unnamed Client";

  const stats = useMemo(() => {
    const total = profiles.length;
    const avgHealth =
      total > 0
        ? Math.round(
          profiles.reduce((s, p) => s + Number(p.healthScore ?? 0), 0) / total
        )
        : 0;
    const avgAdoption =
      total > 0
        ? Math.round(
          profiles.reduce((s, p) => s + Number(p.adoptionScore ?? 0), 0) / total
        )
        : 0;
    const highRisk = profiles.filter(
      (p) => (p.riskLevel || "low").toLowerCase() === "high"
    ).length;
    return { total, avgHealth, avgAdoption, highRisk };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return profiles.filter((p) => {
      const r = (p.riskLevel || "low").toLowerCase();
      if (riskFilter !== "all" && r !== riskFilter) return false;
      if (!q) return true;
      return (
        getClientLabel(p).toLowerCase().includes(q) ||
        (p.customerId?.email || "").toLowerCase().includes(q) ||
        (p.onboardingStatus || "").toLowerCase().includes(q)
      );
    });
  }, [profiles, searchTerm, riskFilter]);

  const handleUpdateChecklist = async (key, val) => {
    if (!selectedProfile) return;
    try {
      const updatedChecklist = {
        ...(selectedProfile.onboardingChecklist || {}),
        [key]: val
      };

      const res = await api(`/api/crm/customersuccess/checklist`, {
        method: "PATCH",
        body: JSON.stringify({
          profileId: selectedProfile._id,
          checklist: updatedChecklist
        })
      });
      setSelectedProfile(res);
      toast.success("Checklist updated");
      fetchSuccessProfiles();
    } catch (err) {
      toast.error(err.message || "Failed to update checklist");
    }
  };

  const handleUpdateRisk = async (risk) => {
    if (!selectedProfile) return;
    try {
      const resolvedWebsiteId =
        selectedProfile.websiteId || (websiteId && websiteId !== "all" ? websiteId : undefined);
      const res = await api(`/api/crm/customersuccess`, {
        method: "POST",
        body: JSON.stringify({
          ...(resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : {}),
          customerId: selectedProfile.customerId?._id || selectedProfile.customerId,
          riskLevel: risk
        })
      });
      setSelectedProfile(res);
      toast.success(`Risk set to ${risk.toUpperCase()}`);
      fetchSuccessProfiles();
    } catch (err) {
      toast.error(err.message || "Failed to update risk level");
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newCustomerId) return;
    setCreating(true);
    try {
      const customer = customers.find((c) => c._id === newCustomerId);
      const resolvedWebsiteId =
        customer?.websiteId || (websiteId && websiteId !== "all" ? websiteId : undefined);
      const res = await api(`/api/crm/customersuccess`, {
        method: "POST",
        body: JSON.stringify({
          ...(resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : {}),
          customerId: newCustomerId,
          riskLevel: "low"
        })
      });
      toast.success("Success profile initialized");
      setShowAddModal(false);
      setNewCustomerId("");
      setSelectedProfile(res);
      fetchSuccessProfiles();
    } catch (err) {
      toast.error(err.message || "Failed to create profile");
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredProfiles.length === 0) {
      toast.info("No profiles to export");
      return;
    }
    const data = filteredProfiles.map((p) => ({
      "Client Name": getClientLabel(p),
      "Onboarding Status": p.onboardingStatus || "Pending",
      "Health Score": p.healthScore ?? 0,
      "Adoption Score (%)": `${p.adoptionScore ?? 0}%`,
      "Risk Level": (p.riskLevel || "Low").toUpperCase()
    }));
    exportToCSV(data, `Customer_Success_Profiles_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported CSV");
  };

  const handleExportPDF = () => {
    if (filteredProfiles.length === 0) {
      toast.info("No profiles to export");
      return;
    }
    const data = filteredProfiles.map((p) => ({
      "Client Name": getClientLabel(p),
      Onboarding: p.onboardingStatus || "Pending",
      "Health Score": String(p.healthScore ?? 0),
      "Risk Level": (p.riskLevel || "Low").toUpperCase()
    }));
    exportToPDF(
      data,
      `Customer_Success_Profiles_${new Date().toISOString().slice(0, 10)}`,
      "CUSTOMER SUCCESS & RETENTION AUDIT REPORT"
    );
  };

  const healthColor = (score) => {
    const n = Number(score ?? 0);
    if (n >= 80) return "text-emerald-600";
    if (n >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-lg shrink-0">
            <Heart size={14} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900 leading-tight">
              Customer Success Hub
            </h3>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Client retention, health scores & onboarding tracking
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={fetchSuccessProfiles}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          {customers.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
            >
              <Plus size={11} /> Add Profile
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
        </div>
      </div>

      {/* Real-Time KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Tracked Clients</p>
          <p className="text-base font-black text-slate-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Avg Health Score</p>
          <p className={`text-base font-black mt-0.5 ${healthColor(stats.avgHealth)}`}>
            {stats.total > 0 ? `${stats.avgHealth}/100` : "—"}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Avg Adoption</p>
          <p className="text-base font-black text-indigo-600 mt-0.5">
            {stats.total > 0 ? `${stats.avgAdoption}%` : "—"}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">High Risk Accounts</p>
          <p className={`text-base font-black mt-0.5 ${stats.highRisk > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {stats.highRisk}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <div className="lg:col-span-2 h-48 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Client Profiles List */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-100">
              <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider">
                Client Profiles ({filteredProfiles.length})
              </h4>

              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-[10px] font-semibold text-slate-700 w-36 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9.5px] font-bold text-slate-600 uppercase focus:outline-none"
                >
                  <option value="all">All Risk</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider text-center py-8">
                No customer success profiles found.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                {filteredProfiles.map((p) => {
                  const risk = (p.riskLevel || "low").toLowerCase();
                  const isSelected = selectedProfile?._id === p._id;
                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedProfile(p)}
                      className={`px-3 py-2 border rounded-xl flex justify-between items-center gap-2 cursor-pointer transition-colors ${isSelected
                          ? "border-indigo-500 bg-indigo-50/30"
                          : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50"
                        }`}
                    >
                      <div className="min-w-0">
                        <h5 className="text-[11px] font-black text-slate-800 truncate">
                          {getClientLabel(p)}
                        </h5>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                          Onboarding:{" "}
                          <span className="text-slate-600">{p.onboardingStatus || "pending"}</span>{" "}
                          • Adoption:{" "}
                          <span className="text-slate-600">{p.adoptionScore ?? 0}%</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${risk === "high"
                              ? "bg-rose-50 text-rose-600"
                              : risk === "medium"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                        >
                          {risk} Risk
                        </span>
                        <span className={`text-[10.5px] font-black ${healthColor(p.healthScore)}`}>
                          {p.healthScore ?? 0}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSingleRecordPDF(
                              `CUSTOMER SUCCESS DOSSIER - ${getClientLabel(p)}`,
                              {
                                "Client Name": getClientLabel(p),
                                "Onboarding Status": p.onboardingStatus || "Pending",
                                "Health Score": `${p.healthScore ?? 0} / 100`,
                                "Product Adoption Rate": `${p.adoptionScore ?? 0}%`,
                                "Churn Risk Level": (p.riskLevel || "Low").toUpperCase(),
                                "Last Touchpoint": p.updatedAt
                                  ? new Date(p.updatedAt).toLocaleDateString()
                                  : "-"
                              },
                              `Success_Profile_${getClientLabel(p).replace(/\s+/g, "_")}`
                            );
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Export Single Profile PDF"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Checklist & Risk Management Details */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between min-h-[260px]">
            {selectedProfile ? (
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-[11px] font-black text-slate-900 truncate">
                    {getClientLabel(selectedProfile)}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Health: {selectedProfile.healthScore ?? 0}/100 • Adoption:{" "}
                    {selectedProfile.adoptionScore ?? 0}%
                  </p>
                </div>

                {/* Risk Level Setting */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Risk Category
                  </span>
                  <div className="flex gap-1.5">
                    {["low", "medium", "high"].map((r) => (
                      <button
                        key={r}
                        onClick={() => handleUpdateRisk(r)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg border transition-colors ${(selectedProfile.riskLevel || "low") === r
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Onboarding Checklist */}
                <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Onboarding Checklist
                  </span>
                  {Object.keys(selectedProfile.onboardingChecklist || {}).length === 0 ? (
                    <p className="text-[9.5px] font-semibold text-slate-400">
                      No checklist items configured.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.keys(selectedProfile.onboardingChecklist).map((itemKey) => {
                        const checked = Boolean(selectedProfile.onboardingChecklist[itemKey]);
                        return (
                          <label
                            key={itemKey}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer text-[10.5px] font-bold text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => handleUpdateChecklist(itemKey, e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className={`capitalize ${checked ? "line-through text-slate-400" : ""}`}>
                              {itemKey.replace(/([A-Z])/g, " $1")}
                            </span>
                            {checked && <CheckCircle2 size={11} className="ml-auto text-emerald-500" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-1.5 py-8 text-center">
                <Heart size={22} className="text-slate-300" />
                <p className="text-[9.5px] font-black uppercase tracking-wider">
                  Select a client profile to manage risk & onboarding
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateProfile}
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Initialize Success Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Select CRM Customer
              </label>
              <select
                required
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              >
                <option value="">Choose a customer...</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.companyName || c.email} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newCustomerId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {creating ? "Saving..." : "Create Profile"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
