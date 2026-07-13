const DEFAULT_LOCAL_API_URL = "http://localhost:5000";
const DEFAULT_REMOTE_API_URL = "https://chatapi.jtsonline.shop";
const LOCAL_API_URL = (import.meta.env.VITE_LOCAL_API_URL || DEFAULT_LOCAL_API_URL).trim().replace(/\/+$/, "");
const REMOTE_API_URL = (import.meta.env.VITE_REMOTE_API_URL || DEFAULT_REMOTE_API_URL).trim().replace(/\/+$/, "");
const EXPLICIT_API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

export let API_BASE = EXPLICIT_API_URL || (import.meta.env.PROD ? REMOTE_API_URL : LOCAL_API_URL);

let apiBasePromise = null;

async function canReachLocalApi() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${LOCAL_API_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getApiBase() {
  if (EXPLICIT_API_URL) {
    // If the explicit url is a local address, verify its reachability first.
    if (EXPLICIT_API_URL.includes("localhost") || EXPLICIT_API_URL.includes("127.0.0.1")) {
      if (!apiBasePromise) {
        apiBasePromise = canReachLocalApi().then((localIsReachable) => {
          API_BASE = localIsReachable ? EXPLICIT_API_URL : DEFAULT_REMOTE_API_URL;
          return API_BASE;
        });
      }
      return apiBasePromise;
    }
    API_BASE = EXPLICIT_API_URL;
    return API_BASE;
  }

  // If no explicit URL is configured, dynamically detect if local API is running, else use remote.
  if (!apiBasePromise) {
    apiBasePromise = canReachLocalApi().then((localIsReachable) => {
      API_BASE = localIsReachable ? LOCAL_API_URL : REMOTE_API_URL;
      return API_BASE;
    });
  }

  return apiBasePromise;
}

export async function apiUrl(path = "") {
  return `${await getApiBase()}${path}`;
}

export async function api(path, options = {}) {
  const apiBase = await getApiBase();
  const token = localStorage.getItem("dashboard_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch((error) => {
    console.error("Failed to parse JSON response:", error);
    return {};
  });
  if (response.status === 401) {
    const isAuthPath = path.includes("/api/auth/login") || path.includes("/api/auth/register");
    const isAlreadyOnLogin = window.location.pathname === "/login";

    if (!isAuthPath && !isAlreadyOnLogin) {
      localStorage.removeItem("dashboard_token");
      window.location.href = "/login";
    }
    throw new Error(data.message || "Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Add familiar helper methods to prevent crashes in legacy/external components
api.get = (path, options = {}) => api(path, { ...options, method: "GET" });
api.post = (path, body, options = {}) => api(path, { ...options, method: "POST", body: JSON.stringify(body) });
api.patch = (path, body, options = {}) => api(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
api.delete = (path, options = {}) => api(path, { ...options, method: "DELETE" });
