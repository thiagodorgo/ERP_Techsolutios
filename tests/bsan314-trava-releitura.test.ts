import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-14, Emenda 3 (E3.1) — A TRAVA DA ENTREGA TAMBÉM NA RELEITURA DO CAS.
//
// Depois que o CAS de situação casa 0, o `changeStatus` relê a OS e refaz "a revalidação da entrada do próprio método,
// na mesma ordem, sobre a situação relida" (o contrato do B-SAN3-23). Com a junção, a entrada ganhou a trava R-A4
// (vistoria de entrega em aberto não conclui); a releitura também a refaz, antes do veredito do check-in.
//
// O cenário: a 1ª leitura vê a OS "Em atendimento" SEM entrega aberta, e a trava da entrada passa. Entre a leitura e a
// escrita, outro ator pausa a OS (o CAS casa 0 de verdade), retoma o atendimento e abre uma vistoria de entrega
// `in_progress`. A releitura vê `in_progress` de novo (a transição para "Concluída" continua válida), mas agora com a
// entrega aberta: recusa com `delivery_checklist_pending`, e a OS não fica `completed`.
//
// O gancho é o do `tests/b-san3-23-cas-retentativa.test.ts`: um Proxy sobre o repositório de memória que roda ANTES da
// n-ésima chamada do escritor, de forma determinística (nunca relógio). Aqui ele também roda DEPOIS da 1ª chamada,
// porque a OS precisa voltar a `in_progress` entre a escrita que casou 0 e a releitura.
//
// Em memória: as linhas abaixo rodam ANTES de qualquer módulo de src (o `env` é congelado no 1º import).
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

const LOOP_GUARD = 5;

type Hook = () => Promise<void>;

async function montar() {
  const [workOrders, checklists, { resolvePermissionsForRoles }, { verifyCheckin }] = await Promise.all([
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.checkin.js"),
  ]);
  workOrders.resetWorkOrderRuntimeForTests();
  checklists.resetChecklistRuntimeForTests();

  const tenantId = randomUUID();
  const userId = randomUUID();
  const gestao = {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: resolvePermissionsForRoles(["manager"]),
    explicitPermissions: true,
  };
  const repo = workOrders.getMemoryWorkOrderRepositoryForTests();
  const memoryService = workOrders.createMemoryWorkOrderService();
  // A composição de produção: a porta `listChecklistRunPhases` lê as vistorias de verdade do módulo de checklists.
  const references = Reflect.get(memoryService, "references") as ConstructorParameters<typeof workOrders.WorkOrderService>[1];
  assert.ok(references?.listChecklistRunPhases, "a composição de produção perdeu a porta das vistorias");

  const checklistService = checklists.createMemoryChecklistService();
  const atorChecklist = { tenantId, userId };
  const template = await checklistService.createTemplate(atorChecklist, {
    name: "Vistoria do Veículo",
    type: "towing_collection",
    schema: {},
    components: [
      { type: "observation", label: "Observações do guincheiro", required: false, config: {}, validationRules: {}, visibilityRules: {} },
    ],
  });
  await checklistService.publishTemplate(atorChecklist, template.id);

  /** O arnês muda a situação direto no repositório; `on_site` vai pela porta da base (veredito `office`). */
  const situacaoDoArnes = async (workOrderId: string, status: string): Promise<void> => {
    const atual = await repo.findById(tenantId, workOrderId);
    assert.ok(atual);
    const feito = await repo.changeStatus({
      tenantId,
      workOrderId,
      status,
      expectedStatus: atual.status,
      actorUserId: userId,
      message: "Situação do arnês.",
      ...(status === "on_site" ? { checkin: verifyCheckin(gestao, atual, null, {}, "http_status_route") } : {}),
    } as never);
    assert.ok(feito, `o arnês levou a OS a ${status}`);
  };

  const criarOsEmAtendimento = async (): Promise<string> => {
    const os = await memoryService.create(gestao as never, { title: "Reboque leve" });
    for (const status of ["assigned", "accepted", "on_route", "on_site", "in_progress"]) await situacaoDoArnes(os.id, status);
    return os.id;
  };

  const abrirEntrega = (workOrderId: string) =>
    checklistService.createRun(atorChecklist, {
      checklistId: template.id,
      clientRunKey: `dispatch:${workOrderId}:${template.id}:delivery`,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      role: "delivery",
      answers: [],
    });

  /** O serviço REAL sobre um Proxy do repositório: `before[n]`/`after[n]` rodam em volta da n-ésima `changeStatus`. */
  const servicoComGancho = (hooks: { before?: Record<number, Hook>; after?: Record<number, Hook> }) => {
    const counts = { changeStatus: 0 };
    const proxy = new Proxy(repo, {
      get(target, property, receiver) {
        const member = Reflect.get(target, property, receiver);
        if (property === "changeStatus") {
          return async (input: unknown) => {
            counts.changeStatus += 1;
            const n = counts.changeStatus;
            if (n > LOOP_GUARD) throw new Error(`laço: changeStatus chamado ${n} vezes`);
            await hooks.before?.[n]?.();
            const result = await (member as (i: unknown) => Promise<unknown>).call(target, input);
            await hooks.after?.[n]?.();
            return result;
          };
        }
        return typeof member === "function" ? member.bind(target) : member;
      },
    }) as typeof repo;
    return { service: new workOrders.WorkOrderService(proxy, references), counts };
  };

  return { repo, tenantId, gestao, criarOsEmAtendimento, abrirEntrega, situacaoDoArnes, servicoComGancho };
}

test("[E3.1] a entrega abre entre a leitura e a escrita (o CAS casa 0): a releitura recusa com delivery_checklist_pending e a OS não fica completed", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  let casouZero: boolean | undefined;
  const { service, counts } = c.servicoComGancho({
    // Outro ator pausa a OS: a 1ª escrita (CAS sobre `in_progress`) casa 0.
    before: { 1: async () => c.situacaoDoArnes(os, "paused") },
    // Ainda antes da releitura: retoma o atendimento e abre a vistoria de entrega.
    after: {
      1: async () => {
        casouZero = (await c.repo.findById(c.tenantId, os))?.status === "paused";
        await c.situacaoDoArnes(os, "in_progress");
        await c.abrirEntrega(os);
      },
    },
  });

  await assert.rejects(service.changeStatus(c.gestao as never, os, { status: "completed" }), (error: unknown) => {
    const e = error as { statusCode?: number; code?: string; reason?: string; message?: string };
    assert.equal(e.statusCode, 422);
    assert.equal(e.code, "WORK_ORDER_UNPROCESSABLE");
    assert.equal(e.reason, "delivery_checklist_pending");
    assert.equal(e.message, "Conclua a vistoria de entrega antes de concluir a OS.");
    return true;
  });

  assert.equal(casouZero, true, "a 1ª escrita não casou 0 (o cenário não chegou à releitura)");
  assert.equal(counts.changeStatus, 1, "houve regravação: a trava não foi avaliada na releitura");
  const depois = await c.repo.findById(c.tenantId, os);
  assert.equal(depois?.status, "in_progress", "a OS mudou de status");
  const linha = await c.repo.listTimeline(c.tenantId, os);
  assert.equal(linha.filter((evento) => evento.toStatus === "completed").length, 0, "há evento de conclusão");
});
