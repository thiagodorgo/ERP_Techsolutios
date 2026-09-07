import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 — CENSO PERMANENTE DO QUE FATURA.
//
// Um bloco que MOVE o ponto de captura da métrica faturável tem uma classe de regressão própria: o
// produtor antigo voltar sem ninguém ver. Se o ramo de `cloud-usage.events.ts` for restaurado, cada
// emissão grava uma SEGUNDA linha (a chave por `event.id` não colide com a chave estável) e a base de
// rateio `checklists` DOBRA — em silêncio, aparecendo só na fatura do cliente.
//
//   C1  quem NÃO fatura mais pelo evento de domínio, e quem CONTINUA faturando por ele
//   C2  o conjunto de chaves que a captura produz É o conjunto que a regra de rateio consome
//   C3  `normalizeSummaryFilters` não tem mais `limit`
//   C4  a tabela "antes = depois" por CHAMADOR — o número faturado de cada trilha
//   C5  linhas LEGADAS e novas convivem sem se deduplicarem entre si
//   C6  o parâmetro `billing` é obrigatório PARA O COMPILADOR (drill de `tsc`)
//   C7  a SEGUNDA trava — `assertChecklistRunStatusTransition` — que fecha o conjunto junto com C6
// -----------------------------------------------------------------------------------------------

test("C1 · a vistoria não fatura mais pelo evento de domínio; o anexo continua faturando por ele", async () => {
  const { recordCloudUsageForDomainEvent, usageEvents, drainUsage, resetUsage } = await bootstrap();

  for (const nome of ["checklist_run.created", "checklist_run.completed"]) {
    resetUsage();
    const tenantId = randomUUID();

    recordCloudUsageForDomainEvent({
      id: randomUUID(),
      name: nome,
      payload: { runId: randomUUID(), templateId: randomUUID(), status: "completed" },
      tenantId,
      actorId: randomUUID(),
      correlationId: randomUUID(),
      occurredAt: new Date().toISOString(),
    });
    await drainUsage();

    assert.equal(
      (await usageEvents(tenantId)).length,
      0,
      `${nome} NÃO pode gerar unidade aqui — ela nasce na transação da run (mutação M-6 é o que isto mata)`,
    );
  }

  resetUsage();
  const tenantDoAnexo = randomUUID();

  recordCloudUsageForDomainEvent({
    id: randomUUID(),
    name: "checklist_run.attachment_uploaded",
    payload: { runId: randomUUID(), attachmentId: randomUUID(), sizeBytes: 4096 },
    tenantId: tenantDoAnexo,
    actorId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date().toISOString(),
  });
  await drainUsage();

  const doAnexo = await usageEvents(tenantDoAnexo);

  assert.ok(doAnexo.length > 0, "o best-effort continua vivo para o que este bloco NÃO fecha");
  assert.deepEqual(
    doAnexo.map((evento) => evento.metricKey).sort(),
    ["checklist_attachment.uploaded.bytes", "checklist_attachment.uploaded.count", "s3_put_requests"],
    "e o censo diz exatamente QUAIS chaves seguem best-effort (P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL)",
  );

  resetUsage();
});

test("C2 · o que a captura PRODUZ é exatamente o que a regra de rateio `checklists` CONSOME", async () => {
  const { buildChecklistRunUsageEvents, resolveAllocationRule } = await bootstrap();

  const produzidas = new Set<string>();

  for (const kind of ["created", "completed"] as const) {
    for (const entrada of buildChecklistRunUsageEvents(kind, {
      id: randomUUID(),
      tenantId: randomUUID(),
      startedAt: new Date(),
      completedAt: new Date(),
    })) {
      produzidas.add(entrada.metricKey);
    }
  }

  const regra = resolveAllocationRule({ serviceCode: "ChecklistService", usageType: "ChecklistRuns" });

  assert.ok(regra, "a regra de rateio de vistoria existe");
  assert.equal(regra!.costCategory, "checklists");

  const consumidas = new Set(regra!.basisMetricKeys);

  // (a) tudo que a captura produz é chave conhecida do rateio — nenhuma chave órfã sendo faturada.
  for (const chave of produzidas) {
    assert.ok(
      consumidas.has(chave) || chave === "checklist_run.created",
      `${chave} é produzida pela captura mas não é base de rateio nem a chave de criação declarada`,
    );
  }

  // (b) e toda chave da BASE tem produtor na transação — é este lado que pega uma base sem produtor,
  // a classe que virou `P-O6R-B06-BASE-SEM-PRODUTOR` para as regras de api/storage.
  for (const chave of consumidas) {
    assert.ok(produzidas.has(chave), `${chave} é base de rateio de vistoria e NINGUÉM a produz na transação`);
  }

  assert.deepEqual([...produzidas].sort(), ["checklist_run.completed", "checklist_run.created", "checklist_runs_count"]);
});

