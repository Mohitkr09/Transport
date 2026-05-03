import axios from "axios";

/* ======================================================
ENV CONFIG (FINAL ROBUST)
====================================================== */

const RAW_BASE = import.meta.env.VITE_API_URL;

if (!RAW_BASE) {
  throw new Error("❌ VITE_API_URL missing");
}

/* normalize */
const ROOT_URL = RAW_BASE.replace(/\/$/, "").replace(/\/api$/, "");
const BASE_URL = `${ROOT_URL}/api`;

/* ======================================================
AXIOS INSTANCE
====================================================== */

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ======================================================
REQUEST INTERCEPTOR (🔥 FIXED TOKEN HANDLING)
====================================================== */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // ✅ Attach token correctly
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // 🔥 Prevent double /api
    if (config.url?.startsWith("/api")) {
      config.url = config.url.replace(/^\/api/, "");
    }

    console.log(
      `%cAPI → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      "color:#6366f1;font-weight:bold"
    );

    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
RESPONSE INTERCEPTOR (🔥 SAFE + SMART RETRY)
====================================================== */

api.interceptors.response.use(
  (response) => {
    console.log(
      `%cAPI SUCCESS ← ${response.config.url}`,
      "color:#16a34a;font-weight:bold"
    );
    return response;
  },

  async (error) => {
    const original = error?.config;

    console.error(
      "%cAPI ERROR:",
      "color:red;font-weight:bold",
      error?.response?.data || error.message
    );

    /* ================= NETWORK ERROR ================= */
    if (!error.response) {
      console.warn("⚠️ Network error / backend unreachable");

      if (original && !original._retry) {
        original._retry = true;

        await new Promise((r) => setTimeout(r, 2000));
        return api(original);
      }

      return Promise.reject(error);
    }

    /* ================= AUTH ERROR ================= */
    if (error.response.status === 401) {
      console.warn("🔐 Unauthorized request");

      // ❗ Only redirect if user is NOT on login page
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    /* ================= RENDER WAKE ================= */
    if (
      [500, 502, 503, 504].includes(error.response.status) &&
      original &&
      !original._retry
    ) {
      original._retry = true;

      try {
        console.log("🔄 Waking backend (Render cold start)...");

        await fetch(`${ROOT_URL}/api/health`);
      } catch (e) {
        console.warn("Health check failed");
      }

      await new Promise((r) => setTimeout(r, 2000));

      return api(original);
    }

    /* ================= 403 ================= */
    if (error.response.status === 403) {
      console.warn("⛔ Access denied");
    }

    /* ================= 500 ================= */
    if (error.response.status === 500) {
      console.warn("🔥 Server error (backend issue)");
    }

    return Promise.reject(error);
  }
);

/* ======================================================
HELPERS
====================================================== */

export const setToken = (token) => {
  localStorage.setItem("token", token);
};

export const setUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("role", user.role);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const logout = () => {
  localStorage.clear();
  window.location.href = "/login";
};

/* ======================================================
API METHODS
====================================================== */

export const get = (url, config = {}) => api.get(url, config);
export const post = (url, data, config = {}) => api.post(url, data, config);
export const put = (url, data, config = {}) => api.put(url, data, config);
export const del = (url, config = {}) => api.delete(url, config);

export default api;