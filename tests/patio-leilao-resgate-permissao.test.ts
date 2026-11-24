import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";
import { getMemoryAuctionRepositoryForTests, resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import { resetAuctionSettlementRuntimeForTests } from "../src/modules/auction/auction.settlement.service.js";
import { getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { getMemoryReleaseRepositoryForTests, resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";

// B-PATIO-LEILAO-DIARIAS, fatias F1 e F1b, casos P1 a P6 da E7.3 e P2b da E9.3 (resgate depois da lista com a permissão `auction:reclaim`).
// Pelo HTTP, no app real (rotas, `requirePermission`, contexto de organização), no molde de
// `tests/rec-01-routes-permissions.test.ts`. O ator sem `auction:reclaim` é montado com o cabeçalho de dev
// `x-permissions`, que RESTRINGE as permissões do perfil ao que vier na lista (tenant-context.middleware.ts).
// Escrita ANTES do conserto: na `main` P1 e P4 falham pelo comportamento (o resgate passa com `impound:transition`; a
// chave não existe no catálogo) e P5 porque a rota `withdraw-settled` ainda não existe. Nenhum `assert.fail` fixo.

const MS_PER_DAY = 86_400_000;
const RECLAIM = "auction:reclaim";

function headers(tenantId: string, role: string, permissions?: readonly string[]): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": randomUUID(),
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
}

async function call(baseUrl: string, path: string, init: { method?: string; headers: Record<string, string>; body?: unknown }) {
  const response = await fetch(`${baseUrl}${path}`, { method: init.method ?? "POST", headers: init.headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: response.status, reason: (body.error as { reason?: string } | undefined)?.reason, body };
}

async function withApp(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const { app } = await import("../src/app.js");
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function resetAll(): void {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetAuctionRuntimeForTests();
  resetAuctionSettlementRuntimeForTests();
  resetChargeRuntimeForTests();
}

// Processo em AUCTION_ELIGIBLE (entrada há `hours` horas) com a remoção lançada; opcionalmente levado ao lote pelos
// atômicos do repositório (o objeto destes casos é a permissão da rota, não os portões do leilão).
async function processAt(tenantId: string, to: "AUCTION_ELIGIBLE" | "LOTTED", options: { hours?: number; removalSettled?: boolean } = {}): Promise<string> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const opened = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Placa adulterada",
    completedAt: new Date(Date.now() - (options.hours ?? 90 * 24) * 3_600_000),
    actorId: undefined,
  });
  for (const [from, to2] of [["RECEPTION", "ACTIVE_CUSTODY"], ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"]] as const) {
    await impound.applyTransition({
      tenantId,
      processId: opened.id,
      expectedFrom: from,
      to: to2,
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from, to: to2, reason: null }, occurredAt: new Date(), actorId: undefined },
    });
  }
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, []);
  const removal = await getMemoryChargeRepositoryForTests().createManualCharge({
    tenantId,
    processId: opened.id,
    kind: "REMOVAL",
    quantity: "1.00",
    unitAmount: "150.00",
    totalAmount: "150.00",
    currency: "BRL",
    occurredAt: new Date(),
  });
  if (options.removalSettled) {
    await getMemoryChargeRepositoryForTests().settleProcess({ tenantId, processId: opened.id, estornos: [], note: "quitado no balcão", occurredAt: new Date() } as never);
    assert.ok(removal.id, "remoção lançada e quitada");
  }
  if (to === "LOTTED") {
    const repo = getMemoryAuctionRepositoryForTests();
    const base = { tenantId, processId: opened.id, actorId: undefined };
    await repo.registerEdictAtomic({ ...base, roundNumber: 1, classification: "CONSERVED", edictReference: "EDITAL-1/2026", publishedAt: new Date(Date.now() - 30 * MS_PER_DAY), businessDays: 15, occurredAt: new Date() } as never);
    await repo.setAppraisalAtomic({ ...base, roundNumber: 1, appraisalAmount: "10000.00", minBidAmount: "5000.00" } as never);
    await repo.prepareAuctionAtomic({ ...base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() });
    await repo.lotAuctionAtomic({ ...base, expectedFrom: "AUCTION_PREP", roundNumber: 1, occurredAt: new Date() });
  }
  return opened.id;
}

async function statusOf(tenantId: string, processId: string): Promise<string | undefined> {
  return (await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, processId))?.status;
}

async function eventCount(tenantId: string, processId: string): Promise<number> {
  return (await getMemoryImpoundRepositoryForTests().listEvents(tenantId, processId)).length;
}

const reclaimPath = (processId: string) => `/api/v1/impound-processes/${processId}/auction/reclaim`;

async function reclaimBodyFor(tenantId: string, processId: string, reason = "Dono apresentou a documentação") {
  return { reason, custody_seq: (await getMemoryAuctionRepositoryForTests().getState(tenantId, processId))?.custodySeqHead };
}

