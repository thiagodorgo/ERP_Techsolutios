import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.E2E_API_PORT ?? "3200";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "5173";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${apiPort}/api/v1`;
const frontendBaseUrl = process.env.E2E_FRONTEND_BASE_URL ?? `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: frontendBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: [
    {
      command: "npm run dev",
      url: `${apiBaseUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        CORE_SAAS_PERSISTENCE: "prisma",
        DATABASE_URL: databaseUrl,
        LOG_LEVEL: "warn",
        NODE_ENV: "test",
        PORT: apiPort,
      },
    },
    {
      command: `npm --prefix frontend run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      url: frontendBaseUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_BASE_URL: apiBaseUrl,
        VITE_DEFAULT_TENANT_ID: "",
        VITE_USE_MOCKS: "false",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
