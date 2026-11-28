import { defineConfig, type Plugin } from "vite";
import { randomUUID } from "node:crypto";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function releaseMarker(): Plugin {
  const version = randomUUID();

  return {
    name: "mission-control-release-marker",
    apply: "build",
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { name: "mission-control-build", content: version }, injectTo: "head" }];
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), releaseMarker()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: false,
        ws: true,
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
