import { defineConfig } from "vite";

// Ω5P PR-16 — build ISOLADO do owner-portal (fora de frontend/; BFF/PWA separados — D-Ω5P-11). Zero
// vite-plugin-pwa (manifest + service-worker à mão → evita dependência nova / junta-5 — D-Ω5P-PORTAL-06).
// O BFF público roda em PORTAL_PORT; em dev o proxy encaminha /portal/* para lá.
// `process` é global do Node (o config roda no Node) — declarado aqui para o tsc sem puxar
// @types/node como dependência do PWA (mantém o kit de build enxuto — D-Ω5P-PORTAL-06).
declare const process: { env: Record<string, string | undefined> };
export default defineConfig({
  server: {
    port: 5273,
    proxy: {
      "/portal": {
        target: process.env.OWNER_PORTAL_BFF ?? "http://localhost:3100",
        changeOrigin: true,
      },
    },
  },
});
