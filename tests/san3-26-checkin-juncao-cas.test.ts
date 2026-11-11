import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-SAN3-26 × B-SAN3-23 — a JUNÇÃO no `changeStatus` (Emenda 3 do plano v2 do B-SAN3-26). Em memória.
//
// O #536 trocou a escrita de situação por um CAS: se casar 0, o serviço relê a OS, revalida a operação e regrava uma
// vez. O #534 exige, para `on_site`, um veredito de check-in emitido por `verifyCheckin`. Juntas, as duas propriedades
// pedem que o veredito seja RECALCULADO sobre a OS relida, antes da regravação.
//
//   T-JUNCAO   — um cancelamento entra entre a leitura e a escrita de um "No local" com veredito: 409, OS cancelada,
//                0 `on_site`;
//   T-JUNCAO-b — a base troca (ou tira) a placa e marca o "No local" entre a leitura e a escrita do técnico: a releitura
//                recalcula o veredito e recusa (422), sem regravação nem evento;
//   T-JUNCAO-c — a frase reservada da base também é descartada na mensagem da regravação.
//
// A barreira é determinística (nunca relógio): um Proxy sobre o repositório de memória roda o gancho ANTES da 1ª
// escrita de situação do serviço sob teste, o mesmo padrão do `tests/b-san3-23-cas-retentativa.test.ts`.
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = "memory";

