import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-26 (C26-08) — P-CHECKIN-1 como PROPRIEDADE, não censo de texto: uma OS só é gravada em `on_site` com um
// veredito de check-in emitido pelo servidor (`verifyCheckin`). Três camadas:
//   G1a — tipo: `src/modules/work-orders/work-order.checkin.typecheck.ts` (3 `@ts-expect-error`, cobrado pelo
//         `npm run check`, porque o `tsconfig.json` só inclui `src/**`);
//   G1b — tempo de execução no repositório em memória;
//   G1c — tempo de execução no repositório Prisma (cliente de mentira, sem banco).
// E o A9d: todo papel com `work_orders:status` está em exatamente uma das duas listas do check-in.
//
// VERMELHO-CONTROLE: G1b e G1c não importam `work-order.checkin.ts` (na base eles carregam e falham porque o
// repositório grava sem veredito); o A9d e o controle positivo importam o módulo novo dentro do próprio teste.

process.env.CORE_SAAS_PERSISTENCE = "memory";

const VEREDITO_FORJADO = Object.freeze({ mode: "office" });

async function osACaminho() {
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const repository = new InMemoryWorkOrderRepository();
  const tenantId = randomUUID();
  const os = await repository.create({
    tenantId,
    code: "OS-G1B",
    title: "OS do guard",
    priority: "medium",
    status: "on_route",
  } as never);
  return { repository, tenantId, os };
}

test("G1b — InMemory: on_site com veredito forjado à mão é recusado (checkin_verdict_required) e a OS não muda", async () => {
  const { repository, tenantId, os } = await osACaminho();
  await assert.rejects(
    () =>
      repository.changeStatus({
        tenantId,
        workOrderId: os.id,
        status: "on_site",
        message: "forjado",
        checkin: VEREDITO_FORJADO,
      } as never),
    (error: any) => error.reason === "checkin_verdict_required" && error.statusCode === 500,
  );
  assert.equal((await repository.findById(tenantId, os.id))?.status, "on_route");
});

test("G1b′ — InMemory: on_site sem veredito nenhum é recusado", async () => {
  const { repository, tenantId, os } = await osACaminho();
  await assert.rejects(
    () => repository.changeStatus({ tenantId, workOrderId: os.id, status: "on_site", message: "sem veredito" } as never),
    (error: any) => error.reason === "checkin_verdict_required",
  );
  assert.equal((await repository.findById(tenantId, os.id))?.status, "on_route");
});

test("G1c — Prisma (cliente de mentira): on_site sem veredito é recusado ANTES de tocar o banco", async () => {
  const { PrismaWorkOrderRepository } = await import("../src/modules/work-orders/work-order-prisma.repository.js");
  const chamadas: string[] = [];
  const stub = {
    workOrder: {
      updateManyAndReturn: async () => {
        chamadas.push("updateManyAndReturn");
        return [];
      },
    },
  };
  const repository = new PrismaWorkOrderRepository(stub as never);
  await assert.rejects(
    () =>
      repository.changeStatus({
        tenantId: randomUUID(),
        workOrderId: randomUUID(),
        status: "on_site",
        message: "forjado",
        checkin: VEREDITO_FORJADO,
      } as never),
    (error: any) => error.reason === "checkin_verdict_required",
  );
  assert.deepEqual(chamadas, [], "o repositório Prisma chegou ao banco sem veredito");
});

test("G1-controle — um veredito emitido por verifyCheckin passa nos dois repositórios; outro status não pede veredito", async () => {
  const { verifyCheckin } = await import("../src/modules/work-orders/work-order.checkin.js");
  const { repository, tenantId, os } = await osACaminho();
  const gestor = { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
  const veredito = verifyCheckin(gestor, { code: os.code, serviceDetails: undefined }, null, {}, "http_status_route");
  const feito = await repository.changeStatus({ tenantId, workOrderId: os.id, status: "on_site", message: "ok", checkin: veredito } as never);
  assert.equal(feito?.status, "on_site");
  const seguinte = await repository.changeStatus({ tenantId, workOrderId: os.id, status: "in_progress", message: "ok" } as never);
  assert.equal(seguinte?.status, "in_progress");

  const { PrismaWorkOrderRepository } = await import("../src/modules/work-orders/work-order-prisma.repository.js");
  const chamadas: string[] = [];
  const stub = { workOrder: { updateManyAndReturn: async () => (chamadas.push("updateManyAndReturn"), []) } };
  await new PrismaWorkOrderRepository(stub as never).changeStatus({ tenantId, workOrderId: os.id, status: "on_site", message: "ok", checkin: veredito } as never);
  assert.deepEqual(chamadas, ["updateManyAndReturn"]);
});

test("A9d — todo papel com work_orders:status está em EXATAMENTE uma lista do check-in; as listas não se cruzam", async () => {
  const { CHECKIN_OFFICE_ROLES, CHECKIN_FIELD_ROLES } = await import("../src/modules/work-orders/work-order.checkin.js");
  const { ROLE_PERMISSIONS } = await import("../src/modules/core-saas/permissions/catalog.js");
  const comStatus = Object.entries(ROLE_PERMISSIONS as Record<string, readonly string[]>)
    .filter(([, permissoes]) => permissoes.includes("work_orders:status"))
    .map(([papel]) => papel)
    .sort();
  assert.ok(comStatus.length >= 8, `universo suspeito: ${comStatus.join(",")}`);
  for (const papel of comStatus) {
    const emBase = (CHECKIN_OFFICE_ROLES as readonly string[]).includes(papel);
    const emCampo = (CHECKIN_FIELD_ROLES as readonly string[]).includes(papel);
    assert.equal(Number(emBase) + Number(emCampo), 1, `${papel}: base=${emBase} campo=${emCampo}`);
  }
  const cruzados = CHECKIN_OFFICE_ROLES.filter((papel) => CHECKIN_FIELD_ROLES.includes(papel));
  assert.deepEqual(cruzados, []);
});
