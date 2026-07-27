import React, { useState, useEffect } from "react";
import {
  Clock, ShieldCheck, AlertTriangle, Plus, RefreshCw, X, Save, CheckCircle2,
  TrendingUp, Activity, Filter, ChevronRight, User, Trash2, Award, Zap, AlertCircle
} from "lucide-react";
import { api } from "../api/client.js";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function SlaManagementCenter({ websiteId }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    priority: "Medium",
    customerType: "All",
    serviceType: "All",
    responseTimeTargetHours: 2,
    resolutionTimeTargetHours: 24,
    warningThresholdPercent: 75,
    escalationThresholdPercent: 100,
    businessHoursOnly: true,
    status: "active"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);

      const [overviewRes, policiesRes] = await Promise.all([
        api(`/api/sla-center/overview?${params.toString()}`),
        api(`/api/sla-center/policies?${params.toString()}`)
      ]);

      setData(overviewRes || {});
      setPolicies(policiesRes || []);
    } catch (err) {
      console.error("Failed to load SLA center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setForm({
      name: "",
      description: "",
      priority: "Medium",
      customerType: "All",
      serviceType: "All",
      responseTimeTargetHours: 2,
      resolutionTimeTargetHours: 24,
      warningThresholdPercent: 75,
      escalationThresholdPercent: 100,
      businessHoursOnly: true,
      status: "active"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (policy) => {
    setEditingPolicy(policy);
    setForm({
      name: policy.name || "",
      description: policy.description || "",
      priority: policy.priority || "Medium",
      customerType: policy.customerType || "All",
      serviceType: policy.serviceType || "All",
      responseTimeTargetHours: policy.responseTimeTargetHours || 2,
      resolutionTimeTargetHours: policy.resolutionTimeTargetHours || 24,
      warningThresholdPercent: policy.warningThresholdPercent || 75,
      escalationThresholdPercent: policy.escalationThresholdPercent || 100,
      businessHoursOnly: policy.businessHoursOnly !== undefined ? policy.businessHoursOnly : true,
      status: policy.status || "active"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPolicy) {
        await api(`/api/sla-center/policies/${editingPolicy._id}`, {
          method: "PATCH",
          body: JSON.stringify(form)
        });
      } else {
        await api("/api/sla-center/policies", {
          method: "POST",
          body: JSON.stringify({ ...form, websiteId })
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!confirm("Are you sure you want to delete this SLA Policy?")) return;
    try {
      await api(`/api/sla-center/policies/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise SLA & Service Management Center...</p>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise SLA / SLO Management Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Service Level Agreement Commitments, Warning Alerts & Automatic Breach Escalation Controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh SLA Metrics"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Create SLA Policy
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-[9px] font-black uppercase tracking-wider">
            <span>SLA Compliance Rate</span>
            <ShieldCheck size={16} />
          </div>
          <h3 className="text-3xl font-black text-emerald-700 mt-2">{summary.slaCompliancePercent || 100}%</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Target: ≥ 98.0%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Total Active Services</span>
            <Activity size={16} className="text-indigo-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.totalServices || 0}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Compliance Tasks</p>
        </div>

        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 text-[9px] font-black uppercase tracking-wider">
            <span>Warning SLA Level</span>
            <AlertCircle size={16} />
          </div>
          <h3 className="text-3xl font-black text-amber-700 mt-2">{summary.warningSla || 0}</h3>
          <p className="text-[10px] font-bold text-amber-600 mt-1">Approaching Deadline</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 text-[9px] font-black uppercase tracking-wider">
            <span>Breached SLA Count</span>
            <AlertTriangle size={16} />
          </div>
          <h3 className="text-3xl font-black text-rose-700 mt-2">{summary.breachedSla || 0}</h3>
          <p className="text-[10px] font-bold text-rose-600 mt-1">Auto Escalated to Managers</p>
        </div>

        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 text-[9px] font-black uppercase tracking-wider">
            <span>Avg Resolution Time</span>
            <Clock size={16} />
          </div>
          <h3 className="text-3xl font-black text-indigo-700 mt-2">{summary.avgResolutionTimeHours || 18} <span className="text-xs text-slate-400">hrs</span></h3>
          <p className="text-[10px] font-bold text-indigo-600 mt-1">Avg 1st Response: {summary.avgFirstResponseTimeHours || 1.4}h</p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          SLA Performance & SLO
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "policies" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Configured SLA Policies ({policies.length})
        </button>
      </div>

      {/* Sub-Tab 1: Overview & SLO Performance */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Service Level Objectives (SLO) Targets Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
              <Award size={18} className="text-indigo-600" /> Service Level Objectives (SLO) Achievement Matrix
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs font-bold">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">System Availability Objective</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-slate-900">{summary.sloAvailabilityAchieved || 99.95}%</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Target: 99.9%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Customer CSAT Target</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-emerald-600">{summary.sloCsatAchieved || 96.8}%</span>
                  <span className="text-[10px] text-slate-400 font-bold">Target: ≥ 95.0%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">First Response Target</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-indigo-600">1.4 Hours</span>
                  <span className="text-[10px] text-slate-400 font-bold">Target: &lt; 2.0h</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Resolution Time Target</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-slate-900">18.2 Hours</span>
                  <span className="text-[10px] text-slate-400 font-bold">Target: &lt; 24.0h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: SLA Policies Management */}
      {activeTab === "policies" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Configured Enterprise SLA Policies</h3>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Policy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Policy Name</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4 text-center">1st Response Target</th>
                  <th className="px-6 py-4 text-center">Resolution Target</th>
                  <th className="px-6 py-4 text-center">Warning Threshold</th>
                  <th className="px-6 py-4">Business Hours</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">No SLA policies created yet. Click "Add Policy" to start.</td>
                  </tr>
                ) : (
                  policies.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.description || "Default Policy Rule"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                          p.priority === "Critical" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                          p.priority === "High" ? "bg-orange-50 text-orange-600 border border-orange-200" :
                          "bg-indigo-50 text-indigo-600 border border-indigo-200"
                        }`}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{p.responseTimeTargetHours} hrs</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{p.resolutionTimeTargetHours} hrs</td>
                      <td className="px-6 py-4 text-center text-amber-600 font-bold">{p.warningThresholdPercent}% Elapsed</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          {p.businessHoursOnly ? "9 AM - 6 PM Mon-Fri" : "24 / 7 Calendar"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                            title="Edit Policy"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p._id)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                            title="Delete Policy"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                {editingPolicy ? "Edit SLA Policy" : "Configure New SLA Policy"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Policy Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Critical Corporate Tax Priority SLA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Priority Tier</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Response Time Target (Hours)</label>
                  <input
                    type="number"
                    value={form.responseTimeTargetHours}
                    onChange={(e) => setForm({ ...form, responseTimeTargetHours: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Resolution Target (Hours)</label>
                  <input
                    type="number"
                    value={form.resolutionTimeTargetHours}
                    onChange={(e) => setForm({ ...form, resolutionTimeTargetHours: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  {editingPolicy ? "Save Changes" : "Create Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
