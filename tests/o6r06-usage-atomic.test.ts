import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// A base local (.env) aponta para prisma; esta bateria é 100% em memória e não abre conexão com o
// Postgres. As linhas abaixo têm de rodar ANTES de qualquer módulo de src ser carregado (o `env` é
// congelado no import), por isso todo import de src neste arquivo é dinâmico.
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 · Ω6R-DIN-005 — REPLAY, IDEMPOTÊNCIA E O DUBLÊ EM MEMÓRIA.
//
// O que esta bateria PODE provar: que a semântica de negócio (quantas unidades, com que chave, em que
// marco) é a MESMA nos dois repositórios, e que o ramo antigo do consumidor de evento morreu de fato.
// O que ela NÃO prova, e não pretende: atomicidade. Memória não tem transação — a prova de que a run
// e a unidade commitam juntas é `o6r06-usage-atomic-db` e `o6r06-usage-fault-injection`, contra o
// Postgres de verdade. É a mesma regra que `financial-uow.ts` já registra para o dublê do razão.
// -----------------------------------------------------------------------------------------------

test("R1 · createRun grava 2 unidades no dublê; o REPLAY da mesma chave não acrescenta nenhuma", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());
  const template = await publicarModelo(service, actor);
  const clientRunKey = `r1-${randomUUID()}`;

  const primeira = await service.createRun(actor, { checklistId: template.id, clientRunKey, answers: [] });
  const depoisDaPrimeira = await usageEvents(actor.tenantId);

  assert.equal(depoisDaPrimeira.length, 2, "checklist_run.created + checklist_runs_count");
  assert.deepEqual(
    depoisDaPrimeira.map((evento) => evento.metricKey).sort(),
    ["checklist_run.created", "checklist_runs_count"],
  );

  const replay = await service.createRun(actor, { checklistId: template.id, clientRunKey, answers: [] });
  const depoisDoReplay = await usageEvents(actor.tenantId);

  assert.equal(replay.id, primeira.id, "o replay devolve a MESMA run");
  assert.equal(depoisDoReplay.length, 2, "e não cria unidade nenhuma a mais");

  resetUsage();
});

test("R2 · conclusão comum = 1, conclusão reaberta = 0, carimbo de fase em run já existente = 0 novas", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const repository = new InMemoryChecklistRepository();
  const service = new ChecklistService(repository);
  const template = await publicarModelo(service, actor);

  const original = await service.createRun(actor, { checklistId: template.id, answers: [] });
  await service.completeRun(actor, original.id, { hasDivergence: false });
  const daOriginal = await usageEvents(actor.tenantId, "checklist_run.completed");

  assert.equal(daOriginal.length, 1);
  assert.equal(daOriginal[0]?.quantity, 1);

  const reaberta = await service.reopenRun(actor, original.id, { reason: "Foto ilegível" });
  await service.completeRun(actor, reaberta.run.run.id, { hasDivergence: false });
  const conclusoes = await usageEvents(actor.tenantId, "checklist_run.completed");

  assert.equal(conclusoes.length, 2, "as duas conclusões ficam na trilha");
  assert.equal(
    conclusoes.find((evento) => evento.sourceId === reaberta.run.run.id)?.quantity,
    0,
    "a correção de um erro nosso não se cobra",
  );

  // ADOÇÃO DE RUN EM VOO: o despacho carimba a fase numa vistoria que JÁ existe, em vez de criar
  // outra. Nascer de novo custaria uma unidade FATURADA — é a razão de a adoção existir.
  const antesDaAdocao = (await usageEvents(actor.tenantId)).length;
  const carimbou = await repository.stampRunRole(actor.tenantId, original.id, "collection");

  assert.equal(carimbou, true, "a run existia e estava sem fase");
  assert.equal((await usageEvents(actor.tenantId)).length, antesDaAdocao, "adotar não fatura");

  resetUsage();
});

test("R3 · o consumidor de evento NÃO mede mais a vistoria — e continua medindo o que é dele", async () => {
  const { recordCloudUsageForDomainEvent, usageEvents, drainUsage, resetUsage } = await bootstrap();
  resetUsage();

  const tenantId = randomUUID();

  // Os dois ramos do P0 saíram de `cloud-usage.events.ts`. Se voltassem (mutação M-6), cada emissão
  // gravaria uma SEGUNDA linha — a chave por `event.id` não colide com a chave estável da captura — e
  // a base de rateio `checklists` DOBRARIA.
  recordCloudUsageForDomainEvent(envelope(tenantId, "checklist_run.created", { runId: randomUUID() }));
  recordCloudUsageForDomainEvent(envelope(tenantId, "checklist_run.completed", { runId: randomUUID() }));
  await drainUsage();

  assert.equal(
    (await usageEvents(tenantId)).length,
    0,
    "publicar o evento de domínio NÃO cria unidade de vistoria — a captura é na transação",
  );

  // CONTROLE POSITIVO: o best-effort continua vivo para o que este bloco não fecha (bytes de anexo,
  // requisições S3). O resíduo é `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL`, com dono nomeado.
  recordCloudUsageForDomainEvent(
    envelope(tenantId, "checklist_run.attachment_uploaded", { attachmentId: randomUUID(), sizeBytes: 2048 }),
  );
  await drainUsage();

  const doAnexo = await usageEvents(tenantId);
  assert.ok(doAnexo.length > 0, "o ramo de anexo continua gravando — só a vistoria saiu daqui");
  assert.ok(
    doAnexo.some((evento) => evento.metricKey === "checklist_attachment.uploaded.count"),
    "e grava a métrica de anexo que sempre gravou",
  );

  resetUsage();
});

