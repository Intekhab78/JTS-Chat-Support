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

// Current active base starts as null until preflight, with fallback to remote
export let API_BASE = REMOTE_API_URL;

// State management for smart health check and failover
let activeBaseResolved = null;
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

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 800);

  try {
    const res = await fetch(`${url}/health`, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
      signal: controller.signal
    });
    return res.ok;
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
  const base = await getApiBase();
  return `${base}${path}`;
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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${apiBase}${normalizedPath}`, {
      ...options,
      headers
    });
  } catch (fetchError) {
    // If request to local backend failed with Network Error (backend stopped / offline)
    const isLocal = apiBase.includes("localhost") || apiBase.includes("127.0.0.1");
    if (isLocal && REMOTE_API_URL && apiBase !== REMOTE_API_URL) {
      console.warn(`[API Client] Local backend failed. Seamlessly failing over to cloud backend (${REMOTE_API_URL})...`);
      cachedLocalHealth = false;
      lastHealthCheckTime = Date.now();
      setActiveApiBase(REMOTE_API_URL, "runtime_request_failover");
      apiBase = REMOTE_API_URL;

      try {
        // Immediate seamless retry on remote cloud backend
        response = await fetch(`${REMOTE_API_URL}${normalizedPath}`, {
          ...options,
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
    const isAuthPath = path.includes("/api/auth/login") || path.includes("/api/auth/register");
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
api.post = (path, body, options = {}) => api(path, { ...options, method: "POST", body: JSON.stringify(body) });
api.patch = (path, body, options = {}) => api(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
api.delete = (path, options = {}) => api(path, { ...options, method: "DELETE" });

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
