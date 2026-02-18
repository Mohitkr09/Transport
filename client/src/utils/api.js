import axios from "axios";

const API =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com/api";

const api = axios.create({
  baseURL: API
});

// attach token automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