test("C3 · `normalizeSummaryFilters` não produz mais a propriedade `limit`", async () => {
  const { normalizeSummaryFilters } = await bootstrap();
  const resultado = normalizeSummaryFilters({ serviceCode: "AmazonEC2" });

  assert.equal("limit" in resultado, false, "era este campo o truncamento silencioso do Ω6R-DIN-007");
  assert.ok(resultado.periodStart instanceof Date, "o default de 30 dias do resumo continua");
  assert.ok(resultado.periodEnd instanceof Date);
});

test("C4 · a tabela ANTES = DEPOIS por chamador: completeRun 1, registerDivergence 0, acknowledgeRun 0", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();

  const medido: Record<string, number> = {};

  // (1) `service.completeRun` — o ÚNICO chamador que publica `checklist_run.completed` hoje.
  resetUsage();
  {
    const actor = { tenantId: randomUUID(), userId: randomUUID() };
    const service = new ChecklistService(new InMemoryChecklistRepository());
    const template = await publicarModelo(service, actor);
    const run = await service.createRun(actor, { checklistId: template.id, answers: [] });
    await service.completeRun(actor, run.id, { hasDivergence: false });
    medido.completeRun = (await usageEvents(actor.tenantId, "checklist_run.completed")).length;
  }

  // (2) `service.registerDivergence` — trilha C, do sync do mobile. NUNCA faturou conclusão.
  resetUsage();
  {
    const actor = { tenantId: randomUUID(), userId: randomUUID() };
    const service = new ChecklistService(new InMemoryChecklistRepository());
    const template = await publicarModelo(service, actor);
    const run = await service.createRun(actor, { checklistId: template.id, answers: [] });
    await service.registerDivergence(actor, run.id, {
      componentId: template.components[0]!.id,
      observation: "Para-choque amassado",
    });
    medido.registerDivergence = (await usageEvents(actor.tenantId, "checklist_run.completed")).length;
  }

  // (3) `service.acknowledgeRun` — a ciência que fecha a trilha C.
  resetUsage();
  {
    const actor = { tenantId: randomUUID(), userId: randomUUID() };
    const service = new ChecklistService(new InMemoryChecklistRepository());
    const template = await publicarModelo(service, actor);
    const run = await service.createRun(actor, { checklistId: template.id, answers: [] });
    await service.registerDivergence(actor, run.id, {
      componentId: template.components[0]!.id,
      observation: "Vidro trincado",
    });
    const antes = (await usageEvents(actor.tenantId, "checklist_run.completed")).length;
    await service.acknowledgeRun(actor, run.id, { message: "Ciente", metadata: {} });
    medido.acknowledgeRun = (await usageEvents(actor.tenantId, "checklist_run.completed")).length - antes;
  }

  // O NÚMERO FATURADO POR TRILHA, publicado. Capturar a unidade dentro do repositório SEM o parâmetro
  // `billing` teria mudado `registerDivergence` e `acknowledgeRun` de 0 para 1 — mudança de PREÇO numa
  // trilha inteira do app de campo, que é decisão de produto e não deste bloco
  // (`P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA`).
  assert.deepEqual(medido, { completeRun: 1, registerDivergence: 0, acknowledgeRun: 0 });

  resetUsage();
});

