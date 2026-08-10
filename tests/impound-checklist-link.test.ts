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
  assert.equal(original.currentRunId, novaVersaoId, "com um salto só, a vigente É o sucessor imediato");
});

// Junta PR-03, 2ª rodada (BAIXA do critico-adversarial) — CADEIA DE UM SALTO SÓ.
// A resolução parava no sucessor IMEDIATO. Na SEGUNDA correção da mesma vistoria (v1→v2→v3 — cenário real,
// exercido em tests/checklist-run-lifecycle-db.test.ts) o dossiê vinculado à v1 apontava a v2, que já tinha
// sido substituída: mandava quem investiga o estado do veículo para uma versão que não vale mais.
test("dossiê: cadeia de 3 versões — a original aponta o sucessor IMEDIATO (v2) e a VIGENTE do fim da cadeia (v3)", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const processId = randomUUID();
  const templateId = randomUUID();
  const v1 = randomUUID();
  const v2 = randomUUID();
  const v3 = randomUUID();

  repository.registerProcessForTests(tenantActor.tenantId, processId);
  for (const [indice, versao] of [
    { id: v1, reopenedFromRunId: undefined, status: "completed" },
    { id: v2, reopenedFromRunId: v1, status: "completed" },
    { id: v3, reopenedFromRunId: v2, status: "in_progress" },
  ].entries()) {
    repository.registerChecklistRunForTests({
      id: versao.id,
      tenantId: tenantActor.tenantId,
      templateId,
      templateName: "Vistoria de recolhimento",
      templateVersion: 1,
      status: versao.status,
      startedAt: new Date(Date.UTC(2026, 7, 1 + indice, 10)),
      reopenedFromRunId: versao.reopenedFromRunId,
    });
  }

  // O dossiê é vinculado à ORIGINAL — é sempre ela que o vínculo aponta; a reabertura não move o elo.
  await service.linkChecklistRun(tenantActor, processId, { checklistRunId: v1 });

  const runs = await service.listChecklistRuns(tenantActor, processId);
  const original = runs.find((run) => run.id === v1);
  assert.ok(original, "a original continua no dossiê (histórico preservado)");
  assert.equal(original.supersededByRunId, v2, "sucessor IMEDIATO da v1 é a v2 — o campo diz o que o nome promete");
  assert.equal(original.currentRunId, v3, "a versão que VALE hoje é a v3, no fim da cadeia — não a v2");
});

// O CHECK do banco (migração 20260860000000) só proíbe a auto-referência A→A; A→B→A não é barrado por
// constraint nenhuma. Sem a guarda de visitados o percurso gira para sempre e a aba do dossiê nunca carrega.
// AVISO a quem mexer aqui: medido por mutação — removida a guarda, este teste NÃO falha, ele PENDURA a suíte
// inteira (o percurso é síncrono, trava o event loop, e o `timeout` do node:test não consegue interromper).
// É por isso que a guarda mora no código e não no teste: em produção o sintoma seria a requisição do dossiê
// nunca respondendo, com o processo Node parado junto.
test("dossiê: ciclo A→B→A na cadeia não trava a leitura (o percurso termina sempre)", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const processId = randomUUID();
  const templateId = randomUUID();
  const runA = randomUUID();
  const runB = randomUUID();

  repository.registerProcessForTests(tenantActor.tenantId, processId);
  repository.registerChecklistRunForTests({
    id: runA,
    tenantId: tenantActor.tenantId,
    templateId,
    templateVersion: 1,
    status: "completed",
    startedAt: new Date("2026-08-01T10:00:00.000Z"),
    reopenedFromRunId: runB,
  });
  repository.registerChecklistRunForTests({
    id: runB,
    tenantId: tenantActor.tenantId,
    templateId,
    templateVersion: 1,
    status: "completed",
    startedAt: new Date("2026-08-02T10:00:00.000Z"),
    reopenedFromRunId: runA,
  });

  await service.linkChecklistRun(tenantActor, processId, { checklistRunId: runA });

  const runs = await service.listChecklistRuns(tenantActor, processId);
  const vinculada = runs.find((run) => run.id === runA);
  assert.ok(vinculada, "a vistoria vinculada continua listada mesmo com a cadeia corrompida");
  // D-007: não inventamos uma "vigente" que não existe — devolvemos o último id REAL alcançado no ciclo.
  assert.equal(vinculada.currentRunId, runB, "o percurso para no id já visitado e devolve o último real");
});

// ── paridade do repositório Prisma (sem banco: cliente de mentira que CONTA as consultas) ──────────────
// A cadeia e o retorno cedo vivem nos DOIS repositórios. O de memória é exercido acima; aqui o de Prisma é
// exercido de verdade (a classe real), com um cliente falso que registra cada consulta de substituição —
// é assim que o desperdício de round-trip vira asserção em vez de promessa.

type FakeRunRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly template_id: string;
  readonly template_version: number;
  readonly status: string;
  readonly related_entity_type: string | null;
  readonly related_entity_id: string | null;
  readonly started_at: Date;
  readonly completed_at: Date | null;
  readonly reopened_from_run_id: string | null;
  readonly template: { readonly name: string } | null;
};

