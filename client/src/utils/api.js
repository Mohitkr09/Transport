import axios from "axios";

/* ======================================================
ENV CONFIG
====================================================== */

const BASE = import.meta.env.VITE_API_URL;

if (!BASE) {
  throw new Error("❌ VITE_API_URL missing");
}

/* normalize URL */
const BASE_URL = BASE.replace(/\/$/, ""); // remove trailing slash
const ROOT_URL = BASE_URL.replace(/\/api$/, ""); // remove /api for health

/* ======================================================
AXIOS INSTANCE
====================================================== */

const api = axios.create({
  baseURL: BASE_URL, // ✅ MUST include /api
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
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

    /* 🔥 FIX: prevent double /api */
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

    /* ================= AUTH ERROR ================= */

    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    /* ================= WAKEUP FIX ================= */

    if (
      error.response?.status === 404 &&
      original &&
      !original._retry
    ) {

      original._retry = true;

      try {
        /* 🔥 FIX: correct health endpoint */
        await fetch(`${ROOT_URL}/health`);
      } catch {}

      await new Promise(r => setTimeout(r, 1200));

      return api(original);
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
SAFE API HELPERS (RECOMMENDED)
====================================================== */

export const get = (url, config = {}) => api.get(url, config);
export const post = (url, data, config = {}) => api.post(url, data, config);
export const put = (url, data, config = {}) => api.put(url, data, config);
export const del = (url, config = {}) => api.delete(url, config);

export default api;