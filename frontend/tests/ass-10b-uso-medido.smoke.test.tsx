import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { installMiniDom, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10b (T5, F10) — T-USO-1 do plano v2 (§8.1): o "Uso medido" sai da tela de custos e vai para o detalhe da
// organização (`/platform/tenants/:tenantId`). Prende por comportamento executado, com a página REAL e os provedores
// REAIS no DOM mínimo do repositório:
//   (a) o detalhe chama a rota de uso POR ORGANIZAÇÃO (`/platform/cloud-usage/tenants/:id/summary`, mês corrente em São
//       Paulo) e mostra as métricas com os rótulos de hoje;
//   (b) sem `platform:cloud-usage:read` o bloco não aparece e NENHUMA chamada de uso sai — mesmo para quem é Admin
//       Plataforma por `platform:tenants:read` (o `can()`/`hasAny()` liberaria; a conferência é estrita);
//   (c) a tela de custos não chama mais `/platform/cloud-usage/summary` e não declara mais `mapUsageSummary`;
//   (d) o adapter descarta métrica inválida (nunca vira zero) e não copia o `tenantId` da resposta (§2.8).
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { PlatformTenantDetailPage } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { mapUsageSummary } = await import("../src/modules/platform/platform-tenant-usage.adapter");
const { currentUsageMonth, usagePeriodForMonth } = await import("../src/modules/platform/platform-tenant-usage.service");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const TENANT = "org-alfa";
const DETAIL = {
  id: TENANT,
  name: "Alfa Serviços de Campo",
  slug: "alfa",
  status: "active",
  createdAt: "2026-01-15T00:00:00Z",
  moduleCount: 1,
  modules: [{ key: "finance", label: "Financeiro", enabled: true }],
  users: [{ name: "Marina Costa", email: "marina@alfa.example", roleLabel: "Administradora", status: "active" }],
};
const USAGE = {
  tenantId: TENANT,
  periodStart: "2026-11-01T00:00:00.000Z",
  periodEnd: "2026-11-30T00:00:00.000Z",
  metrics: [
    { metricKey: "api_requests_count", quantity: 1234, unit: "count", sourceType: "api" },
    { metricKey: "storage_gb_month", quantity: 2.5, unit: "gb_month", sourceType: "storage" },
  ],
  generatedAt: "2026-11-14T10:00:00.000Z",
};

let calls: string[] = [];
function installFetch() {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (url.includes(`/platform/tenants/${TENANT}/detail`)) return json(200, { data: DETAIL });
    if (url.includes(`/platform/cloud-usage/tenants/${TENANT}/summary`)) return json(200, { data: USAGE });
    return json(599, { error: { code: "sem_fixture" } });
  }) as typeof fetch;
}

async function mountDetail(permissions: readonly string[]) {
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: [...permissions] } });
  installFetch();
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: [`/platform/tenants/${TENANT}`] },
        h(AuthProvider, null,
          h(TenantProvider, null,
            h(PermissionProvider, null,
              h(Routes, null, h(Route, { path: "/platform/tenants/:tenantId", element: h(PlatformTenantDetailPage) })))))),
    );
  });
  await settle();
  return {
    container: container as MiniDomElement,
    unmount: async () => {
      await act(async () => root.unmount());
      container.parentNode?.removeChild(container);
    },
  };
}

test("T-USO-1 (a) o detalhe da organização chama a rota de uso POR ORGANIZAÇÃO, no mês corrente, e mostra as métricas", async () => {
  const { container, unmount } = await mountDetail(["platform:tenants:read", "platform:cloud-usage:read"]);
  try {
  const usageCalls = calls.filter((url) => url.includes("/cloud-usage/"));
  const period = usagePeriodForMonth(currentUsageMonth());
  assert.deepEqual(
    usageCalls.map((url) => url.replace(/^.*\/api\/v1/, "")),
    [`/platform/cloud-usage/tenants/${TENANT}/summary?periodStart=${period.start}&periodEnd=${period.end}`],
    "uma chamada só, à rota por organização",
  );
  const html = text(container);
  assert.match(html, /Alfa Serviços de Campo/);
  assert.match(html, /Uso medido/);
  assert.match(html, /Requisições da API/);
  assert.match(html, /1\.234 unid\./);
  assert.match(html, /Armazenamento/);
  assert.match(html, /2,5 GB·mês/);
  assert.doesNotMatch(html, new RegExp(TENANT), "o identificador da organização não aparece na tela (§2.8)");
  } finally {
    await unmount();
  }
});

test("T-USO-1 (b) sem platform:cloud-usage:read o bloco não aparece e nenhuma leitura de uso sai — mesmo para o Admin Plataforma", async () => {
  const { container, unmount } = await mountDetail(["platform:tenants:read"]);
  try {
  assert.deepEqual(calls.filter((url) => url.includes("/cloud-usage/")), [], "nenhuma chamada de uso");
  const html = text(container);
  assert.match(html, /Alfa Serviços de Campo/, "o detalhe continua");
  assert.doesNotMatch(html, /Uso medido/);
  } finally {
    await unmount();
  }
});

const HERE = dirname(fileURLToPath(import.meta.url));
const CLOUD_BILLING = resolve(HERE, "../src/modules/platform/cloud-billing");
function filesUnder(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) filesUnder(path, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(path);
  }
  return acc;
}

test("T-USO-1 (c) a tela de custos não chama mais /platform/cloud-usage/summary nem declara mapUsageSummary", () => {
  const files = filesUnder(CLOUD_BILLING);
  assert.ok(files.length >= 5, `arquivos medidos no módulo da tela de custos: ${files.length}`);
  const offenders = files.filter((file) => /cloud-usage\/summary|\/platform\/cloud-usage\b|mapUsageSummary/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders.map((file) => file.slice(CLOUD_BILLING.length + 1)), []);
});

test("T-USO-1 (d) o adapter descarta métrica inválida (nunca vira zero) e não copia o tenantId da resposta", () => {
  const summary = mapUsageSummary({
    tenantId: TENANT,
    periodStart: "2026-11-01T00:00:00.000Z",
    periodEnd: "2026-11-30T00:00:00.000Z",
    metrics: [
      { metricKey: "api_requests_count", quantity: 10, unit: "count" },
      { metricKey: "", quantity: 5, unit: "count" },
      { metricKey: "storage_gb_month", quantity: "7", unit: "gb_month" },
      { metricKey: "active_users_count", quantity: -1, unit: "count" },
      { metricKey: "database_storage_gb_month", quantity: Number.NaN, unit: "gb_month" },
      null,
    ],
    generatedAt: "2026-11-14T10:00:00.000Z",
  });
  assert.deepEqual(summary.metrics, [{ metricKey: "api_requests_count", quantity: 10, unit: "count" }]);
  assert.equal(Object.prototype.hasOwnProperty.call(summary, "tenantId"), false);
  assert.deepEqual(mapUsageSummary(null).metrics, []);
});
