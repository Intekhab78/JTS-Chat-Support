import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, ShoppingCart, Receipt, Headphones,
  User, LogOut, Bell, Menu, X, ArrowLeft, ShieldCheck, HelpCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

// Sub-components
import CustomerPortalDashboard from "./CustomerPortalDashboard.jsx";
import CustomerPortalQuotations from "./CustomerPortalQuotations.jsx";
import CustomerPortalOrders from "./CustomerPortalOrders.jsx";
import CustomerPortalInvoices from "./CustomerPortalInvoices.jsx";
import CustomerPortalSupport from "./CustomerPortalSupport.jsx";
import CustomerPortalProfile from "./CustomerPortalProfile.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "quotes", label: "My Quotations", icon: FileText },
  { id: "orders", label: "Sales Orders", icon: ShoppingCart },
  { id: "invoices", label: "Invoices & Payments", icon: Receipt },
  { id: "support", label: "Help & Support", icon: Headphones },
  { id: "profile", label: "My Profile", icon: User }
];

export default function CustomerPortalContainer() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const data = await api("/api/crm/customer-portal/dashboard");
      setDashboardData(data);
    } catch (err) {
      toast.error("Failed to load customer portal statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <CustomerPortalDashboard data={dashboardData} loading={loading} onTabChange={setActiveTab} />;
      case "quotes":
        return <CustomerPortalQuotations />;
      case "orders":
        return <CustomerPortalOrders />;
      case "invoices":
        return <CustomerPortalInvoices />;
      case "support":
        return <CustomerPortalSupport />;
      case "profile":
        return <CustomerPortalProfile />;
      default:
        return <CustomerPortalDashboard data={dashboardData} loading={loading} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between`}>
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-xs font-black tracking-widest text-white uppercase">Client Portal</h2>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/35" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-xs uppercase border border-slate-700">
              {user?.name?.slice(0, 2)}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-black text-white">{user?.name}</h4>
              <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 border border-slate-700 rounded-xl text-[10px] font-black uppercase transition-all"
          >
            <LogOut size={12} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl border">
              <Menu size={16} />
            </button>
            <h1 className="text-sm font-black tracking-widest text-slate-800 uppercase">JTS CRM System</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative cursor-pointer p-2 hover:bg-slate-50 rounded-full border text-slate-500">
              <Bell size={16} />
              {dashboardData?.notifications?.length > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-indigo-600 rounded-full ring-2 ring-white" />
              )}
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="text-[10px] font-black text-slate-400 uppercase">Secure Client Session</div>
          </div>
        </header>

        {/* Content Workspace Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
