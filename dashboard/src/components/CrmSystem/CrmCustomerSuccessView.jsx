import React, { useState, useEffect } from "react";
import { ShieldCheck, Heart, User, CheckCircle, HelpCircle, Download, Printer } from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmCustomerSuccessView({ websiteId }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSuccessProfiles = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/customersuccess?websiteId=${websiteId}`);
      setProfiles(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) fetchSuccessProfiles();
  }, [websiteId]);

  const handleUpdateChecklist = async (key, val) => {
    if (!selectedProfile) return;
    try {
      const updatedChecklist = {
        ...selectedProfile.onboardingChecklist,
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
      fetchSuccessProfiles();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateRisk = async (risk) => {
    if (!selectedProfile) return;
    try {
      const res = await api(`/api/crm/customersuccess`, {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          customerId: selectedProfile.customerId?._id || selectedProfile.customerId,
          riskLevel: risk
        })
      });
      setSelectedProfile(res);
      fetchSuccessProfiles();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    const data = profiles.map(p => ({
      "Client Name": p.customerId?.name || p.customerId?.companyName || "Customer",
      "Onboarding Status": p.onboardingStatus || "Pending",
      "Health Score": p.healthScore || 100,
      "Adoption Score (%)": `${p.adoptionScore || 0}%`,
      "Risk Level": (p.riskLevel || "Low").toUpperCase()
    }));
    exportToCSV(data, `Customer_Success_Profiles_${new Date().toISOString().slice(0,10)}`);
  };

  const handleExportPDF = () => {
    const data = profiles.map(p => ({
      "Client Name": p.customerId?.name || p.customerId?.companyName || "Customer",
      "Onboarding": p.onboardingStatus || "Pending",
      "Health Score": String(p.healthScore || 100),
      "Risk Level": (p.riskLevel || "Low").toUpperCase()
    }));
    exportToPDF(data, `Customer_Success_Profiles_${new Date().toISOString().slice(0,10)}`, "CUSTOMER SUCCESS & RETENTION AUDIT REPORT");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl">
            <Heart size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900">Customer Success Hub</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client retention, health scores & onboarding tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Success Profiles to CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Success Profiles to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Success Profiles list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Client Profiles</h4>
            {profiles.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No customer success profiles.</p>
            ) : (
              <div className="space-y-3">
                {profiles.map(p => (
                  <div
                    key={p._id}
                    onClick={() => setSelectedProfile(p)}
                    className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedProfile?._id === p._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                  >
                    <div className="space-y-1">
                      <h5 className="text-xs font-black text-slate-800">{p.customerId?.name || "Customer Profile"}</h5>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Onboarding: {p.onboardingStatus} • Adoption: {p.adoptionScore}%</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.riskLevel === "high" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{p.riskLevel} Risk</span>
                      <span className="text-xs font-black text-indigo-600">Health: {p.healthScore}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportSingleRecordPDF(
                            `CUSTOMER SUCCESS DOSSIER - ${p.customerId?.name || "Client"}`,
                            {
                              "Client Name": p.customerId?.name || p.customerId?.companyName || "Client",
                              "Onboarding Status": p.onboardingStatus || "Pending",
                              "Health Score": `${p.healthScore || 100} / 100`,
                              "Product Adoption Rate": `${p.adoptionScore || 0}%`,
                              "Churn Risk Level": (p.riskLevel || "Low").toUpperCase(),
                              "Last Touchpoint": p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "-"
                            },
                            `Success_Profile_${(p.customerId?.name || "Client").replace(/\s+/g, '_')}`
                          );
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Export Single Profile PDF"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checklist & Risk Management Details */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
            {selectedProfile ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{selectedProfile.customerId?.name || "Customer Details"}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Success Score Profile</p>
                </div>

                {/* Risk Level Setting */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Set Risk Category</span>
                  <div className="flex gap-2">
                    {["low", "medium", "high"].map(r => (
                      <button
                        key={r}
                        onClick={() => handleUpdateRisk(r)}
                        className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl border transition-all ${selectedProfile.riskLevel === r ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Onboarding Checklist triggers */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Onboarding checklist progress</span>
                  <div className="space-y-2 text-xs font-bold text-slate-600">
                    {Object.keys(selectedProfile.onboardingChecklist || {}).map(itemKey => (
                      <label key={itemKey} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProfile.onboardingChecklist[itemKey]}
                          onChange={(e) => handleUpdateChecklist(itemKey, e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="capitalize">{itemKey.replace(/([A-Z])/g, " $1")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-10 text-center">
                <Heart size={32} className="text-slate-300 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a client profile to view checklist metrics</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
