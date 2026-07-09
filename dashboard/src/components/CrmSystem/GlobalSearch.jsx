import React, { useState, useEffect, useRef } from "react";
import { Search, Command, X, Mail, Phone, ChevronRight, Zap } from "lucide-react";
import { api } from "../../api/client.js";
import { useNavigate, useLocation } from "react-router-dom";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const openSearch = () => setIsOpen(true);

    const handleKeyDown = (e) => {
      // CMD/CTRL + K
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("app:open-global-search", openSearch);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("app:open-global-search", openSearch);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const focusTimer = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      document.body.style.overflow = "hidden";
      return () => window.cancelAnimationFrame(focusTimer);
    } else {
      document.body.style.overflow = "auto";
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api(`/api/crm/search?q=${encodeURIComponent(query)}`);
        setResults(data || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result) => {
    setIsOpen(false);
    const pathPrefix = location.pathname.startsWith("/manager") ? "/manager" : location.pathname.startsWith("/client") ? "/client" : location.pathname.startsWith("/agent") ? "/agent" : "/sales";
    
    if (result.type === "company") {
      navigate(`${pathPrefix}?tab=crm&workspaceTab=companies&companyId=${result._id}`);
    } else if (result.type === "contact") {
      navigate(`${pathPrefix}?tab=crm&workspaceTab=contacts&contactId=${result._id}`);
    } else if (result.type === "opportunity") {
      navigate(`${pathPrefix}?tab=crm&workspaceTab=deals&dealId=${result._id}`);
    } else {
      navigate(`${pathPrefix}?leadId=${result._id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4 md:px-0">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />
      
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-900 text-lg font-bold placeholder:text-slate-300"
            placeholder="Search leads by name, email, or CRN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:flex">
            <Command size={10} /> K
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Searching Pipeline...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1" ref={resultsRef}>
              {results.map((result, index) => (
                <button
                  key={result._id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
                    index === selectedIndex ? "bg-indigo-50 border border-indigo-100" : "bg-transparent border border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 ${
                    index === selectedIndex ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {result.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 truncate">{result.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                        {result.pipelineStage}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Mail size={12} /> {result.email}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        <Zap size={12} className="fill-indigo-400/20" /> {result.crn}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className={index === selectedIndex ? "text-indigo-400" : "text-slate-200"} />
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Search size={32} className="text-slate-100" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">No matching leads found</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Command size={32} className="text-slate-100" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Type at least 2 characters to start</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 shadow-sm">↵</div>
              <span className="text-[10px] font-bold text-slate-400">Select</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 shadow-sm">↑</div>
                <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 shadow-sm">↓</div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 shadow-sm">ESC</div>
              <span className="text-[10px] font-bold text-slate-400">Close</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">CRM GLOBAL SEARCH</div>
        </div>
      </div>
    </div>
  );
}
