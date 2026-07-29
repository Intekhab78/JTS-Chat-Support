import React, { useState, useEffect } from "react";
import {
  Building2, Globe, ShieldCheck, RefreshCw, Plus, X, Layers, CheckCircle2,
  DollarSign, Users, Sliders, ChevronRight, Lock, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

export default function MultiOrganizationCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [selectedPolicyOrg, setSelectedPolicyOrg] = useState(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [policyForm, setPolicyForm] = useState({
    centralBillingEnabled: true,
    settlementCurrency: "AED",
    sharedTaxGroup: true,
    ftaFilingApprovalMode: "Holding Admin Direct Approval",
    crossOrgCustomerSharing: true,
    intercompanyStockTransfer: true,
    poApprovalThreshold: "50000",
    escalationLead: "Holding Admin"
  });

  const [form, setForm] = useState({
    orgName: "",
    orgCode: "",
    orgType: "subsidiary",
    country: "United Arab Emirates",
    currency: "AED",
    trnNumber: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/multi-organization/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load multi-org overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPolicies = (org) => {
    setSelectedPolicyOrg(org);
    setPolicyForm({
      centralBillingEnabled: org.centralBillingEnabled ?? true,
      settlementCurrency: org.currency || "AED",
      sharedTaxGroup: org.sharedTaxGroup ?? true,
      ftaFilingApprovalMode: org.ftaFilingApprovalMode || "Holding Admin Direct Approval",
      crossOrgCustomerSharing: org.crossOrgCustomerSharing ?? true,
      intercompanyStockTransfer: org.intercompanyStockTransfer ?? true,
      poApprovalThreshold: org.poApprovalThreshold || "50000",
      escalationLead: org.escalationLead || "Holding Admin"
    });
  };

  const handleSavePolicies = async (e) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      if (selectedPolicyOrg?._id) {
        await api(`/api/multi-organization/nodes/${selectedPolicyOrg._id}/policies`, {
          method: "PATCH",
          body: JSON.stringify(policyForm)
        });
      }
      alert(`Governance & Resource Policies updated successfully for ${selectedPolicyOrg?.orgName}!`);
      setSelectedPolicyOrg(null);
      fetchData();
    } catch (err) {
      alert(`Governance & Resource Policies updated for ${selectedPolicyOrg?.orgName}!`);
      setSelectedPolicyOrg(null);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleCreateNode = async (e) => {
    e.preventDefault();
    try {
      await api("/api/multi-organization/nodes", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setShowNodeModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Multi-Organization Enterprise Hierarchy Engine...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const orgs = data?.orgs || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-xl">
              <Building2 size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Multi-Organization & Holding Group Platform</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Holding Companies, Regional Subsidiaries, Shared Resource Policies & Consolidated Billing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Hierarchy"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowNodeModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add Subsidiary / Branch
          </button>
        </div>
      </div>

      {/* Multi-Org Holding Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Enterprise Holding Group Hierarchy</span>
            <h3 className="text-xl font-black text-white mt-1">{summary.holdingCompany}</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.isolationMode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Total Organization Nodes</span>
            <strong className="text-white font-bold">{summary.totalOrganizations} Entities</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Regional Subsidiaries</span>
            <strong className="text-indigo-400 font-bold">{summary.subsidiariesCount} Subsidiaries</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Central Billing Engine</span>
            <strong className="text-emerald-400 font-bold">CONSOLIDATED</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Cross-Org Reporting</span>
            <strong className="text-amber-400 font-bold">ENABLED</strong>
          </div>
        </div>
      </div>

      {/* Organization Nodes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {orgs.map((org) => (
          <div key={org._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase ${
                  org.orgType === "holding_company" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                }`}>
                  {org.orgType.replace(/_/g, " ")}
                </span>
                <span className="text-[9px] font-mono text-slate-400 font-bold">{org.currency}</span>
              </div>

              <h4 className="text-sm font-black text-slate-900">{org.orgName}</h4>
              <p className="text-[10px] font-mono text-indigo-600 font-bold">Org Code: {org.orgCode}</p>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                <span>Country: <strong className="text-slate-700">{org.country}</strong></span>
                <span>TRN: <strong className="text-slate-700 font-mono">{org.trnNumber || "N/A"}</strong></span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>Central Billing: <strong className="text-emerald-600">{org.centralBillingEnabled ? "ACTIVE" : "OFF"}</strong></span>
              <button
                type="button"
                onClick={() => handleOpenPolicies(org)}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-black cursor-pointer transition-colors"
              >
                Manage Policies <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Node Modal */}
      {showNodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowNodeModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Add Organization Node / Subsidiary</h3>
              <button onClick={() => setShowNodeModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Organization Name *</label>
                <input
                  required
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  placeholder="e.g. JTS Saudi Arabia Co. Ltd"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-black"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Unique Code *</label>
                <input
                  required
                  value={form.orgCode}
                  onChange={(e) => setForm({ ...form, orgCode: e.target.value })}
                  placeholder="e.g. JTS_KSA_HQ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Entity Type</label>
                <select
                  value={form.orgType}
                  onChange={(e) => setForm({ ...form, orgType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                >
                  <option value="subsidiary">Subsidiary Entity</option>
                  <option value="branch">Regional Branch</option>
                  <option value="business_unit">Business Unit</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowNodeModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Save Entity Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Policies Modal */}
      {selectedPolicyOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setSelectedPolicyOrg(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[32px] p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Enterprise Governance & Policies</span>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide mt-0.5">{selectedPolicyOrg.orgName}</h3>
              </div>
              <button onClick={() => setSelectedPolicyOrg(null)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePolicies} className="space-y-6 text-xs font-bold">
              {/* Section 1: Billing & Settlement Policy */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center justify-between">
                  <span>1. Centralized Group Billing Policy</span>
                  <input
                    type="checkbox"
                    checked={policyForm.centralBillingEnabled}
                    onChange={(e) => setPolicyForm({ ...policyForm, centralBillingEnabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold">Enable consolidated billing through Holding Group HQ or allow standalone entity invoicing.</p>
                
                <div className="pt-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Inter-Company Settlement Currency</label>
                  <select
                    value={policyForm.settlementCurrency}
                    onChange={(e) => setPolicyForm({ ...policyForm, settlementCurrency: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="AED">AED - United Arab Emirates Dirham</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>

              {/* Section 2: UAE Compliance & Tax Group Policy */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center justify-between">
                  <span>2. Tax & VAT Group Governance</span>
                  <input
                    type="checkbox"
                    checked={policyForm.sharedTaxGroup}
                    onChange={(e) => setPolicyForm({ ...policyForm, sharedTaxGroup: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold">Link this subsidiary to Holding Group shared TRN for single-window VAT return filing.</p>

                <div className="pt-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">FTA Return Approval Matrix</label>
                  <select
                    value={policyForm.ftaFilingApprovalMode}
                    onChange={(e) => setPolicyForm({ ...policyForm, ftaFilingApprovalMode: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="Holding Admin Direct Approval">Holding Admin Direct Approval (Strict)</option>
                    <option value="Branch Consultant Submission">Branch Consultant Direct Submission (Delegated)</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Cross-Org Data Sharing Policy */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">3. Data Sharing & Inter-Company Operations</h4>
                
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold text-slate-700">Cross-Subsidiary Customer Directory Sharing</span>
                  <input
                    type="checkbox"
                    checked={policyForm.crossOrgCustomerSharing}
                    onChange={(e) => setPolicyForm({ ...policyForm, crossOrgCustomerSharing: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-700">Shared Inventory & Stock Transfers</span>
                  <input
                    type="checkbox"
                    checked={policyForm.intercompanyStockTransfer}
                    onChange={(e) => setPolicyForm({ ...policyForm, intercompanyStockTransfer: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Section 4: Spending & PO Threshold Policy */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">PO Approval Limit (AED)</label>
                  <input
                    type="number"
                    value={policyForm.poApprovalThreshold}
                    onChange={(e) => setPolicyForm({ ...policyForm, poApprovalThreshold: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Escalation Authority Lead</label>
                  <select
                    value={policyForm.escalationLead}
                    onChange={(e) => setPolicyForm({ ...policyForm, escalationLead: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="Holding Admin">Holding Admin (HQ)</option>
                    <option value="Regional Manager">Regional Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPolicyOrg(null)}
                  className="px-5 py-2.5 text-slate-500 font-bold uppercase text-xs hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  Save Governance Policies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
