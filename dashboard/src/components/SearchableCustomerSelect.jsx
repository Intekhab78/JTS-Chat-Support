import React, { useState, useEffect, useRef } from "react";
import { Search, Building2, User, Plus, Check, ChevronDown, Sparkles } from "lucide-react";
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

  const handleAddNew = () => {
    if (onChange) onChange(searchTerm);
    setIsOpen(false);
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
              onClick={handleAddNew}
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
    </div>
  );
}