test("C5 · linha LEGADA e linha NOVA da mesma run convivem — e a mesma chave nunca aparece duas vezes", async () => {
  const { ChecklistService, InMemoryChecklistRepository, memoriaDoUso, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());
  const template = await publicarModelo(service, actor);
  const run = await service.createRun(actor, { checklistId: template.id, answers: [] });

  // A run NASCEU no mundo antigo: a linha de criação tem chave por EMISSÃO (`{event.id}:…`), como as
  // linhas que já existem na base. Elas NÃO se deduplicam contra a chave estável — e é exatamente por
  // isso que C1 é o teste mais importante do bloco: se o ramo antigo voltar (mutação M-6), a mesma
  // vistoria passa a ter DUAS linhas de criação, uma por chave, e a base dobra.
  const eventoLegado = randomUUID();
  await memoriaDoUso().createEvent({
    tenantId: actor.tenantId,
    sourceType: "checklist_run",
    sourceId: run.id,
    metricKey: "checklist_runs_count",
    quantity: 1,
    unit: "count",
    occurredAt: new Date(),
    idempotencyKey: `${eventoLegado}:checklist_runs_count`,
    metadata: {},
  });

  await service.completeRun(actor, run.id, { hasDivergence: false });

  const daRun = (await usageEvents(actor.tenantId)).filter((evento) => evento.sourceId === run.id);
  const chaves = daRun.map((evento) => evento.idempotencyKey);

  assert.equal(new Set(chaves).size, chaves.length, "nenhuma chave se repete");
  assert.equal(
    chaves.filter((chave) => chave === `checklist_run:${run.id}:checklist_run.completed`).length,
    1,
    "a conclusão tem UMA linha, com a chave estável",
  );
  assert.ok(chaves.includes(`${eventoLegado}:checklist_runs_count`), "a linha legada permanece — é dado real, não lixo");
  assert.equal(
    daRun.filter((evento) => evento.metricKey === "checklist_runs_count").length,
    2,
    "a legada e a nova coexistem na MESMA métrica — é a razão de a reconciliação dedupar pela FONTE, " +
      "nunca pela chave nova, e de C1 ser o guard que impede o produtor antigo de voltar",
  );

  resetUsage();
});

