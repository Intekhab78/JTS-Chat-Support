/**
 * CurrencyContext.jsx
 *
 * Provides currency settings to the entire React tree.
 * Fetches settings from /api/websites (first website for the logged-in user).
 * Also writes the settings to window.__currencySettings so the standalone
 * currencyFormatter.js utility stays in sync outside React.
 *
 * Usage:
 *   const { formatCurrency, currencySettings, refreshCurrency } = useCurrency();
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { DEFAULT_CURRENCY_SETTINGS } from "../constants/currencies.js";
import { formatCurrency as _format, formatCurrencyCompact as _compact, getCurrencySymbol as _sym } from "../utils/currencyFormatter.js";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currencySettings, setCurrencySettings] = useState(() => {
    // Hydrate from localStorage on first render to avoid flash of wrong currency
    try {
      const saved = localStorage.getItem("__currencySettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof window !== "undefined") window.__currencySettings = parsed;
        return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_CURRENCY_SETTINGS;
  });

  const applySettings = useCallback((settings) => {
    const merged = { ...DEFAULT_CURRENCY_SETTINGS, ...settings };
    setCurrencySettings(merged);
    // Make available to standalone formatter
    if (typeof window !== "undefined") window.__currencySettings = merged;
    try {
      localStorage.setItem("__currencySettings", JSON.stringify(merged));
    } catch { /* ignore */ }
  }, []);

  const refreshCurrency = useCallback(async () => {
    try {
      const token = localStorage.getItem("dashboard_token");
      if (!token) return;
      const websites = await api("/api/websites");
      const first = Array.isArray(websites) ? websites[0] : null;
      if (first?.currencySettings) {
        applySettings(first.currencySettings);
      }
    } catch {
      /* silently fail — keeps using cached / default settings */
    }
  }, [applySettings]);

  // Load on mount (after auth token is available)
  useEffect(() => {
    const token = localStorage.getItem("dashboard_token");
    if (token) {
      refreshCurrency();
    }
  }, [refreshCurrency]);

  // Re-fetch when the user logs in (token added to localStorage)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "dashboard_token" && e.newValue) {
        refreshCurrency();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCurrency]);

  // Convenience wrappers that always use latest settings
  const formatCurrency   = useCallback((amount) => _format(amount), [currencySettings]); // eslint-disable-line react-hooks/exhaustive-deps
  const formatCompact    = useCallback((amount) => _compact(amount), [currencySettings]); // eslint-disable-line react-hooks/exhaustive-deps
  const currencySymbol   = _sym();

  return (
    <CurrencyContext.Provider
      value={{
        currencySettings,
        currencySymbol,
        formatCurrency,
        formatCompact,
        refreshCurrency,
        applySettings,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Graceful fallback — won't crash if used outside provider
    return {
      currencySettings:  DEFAULT_CURRENCY_SETTINGS,
      currencySymbol:    "₹",
      formatCurrency:    (v) => _format(v),
      formatCompact:     (v) => _compact(v),
      refreshCurrency:   () => {},
      applySettings:     () => {},
    };
  }
  return ctx;
}