function fakeRunRecord(tenantId: string, id: string, reopenedFrom: string | null, startedAt: Date): FakeRunRecord {
  return {
    id,
    tenant_id: tenantId,
    template_id: "template-1",
    template_version: 1,
    status: "completed",
    related_entity_type: null,
    related_entity_id: null,
    started_at: startedAt,
    completed_at: null,
    reopened_from_run_id: reopenedFrom,
    template: { name: "Vistoria de recolhimento" },
  };
}

function fakePrismaClient(runs: readonly FakeRunRecord[], linkedRunIds: readonly string[]) {
  const chainQueries: string[][] = [];
  const client = {
    impoundProcessChecklistLink: {
      findMany: async () => linkedRunIds.map((runId) => ({ run: runs.find((run) => run.id === runId)! })),
    },
    checklistRun: {
      findMany: async (args: { where: { tenant_id: string; reopened_from_run_id: { in: string[] } } }) => {
        const alvo = args.where.reopened_from_run_id.in;
        chainQueries.push([...alvo]);
        return runs
          .filter(
            (run) =>
              run.tenant_id === args.where.tenant_id &&
              run.reopened_from_run_id !== null &&
              alvo.includes(run.reopened_from_run_id),
          )
          .map((run) => ({ id: run.id, reopened_from_run_id: run.reopened_from_run_id }));
      },
    },
  };
  return { client, chainQueries };
}

async function prismaRepositoryWith(runs: readonly FakeRunRecord[], linkedRunIds: readonly string[]) {
  const { PrismaImpoundChecklistLinkRepository } = await import("../src/modules/impound/impound.checklist-link-prisma.repository.js");
  const { client, chainQueries } = fakePrismaClient(runs, linkedRunIds);
  type ClienteAceito = ConstructorParameters<typeof PrismaImpoundChecklistLinkRepository>[0];
  return { repository: new PrismaImpoundChecklistLinkRepository(client as unknown as ClienteAceito), chainQueries };
}

test("Prisma: cadeia de 3 versões resolvida por NÍVEL — a v1 aponta v2 (imediata) e v3 (vigente)", async () => {
  const tenantId = randomUUID();
  const [v1, v2, v3] = [randomUUID(), randomUUID(), randomUUID()];
  const runs = [
    fakeRunRecord(tenantId, v1, null, new Date("2026-08-01T10:00:00.000Z")),
    fakeRunRecord(tenantId, v2, v1, new Date("2026-08-02T10:00:00.000Z")),
    fakeRunRecord(tenantId, v3, v2, new Date("2026-08-03T10:00:00.000Z")),
  ];
  const { repository, chainQueries } = await prismaRepositoryWith(runs, [v1]);

  const listadas = await repository.listChecklistRunsForProcess(tenantId, randomUUID());
  assert.equal(listadas.length, 1);
  assert.equal(listadas[0].supersededByRunId, v2, "sucessor imediato");
  assert.equal(listadas[0].currentRunId, v3, "vigente no fim da cadeia");
  // O custo é por PROFUNDIDADE, não por linha: [v1] → [v2] → [v3] (a última volta não acha sucessor e para).
  assert.deepEqual(chainQueries, [[v1], [v2], [v3]], "uma consulta por salto da cadeia, em lote");
});

// Junta PR-03, 2ª rodada (A1 do agente-dba-guardiao): processo sem vínculo nenhum disparava a consulta de
// substituições com `in: []` — o Prisma traduz para `1=0`, então não quebrava; só queimava um round-trip em
// todo dossiê sem checklist, que é a maioria deles.
test("Prisma: processo SEM vínculo não dispara a consulta de substituições (nenhum round-trip à toa)", async () => {
  const tenantId = randomUUID();
  const { repository, chainQueries } = await prismaRepositoryWith([], []);

  const listadas = await repository.listChecklistRunsForProcess(tenantId, randomUUID());
  assert.deepEqual(listadas, [], "sem vínculo, o dossiê lista vazio");
  assert.deepEqual(chainQueries, [], "sem vínculo não há cadeia a percorrer — zero consultas extras");
});

// SEM `{ timeout }`: o timeout de node:test vive na fila de macrotasks, e um laço que só espera
// promises já resolvidas mata essa fila — o timer nunca dispara e o arquivo PENDURA (medido: com as
// guardas removidas, os testes seguintes nunca rodaram e só um timeout externo matou o processo).
// A proteção real é a guarda `visited` no código, provada pelo teste; o timeout aqui seria decoração
// que faz o leitor acreditar numa rede que não existe.
test("Prisma: ciclo A→B→A não pendura o laço de níveis", async () => {
  const tenantId = randomUUID();
  const [runA, runB] = [randomUUID(), randomUUID()];
  const runs = [
    fakeRunRecord(tenantId, runA, runB, new Date("2026-08-01T10:00:00.000Z")),
    fakeRunRecord(tenantId, runB, runA, new Date("2026-08-02T10:00:00.000Z")),
  ];
  const { repository, chainQueries } = await prismaRepositoryWith(runs, [runA]);

  const listadas = await repository.listChecklistRunsForProcess(tenantId, randomUUID());
  assert.equal(listadas[0].currentRunId, runB, "para no id já visitado, sem inventar uma vigente");
  assert.deepEqual(chainQueries, [[runA], [runB]], "cada id entra na fronteira UMA vez — o laço fecha");
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
