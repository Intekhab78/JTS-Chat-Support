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
import { useWebsite } from "./WebsiteContext.jsx";
import { DEFAULT_CURRENCY_SETTINGS } from "../constants/currencies.js";
import { formatCurrency as _format, formatCurrencyCompact as _compact, getCurrencySymbol as _sym } from "../utils/currencyFormatter.js";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { selectedWebsite, selectedWebsiteId } = useWebsite();

  const [currencySettings, setCurrencySettings] = useState(() => {
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
    if (typeof window !== "undefined") window.__currencySettings = merged;
    try {
      localStorage.setItem("__currencySettings", JSON.stringify(merged));
    } catch { /* ignore */ }
  }, []);

  // Sync currency automatically when selected website or its currencySettings change
  useEffect(() => {
    if (selectedWebsite?.currencySettings) {
      applySettings(selectedWebsite.currencySettings);
    }
  }, [selectedWebsite, selectedWebsiteId, applySettings]);

  const refreshCurrency = useCallback(async (targetWebsiteId) => {
    try {
      const token = localStorage.getItem("dashboard_token");
      if (!token) return;
      const websites = await api("/api/websites");
      const activeId = targetWebsiteId || selectedWebsiteId || localStorage.getItem("jts_selected_website_id");
      const target = websites.find(w => w._id === activeId) || websites[0];
      if (target?.currencySettings) {
        applySettings(target.currencySettings);
      }
    } catch {
      /* silently fail */
    }
  }, [selectedWebsiteId, applySettings]);

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
