/**
 * currencyFormatter.js
 *
 * Standalone (non-React) currency formatter.
 * The CurrencyContext writes to `window.__currencySettings` on every settings
 * change so this utility always reads the latest values even outside React.
 *
 * Usage:
 *   import { formatCurrency, getCurrencySymbol } from "../utils/currencyFormatter";
 *   formatCurrency(25000)  →  "₹ 25,000.00"  (uses live company settings)
 */

import { DEFAULT_CURRENCY_SETTINGS } from "../constants/currencies.js";

/**
 * Returns the active currency settings.
 * Priority: window.__currencySettings → DEFAULT_CURRENCY_SETTINGS
 */
function getSettings() {
  if (typeof window !== "undefined" && window.__currencySettings) {
    return window.__currencySettings;
  }
  return DEFAULT_CURRENCY_SETTINGS;
}

/**
 * Formats a number as a currency string using the active company settings.
 *
 * @param {number|string|null|undefined} amount
 * @param {object} [override]  Optional override for any settings field.
 * @returns {string}
 */
export function formatCurrency(amount, override = {}) {
  const s = { ...getSettings(), ...override };

  const num = Number(amount || 0);
  if (isNaN(num)) return s.symbolPosition === "before"
    ? `${s.currencySymbol} 0`
    : `0 ${s.currencySymbol}`;

  // Round to decimalPlaces
  const dp = Number(s.decimalPlaces ?? 2);
  const fixed = num.toFixed(dp);
  const [intPart, decPart] = fixed.split(".");

  // Apply thousand separator
  const sep = s.thousandSeparator ?? ",";
  let intFormatted = "";
  if (sep === "") {
    intFormatted = intPart;
  } else {
    // Indian-style grouping for INR (2-2-3 from right), otherwise standard 3-digit
    const isIndian = (s.currencyCode === "INR") && sep === ",";
    if (isIndian) {
      intFormatted = formatIndian(intPart);
    } else {
      intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    }
  }

  // Build decimal portion
  const ds = s.decimalSeparator ?? ".";
  const decStr = dp > 0 ? `${ds}${decPart}` : "";
  const numStr = `${intFormatted}${decStr}`;

  // Apply symbol position
  const sym = s.currencySymbol ?? "₹";
  if (s.symbolPosition === "after") {
    return `${numStr} ${sym}`;
  }
  return `${sym} ${numStr}`;
}

/**
 * Indian number formatting: 1,23,456 (last 3 then groups of 2)
 */
function formatIndian(intStr) {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/**
 * Returns a compact "K/L/Cr" ticker label for charts.
 * e.g. 1500000 → "₹15L", 1000 → "₹1K"
 */
export function formatCurrencyCompact(amount, override = {}) {
  const s = { ...getSettings(), ...override };
  const sym = s.currencySymbol ?? "₹";
  const num = Number(amount || 0);

  let label;
  if (Math.abs(num) >= 10_000_000) {
    label = `${(num / 10_000_000).toFixed(1)}Cr`;
  } else if (Math.abs(num) >= 100_000) {
    label = `${(num / 100_000).toFixed(1)}L`;
  } else if (Math.abs(num) >= 1_000) {
    label = `${(num / 1_000).toFixed(1)}K`;
  } else {
    label = String(num);
  }

  return s.symbolPosition === "after" ? `${label}${sym}` : `${sym}${label}`;
}

/** Exchange rates relative to USD base */
export const EXCHANGE_RATES = {
  USD: 1.0,
  AED: 3.67,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.52
};

/**
 * Converts an amount from one currency code to another based on standard exchange rates.
 */
export function convertCurrency(amount, fromCode = "USD", toCode = "INR") {
  const num = Number(amount || 0);
  if (isNaN(num) || num === 0) return 0;
  const fromRate = EXCHANGE_RATES[fromCode?.toUpperCase()] || 1.0;
  const toRate = EXCHANGE_RATES[toCode?.toUpperCase()] || 1.0;
  
  // Convert from source currency to USD, then from USD to target currency
  const inUSD = num / fromRate;
  const converted = inUSD * toRate;
  return Number(converted.toFixed(2));
}

/** Returns just the symbol for the active currency. */
export function getCurrencySymbol(override = {}) {
  return { ...getSettings(), ...override }.currencySymbol ?? "₹";
}

/** Returns the active currency code (e.g. "INR", "USD"). */
export function getCurrencyCode(override = {}) {
  return { ...getSettings(), ...override }.currencyCode ?? "INR";
}

