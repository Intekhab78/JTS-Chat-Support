/**
 * Cleans a string by removing whitespace and filtering out literal "undefined" or "null" strings.
 * Used defensively to prevent "UNDEFINED" text from appearing in the UI.
 * @param {any} val - The value to clean
 * @param {string} fallback - The fallback value if cleaning fails
 * @returns {string} The cleaned string or fallback
 */
export const cleanString = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "") return fallback;
  return str;
};
