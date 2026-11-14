import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { buildInvoiceBody } from "../frontend/src/modules/work-orders/work-order-invoice.model.js";
import {
  createMemoryWorkOrderFinancialService,
  createMemoryWorkOrderInvoicingService,
  resetWorkOrderFinancialRuntimeForTests,
} from "../src/modules/work-order-financials/work-order-financial.service.js";
import type { WorkOrderFinancialActorContext } from "../src/modules/work-order-financials/work-order-financial.types.js";
import { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests } from "../src/modules/work-orders/work-order.service.js";
import { resetFinancialTitleRuntimeForTests } from "../src/modules/financial-titles/index.js";
import { resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import { TODOS_OS_MODULOS } from "./helpers/san3-18-modulos.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-25 (item 50 do portão) — [C1] o CORPO que a web manda é o que o servidor lê (plano v2 §3.1, §4.3; Q2 = A).
// `buildInvoiceBody()` (vencimento vazio) e `buildInvoiceBody("2026-12-31")`, do modelo PURO do front, vão ao
// `WorkOrderInvoicingService.invoice` real (memória) e à rota real `POST /api/v1/work-orders/:id/invoice` (app em
// memória): o 1º título vence em hoje + 30 dias (o padrão do servidor, `service.ts:511-516`); o 2º, em 2026-12-31 (o
// servidor lê `body.due_date` primeiro, `service.ts:441`). Mutação dona: M13 (`due_date:` → `dueDate_x:` no modelo) —
// o servidor deixa de ver a data e vence em hoje + 30, e os dois casos ficam vermelhos.
// -----------------------------------------------------------------------------------------------

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
const TOLERANCIA_MS = 5 * 60 * 1000;

function actor(tenantId = randomUUID()): WorkOrderFinancialActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: [
      "work_order_financials:read",
      "work_order_financials:create",
      "financial_titles:read",
      "financial_titles:create",
      "work_orders:read",
      "work_orders:create",
    ],
  };
}

function resetAll(): void {
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetWorkOrderFinancialRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

test("[C1] (serviço) o corpo da web no WorkOrderInvoicingService.invoice real: vazio vence em hoje + 30 dias; com data, vence nela", async () => {
  resetAll();
  try {
    const financials = createMemoryWorkOrderFinancialService();
    const invoicing = createMemoryWorkOrderInvoicingService();
    const workOrders = createMemoryWorkOrderService();

    const vazio = buildInvoiceBody();
    assert.deepEqual(vazio, {}, "vencimento vazio manda {}");
    const ctxA = actor();
    const osA = await workOrders.create(ctxA, { title: "OS vencimento padrão", customerName: "Cliente Alfa" });
    await financials.create(ctxA, osA.id, { source: "manual", description: "Item", unit_amount: 100 });
    const antes = Date.now();
    const padrao = await invoicing.invoice(ctxA, osA.id, vazio as Record<string, unknown>);
    assert.ok(
      Math.abs(padrao.title.dueDate.getTime() - (antes + TRINTA_DIAS_MS)) < TOLERANCIA_MS,
      `vencimento padrão ≠ hoje + 30 dias: ${padrao.title.dueDate.toISOString()}`,
    );

    const comData = buildInvoiceBody("2026-12-31");
    const ctxB = actor();
    const osB = await workOrders.create(ctxB, { title: "OS vencimento escolhido", customerName: "Cliente Alfa" });
    await financials.create(ctxB, osB.id, { source: "manual", description: "Item", unit_amount: 100 });
    const escolhido = await invoicing.invoice(ctxB, osB.id, comData as Record<string, unknown>);
    assert.equal(escolhido.title.dueDate.toISOString().slice(0, 10), "2026-12-31", `corpo enviado: ${JSON.stringify(comData)}`);
  } finally {
    resetAll();
  }
});

test("[C1] (rota) o corpo da web na rota real POST /api/v1/work-orders/:id/invoice (app em memória): vazio → hoje + 30 dias; com data → 2026-12-31", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant: Tenant = core.createTenant({ name: "Organização C1", modules: [...TODOS_OS_MODULOS] });
  const manager: User = core.createUser({ tenantId: tenant.id, name: "Gerente C1", email: "b-san3-25-c1-manager@example.com", roles: ["manager"] });
  const finance: User = core.createUser({ tenantId: tenant.id, name: "Financeiro C1", email: "b-san3-25-c1-finance@example.com", roles: ["finance"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  try {
    const baseUrl = await getBaseUrl(server);
    const headers = (user: User, role: string) => ({ "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role });
    const resumo = (r: { status: number; body: unknown }) => `${r.status} ${JSON.stringify(r.body).slice(0, 240)}`;
    const osComItem = async (titulo: string): Promise<string> => {
      const os = await requestJson(baseUrl, "/api/v1/work-orders", {
        method: "POST",
        headers: headers(manager, "manager"),
        body: { title: titulo, customerName: "Cliente Alfa" },
      });
      assert.equal(os.status, 201, `POST /work-orders → ${resumo(os)}`);
      const item = await requestJson(baseUrl, `/api/v1/work-orders/${os.body.data.id}/financial-items`, {
        method: "POST",
        headers: headers(manager, "manager"),
        body: { source: "manual", description: "Serviço", unit_amount: 100 },
      });
      assert.equal(item.status, 201, `POST financial-items → ${resumo(item)}`);
      return os.body.data.id as string;
    };

    const osPadrao = await osComItem("OS C1 padrão");
    const antes = Date.now();
    const padrao = await requestJson(baseUrl, `/api/v1/work-orders/${osPadrao}/invoice`, {
      method: "POST",
      headers: headers(finance, "finance"),
      body: buildInvoiceBody(),
    });
    assert.equal(padrao.status, 201, `POST /invoice com {} → ${resumo(padrao)}`);
    assert.ok(
      Math.abs(new Date(padrao.body.data.dueDate).getTime() - (antes + TRINTA_DIAS_MS)) < TOLERANCIA_MS,
      `vencimento padrão ≠ hoje + 30 dias: ${padrao.body.data.dueDate}`,
    );

    const osData = await osComItem("OS C1 com data");
    const corpo = buildInvoiceBody("2026-12-31");
    const escolhido = await requestJson(baseUrl, `/api/v1/work-orders/${osData}/invoice`, {
      method: "POST",
      headers: headers(finance, "finance"),
      body: corpo,
    });
    assert.equal(escolhido.status, 201, `POST /invoice com data → ${resumo(escolhido)}`);
    assert.equal(String(escolhido.body.data.dueDate).slice(0, 10), "2026-12-31", `corpo enviado: ${JSON.stringify(corpo)}`);
  } finally {
    await closeServer(server);
    resetAll();
  }
});

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => (server.listening ? resolve() : server.once("listening", () => resolve())));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
