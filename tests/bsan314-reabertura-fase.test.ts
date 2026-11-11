import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-14 (R-A3) — A VISTORIA REABERTA HERDA A FASE DA ANTERIOR (repositório em memória).
//
// A reabertura cria uma versão NOVA da mesma vistoria. Antes deste bloco ela nascia sem fase: a entrega reaberta
// voltava como "vistoria sem fase", que o app lê como coleta. Com a entrega passando a nascer no despacho, isso
// trocaria a fase de uma prova. O mesmo caso no Prisma está em `tests/bsan314-provisao-entrega-db.test.ts` (T3).
//
// Em memória: as linhas abaixo rodam ANTES de qualquer módulo de src (o `env` é congelado no 1º import).
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

async function montar() {
  const { ChecklistService, InMemoryChecklistRepository } = await import("../src/modules/checklists/index.js");
  const actor = { tenantId: randomUUID(), userId: randomUUID() };
  const service = new ChecklistService(new InMemoryChecklistRepository());
  const template = await service.createTemplate(actor, {
    name: "Vistoria do Veículo",
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
  return { service, actor, templateId: template.id };
}

test("reabrir a entrega concluída gera versão com role delivery", async () => {
  const { service, actor, templateId } = await montar();
  const entrega = await service.createRun(actor, {
    checklistId: templateId,
    relatedEntityType: "work_order",
    relatedEntityId: randomUUID(),
    role: "delivery",
    answers: [],
  });
  await service.completeRun(actor, entrega.id, { hasDivergence: false });

  const reaberta = await service.reopenRun(actor, entrega.id, { reason: "Foto do para-choque saiu ilegível" });

  assert.equal(reaberta.run.run.role, "delivery", "a versão reaberta da entrega perdeu a fase");
  assert.equal(reaberta.run.run.reopenedFromRunId, entrega.id);
  // A lista que o app lê (sem filtro de fase) mostra as duas versões com a mesma fase.
  const lista = await service.listRunsForWorkOrder(actor, entrega.relatedEntityId, undefined, { roleAware: true });
  assert.deepEqual(
    lista.map((run) => run.role).sort(),
    ["delivery", "delivery"],
  );
});

test("reabrir a coleta mantém a coleta, e a vistoria sem fase (legada) continua sem fase", async () => {
  const { service, actor, templateId } = await montar();
  const coleta = await service.createRun(actor, { checklistId: templateId, role: "collection", answers: [] });
  await service.completeRun(actor, coleta.id, { hasDivergence: false });
  const coletaReaberta = await service.reopenRun(actor, coleta.id, { reason: "Faltou a foto da placa" });
  assert.equal(coletaReaberta.run.run.role, "collection");

  // Legado: a vistoria anterior à fase NÃO ganha fase inventada na reabertura (D-007).
  const legada = await service.createRun(actor, { checklistId: templateId, answers: [] });
  await service.completeRun(actor, legada.id, { hasDivergence: false });
  const legadaReaberta = await service.reopenRun(actor, legada.id, { reason: "Assinatura borrada" });
  assert.equal(legadaReaberta.run.run.role, undefined);
});
