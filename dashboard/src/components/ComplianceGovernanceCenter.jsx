import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Lock, Globe, FileText, CheckCircle2, AlertTriangle, Layers, Clock,
  RefreshCw, X, Plus, Save, UserCheck, ShieldAlert, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

export default function ComplianceGovernanceCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showDsarModal, setShowDsarModal] = useState(false);

  const [dsarForm, setDsarForm] = useState({
    requestType: "access",
    subjectEmail: "",
    details: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/compliance-governance/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load compliance governance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDsar = async (e) => {
    e.preventDefault();
    try {
      await api("/api/compliance-governance/dsar", {
        method: "POST",
        body: JSON.stringify(dsarForm)
      });
      setShowDsarModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateDsarStatus = async (id, status) => {
    try {
      await api(`/api/compliance-governance/dsar/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Compliance & Governance Center...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const securityPolicies = data?.securityPolicies || {};
  const doc = data?.doc || {};
  const dsarRequests = doc?.dsarRequests || [];
  const retentionPolicies = doc?.retentionPolicies || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Compliance & Governance Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Global Compliance Frameworks (GDPR, UAE PDPL, SOC 2, ISO 27001), DSAR Data Subject Portal & Retention Rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Compliance Telemetry"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowDsarModal(true)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Submit DSAR Request
          </button>
        </div>
      </div>

      {/* Global Frameworks Readiness Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Audit & Governance Audit Status</span>
            <h3 className="text-xl font-black text-white mt-1">International Standard Framework Readiness</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.overallCompliance}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">EU GDPR Readiness</span>
            <strong className="text-2xl font-black text-emerald-400">{summary.gdpr}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">UAE PDPL Readiness</span>
            <strong className="text-2xl font-black text-emerald-400">{summary.pdpl}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">SOC 2 Type II</span>
            <strong className="text-2xl font-black text-indigo-400">{summary.soc2}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">ISO 27001 ISMS</span>
            <strong className="text-2xl font-black text-indigo-400">{summary.iso27001}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">ISO 27701 PIMS</span>
            <strong className="text-2xl font-black text-emerald-400">{doc?.complianceScores?.iso27701Percent || 92.1}%</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          DSAR Data Subject Rights Portal ({dsarRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("retention")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "retention" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Data Retention & Auto-Archive Policies
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "security" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Security & Encryption Policies
        </button>
      </div>

      {/* Sub-Tab 1: DSAR Requests */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Data Subject Rights (DSAR) Request Queue</h3>
            <button
              onClick={() => setShowDsarModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} /> Submit DSAR
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Request Type</th>
                  <th className="px-6 py-4">Subject Email</th>
                  <th className="px-6 py-4">Requested Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {dsarRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No DSAR requests logged. Click "Submit DSAR" to create.</td>
                  </tr>
                ) : (
                  dsarRequests.map((reqItem) => (
                    <tr key={reqItem._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-200">
                          {reqItem.requestType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">{reqItem.subjectEmail}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">{new Date(reqItem.requestedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                          reqItem.status === "completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          {reqItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {reqItem.status === "pending" && (
                          <button
                            onClick={() => handleUpdateDsarStatus(reqItem._id, "completed")}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Retention Policies */}
      {activeTab === "retention" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
            <Clock size={18} className="text-emerald-600" /> Automated Data Retention & Archiving Schedules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            {retentionPolicies.map((pol, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">{pol.dataCategory}</span>
                  <span className="text-indigo-600 font-mono font-black">{pol.retentionYears} Years Retention</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-200/60">
                  <span>Auto-Archive: <strong className="text-emerald-600">{pol.autoArchive ? "ENABLED" : "OFF"}</strong></span>
                  <span>Auto-Purge: <strong className="text-rose-600">{pol.autoDelete ? "ENABLED" : "OFF"}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Security Policies */}
      {activeTab === "security" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
            <Lock size={18} className="text-indigo-600" /> Security Controls & Key Rotation Policies
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
            {Object.entries(securityPolicies).map(([key, value]) => (
              <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <span className="capitalize text-slate-600">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-black text-indigo-600 font-mono text-[10px]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showDsarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowDsarModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Submit Data Subject Request (DSAR)
              </h3>
              <button onClick={() => setShowDsarModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDsar} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Request Type *</label>
                <select
                  value={dsarForm.requestType}
                  onChange={(e) => setDsarForm({ ...dsarForm, requestType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                >
                  <option value="access">Right to Access Data</option>
                  <option value="export">Right to Export Data</option>
                  <option value="erasure">Right to Erasure (Be Forgotten)</option>
                  <option value="rectification">Right to Rectification</option>
                  <option value="restrict_processing">Right to Restrict Processing</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Data Subject Email *</label>
                <input
                  required
                  type="email"
                  value={dsarForm.subjectEmail}
                  onChange={(e) => setDsarForm({ ...dsarForm, subjectEmail: e.target.value })}
                  placeholder="e.g. user@enterprise.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowDsarModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-emerald-700">
                  Submit DSAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
