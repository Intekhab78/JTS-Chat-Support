import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, Globe, Headphones, MessageSquare, BarChart, ChevronLeft,
  ChevronRight, LogOut, Sun, Moon, Bell, Ticket, AlertTriangle, AlertCircle, Clock, Menu, X,
  Package, Contact, CreditCard, ShieldCheck, ExternalLink, Search, Command, ChevronDown,
  FileText, ShieldAlert, FileSpreadsheet, Building2, Sparkles, Activity, Cpu, Layers,
  Compass, Smartphone, Network, GitBranch, ShoppingBag, Boxes, Database, PieChart,
  Building, Radio, DollarSign, Award, Box, FolderTree, GitCommit, Tag, Ruler, Palette,
  Scale, Truck, ArrowDownRight, ArrowUpRight, Sliders, ShoppingCart, LayoutGrid, FilePlus,
  Landmark, BarChart2, BookOpen, Receipt, TrendingUp, BrainCircuit, Target, UserPlus,
  Briefcase, Grid, Zap, GitMerge, Lock, HelpCircle, UserCheck, FileCheck, Code2, RefreshCw,
  PhoneMissed, Settings
} from "lucide-react";
import { api, getBackendStatus, resolveActiveBackend, setActiveApiBase, DEFAULT_LOCAL_API_URL } from "../api/client.js";
import { useSocket } from "../context/SocketContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import GlobalSearch from "./CrmSystem/GlobalSearch.jsx";
import VoiceCallHandler from "./VoiceCallHandler.jsx";
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
  "Overview": LayoutDashboard,
  "Clients": Users,
  "Websites": Globe,
  "Agents": Headphones,
  "Chats": MessageSquare,
  "Live Chat": MessageSquare,
  "Assigned Chats": MessageSquare,
  "Tickets": Ticket,
  "CRM": Contact,
  "Customer Master": UserCheck,
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
  "Workflow Builder": GitMerge,
  "Flow Builder": GitBranch,
  "AI Voice Logs": Radio,
  "AI Knowledge Base": BookOpen,
  "Service Routing": Sliders,
  "App Marketplace": ShoppingBag,
  "Low-Code Studio": Boxes,
  "Custom Modules": Database,
  "Enterprise BI": PieChart,
  "Multi-Org Center": Building2,
  "Mission Control": Compass,
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
  "Tax Master": FileSpreadsheet,
  "VAT Master": FileSpreadsheet,
  "Stock Movement": RefreshCw,
  "Stock In": ArrowDownRight,
  "Stock Out": ArrowUpRight,
  "Adjustment": Sliders,

  "Procurement (Purchase)": ShoppingCart,
  "Purchase Dashboard": LayoutGrid,
  "Purchase Orders": FileText,
  "Purchase Requests": FilePlus,
  "Purchase Accounts": Landmark,

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
  "Subscriptions": Award,
  "Role Master": ShieldAlert,
  "Orders": ShoppingBag,
  "Catalog": Package,
  "Ledger": BookOpen,
  "Insights": TrendingUp,
  "Invoices": Receipt,
  "Command Center": LayoutDashboard,
  "Performance": BarChart2,
  "Active Queue": MessageSquare,
  "My Team": Users,
  "Pipeline": Target,
  "Tasks": FileCheck,
  "Notes": FileText,
  "Requests": FilePlus,
  "Procurement": ShoppingCart,
  "Settings": Settings,
  "Company Settings": Settings,
  "Inventory Master": Package,
  "CRM Pipeline": Contact,
  "Integrations Hub": Network,
  "Security Center": Lock,
  "Billing & Plans": CreditCard,
};

