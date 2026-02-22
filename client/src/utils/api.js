import axios from "axios";

// ======================================================
// ENV
// ======================================================
const BASE = import.meta.env.VITE_API_URL;

if (!BASE) {
  throw new Error("❌ VITE_API_URL missing in environment variables");
}

const BASE_URL = BASE.replace(/\/$/, "");

// ======================================================
// AXIOS INSTANCE
// ======================================================
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

// ======================================================
// SAFE DUPLICATE CONTROL (ONLY SEARCH REQUESTS)
// ======================================================
const pendingRequests = new Map();

const shouldCancel = url => {
  if (!url) return false;

  // ❌ NEVER cancel these critical APIs
  const whitelist = [
    "/ride/",
    "/payment",
    "/auth",
    "/driver",
    "/admin"
  ];

  return !whitelist.some(route => url.includes(route));
};

const generateKey = config =>
  `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;

const addPending = config => {
  if (!config || config.method !== "get") return;
  if (!shouldCancel(config.url)) return;

  const key = generateKey(config);

  // cancel previous duplicate
  if (pendingRequests.has(key)) {
    const cancel = pendingRequests.get(key);
    cancel("Canceled previous duplicate request");
    pendingRequests.delete(key);
  }

  config.cancelToken = new axios.CancelToken(cancel => {
    pendingRequests.set(key, cancel);
  });
};

const removePending = config => {
  if (!config || config.method !== "get") return;

  const key = generateKey(config);

  if (pendingRequests.has(key)) {
    pendingRequests.delete(key);
  }
};

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
api.interceptors.request.use(
  config => {
    addPending(config);

    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    console.log(
      `%cAPI → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      "color:#6366f1;font-weight:bold"
    );

    return config;
  },
  error => Promise.reject(error)
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================
api.interceptors.response.use(
  response => {
    removePending(response.config);

    console.log(
      `%cAPI SUCCESS ← ${response.config.url}`,
      "color:#16a34a;font-weight:bold"
    );

    return response;
  },

  async error => {
    const original = error?.config;

    if (original) removePending(original);

    // ==================================================
    // IGNORE CANCELLED REQUESTS
    // ==================================================
    if (axios.isCancel(error) || error.message?.includes("Canceled")) {
      console.log("🟡 Request cancelled:", error.message);
      return Promise.reject(error);
    }

    console.error(
      "%cAPI ERROR:",
      "color:red;font-weight:bold",
      error?.response?.data || error.message
    );

    // ==================================================
    // AUTH EXPIRED
    // ==================================================
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    // ==================================================
    // NETWORK RETRY
    // ==================================================
    if (!error.response && original && !original._retryNetwork) {
      original._retryNetwork = true;

      console.warn("🌐 Network issue → retrying once...");
      await new Promise(r => setTimeout(r, 1200));

      return api(original);
    }

    // ==================================================
    // RENDER WAKEUP FIX (Render sleep issue)
    // ==================================================
    if (error.response?.status === 404 && original && !original._retryWake) {
      original._retryWake = true;

      try {
        await fetch(`${BASE_URL}/api/ride/health`);
      } catch {}

      await new Promise(r => setTimeout(r, 1200));
      return api(original);
    }

    // ==================================================
    // TIMEOUT RETRY
    // ==================================================
    if (error.code === "ECONNABORTED" && original && !original._retryTimeout) {
      original._retryTimeout = true;

      console.warn("⏱ Timeout → retrying once...");
      return api(original);
    }

    return Promise.reject(error);
  }
);

export const setToken = token => {
  localStorage.setItem("token", token);
};

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

export default api;