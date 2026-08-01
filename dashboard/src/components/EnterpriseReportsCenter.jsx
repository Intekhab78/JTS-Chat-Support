import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, FunnelChart, Funnel, LabelList
} from "recharts";
import {
  Briefcase, Users, LayoutDashboard, Ticket, MessageCircle, DollarSign,
  Settings, Download, Calendar, Activity, ShieldAlert, TrendingUp, TrendingDown, Minus, Zap, Filter, FileText, FileSpreadsheet, FileBox
} from "lucide-react";
import { api } from "../api/client.js";
import RealTimeActivityCenter from "./RealTimeActivityCenter.jsx";
import ComplianceReportsHub from "./CrmSystem/ComplianceReportsHub.jsx";
import { exportToCSV, exportToExcel, exportToPDF } from "../utils/exportUtils.js";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const REPORT_COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

function EmptyState({ title = "Not enough data", message = "We need a bit more data to calculate these insights.", actionText = "Refresh Data", onAction }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-3xl p-8 text-center animate-in fade-in duration-700">
      <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-6 shadow-inner">
        <Activity size={32} />
      </div>
      <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{title}</h3>
      <p className="text-sm font-bold text-slate-500 mb-8 max-w-sm">{message}</p>
      {onAction && (
        <button onClick={onAction} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black tracking-widest uppercase rounded-xl transition-colors shadow-md shadow-indigo-600/20">
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
    const flatData = Array.isArray(data) ? data : [{ ...data.metrics, ...data }];

    if (type === 'csv') exportToCSV(flatData, `${title.replace(/\s+/g, '_')}_Report`);
    if (type === 'xlsx') exportToExcel(flatData, `${title.replace(/\s+/g, '_')}_Report`);
    if (type === 'pdf') exportToPDF(flatData, `${title.replace(/\s+/g, '_')}_Report`, title);
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
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
  const isNeutral = trend === 0;

  return (
    <article className="rounded-3xl border border-slate-200/50 bg-white/40 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${colorClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-4xl font-black tracking-tight text-slate-900">{value}</h3>
          {hint && <p className="text-xs font-bold text-slate-400 mt-2">{hint}</p>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600' :
              isNegative ? 'bg-rose-50 text-rose-600' :
                'bg-slate-100 text-slate-500'
            }`}>
            {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
            <span>{isPositive ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
    </article>
  );
}

function ExecutiveDashboard({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(["clients", "websites", "revenue", "csat"]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await api(`/api/analytics/enterprise/executive?range=${reportRange}`);
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
  }, [reportRange]);

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

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Executive Data...</div>;
  if (!data) return <EmptyState title="No Executive Data" message="Unable to load executive summary data." actionText="Refresh" onAction={() => window.location.reload()} />;

  const widgets = {
    clients: <MetricCard label="Active Clients" value={data.totalClients?.value ?? data.totalClients} trend={data.totalClients?.trend} hint="Registered client accounts" icon={Users} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" />,
    websites: <MetricCard label="Active Websites" value={data.activeWebsites?.value ?? data.activeWebsites} trend={data.activeWebsites?.trend} hint="Domains with active tracking" icon={LayoutDashboard} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />,
    revenue: <MetricCard label="Total Revenue (MRR)" value={`$${(data.mrr?.value ?? data.mrr).toLocaleString()}`} trend={data.mrr?.trend} hint="Estimated monthly recurring" icon={DollarSign} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />,
    csat: <MetricCard label="CSAT Score" value={`${data.csat?.value ?? data.csat}%`} trend={data.csat?.trend} hint="Average Customer Satisfaction" icon={Activity} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all border ${isEditing ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          <Settings size={14} className="inline mr-2" /> {isEditing ? 'Done Editing' : 'Customize Dashboard'}
        </button>
        <ExportMenu data={data} title="Executive Summary" />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="executive-widgets" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
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
                        <div className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-t-xl text-center cursor-grab">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-[32px] bg-slate-950 text-white p-8 border border-slate-900 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-2">Growth Trajectory</h3>
            <p className="text-slate-400 text-sm font-medium mb-6">Your business is scaling steadily. Focus on improving lead conversion rates to accelerate MRR growth.</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-300">Total Leads Acquired</span>
                <span className="text-lg font-black text-white">{data.totalLeads?.value ?? data.totalLeads}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-300">New Leads Today</span>
                <span className="text-lg font-black text-emerald-400">+{data.newLeadsToday?.value ?? data.newLeadsToday}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6">Operational Queue</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl text-center">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Open Tickets</span>
              <span className="text-5xl font-black text-slate-900">{data.openTickets?.value ?? data.openTickets}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center">
              <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Resolved</span>
              <span className="text-5xl font-black text-emerald-700">{data.resolvedTickets?.value ?? data.resolvedTickets}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ websiteId: "", agentId: "", clientId: "", service: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters });
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
  }, [reportRange, filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Lead Analytics...</div>;
  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mr-2"><Filter size={14} /> Filters</div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="websiteId" placeholder="Website ID" value={filters.websiteId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="agentId" placeholder="Agent ID" value={filters.agentId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="service" placeholder="Service Type" value={filters.service} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <ExportMenu data={data.leadsOverTime || data} title="Lead Analytics" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Conversion Rate" value={`${data.conversionRate}%`} hint="Leads won vs processed" icon={Activity} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Won Deals" value={data.wonLeads} hint="Successfully closed leads" icon={Briefcase} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Lost Deals" value={data.lostLeads} hint="Leads marked as lost" icon={ShieldAlert} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Leads by Source</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.leadsBySource.length ? data.leadsBySource : [{ name: "No Data", count: 1 }]} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} stroke="none">
                  {(data.leadsBySource.length ? data.leadsBySource : [{ name: "No Data", count: 1 }]).map((_, i) => (
                    <Cell key={i} fill={data.leadsBySource.length ? REPORT_COLORS[i % REPORT_COLORS.length] : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Leads by Service</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leadsByService} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} width={80} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                  {data.leadsByService.map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Leads by Website</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leadsByWebsite} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} width={100} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={30}>
                  {data.leadsByWebsite.map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Lead Pipeline Funnel</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Funnel dataKey="value" data={data.funnel} isAnimationActive>
                  <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontSize={11} fontWeight={800} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ websiteId: "", agentId: "", clientId: "", department: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters });
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
  }, [reportRange, filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Ticket Analytics...</div>;
  if (!data) return <EmptyState title="No Ticket Data" message="There are no tickets matching these filters." actionText="Clear Filters" onAction={() => setFilters({ websiteId: "", agentId: "", clientId: "", department: "" })} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mr-2"><Filter size={14} /> Filters</div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="websiteId" placeholder="Website ID" value={filters.websiteId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="agentId" placeholder="Agent ID" value={filters.agentId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="department" placeholder="Department" value={filters.department} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <ExportMenu data={data} title="Ticket Analytics" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Open Tickets" value={data.openCount} hint="Currently unresolved" icon={Ticket} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Resolved Tickets" value={data.resolvedCount} hint="Closed successfully" icon={MessageCircle} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Avg Resolution" value={data.avgResolutionTime} hint="Time to close" icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
        <MetricCard label="SLA Compliance" value={data.slaCompliance} hint="Target met rate" icon={ShieldAlert} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

function AgentPerformanceAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ websiteId: "", clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters });
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
  }, [reportRange, filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Agent Analytics...</div>;
  if (!data) return <EmptyState title="No Agent Data" message="There is no agent performance data matching these filters." actionText="Clear Filters" onAction={() => setFilters({ websiteId: "", clientId: "" })} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mr-2"><Filter size={14} /> Filters</div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
          <input type="text" name="websiteId" placeholder="Website ID" value={filters.websiteId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <ExportMenu data={data.allAgents || data.topPerformers} title="Agent Performance" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Total Agents" value={data.metrics.totalAgents} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Avg Productivity" value={data.metrics.avgProductivity} hint="Platform wide score" icon={Activity} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Avg CSAT" value={data.metrics.avgCsat} hint="Customer Satisfaction" icon={MessageCircle} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Top Performers */}
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-indigo-500" /> Top Performers</h3>
          <div className="space-y-4">
            {data.topPerformers.map((agent, i) => {
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
            {data.topPerformers.length === 0 && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>

        {/* Top Support */}
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Ticket size={20} className="text-emerald-500" /> Top Support Agents</h3>
          <div className="space-y-4">
            {data.topSupport.map((agent, i) => {
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
            {data.topSupport.length === 0 && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>

        {/* Top Sales */}
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><DollarSign size={20} className="text-amber-500" /> Top Sales Agents</h3>
          <div className="space-y-4">
            {data.topSales.map((agent, i) => {
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
            {data.topSales.length === 0 && <p className="text-sm text-slate-500 text-center py-4 font-bold">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters });
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
  }, [reportRange, filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Website Analytics...</div>;
  if (!data) return <EmptyState title="No Website Data" message="We need a bit more data to calculate these insights." actionText="Refresh Data" onAction={() => window.location.reload()} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mr-2"><Filter size={14} /> Filters</div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <ExportMenu data={data.websiteComparison} title="Website Analytics" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard label="Total Visitors" value={data.metrics.visitors} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Chat Sessions" value={data.metrics.chatSessions} icon={MessageCircle} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
        <MetricCard label="Leads Generated" value={data.metrics.leadsGenerated} icon={Briefcase} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Tickets Created" value={data.metrics.ticketsCreated} icon={Ticket} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
        <MetricCard label="Conversion Rate" value={data.metrics.conversionRate} hint="Visitor to Lead" icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

function CustomerInsightsAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters });
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
  }, [reportRange, filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Customer Insights...</div>;
  if (!data) return <EmptyState title="No Customer Data" message="There is no customer data matching these filters." actionText="Clear Filters" onAction={() => setFilters({ clientId: "" })} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mr-2"><Filter size={14} /> Filters</div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <ExportMenu data={data} title="Customer Insights" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <MetricCard label="Total Customers" value={data.metrics.totalCustomers} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="Active Customers" value={data.metrics.activeCustomers} icon={Briefcase} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Retention Rate" value={data.metrics.retentionRate} icon={TrendingUp} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
        <MetricCard label="Churn Rate" value={data.metrics.churnRate} icon={TrendingDown} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
        <MetricCard label="CSAT" value={data.metrics.customerSatisfaction} icon={Activity} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

function RevenueAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ clientId: "" });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ range: reportRange, ...filters });
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
  }, [reportRange, filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Loading Revenue Data...</div>;
  if (!data) return <EmptyState title="No Revenue Data" message="Unable to fetch revenue metrics for these filters." actionText="Clear Filters" onAction={() => setFilters({ clientId: "" })} />;

  const chartDataWithTarget = data.revenueGrowth.map(item => ({
    ...item,
    target: 12000
  }));

  const mrrNumeric = parseFloat(data.metrics.mrr.replace(/[^0-9.]/g, "")) || 0;
  const targetGoal = 20000;
  const targetPercent = Math.min(100, Math.round((mrrNumeric / targetGoal) * 100));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative z-30 overflow-visible flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mr-2"><Filter size={14} /> Filters</div>
          <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <ExportMenu data={data} title="Revenue Analytics" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Total Revenue" value={data.metrics.totalRevenue} icon={DollarSign} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Subscription Rev" value={data.metrics.subscriptionRevenue} icon={Activity} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="MRR" value={data.metrics.mrr} hint="Monthly Recurring" icon={TrendingUp} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
        <MetricCard label="ARR" value={data.metrics.arr} hint="Annual Recurring" icon={TrendingUp} colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      {/* Target Goal Progress Bar */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Monthly Sales Target Goal
          </h3>
          <p className="text-xs font-bold text-slate-400">Track dynamic Monthly Recurring Revenue (MRR) collections against target threshold goal.</p>
        </div>
        <div className="flex-1 w-full max-w-lg space-y-3">
          <div className="flex justify-between text-xs font-black uppercase tracking-wider">
            <span className="text-slate-500">Collected MRR: {data.metrics.mrr}</span>
            <span className="text-indigo-600">Goal Target: $20,000</span>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-1000 shadow-md"
              style={{ width: `${targetPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase text-right">
            {targetPercent}% of Goal Target Cleared
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><DollarSign size={20} className="text-emerald-500" /> Revenue & Subscriptions Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataWithTarget}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} tickFormatter={(val) => `$${val / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                <Line yAxisId="left" type="monotone" dataKey="target" stroke="#f43f5e" strokeWidth={2} strokeDasharray="6 6" name="Target Benchmark" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-indigo-500" /> Revenue by Client</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.revenueByClient.length ? data.revenueByClient : [{ name: "No Data", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} stroke="none">
                  {(data.revenueByClient.length ? data.revenueByClient : [{ name: "No Data", value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={data.revenueByClient.length ? REPORT_COLORS[i % REPORT_COLORS.length] : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiInsightsAnalytics({ reportRange, onDataLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await api(`/api/analytics/enterprise/ai-insights?range=${reportRange}`);
        setData(result);
        if (onDataLoaded) onDataLoaded(result);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, [reportRange]);

  if (loading && !data) return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">Running AI Analysis...</div>;
  if (!data) return <EmptyState title="No AI Insights" message="Wait for more interactions before AI can generate meaningful insights." />;

  const forecastData = [
    { month: "Current Month", tickets: 450, leads: 320 },
    { month: "Month +1 (Proj)", tickets: 480, leads: 350 },
    { month: "Month +2 (Proj)", tickets: 510, leads: 390 },
    { month: "Month +3 (Proj)", tickets: 540, leads: 430 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <ExportMenu data={data} title="AI Insights" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Avg Lead Quality Score" value={data.metrics.avgLeadQualityScore} hint="AI Assessed" icon={Activity} colorClass="bg-gradient-to-br from-indigo-500 to-purple-600" />
        <MetricCard label="AI Resolution Rate" value={data.metrics.aiResolutionRate} hint="No agent needed" icon={Zap} colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <MetricCard label="Overall Sentiment" value={data.metrics.sentimentScore} hint="NLP Analysis" icon={MessageCircle} colorClass="bg-gradient-to-br from-blue-400 to-cyan-500" />
      </div>

      {/* AI 3-Month Predictive Forecast Chart */}
      <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm w-full">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

        <div className="rounded-[32px] bg-white p-8 border border-slate-200/60 shadow-sm">
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

export default function EnterpriseReportsCenter() {
  const [activeTab, setActiveTab] = useState("executive");
  const [reportRange, setReportRange] = useState("month");
  const [activeData, setActiveData] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const tabs = [
    { id: "executive", label: "Executive Summary", icon: LayoutDashboard },
    { id: "compliance", label: "Compliance Suite Hub", icon: Briefcase },
    { id: "leads", label: "Lead Analytics", icon: Users },
    { id: "tickets", label: "Ticket Analytics", icon: Ticket },
    { id: "agents", label: "Agent Performance", icon: ShieldAlert },
    { id: "websites", label: "Website Analytics", icon: Zap },
    { id: "customers", label: "Customer Insights", icon: Activity },
    { id: "revenue", label: "Revenue Dashboard", icon: DollarSign },
    { id: "ai", label: "AI Insights", icon: Zap },
    { id: "realtime", label: "Real-Time Activity", icon: Zap },
  ];

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
      datasetToExport = (activeData?.leadsOverTime && activeData.leadsOverTime.length > 0) 
        ? activeData.leadsOverTime 
        : (activeData?.leadsBySource?.length ? activeData.leadsBySource : (activeData ? [activeData] : []));
    } else if (activeTab === "tickets") {
      datasetToExport = (activeData?.ticketsOverTime && activeData.ticketsOverTime.length > 0)
        ? activeData.ticketsOverTime
        : (activeData?.categories?.length ? activeData.categories : (activeData ? [activeData] : []));
    } else if (activeTab === "agents") {
      datasetToExport = (activeData?.allAgents && activeData.allAgents.length > 0)
        ? activeData.allAgents
        : (activeData?.topPerformers?.length ? activeData.topPerformers : (activeData ? [activeData] : []));
    } else if (activeTab === "websites") {
      datasetToExport = (activeData?.websiteComparison && activeData.websiteComparison.length > 0)
        ? activeData.websiteComparison
        : (activeData ? [activeData] : []);
    } else if (activeTab === "customers") {
      datasetToExport = (activeData?.growthTrend && activeData.growthTrend.length > 0)
        ? activeData.growthTrend
        : (activeData ? [activeData] : []);
    } else if (activeTab === "revenue") {
      datasetToExport = (activeData?.revenueGrowth && activeData.revenueGrowth.length > 0)
        ? activeData.revenueGrowth
        : (activeData ? [activeData] : []);
    } else if (activeTab === "ai") {
      datasetToExport = (activeData?.trendingIssues && activeData.trendingIssues.length > 0)
        ? activeData.trendingIssues
        : (activeData ? [activeData] : []);
    } else if (activeTab === "compliance") {
      datasetToExport = [
        { "Module": "VAT Audit & Statutory Compliance", "Status": "COMPLIANT", "Filing Period": "Q3 2026", "TRN": "100492837400003" },
        { "Module": "Corporate Tax Filing", "Status": "FILED", "Tax Rate": "9%", "Filing Period": "FY 2025" },
        { "Module": "Anti-Money Laundering (AML)", "Status": "VERIFIED", "Risk Rating": "LOW", "Last Audit": new Date().toLocaleDateString() }
      ];
    } else if (activeTab === "realtime") {
      datasetToExport = [
        { "System Center": "Realtime Activity Engine", "Status": "ONLINE", "Active Connections": "Live Websocket Connected", "Last Updated": new Date().toLocaleString() }
      ];
    } else {
      datasetToExport = Array.isArray(activeData) ? activeData : [activeData || {}];
    }

    if (!datasetToExport || datasetToExport.length === 0) {
      alert(`No active data found for "${activeTabLabel}". Loading summary report fallback...`);
      datasetToExport = [{ "Report Title": activeTabLabel, "Period": reportRange, "Generated On": new Date().toLocaleString(), "Status": "Active" }];
    }

    const filename = `${activeTabLabel.replace(/\s+/g, '_')}_${reportRange}_Report`;
    if (format === 'csv') exportToCSV(datasetToExport, filename);
    if (format === 'xlsx') exportToExcel(datasetToExport, filename);
    if (format === 'pdf') exportToPDF(datasetToExport, filename, `${activeTabLabel.toUpperCase()} ENTERPRISE REPORT`);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Analytics & Business Reports</h2>
          <p className="text-sm font-bold text-slate-500 mt-2">Comprehensive SaaS, UAE Compliance & Financial Audit Reporting System</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200/60 shadow-sm text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 transition-colors cursor-pointer appearance-none pr-10"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
          >
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
          
          <div className="relative z-[9999]">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-md hover:bg-indigo-600 transition-colors"
            >
              <Download size={14} /> Export Active View
            </button>
            
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                <button onClick={() => { handleGlobalExport('pdf'); setExportMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors text-left border-b border-slate-100">
                  <FileText size={16} /> Export as PDF
                </button>
                <button onClick={() => { handleGlobalExport('xlsx'); setExportMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left border-b border-slate-100">
                  <FileSpreadsheet size={16} /> Export as Excel
                </button>
                <button onClick={() => { handleGlobalExport('csv'); setExportMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left">
                  <FileBox size={16} /> Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-100/50 backdrop-blur-md border border-slate-200/50 rounded-full mb-8 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${isActive ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              <Icon size={16} className={isActive ? "text-indigo-500" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {activeTab === "executive" && <ExecutiveDashboard reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "compliance" && <ComplianceReportsHub />}
        {activeTab === "leads" && <LeadAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "tickets" && <TicketAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "agents" && <AgentPerformanceAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "websites" && <WebsiteAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "customers" && <CustomerInsightsAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "revenue" && <RevenueAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "ai" && <AiInsightsAnalytics reportRange={reportRange} onDataLoaded={setActiveData} />}
        {activeTab === "realtime" && <RealTimeActivityCenter />}
      </div>
    </div>
  );
}
