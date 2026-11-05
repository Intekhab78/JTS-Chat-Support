function normalizeApiUrl(url, defaultUrl = "") {
  let val = (url || defaultUrl || "").trim().replace(/\/+$/, "");
  if (!val) return "";
  if (!/^https?:\/\//i.test(val)) {
    val = (val.includes("localhost") || val.includes("127.0.0.1") ? "http://" : "https://") + val;
  }
  return val;
}

export const DEFAULT_LOCAL_API_URL = "http://localhost:5000";
export const DEFAULT_REMOTE_API_URL = "https://chatapi.jtsmiddleeast.com";

export const LOCAL_API_URL = normalizeApiUrl(import.meta.env.VITE_LOCAL_API_URL, DEFAULT_LOCAL_API_URL);
export const REMOTE_API_URL = normalizeApiUrl(import.meta.env.VITE_REMOTE_API_URL, DEFAULT_REMOTE_API_URL);

export const isLocalHostTab =
  typeof window !== "undefined" &&
  Boolean(
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local")
  );

// In localhost browser, default API_BASE to LOCAL_API_URL so local agent matches local port 5000
export let API_BASE = isLocalHostTab ? LOCAL_API_URL : REMOTE_API_URL;

// State management for smart health check and failover
let activeBaseResolved = isLocalHostTab ? LOCAL_API_URL : null;
let cachedLocalHealth = null; // boolean | null
let lastHealthCheckTime = 0;
const HEALTH_CACHE_TTL = 15000; // 15 seconds
let ongoingHealthCheckPromise = null;

/**
 * Check if the local backend is responding to /health
 */