import { resetWorkOrderFinancialRuntimeForTests } from "../src/modules/work-order-financials/work-order-financial.service.js";
import { verifyCheckin } from "../src/modules/work-orders/work-order.checkin.js";
import type { WorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import {
  createMemoryWorkOrderService,
  getMemoryWorkOrderRepositoryForTests,
  resetWorkOrderRuntimeForTests,
  WorkOrderService,
} from "../src/modules/work-orders/work-order.service.js";
import type { WorkOrderActorContext, WorkOrderStatus } from "../src/modules/work-orders/work-order.types.js";

const PLACA = "ABC1D23";
const MARCA_FORJADA = "Chegada ao local registrada pela base.";

function ator(tenantId: string, roles: string[]): WorkOrderActorContext {
  return { tenantId, userId: randomUUID(), roles, permissions: [] } as unknown as WorkOrderActorContext;
}

function setup() {
  resetWorkOrderRuntimeForTests();
  resetWorkOrderFinancialRuntimeForTests();
  const tenantId = randomUUID();
  return {
    tenantId,
    gestor: ator(tenantId, ["manager"]),
    tecnico: ator(tenantId, ["field_technician"]),
    repo: getMemoryWorkOrderRepositoryForTests(),
    workOrders: createMemoryWorkOrderService(),
  };
}

type Ctx = ReturnType<typeof setup>;

/** O serviço REAL sobre um Proxy do repositório: `antes` roda uma vez, antes da 1ª escrita de situação. */
function servicoComBarreira(ctx: Ctx, antes: () => Promise<void>) {
  let escritas = 0;
  let gancho: (() => Promise<void>) | undefined = antes;
  const proxy = new Proxy(ctx.repo, {
    get(target, property, receiver) {
      const member = Reflect.get(target, property, receiver);
      if (property === "changeStatus") {
        return async (input: unknown) => {
          escritas += 1;
          const agora = gancho;
          gancho = undefined;
          if (agora) await agora();
          return (member as (i: unknown) => Promise<unknown>).call(target, input);
        };
      }
      return typeof member === "function" ? member.bind(target) : member;
    },
  }) as WorkOrderRepository;
  const service = new WorkOrderService(proxy, { hasActiveDispatchAtSite: async () => false });
  return { service, escritas: () => escritas };
}

/** A OS com placa, despachada ao técnico e levada a `on_route` pelo arnês, direto no repositório. */
async function osACaminho(ctx: Ctx): Promise<string> {
  const os = await ctx.workOrders.create(ctx.gestor, { title: "OS da junção", service_details: { plate: PLACA } });
  const atual = await ctx.repo.findById(ctx.tenantId, os.id);
  assert.ok(atual);
  const despacho = await ctx.repo.assignFromDispatch({
    tenantId: ctx.tenantId,
    workOrderId: os.id,
    operatorId: ctx.tecnico.userId,
    userId: ctx.tecnico.userId,
    assignedBy: ctx.gestor.userId,
    dispatchId: randomUUID(),
    source: "field_dispatch",
    message: "Despacho do arnês.",
    event: { fromStatus: atual.status, actorUserId: ctx.gestor.userId, message: "Despacho do arnês.", metadata: {} },
  });
  assert.ok(despacho);
  for (const status of ["accepted", "on_route"] as const) await situacaoDoArnes(ctx, os.id, status);
  return os.id;
}

/** O arnês muda a situação direto no repositório; `on_site` vai pela porta da base (veredito `office`). */
async function situacaoDoArnes(ctx: Ctx, workOrderId: string, status: WorkOrderStatus): Promise<void> {
  const atual = await ctx.repo.findById(ctx.tenantId, workOrderId);
  assert.ok(atual);
  const feito = await ctx.repo.changeStatus({
    tenantId: ctx.tenantId,
    workOrderId,
    status,
    expectedStatus: atual.status,
    message: "Situação do arnês.",
    actorUserId: ctx.gestor.userId,
    ...(status === "on_site" ? { checkin: verifyCheckin(ctx.gestor, atual, null, {}, "http_status_route") } : {}),
  } as never);
  assert.ok(feito, `o arnês levou a OS a ${status}`);
}

async function recusa(promessa: Promise<unknown>): Promise<{ statusCode?: number; reason?: string }> {
  try {
    await promessa;
  } catch (error) {
    return error as { statusCode?: number; reason?: string };
  }
  assert.fail("era para recusar e passou");
}

async function eventosDoTecnico(ctx: Ctx, workOrderId: string) {
  return (await ctx.repo.listTimeline(ctx.tenantId, workOrderId)).filter((evento) => evento.actorUserId === ctx.tecnico.userId);
}

test("T-JUNCAO — cancelar entra entre a leitura e a escrita de um 'No local' COM veredito: 409, OS cancelada, 0 on_site", async () => {
  const ctx = setup();
  const id = await osACaminho(ctx);
  const { service, escritas } = servicoComBarreira(ctx, async () => {
    await ctx.workOrders.cancel(ctx.gestor, id, { reason: "cliente desistiu", financial_decision: "keep" });
  });

  const erro = await recusa(
    service.changeStatus(ctx.tecnico, id, { status: "on_site", checkin_confirmation: { last_digits: "23" } }, { entry: "mobile_sync" }),
  );
  assert.equal(erro.statusCode, 409, JSON.stringify(erro));
  assert.equal(erro.reason, "invalid_status_transition");

  const os = await ctx.repo.findById(ctx.tenantId, id);
  assert.equal(os?.status, "cancelled", "o cancelamento foi sobrescrito");
  assert.equal(os?.arrivedAt, undefined, "a OS cancelada ganhou chegada");
  const linha = await ctx.repo.listTimeline(ctx.tenantId, id);
  assert.equal(linha.filter((evento) => evento.toStatus === "on_site").length, 0, "há 'No local' na OS cancelada");
  assert.equal(escritas(), 1, "houve regravação sobre a OS cancelada");
});

test("T-JUNCAO-b — a base troca (ou tira) a placa e marca o 'No local' no meio: a releitura RECALCULA o veredito e recusa, nada é gravado", async () => {
  const casos: Array<{ nome: string; placa: Record<string, unknown>; motivo: string }> = [
    { nome: "placa trocada", placa: { plate: "XYZ9A99" }, motivo: "checkin_confirmation_mismatch" },
    { nome: "placa retirada", placa: { plate: "" }, motivo: "checkin_reference_missing" },
  ];
  for (const caso of casos) {
    const ctx = setup();
    const id = await osACaminho(ctx);
    const { service, escritas } = servicoComBarreira(ctx, async () => {
      const feito = await ctx.repo.update({ tenantId: ctx.tenantId, workOrderId: id, serviceDetails: caso.placa });
      assert.ok(feito);
      await situacaoDoArnes(ctx, id, "on_site");
    });

    // Os dígitos certos para a placa que o técnico leu ("23"): o 1º veredito fecha, o CAS casa 0 (a base marcou).
    const erro = await recusa(
      service.changeStatus(ctx.tecnico, id, { status: "on_site", checkin_confirmation: { last_digits: "23" } }, { entry: "mobile_sync" }),
    );
    assert.equal(erro.statusCode, 422, `${caso.nome}: ${JSON.stringify(erro)}`);
    assert.equal(erro.reason, caso.motivo, caso.nome);

    assert.equal(escritas(), 1, `${caso.nome}: houve regravação com o veredito velho`);
    assert.deepEqual(await eventosDoTecnico(ctx, id), [], `${caso.nome}: o técnico gravou evento`);
    const depois = await ctx.repo.findById(ctx.tenantId, id);
    assert.equal(depois?.status, "on_site", caso.nome);
    assert.notEqual(depois?.updatedBy, ctx.tecnico.userId, `${caso.nome}: a OS foi gravada em nome do técnico`);
  }
});

test("T-JUNCAO-c — a frase reservada da base também cai na mensagem da regravação", async () => {
  const ctx = setup();
  // A OS fica em `accepted`, e a corrida a leva a `on_route`: o CAS do técnico casa 0, a releitura (`on_route`)
  // aceita `on_route → on_route`, e a regravação acontece.
  const os = await ctx.workOrders.create(ctx.gestor, { title: "OS da frase", service_details: { plate: PLACA } });
  const atual = await ctx.repo.findById(ctx.tenantId, os.id);
  assert.ok(atual);
  await ctx.repo.assignFromDispatch({
    tenantId: ctx.tenantId,
    workOrderId: os.id,
    operatorId: ctx.tecnico.userId,
    userId: ctx.tecnico.userId,
    assignedBy: ctx.gestor.userId,
    dispatchId: randomUUID(),
    source: "field_dispatch",
    message: "Despacho do arnês.",
    event: { fromStatus: atual.status, actorUserId: ctx.gestor.userId, message: "Despacho do arnês.", metadata: {} },
  });
  await situacaoDoArnes(ctx, os.id, "accepted");
  const { service, escritas } = servicoComBarreira(ctx, async () => situacaoDoArnes(ctx, os.id, "on_route"));

  await service.changeStatus(ctx.tecnico, os.id, { status: "on_route", message: MARCA_FORJADA });
  assert.equal(escritas(), 2, "a regravação não aconteceu (o teste não exercitou a releitura)");
  const doTecnico = await eventosDoTecnico(ctx, os.id);
  assert.equal(doTecnico.length, 1);
  assert.doesNotMatch(String(doTecnico[0]?.message), /registrad[ao] pela base/i, "a marca da base foi forjada na regravação");
});
