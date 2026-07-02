import React, { useState, useEffect } from "react";
import { Shield, Settings, Plus, Key, ToggleLeft, ToggleRight, Trash2, Cpu, Globe, Users, Clock, AlertTriangle } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmAdminConsole({ websiteId }) {
  const [config, setConfig] = useState({ orgName: "Enterprise Org", fiscalYearStart: "January", timezone: "UTC", businessHours: [] });
  const [flags, setFlags] = useState([]);
  const [fields, setFields] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldForm, setFieldForm] = useState({ entityName: "Lead", fieldName: "", fieldType: "text", isRequired: false });

  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagForm, setFlagForm] = useState({ name: "", description: "", targetType: "tenant", isEnabled: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const configRes = await api(`/api/crm/admin/config?websiteId=${websiteId}`);
      if (configRes) setConfig(configRes);

      const flagsRes = await api(`/api/crm/admin/feature-flags?websiteId=${websiteId}`);
      setFlags(flagsRes || []);

      const fieldsRes = await api(`/api/crm/admin/custom-fields?websiteId=${websiteId}`);
      setFields(fieldsRes || []);

      const sessionRes = await api(`/api/crm/admin/sessions?websiteId=${websiteId}`);
      setSessions(sessionRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) fetchData();
  }, [websiteId]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await api(`/api/crm/admin/config`, {
        method: "POST",
        body: JSON.stringify({ ...config, websiteId })
      });
      alert("Organization branding settings saved successfully!");
      setConfig(res);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateField = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/admin/custom-fields`, {
        method: "POST",
        body: JSON.stringify({ ...fieldForm, websiteId })
      });
      setShowFieldForm(false);
      setFieldForm({ entityName: "Lead", fieldName: "", fieldType: "text", isRequired: false });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/admin/feature-flags`, {
        method: "POST",
        body: JSON.stringify({ ...flagForm, websiteId })
      });
      setShowFlagForm(false);
      setFlagForm({ name: "", description: "", targetType: "tenant", isEnabled: false });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await api(`/api/crm/admin/sessions/revoke/${id}`, { method: "POST" });
      alert("Trusted device login session revoked.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5"><Shield size={14} className="text-indigo-500" /> SaaS Administration Center</h3>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Root Control Panel</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization settings */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Globe size={14} className="text-indigo-500" /> Org Settings & Branding</h4>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Company Name</label>
              <input value={config.orgName} onChange={(e) => setConfig({ ...config, orgName: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Timezone</label>
                <input value={config.timezone} onChange={(e) => setConfig({ ...config, timezone: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fiscal Year Start</label>
                <input value={config.fiscalYearStart} onChange={(e) => setConfig({ ...config, fiscalYearStart: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase rounded-2xl transition-all">Save Profile Settings</button>
          </form>
        </div>

        {/* Custom Fields Constructor */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Users size={14} className="text-indigo-500" /> Custom Fields Registry</h4>
            <button onClick={() => setShowFieldForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-0.5"><Plus size={12} /> Add Field</button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {fields.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No custom fields defined</p>
            ) : (
              fields.map(f => (
                <div key={f._id} className="p-3 bg-slate-50/50 border rounded-xl flex justify-between items-center text-xs font-bold text-slate-600">
                  <div>
                    <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mr-2">{f.entityName}</span>
                    <span className="text-slate-800">{f.fieldName}</span>
                  </div>
                  <span className="text-[8px] font-black uppercase text-slate-400">{f.fieldType}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feature Flags console */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Cpu size={14} className="text-indigo-500" /> Feature Flags</h4>
            <button onClick={() => setShowFlagForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-0.5"><Plus size={12} /> Add Flag</button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {flags.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No feature flags configured</p>
            ) : (
              flags.map(fl => (
                <div key={fl._id} className="p-3 border rounded-xl flex justify-between items-center text-xs font-bold">
                  <div>
                    <p className="text-[10px] font-black text-slate-800">{fl.name}</p>
                    <p className="text-[8px] text-slate-400 uppercase">{fl.description}</p>
                  </div>
                  {fl.isEnabled ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trusted Session Audit log */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5"><Key size={14} className="text-indigo-500" /> Trusted Session Audits</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-slate-600">
            <thead>
              <tr className="border-b text-[8px] font-black uppercase text-slate-400">
                <th className="py-2">User Email</th>
                <th className="py-2">Device</th>
                <th className="py-2">IP Address</th>
                <th className="py-2">Logon Time</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No active trusted sessions</td>
                </tr>
              ) : (
                sessions.map(s => (
                  <tr key={s._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3">{s.userId?.email || "N/A"}</td>
                    <td className="py-3">{s.device} ({s.browser})</td>
                    <td className="py-3">{s.ipAddress}</td>
                    <td className="py-3">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${s.revokedAt ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {s.revokedAt ? "revoked" : "active"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {!s.revokedAt && (
                        <button onClick={() => handleRevokeSession(s._id)} className="text-rose-500 hover:text-rose-600">Revoke</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Fields Modal */}
      {showFieldForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowFieldForm(false)} />
          <form onSubmit={handleCreateField} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Define Custom Field</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Entity</label>
                <select value={fieldForm.entityName} onChange={(e) => setFieldForm({ ...fieldForm, entityName: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="Lead">CRM Lead</option>
                  <option value="Ticket">Support Ticket</option>
                  <option value="Invoice">Finance Invoice</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Field Type</label>
                <select value={fieldForm.fieldType} onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="text">Text Input</option>
                  <option value="number">Number Input</option>
                  <option value="boolean">Boolean Switch</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Attribute Label Name</label>
              <input required value={fieldForm.fieldName} onChange={(e) => setFieldForm({ ...fieldForm, fieldName: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Register Field</button>
          </form>
        </div>
      )}

      {/* Feature Flag Modal */}
      {showFlagForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowFlagForm(false)} />
          <form onSubmit={handleCreateFlag} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Add Feature Flag</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Flag Name Identifier</label>
              <input required value={flagForm.name} onChange={(e) => setFlagForm({ ...flagForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description</label>
              <input value={flagForm.description} onChange={(e) => setFlagForm({ ...flagForm, description: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Create Flag</button>
          </form>
        </div>
      )}
    </div>
  );
}
