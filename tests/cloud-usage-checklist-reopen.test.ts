import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// A base local (.env) aponta para prisma; esta bateria é 100% em memória e não abre conexão com o Postgres.
// As linhas abaixo têm de rodar ANTES de qualquer módulo de src ser carregado (o `env` é congelado no import),
// por isso o arquivo inteiro usa `await import(...)` dinâmico — não há import estático de src aqui.
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

/**
 * CHECKLIST P1 PR-03 — cobertura da CORREÇÃO DA COBRANÇA DOBRADA (achado ALTA da 1ª rodada da junta; a
 * ausência de teste virou o ALTA-4 do critico-adversarial na 2ª).
 *
 * O QUE ESTÁ EM JOGO: `checklist_run.completed` é métrica FATURADA. Ela alimenta o consumo
 * (cloud-usage.events) e é a PRIMEIRA chave da base de rateio de custo de nuvem
 * (cloud-cost-allocation.rules → `basisMetricKeys: ["checklist_run.completed", "checklist_runs_count"]`).
 * Concluir a versão REABERTA de uma vistoria é a correção de um trabalho já cobrado — contá-la de novo
 * inflaria a base da organização e a faria pagar pelo conserto de um erro nosso.
 *
 * O RISCO QUE ESTA BATERIA FECHA: a invariante FINANCEIRA passou a depender de um campo booleano viajando
 * dentro do payload de um evento (`isReopenedRun`). Um refactor que renomeie o campo no produtor, pare de
 * propagá-lo, ou troque a leitura no consumidor reintroduz a cobrança dobrada EM SILÊNCIO — só apareceria na
 * fatura do cliente. Por isso o teste (1) atravessa a cadeia REAL (serviço de checklist → publisher →
 * consumidor de consumo), em vez de só chamar o consumidor com um envelope montado à mão: um envelope à mão
 * carrega o campo certo por construção e não notaria o produtor parar de carimbá-lo.
 */


test("[cadeia real] concluir a vistoria REABERTA registra quantidade ZERO — a organização não é cobrada duas vezes", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());

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
  await service.publishTemplate(actor, template.id);

  const original = await service.createRun(actor, { checklistId: template.id, answers: [] });
  await service.completeRun(actor, original.id, { hasDivergence: false });

  const reaberta = await service.reopenRun(actor, original.id, {
    reason: "Foto do para-choque saiu ilegível",
  });
  await service.completeRun(actor, reaberta.run.run.id, { hasDivergence: false });

  const concluidas = await usageEvents(actor.tenantId, "checklist_run.completed");

  // As DUAS conclusões ficam na trilha — o auditor precisa enxergar que a reabertura aconteceu.
  assert.equal(concluidas.length, 2, "as duas conclusões têm de estar registradas na trilha de consumo");

  const daOriginal = concluidas.find((evento) => evento.sourceId === original.id);
  const daReaberta = concluidas.find((evento) => evento.sourceId === reaberta.run.run.id);

  assert.ok(daOriginal, "a conclusão da vistoria original tem de estar na trilha");
  assert.ok(daReaberta, "a conclusão da vistoria reaberta tem de estar na trilha (quantidade zero é registrada, não descartada)");

  assert.equal(daOriginal.quantity, 1, "o trabalho de campo original é cobrado uma vez");
  assert.equal(daReaberta.quantity, 0, "a correção de um erro nosso NÃO pode ser cobrada de novo");

  // O que a fatura enxerga: uma única unidade, mesmo com duas conclusões na trilha.
  assert.equal(
    concluidas.reduce((total, evento) => total + evento.quantity, 0),
    1,
    "vistoria + reabertura = 1 unidade faturável",
  );

  // A linha zerada carrega marcador próprio de idempotência: na tabela `cloud_usage_events` dá para distinguir a
  // conclusão de reabertura da conclusão comum sem reabrir o payload do evento.
  assert.match(String(daReaberta.idempotencyKey), /:reopened$/);
  assert.notEqual(daReaberta.idempotencyKey, daOriginal.idempotencyKey);

  // A OUTRA metade da mesma invariante: reabrir publica `checklist_run.reopened`, nunca
  // `checklist_run.created` — senão a segunda métrica faturada da regra de rateio (`checklist_runs_count`)
  // contaria a correção como vistoria nova.
  const criacoes = await usageEvents(actor.tenantId, "checklist_runs_count");
  assert.equal(criacoes.length, 1, "só a vistoria original conta como criação faturável");
  assert.equal(criacoes[0]?.quantity, 1);

  resetUsage();
});

