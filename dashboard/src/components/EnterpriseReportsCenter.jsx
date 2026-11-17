import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, FunnelChart, Funnel, LabelList
} from "recharts";
import {
  Briefcase, Users, LayoutDashboard, Ticket, MessageCircle, DollarSign,
  Settings, Download, Calendar, Activity, ShieldAlert, TrendingUp, TrendingDown, Minus, Zap, Filter, FileText, FileSpreadsheet, FileBox, X, AlertCircle
} from "lucide-react";
import { api } from "../api/client.js";
import RealTimeActivityCenter from "./RealTimeActivityCenter.jsx";
import EnterpriseBiCenter from "./EnterpriseBiCenter.jsx";
import { exportToCSV, exportToExcel, exportToPDF } from "../utils/exportUtils.js";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useWebsite } from "../context/WebsiteContext.jsx";
import { formatCurrency } from "../utils/currencyFormatter.js";

const REPORT_COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

function EmptyState({ title = "Not enough data", message = "We need a bit more data to calculate these insights.", actionText = "Refresh Data", onAction }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 bg-white/70 border border-slate-200/80 rounded-2xl p-5 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Activity size={22} />
      </div>
      <h3 className="text-sm font-black text-slate-800 tracking-tight mb-1">{title}</h3>
      <p className="text-xs font-semibold text-slate-500 mb-4 max-w-sm">{message}</p>
      {onAction && (
        <button onClick={onAction} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wider uppercase rounded-xl transition-colors shadow-sm">
          {actionText}
        </button>
      )}
    </div>
  );
}