function resolveMenuIcon(item) {
  if (item?.icon) return item.icon;
  const label = String(item?.label || "").trim();
  if (iconMap[label]) return iconMap[label];
  const lower = `${label} ${item?.href || ""}`.toLowerCase();
  if (lower.includes("chat")) return MessageSquare;
  if (lower.includes("invoice")) return Receipt;
  if (lower.includes("ledger")) return BookOpen;
  if (lower.includes("bill")) return CreditCard;
  if (lower.includes("ticket")) return Ticket;
  if (lower.includes("crm")) return Contact;
  if (lower.includes("customer")) return UserCheck;
  if (lower.includes("inventory") || lower.includes("catalog")) return Package;
  if (lower.includes("procure") || lower.includes("purchase")) return ShoppingCart;
  if (lower.includes("report") || lower.includes("analytic")) return BarChart;
  if (lower.includes("insight")) return TrendingUp;
  if (lower.includes("role")) return ShieldAlert;
  if (lower.includes("security")) return Lock;
  if (lower.includes("setting")) return Settings;
  if (lower.includes("team") || lower.includes("agent")) return Users;
  return LayoutDashboard;
}

/* ── nav link ─────────────────────────────────────── */
function SideNavLink({ item, collapsed, onNavigate, isChild = false }) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const isActive = currentPath === item.href;
  const Icon = resolveMenuIcon(item);

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={
        `relative flex items-center gap-3 rounded-2xl transition-all duration-200 group
         ${collapsed ? "justify-center px-0 py-3" : isChild ? "px-8 py-2.5" : "px-4 py-2.5"}
         ${isActive
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
        }`
      }
    >
      {isActive && (
        <div className="absolute left-0 w-1 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
      )}
      <Icon
        size={collapsed ? 22 : 17}
        className={`shrink-0 transition-transform duration-200 group-hover:scale-110
          ${isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white"}`}
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
  const Icon = resolveMenuIcon(item);
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
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
          }`}
      >
        <Icon
          size={collapsed ? 22 : 17}
          className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isExpanded || childActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white"
            }`}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left text-[11px] font-black uppercase tracking-[0.12em]">
              {item.label}
            </span>
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-indigo-600 dark:text-indigo-300" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white"
                }`}
            />
          </>
        )}
      </button>

      {!collapsed && isExpanded && (
        <div className="space-y-1 pl-2.5 py-1 bg-slate-50/70 dark:bg-white/[0.02] border-l border-slate-200/80 dark:border-white/5 rounded-r-2xl mt-1">
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
function MobileSidebarNav({ links, onNavigate }) {
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
  return links.map((item) => (
    <SidebarNavItem
      key={item.label}
      item={item}
      collapsed={false}
      onNavigate={onNavigate}
      currentPath={currentPath}
      expandedMenus={expandedMenus}
      setExpandedMenus={setExpandedMenus}
    />
  ));
}

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
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Command Center</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              JTS <span className="text-indigo-600 dark:text-indigo-400 italic">Support</span>
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
      <div className={`mx-3 mb-4 shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-white/5 dark:bg-white/5 ${collapsed ? "p-2" : "p-4"}`}>
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
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-400/10 rounded-xl transition-all"
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
                <p className="text-[12px] font-black text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest truncate">
                  {role === "admin" ? "Global Admin" : role}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDarkMode(d => !d)}
                title="Toggle theme"
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-slate-900 bg-white border border-slate-200/80 hover:border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10 transition-all"
              >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={logout}
                title="Sign out"
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-rose-600 bg-white border border-slate-200/80 hover:border-rose-200 dark:text-slate-400 dark:hover:text-rose-400 dark:bg-white/5 dark:border-white/5 dark:hover:border-rose-400/20 transition-all group"
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
  const location = useLocation();
  const { user, logout } = useAuth();
  const socket = useSocket();
  const { websites, selectedWebsiteId, setSelectedWebsiteId, selectedWebsite } = useWebsite() || {};

  // Desktop: collapsed/expanded sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Mobile: drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [accentTheme, setAccentTheme] = useState(() => localStorage.getItem("themeAccent") || "indigo");
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const [backendStatus, setBackendStatus] = useState(getBackendStatus);

  useEffect(() => {
    const handleSwitch = (e) => {
      setBackendStatus({
        apiBase: e.detail?.apiBase || "",
        isLocal: Boolean(e.detail?.isLocal)
      });
    };
    window.addEventListener("backend-switch", handleSwitch);
    resolveActiveBackend().then(() => setBackendStatus(getBackendStatus()));
    return () => window.removeEventListener("backend-switch", handleSwitch);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const role = normalizeRole(user?.role);

  /* Dark mode */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  /* Accent theme */
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentTheme);
    localStorage.setItem("themeAccent", accentTheme);
  }, [accentTheme]);

  /* Close profile menu on outside click or Escape */
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showProfileMenu]);


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

  /* Auto-collapse left sidebar only when opening Chats tab or selecting a chat session */
  const prevChatStateRef = useRef({ isChats: false, sessionId: "" });
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isChats = params.get("tab") === "chats";
    const sessionId = params.get("sessionId") || "";
    const prev = prevChatStateRef.current;

    if (isChats && (!prev.isChats || (sessionId && sessionId !== prev.sessionId))) {
      setIsCollapsed(true);
    }

    prevChatStateRef.current = { isChats, sessionId };
  }, [location.pathname, location.search]);

  /* Notifications */
  const fetchNotifications = useCallback(async () => {
    try {
      const q = notificationFilter !== "all" ? `?type=${notificationFilter}` : "";
      const res = await api(`/api/notifications${q}`);
      setNotifications(Array.isArray(res) ? res : []);
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
  const dashboardHref = role === "admin" ? "/admin" : role === "manager" ? "/manager" : role === "client" ? "/client" : role === "sales" ? "/sales" : role === "purchase" ? "/purchase" : role === "supplier" ? "/supplier?tab=dashboard" : role === "accounts" ? "/accounts" : "/agent";
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
    if (hasPermission(user, PERMISSIONS.INVOICE_VIEW) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE)) {
      fallback.push({ label: "Invoices", href: "/accounts?tab=invoices" });
    }
    if (hasPermission(user, PERMISSIONS.ACCOUNTS_VIEW)) {
      fallback.push({ label: "Ledger", href: "/accounts?tab=ledger" });
    }
    if (hasPermission(user, PERMISSIONS.BILLING_VIEW)) {
      fallback.push({ label: "Billing", href: "/accounts?tab=billing" });
    }
    if (hasPermission(user, PERMISSIONS.CHAT_VIEW)) {
      fallback.push({ label: "Live Chat", href: "/accounts?tab=chats" });
    }
    if (hasPermission(user, PERMISSIONS.CRM_VIEW)) {
      fallback.push({ label: "CRM", href: "/accounts?tab=crm" });
    }
    if (hasPermission(user, PERMISSIONS.TICKET_VIEW)) {
      fallback.push({ label: "Tickets", href: "/accounts?tab=tickets" });
    }
    if (hasPermission(user, PERMISSIONS.INVENTORY_VIEW)) {
      fallback.push({ label: "Inventory", href: "/accounts?tab=inventory" });
    }
    if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
      fallback.push({ label: "Reports", href: "/accounts?tab=reports" });
    }
  }

  // Dynamic Tax & Compliance Sidebar Menu Links
  if (role === "tax_consultant" || hasPermission(user, "tax.view") || hasPermission(user, "tax.vat")) {
    if (role === "tax_consultant") {
      fallback.length = 0;
      fallback.push({ label: "CRM", href: "/tax-consultant?tab=crm" });
      fallback.push({ label: "Customer Master", href: "/tax-consultant?tab=inventory-customer" });
    }
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
    { label: "Risk Register", href: "/admin?tab=risk-register" },
    { label: "SLA & SLO Center", href: "/admin?tab=sla-center" },
    { label: "Observability Center", href: "/admin?tab=observability" },
    { label: "Developer Portal", href: "/admin?tab=developer-portal" },
    { label: "Integration Hub", href: "/admin?tab=enterprise-integrations" },
    { label: "Low-Code Studio", href: "/admin?tab=lowcode-studio" },
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
        { label: "Tax Master", href: "/admin?tab=inventory-tax" },
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
    { label: "Historical Archive", href: "/admin?tab=history" },
    { label: "Security", href: "/admin?tab=security" },
    { label: "Help Center", href: "/admin?tab=help-center" },
    { label: "Subscriptions", href: "/admin?tab=subscriptions" },
    { label: "Role Master", href: "/admin?tab=roles" }
  ];

  const clientMenuItems = [
    { label: "Dashboard", href: "/client" },
    { label: "Websites", href: "/client?tab=websites" },
    { label: "Integration Hub", href: "/client?tab=enterprise-integrations" },
    { label: "Billing", href: "/client?tab=billing" },
    { label: "Chats", href: "/client?tab=chats" },
    { label: "Tickets", href: "/client?tab=tickets" },
    { label: "Agents", href: "/client?tab=agents" },
    { label: "Customer Master", href: "/client?tab=inventory-customer" },
    { label: "CRM", href: "/client?tab=crm" },
    { label: "Flow Builder", href: "/client?tab=flow-builder" },
    { label: "Help Center", href: "/client?tab=help-center" },
    { label: "AI Voice Logs", href: "/client?tab=voice-logs" },
    {
      label: "Service Routing",
      children: [
        { label: "Departments", href: "/client?tab=departments" },
        { label: "Categories", href: "/client?tab=categories" },
        { label: "Shortcuts", href: "/client?tab=shortcuts" },
        { label: "Historical Archive", href: "/client?tab=history" }
      ]
    },
    { label: "Reports", href: "/client?tab=reports" },
    { label: "Security", href: "/client?tab=security" },
    { label: "Role Master", href: "/client?tab=roles" }
  ];

  const userRole = (user?.role || role || "").toLowerCase();
  const allowedVatRoles = ["admin", "client", "sales", "manager", "management", "purchase"];
  const isVatAllowed = allowedVatRoles.includes(userRole);

  const isComplianceEnabled = !selectedWebsite || !Array.isArray(selectedWebsite.enabledModules) || selectedWebsite.enabledModules.includes("compliance");

  const isDeprecatedCompliance = (href = "", label = "") => {
    const text = `${href} ${label}`.toLowerCase();
    return (
      text.includes("vat-compliance") ||
      text.includes("corporate-tax") ||
      text.includes("trade-license") ||
      text.includes("compliance-reports")
    );
  };

  const isComplianceLink = (href = "", label = "") => {
    const text = `${href} ${label}`.toLowerCase();
    return (
      text.includes("inventory-vat") ||
      text.includes("inventory-tax") ||
      text.includes("vat master") ||
      text.includes("tax master")
    );
  };

  const rawLinks = (menuItems && menuItems.length > 0) ? menuItems : (role === "admin" ? adminMenuItems : role === "client" ? clientMenuItems : fallback);

  const links = rawLinks
    .filter(item => {
      if (isDeprecatedCompliance(item.href, item.label)) {
        return false;
      }
      if (!isComplianceEnabled && isComplianceLink(item.href, item.label)) {
        return false;
      }
      return true;
    })
    .map(item => {
      if (item.children && Array.isArray(item.children)) {
        return {
          ...item,
          children: item.children.filter(child => {
            if (!isComplianceEnabled && isComplianceLink(child.href, child.label)) {
              return false;
            }
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Command Center</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
              JTS <span className="text-indigo-600 dark:text-indigo-400 italic">Support</span>
            </h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <nav aria-label="Mobile sidebar navigation" className="px-3 py-3 space-y-0.5"><MobileSidebarNav links={links} onNavigate={() => setMobileOpen(false)} />{false && (<div>
            {links.map(item => (
              <SideNavLink
                key={item.label}
                item={item}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </div>)}</nav>
        </div>
        {/* user panel in mobile */}
        <div className="mx-3 mb-4 shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-white/5 dark:bg-white/5 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-xs select-none shrink-0 border border-white/10`}>
              {getInitials(user?.name || "")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest truncate">
                {role === "admin" ? "Global Admin" : role}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsDarkMode(d => !d)}
              className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-slate-900 bg-white border border-slate-200/80 hover:border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10 transition-all"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-rose-600 bg-white border border-slate-200/80 hover:border-rose-200 dark:text-slate-400 dark:hover:text-rose-400 dark:bg-white/5 dark:border-white/5 dark:hover:border-rose-400/20 transition-all group"
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
          hidden lg:flex flex-col glass-sidebar shadow-2xl flex-shrink-0 relative z-[45]
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isCollapsed ? "w-[5.5rem]" : "w-72"}
        `}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(c => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-7 bg-indigo-600 border border-white/10 text-white rounded-full p-2 shadow-xl z-50 transition-all hover:scale-110 active:scale-95 hover:bg-indigo-500 flex items-center justify-center"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all shrink-0"
            >
              <Search size={14} />
              <span className="text-xs font-semibold">Search</span>
              <kbd className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded text-[10px] font-semibold text-slate-400">
                ⌘K
              </kbd>
            </button>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate hidden md:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: global website selector + notification bell + avatar */}
          <div className="flex items-center gap-2.5 shrink-0">


            {/* Global Ecosystem Website Filter Selector */}
            {websites && websites.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1.5 rounded-xl shrink-0">
                <Globe size={14} className="text-indigo-600 shrink-0" />
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1 max-w-[140px] sm:max-w-[200px] truncate"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-800 font-medium">All Websites</option>
                  {websites.map((w) => (
                    <option key={w._id} value={w._id} className="bg-white dark:bg-slate-900 text-slate-800 font-medium">
                      {w.websiteName || w.domain}
                    </option>
                  ))}
                </select>
              </div>
            )}


            {/* Theme Accent Customizer */}
            <div className="relative">
              <button
                onClick={() => setShowAccentPicker(s => !s)}
                aria-label="Theme Accent Color"
                className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                title="Customize Accent Color"
              >
                <Palette size={19} />
              </button>

              {showAccentPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAccentPicker(false)} />
                  <div className="absolute right-0 mt-3 z-50 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 p-3 space-y-2 animate-scale-in">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Theme Accent</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "indigo", label: "Indigo", hex: "#6366f1" },
                        { id: "blue", label: "Blue", hex: "#3b82f6" },
                        { id: "emerald", label: "Emerald", hex: "#10b981" },
                        { id: "teal", label: "Teal", hex: "#14b8a6" },
                        { id: "cyberpunk", label: "Cyan", hex: "#06b6d4" },
                        { id: "violet", label: "Violet", hex: "#8b5cf6" },
                        { id: "fuchsia", label: "Fuchsia", hex: "#d946ef" },
                        { id: "rose", label: "Rose", hex: "#f43f5e" },
                        { id: "amber", label: "Amber", hex: "#f59e0b" },
                        { id: "slate", label: "Slate", hex: "#475569" },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setAccentTheme(t.id);
                            setShowAccentPicker(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                            accentTheme === t.id
                              ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 shadow-xs"
                              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                            style={{ backgroundColor: t.hex }}
                          />
                          <span className="text-slate-700 dark:text-slate-200 truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                id="notifications-btn"
                onClick={() => {
                  setShowNotifications(s => {
                    if (!s) fetchNotifications();
                    return !s;
                  });
                }}
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
                      {["all", "missed_call", "unattended_client_alert", "crm_follow_up_due"].map(type => (
                        <button
                          key={type}
                          onClick={() => setNotificationFilter(type)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                            ${notificationFilter === type
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                            }`}
                        >
                          {type === "all" ? "All" : type === "missed_call" ? (
                            <span className="inline-flex items-center gap-1">
                              <PhoneMissed size={10} /> Missed Calls
                            </span>
                          ) : type.replaceAll("_", " ")}
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
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? (n.type === "missed_call" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600") : "bg-slate-100 dark:bg-white/10 text-slate-400"}`}>
                              {n.type === "missed_call" ? <PhoneMissed size={13} className="text-rose-500" /> : n.type === "new_chat" ? <MessageSquare size={13} /> : n.type === "new_ticket" ? <Ticket size={13} /> : n.type === "inventory_low_stock" ? <Package size={13} /> : <AlertCircle size={13} />}
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

            {/* Avatar & Account Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowNotifications(false);
                  setShowAccentPicker(false);
                }}
                aria-expanded={showProfileMenu}
                aria-haspopup="menu"
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-xs select-none border-2 border-white dark:border-slate-800 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40`}
                title={user?.name || "Account Menu"}
              >
                {getInitials(user?.name || "")}
              </button>

              {showProfileMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* User Identity Header */}
                  <div className="p-4 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(user?.name || "")} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm`}
                    >
                      {getInitials(user?.name || "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-[10.5px] font-semibold text-slate-400 truncate">
                        {user?.email || "No email"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[8.5px] font-black uppercase tracking-wider">
                          {role || "user"}
                        </span>
                        {user?.subscription?.plan && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[8.5px] font-black uppercase tracking-wider">
                            {user.subscription.plan}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                            user?.twoFactorEnabled
                              ? "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300"
                              : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {user?.twoFactorEnabled ? "2FA On" : "2FA Off"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Navigation & Settings */}
                  <div className="p-1.5 space-y-0.5">
                    {(role === "client" || role === "admin") && (
                      <>
                        <NavLink
                          to={`/${role}?tab=security`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <ShieldCheck size={14} className="text-indigo-500 shrink-0" />
                          <span>Security & 2FA Settings</span>
                        </NavLink>
                        <NavLink
                          to={`/${role}?tab=billing`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <CreditCard size={14} className="text-emerald-500 shrink-0" />
                          <span>Billing & Subscription</span>
                        </NavLink>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsDarkMode((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        {isDarkMode ? (
                          <Sun size={14} className="text-amber-500 shrink-0" />
                        ) : (
                          <Moon size={14} className="text-indigo-500 shrink-0" />
                        )}
                        <span>{isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                      </span>
                      <span className="text-[9px] font-black uppercase text-slate-400">
                        {isDarkMode ? "Dark" : "Light"}
                      </span>
                    </button>

                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            backendStatus?.isLocal ? "bg-emerald-500" : "bg-indigo-500"
                          }`}
                        />
                        <span>API Environment</span>
                      </span>
                      <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-300">
                        {backendStatus?.isLocal ? "Local" : "Cloud"}
                      </span>
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="p-1.5 border-t border-slate-100 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} className="shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ─────────────────────────── */}
        {(() => {
          const currentTab = new URLSearchParams(location?.search || "").get("tab") || "";
          const isDedicatedChat = (
            currentTab === "chats" ||
            title === "Conversation Hub" ||
            title === "Operation Room" ||
            title === "Sales Chats" ||
            title === "Assigned Chats" ||
            title === "Live Chat Console"
          );
          const isChatView = isDedicatedChat &&
            !title.toLowerCase().includes("builder") &&
            !title.toLowerCase().includes("flow") &&
            !title.toLowerCase().includes("decision") &&
            !title.toLowerCase().includes("bot") &&
            !currentTab.includes("flow") &&
            !currentTab.includes("builder");

          return (
            <main className={`flex-1 flex flex-col min-h-0 ${isChatView ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"}`}>
              {user?.subscription?.status === "expired" && (
                <div className="bg-rose-600 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-in slide-in-from-top-4 duration-500 border-b border-rose-700 shrink-0">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="shrink-0 animate-pulse text-amber-300" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">SUBSCRIPTION EXPIRED</p>
                      <p className="text-[11px] font-bold text-rose-100 mt-0.5">Your subscription has expired. Renew your plan package to maintain uninterrupted access to enterprise modules & live widgets.</p>
                    </div>
                  </div>
                  <a href="/client?tab=billing" className="px-5 py-2.5 bg-white text-rose-600 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shrink-0">
                    Renew Subscription Now
                  </a>
                </div>
              )}
              <div className={`w-full mx-auto animate-fade-in flex-1 flex flex-col min-h-0 ${isChatView ? "p-2 sm:p-3 h-full overflow-hidden max-w-[1800px]" : "p-3 sm:p-4 max-w-[1800px]"}`}>
                {children}
              </div>
            </main>
          );
        })()}
      </div>

      {/* Global Voice Calling System for Incoming Agent Calls */}
      <VoiceCallHandler />
    </div>
  );
}
