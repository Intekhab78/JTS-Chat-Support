import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import { CRM_STAGE_CONFIG } from "./CrmUIComponents.jsx";

export default function CrmStageEditor({ open, onClose, onChangeStages }) {
    const [stages, setStages] = useState(Object.entries(CRM_STAGE_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label, active: cfg.active !== false })));
    const [newKey, setNewKey] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    if (!open) return null;

    const handleToggleActive = (key) => {
        setStages(prev => prev.map(s => s.key === key ? { ...s, active: !s.active } : s));
    };

    const handleDragStart = (e, idx) => {
        setDragIndex(idx);
        try { e.dataTransfer.effectAllowed = 'move'; } catch (err) { }
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        if (dragOverIndex !== idx) setDragOverIndex(idx);
    };

    const handleDrop = (e, idx) => {
        e.preventDefault();
        if (dragIndex === null) return;
        const copy = [...stages];
        const [moved] = copy.splice(dragIndex, 1);
        copy.splice(idx, 0, moved);
        setStages(copy);
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const handleAdd = () => {
        const key = (newKey || newLabel).toLowerCase().replace(/\s+/g, "_");
        if (!key || stages.find(s => s.key === key)) return;
        const label = newLabel || newKey;
        const next = [...stages, { key, label, active: true }];
        setStages(next);
        setNewKey("");
        setNewLabel("");
    };

    const handleSave = () => {
        const defaultColors = [
            { color: "bg-violet-50 text-violet-600 border-violet-100", dot: "bg-violet-500" },
            { color: "bg-sky-50 text-sky-600 border-sky-100", dot: "bg-sky-500" },
            { color: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-500" },
            { color: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500" },
            { color: "bg-orange-50 text-orange-600 border-orange-100", dot: "bg-orange-500" },
            { color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" }
        ];

        Object.keys(CRM_STAGE_CONFIG).forEach(k => delete CRM_STAGE_CONFIG[k]);
        stages.forEach((s, idx) => {
            const cfg = defaultColors[idx % defaultColors.length];
            CRM_STAGE_CONFIG[s.key] = { label: s.label, color: cfg.color, dot: cfg.dot, active: s.active !== false };
        });

        if (typeof onChangeStages === "function") onChangeStages(stages.filter(s => s.active).map(s => s.key));
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900">Pipeline Stages</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Design your sales journey sequence.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Stages List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
                    {stages.map((s, idx) => (
                        <div
                            key={s.key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`group flex items-center justify-between gap-4 border border-slate-100 rounded-2xl px-5 py-4 bg-white transition-all hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 ${s.active ? '' : 'opacity-40 grayscale'} ${dragOverIndex === idx ? 'ring-2 ring-indigo-500 ring-offset-4 scale-[1.02]' : ''}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className="cursor-grab active:cursor-grabbing text-slate-200 group-hover:text-indigo-400 transition-colors">
                                    <GripVertical size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 leading-none">{s.label}</div>
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-2">{s.key}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleToggleActive(s.key)} 
                                    className={`p-2.5 rounded-xl transition-all ${s.active ? 'text-slate-300 hover:text-rose-500 hover:bg-rose-50' : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100'}`}
                                >
                                    {s.active ? <Trash2 size={18} /> : <Plus size={18} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Stage Name</label>
                            <input 
                                value={newLabel} 
                                onChange={e => setNewLabel(e.target.value)} 
                                placeholder="e.g. 'Proposal'" 
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">System Key</label>
                            <input 
                                value={newKey} 
                                onChange={e => setNewKey(e.target.value)} 
                                placeholder="proposal" 
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleAdd} 
                            disabled={!newLabel}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                        > 
                            <Plus size={16} /> Add Stage
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
