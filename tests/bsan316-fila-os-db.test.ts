import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedOrSettled,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// B-SAN3-16 (item 5 do portão) — o pedido de aprovação e o "não consegui iniciar" do app no PostgreSQL real.
//
// D1 · o evento fica em `work_order_events`, sob RLS, com o ator do token e a lista fechada nos metadados;
// D2 · reenvio com serviço NOVO e recibo do lote zerado (o reinício): continua 1 linha de cada tipo;
// D3 · drill de RLS (o padrão do B-O6R-06): pelo papel efêmero `NOSUPERUSER NOBYPASSRLS`, a organização B não vê o
//      evento nem o aviso da A; a A vê os dela (controle positivo);
// D4 · o aviso a quem atribuiu a OS: reenvio com recibo zerado deixa 1 linha em `notifications` (chave durável).
//
// O serviço roda por papéis efêmeros NOSUPERUSER/NOBYPASSRLS, conectados pela fábrica `createPrismaClient` (o fuso
// UTC do #554: nenhum construtor do adaptador escrito neste arquivo, catraca G3); o admin só semeia, observa e limpa. A fila de Aprovações fica em
// memória (é o item 67): aqui ela só precisa existir. Sem DATABASE_URL a suíte declara o pulo, e o guarda de zero pulos
// do job `backend-postgres` a pune.