/**
 * B-O6R-06 (Ω6R-DIN-005) — OS QUATRO CASOS FORAM MIGRADOS PARA O CAMINHO DA TRANSAÇÃO (aceite R4).
 *
 * A ASSERÇÃO DE NEGÓCIO É A MESMA, verbatim: vistoria original cobra 1, versão reaberta cobra 0, a linha
 * zerada fica na trilha com chave `:reopened`, e a reabertura não move a agregação diária nem o rateio.
 * O MECANISMO é que mudou de lugar: a unidade faturável não nasce mais do consumidor do evento de domínio
 * (`recordCloudUsageForDomainEvent`, pós-commit, `.catch(warn)`, chave por `event.id`) — ela nasce DENTRO
 * da transação que insere/conclui a run, com chave derivada da RUN (`cloud-usage.capture.ts`).
 *
 * POR ISSO os três casos que montavam ENVELOPE À MÃO deixaram de fazer sentido como estavam: o ramo que
 * eles exercitavam não existe mais em `cloud-usage.events.ts` (é o que o censo C1 prova). Eles passam a
 * exercitar a mesma propriedade pelo caminho novo — e é justamente a mutação M-11 (`quantity = 1` na
 * conclusão reaberta) que os deixa vermelhos, como antes.
 */
test("[conclusão comum] duas vistorias distintas cobram 1 cada — a correção não zera vistoria legítima", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());
  const template = await publicarModelo(service, actor);

  const primeira = await service.createRun(actor, { checklistId: template.id, answers: [] });
  const segunda = await service.createRun(actor, { checklistId: template.id, answers: [] });
  await service.completeRun(actor, primeira.id, { hasDivergence: false });
  await service.completeRun(actor, segunda.id, { hasDivergence: false });

  const concluidas = await usageEvents(actor.tenantId, "checklist_run.completed");

  assert.equal(concluidas.length, 2);
  assert.equal(
    concluidas.find((evento) => evento.sourceId === primeira.id)?.quantity,
    1,
    "vistoria original é conclusão comum: cobra 1",
  );
  assert.equal(
    concluidas.find((evento) => evento.sourceId === segunda.id)?.quantity,
    1,
    "vistoria original é conclusão comum: cobra 1",
  );

  // A origem do zero deixou de ser um booleano viajando no payload de um evento: é `reopenedFromRunId`
  // lido da PRÓPRIA LINHA da run. Um refactor que pare de propagar o campo no evento não pode mais
  // reintroduzir a cobrança dobrada em silêncio — o dado está na tabela.
  for (const evento of concluidas) {
    assert.equal(evento.metadata.reopenedFromRunId, undefined);
  }

  resetUsage();
});

test("[reentrega] a mesma conclusão reaberta capturada duas vezes continua valendo zero e uma linha só", async () => {
  const { usageEvents, resetUsage, buildChecklistRunUsageEvents, appendChecklistRunUsageInMemory } =
    await bootstrap();
  resetUsage();

  const tenantId = randomUUID();
  const run = {
    id: randomUUID(),
    tenantId,
    startedAt: new Date(),
    completedAt: new Date(),
    reopenedFromRunId: randomUUID(),
  };

  // Duas capturas do MESMO fato — é o que uma reentrega, um replay ou uma reconciliação produzem.
  const entradas = buildChecklistRunUsageEvents("completed", run);
  await appendChecklistRunUsageInMemory(entradas);
  await appendChecklistRunUsageInMemory(entradas);

  const concluidas = await usageEvents(tenantId, "checklist_run.completed");

  assert.equal(concluidas.length, 1, "a reentrega é deduplicada pela chave de idempotência");
  assert.equal(concluidas[0]?.quantity, 0);
  assert.match(String(concluidas[0]?.idempotencyKey), /:reopened$/);

  resetUsage();
});

/**
 * A prova de que a correção CORRIGE, e não apenas carimba: a linha de quantidade zero atravessa a agregação
 * diária e o motor de rateio sem mover um centavo. Sem ela, a organização A (que reabriu uma vistoria) pagaria
 * 2/3 da fatura de checklist em vez da metade — dinheiro real, cobrado por um conserto nosso.
 */
