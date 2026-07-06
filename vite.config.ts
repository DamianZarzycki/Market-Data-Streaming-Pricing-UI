import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const svc = (target: string, prefix: string) => ({
  target,
  changeOrigin: true,
  rewrite: (p: string) => p.replace(new RegExp(`^/api/${prefix}`), ""),
});

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/market-data": svc("http://market-data-service:8001", "market-data"),
      "/api/pricing": svc("http://pricing-service:8002", "pricing"),
      "/api/monitoring": svc("http://monitoring-service:8003", "monitoring"),
      "/api/books": svc("http://books-service:8004", "books"),
      "/api/blotter": svc("http://blotter-service:8006", "blotter"),
      "/api/trade-generation": svc(
        "http://trade-generation-service:8007",
        "trade-generation",
      ),
      "/api/trade-action": svc("http://trade-action-service:8080", "trade-action"),
    },
  },
});
