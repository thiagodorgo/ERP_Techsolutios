import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// B-SAN3-16 (item 5 do portão) — o pedido de aprovação e o "não consegui iniciar" do app no PostgreSQL real.
//
// D1 · o evento fica em `work_order_events`, sob RLS, com o ator do token e a lista fechada nos metadados;
// D2 · reenvio com serviço NOVO e recibo do lote zerado (o reinício): continua 1 linha de cada tipo;
// D3 · drill de RLS (o padrão do B-O6R-06): pelo papel efêmero `NOSUPERUSER NOBYPASSRLS`, a organização B não vê o
//      evento nem o aviso da A; a A vê os dela (controle positivo);
// D4 · o aviso a quem atribuiu a OS: reenvio com recibo zerado deixa 1 linha em `notifications` (chave durável).
//
// O serviço roda por papéis efêmeros NOSUPERUSER/NOBYPASSRLS, conectados pela fábrica `createPrismaClient` (o fuso
// UTC do #554, sem `new PrismaPg(` neste arquivo, G3); o admin só semeia, observa e limpa. A fila de Aprovações fica em
// memória (é o item 67): aqui ela só precisa existir. Sem DATABASE_URL a suíte declara o pulo, e o guarda de zero pulos
// do job `backend-postgres` a pune.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-16 -db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  type Actor = {
    readonly tenantId: string;
    readonly userId: string;
    readonly roles: readonly string[];
    readonly permissions: readonly string[];
  };

  type Scenario = {
    readonly tenantId: string;
    readonly technicianId: string;
    readonly managerId: string;
    readonly workOrderId: string;
    readonly technician: Actor;
  };

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [pgConnection, workOrderRepository, workOrderModule, notificationRepository, notificationModule, approvalModule, syncModule, catalog] =
      await Promise.all([
        import("../src/database/pg-connection.js"),
        import("../src/modules/work-orders/work-order-prisma.repository.js"),
        import("../src/modules/work-orders/work-order.service.js"),
        import("../src/modules/notifications/notification-prisma.repository.js"),
        import("../src/modules/notifications/notification.service.js"),
        import("../src/modules/work-orders/approval.service.js"),
        import("../src/modules/mobile/mobile-work-order-sync.js"),
        import("../src/modules/core-saas/permissions/catalog.js"),
      ]);

    const admin = pgConnection.createPrismaClient(withApplicationName(connectionString!, buildApplicationName("bsan316-admin")));
    const roleA: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, buildApplicationName("bsan316-a")));
    const roleB: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, buildApplicationName("bsan316-b")));
    approvalModule.resetApprovalRuntimeForTests();

    // Um serviço NOVO a cada chamada: nada fica em memória entre um envio e o reenvio, além do que o banco guarda.
    const servicesFor = (role: EphemeralRole) => ({
      workOrders: new workOrderModule.WorkOrderService(new workOrderRepository.RlsPrismaWorkOrderRepository(role.client), {
        resolveActorOperatorProfileId: async () => undefined,
      }),
      notifications: new notificationModule.NotificationService(new notificationRepository.RlsPrismaNotificationRepository(role.client)),
      approvals: approvalModule.createMemoryApprovalService(),
    });

    return {
      admin,
      roleA,
      roleB,
      servicesFor,
      sync: syncModule.syncMobileWorkOrderActions as unknown as (...args: unknown[]) => Promise<any>,
      resetSync: syncModule.resetMobileWorkOrderSyncRuntimeForTests,
      technicianPermissions: catalog.resolvePermissionsForRoles(["field_technician"]),
      WorkOrderRepository: workOrderRepository.RlsPrismaWorkOrderRepository,
      tenants: [] as string[],
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await teardown(h);
    } finally {
      await h.roleA.drop();
      await h.roleB.drop();
      await h.admin.$disconnect();
    }
  });

  async function assertRuntimeRole(role: EphemeralRole): Promise<void> {
    const rows = await role.client.$queryRaw<Array<{ super: boolean; bypass: boolean }>>`
      SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user
    `;
    assert.deepEqual(rows[0], { super: false, bypass: false });
  }

  async function scenario(h: Harness, tag: string): Promise<Scenario> {
    const tenantId = randomUUID();
    const technicianId = randomUUID();
    const managerId = randomUUID();
    const workOrderId = randomUUID();
    const slug = `bsan316-${tag}-${randomUUID().slice(0, 8)}`;

    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenants (id, name, slug, modules) VALUES ($1::uuid, $2, $2, ARRAY['work_orders']::text[])`,
      tenantId,
      slug,
    );
    h.tenants.push(tenantId);
    for (const [id, nome] of [[technicianId, "Técnico"], [managerId, "Gestor"]] as const) {
      await h.admin.$executeRawUnsafe(
        `INSERT INTO users (id, tenant_id, name, email) VALUES ($1::uuid, $2::uuid, $3, $4)`,
        id,
        tenantId,
        `${nome} ${tag}`,
        `${slug}-${id.slice(0, 8)}@example.test`,
      );
    }
    await h.admin.$executeRawUnsafe(
      `INSERT INTO work_orders
         (id, tenant_id, code, title, status, assigned_operator_id, assigned_user_id, created_by, updated_by)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'assigned', $5::uuid, $5::uuid, $6::uuid, $6::uuid)`,
      workOrderId,
      tenantId,
      `S16-${randomUUID().slice(0, 8)}`,
      `OS ${tag}`,
      technicianId,
      managerId,
    );
    // Quem atribuiu a OS: o gestor (o destinatário do aviso do "não iniciou").
    await h.admin.$executeRawUnsafe(
      `INSERT INTO work_order_events (tenant_id, work_order_id, event_type, to_status, actor_user_id, message, metadata)
       VALUES ($1::uuid, $2::uuid, 'work_order_assigned', 'assigned', $3::uuid, 'Ordem de servico atribuida.', '{}'::jsonb)`,
      tenantId,
      workOrderId,
      managerId,
    );

    return {
      tenantId,
      technicianId,
      managerId,
      workOrderId,
      technician: { tenantId, userId: technicianId, roles: ["field_technician"], permissions: h.technicianPermissions },
    };
  }

  function batch(s: Scenario, type: string, clientActionId: string) {
    const payload =
      type === "work_order.approval_request"
        ? {
            work_order_id: s.workOrderId,
            reason: "Troca de peça fora do orçamento",
            impact: "Atraso de dois dias.",
            urgency: "normal",
            metadata: { source: "mobile_offline", local_id: "wo-local-d", requested_at: "2026-11-14T15:00:00.000Z" },
          }
        : {
            work_order_id: s.workOrderId,
            reason: "Endereco nao localizado",
            note: "Rua sem número.",
            metadata: { source: "mobile_offline", local_id: "wo-local-d", occurred_at: "2026-11-14T15:05:00.000Z" },
          };
    return {
      client_batch_id: randomUUID(),
      actions: [{ client_action_id: clientActionId, type, local_created_at: "2026-11-14T15:00:00.000Z", payload }],
    };
  }

  async function run(h: Harness, role: EphemeralRole, s: Scenario, type: string, clientActionId: string) {
    const services = h.servicesFor(role);
    return h.sync(s.technician, batch(s, type, clientActionId), async () => services.workOrders, {
      approvals: async () => services.approvals,
      notifications: async () => services.notifications,
    });
  }

  async function eventRows(h: Harness, s: Scenario, eventType: string) {
    return h.admin.$queryRawUnsafe<Array<{ id: string; actor: string | null; message: string; metadata: Record<string, unknown> }>>(
      `SELECT id::text, actor_user_id::text AS actor, message, metadata
         FROM work_order_events
        WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3`,
      s.tenantId,
      s.workOrderId,
      eventType,
    );
  }

  async function noticeRows(h: Harness, s: Scenario) {
    return h.admin.$queryRawUnsafe<Array<{ id: string; recipient: string; message: string }>>(
      `SELECT id::text, recipient_user_id::text AS recipient, message
         FROM notifications
        WHERE tenant_id = $1::uuid AND type = 'work_order.unable_to_start' AND source_id = $2`,
      s.tenantId,
      s.workOrderId,
    );
  }

  async function teardown(h: Harness): Promise<void> {
    for (const tenantId of [...h.tenants].reverse()) {
      await h.admin.$executeRawUnsafe(`DELETE FROM notifications WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM work_order_events WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM work_order_assignments WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
    }
  }

  test("[D1] o pedido e o \"não iniciou\" ficam em work_order_events sob RLS, com o ator do token e a lista fechada", async () => {
    const h = await harness();
    await Promise.all([assertRuntimeRole(h.roleA), assertRuntimeRole(h.roleB)]);
    const s = await scenario(h, "d1");

    const pedido = await run(h, h.roleA, s, "work_order.approval_request", randomUUID());
    assert.equal(pedido.accepted.length, 1, JSON.stringify(pedido));
    const naoIniciou = await run(h, h.roleA, s, "work_order.unable_to_start", randomUUID());
    assert.equal(naoIniciou.accepted.length, 1, JSON.stringify(naoIniciou));

    const [doPedido] = await eventRows(h, s, "work_order_approval_requested");
    assert.ok(doPedido, "o pedido está no banco");
    assert.equal(doPedido.actor, s.technicianId);
    assert.equal(doPedido.message, "Aprovação solicitada pelo técnico: Troca de peça fora do orçamento");
    assert.deepEqual(Object.keys(doPedido.metadata).sort(), ["approval_id", "client_action_id", "impact", "requested_at", "source", "urgency"]);
    const [doNaoIniciou] = await eventRows(h, s, "work_order_unable_to_start");
    assert.ok(doNaoIniciou, "o \"não iniciou\" está no banco");
    assert.equal(doNaoIniciou.metadata.reason, "Endereço não localizado");
    assert.deepEqual(Object.keys(doNaoIniciou.metadata).sort(), ["client_action_id", "note", "occurred_at", "reason", "source"]);
  });

  test("[D2] reenvio com serviço novo e recibo do lote zerado (o reinício): continua 1 linha de cada tipo", async () => {
    const h = await harness();
    const s = await scenario(h, "d2");
    const cidPedido = randomUUID();
    const cidNaoIniciou = randomUUID();

    assert.equal((await run(h, h.roleA, s, "work_order.approval_request", cidPedido)).accepted.length, 1);
    assert.equal((await run(h, h.roleA, s, "work_order.unable_to_start", cidNaoIniciou)).accepted.length, 1);
    h.resetSync();
    const denovoPedido = await run(h, h.roleB, s, "work_order.approval_request", cidPedido);
    assert.equal(denovoPedido.accepted.length, 1, JSON.stringify(denovoPedido));
    const denovoNaoIniciou = await run(h, h.roleB, s, "work_order.unable_to_start", cidNaoIniciou);
    assert.equal(denovoNaoIniciou.accepted.length, 1, JSON.stringify(denovoNaoIniciou));

    assert.equal((await eventRows(h, s, "work_order_approval_requested")).length, 1, "o pedido duplicou no banco");
    assert.equal((await eventRows(h, s, "work_order_unable_to_start")).length, 1, "o \"não iniciou\" duplicou no banco");
  });

  test("[D3] drill de RLS: pelo papel NOSUPERUSER NOBYPASSRLS, a organização B não vê o evento nem o aviso da A", async () => {
    const h = await harness();
    await assertRuntimeRole(h.roleB);
    const a = await scenario(h, "d3a");
    const b = await scenario(h, "d3b");
    assert.equal((await run(h, h.roleA, a, "work_order.unable_to_start", randomUUID())).accepted.length, 1);
    const [evento] = await eventRows(h, a, "work_order_unable_to_start");
    const [aviso] = await noticeRows(h, a);
    assert.ok(evento && aviso, "a semente da organização A gravou o evento e o aviso");

    const { withTenantRls } = await import("../src/database/rls.js");
    const enxerga = (tenantId: string) =>
      withTenantRls(h.roleB.client as never, tenantId, async (tx: any) => {
        const eventos = await tx.$queryRawUnsafe(`SELECT id FROM work_order_events WHERE id = $1::uuid`, evento.id);
        const avisos = await tx.$queryRawUnsafe(`SELECT id FROM notifications WHERE id = $1::uuid`, aviso.id);
        return { eventos: (eventos as unknown[]).length, avisos: (avisos as unknown[]).length };
      });

    assert.deepEqual(await enxerga(b.tenantId), { eventos: 0, avisos: 0 }, "a organização B enxergou o registro da A");
    assert.deepEqual(await enxerga(a.tenantId), { eventos: 1, avisos: 1 }, "controle: a organização A vê o que é dela");
    // Pelo caminho do produto: o repositório da linha do tempo, na organização B, não devolve o evento da OS da A.
    const repositorioDeB = new h.WorkOrderRepository(h.roleB.client);
    assert.deepEqual(await repositorioDeB.listTimeline(b.tenantId, a.workOrderId), []);
    assert.equal((await new h.WorkOrderRepository(h.roleB.client).listTimeline(a.tenantId, a.workOrderId)).length >= 2, true);
  });

  test("[D4] o aviso a quem atribuiu a OS, no banco: reenvio com recibo zerado deixa 1 linha", async () => {
    const h = await harness();
    const s = await scenario(h, "d4");
    const cid = randomUUID();
    assert.equal((await run(h, h.roleA, s, "work_order.unable_to_start", cid)).accepted.length, 1);
    h.resetSync();
    assert.equal((await run(h, h.roleB, s, "work_order.unable_to_start", cid)).accepted.length, 1);

    const avisos = await noticeRows(h, s);
    assert.equal(avisos.length, 1, "o aviso duplicou no banco");
    assert.equal(avisos[0].recipient, s.managerId, "o aviso vai para quem atribuiu a OS");
    assert.match(avisos[0].message, /: Endereço não localizado\.$/);
  });
}
