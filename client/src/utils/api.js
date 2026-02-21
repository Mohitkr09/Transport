import axios from "axios";


const BASE = import.meta.env.VITE_API_URL;

if (!BASE) {
  throw new Error("❌ VITE_API_URL missing in environment variables");
}

// remove trailing slash
const BASE_URL = BASE.replace(/\/$/, "");


// ======================================================
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

// ======================================================
// REQUEST TRACKER (prevent duplicates safely)
// ======================================================
const pendingRequests = new Map();

const generateKey = config =>
  `${config.method}-${config.url}-${JSON.stringify(config.data || {})}`;

const addPending = config => {
  if (!config) return;

  const key = generateKey(config);

  config.cancelToken =
    config.cancelToken ||
    new axios.CancelToken(cancel => {
      if (!pendingRequests.has(key)) {
        pendingRequests.set(key, cancel);
      }
    });
};

const removePending = config => {
  if (!config) return;

  const key = generateKey(config);

  if (pendingRequests.has(key)) {
    pendingRequests.get(key)();
    pendingRequests.delete(key);
  }
};

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
api.interceptors.request.use(
  config => {
    removePending(config);
    addPending(config);

    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

    console.error(
      "%cAPI ERROR:",
      "color:red;font-weight:bold",
      error?.response?.data || error.message
    );

    // ==================================================
    // TOKEN EXPIRED
    // ==================================================
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    // ==================================================
    // NETWORK / SERVER DOWN
    // ==================================================
    if (!error.response) {
      console.warn("Server unreachable or network lost");

      if (original && !original._retryNetwork) {
        original._retryNetwork = true;

        await new Promise(r => setTimeout(r, 1500));

        return api(original);
      }

      alert("Server not responding. Try again later.");
      return Promise.reject(error);
    }

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

// ======================================================
export default api;