export async function canReachLocalApi(url = LOCAL_API_URL) {
  if (typeof window === "undefined" || !url) return false;

  // On public live HTTPS domains, browsers restrict mixed-content HTTP requests
  if (
    window.location.protocol === "https:" &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1")
  ) {
    return false;
  }

  // Generous timeout for local development (3500ms instead of 800ms)
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 3500);

  try {
    let res = await fetch(`${url}/health`, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
      signal: controller.signal
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${url}/api/health`, {
        method: "GET",
        cache: "no-store",
        mode: "cors",
        signal: controller.signal
      }).catch(() => null);
    }
    return Boolean(res && res.ok);
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Set and notify listeners about active backend change
 */
export function setActiveApiBase(newBase, reason = "auto_detect") {
  const normalized = normalizeApiUrl(newBase, REMOTE_API_URL);
  if (API_BASE !== normalized) {
    const prevBase = API_BASE;
    API_BASE = normalized;
    activeBaseResolved = normalized;
    const isLocal = normalized.includes("localhost") || normalized.includes("127.0.0.1");

    console.info(
      `%c[Backend Switcher] %cActive API: ${normalized} (${isLocal ? "LOCAL" : "CLOUD"}) [Reason: ${reason}]`,
      "color: #4f46e5; font-weight: bold;",
      `color: ${isLocal ? "#059669" : "#2563eb"}; font-weight: bold;`
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("backend-switch", {
          detail: {
            apiBase: normalized,
            prevBase,
            isLocal,
            reason
          }
        })
      );
    }
  } else {
    activeBaseResolved = normalized;
  }
}

/**
 * Perform intelligent health resolution:
 * Checks if local backend is up; if yes, uses local.
 * If no, seamlessly switches to remote cloud backend.
 */
export async function resolveActiveBackend(force = false) {
  // If running in local browser, keep dashboard firmly locked to LOCAL_API_URL
  if (isLocalHostTab) {
    if (API_BASE !== LOCAL_API_URL) {
      setActiveApiBase(LOCAL_API_URL, "localhost_dev_pin");
    }
    return LOCAL_API_URL;
  }

  const now = Date.now();

  // If cache is still valid and not forcing a recheck, return current base
  if (!force && cachedLocalHealth !== null && now - lastHealthCheckTime < HEALTH_CACHE_TTL && activeBaseResolved) {
    return activeBaseResolved;
  }

  // Deduplicate ongoing health checks
  if (ongoingHealthCheckPromise) {
    return ongoingHealthCheckPromise;
  }

  ongoingHealthCheckPromise = (async () => {
    try {
      const isLocalUp = await canReachLocalApi(LOCAL_API_URL);
      cachedLocalHealth = isLocalUp;
      lastHealthCheckTime = Date.now();

      const selectedBase = isLocalUp ? LOCAL_API_URL : REMOTE_API_URL;
      setActiveApiBase(selectedBase, isLocalUp ? "local_online" : "local_unreachable_cloud_fallback");
      return selectedBase;
    } catch {
      cachedLocalHealth = false;
      lastHealthCheckTime = Date.now();
      setActiveApiBase(REMOTE_API_URL, "error_cloud_fallback");
      return REMOTE_API_URL;
    } finally {
      ongoingHealthCheckPromise = null;
    }
  })();

  return ongoingHealthCheckPromise;
}

/**
 * Get the current API base URL
 */
export async function getApiBase() {
  return await resolveActiveBackend();
}

/**
 * Get synchronous backend status snapshot
 */
export function getBackendStatus() {
  const isLocal = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
  return {
    apiBase: API_BASE,
    isLocal,
    localUrl: LOCAL_API_URL,
    remoteUrl: REMOTE_API_URL,
    mode: isLocal ? "local" : "cloud"
  };
}

/**
 * Generate full API URL for a path
 */
export async function apiUrl(path = "") {
  if (/^https?:\/\//i.test(path)) return path;
  const base = await getApiBase();
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function prepareRequestBody(body) {
  if (body === undefined || body === null) return body;
  if (typeof body === "string") return body;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return body;
  if (typeof ArrayBuffer !== "undefined" && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) return body;
  if (typeof body === "object") return JSON.stringify(body);
  return body;
}

/**
 * Primary API Request Dispatcher with Auto-Failover
 * If local backend fails or disconnects mid-session, automatically switches
 * to cloud backend and retries the request seamlessly without crashing!
 */
export async function api(path, options = {}) {
  let apiBase = await getApiBase();
  const normalizedPath =
    path.startsWith("/api") || path.startsWith("http") || path.startsWith("/health") || path.startsWith("/uploads")
      ? path
      : `/api${path.startsWith("/") ? "" : "/"}${path}`;

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("dashboard_token") : null;
  const preparedBody = prepareRequestBody(options.body);
  const requestOptions = {
    ...options,
    ...(options.body !== undefined ? { body: preparedBody } : {})
  };
  const isFormData = typeof FormData !== "undefined" && preparedBody instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };
  if (isFormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  const targetUrl = /^https?:\/\//i.test(normalizedPath) ? normalizedPath : `${apiBase}${normalizedPath}`;

  try {
    response = await fetch(targetUrl, {
      ...requestOptions,
      headers
    });
  } catch (fetchError) {
    // If request to local backend failed with Network Error (backend stopped / offline)
    const isLocal = apiBase.includes("localhost") || apiBase.includes("127.0.0.1");
    const isLocalHostTab = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocal && !isLocalHostTab && REMOTE_API_URL && apiBase !== REMOTE_API_URL && !/^https?:\/\//i.test(normalizedPath)) {
      console.warn(`[API Client] Local backend failed. Seamlessly failing over to cloud backend (${REMOTE_API_URL})...`);
      cachedLocalHealth = false;
      lastHealthCheckTime = Date.now();
      setActiveApiBase(REMOTE_API_URL, "runtime_request_failover");
      apiBase = REMOTE_API_URL;

      try {
        // Immediate seamless retry on remote cloud backend
        response = await fetch(`${REMOTE_API_URL}${normalizedPath}`, {
          ...requestOptions,
          headers
        });
      } catch (retryError) {
        console.error("[API Client] Cloud retry also failed:", retryError);
        throw new Error("Unable to connect to server. Please check your internet connection.");
      }
    } else {
      throw fetchError;
    }
  }

  const data = await response.json().catch((err) => {
    // If response was empty (e.g. 204 No Content) or non-JSON
    if (response.ok) return {};
    return { message: "Failed to parse server response" };
  });

  if (response.status === 401) {
    const isAuthPath = normalizedPath.includes("/api/auth/login") || normalizedPath.includes("/api/auth/register");
    const isAlreadyOnLogin = typeof window !== "undefined" && window.location.pathname === "/login";

    if (!isAuthPath && !isAlreadyOnLogin) {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("dashboard_token");
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    throw new Error(data.message || "Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

// Familiar helper methods for consistency
api.get = (path, options = {}) => api(path, { ...options, method: "GET" });
api.post = (path, body, options = {}) => api(path, { ...options, method: "POST", body: prepareRequestBody(body) });
api.put = (path, body, options = {}) => api(path, { ...options, method: "PUT", body: prepareRequestBody(body) });
api.patch = (path, body, options = {}) => api(path, { ...options, method: "PATCH", body: prepareRequestBody(body) });
api.delete = (path, options = {}) => api(path, { ...options, method: "DELETE" });

/**
 * Authenticated file/PDF/CSV download helper
 */
export async function apiDownload(path, fallbackFilename = "download") {
  let apiBase = await getApiBase();
  const normalizedPath =
    path.startsWith("/api") || path.startsWith("http") || path.startsWith("/uploads")
      ? path
      : `/api${path.startsWith("/") ? "" : "/"}${path}`;

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("dashboard_token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const targetUrl = /^https?:\/\//i.test(normalizedPath) ? normalizedPath : `${apiBase}${normalizedPath}`;

  let response;
  try {
    response = await fetch(targetUrl, { method: "GET", headers });
  } catch (err) {
    const isLocal = apiBase.includes("localhost") || apiBase.includes("127.0.0.1");
    if (isLocal && !isLocalHostTab && REMOTE_API_URL && !/^https?:\/\//i.test(normalizedPath)) {
      response = await fetch(`${REMOTE_API_URL}${normalizedPath}`, { method: "GET", headers });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || errBody.error || `Download failed (${response.status})`);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackFilename;

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 5000);
  return true;
}

// Background recovery: re-check if local backend comes back online
if (typeof window !== "undefined") {
  // When tab receives focus or page becomes visible
  window.addEventListener("focus", () => resolveActiveBackend(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resolveActiveBackend(true);
    }
  });

  // Periodic recovery check every 25 seconds when on remote
  setInterval(() => {
    const isLocal = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
    if (!isLocal) {
      resolveActiveBackend(true);
    }
  }, 25000);
}