const connectionString = process.env.DATABASE_URL;
// Emenda 1.3.1 (E13-02) — a barreira da rajada conta só as sessões deste papel (o `application_name` da suíte).
const CONCURRENT_APPLICATION_NAME = buildApplicationName("bsan316-c");

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
    // Emenda 1.3.1 (E13-02) — o papel da rajada: os 11 envios simultâneos ficam, cada um, numa transação da unidade ao
    // mesmo tempo; o pool padrão (10) seguraria o 11º fora do banco, e a barreira nunca contaria N.
    const roleC: EphemeralRole = await createEphemeralRole(
      admin,
      withApplicationName(connectionString!, CONCURRENT_APPLICATION_NAME),
      (url) => pgConnection.createPrismaClient(url, { max: 16 }),
    );
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
      roleC,
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
      await h.roleC.drop();
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
    // O aviso grava o consumo em segundo plano (`recordCloudUsageBestEffort`): espera as gravações em voo antes de
    // apagar a organização, ou a FK de `cloud_usage_events` segura o DELETE de `tenants`.
    const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
    await drainCloudUsageBestEffortForTests();
    for (const tenantId of [...h.tenants].reverse()) {
      await h.admin.$executeRawUnsafe(`DELETE FROM cloud_usage_events WHERE tenant_id = $1::uuid`, tenantId);
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

  // ------------------------------------------------------------------------------------------------------------------
  // Emendas 1.3 e 1.3.1 (DUP-580-CONCORRENTE) — a unidade do pedido de campo: a leitura do dedupe e a gravação do evento
  // na MESMA transação, sob a trava exclusiva da linha da OS (`SELECT … FOR UPDATE`, o idioma do B-SAN3-23).
  //
  // Arnês (o de `b-san3-23-cancel-race-db.test.ts`): um SEGURADOR, SQL próprio do admin numa transação aberta, toma a
  // trava da OS e espera um portão. Os envios são o lote real do app, pelo papel `NOSUPERUSER NOBYPASSRLS` da rajada. A
  // barreira é `waitForOwnBlockedOrSettled` com `minBlocked`: espera TODOS os envios bloqueados (≥ N−1, E13-02), contando
  // só as sessões da própria suíte (`application_name`), ou todos resolvidos, o que vier primeiro; nunca relógio (o prazo
  // só transforma espera sem fim em falha com diagnóstico). Sem filtro de texto de propósito: sem a trava na unidade, os
  // envios esperam o segurador na chave estrangeira do INSERT do evento, e o vermelho sai da CONTAGEM de eventos, não de
  // um timeout da barreira. Com a trava, a barreira também tem de ter visto o `FOR UPDATE` (conferido depois da contagem).
  // ------------------------------------------------------------------------------------------------------------------

  const RODADAS = 5;
  const ENVIOS_IGUAIS = 10;

  type Holder = { readonly pid: number; readonly release: () => void; readonly done: Promise<SettledOutcome<unknown>> };

  async function holdWorkOrder(h: Harness, s: Scenario, held?: (tx: any) => Promise<unknown>): Promise<Holder> {
    let release!: () => void;
    const mayGo = new Promise<void>((resolve) => {
      release = resolve;
    });
    let ready!: () => void;
    const isReady = new Promise<void>((resolve) => {
      ready = resolve;
    });
    let pid = 0;
    const done = captureSettled(
      h.admin.$transaction(
        async (tx: any) => {
          const rows = (await tx.$queryRaw`SELECT pg_backend_pid() AS pid`) as Array<{ pid: number }>;
          pid = Number(rows[0]!.pid);
          await tx.$queryRawUnsafe(
            `SELECT id FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`,
            s.tenantId,
            s.workOrderId,
          );
          if (held) await held(tx);
          ready();
          await mayGo;
        },
        { maxWait: 10_000, timeout: 60_000 },
      ),
    );
    await Promise.race([
      isReady,
      done.then((outcome) => {
        throw new Error(`o segurador terminou antes da barreira: ${JSON.stringify(outcome)}`);
      }),
    ]);
    return { pid, release, done };
  }

  /** Os envios atrás do segurador; a barreira conta `envios.length` sessões bloqueadas, e só então o solta. */
  async function behindHolder(h: Harness, holder: Holder, envios: ReadonlyArray<Promise<SettledOutcome<any>>>, label: string) {
    let barreira = "";
    try {
      barreira = await waitForOwnBlockedOrSettled(h.admin, {
        applicationName: CONCURRENT_APPLICATION_NAME,
        minBlocked: envios.length,
        loser: Promise.all(envios),
        label,
        timeoutMs: 20_000,
      });
    } finally {
      // Barreira em timeout também solta o segurador: o caso falha com o diagnóstico e não deixa transação pendurada.
      holder.release();
    }
    const segurador = await holder.done;
    assert.equal(segurador.status, "fulfilled", `o segurador falhou: ${JSON.stringify(segurador)}`);
    return { barreira, resultados: await Promise.all(envios) };
  }

  function resumo(resultados: ReadonlyArray<SettledOutcome<any>>, clientActionId: string) {
    const contagem: Record<string, number> = {};
    for (const resultado of resultados) {
      assert.equal(resultado.status, "fulfilled", `o lote lançou: ${JSON.stringify(resultado)}`);
      const lote = (resultado as { value: any }).value;
      const todas = [...(lote.accepted ?? []), ...(lote.rejected ?? []), ...(lote.conflicts ?? []), ...(lote.already_applied ?? [])];
      const acao = todas.find((a: any) => a.client_action_id === clientActionId);
      if (!acao) continue;
      const chave = acao.status === "accepted" ? "accepted" : `${acao.status}:${acao.error?.reason ?? acao.conflict?.conflict_type ?? "?"}`;
      contagem[chave] = (contagem[chave] ?? 0) + 1;
    }
    return contagem;
  }

  async function pendingApprovals(h: Harness, s: Scenario) {
    return h.servicesFor(h.roleC).approvals.listPending({ tenantId: s.tenantId } as never, { work_order_id: s.workOrderId });
  }

  for (const [rotulo, type, eventType] of [
    ["não consegui iniciar", "work_order.unable_to_start", "work_order_unable_to_start"],
    ["pedir aprovação", "work_order.approval_request", "work_order_approval_requested"],
  ] as const) {
    test(`[D5] ${rotulo}: ${ENVIOS_IGUAIS} envios simultâneos do MESMO client_action_id (e 1 de outro) atrás da trava da OS → 1 evento por ação; ${RODADAS} rodadas`, async (t) => {
      const h = await harness();
      await assertRuntimeRole(h.roleC);
      for (let rodada = 1; rodada <= RODADAS; rodada += 1) {
        const s = await scenario(h, `d5-${type.slice(11, 14)}-${rodada}`);
        h.resetSync();
        const cid = randomUUID();
        const outro = randomUUID();
        const holder = await holdWorkOrder(h, s);
        const envios = [
          ...Array.from({ length: ENVIOS_IGUAIS }, () => captureSettled(run(h, h.roleC, s, type, cid))),
          captureSettled(run(h, h.roleC, s, type, outro)),
        ];
        const { barreira, resultados } = await behindHolder(h, holder, envios, `[D5] ${rotulo}, rodada ${rodada}`);
        const eventos = await eventRows(h, s, eventType);
        const doMesmo = eventos.filter((evento) => evento.metadata.client_action_id === cid).length;
        const doOutro = eventos.filter((evento) => evento.metadata.client_action_id === outro).length;
        const iguais = resumo(resultados.slice(0, ENVIOS_IGUAIS), cid);
        const avisos = type === "work_order.unable_to_start" ? (await noticeRows(h, s)).length : undefined;
        const pendencias = type === "work_order.approval_request" ? (await pendingApprovals(h, s)).length : undefined;
        t.diagnostic(
          `[D5] ${rotulo} rodada ${rodada}: eventos do mesmo=${doMesmo} do outro=${doOutro} avisos=${avisos ?? "-"} ` +
            `pendencias=${pendencias ?? "-"} iguais=${JSON.stringify(iguais)} barreira=${barreira.slice(0, 120)}`,
        );

        assert.equal(doMesmo, 1, `rodada ${rodada}: ${ENVIOS_IGUAIS} envios do mesmo client_action_id gravaram ${doMesmo} eventos`);
        assert.equal(doOutro, 1, `rodada ${rodada}: a ação distinta não gravou o seu evento`);
        if (avisos !== undefined) assert.equal(avisos, 2, `rodada ${rodada}: 1 aviso por ação (mesmo e outro), viu ${avisos}`);
        if (pendencias !== undefined) assert.equal(pendencias, 2, `rodada ${rodada}: 1 pendência por ação, viu ${pendencias}`);
        // Nenhum envio igual termina em erro do pedido: o que não for `accepted` é só o aviso reenviável da corrida dos
        // avisos (a chave durável segura a linha; o app reenvia), nunca conflito nem 500.
        for (const chave of Object.keys(iguais)) {
          assert.ok(chave === "accepted" || chave === "rejected:notification_unavailable", `rodada ${rodada}: desfecho inesperado ${chave}`);
        }
        assert.ok((iguais.accepted ?? 0) >= 1, `rodada ${rodada}: nenhum envio igual foi aceito`);
        assert.match(barreira, /^bloqueado: /, `rodada ${rodada}: a barreira não viu os envios bloqueados (${barreira})`);
        assert.match(barreira, /FOR UPDATE/, `rodada ${rodada}: os envios não esperaram na trava da OS (${barreira.slice(0, 200)})`);
      }
    });

    test(`[D6] ${rotulo}: um cancelamento commita entre o getForMutation e a trava → 422 work_order_closed, sem evento e sem aprovação (E13-01)`, async (t) => {
      const h = await harness();
      const s = await scenario(h, `d6-${type.slice(11, 14)}`);
      h.resetSync();
      const cid = randomUUID();
      // O segurador cancela a OS sob a trava e segura o commit: o envio lê a OS ainda `assigned` (READ COMMITTED) no
      // `getForMutation`, espera a trava e, solto, relê a situação já cancelada.
      const holder = await holdWorkOrder(h, s, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE work_orders
              SET status = 'cancelled', financial_cancellation_decision = 'keep',
                  cancellation_reason = 'Cancelamento do segurador B-SAN3-16', cancelled_at = now()
            WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          s.tenantId,
          s.workOrderId,
        ),
      );
      const envios = [captureSettled(run(h, h.roleC, s, type, cid))];
      const { barreira, resultados } = await behindHolder(h, holder, envios, `[D6] ${rotulo}`);
      const desfecho = resumo(resultados, cid);
      const eventos = await eventRows(h, s, eventType);
      const pendencias = (await pendingApprovals(h, s)).length;
      t.diagnostic(`[D6] ${rotulo}: desfecho=${JSON.stringify(desfecho)} eventos=${eventos.length} pendencias=${pendencias} barreira=${barreira.slice(0, 120)}`);

      assert.deepEqual(desfecho, { "rejected:work_order_closed": 1 }, "o pedido numa OS recém-cancelada tem de sair 422 work_order_closed");
      assert.equal(eventos.length, 0, "nenhum evento numa OS cancelada");
      assert.equal(pendencias, 0, "nenhuma aprovação aberta numa OS cancelada");
      assert.match(barreira, /^bloqueado: /, `a barreira não viu o envio bloqueado (${barreira})`);
    });
  }

  test("[D7] a unidade sob RLS (E13-04): na organização B, a OS da A é \"não encontrada\" e o trabalho não roda; na A, roda com a situação relida", async () => {
    const h = await harness();
    await assertRuntimeRole(h.roleB);
    const a = await scenario(h, "d7a");
    const b = await scenario(h, "d7b");
    const repositorio = new h.WorkOrderRepository(h.roleB.client);
    let rodou = 0;

    const daB = await repositorio.runFieldRequestUnit(b.tenantId, a.workOrderId, async () => {
      rodou += 1;
      return "rodou";
    });
    assert.equal(daB, undefined, "a organização B achou a OS da A na unidade");
    assert.equal(rodou, 0, "o trabalho da unidade rodou para uma OS de outra organização");

    const daA = await repositorio.runFieldRequestUnit(a.tenantId, a.workOrderId, async (unit) => {
      rodou += 1;
      return { status: unit.status, eventos: (await unit.listTimeline()).length };
    });
    assert.deepEqual(daA, { status: "assigned", eventos: 1 }, "controle: a organização A roda a unidade sobre a OS dela");
    assert.equal(rodou, 1);
  });
}