test("C6 · o parâmetro `billing` é OBRIGATÓRIO para o compilador — um 4º chamador não passa no `npm run check`", () => {
  // A sonda vive em `src/` porque é lá que o `tsc` do `npm run check` alcança (`tests/**` está fora do
  // tsconfig — foi por isso que os 8 sítios de `repo.completeRun` das suítes `-db` puderam ficar sem o
  // argumento até rodarem). Ela é criada, medida e REMOVIDA dentro deste caso; o `finally` garante que
  // nenhum resíduo sobre na árvore, e a asserção final confere.
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const sonda = path.join(raiz, "src", "zz-o6r06-c6-probe.ts");

  try {
    writeFileSync(
      sonda,
      [
        "import type { ChecklistRepository } from './modules/checklists/checklist.repository.js';",
        "",
        "export async function quartoChamador(repository: ChecklistRepository): Promise<unknown> {",
        "  return repository.completeRun('t', 'r', 'u', 'completed');",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    let saida = "";
    let codigo = 0;

    try {
      saida = execFileSync("npx", ["tsc", "-p", "tsconfig.json", "--noEmit"], {
        cwd: raiz,
        encoding: "utf8",
        shell: process.platform === "win32",
      });
    } catch (error) {
      codigo = (error as { status?: number }).status ?? 1;
      saida = `${(error as { stdout?: string }).stdout ?? ""}${(error as { stderr?: string }).stderr ?? ""}`;
    }

    assert.notEqual(codigo, 0, "um chamador que não declara a intenção de faturar TEM de quebrar o build");
    assert.match(
      saida,
      /completeRun|Expected 5 arguments|billing/,
      `o erro precisa apontar para a assinatura de completeRun. Saída: ${saida.slice(0, 600)}`,
    );
  } finally {
    rmSync(sonda, { force: true });
  }

  assert.equal(existsSync(sonda), false, "a sonda não pode sobrar na árvore");
});

test("C7 · a SEGUNDA trava: `updateRun` não consegue levar uma run a estado concluído (409)", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  // RESSALVA DA RODADA 2 DO CRÍTICO, atendida: o conjunto "caminhos que levam uma run a estado
  // concluído" é fechado por DUAS travas, em arquivos diferentes — a assinatura de `completeRun`
  // (provada por C6, no compilador) e `assertChecklistRunStatusTransition`
  // (`checklist.run-lifecycle.ts`), que barra o `updateRun` — chamado por REST **e** pelo sync do
  // mobile. A emenda provava só a primeira. Se alguém relaxar a segunda amanhã, uma run chega a
  // `completed` SEM unidade faturável — o P0 de volta — e nenhum outro aceite notaria.
  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const repository = new InMemoryChecklistRepository();
  const service = new ChecklistService(repository);
  const template = await publicarModelo(service, actor);

  for (const alvo of ["completed", "completed_with_divergence", "pending_acknowledgement"] as const) {
    const run = await service.createRun(actor, { checklistId: template.id, answers: [] });
    const antes = (await usageEvents(actor.tenantId, "checklist_run.completed")).length;

    await assert.rejects(
      () => repository.updateRun({ tenantId: actor.tenantId, runId: run.id, status: alvo, answers: [] }),
      (error: unknown) => (error as { statusCode?: number }).statusCode === 409,
      `updateRun NÃO pode saltar para ${alvo} — é o que impede uma run concluída sem medição`,
    );

    assert.equal((await repository.getRun(actor.tenantId, run.id))?.run.status, "in_progress");
    assert.equal(
      (await usageEvents(actor.tenantId, "checklist_run.completed")).length,
      antes,
      "e nenhuma unidade nasce por esse caminho",
    );
  }

  resetUsage();
});

// --- apoio -----------------------------------------------------------------------------------------

type ServicoDeChecklist = {
  createTemplate(actor: unknown, input: unknown): Promise<{ id: string }>;
  publishTemplate(actor: unknown, id: string): Promise<{ id: string; components: { id: string }[] }>;
};

async function publicarModelo(
  service: ServicoDeChecklist,
  actor: { readonly tenantId: string; readonly userId: string },
) {
  const template = await service.createTemplate(actor, {
    name: "Vistoria de coleta",
    type: "towing_collection",
    schema: {},
    components: [
      {
        type: "observation",
        label: "Observações do guincheiro",
        required: false,
        config: {},
        validationRules: {},
        visibilityRules: {},
      },
    ],
  });

  return service.publishTemplate(actor, template.id);
}

async function bootstrap() {
  const [checklists, repositorio, cloudUsage, cloudUsageCapture, cloudUsageEvents, custos, regras] = await Promise.all([
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/checklists/checklist.repository.js"),
    import("../src/modules/cloud-usage/cloud-usage.service.js"),
    import("../src/modules/cloud-usage/cloud-usage.capture.js"),
    import("../src/modules/cloud-usage/cloud-usage.events.js"),
    import("../src/modules/cloud-costs/aws-cur.service.js"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.js"),
  ]);
  const drainUsage = cloudUsage.drainCloudUsageBestEffortForTests;

  return {
    ChecklistService: checklists.ChecklistService,
    InMemoryChecklistRepository: repositorio.InMemoryChecklistRepository,
    buildChecklistRunUsageEvents: cloudUsageCapture.buildChecklistRunUsageEvents,
    recordCloudUsageForDomainEvent: cloudUsageEvents.recordCloudUsageForDomainEvent,
    normalizeSummaryFilters: custos.normalizeSummaryFilters,
    resolveAllocationRule: regras.resolveAllocationRule,
    memoriaDoUso: cloudUsage.getMemoryCloudUsageRepositoryForTests,
    drainUsage,
    resetUsage: cloudUsage.resetCloudUsageRuntimeForTests,
    usageEvents: async (tenantId: string, metricKey?: string) => {
      await drainUsage();
      const eventos = await cloudUsage.getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId });

      return metricKey ? eventos.filter((evento) => evento.metricKey === metricKey) : eventos;
    },
  };
}
