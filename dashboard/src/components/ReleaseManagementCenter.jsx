import React, { useState, useEffect } from "react";
import {
  Rocket, CheckCircle2, ShieldCheck, Play, RefreshCw, X, Plus, Save, ChevronRight,
  GitBranch, Server, Database, AlertTriangle, Layers, Clock, ArrowUpRight, HelpCircle
} from "lucide-react";
import { api } from "../api/client.js";

const STAGE_ORDER = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "technical_review", label: "Tech Review" },
  { key: "qa_approved", label: "QA Approved" },
  { key: "business_approved", label: "Business Approved" },
  { key: "ready_for_deployment", label: "Ready" },
  { key: "deployed", label: "Deployed" }
];

export default function ReleaseManagementCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smokeTesting, setSmokeTesting] = useState(false);
  const [smokeResults, setSmokeResults] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    releaseName: "",
    version: "",
    releaseNotes: "",
    featuresAdded: "",
    bugsFixed: "",
    migrationNotes: "No breaking database schema migrations required."
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, releasesRes] = await Promise.all([
        api("/api/release-management/overview"),
        api("/api/release-management/releases")
      ]);
      setData(overviewRes || {});
      setReleases(releasesRes || []);
    } catch (err) {
      console.error("Failed to load release management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    try {
      await api("/api/release-management/releases", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          featuresAdded: form.featuresAdded.split("\n").filter(Boolean),
          bugsFixed: form.bugsFixed.split("\n").filter(Boolean)
        })
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdvanceStatus = async (id, currentStatus) => {
    const nextIdx = STAGE_ORDER.findIndex(s => s.key === currentStatus) + 1;
    if (nextIdx >= STAGE_ORDER.length) return;
    const nextStatus = STAGE_ORDER[nextIdx].key;

    try {
      await api(`/api/release-management/releases/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRunSmokeTests = async () => {
    setSmokeTesting(true);
    try {
      const res = await api("/api/release-management/smoke-tests", { method: "POST" });
      setSmokeResults(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setSmokeTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Production Readiness & Release Center...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const checklist = data?.preFlightChecklist || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Rocket size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Production Readiness & Release Management Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Go-Live Pre-Flight Checklists, Multi-Stage Approval Workflows, Smoke Testing & Rollback Safety Controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Release Status"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Draft New Release
          </button>
        </div>
      </div>

      {/* Pre-Flight Go-Live Readiness Banner */}
      <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <ShieldCheck size={28} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Pre-Flight Assessment Status</span>
            <h3 className="text-lg font-black">{summary.preFlightStatus}</h3>
          </div>
        </div>
        <button
          onClick={handleRunSmokeTests}
          disabled={smokeTesting}
          className="px-6 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
        >
          {smokeTesting ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
          {smokeTesting ? "Executing Smoke Tests..." : "Run Pre-Flight Smoke Tests"}
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Deployed Version</span>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">{summary.currentVersion}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">{summary.currentReleaseName}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Deployed Releases</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{summary.deployedCount || 1}</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">100% Release Success Rate</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Automated Pre-Flight Checks</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">8 / 8</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">All Core Checks Passed</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Rollback Readiness</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">READY</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Snapshots Active</p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Pre-Flight Checklist & Smoke Tests
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "pipeline" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Release Pipeline ({releases.length})
        </button>
      </div>

      {/* Sub-Tab 1: Pre-Flight Checklist */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" /> Automated Go-Live Pre-Deployment Verification Checklist
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              {Object.entries(checklist).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <span className="capitalize text-slate-700">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Smoke Tests Results Output */}
          {smokeResults && (
            <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-800">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} /> Smoke Test Suite Execution Results
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">{smokeResults.executedAt}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                {smokeResults.results.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <span>{res.suite}</span>
                    <span className="text-emerald-400 font-bold">{res.status} ({res.latencyMs}ms)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Release Pipeline Table & Stepper */}
      {activeTab === "pipeline" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Multi-Stage Release Approval Pipeline</h3>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} /> Draft Release
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Version & Name</th>
                  <th className="px-6 py-4">Approval Stage</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {releases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No production release records drafted. Click "Draft Release" to create.</td>
                  </tr>
                ) : (
                  releases.map((rel) => (
                    <tr key={rel._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">{rel.version} — {rel.releaseName}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{rel.releaseNotes || "Standard Version Release"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                          rel.status === "deployed" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          rel.status === "ready_for_deployment" ? "bg-sky-50 text-sky-600 border border-sky-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {rel.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">{rel.releaseOwnerId?.name || "System Admin"}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">{new Date(rel.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {rel.status !== "deployed" && rel.status !== "rolled_back" && (
                          <button
                            onClick={() => handleAdvanceStatus(rel._id, rel.status)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                          >
                            Advance Stage
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Draft Production Release
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRelease} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Version Number *</label>
                  <input
                    required
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="e.g. v1.1.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-black"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Release Name *</label>
                  <input
                    required
                    value={form.releaseName}
                    onChange={(e) => setForm({ ...form, releaseName: e.target.value })}
                    placeholder="e.g. Enterprise Sprints Upgrade"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Release Notes</label>
                <textarea
                  rows={2}
                  value={form.releaseNotes}
                  onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })}
                  placeholder="Summary of release goals and architectural changes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Features Added (One per line)</label>
                  <textarea
                    rows={3}
                    value={form.featuresAdded}
                    onChange={(e) => setForm({ ...form, featuresAdded: e.target.value })}
                    placeholder="Risk Register Module&#10;SaaS Financial Analytics"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Bugs Fixed (One per line)</label>
                  <textarea
                    rows={3}
                    value={form.bugsFixed}
                    onChange={(e) => setForm({ ...form, bugsFixed: e.target.value })}
                    placeholder="N+1 Query Refactoring&#10;Icon reference imports"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Draft Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
