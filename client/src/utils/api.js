import axios from "axios";

/* ======================================================
ENV CONFIG (ROBUST)
====================================================== */

// 🔥 Accept both:
// - https://domain.com
// - https://domain.com/api
const RAW_BASE = import.meta.env.VITE_API_URL;

if (!RAW_BASE) {
  throw new Error("❌ VITE_API_URL missing");
}

// normalize
const ROOT_URL = RAW_BASE.replace(/\/$/, "").replace(/\/api$/, "");
const BASE_URL = `${ROOT_URL}/api`; // ✅ always force /api

/* ======================================================
AXIOS INSTANCE
====================================================== */

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000, // ⏱️ increase for Render cold start
  headers: {
    "Content-Type": "application/json",
  },
});

/* ======================================================
REQUEST INTERCEPTOR
====================================================== */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 🔥 Prevent accidental double /api
    if (config.url?.startsWith("/api")) {
      config.url = config.url.replace(/^\/api/, "");
    }

    console.log(
      `%cAPI → ${config.method?.toUpperCase()} ${BASE_URL}${config.url}`,
      "color:#6366f1;font-weight:bold"
    );

    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
RESPONSE INTERCEPTOR
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
      console.warn("⚠️ Backend unreachable or network error");

      // 🔁 Retry once after short delay (Render cold start)
      if (original && !original._retry) {
        original._retry = true;

        await new Promise((r) => setTimeout(r, 1500));
        return api(original);
      }

      return Promise.reject(error);
    }

    /* ================= AUTH ERROR ================= */
    if (error.response.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    /* ================= 🔥 RENDER WAKE FIX ================= */
    if (
      [404, 500, 502, 503].includes(error.response.status) &&
      original &&
      !original._retry
    ) {
      original._retry = true;

      try {
        console.log("🔄 Waking backend...");

        await fetch(`${ROOT_URL}/api/health`);
      } catch (e) {
        console.warn("Health check failed");
      }

      await new Promise((r) => setTimeout(r, 1500));

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