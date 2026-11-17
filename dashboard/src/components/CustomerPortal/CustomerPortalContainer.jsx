import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../api/client.js";
import {
  LayoutDashboard, FileText, ShoppingCart, CreditCard, LifeBuoy,
  User, LogOut, Menu, X, Bell, ShieldCheck, Plus, ArrowUpRight
} from "lucide-react";

import CustomerPortalDashboard from "./CustomerPortalDashboard.jsx";
import CustomerPortalQuotations from "./CustomerPortalQuotations.jsx";
import CustomerPortalOrders from "./CustomerPortalOrders.jsx";
import CustomerPortalInvoices from "./CustomerPortalInvoices.jsx";
import CustomerPortalSupport from "./CustomerPortalSupport.jsx";
import CustomerPortalProfile from "./CustomerPortalProfile.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "quotations", label: "My Quotations", icon: FileText, countKey: "activeQuotes" },
  { id: "orders", label: "Sales Orders", icon: ShoppingCart },
  { id: "invoices", label: "Invoices & Payments", icon: CreditCard, countKey: "unpaidInvoices" },
  { id: "support", label: "Help & Support", icon: LifeBuoy, countKey: "openTickets" },
  { id: "profile", label: "My Profile", icon: User }
];

export default function CustomerPortalContainer() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchDashboard = async () => {
    try {
      const data = await api("/api/crm/customer-portal/dashboard");
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to fetch customer portal dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const onOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const workspaceName = dashboardData?.workspaceName || "Client Portal";
  const currency = dashboardData?.currency || "USD";
  const currencySettings = dashboardData?.currencySettings || null;
  const summary = dashboardData?.summary || {};
  const notifications = dashboardData?.notifications || [];

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <CustomerPortalDashboard data={dashboardData} loading={loading} onTabChange={setActiveTab} currency={currency} currencySettings={currencySettings} />;
      case "quotations":
        return <CustomerPortalQuotations onStatusChange={fetchDashboard} currency={currency} currencySettings={currencySettings} workspaceName={workspaceName} customer={dashboardData?.customer} />;
      case "orders":
        return <CustomerPortalOrders currency={currency} currencySettings={currencySettings} workspaceName={workspaceName} customer={dashboardData?.customer} />;
      case "invoices":
        return <CustomerPortalInvoices onPaymentSuccess={fetchDashboard} currency={currency} currencySettings={currencySettings} workspaceName={workspaceName} customer={dashboardData?.customer} />;
      case "support":
        return <CustomerPortalSupport onTicketChange={fetchDashboard} />;
      case "profile":
        return <CustomerPortalProfile />;
      default:
        return <CustomerPortalDashboard data={dashboardData} loading={loading} onTabChange={setActiveTab} currency={currency} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-60 h-screen overflow-y-auto bg-white border-r border-slate-200/80 text-slate-700 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between shrink-0`}>
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 tracking-tight leading-none truncate">
                  {workspaceName}
                </div>
                <span className="text-[10px] font-semibold text-indigo-600">Client Portal</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(item => {
              const badgeCount = item.countKey ? Number(summary[item.countKey] || 0) : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl transition-all text-left whitespace-nowrap ${
                    activeTab === item.id
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <item.icon size={15} className={activeTab === item.id ? "text-indigo-600 shrink-0" : "text-slate-400 shrink-0"} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {badgeCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                      activeTab === item.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs uppercase shrink-0">
              {(user?.name || "C").slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate">{user?.name}</h4>
              <p className="text-[10px] font-medium text-slate-400 truncate">
                {dashboardData?.customer?.crn || user?.email || user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-[11px] font-semibold transition-all"
          >
            <LogOut size={13} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 truncate">
                  {NAV_ITEMS.find(i => i.id === activeTab)?.label || "Client Portal"}
                </h1>
                {dashboardData?.customer?.crn && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    {dashboardData.customer.crn}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5 truncate">
                {workspaceName} • Quotes, orders, invoices &amp; support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {Number(summary.unpaidInvoices || 0) > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("invoices")}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-semibold transition-colors"
              >
                <span>{summary.unpaidInvoices} Unpaid</span>
                <ArrowUpRight size={12} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("support")}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors"
            >
              <Plus size={13} />
              <span>New Ticket</span>
            </button>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 hover:bg-slate-50 rounded-xl border border-slate-200/80 text-slate-500 transition-colors"
                title="Notifications"
              >
                <Bell size={15} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-700">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-[11px] text-slate-400">No new notifications.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className="p-3 hover:bg-slate-50 transition-colors">
                          <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                          {n.message && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
        </header>

        <main className="flex-1 p-3 w-full overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
