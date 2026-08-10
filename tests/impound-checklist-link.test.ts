import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  createMemoryImpoundChecklistLinkService,
  getMemoryImpoundChecklistLinkRepositoryForTests,
  resetImpoundChecklistLinkRuntimeForTests,
} from "../src/modules/impound/impound.checklist-link.service.js";
import { ImpoundChecklistLinkError } from "../src/modules/impound/impound.checklist-link.types.js";
import type { ImpoundActorContext } from "../src/modules/impound/impound.types.js";

function actor(overrides: Partial<ImpoundActorContext> = {}): ImpoundActorContext {
  return {
    tenantId: overrides.tenantId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    roles: overrides.roles ?? ["manager"],
    permissions: overrides.permissions ?? ["impound:read", "impound:update", "checklist_runs:read"],
  };
}

function setup() {
  resetImpoundChecklistLinkRuntimeForTests();
  return { service: createMemoryImpoundChecklistLinkService(), repository: getMemoryImpoundChecklistLinkRepositoryForTests() };
}

// ── link: fluxo feliz ──────────────────────────────────────────────────────────

test("link: fluxo feliz — vincula MANUAL, aparece em listChecklistRuns", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const processId = randomUUID();
  const runId = randomUUID();
  repository.registerProcessForTests(tenantActor.tenantId, processId);
  repository.registerChecklistRunForTests({
    id: runId,
    tenantId: tenantActor.tenantId,
    templateId: randomUUID(),
    templateName: "Vistoria de recolhimento",
    templateVersion: 1,
    status: "completed",
    startedAt: new Date(),
    completedAt: new Date(),
  });

  const link = await service.linkChecklistRun(tenantActor, processId, { checklistRunId: runId });
  assert.equal(link.linkSource, "MANUAL");
  assert.equal(link.processId, processId);
  assert.equal(link.checklistRunId, runId);

  const runs = await service.listChecklistRuns(tenantActor, processId);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].id, runId);
  // Ω-VID PR-08 — o NOME do template flui pelo resumo (identidade da linha no dossiê).
  assert.equal(runs[0].templateName, "Vistoria de recolhimento");
});

// CHECKLIST P1 PR-03 (junta, MÉDIA) — o vínculo do dossiê aponta para a vistoria ORIGINAL. Reabrir cria
// OUTRA run; sem marcação, a aba "Checklist do Guincho" mostrava a versão SUBSTITUÍDA como se fosse a
// vigente — numa tela que é prova do estado do veículo.
test("dossiê: vistoria reaberta marca a original como SUBSTITUÍDA e aponta a versão vigente", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const processId = randomUUID();
  const originalId = randomUUID();
  const novaVersaoId = randomUUID();
  const templateId = randomUUID();

  repository.registerProcessForTests(tenantActor.tenantId, processId);
  repository.registerChecklistRunForTests({
    id: originalId,
    tenantId: tenantActor.tenantId,
    templateId,
    templateName: "Vistoria de recolhimento",
    templateVersion: 1,
    status: "completed",
    startedAt: new Date("2026-08-01T10:00:00.000Z"),
    completedAt: new Date("2026-08-01T10:30:00.000Z"),
  });
  // A versão nova nasce da reabertura da original (é o que o repositório de checklists grava).
  repository.registerChecklistRunForTests({
    id: novaVersaoId,
    tenantId: tenantActor.tenantId,
    templateId,
    templateName: "Vistoria de recolhimento",
    templateVersion: 1,
    status: "in_progress",
    startedAt: new Date("2026-08-02T09:00:00.000Z"),
    reopenedFromRunId: originalId,
  });

  await service.linkChecklistRun(tenantActor, processId, { checklistRunId: originalId });

  const runs = await service.listChecklistRuns(tenantActor, processId);
  const original = runs.find((run) => run.id === originalId);
  assert.ok(original, "a vistoria original deve continuar no dossiê (histórico preservado)");
  assert.equal(original.supersededByRunId, novaVersaoId, "a original precisa apontar a versão que a substituiu");
  assert.equal(original.reopenedFromRunId, undefined, "a original não veio de reabertura nenhuma");
});

test("DTO: toChecklistRunSummaryListDto expõe templateName (null quando ausente) e NUNCA tenant_id (§allowlist)", async () => {
  const { toChecklistRunSummaryListDto } = await import("../src/modules/impound/impound.checklist-link.dto.js");
  const startedAt = new Date("2026-07-20T10:00:00.000Z");
  const dto = toChecklistRunSummaryListDto([
    { id: "r1", tenantId: "TENANT-SECRETO", templateId: "t1", templateName: "Vistoria de recolhimento", templateVersion: 3, status: "completed", startedAt, completedAt: null as unknown as Date | undefined },
    { id: "r2", tenantId: "TENANT-SECRETO", templateId: "t2", templateVersion: 1, status: "in_progress", startedAt },
  ]);
  assert.equal(dto.items[0].templateName, "Vistoria de recolhimento");
  assert.equal(dto.items[1].templateName, null, "templateName ausente → null (não undefined solto)");
  assert.equal(JSON.stringify(dto).includes("TENANT-SECRETO"), false, "§allowlist: tenant_id nunca no DTO");
});

