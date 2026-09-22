import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Share links use the frontend origin (/og/vote/:id) — proxy to the
      // backend OG routes so dev links behave exactly like production.
      "/og": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
