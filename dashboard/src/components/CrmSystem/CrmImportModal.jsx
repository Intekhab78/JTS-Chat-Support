import React, { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmImportModal({
  open,
  onClose,
  websiteId,
  teamMembers,
  onSuccess,
  currentUser
}) {
  const [file, setFile] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(currentUser?._id || "");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith(".csv")) {
      setFile(selected);
      setError("");
    } else {
      setFile(null);
      setError("Please select a valid CSV (.csv) file.");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a CSV file first.");
      return;
    }
    if (!websiteId) {
      setError("Please select a website domain context first.");
      return;
    }

    setImporting(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("websiteId", websiteId);
      formData.append("ownerId", selectedOwner);

      // Perform multipart form upload
      const res = await fetch(`${api.defaults?.baseURL || ""}/api/crm/import`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to import CSV file");
      }

      onSuccess(data.message || `Successfully imported ${data.imported} leads!`);
      setFile(null);
      onClose();
    } catch (err) {
      setError(err.message || "Import failed. Please verify format.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-950 tracking-tight flex items-center gap-2">
              <Upload size={18} className="text-indigo-600" />
              Import Leads from CSV
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Bulk upload prospects to CRM</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-600 font-bold flex items-center gap-2 shrink-0">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4 overflow-y-auto pr-1 flex-1 [scrollbar-width:thin]">
          {/* File drag / upload card */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-50/5 transition-all space-y-2 group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv"
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
              <FileText size={20} />
            </div>
            
            {file ? (
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-950 truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1">
                  <CheckCircle2 size={10} /> Valid CSV Loaded ({(file.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-800">Select CRM Data Spreadsheet</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Supports only .csv format up to 5MB</p>
              </div>
            )}
          </div>

          {/* Target owner assignment */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 block">Default Owner Assignment</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-700 focus:bg-white transition-all outline-none"
            >
              <option value="">-- Assign to Me ({currentUser?.name || "Self"}) --</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.role || "sales"})</option>
              ))}
            </select>
          </div>

          {/* Sample template help */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Expected Column Headers</p>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
              Your CSV file should have a header row. Fields are mapped automatically:
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1 flex items-center justify-between">
                <span>name</span>
                <span className="text-rose-500" title="Required">*</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">email</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">phone</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">company</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">value</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">budget</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">requirement</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">priority</div>
              <div className="bg-white border border-slate-200 rounded-lg px-2 py-1">source</div>
            </div>
            <p className="text-[8px] font-bold text-slate-400 italic">
              Note: Duplicate email addresses within the selected website scope will be skipped.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 rounded-2xl py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing || !file}
              className="flex-1 bg-indigo-600 rounded-2xl py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Import Leads</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
