// B-SEC-LOG-SANITIZA (H4f, Emenda 1.1 §3 com a Emenda 1.2 §2) — o processo filho do H4f.
//
// Roda os dois casos de material do sync de estoque (`work_order_material.add` e `work_order_material.remove`) com um
// serviço falso que lança o P1001 da forma modelo, e imprime, por caso, uma linha `R ` com o JSON
// `{ caso, lancou, statusCode, code, reason, message }`. A `message` é a do erro lançado, INTEIRA: sem corte nenhum,
// porque o host e a porta ficam no fim do texto do P1001. O log do módulo sai no stdout deste processo, e o teste conta os
// sentinelas na saída inteira. Quem sobe este arquivo é `tests/sec-log-http.test.ts`, com o env sentinela.
import { randomUUID } from "node:crypto";

const sync = await import(new URL("../../src/modules/mobile/mobile-inventory-sync.ts", import.meta.url).href);

const tecnico = {
  tenantId: randomUUID(),
  userId: randomUUID(),
  roles: ["field_technician"],
  permissions: ["work_orders:update"],
  explicitPermissions: true,
};

const p1001 = () =>
  Object.assign(
    new Error(
      "\nInvalid `prisma.stockMovement.findFirst()` invocation in\n/srv/app/src/modules/inventory/inventory-prisma.repository.ts:131:9\n\nCan't reach database server at hstdb-sentinela:5439",
    ),
    {
      name: "PrismaClientKnownRequestError",
      code: "P1001",
      clientVersion: "7.8.0",
      meta: { driverAdapterError: { cause: { kind: "DatabaseNotReachable", host: "hstdb-sentinela", port: 5439 } } },
    },
  );

const lanca = () =>
  new Proxy(
    {},
    {
      get: () => async () => {
        throw p1001();
      },
    },
  );

const casos = [
  {
    client_action_id: randomUUID(),
    type: "work_order_material.add",
    local_created_at: "2026-11-12T12:00:00.000Z",
    payload: { work_order_id: randomUUID(), sku: "ELE-0102", quantity: 1 },
  },
  {
    client_action_id: randomUUID(),
    type: "work_order_material.remove",
    local_created_at: "2026-11-12T12:00:00.000Z",
    payload: { work_order_id: randomUUID(), source_client_action_id: randomUUID() },
  },
];

for (const action of casos) {
  try {
    const resultado = await sync.syncMobileInventoryActions(
      tecnico,
      { client_batch_id: randomUUID(), actions: [action] },
      { inventory: lanca(), workOrders: lanca(), workOrdersModuleEnabled: async () => true },
    );
    console.log(`R ${JSON.stringify({ caso: action.type, lancou: false, resultado })}`);
  } catch (error) {
    const e = error as { statusCode?: unknown; code?: unknown; reason?: unknown; message?: unknown };
    console.log(
      `R ${JSON.stringify({
        caso: action.type,
        lancou: true,
        statusCode: e.statusCode,
        code: e.code,
        reason: e.reason,
        message: String(e.message),
      })}`,
    );
  }
}

process.exit(0);
