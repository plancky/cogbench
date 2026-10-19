import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiPort = process.env.PORT ?? "5174";

export default defineConfig({
  root: "src/client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src/client"),
      "@shared": path.resolve(import.meta.dirname, "src/shared"),
    },
  },
  server: {
    port: 5173,
    proxy: { "/api": `http://127.0.0.1:${apiPort}` },
  },
  build: { outDir: path.resolve(import.meta.dirname, "dist/client"), emptyOutDir: true },
});
