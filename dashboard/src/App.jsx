import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import SessionWarningModal from "./components/SessionWarningModal.jsx";
import { normalizeRole } from "./utils/roles.js";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const ClientPage = lazy(() => import("./pages/ClientPage.jsx"));
const AgentPage = lazy(() => import("./pages/AgentPage.jsx"));
const PurchasePage = lazy(() => import("./pages/PurchasePage.jsx"));
const TicketStatusPage = lazy(() => import("./pages/TicketStatusPage.jsx"));
const ManagerPage = lazy(() => import("./pages/ManagerPage.jsx"));
const SalesPage = lazy(() => import("./pages/SalesPage.jsx"));
const SupplierPage = lazy(() => import("./pages/SupplierPage.jsx"));
const AccountsPage = lazy(() => import("./pages/AccountsPage.jsx"));
const CustomerPortalPage = lazy(() => import("./pages/CustomerPortalPage.jsx"));

function destinationForRole(role) {
  if (String(role || "").trim().toLowerCase() === "purchase") return "/purchase";
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "customer") return "/customer-portal";
  if (normalizedRole === "accounts") return "/accounts";
  if (normalizedRole === "agent") return "/agent";
  if (normalizedRole === "sales") return "/sales";
  if (normalizedRole === "manager") return "/manager";
  if (normalizedRole === "admin") return "/admin";
  if (normalizedRole === "client") return "/client";
  if (normalizedRole === "supplier") return "/supplier";
  return "/agent";
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rawRole = String(user.role || "").trim().toLowerCase();
  if (rawRole === "admin") {
    return children; // Super Admin has access to all page routes
  }

  if ((rawRole === "purchase" || rawRole === "supplier") && allowedRoles && !allowedRoles.includes(rawRole)) {
    return <Navigate to={destinationForRole(user.role)} replace />;
  }

  const effectiveRole = normalizeRole(user.role);
  if (allowedRoles && !allowedRoles.includes(user.role) && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to={destinationForRole(user.role)} replace />;
  }

  return children;
}


export default function App() {
  const { user, sessionWarning, extendSession, logout } = useAuth();

  return (
    <>
      <Suspense fallback={<div className="screen-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ticket-status/:ticketId" element={<TicketStatusPage />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><ClientPage /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute allowedRoles={["manager"]}><ManagerPage /></ProtectedRoute>} />
          <Route path="/client" element={<ProtectedRoute allowedRoles={["client"]}><ClientPage /></ProtectedRoute>} />
          <Route path="/purchase" element={<ProtectedRoute allowedRoles={["purchase"]}><PurchasePage /></ProtectedRoute>} />
          <Route path="/supplier" element={<ProtectedRoute allowedRoles={["supplier"]}><SupplierPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute allowedRoles={["sales"]}><SalesPage /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute allowedRoles={["accounts"]}><AccountsPage /></ProtectedRoute>} />
          <Route path="/customer-portal" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerPortalPage /></ProtectedRoute>} />
          <Route path="/agent" element={<ProtectedRoute allowedRoles={["agent", "user"]}><AgentPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={user ? destinationForRole(user.role) : "/"} replace />} />
        </Routes>
      </Suspense>

      <SessionWarningModal
        open={sessionWarning}
        onExtend={extendSession}
        onLogout={logout}
      />
    </>
  );
}
