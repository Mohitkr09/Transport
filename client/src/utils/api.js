import axios from "axios";

// ======================================================
// BASE URL
// ======================================================
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com/api";

// ======================================================
// CREATE INSTANCE
// ======================================================
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `%cAPI → ${config.method?.toUpperCase()} ${config.url}`,
      "color:#4f46e5;font-weight:bold"
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
    console.log(
      `%cAPI SUCCESS ← ${response.config.url}`,
      "color:green"
    );
    return response;
  },
  async error => {
    const original = error.config;

    console.error("API ERROR:", error?.response?.data || error.message);

    // ==================================================
    // UNAUTHORIZED → AUTO LOGOUT
    // ==================================================
    if (error.response?.status === 401) {
      console.warn("Session expired → Logging out");

      localStorage.removeItem("token");

      window.location.href = "/login";
      return Promise.reject(error);
    }

    // ==================================================
    // SERVER DOWN
    // ==================================================
    if (!error.response) {
      alert("Server not responding. Try again later.");
    }

    // ==================================================
    // RETRY NETWORK ERROR (1 TIME)
    // ==================================================
    if (!original._retry && error.code === "ECONNABORTED") {
      original._retry = true;
      return api(original);
    }

    return Promise.reject(error);
  }
);

// ======================================================
// HELPER METHODS
// ======================================================
export const setToken = token => {
  localStorage.setItem("token", token);
};

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

export default api;