test("R5 · a projeção diária é idempotente sob reentrega: agregar duas vezes não soma duas vezes", async () => {
  const { ChecklistService, InMemoryChecklistRepository, aggregateDay, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());
  const template = await publicarModelo(service, actor);
  const run = await service.createRun(actor, { checklistId: template.id, answers: [] });
  await service.completeRun(actor, run.id, { hasDivergence: false });

  const hoje = new Date();
  const primeira = await aggregateDay(hoje);
  const segunda = await aggregateDay(hoje);

  const quantidade = (rows: readonly { metricKey: string; quantity: number }[]) =>
    rows.find((row) => row.metricKey === "checklist_runs_count")?.quantity;

  assert.equal(quantidade(primeira), 1);
  assert.equal(quantidade(segunda), 1, "o upsert SOBRESCREVE a soma recomputada — nunca incrementa");

  resetUsage();
});

test("R6 · no dublê, reabrir também não cria unidade de criação", async () => {
  const { ChecklistService, InMemoryChecklistRepository, usageEvents, resetUsage } = await bootstrap();
  resetUsage();

  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());
  const template = await publicarModelo(service, actor);

  const original = await service.createRun(actor, { checklistId: template.id, answers: [] });
  await service.completeRun(actor, original.id, { hasDivergence: false });
  const reaberta = await service.reopenRun(actor, original.id, { reason: "Foto ilegível" });

  const daReaberta = (await usageEvents(actor.tenantId)).filter(
    (evento) => evento.sourceId === reaberta.run.run.id,
  );

  assert.equal(daReaberta.length, 0, "a versão reaberta nasce sem unidade faturável — igual ao Postgres");

  resetUsage();
});

test("A16 · o builder é TOTAL: nenhuma combinação de estado o faz lançar, e tudo que ele produz é válido", async () => {
  const { buildChecklistRunUsageEvents, validateCloudUsageInput } = await bootstrap();

  const tenantId = randomUUID();
  const agora = new Date();
  let produzidos = 0;

  // A propriedade que sustenta o FAIL-CLOSED: se a medição pudesse lançar para uma run válida, um
  // defeito no faturamento impediria o técnico de criar ou concluir vistoria. O builder é função pura
  // sobre campos da run, com chaves de lista fechada, `unit` constante e `quantity ∈ {0,1}`.
  for (const kind of ["created", "completed"] as const) {
    for (const completedAt of [undefined, agora]) {
      for (const reopenedFromRunId of [undefined, randomUUID()]) {
        for (const updatedAt of [undefined, agora]) {
          const entradas = buildChecklistRunUsageEvents(kind, {
            id: randomUUID(),
            tenantId,
            startedAt: agora,
            completedAt,
            updatedAt,
            reopenedFromRunId,
          });

          for (const entrada of entradas) {
            validateCloudUsageInput(entrada);
            assert.ok(entrada.occurredAt instanceof Date, "toda entrada carrega o instante do fato");
            assert.ok([0, 1].includes(entrada.quantity), "quantidade só pode ser 0 ou 1");
            assert.ok(String(entrada.idempotencyKey).startsWith("checklist_run:"), "chave derivada da run");
            produzidos += 1;
          }
        }
      }
    }
  }

  assert.equal(produzidos, 24, "16 combinações → 8 de criação (×2 chaves) + 8 de conclusão (×1 chave)");
});

// --- apoio -----------------------------------------------------------------------------------------

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

function envelope(tenantId: string, name: string, payload: Record<string, unknown>) {
  return {
    id: randomUUID(),
    name,
    payload,
    tenantId,
    actorId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date().toISOString(),
  };
}

async function bootstrap() {
  const [checklists, cloudUsage, cloudUsageCapture, cloudUsageEvents, repositorio] = await Promise.all([
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/cloud-usage/cloud-usage.service.js"),
    import("../src/modules/cloud-usage/cloud-usage.capture.js"),
    import("../src/modules/cloud-usage/cloud-usage.events.js"),
    import("../src/modules/checklists/checklist.repository.js"),
  ]);
  const drainUsage = cloudUsage.drainCloudUsageBestEffortForTests;

  return {
    ChecklistService: checklists.ChecklistService,
    InMemoryChecklistRepository: repositorio.InMemoryChecklistRepository,
    buildChecklistRunUsageEvents: cloudUsageCapture.buildChecklistRunUsageEvents,
    validateCloudUsageInput: cloudUsage.validateCloudUsageInput,
    recordCloudUsageForDomainEvent: cloudUsageEvents.recordCloudUsageForDomainEvent,
    drainUsage,
    resetUsage: cloudUsage.resetCloudUsageRuntimeForTests,
    aggregateDay: async (dia: Date) => {
      await drainUsage();
      return cloudUsage.createMemoryCloudUsageService().aggregateDailyUsage(dia);
    },
    usageEvents: async (tenantId: string, metricKey?: string) => {
      await drainUsage();
      const eventos = await cloudUsage.getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId });

      return metricKey ? eventos.filter((evento) => evento.metricKey === metricKey) : eventos;
    },
  };
}
