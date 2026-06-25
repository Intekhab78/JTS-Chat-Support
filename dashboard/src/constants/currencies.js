/**
 * Currency Master — canonical list used by the Localization settings UI.
 * Each entry pre-fills the formatCurrency options for that currency.
 */
export const CURRENCY_MASTER = [
  { code: "INR", symbol: "₹",    name: "Indian Rupee",        thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "USD", symbol: "$",    name: "US Dollar",            thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "EUR", symbol: "€",    name: "Euro",                 thousandSep: ".",  decimalSep: ",", decimalPlaces: 2, position: "before" },
  { code: "GBP", symbol: "£",    name: "British Pound",        thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "AED", symbol: "د.إ",  name: "UAE Dirham",           thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "SAR", symbol: "﷼",    name: "Saudi Riyal",          thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "CAD", symbol: "C$",   name: "Canadian Dollar",      thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "AUD", symbol: "A$",   name: "Australian Dollar",    thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "JPY", symbol: "¥",    name: "Japanese Yen",         thousandSep: ",",  decimalSep: ".", decimalPlaces: 0, position: "before" },
  { code: "SGD", symbol: "S$",   name: "Singapore Dollar",     thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "NZD", symbol: "NZ$",  name: "New Zealand Dollar",   thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "CHF", symbol: "Fr",   name: "Swiss Franc",          thousandSep: "'",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "CNY", symbol: "¥",    name: "Chinese Yuan",         thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "MYR", symbol: "RM",   name: "Malaysian Ringgit",    thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "QAR", symbol: "﷼",    name: "Qatari Riyal",         thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "KWD", symbol: "د.ك",  name: "Kuwaiti Dinar",        thousandSep: ",",  decimalSep: ".", decimalPlaces: 3, position: "before" },
  { code: "BHD", symbol: "BD",   name: "Bahraini Dinar",       thousandSep: ",",  decimalSep: ".", decimalPlaces: 3, position: "before" },
  { code: "OMR", symbol: "﷼",    name: "Omani Rial",           thousandSep: ",",  decimalSep: ".", decimalPlaces: 3, position: "before" },
  { code: "THB", symbol: "฿",    name: "Thai Baht",            thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
  { code: "ZAR", symbol: "R",    name: "South African Rand",   thousandSep: ",",  decimalSep: ".", decimalPlaces: 2, position: "before" },
];

/** Default settings (mirrors Website.js schema defaults) */
export const DEFAULT_CURRENCY_SETTINGS = {
  currency:          "Indian Rupee",
  currencyCode:      "INR",
  currencySymbol:    "₹",
  symbolPosition:    "before",
  decimalPlaces:     2,
  thousandSeparator: ",",
  decimalSeparator:  ".",
};