test("link: idempotente — repetir o MESMO par não duplica", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const processId = randomUUID();
  const runId = randomUUID();
  repository.registerProcessForTests(tenantActor.tenantId, processId);
  repository.registerChecklistRunForTests({
    id: runId,
    tenantId: tenantActor.tenantId,
    templateId: randomUUID(),
    templateVersion: 1,
    status: "in_progress",
    startedAt: new Date(),
  });

  const first = await service.linkChecklistRun(tenantActor, processId, { checklistRunId: runId });
  const second = await service.linkChecklistRun(tenantActor, processId, { checklistRunId: runId });
  assert.equal(first.id, second.id);

  const runs = await service.listChecklistRuns(tenantActor, processId);
  assert.equal(runs.length, 1);
});

test("link: processo inexistente/de outro tenant -> 404", async () => {
  const { service } = setup();
  const tenantActor = actor();
  await assert.rejects(
    () => service.linkChecklistRun(tenantActor, randomUUID(), { checklistRunId: randomUUID() }),
    (error: unknown) => error instanceof ImpoundChecklistLinkError && error.statusCode === 404 && error.reason === "process_not_found",
  );
});

test("link: ChecklistRun cross-tenant (não pertence ao mesmo tenant do processo) -> 404", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const processId = randomUUID();
  repository.registerProcessForTests(tenantActor.tenantId, processId);
  // run registrada sob OUTRO tenant.
  const runId = randomUUID();
  repository.registerChecklistRunForTests({
    id: runId,
    tenantId: randomUUID(),
    templateId: randomUUID(),
    templateVersion: 1,
    status: "completed",
    startedAt: new Date(),
  });

  await assert.rejects(
    () => service.linkChecklistRun(tenantActor, processId, { checklistRunId: runId }),
    (error: unknown) => error instanceof ImpoundChecklistLinkError && error.statusCode === 404 && error.reason === "checklist_run_not_found",
  );
});

test("listChecklistRuns: processo inexistente -> 404", async () => {
  const { service } = setup();
  const tenantActor = actor();
  await assert.rejects(
    () => service.listChecklistRuns(tenantActor, randomUUID()),
    (error: unknown) => error instanceof ImpoundChecklistLinkError && error.statusCode === 404,
  );
});

// ── HTTP: permissão ────────────────────────────────────────────────────────────

test("HTTP: POST /impound-processes/:id/link-checklist-run exige impound:update (viewer -> 403)", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    const response = await post(baseUrl, `/api/v1/impound-processes/${randomUUID()}/link-checklist-run`, headers(tenantId, "viewer"), {
      checklistRunId: randomUUID(),
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.reason, "permission_required");
  });
});

test("HTTP: GET /impound-processes/:id/checklist-runs exige impound:read E checklist_runs:read (field_dispatcher só tem a 1ª) -> 403", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    // A guarda DUPLA (impound:read + checklist_runs:read) segue barrando quem tem só a 1ª. field_dispatcher é
    // agora o papel canônico com impound:read SEM checklist_runs:read (o field_technician passou a ter a 2ª por
    // D-CHK-DISPATCH-CREATE — "answer-assigned" — então já não serve de exemplo do papel barrado; ver o teste
    // abaixo e a nota de consequência em controle/pendencias.md).
    const response = await getReq(baseUrl, `/api/v1/impound-processes/${randomUUID()}/checklist-runs`, headers(tenantId, "field_dispatcher"));
    assert.equal(response.status, 403, "field_dispatcher tem impound:read mas não checklist_runs:read — deve ser barrado");
  });
});

test("HTTP: GET /impound-processes/:id/checklist-runs — field_technician agora tem AS DUAS permissões (D-CHK-DISPATCH-CREATE), passa do gate (404, não 403)", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    // Consequência de D-CHK-DISPATCH-CREATE: o field_technician ganhou checklist_runs:read ("answer-assigned"),
    // então passa a guarda dupla deste endpoint (como o manager). Não é mais barrado; alcança o 404 de processo
    // inexistente. Registrado como consequência de RBAC em controle/pendencias.md (§A2, sem resolução silenciosa).
    const response = await getReq(baseUrl, `/api/v1/impound-processes/${randomUUID()}/checklist-runs`, headers(tenantId, "field_technician"));
    assert.notEqual(response.status, 403, "field_technician agora tem impound:read e checklist_runs:read — não é barrado pelo RBAC");
    assert.equal(response.status, 404, "processo inexistente — o gate passou, falhou na existência (esperado)");
  });
});

test("HTTP: GET /impound-processes/:id/checklist-runs — manager tem AS DUAS permissões, passa do gate (chega no 404 do processo inexistente, não no 403)", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    const response = await getReq(baseUrl, `/api/v1/impound-processes/${randomUUID()}/checklist-runs`, headers(tenantId, "manager"));
    assert.notEqual(response.status, 403, "manager tem impound:read e checklist_runs:read — não deve ser barrado pelo RBAC");
    assert.equal(response.status, 404, "processo inexistente — o gate passou, falhou na existência (esperado)");
  });
});

// ── helpers HTTP (mesmo padrão de tests/sessions-admin.test.ts — memória, sem DB) ───────────────────────────────

async function withApi(callback: (context: { baseUrl: string; tenantId: string }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  const { app } = await import("../src/app.js");
  const tenantId = randomUUID();

  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  try {
    await callback({ baseUrl, tenantId });
  } finally {
    await closeServer(server);
  }
}

function headers(tenantId: string, role: string): Record<string, string> {
  return { "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": role };
}

async function post(baseUrl: string, path: string, extraHeaders: Record<string, string>, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

async function getReq(baseUrl: string, path: string, extraHeaders: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { "content-type": "application/json", ...extraHeaders } });
  return { status: response.status, body: await response.json() };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