test("P1 · ator com impound:transition e SEM auction:reclaim chama o resgate de um processo em lote: 403; segue LOTTED; nenhum evento novo", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processAt(tenantId, "LOTTED");
  const eventsBefore = await eventCount(tenantId, processId);
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, reclaimPath(processId), { headers: headers(tenantId, "manager", ["impound:read", "impound:transition"]), body: await reclaimBodyFor(tenantId, processId) });
    assert.deepEqual(
      { http: response.status, estado: await statusOf(tenantId, processId), eventosNovos: (await eventCount(tenantId, processId)) - eventsBefore },
      { http: 403, estado: "LOTTED", eventosNovos: 0 },
      JSON.stringify(response.body),
    );
  });
});

test("P1b · o Gestor (manager), com as permissões do catálogo, resgata com motivo: 200; ACTIVE_CUSTODY", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processAt(tenantId, "LOTTED");
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, reclaimPath(processId), { headers: headers(tenantId, "manager"), body: await reclaimBodyFor(tenantId, processId) });
    assert.deepEqual({ http: response.status, estado: await statusOf(tenantId, processId) }, { http: 200, estado: "ACTIVE_CUSTODY" }, JSON.stringify(response.body));
  });
});

test("P2 · o administrador da organização (tenant_admin) resgata com motivo: 200; ACTIVE_CUSTODY; código do motivo na cadeia", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processAt(tenantId, "LOTTED");
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, reclaimPath(processId), { headers: headers(tenantId, "tenant_admin"), body: await reclaimBodyFor(tenantId, processId) });
    const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, processId);
    assert.deepEqual(
      { http: response.status, estado: await statusOf(tenantId, processId), codigoNaCadeia: events.some((event) => (event.payload as { reason?: unknown }).reason === "reclaimed_before_sale") },
      { http: 200, estado: "ACTIVE_CUSTODY", codigoNaCadeia: true },
      JSON.stringify(response.body),
    );
  });
});

// F1b, E9.3: `platform_admin` é pseudo-perfil resolvido pela sessão (nunca tem linha no banco); com o perfil na sessão, o
// resgate pelo HTTP passa. Controle (verde antes e depois): hoje o catálogo inteiro vale para ele.
test("P2b · controle: ator com o perfil platform_admin na sessão resgata pelo HTTP, com motivo: 200; ACTIVE_CUSTODY", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processAt(tenantId, "LOTTED");
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, reclaimPath(processId), { headers: headers(tenantId, "platform_admin"), body: await reclaimBodyFor(tenantId, processId) });
    assert.deepEqual({ http: response.status, estado: await statusOf(tenantId, processId) }, { http: 200, estado: "ACTIVE_CUSTODY" }, JSON.stringify(response.body));
  });
});

test("P3 · administrador de OUTRA organização chama o resgate: 404; o processo segue LOTTED", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processAt(tenantId, "LOTTED");
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, reclaimPath(processId), { headers: headers(randomUUID(), "tenant_admin"), body: await reclaimBodyFor(tenantId, processId, "Tentativa de outra organização") });
    assert.deepEqual({ http: response.status, estado: await statusOf(tenantId, processId) }, { http: 404, estado: "LOTTED" }, JSON.stringify(response.body));
  });
});

test("P4 · catálogo: tenant_admin, manager, super_admin e platform_admin TÊM auction:reclaim; operator, finance, inventory, auditor e support NÃO têm", () => {
  const catalog = ROLE_PERMISSIONS as unknown as Record<string, readonly string[]>;
  const observed = Object.fromEntries(
    ["tenant_admin", "manager", "super_admin", "platform_admin", "operator", "finance", "inventory", "auditor", "support"].map((role) => [role, (catalog[role] ?? []).includes(RECLAIM)]),
  );
  assert.deepEqual(observed, {
    tenant_admin: true,
    manager: true,
    super_admin: true,
    platform_admin: true,
    operator: false,
    finance: false,
    inventory: false,
    auditor: false,
    support: false,
  });
});

test("P5 · o Gestor chama withdraw-settled num processo quitado antes da lista: 200; ACTIVE_CUSTODY", async () => {
  resetAll();
  const tenantId = randomUUID();
  // Entrada há 2 h: nenhuma diária devida; a remoção lançada e quitada: livro completo e nada em aberto.
  const processId = await processAt(tenantId, "AUCTION_ELIGIBLE", { hours: 2, removalSettled: true });
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, `/api/v1/impound-processes/${processId}/auction/withdraw-settled`, { headers: headers(tenantId, "manager"), body: {} });
    assert.deepEqual({ http: response.status, estado: await statusOf(tenantId, processId) }, { http: 200, estado: "ACTIVE_CUSTODY" }, JSON.stringify(response.body));
  });
});

test("P6 · controle: resgate SEM motivo, por quem tem a permissão: 409 reason_required; segue LOTTED", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processAt(tenantId, "LOTTED");
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, reclaimPath(processId), { headers: headers(tenantId, "tenant_admin"), body: { custody_seq: (await getMemoryAuctionRepositoryForTests().getState(tenantId, processId))?.custodySeqHead } });
    assert.deepEqual({ http: response.status, razao: response.reason, estado: await statusOf(tenantId, processId) }, { http: 409, razao: "reason_required", estado: "LOTTED" }, JSON.stringify(response.body));
  });
});
