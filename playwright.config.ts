import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.E2E_API_PORT ?? "3442";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "5442";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${apiPort}/api/v1`;
const frontendBaseUrl = process.env.E2E_FRONTEND_BASE_URL ?? `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/artefatos",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  maxFailures: process.env.CI ? 3 : 0,
  // O relator de passos (Emenda 2.1, G11) deixa a rodada vermelha se algum passo for pulado; o JSON esconde isso.
  reporter: process.env.CI
    ? [["list"], ["json"], ["./tests/e2e/apoio/relator-passos.mjs"]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["./tests/e2e/apoio/relator-passos.mjs"]],
  use: {
    baseURL: frontendBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: [
    {
      command: process.env.CI ? "npx tsx src/server.ts" : "npm run dev",
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
      command: process.env.CI
        ? `npm --prefix frontend run preview -- --host 127.0.0.1 --port ${frontendPort} --strictPort`
        : `npm --prefix frontend run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
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
      name: "preparo",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /controle\//,
      dependencies: ["preparo"],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(process.env.E2E_CANARIO
      ? [{ name: "controle", testMatch: /controle\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } }]
      : []),
  ],
});
