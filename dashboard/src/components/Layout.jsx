import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Users, Globe, Headphones, MessageSquare, BarChart, ChevronLeft,
  ChevronRight, LogOut, Sun, Moon, Bell, Ticket, AlertTriangle, AlertCircle, Clock, Menu, X,
  Package, Contact, CreditCard, ShieldCheck, ExternalLink, Search, Command, ChevronDown,
  FileText, ShieldAlert, FileSpreadsheet, Building2, Sparkles, Activity, Cpu, Layers,
  Compass, Smartphone, Network, GitBranch, ShoppingBag, Boxes, Database, PieChart,
  Building, Radio, DollarSign, Award, Box, FolderTree, GitCommit, Tag, Ruler, Palette,
  Scale, Truck, ArrowDownRight, ArrowUpRight, Sliders, ShoppingCart, LayoutGrid, FilePlus,
  Landmark, BarChart2, BookOpen, Receipt, TrendingUp, BrainCircuit, Target, UserPlus,
  Briefcase, Grid, Zap, GitMerge, Lock, HelpCircle, UserCheck, FileCheck, Code2, RefreshCw
} from "lucide-react";
import { api } from "../api/client.js";
import { useSocket } from "../context/SocketContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import GlobalSearch from "./CrmSystem/GlobalSearch.jsx";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";
import { normalizeRole } from "../utils/roles.js";