test("[base de rateio] a conclusão reaberta não move a agregação diária nem o rateio de custo de nuvem", async () => {
  const { ChecklistService, InMemoryChecklistRepository, aggregateDay, resetUsage, allocateCloudCosts } =
    await bootstrap();
  resetUsage();

  const organizacaoA = { tenantId: randomUUID(), userId: randomUUID() };
  const organizacaoB = { tenantId: randomUUID(), userId: randomUUID() };
  const repositorio = new InMemoryChecklistRepository();
  const service = new ChecklistService(repositorio);

  // A: uma vistoria concluída + a conclusão da versão REABERTA dela (correção, não trabalho novo).
  const modeloA = await publicarModelo(service, organizacaoA);
  const runA = await service.createRun(organizacaoA, { checklistId: modeloA.id, answers: [] });
  await service.completeRun(organizacaoA, runA.id, { hasDivergence: false });
  const reaberta = await service.reopenRun(organizacaoA, runA.id, { reason: "Foto ilegível" });
  await service.completeRun(organizacaoA, reaberta.run.run.id, { hasDivergence: false });

  // B: uma vistoria concluída. Mesmo trabalho de campo que A → mesma fatia da conta.
  const modeloB = await publicarModelo(service, organizacaoB);
  const runB = await service.createRun(organizacaoB, { checklistId: modeloB.id, answers: [] });
  await service.completeRun(organizacaoB, runB.id, { hasDivergence: false });

  const hoje = new Date();
  const agregados = await aggregateDay(hoje);
  const daBase = agregados.filter((item) => item.metricKey === "checklist_run.completed");

  assert.equal(daBase.find((item) => item.tenantId === organizacaoA.tenantId)?.quantity, 1);
  assert.equal(daBase.find((item) => item.tenantId === organizacaoB.tenantId)?.quantity, 1);

  const resultado = allocateCloudCosts({
    runId: randomUUID(),
    periodStart: inicioDoDia(hoje),
    periodEnd: fimDoDia(hoje),
    strategy: "usage_weighted_v1",
    tenants: [
      { id: organizacaoA.tenantId, name: "Organização A" },
      { id: organizacaoB.tenantId, name: "Organização B" },
    ],
    usageAggregates: agregados,
    costLineItems: [linhaDeCustoDeChecklist(10, hoje)],
  });

  const fatiaA = resultado.allocations.find((item) => item.tenantId === organizacaoA.tenantId);
  const fatiaB = resultado.allocations.find((item) => item.tenantId === organizacaoB.tenantId);

  assert.equal(
    fatiaA?.allocationBasisMetricKey,
    "checklist_run.completed",
    "a conclusão é mesmo a primeira chave da base — é por isso que zerá-la importa",
  );
  assert.equal(fatiaA?.allocatedCost, 5, "A reabriu uma vistoria, não fez uma a mais: metade da conta");
  assert.equal(fatiaB?.allocatedCost, 5);
  assert.equal(resultado.totalAllocatedCost, 10);

  resetUsage();
});

// --- apoio -----------------------------------------------------------------------------------------------

function inicioDoDia(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function fimDoDia(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

type ServicoDeChecklist = {
  createTemplate(actor: unknown, input: unknown): Promise<{ id: string }>;
  publishTemplate(actor: unknown, id: string): Promise<{ id: string }>;
};

async function publicarModelo(
  service: ServicoDeChecklist,
  actor: { readonly tenantId: string; readonly userId: string },
): Promise<{ id: string }> {
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

function linhaDeCustoDeChecklist(unblendedCost: number, dia: Date) {
  return {
    id: randomUUID(),
    importId: "import-checklist-reopen",
    provider: "aws" as const,
    billingPeriodStart: inicioDoDia(dia),
    billingPeriodEnd: fimDoDia(dia),
    serviceCode: "ChecklistService",
    usageType: "ChecklistRuns",
    unblendedCost,
    currency: "USD",
    rawLineHash: randomUUID(),
    metadata: {},
    createdAt: inicioDoDia(dia),
  };
}

async function bootstrap() {
  const [checklists, cloudUsage, cloudUsageCapture, allocation] = await Promise.all([
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/cloud-usage/cloud-usage.service.js"),
    import("../src/modules/cloud-usage/cloud-usage.capture.js"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.js"),
  ]);
  const repositorio = await import("../src/modules/checklists/checklist.repository.js");

  // A medição de consumo é fire-and-forget por desenho (não pode travar a operação de campo): sem drenar a
  // fila de escritas em voo, as asserções leriam a trilha antes de ela existir e o teste passaria por acaso.
  const drainUsage = cloudUsage.drainCloudUsageBestEffortForTests;

  return {
    ChecklistService: checklists.ChecklistService,
    InMemoryChecklistRepository: repositorio.InMemoryChecklistRepository,
    buildChecklistRunUsageEvents: cloudUsageCapture.buildChecklistRunUsageEvents,
    appendChecklistRunUsageInMemory: cloudUsageCapture.appendChecklistRunUsageInMemory,
    allocateCloudCosts: allocation.allocateCloudCosts,
    drainUsage,
    resetUsage: cloudUsage.resetCloudUsageRuntimeForTests,
    aggregateDay: async (dia: Date) => {
      await drainUsage();
      return cloudUsage.createMemoryCloudUsageService().aggregateDailyUsage(dia);
    },
    usageEvents: async (tenantId: string, metricKey: string) => {
      await drainUsage();
      const eventos = await cloudUsage
        .getMemoryCloudUsageRepositoryForTests()
        .listEvents({ tenantId });
      return eventos.filter((evento) => evento.metricKey === metricKey);
    },
  };
}
