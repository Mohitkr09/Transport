import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({

  plugins: [
    react(),
    tailwindcss()
  ],

  /* ======================================================
  GLOBAL POLYFILLS (Fix simple-peer / randombytes)
  ====================================================== */

  define: {
    global: "window",
    "process.env": {}
  },

  /* ======================================================
  DEP OPTIMIZATION
  ====================================================== */

  optimizeDeps: {
    include: [
      "simple-peer",
      "socket.io-client"
    ]
  },

  /* ======================================================
  DEV SERVER
  ====================================================== */

  server: {
    historyApiFallback: true,

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      },

      "/socket.io": {
        target: "http://localhost:5000",
        ws: true
      }
    }
  }

});