/* ── helpers ──────────────────────────────────────── */
function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function getAvatarColor(name = "") {
  const colors = [
    "from-indigo-500 to-violet-500",
    "from-pink-500 to-rose-500",
    "from-orange-500 to-amber-500",
    "from-teal-500 to-cyan-500",
    "from-blue-500 to-indigo-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const iconMap = {
  "Dashboard": LayoutDashboard,
  "Clients": Users,
  "Websites": Globe,
  "Agents": Headphones,
  "Chats": MessageSquare,
  "Assigned Chats": MessageSquare,
  "Tickets": Ticket,
  "CRM": Contact,
  "Customer Master": UserCheck,
  "VAT Compliance": FileSpreadsheet,
  "Corporate Tax": Building2,
  "Trade License": ShieldAlert,
  "Compliance Reports": FileCheck,
  "Risk Register": AlertTriangle,
  "SLA & SLO Center": Award,
  "Observability Center": Activity,
  "Load & Capacity Center": Cpu,
  "Release Center": Layers,
  "Developer Portal": Code2,
  "Product & Roadmap": Compass,
  "AI & Automation Center": Sparkles,
  "Compliance Governance": ShieldCheck,
  "Mobile Center": Smartphone,
  "Integration Hub": Network,
  "Workflow Builder": GitBranch,
  "App Marketplace": ShoppingBag,
  "Low-Code Studio": Boxes,
  "Custom Modules": Database,
  "Enterprise BI": PieChart,
  "Multi-Org Center": Building,
  "Mission Control": Radio,
  "Financial Center": DollarSign,

  "Inventory": Package,
  "Item Master": Box,
  "Categories": FolderTree,
  "Category Master": FolderTree,
  "Subcategories": GitCommit,
  "Subcategory Master": GitCommit,
  "Brands": Tag,
  "Brand Master": Tag,
  "Sizes": Ruler,
  "Size Master": Ruler,
  "Colors": Palette,
  "Color Master": Palette,
  "Units": Scale,
  "Unit Master": Scale,
  "Suppliers": Truck,
  "Supplier Master": Truck,
  "VAT Master": Receipt,
  "Stock Movement": RefreshCw,
  "Stock In": ArrowDownRight,
  "Stock Out": ArrowUpRight,
  "Adjustment": Sliders,

  "Procurement (Purchase)": ShoppingCart,
  "Purchase Dashboard": LayoutGrid,
  "Purchase Orders": FileText,
  "Purchase Requests": FilePlus,
  "Purchase Accounts": CreditCard,

  "Finance (Accounts)": Landmark,
  "Finance Dashboard": BarChart2,
  "General Ledger": BookOpen,
  "Finance Invoices": Receipt,
  "Subscriptions Revenue": TrendingUp,
  "Financial Intelligence": BrainCircuit,

  "Sales Board": Target,
  "Agent Desk": UserPlus,
  "Manager Board": Briefcase,
  "Departments": Building,
  "Shortcuts": Zap,
  "Reports": BarChart,
  "Flow Analytics": GitMerge,
  "History": Clock,
  "Historical Archive": Clock,
  "Security": Lock,
  "Help Center": HelpCircle,
  "Billing": CreditCard,
  "Subscriptions": ShieldCheck,
  "Role Master": UserCheck,
  "Orders": FileText,
  "Catalog": Package,
  "Ledger": CreditCard,
  "Insights": BarChart,
  "Invoices": Receipt,
};

/* ── nav link ─────────────────────────────────────── */
function SideNavLink({ item, collapsed, onNavigate, isChild = false }) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const isActive = currentPath === item.href;
  const Icon = iconMap[item.label] || LayoutDashboard;

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={
        `relative flex items-center gap-3 rounded-2xl transition-all duration-200 group
         ${collapsed ? "justify-center px-0 py-3" : isChild ? "px-8 py-2.5" : "px-4 py-2.5"}
         ${isActive
          ? "bg-indigo-600/20 text-indigo-300"
          : "text-slate-400 hover:text-white hover:bg-white/5"
        }`
      }
    >
      {isActive && (
        <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.7)]" />
      )}
      <Icon
        size={collapsed ? 22 : 17}
        className={`shrink-0 transition-transform duration-200 group-hover:scale-110
          ${isActive ? "text-indigo-300" : "text-slate-400 group-hover:text-white"}`}
      />
      {!collapsed && (
        <span className="text-[11px] font-black uppercase tracking-[0.12em] truncate">
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

function SidebarNavItem({ item, collapsed, onNavigate, currentPath, expandedMenus, setExpandedMenus, isChild = false }) {
  const Icon = iconMap[item.label] || LayoutDashboard;
  const children = Array.isArray(item.children) ? item.children : [];
  const hasChildren = children.length > 0;
  const childActive = hasChildren && children.some((child) => child.href === currentPath);
  const isExpanded = expandedMenus[item.label] !== undefined ? Boolean(expandedMenus[item.label]) : (childActive || Boolean(expandedMenus[item.label]));

  if (!hasChildren) {
    return <SideNavLink item={item} collapsed={collapsed} onNavigate={onNavigate} isChild={isChild} />;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpandedMenus((current) => ({ ...current, [item.label]: !current[item.label] }))}
        className={`relative flex w-full items-center gap-3 rounded-2xl transition-all duration-200 group ${collapsed ? "justify-center px-0 py-3" : isChild ? "px-8 py-2.5" : "px-4 py-2.5"
          } ${isExpanded || childActive
            ? "bg-indigo-600/20 text-indigo-300"
            : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
      >
        <Icon
          size={collapsed ? 22 : 17}
          className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isExpanded || childActive ? "text-indigo-300" : "text-slate-400 group-hover:text-white"
            }`}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left text-[11px] font-black uppercase tracking-[0.12em]">
              {item.label}
            </span>
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-indigo-300" : "text-slate-400 group-hover:text-white"
                }`}
            />
          </>
        )}
      </button>

      {!collapsed && isExpanded && (
        <div className="space-y-1 pl-2.5 py-1 bg-white/[0.02] border-l border-white/5 rounded-r-2xl mt-1">
          {children.map((child) => (
            <SidebarNavItem
              key={child.label}
              item={child}
              collapsed={collapsed}
              onNavigate={onNavigate}
              currentPath={currentPath}
              expandedMenus={expandedMenus}
              setExpandedMenus={setExpandedMenus}
              isChild
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── sidebar content (shared between desktop + mobile drawer) ── */
function SidebarContent({ links, collapsed, onNavigate, user, isDarkMode, setIsDarkMode, logout }) {
  const role = user?.role;
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = {};
    for (const item of links) {
      if (Array.isArray(item.children) && item.children.some((child) => child.href === currentPath)) {
        initial[item.label] = true;
      }
    }
    return initial;
  });

  useEffect(() => {
    setExpandedMenus((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of links) {
        if (Array.isArray(item.children) && item.children.some((child) => child.href === currentPath) && !next[item.label]) {
          next[item.label] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [links, currentPath]);

  return (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className={`flex items-center px-6 py-5 shrink-0 ${collapsed ? "justify-center px-2" : ""}`}>
        {collapsed ? (
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl shadow-lg flex items-center justify-center font-black text-white text-xs">
            JTS
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Command Center</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">
              JTS <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 italic">Support</span>
            </h1>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        aria-label="Sidebar navigation"
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 space-y-0.5 pb-4"
      >
        {links.map(item => (
          <SidebarNavItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
            currentPath={currentPath}
            expandedMenus={expandedMenus}
            setExpandedMenus={setExpandedMenus}
          />
        ))}
      </nav>

      {/* User panel */}
      <div className={`mx-3 mb-4 shrink-0 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm ${collapsed ? "p-2" : "p-4"}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-xs select-none border border-white/10`}
              title={user?.name}
            >
              {getInitials(user?.name || "")}
            </div>
            <button
              onClick={() => setIsDarkMode(d => !d)}
              title={isDarkMode ? "Light mode" : "Dark mode"}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-xs select-none shrink-0 border border-white/10`}>
                {getInitials(user?.name || "")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                  {role === "admin" ? "Global Admin" : role}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDarkMode(d => !d)}
                title="Toggle theme"
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={logout}
                title="Sign out"
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/5 border border-white/5 hover:border-rose-400/20 transition-all group"
              >
                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── main layout ──────────────────────────────────── */
export default function Layout({ title, subtitle, children, menuItems = [] }) {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const { websites, selectedWebsiteId, setSelectedWebsiteId } = useWebsite();

  // Desktop: collapsed/expanded sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Mobile: drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const role = normalizeRole(user?.role);

  /* Dark mode */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  /* Browser Notification Permissions */
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  /* Close mobile drawer on resize to desktop */
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* Lock body scroll when mobile drawer open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* Notifications */
  const fetchNotifications = useCallback(async () => {
    try {
      const q = notificationFilter !== "all" ? `?type=${notificationFilter}` : "";
      setNotifications(await api(`/api/notifications${q}`));
    } catch { /* silent */ }
  }, [notificationFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    const handler = (n) => {
      setNotifications(prev => [n, ...prev]);
      if (Notification.permission === "granted") new Notification(n.title, { body: n.message });
    };
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  const markAllRead = async () => {
    try {
      await api("/api/notifications/mark-all-read", { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const markRead = async (id) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  /* Menu items */
  const fallback = [];

  // Dashboard is always first, route depends on role
  const dashboardHref = role === "admin" ? "/admin" : role === "manager" ? "/manager" : role === "client" ? "/client" : role === "supplier" ? "/supplier?tab=dashboard" : role === "accounts" ? "/accounts" : "/agent";
  fallback.push({ label: "Dashboard", href: dashboardHref });

  // Dynamically add items based on permissions
  if (hasPermission(user, PERMISSIONS.TEAM_VIEW) && role === "admin") fallback.push({ label: "Clients", href: "/admin?tab=clients" });
  if (role === "admin" || role === "client") fallback.push({ label: "Websites", href: `${dashboardHref}?tab=websites` });
  if (hasPermission(user, PERMISSIONS.TEAM_VIEW)) fallback.push({ label: "Agents", href: `${dashboardHref}?tab=agents` });
  if (hasPermission(user, PERMISSIONS.CHAT_VIEW)) fallback.push({ label: "Chats", href: `${dashboardHref}?tab=chats` });
  if (hasPermission(user, PERMISSIONS.TICKET_VIEW)) fallback.push({ label: "Tickets", href: `${dashboardHref}?tab=tickets` });
  if (hasPermission(user, PERMISSIONS.CRM_VIEW)) fallback.push({ label: "CRM", href: `${dashboardHref}?tab=crm` });

  if (role === "admin" || role === "client") {
    fallback.push({ label: "Departments", href: `${dashboardHref}?tab=departments` });
    fallback.push({ label: "Categories", href: `${dashboardHref}?tab=categories` });
  }

  fallback.push({ label: "Shortcuts", href: `${dashboardHref}?tab=shortcuts` });

  if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) fallback.push({ label: "Reports", href: `${dashboardHref}?tab=reports` });
  if (hasPermission(user, PERMISSIONS.AUDIT_VIEW)) fallback.push({ label: "History", href: `${dashboardHref}?tab=history` });

  if (hasPermission(user, PERMISSIONS.SETTINGS_MANAGE)) fallback.push({ label: "Security", href: `${dashboardHref}?tab=security` });

  if (role === "admin") fallback.push({ label: "Subscriptions", href: "/admin?tab=subscriptions" });

  // Role Master: only for admin and client
  if (role === "admin" || role === "client") {
    fallback.push({ label: "Role Master", href: `${dashboardHref}?tab=roles` });
  }

  // Supplier specific
  if (role === "supplier") {
    fallback.length = 0; // Clear and rebuild for supplier
    fallback.push({ label: "Dashboard", href: "/supplier?tab=dashboard" });
    fallback.push({ label: "Orders", href: "/supplier?tab=orders" });
    fallback.push({ label: "Catalog", href: "/supplier?tab=inventory" });
    fallback.push({ label: "Ledger", href: "/supplier?tab=ledger" });
    fallback.push({ label: "Insights", href: "/supplier?tab=insights" });
    fallback.push({ label: "Company Settings", href: "/supplier?tab=settings" });
  }

  // Accounts specific
  if (role === "accounts") {
    fallback.length = 0;
    fallback.push({ label: "Dashboard", href: "/accounts" });
    fallback.push({ label: "Invoices", href: "/accounts?tab=invoices" });
    fallback.push({ label: "Ledger", href: "/accounts?tab=ledger" });
    fallback.push({ label: "Billing", href: "/accounts?tab=billing" });
    fallback.push({ label: "Reports", href: "/accounts?tab=reports" });
  }

  // Tax Consultant specific
  if (role === "tax_consultant") {
    fallback.length = 0;
    fallback.push({ label: "Dashboard", href: "/tax-consultant?tab=tax-consultant-dashboard" });
    fallback.push({ label: "VAT Compliance", href: "/tax-consultant?tab=vat-compliance" });
    fallback.push({ label: "Corporate Tax", href: "/tax-consultant?tab=corporate-tax" });
    fallback.push({ label: "Trade License", href: "/tax-consultant?tab=trade-license" });
    fallback.push({ label: "Compliance Reports", href: "/tax-consultant?tab=compliance-reports" });
    fallback.push({ label: "CRM", href: "/tax-consultant?tab=crm" });
    fallback.push({ label: "Customer Master", href: "/tax-consultant?tab=inventory-customer" });
  }

  const adminMenuItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Clients", href: "/admin?tab=clients" },
    { label: "Websites", href: "/admin?tab=websites" },
    { label: "Agents", href: "/admin?tab=agents" },
    { label: "Chats", href: "/admin?tab=chats" },
    { label: "Tickets", href: "/admin?tab=tickets" },
    { label: "CRM", href: "/admin?tab=crm" },
    { label: "Customer Master", href: "/admin?tab=inventory-customer" },
    { label: "VAT Compliance", href: "/admin?tab=vat-compliance" },
    { label: "Corporate Tax", href: "/admin?tab=corporate-tax" },
    { label: "Trade License", href: "/admin?tab=trade-license" },
    { label: "Compliance Reports", href: "/admin?tab=compliance-reports" },
    { label: "Risk Register", href: "/admin?tab=risk-register" },
    { label: "SLA & SLO Center", href: "/admin?tab=sla-center" },
    { label: "Observability Center", href: "/admin?tab=observability" },
    { label: "Load & Capacity Center", href: "/admin?tab=load-testing" },
    { label: "Release Center", href: "/admin?tab=release-management" },
    { label: "Developer Portal", href: "/admin?tab=developer-portal" },
    { label: "Product & Roadmap", href: "/admin?tab=product-management" },
    { label: "AI & Automation Center", href: "/admin?tab=ai-automation" },
    { label: "Compliance Governance", href: "/admin?tab=compliance-governance" },
    { label: "Mobile Center", href: "/admin?tab=mobile-readiness" },
    { label: "Integration Hub", href: "/admin?tab=enterprise-integrations" },
    { label: "Workflow Builder", href: "/admin?tab=workflow-builder" },
    { label: "App Marketplace", href: "/admin?tab=app-marketplace" },
    { label: "Low-Code Studio", href: "/admin?tab=lowcode-studio" },
    { label: "Custom Modules", href: "/admin?tab=custom-crm-modules" },
    { label: "Enterprise BI", href: "/admin?tab=enterprise-bi" },
    { label: "Multi-Org Center", href: "/admin?tab=multi-organization" },
    { label: "Mission Control", href: "/admin?tab=mission-control" },
    { label: "Financial Center", href: "/admin?tab=financial-analytics" },
    {
      label: "Inventory",
      children: [
        { label: "Item Master", href: "/admin?tab=inventory-master" },
        { label: "Category Master", href: "/admin?tab=inventory-category" },
        { label: "Subcategory Master", href: "/admin?tab=inventory-subcategory" },
        { label: "Brand Master", href: "/admin?tab=inventory-brand" },
        { label: "Size Master", href: "/admin?tab=inventory-size" },
        { label: "Color Master", href: "/admin?tab=inventory-color" },
        { label: "Unit Master", href: "/admin?tab=inventory-unit" },
        { label: "Supplier Master", href: "/admin?tab=inventory-supplier" },
        { label: "VAT Master", href: "/admin?tab=inventory-vat" },
        { label: "Stock In", href: "/admin?tab=inventory-stock-in" },
        { label: "Stock Out", href: "/admin?tab=inventory-stock-out" },
        { label: "Adjustment", href: "/admin?tab=inventory-adjustment" }
      ]
    },
    {
      label: "Procurement (Purchase)",
      children: [
        { label: "Purchase Dashboard", href: "/purchase" },
        { label: "Purchase Orders", href: "/purchase?tab=procurement" },
        { label: "Purchase Requests", href: "/purchase?tab=requests" },
        { label: "Purchase Accounts", href: "/purchase?tab=accounts" }
      ]
    },
    {
      label: "Finance (Accounts)",
      children: [
        { label: "Finance Dashboard", href: "/accounts" },
        { label: "General Ledger", href: "/accounts?tab=ledger" },
        { label: "Finance Invoices", href: "/accounts?tab=invoices" },
        { label: "Subscriptions Revenue", href: "/accounts?tab=subscriptions" },
        { label: "Financial Intelligence", href: "/accounts?tab=intelligence" }
      ]
    },
    { label: "Sales Board", href: "/sales" },
    { label: "Agent Desk", href: "/agent" },
    { label: "Manager Board", href: "/manager" },
    { label: "Departments", href: "/admin?tab=departments" },
    { label: "Categories", href: "/admin?tab=categories" },
    { label: "Shortcuts", href: "/admin?tab=shortcuts" },
    { label: "Reports", href: "/admin?tab=reports" },
    { label: "Flow Analytics", href: "/admin?tab=flow-analytics" },
    { label: "Historical Archive", href: "/admin?tab=history" },
    { label: "Security", href: "/admin?tab=security" },
    { label: "Help Center", href: "/admin?tab=help-center" },
    { label: "Subscriptions", href: "/admin?tab=subscriptions" },
    { label: "Role Master", href: "/admin?tab=roles" }
  ];

  const userRole = (user?.role || role || "").toLowerCase();
  const allowedVatRoles = ["admin", "client", "sales", "manager", "management", "purchase"];
  const isVatAllowed = allowedVatRoles.includes(userRole);

  const rawLinks = (menuItems && menuItems.length > 0) ? menuItems : (role === "admin" ? adminMenuItems : fallback);

  const links = rawLinks.map(item => {
    if (item.children && Array.isArray(item.children)) {
      return {
        ...item,
        children: item.children.filter(child => {
          if (child.label === "VAT Master" || child.label === "Tax Master" || child.href?.includes("inventory-vat") || child.href?.includes("inventory-tax")) {
            return isVatAllowed;
          }
          return true;
        })
      };
    }
    return item;
  });

  const sidebarProps = { links, user, isDarkMode, setIsDarkMode, logout };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      <GlobalSearch />

      {/* ── Mobile Overlay ─────────────────────────── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ──────────────────────────── */}
      <aside
        aria-label="Mobile navigation"
        className={`
          fixed inset-y-0 left-0 z-50 w-72 glass-sidebar flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Command Center</span>
            </div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">
              JTS <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 italic">Support</span>
            </h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <nav aria-label="Mobile sidebar navigation" className="px-3 py-3 space-y-0.5">
            {links.map(item => (
              <SideNavLink
                key={item.label}
                item={item}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </div>
        {/* user panel in mobile */}
        <div className="mx-3 mb-4 shrink-0 rounded-2xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-xs select-none shrink-0 border border-white/10`}>
              {getInitials(user?.name || "")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                {role === "admin" ? "Global Admin" : role}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsDarkMode(d => !d)}
              className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/10 transition-all"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/5 border border-white/5 hover:border-rose-400/20 transition-all group"
            >
              <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Desktop Sidebar ────────────────────────── */}
      <aside
        aria-label="Desktop navigation"
        className={`
          hidden lg:flex flex-col glass-sidebar shadow-2xl flex-shrink-0 relative z-30
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isCollapsed ? "w-[5.5rem]" : "w-72"}
        `}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(c => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-8 bg-indigo-600 border border-white/10 text-white rounded-full p-1.5 shadow-xl z-50 transition-all hover:scale-110 active:scale-95 hover:bg-indigo-500"
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <SidebarContent {...sidebarProps} collapsed={isCollapsed} onNavigate={() => { }} />
      </aside>

      {/* ── Main Area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Header ───────────────────────────── */}
        <header className="glass-panel h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shrink-0">

          {/* Left: hamburger (mobile) + page title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <button
              type="button"
              aria-label="Open global search"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => window.dispatchEvent(new Event("app:open-global-search"))}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all shrink-0"
            >
              <Search size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Search</span>
              <div className="flex items-center gap-0.5 ml-2 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded text-[8px] font-black text-slate-400">
                <Command size={8} /> K
              </div>
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500 leading-none mb-0.5 truncate">
                {title}
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {subtitle}
              </h2>
            </div>
          </div>

          {/* Right: global website selector + notification bell + avatar */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Global Ecosystem Website Filter Selector */}
            {websites && websites.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-2xl shrink-0 shadow-sm">
                <Globe size={15} className="text-indigo-500 shrink-0" />
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="bg-transparent text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1 max-w-[150px] sm:max-w-[220px] truncate"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold">ALL ECOSYSTEM ASSETS</option>
                  {websites.map((w) => (
                    <option key={w._id} value={w._id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold">
                      {w.websiteName || w.domain}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                id="notifications-btn"
                onClick={() => setShowNotifications(s => !s)}
                aria-label="Notifications"
                aria-expanded={showNotifications}
                className={`relative p-2.5 rounded-xl transition-all
                  ${showNotifications
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-md">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification panel */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} aria-hidden="true" />
                  <div
                    role="dialog"
                    aria-label="Notifications"
                    className="
                      absolute right-0 mt-3 z-50
                      w-[calc(100vw-2rem)] max-w-sm sm:w-[360px]
                      bg-white dark:bg-slate-900
                      rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
                      border border-slate-100 dark:border-white/5
                      overflow-hidden animate-scale-in
                    "
                  >
                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                        Notifications
                      </h4>
                      <button
                        onClick={markAllRead}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>

                    {/* Filter pills */}
                    <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b border-slate-50 dark:border-white/5">
                      {["all", "unattended_client_alert", "vat_filing_due", "corporate_tax_due", "trade_license_expiring", "crm_follow_up_due"].map(type => (
                        <button
                          key={type}
                          onClick={() => setNotificationFilter(type)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                            ${notificationFilter === type
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                            }`}
                        >
                          {type === "all" ? "All" : type.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? notifications.map(n => (
                        <div
                          key={n._id}
                          onClick={() => {
                            markRead(n._id);
                            if (n.link) window.location.href = n.link.startsWith("/") ? n.link : `/${n.link}`;
                          }}
                          className={`px-5 py-3.5 border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all relative ${!n.isRead ? "bg-indigo-50/30 dark:bg-indigo-500/5" : ""}`}
                        >
                          {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />}
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600" : "bg-slate-100 dark:bg-white/10 text-slate-400"}`}>
                              {n.type === "new_chat" ? <MessageSquare size={13} /> : n.type === "new_ticket" ? <Ticket size={13} /> : n.type === "inventory_low_stock" ? <Package size={13} /> : <AlertCircle size={13} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-black truncate ${n.isRead ? "text-slate-500" : "text-slate-900 dark:text-white"}`}>
                                {n.title}
                              </p>
                              <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{n.message}</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {n.link && (
                                  <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-1">
                                    Go <ExternalLink size={8} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-12 text-center">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                            <Bell size={18} className="text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                            All caught up
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-xs select-none border-2 border-white dark:border-slate-800 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-default`}
              title={user?.name}
            >
              {getInitials(user?.name || "")}
            </div>
          </div>
        </header>

        {/* ── Page Content ─────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