function ExportMenu({ data, title }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (type) => {
    // Transform data for export based on the dashboard type.
    // For simplicity, we assume `data` is an array of objects to export, or we just export the raw JSON object stringified for demo.
    // In a real app, we would parse out the metrics to a flat array.
    const flatData = Array.isArray(data) ? data : (data ? [{ ...(data.metrics || {}), ...data }] : []);

    if (type === 'csv') exportToCSV(flatData, `${title.replace(/\s+/g, '_')}_Report`);
    if (type === 'xlsx') exportToExcel(flatData, `${title.replace(/\s+/g, '_')}_Report`);
    if (type === 'pdf') exportToPDF(flatData, `${title.replace(/\s+/g, '_')}_Report`, title);
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
      >
        <Download size={14} /> Export
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
          <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors text-left border-b border-slate-100">
            <FileText size={16} /> Export as PDF
          </button>
          <button onClick={() => handleExport('xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left border-b border-slate-100">
            <FileSpreadsheet size={16} /> Export as Excel
          </button>
          <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left">
            <FileBox size={16} /> Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, colorClass, trend }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-xl p-4 shadow-xs hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`p-2 rounded-xl text-white shadow-xs ${colorClass}`}>
          <Icon size={15} />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-black text-slate-900 tracking-tight truncate">{value}</h3>
        {trend !== undefined && (
          <span className={`text-[10px] font-black flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-400'}`}>
            {isPositive ? '↑' : isNegative ? '↓' : '•'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] font-bold text-slate-400 mt-1">{hint}</p>}
    </article>
  );
}

function ExecutiveDashboard({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(["clients", "websites", "revenue", "csat"]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await api(`/api/analytics/enterprise/executive?range=${reportRange}${websiteId ? `&websiteId=${websiteId}` : ""}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
        const profile = await api('/api/auth/me');
        if (profile?.dashboardPreferences?.executiveLayout) {
          setLayout(profile.dashboardPreferences.executiveLayout);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, websiteId]);

  const saveLayout = async (newLayout) => {
    setLayout(newLayout);
    try {
      await api('/api/users/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ dashboardPreferences: { executiveLayout: newLayout } })
      });
    } catch (e) {
      console.error("Failed to save layout", e);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(layout);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    saveLayout(items);
  };

  if (loading && !data) return <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-wider animate-pulse">Loading Executive Data...</div>;
  if (!data) return <EmptyState title="No Executive Data" message="Unable to load executive summary data." actionText="Refresh" onAction={() => setReportRange && setReportRange(reportRange)} />;

  const widgets = {
    clients: <MetricCard label="Active Clients" value={data.totalClients?.value ?? data.totalClients} trend={data.totalClients?.trend} hint="Registered client accounts" icon={Users} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" />,
    websites: <MetricCard label="Active Websites" value={data.activeWebsites?.value ?? data.activeWebsites} trend={data.activeWebsites?.trend} hint="Domains with active tracking" icon={LayoutDashboard} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />,
    revenue: <MetricCard label="Total Revenue (MRR)" value={formatCurrency(Number(data.mrr?.value ?? data.mrr ?? 0))} trend={data.mrr?.trend} hint="Estimated monthly recurring" icon={DollarSign} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />,
    csat: <MetricCard label="CSAT Score" value={`${data.csat?.value ?? data.csat}%`} trend={data.csat?.trend} hint="Average Customer Satisfaction" icon={Activity} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={() => setIsEditing(!isEditing)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border ${isEditing ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          <Settings size={12} className="inline mr-1.5" /> {isEditing ? 'Done Editing' : 'Customize Dashboard'}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="executive-widgets" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {layout.map((widgetId, index) => (
                <Draggable key={widgetId} draggableId={widgetId} index={index} isDragDisabled={!isEditing}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? "opacity-50" : ""}
                      style={{ ...provided.draggableProps.style, cursor: isEditing ? 'grab' : 'default' }}
                    >
                      {isEditing && (
                        <div className="bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-t-xl text-center cursor-grab">
                          Drag to Reorder
                        </div>
                      )}
                      {widgets[widgetId]}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white text-slate-900 p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Growth Trajectory</h3>
              <p className="text-slate-500 text-[11px] font-medium mt-0.5">Lead acquisition and daily conversion pipeline velocity.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 rounded-xl">
                <span className="text-xs font-bold text-slate-600">Total Leads Acquired</span>
                <span className="text-sm font-black text-slate-900">{data.totalLeads?.value ?? data.totalLeads}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 rounded-xl">
                <span className="text-xs font-bold text-slate-600">New Leads Today</span>
                <span className="text-sm font-black text-emerald-600">+{data.newLeadsToday?.value ?? data.newLeadsToday}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Operational Queue</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-center">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Open Tickets</span>
              <span className="text-2xl font-black text-slate-900">{data.openTickets?.value ?? data.openTickets}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-xl text-center">
              <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Resolved</span>
              <span className="text-2xl font-black text-emerald-700">{data.resolvedTickets?.value ?? data.resolvedTickets}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ websiteId: "", agentId: "", clientId: "", service: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters, ...(websiteId && !filters.websiteId ? { websiteId } : {}) });
        // Clean empty filters
        for (const [key, value] of Array.from(queryParams.entries())) {
          if (!value) queryParams.delete(key);
        }
        const result = await api(`/api/analytics/enterprise/leads?${queryParams.toString()}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, filters, websiteId]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Lead Analytics...</div>;
  if (!data) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
            <Filter size={13} className="text-indigo-500" /> Filters:
          </div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="websiteId" placeholder="Website ID" value={filters.websiteId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="agentId" placeholder="Agent ID" value={filters.agentId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="service" placeholder="Service Type" value={filters.service} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <MetricCard label="Conversion Rate" value={`${data.conversionRate}%`} hint="Leads won vs processed" icon={Activity} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Won Deals" value={data.wonLeads} hint="Successfully closed leads" icon={Briefcase} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Lost Deals" value={data.lostLeads} hint="Leads marked as lost" icon={ShieldAlert} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 mb-6">Leads Over Time</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Leads by Source</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.leadsBySource?.length ? data.leadsBySource : [{ name: "No Data", count: 1 }]} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} stroke="none">
                  {(data.leadsBySource?.length ? data.leadsBySource : [{ name: "No Data", count: 1 }]).map((_, i) => (
                    <Cell key={i} fill={data.leadsBySource?.length ? REPORT_COLORS[i % REPORT_COLORS.length] : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Leads by Service</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(data.leadsByService || []).map((item) => {
                  const raw = String(item.name || "General");
                  const reqMatch = raw.match(/(?:Requirement|Requierment)\s*:\s*(.+)$/i);
                  const clean = (reqMatch ? reqMatch[1] : raw).replace(/\s+/g, " ").trim();
                  return {
                    ...item,
                    fullName: clean,
                    shortName: clean.length > 22 ? `${clean.slice(0, 20)}...` : clean
                  };
                })}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} width={145} />
                <Tooltip
                  formatter={(value, _name, props) => [value, props?.payload?.fullName || "Leads"]}
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                  {(data.leadsByService || []).map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Leads by Website</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leadsByWebsite} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} width={110} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={26}>
                  {(data.leadsByWebsite || []).map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Lead Pipeline Funnel</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Funnel dataKey="value" data={data.funnel} isAnimationActive>
                  {(data.funnel || []).map((_, i) => (
                    <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />
                  ))}
                  <LabelList position="right" fill="#334155" stroke="none" dataKey="name" fontSize={11} fontWeight={800} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100">
            {(data.funnel || []).map((stage, i) => (
              <span key={stage.name} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-[10px] font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                <span className="capitalize">{stage.name}:</span>
                <span className="font-black text-slate-900">{stage.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ websiteId: "", agentId: "", clientId: "", department: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters, ...(websiteId && !filters.websiteId ? { websiteId } : {}) });
        for (const [key, value] of Array.from(queryParams.entries())) {
          if (!value) queryParams.delete(key);
        }
        const result = await api(`/api/analytics/enterprise/tickets?${queryParams.toString()}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, filters, websiteId]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Ticket Analytics...</div>;
  if (!data) return <EmptyState title="No Ticket Data" message="There are no tickets matching these filters." actionText="Clear Filters" onAction={() => setFilters({ websiteId: "", agentId: "", clientId: "", department: "" })} />;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
            <Filter size={13} className="text-indigo-500" /> Filters:
          </div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="websiteId" placeholder="Website ID" value={filters.websiteId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="agentId" placeholder="Agent ID" value={filters.agentId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="department" placeholder="Department" value={filters.department} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard label="Open Tickets" value={data.openCount} hint="Currently unresolved" icon={Ticket} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Resolved Tickets" value={data.resolvedCount} hint="Closed successfully" icon={MessageCircle} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Avg Resolution" value={data.avgResolutionTime} hint="Time to close" icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
        <MetricCard label="SLA Compliance" value={data.slaCompliance} hint="Target met rate" icon={ShieldAlert} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 mb-6">Ticket Volume Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ticketsOverTime}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorTickets)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Tickets by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ticketsByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} width={100} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                  {data.ticketsByCategory?.map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Tickets by Department</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ticketsByDepartment}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                  {data.ticketsByDepartment?.map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

function AgentPerformanceAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ websiteId: "", clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters, ...(websiteId && !filters.websiteId ? { websiteId } : {}) });
        for (const [key, value] of Array.from(queryParams.entries())) {
          if (!value) queryParams.delete(key);
        }
        const result = await api(`/api/analytics/enterprise/agents?${queryParams.toString()}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, filters, websiteId]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Agent Analytics...</div>;
  if (!data) return <EmptyState title="No Agent Data" message="There is no agent performance data matching these filters." actionText="Clear Filters" onAction={() => setFilters({ websiteId: "", clientId: "" })} />;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
            <Filter size={13} className="text-indigo-500" /> Filters:
          </div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
          <input type="text" name="websiteId" placeholder="Website ID" value={filters.websiteId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <MetricCard label="Total Agents" value={data.metrics?.totalAgents ?? 0} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Avg Productivity" value={data.metrics?.avgProductivity ?? 0} hint="Platform wide score" icon={Activity} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Avg CSAT" value={data.metrics?.avgCsat ?? "0%"} hint="Customer Satisfaction" icon={MessageCircle} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top Performers */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-indigo-500" /> Top Performers</h3>
          <div className="space-y-4">
            {(data.topPerformers || []).map((agent, i) => {
              const rankColors = ["from-amber-400 to-yellow-500 shadow-amber-400/20", "from-slate-300 to-slate-400 shadow-slate-300/20", "from-amber-600 to-amber-700 shadow-amber-600/20"];
              const badgeBg = i < 3 ? rankColors[i] : "from-slate-100 to-slate-200 text-slate-500";
              return (
                <div key={agent._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${badgeBg} text-white flex items-center justify-center font-black text-xs shadow-sm`}>{i + 1}</div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{agent.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{agent.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-indigo-600">{agent.productivityScore} <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span></p>
                    <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-wider mt-1">Excellent</span>
                  </div>
                </div>
              );
            })}
            {(!data.topPerformers || data.topPerformers.length === 0) && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>

        {/* Top Support */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Ticket size={20} className="text-emerald-500" /> Top Support Agents</h3>
          <div className="space-y-4">
            {(data.topSupport || []).map((agent, i) => {
              const rankColors = ["from-amber-400 to-yellow-500 shadow-amber-400/20", "from-slate-300 to-slate-400 shadow-slate-300/20", "from-amber-600 to-amber-700 shadow-amber-600/20"];
              const badgeBg = i < 3 ? rankColors[i] : "from-slate-100 to-slate-200 text-slate-500";
              return (
                <div key={agent._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${badgeBg} text-white flex items-center justify-center font-black text-xs shadow-sm`}>{i + 1}</div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{agent.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">CSAT: {agent.csat}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{agent.resolvedTickets} <span className="text-[10px] text-slate-400 font-bold uppercase">Resolved</span></p>
                    <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-wider mt-1">SLA MET</span>
                  </div>
                </div>
              );
            })}
            {(!data.topSupport || data.topSupport.length === 0) && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>

        {/* Top Sales */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><DollarSign size={20} className="text-amber-500" /> Top Sales Agents</h3>
          <div className="space-y-4">
            {(data.topSales || []).map((agent, i) => {
              const rankColors = ["from-amber-400 to-yellow-500 shadow-amber-400/20", "from-slate-300 to-slate-400 shadow-slate-300/20", "from-amber-600 to-amber-700 shadow-amber-600/20"];
              const badgeBg = i < 3 ? rankColors[i] : "from-slate-100 to-slate-200 text-slate-500";
              return (
                <div key={agent._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${badgeBg} text-white flex items-center justify-center font-black text-xs shadow-sm`}>{i + 1}</div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{agent.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">Eff.: {Math.min(100, agent.productivityScore + 10)}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-amber-600">{agent.wonDeals} <span className="text-[10px] text-slate-400 font-bold uppercase">Won</span></p>
                    <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-wider mt-1">WIN RATE</span>
                  </div>
                </div>
              );
            })}
            {(!data.topSales || data.topSales.length === 0) && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters, ...(websiteId && !filters.websiteId ? { websiteId } : {}) });
        for (const [key, value] of Array.from(queryParams.entries())) {
          if (!value) queryParams.delete(key);
        }
        const result = await api(`/api/analytics/enterprise/websites?${queryParams.toString()}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, filters, websiteId]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Website Analytics...</div>;
  if (!data) return <EmptyState title="No Website Data" message="We need a bit more data to calculate these insights." actionText="Refresh Data" onAction={() => window.location.reload()} />;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
            <Filter size={13} className="text-indigo-500" /> Filters:
          </div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard label="Total Visitors" value={data.metrics.visitors} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Chat Sessions" value={data.metrics.chatSessions} icon={MessageCircle} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
        <MetricCard label="Leads Generated" value={data.metrics.leadsGenerated} icon={Briefcase} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Tickets Created" value={data.metrics.ticketsCreated} icon={Ticket} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
        <MetricCard label="Conversion Rate" value={data.metrics.conversionRate} hint="Visitor to Lead" icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><LayoutDashboard size={20} className="text-indigo-500" /> Website Comparison (Visitors)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.websiteComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="domain" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Bar dataKey="visitors" radius={[8, 8, 0, 0]} barSize={40}>
                  {data.websiteComparison?.map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-500" /> Top Performing Websites</h3>
          <div className="space-y-4">
            {data.performanceRanking.map((site, i) => (
              <div key={site._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">{i + 1}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{site.name}</p>
                    <p className="text-xs text-slate-500">{site.domain}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">{site.conversionRate}% <span className="text-[10px] text-slate-400 font-bold uppercase">Conv.</span></p>
                </div>
              </div>
            ))}
            {data.performanceRanking.length === 0 && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerInsightsAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters, ...(websiteId && !filters.websiteId ? { websiteId } : {}) });
        for (const [key, value] of Array.from(queryParams.entries())) {
          if (!value) queryParams.delete(key);
        }
        const result = await api(`/api/analytics/enterprise/customers?${queryParams.toString()}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, filters, websiteId]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Customer Insights...</div>;
  if (!data) return <EmptyState title="No Customer Data" message="There is no customer data matching these filters." actionText="Clear Filters" onAction={() => setFilters({ clientId: "" })} />;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
            <Filter size={13} className="text-indigo-500" /> Filters:
          </div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-28 placeholder:text-slate-400" />
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <MetricCard label="Total Customers" value={data.metrics.totalCustomers} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Active Customers" value={data.metrics.activeCustomers} icon={Briefcase} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Retention Rate" value={data.metrics.retentionRate} icon={TrendingUp} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
        <MetricCard label="Churn Rate" value={data.metrics.churnRate} icon={TrendingDown} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
        <MetricCard label="CSAT" value={data.metrics.customerSatisfaction} icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Customer Growth Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.growthTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={4} dot={{ r: 4, fill: "#14b8a6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Customers by Region</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.customerByRegion.length ? data.customerByRegion : [{ name: "No Data", count: 1 }]} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} stroke="none">
                  {(data.customerByRegion.length ? data.customerByRegion : [{ name: "No Data", count: 1 }]).map((_, i) => (
                    <Cell key={i} fill={data.customerByRegion.length ? REPORT_COLORS[i % REPORT_COLORS.length] : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ clientId: "" });
  const [targetGoal, setTargetGoal] = useState(() => {
    const saved = Number(localStorage.getItem("enterprise_mrr_target"));
    return Number.isFinite(saved) && saved > 0 ? saved : 20000;
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters, ...(websiteId ? { websiteId } : {}) });
        for (const [key, value] of Array.from(queryParams.entries())) {
          if (!value) queryParams.delete(key);
        }
        const result = await api(`/api/analytics/enterprise/revenue?${queryParams.toString()}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, filters, websiteId]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleTargetChange = (val) => {
    const num = Math.max(1000, Number(val) || 1000);
    setTargetGoal(num);
    localStorage.setItem("enterprise_mrr_target", String(num));
  };

  if (loading && !data) return <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-wider animate-pulse">Loading Revenue Data...</div>;
  if (!data) return <EmptyState title="No Revenue Data" message="Unable to fetch revenue metrics for these filters." actionText="Clear Filters" onAction={() => setFilters({ clientId: "" })} />;

  const chartDataWithTarget = (data.revenueGrowth || []).map((item) => ({
    ...item,
    target: targetGoal
  }));

  const mrrNumeric = parseFloat(String(data.metrics?.mrr || "0").replace(/[^0-9.]/g, "")) || 0;
  const targetPercent = Math.min(100, Math.round((mrrNumeric / targetGoal) * 100));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
            <Filter size={13} className="text-indigo-500" /> Filters:
          </div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all w-32 placeholder:text-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MRR Goal:</span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={targetGoal}
            onChange={(e) => handleTargetChange(e.target.value)}
            className="w-28 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Collected Revenue" value={formatCurrency(data.metrics.totalRevenueAmount ?? data.metrics.totalRevenue ?? 0)} icon={DollarSign} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Pending Receivables" value={formatCurrency(data.metrics.pendingAmount ?? data.metrics.pendingRevenue ?? 0)} icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
        <MetricCard label="MRR (30-Day)" value={formatCurrency(data.metrics.mrrAmount ?? data.metrics.mrr ?? 0)} hint="Monthly Run Rate" icon={TrendingUp} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
        <MetricCard label="ARR (Annualized)" value={formatCurrency(data.metrics.arrAmount ?? data.metrics.arr ?? 0)} hint="Annual Run Rate" icon={TrendingUp} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      {/* Target Goal Progress Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-500" /> Monthly Sales Target Goal
          </h3>
          <p className="text-[11px] font-semibold text-slate-400">Track Monthly Recurring Revenue (MRR) collections against configurable target threshold.</p>
        </div>
        <div className="flex-1 w-full max-w-lg space-y-2">
          <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
            <span className="text-slate-500">Collected MRR: {formatCurrency(data.metrics.mrrAmount ?? data.metrics.mrr ?? 0)}</span>
            <span className="text-indigo-600">Goal Target: {formatCurrency(targetGoal)}</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${targetPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase text-right">
            {targetPercent}% of Goal Target Cleared
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2"><DollarSign size={15} className="text-emerald-500" /> Revenue & Subscriptions Trend</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataWithTarget}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : String(val))} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.12)", fontWeight: 700, fontSize: "11px" }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Line yAxisId="left" type="monotone" dataKey="target" stroke="#f43f5e" strokeWidth={2} strokeDasharray="6 6" name="Target Benchmark" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2"><Briefcase size={15} className="text-indigo-500" /> Revenue by Client</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.revenueByClient.length ? data.revenueByClient : [{ name: "No Data", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} stroke="none">
                  {(data.revenueByClient.length ? data.revenueByClient : [{ name: "No Data", value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={data.revenueByClient.length ? REPORT_COLORS[i % REPORT_COLORS.length] : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.12)", fontWeight: 700, fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiInsightsAnalytics({ reportRange, websiteId, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await api(`/api/analytics/enterprise/ai-insights?range=${reportRange}${websiteId ? `&websiteId=${websiteId}` : ""}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange, websiteId]);

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Running AI Analysis...</div>;
  if (!data) return <EmptyState title="No AI Insights" message="Wait for more interactions before AI can generate meaningful insights." />;

  const forecastData = Array.isArray(data.forecastData) && data.forecastData.length > 0 ? data.forecastData : [
    { month: "Current Period", tickets: 0, leads: 0 }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-end">

      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <MetricCard label="Avg Lead Quality Score" value={data.metrics.avgLeadQualityScore} hint="AI Assessed" icon={Activity} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="AI Resolution Rate" value={data.metrics.aiResolutionRate} hint="No agent needed" icon={Zap} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Overall Sentiment" value={data.metrics.sentimentScore} hint="NLP Analysis" icon={MessageCircle} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
      </div>

      {/* AI 3-Month Predictive Forecast Chart */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap size={20} className="text-indigo-500" /> AI 3-Month Predictive Forecasting
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1">Linear regression analysis based on historical ticket logs and CRM lead records.</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg uppercase tracking-wider">Regression Model Active</span>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
              <Line type="monotone" dataKey="tickets" stroke="#8b5cf6" strokeWidth={4} name="Projected Support Tickets" dot={{ r: 5, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }} />
              <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={4} name="Projected Lead Closures" dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-rose-500" /> Trending Issues</h3>
          <div className="space-y-4">
            {data.trendingIssues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">{issue.issue}</p>
                  <p className="text-xs text-rose-500 font-bold">{issue.trend} increase</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-700">{issue.count} <span className="text-[10px] text-slate-400 font-bold uppercase">Reports</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-emerald-500" /> Most Requested Services</h3>
          <div className="space-y-4">
            {data.mostRequestedServices.map((service, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">{service.service}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">{service.requests} <span className="text-[10px] text-slate-400 font-bold uppercase">Inquiries</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Activity size={20} className="text-indigo-500" /> Predicted Ticket Volume</h3>
          <div className="space-y-4">
            {data.ticketPrediction.map((pred, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">{pred.category}</p>
                  <p className="text-xs text-indigo-500 font-bold">{pred.confidence} confidence</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-700">{pred.predictedVolume} <span className="text-[10px] text-slate-400 font-bold uppercase">Expected</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><LayoutDashboard size={20} className="text-amber-500" /> FAQ Helpfulness</h3>
          <div className="space-y-4">
            {data.faqAnalytics.map((faq, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900 truncate w-48">{faq.question}</p>
                  <p className="text-xs text-slate-500 font-bold">{faq.views} views</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-amber-600">{faq.helpfulness} <span className="text-[10px] text-slate-400 font-bold uppercase">Helpful</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function EnterpriseReportsCenter({ defaultTab = "executive" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [reportRange, setReportRange] = useState("month");
  const [activeData, setActiveData] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { selectedWebsite } = useWebsite() || {};
  const enabledModules = selectedWebsite?.enabledModules;

  const tabs = [
    { id: "executive", label: "Executive Summary", icon: LayoutDashboard },
    { id: "leads", label: "Lead Analytics", icon: Users, module: "crm" },
    { id: "tickets", label: "Ticket Analytics", icon: Ticket, module: "service" },
    { id: "agents", label: "Agent Performance", icon: ShieldAlert, module: "service" },
    { id: "websites", label: "Website Analytics", icon: Zap },
    { id: "customers", label: "Customer Insights", icon: Activity, module: "crm" },
    { id: "revenue", label: "Revenue Dashboard", icon: DollarSign, module: "finance" },
    { id: "ai", label: "AI Insights", icon: Zap, module: "automation" },
    { id: "realtime", label: "Real-Time Activity", icon: Zap },
    { id: "bi", label: "Enterprise BI", icon: Briefcase },
  ].filter(t => !t.module || !enabledModules || !Array.isArray(enabledModules) || enabledModules.length === 0 || enabledModules.includes(t.module));

  // Reset active dataset when tab or date range changes
  useEffect(() => {
    setActiveData(null);
  }, [activeTab, reportRange]);

  const handleGlobalExport = (format) => {
    const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || "Report";

    // Format the dataset depending on the active tab's shape
    let datasetToExport = [];
    if (activeTab === "executive") {
      datasetToExport = Object.keys(activeData || {}).map(key => {
        const item = activeData[key];
        return {
          "KPI Metric": key.replace(/([A-Z])/g, ' $1').toUpperCase(),
          "Current Value": typeof item === 'object' && item !== null ? String(item.value ?? "") : String(item ?? ""),
          "Growth Trend": typeof item === 'object' && item !== null && item.trend !== undefined ? `${item.trend}%` : "N/A"
        };
      });
    } else if (activeTab === "leads") {
      datasetToExport = (activeData?.leadsOverTime?.length)
        ? activeData.leadsOverTime
        : (activeData?.leadsBySource?.length ? activeData.leadsBySource : (activeData?.funnel || []));
    } else if (activeTab === "tickets") {
      datasetToExport = (activeData?.ticketsOverTime?.length)
        ? activeData.ticketsOverTime
        : (activeData?.categories?.length ? activeData.categories : []);
    } else if (activeTab === "agents") {
      datasetToExport = (activeData?.allAgents?.length)
        ? activeData.allAgents
        : (activeData?.topPerformers || []);
    } else if (activeTab === "websites") {
      datasetToExport = activeData?.websiteComparison || [];
    } else if (activeTab === "customers") {
      datasetToExport = activeData?.growthTrend?.length
        ? activeData.growthTrend
        : (activeData?.geoDistribution || []);
    } else if (activeTab === "revenue") {
      datasetToExport = activeData?.revenueGrowth?.length
        ? activeData.revenueGrowth
        : (activeData?.revenueByClient || []);
    } else if (activeTab === "ai") {
      datasetToExport = activeData?.trendingIssues?.length
        ? activeData.trendingIssues
        : (activeData?.requestedServices || []);
    } else if (activeTab === "realtime") {
      datasetToExport = Array.isArray(activeData) ? activeData : [];
    } else {
      datasetToExport = Array.isArray(activeData) ? activeData : [];
    }

    if (!datasetToExport || datasetToExport.length === 0) {
      datasetToExport = [{ "Report Title": activeTabLabel, "Period": reportRange, "Generated On": new Date().toLocaleString(), "Records": 0 }];
    }

    const summaryCards = [];
    if (activeTab === "leads" && activeData) {
      summaryCards.push(
        { label: "Conversion Rate", value: `${activeData.conversionRate ?? 0}%` },
        { label: "Won Deals", value: activeData.wonLeads ?? 0 },
        { label: "Lost Deals", value: activeData.lostLeads ?? 0 }
      );
    } else if (activeTab === "tickets" && activeData) {
      summaryCards.push(
        { label: "Open Tickets", value: activeData.openCount ?? activeData.metrics?.openTickets ?? 0 },
        { label: "Resolved", value: activeData.resolvedCount ?? activeData.metrics?.resolvedTickets ?? 0 },
        { label: "Avg Resolution", value: activeData.avgResolutionTime || activeData.metrics?.avgResolutionTime || "N/A" },
        { label: "SLA Compliance", value: activeData.slaCompliance || activeData.metrics?.slaCompliance || "0%" }
      );
    } else if (activeTab === "agents" && activeData?.metrics) {
      summaryCards.push(
        { label: "Total Agents", value: activeData.metrics.totalAgents ?? 0 },
        { label: "Avg Productivity", value: activeData.metrics.avgProductivity ?? 0 },
        { label: "Avg CSAT", value: `${activeData.metrics.avgCsat ?? 0}%` }
      );
    } else if (activeTab === "websites" && activeData?.metrics) {
      summaryCards.push(
        { label: "Visitors", value: activeData.metrics.visitors ?? 0 },
        { label: "Chat Sessions", value: activeData.metrics.chatSessions ?? 0 },
        { label: "Leads", value: activeData.metrics.leads ?? 0 },
        { label: "Conversion Rate", value: activeData.metrics.conversionRate || "0%" }
      );
    } else if (activeTab === "customers" && activeData?.metrics) {
      summaryCards.push(
        { label: "Total Customers", value: activeData.metrics.totalCustomers ?? 0 },
        { label: "Active", value: activeData.metrics.activeCustomers ?? 0 },
        { label: "Retention", value: activeData.metrics.retentionRate || "0%" },
        { label: "CSAT", value: activeData.metrics.customerSatisfaction || "0%" }
      );
    } else if (activeTab === "revenue" && activeData?.metrics) {
      summaryCards.push(
        { label: "Collected", value: activeData.metrics.totalRevenueAmount ?? activeData.metrics.totalRevenue ?? 0 },
        { label: "Pending", value: activeData.metrics.pendingAmount ?? 0 },
        { label: "MRR (30d)", value: activeData.metrics.mrrAmount ?? activeData.metrics.mrr ?? 0 },
        { label: "ARR", value: activeData.metrics.arrAmount ?? activeData.metrics.arr ?? 0 }
      );
    } else if (activeTab === "ai" && activeData?.metrics) {
      summaryCards.push(
        { label: "Avg Lead Score", value: activeData.metrics.avgLeadScore ?? 0 },
        { label: "AI Resolution", value: activeData.metrics.aiResolutionRate || "0%" },
        { label: "Sentiment", value: activeData.metrics.sentiment || "Neutral" }
      );
    }

    const filename = `${activeTabLabel.replace(/\s+/g, '_')}_${reportRange}_Report`;
    if (format === 'csv') exportToCSV(datasetToExport, filename);
    if (format === 'xlsx') exportToExcel(datasetToExport, filename);
    if (format === 'pdf') {
      exportToPDF(datasetToExport, filename, `${activeTabLabel.toUpperCase()} ENTERPRISE REPORT`, {
        brandName: selectedWebsite?.websiteName || "JTS SUPPORT",
        subtitle: `${activeTabLabel} • Period: ${reportRange}`,
        summaryCards
      });
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Analytics & Business Reports</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comprehensive SaaS & Financial Audit Reporting System</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none hover:bg-white transition-colors cursor-pointer appearance-none pr-7"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "13px" }}
          >
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>

          <div className="relative z-40">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider shadow-xs hover:bg-indigo-600 transition-colors"
            >
              <Download size={12} /> Export View
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 text-left">
                <button onClick={() => { handleGlobalExport('pdf'); setExportMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors text-left border-b border-slate-100">
                  <FileText size={13} /> Export as PDF
                </button>
                <button onClick={() => { handleGlobalExport('xlsx'); setExportMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left border-b border-slate-100">
                  <FileSpreadsheet size={13} /> Export as Excel
                </button>
                <button onClick={() => { handleGlobalExport('csv'); setExportMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left">
                  <FileBox size={13} /> Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Compact Tab Bar ── */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100/80 border border-slate-200/70 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${isActive ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'}`}
            >
              <Icon size={12} className={isActive ? "text-indigo-500" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[360px]">
        {activeTab === "executive" && <ExecutiveDashboard reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "leads" && <LeadAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "tickets" && <TicketAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "agents" && <AgentPerformanceAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "websites" && <WebsiteAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "customers" && <CustomerInsightsAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "revenue" && <RevenueAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "ai" && <AiInsightsAnalytics reportRange={reportRange} websiteId={selectedWebsite?._id} onDataLoaded={setActiveData} />}
        {activeTab === "realtime" && <RealTimeActivityCenter onDataLoaded={setActiveData} />}
        {activeTab === "bi" && <EnterpriseBiCenter />}
      </div>
    </div>
  );
}
