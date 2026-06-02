const DEFAULT_PROD_API_URL = "https://chat-backend-3pcj.onrender.com";
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API_URL : "http://localhost:5000")
).trim().replace(/\/+$/, "");

export async function api(path, options = {}) {
  const token = localStorage.getItem("dashboard_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
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

export { API_BASE };
