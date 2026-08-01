import React, { useState, useEffect, useRef } from "react";
import { Search, Building2, User, Plus, Check, ChevronDown, Sparkles, X, Save, Mail, Phone, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import { api } from "../api/client.js";

export default function SearchableCustomerSelect({
  label,
  value = "",
  onChange,
  onSelectEntity,
  placeholder = "Search or type new...",
  mode = "company", // "company" | "customer" | "both"
  websiteId,
  required = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Quick Add Modal State
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [savingQuick, setSavingQuick] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [existingConflictDoc, setExistingConflictDoc] = useState(null);
  const [quickForm, setQuickForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    trn: ""
  });

  // Keep search term synced with value prop
  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  // Fetch customers/companies on focus or websiteId change
  const fetchEntities = async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const url = websiteId ? `/api/crm/customers?websiteId=${websiteId}&limit=100` : `/api/crm/customers?limit=100`;
      const res = await api(url);
      const list = Array.isArray(res) ? res : (res.customers || res.data || []);
      setOptions(list);
    } catch (err) {
      console.error("Failed to load customer directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [websiteId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on mode and search term
  const filteredOptions = options.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (mode === "company") {
      return (item.companyName && item.companyName.toLowerCase().includes(term)) ||
             (item.name && item.name.toLowerCase().includes(term));
    }
    if (mode === "customer") {
      return (item.name && item.name.toLowerCase().includes(term)) ||
             (item.companyName && item.companyName.toLowerCase().includes(term));
    }
    return (item.name && item.name.toLowerCase().includes(term)) ||
           (item.companyName && item.companyName.toLowerCase().includes(term)) ||
           (item.email && item.email.toLowerCase().includes(term));
  });

  // Check exact match
  const hasExactMatch = options.some(item => {
    const target = mode === "company" ? (item.companyName || item.name) : item.name;
    return target && target.toLowerCase().trim() === searchTerm.toLowerCase().trim();
  });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onChange) onChange(val);
    setIsOpen(true);
  };

  const handleSelectOption = (item) => {
    const selectedName = mode === "company" ? (item.companyName || item.name) : item.name;
    setSearchTerm(selectedName);
    if (onChange) onChange(selectedName);
    if (onSelectEntity) onSelectEntity(item);
    setIsOpen(false);
  };

  const handleOpenQuickModal = (e) => {
    if (e) e.preventDefault();
    setQuickError("");
    setExistingConflictDoc(null);
    setQuickForm({
      name: mode === "customer" ? searchTerm : "",
      companyName: mode === "company" ? searchTerm : "",
      email: "",
      phone: "",
      trn: ""
    });
    setIsOpen(false);
    setShowQuickModal(true);
  };

  const handleQuickSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setQuickError("");
    setExistingConflictDoc(null);

    if (!quickForm.name && !quickForm.companyName) {
      setQuickError("Please enter a Name or Company Name.");
      return;
    }
    setSavingQuick(true);
    try {
      const payload = {
        ...quickForm,
        websiteId,
        recordType: "customer",
        pipelineStage: "new"
      };
      const createdCustomer = await api("/api/crm", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const selectedName = mode === "company" ? (createdCustomer.companyName || createdCustomer.name) : createdCustomer.name;
      setSearchTerm(selectedName);
      if (onChange) onChange(selectedName);
      if (onSelectEntity) onSelectEntity(createdCustomer);

      setShowQuickModal(false);
      fetchEntities();
    } catch (err) {
      const errMsg = err.message || "Failed to create customer entity";
      setQuickError(errMsg);
      
      // Check if email already exists in options
      if (quickForm.email) {
        const match = options.find(o => o.email && o.email.toLowerCase().trim() === quickForm.email.toLowerCase().trim());
        if (match) setExistingConflictDoc(match);
      }
    } finally {
      setSavingQuick(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          required={required}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onFocus={() => {
            fetchEntities();
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
        <div className="absolute right-2.5 pointer-events-none text-slate-400">
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
        </div>
      </div>

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-[999] max-h-60 overflow-y-auto custom-scrollbar p-1.5 animate-in fade-in duration-150">
          {/* Top Add New Option if search term is typed and no exact match */}
          {searchTerm && !hasExactMatch && (
            <button
              type="button"
              onClick={handleOpenQuickModal}
              className="w-full text-left p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center gap-2 mb-1 transition-all border border-indigo-100"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Plus size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                  Create New {mode === "company" ? "Company" : "Customer"}
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  "{searchTerm}"
                </p>
              </div>
            </button>
          )}

          {loading && options.length === 0 && (
            <div className="p-3 text-center text-xs font-bold text-slate-400 animate-pulse">
              Searching directory...
            </div>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => {
              const displayName = mode === "company" ? (item.companyName || item.name) : item.name;
              const subName = mode === "company" ? item.name : item.companyName;
              const isSelected = searchTerm && displayName.toLowerCase() === searchTerm.toLowerCase();

              return (
                <div
                  key={item._id}
                  onClick={() => handleSelectOption(item)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      mode === "company" ? "bg-slate-100 text-slate-600" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {mode === "company" ? <Building2 size={16} /> : <User size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-400 truncate">
                        {subName && <span>{subName}</span>}
                        {item.email && <span>• {item.email}</span>}
                        {item.trn && <span className="font-mono text-indigo-500 font-bold">• TRN: {item.trn}</span>}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                </div>
              );
            })
          ) : !searchTerm ? (
            <div className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Type to search or add new {mode === "company" ? "company" : "customer"}
            </div>
          ) : null}
        </div>
      )}

      {/* Quick Add Customer / Company Modal */}
      {showQuickModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  {mode === "company" ? <Building2 size={18} /> : <User size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Add New {mode === "company" ? "Company Profile" : "Customer Contact"}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Register complete details into CRM database</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowQuickModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            {/* Inline Conflict Error Banner */}
            {quickError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold space-y-2 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={17} className="shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-rose-900 uppercase tracking-wider text-[10px]">Conflict Error (Duplicate Detected)</p>
                    <p className="text-xs text-rose-700 font-semibold mt-0.5 leading-relaxed">{quickError}</p>
                  </div>
                </div>

                {existingConflictDoc && (
                  <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-rose-800 truncate">
                      Found: {existingConflictDoc.name} ({existingConflictDoc.companyName || "No Company"})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectOption(existingConflictDoc);
                        setShowQuickModal(false);
                        setQuickError("");
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm transition-all shrink-0"
                    >
                      Use Existing Profile
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={quickForm.companyName}
                  onChange={(e) => {
                    setQuickForm({ ...quickForm, companyName: e.target.value });
                    if (quickError) setQuickError("");
                  }}
                  placeholder="e.g. Al Reza Global LLC"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={quickForm.name}
                  onChange={(e) => {
                    setQuickForm({ ...quickForm, name: e.target.value });
                    if (quickError) setQuickError("");
                  }}
                  placeholder="e.g. Sheikh Mohammed"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={quickForm.email}
                    onChange={(e) => {
                      setQuickForm({ ...quickForm, email: e.target.value });
                      if (quickError) setQuickError("");
                    }}
                    placeholder="contact@company.com"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all ${
                      quickError ? "bg-rose-50/50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-500/20" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={quickForm.phone}
                    onChange={(e) => {
                      setQuickForm({ ...quickForm, phone: e.target.value });
                      if (quickError) setQuickError("");
                    }}
                    placeholder="+971 50 123 4567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickSubmit}
                  disabled={savingQuick}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingQuick ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  Save & Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
