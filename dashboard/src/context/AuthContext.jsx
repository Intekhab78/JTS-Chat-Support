import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("dashboard_token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Decode token to get expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expTime = payload.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expTime - now;

      if (timeUntilExpiry > 0) {
        // Show warning 5 minutes before expiry
        const warningTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000);
        const warningTimer = setTimeout(() => setSessionWarning(true), warningTime);

        // Auto logout at expiry
        const logoutTimer = setTimeout(() => {
          logout();
          setSessionWarning(false);
        }, timeUntilExpiry);

        setSessionTimeout({ warningTimer, logoutTimer });
      }
    } catch (e) {
      // Invalid token
    }

    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("dashboard_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password, twoFactorCode = "") {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, twoFactorCode })
    });

    if (data.twoFactorRequired) {
      return data;
    }

    localStorage.setItem("dashboard_token", data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    localStorage.setItem("dashboard_token", data.token);
    setUser(data.user);
    return data.user;
  }

  const extendSession = async () => {
    try {
      const response = await api("/api/auth/refresh", { method: "POST" });
      if (response.token) {
        localStorage.setItem("dashboard_token", response.token);
        setSessionWarning(false);
        // Clear existing timers
        if (sessionTimeout?.warningTimer) clearTimeout(sessionTimeout.warningTimer);
        if (sessionTimeout?.logoutTimer) clearTimeout(sessionTimeout.logoutTimer);
        // Reset timers with new token
        const payload = JSON.parse(atob(response.token.split('.')[1]));
        const expTime = payload.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expTime - now;
        const warningTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000);
        const warningTimer = setTimeout(() => setSessionWarning(true), warningTime);
        const logoutTimer = setTimeout(() => {
          logout();
          setSessionWarning(false);
        }, timeUntilExpiry);
        setSessionTimeout({ warningTimer, logoutTimer });
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
    }
  };

  function logout() {
    localStorage.removeItem("dashboard_token");
    setUser(null);
    setSessionWarning(false);
    // Clear timers
    if (sessionTimeout?.warningTimer) clearTimeout(sessionTimeout.warningTimer);
    if (sessionTimeout?.logoutTimer) clearTimeout(sessionTimeout.logoutTimer);
    setSessionTimeout(null);
  }

  return <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, sessionWarning, extendSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
