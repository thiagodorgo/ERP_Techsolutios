import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

// B-O6R-07c-a (07c-a.4 do plano v3, linha `-db`) — ESCOPO POR OBJETO NOS SUBRECURSOS DA OS, contra o PostgreSQL REAL.
//
// A suíte em memória (`o6r07c-subresource-scope.test.ts`) prova a semântica por HTTP. O que só existe aqui: a
// composição de PRODUÇÃO (`CORE_SAAS_PERSISTENCE=prisma`) — repositórios Prisma com RLS e, sobretudo, o
// `resolveActorOperatorProfileId` real, que lê o perfil do técnico na tabela `operator_profiles`. É ele que
// decide a atribuição "por perfil"; sem ele, só a atribuição "por user id" provaria alguma coisa (mutação M9).
//
// Três vias, cada uma pelo ponto onde ela fecha: anexo (`WorkOrderAttachmentService`), comentário
// (`WorkOrderCommentService`) e a km pela fila do app (`syncMobileWorkOrderActions` → `setMileage`).
//   [perfil]   OS atribuída ao PERFIL do técnico A → ele anexa, comenta e lança km; o banco registra.
//   [user id]  OS atribuída ao USER ID do técnico A (a forma do app) → idem.
//   [negativo · anexo | comentário | km] técnico B (mesmo papel, não atribuído) → 403 / `rejected`
//              `not_assigned_to_actor`; o banco não muda.
//
// VERMELHO-CONTROLE: com o `src/` de `c1cfdabe`, os três negativos ficam vermelhos ("o técnico B não foi
// recusado" / km `accepted`); [modo], [perfil] e [user id] ficam verdes (controle positivo).
//
// Cada caso cria uma organização DESCARTÁVEL e a remove no `finally`, escopada pelo id que ele mesmo semeou —
// nunca apagamento por curinga na base viva (P-JUNTA-LIMPEZA-BASE-VIVA). Sem DATABASE_URL, o arquivo se declara
// pulado (forma canônica 1 do runner).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("escopo por objeto dos subrecursos da OS no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;

  // Os blobs do anexo vão para um diretório temporário deste arquivo, nunca para `storage/` do repositório (§C5).
  // As variáveis são lidas quando `src/config/env.ts` carrega — o que só acontece no primeiro import dinâmico.
  const DIR_ANEXOS = fs.mkdtempSync(path.join(os.tmpdir(), "o6r07c-db-anexos-"));
  process.env.CHECKLIST_STORAGE_LOCAL_DIR = DIR_ANEXOS;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  after(async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
    fs.rmSync(DIR_ANEXOS, { recursive: true, force: true });
  });

  test("[modo] a composição de produção está em prisma (sem isto, o arquivo provaria a memória de novo)", async () => {
    const { env } = await import("../src/config/env.js");
    assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "o env congelou em outro modo — os serviços abaixo não seriam os de produção");
  });

  test("[perfil] OS atribuída ao PERFIL do técnico A: ele anexa, comenta e lança km pela fila — e o banco registra", async () => {
    await comCenario(connection, async (c) => {
      const osA = await c.criarOs({ operatorId: c.perfilA });
      assert.equal(await c.atribuidoNoBanco(osA), c.perfilA, "a atribuição por perfil não chegou ao banco");
      await provarPositivo(c, osA, c.tecnicoA);
    });
  });

  test("[user id] OS atribuída ao USER ID do técnico A (a forma do app): ele anexa, comenta e lança km pela fila", async () => {
    await comCenario(connection, async (c) => {
      const osU = await c.criarOs({ userId: c.tecnicoA });
      assert.equal(await c.atribuidoNoBanco(osU), c.tecnicoA, "a atribuição por user id não chegou ao banco");
      await provarPositivo(c, osU, c.tecnicoA);
    });
  });

  // Os negativos são um por via, e cada um começa pela chamada que JÁ existia antes do 07c-a: no vermelho-controle
  // da base, o motivo do vermelho é "o técnico B não foi recusado", nunca "o método não existe".
  test("[negativo · anexo] técnico B, não atribuído, não apaga nem grava anexo na OS do técnico A — o banco não muda", async () => {
    await comCenario(connection, async (c) => {
      const osA = await c.criarOs({ operatorId: c.perfilA });
      const anexo = await c.anexar(osA, c.campo(c.tecnicoA));
      const atorB = c.campo(c.tecnicoB);

      await assertNaoAtribuido(c.anexos.deleteAttachment(atorB, osA, anexo), "apagar anexo");
      await assertNaoAtribuido(
        c.anexos.createUploadedAttachment(atorB, osA, {
          file: { buffer: PNG, originalName: "intruso.png", mimeType: "image/png", sizeBytes: PNG.length },
        }),
        "gravar anexo (serviço)",
      );
      await assertNaoAtribuido(c.anexos.assertCanMutate(atorB, osA), "anexar (a porta que o controller chama antes do multipart)");

      assert.equal(await c.contar("work_order_attachments", osA), 1, "o B apagou ou gravou anexo no banco");
      assert.equal(await c.contar("work_order_attachments", osA, `id = '${anexo}'::uuid`), 1, "o anexo do técnico A sumiu do banco");
    });
  });

  test("[negativo · comentário] técnico B, não atribuído, não comenta nem apaga o comentário do técnico A — o banco não muda", async () => {
    await comCenario(connection, async (c) => {
      const osA = await c.criarOs({ operatorId: c.perfilA });
      const comentario = await c.comentar(osA, c.campo(c.tecnicoA), "do tecnico A");
      const atorB = c.campo(c.tecnicoB);

      await assertNaoAtribuido(c.comentarios.addComment(atorB, osA, { message: "intruso" }), "comentar");
      await assertNaoAtribuido(c.comentarios.deleteComment(atorB, osA, comentario), "apagar comentário");

      assert.equal(await c.contar("work_order_comments", osA), 1, "o B criou comentário no banco");
      assert.equal(await c.contar("work_order_comments", osA, "deleted_at IS NULL"), 1, "o B apagou o comentário do A no banco");
    });
  });

  test("[negativo · km] técnico B, não atribuído, não lança km pela fila na OS do técnico A — rejected por ação, o banco não muda", async () => {
    await comCenario(connection, async (c) => {
      const osA = await c.criarOs({ operatorId: c.perfilA });
      const km = await c.km(c.campo(c.tecnicoB), osA, 111111);
      assert.equal(km.status, "rejected", `km do não atribuído veio ${km.status}`);
      assert.equal(km.reason, "not_assigned_to_actor", `km do não atribuído: reason ${km.reason}`);
      assert.equal(await c.kmNoBanco(osA), null, "a km do B foi gravada no banco apesar da recusa");
    });
  });
}

type Ator = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly explicitPermissions: boolean;
};

type Cenario = Awaited<ReturnType<typeof montarCenario>>;

async function provarPositivo(c: Cenario, workOrderId: string, userId: string): Promise<void> {
  const ator = c.campo(userId);
  const anexo = await c.anexar(workOrderId, ator);
  assert.equal(await c.contar("work_order_attachments", workOrderId, `id = '${anexo}'::uuid`), 1, "o anexo não chegou ao banco");

  await c.comentar(workOrderId, ator, "do atribuido");
  assert.equal(await c.contar("work_order_comments", workOrderId, "deleted_at IS NULL"), 1, "o comentário não chegou ao banco");

  const km = await c.km(ator, workOrderId, 500);
  assert.equal(km.status, "accepted", `km do atribuído veio ${km.status} ${km.reason ?? ""}`);
  assert.equal(await c.kmNoBanco(workOrderId), 500, "a km do atribuído não chegou ao banco");
}

async function assertNaoAtribuido(promessa: Promise<unknown>, via: string): Promise<void> {
  await assert.rejects(promessa, (error: unknown) => {
    const e = error as { statusCode?: number; reason?: string };
    assert.equal(e.statusCode, 403, `${via}: status ${e.statusCode} ${e.reason ?? ""}`);
    assert.equal(e.reason, "not_assigned_to_actor", `${via}: reason ${e.reason}`);
    return true;
  }, `${via}: o técnico B não foi recusado`);
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

async function montarCenario(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { resolvePermissionsForRoles },
    workOrderModule,
    attachmentModule,
    commentModule,
    syncModule,
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/work-order-attachment.service.js"),
    import("../src/modules/work-order-comments/work-order-comment.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
  ]);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await client.tenant.create({ data: { name: `O6R07c DB ${sufixo}`, slug: `o6r07c-db-${sufixo}` } });
  const tenantId = tenant.id;

  const usuario = (nome: string) =>
    client.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `o6r07c-db-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnicoA, tecnicoB] = [await usuario("gestor"), await usuario("tecnico-a"), await usuario("tecnico-b")];
  const perfilA = await client.operatorProfile.create({ data: { tenant_id: tenantId, user_id: tecnicoA.id, full_name: "Tecnico A" } });
  await client.operatorProfile.create({ data: { tenant_id: tenantId, user_id: tecnicoB.id, full_name: "Tecnico B" } });

  // Os serviços são os da composição de PRODUÇÃO (fábricas default sob `prisma`), com os resolvedores reais.
  workOrderModule.resetWorkOrderRuntimeForTests();
  attachmentModule.resetWorkOrderAttachmentRuntimeForTests();
  commentModule.resetWorkOrderCommentRuntimeForTests();
  syncModule.resetMobileWorkOrderSyncRuntimeForTests();
  const ordens = await workOrderModule.createDefaultWorkOrderService();
  const anexos = await attachmentModule.createDefaultWorkOrderAttachmentService();
  const comentarios = await commentModule.createDefaultWorkOrderCommentService();

  const atorDe = (userId: string, role: "manager" | "field_technician"): Ator => ({
    tenantId,
    userId,
    roles: [role],
    permissions: resolvePermissionsForRoles([role]),
    explicitPermissions: true,
  });
  const gestao = atorDe(gestor.id, "manager");

  return {
    client,
    tenantId,
    tecnicoA: tecnicoA.id,
    tecnicoB: tecnicoB.id,
    perfilA: perfilA.id,
    anexos,
    comentarios,
    campo: (userId: string) => atorDe(userId, "field_technician") as never,
    async criarOs(atribuicao: { operatorId: string } | { userId: string }): Promise<string> {
      const criada = await ordens.create(gestao as never, { title: "OS 07c-a no banco" });
      await ordens.assign(gestao as never, criada.id, atribuicao);
      return criada.id;
    },
    async anexar(workOrderId: string, ator: never): Promise<string> {
      const anexo = await anexos.createUploadedAttachment(ator, workOrderId, {
        file: { buffer: PNG, originalName: "foto.png", mimeType: "image/png", sizeBytes: PNG.length },
      });
      return anexo.id;
    },
    async comentar(workOrderId: string, ator: never, message: string): Promise<string> {
      const comentario = await comentarios.addComment(ator, workOrderId, { message });
      return comentario.id;
    },
    async km(ator: never, workOrderId: string, valor: number): Promise<{ status?: string; reason?: string }> {
      const clientActionId = randomUUID();
      const r = await syncModule.syncMobileWorkOrderActions(ator, {
        client_batch_id: randomUUID(),
        actions: [{ client_action_id: clientActionId, type: "work_order.mileage", payload: { work_order_id: workOrderId, mileage_start: valor } }],
      });
      const todas = [...r.accepted, ...r.rejected, ...r.conflicts, ...r.already_applied] as Array<Record<string, any>>;
      const acao = todas.find((a) => a.client_action_id === clientActionId);
      return { status: acao?.status, reason: acao?.error?.reason };
    },
    async atribuidoNoBanco(workOrderId: string): Promise<string | null> {
      const linhas = await client.$queryRawUnsafe<Array<{ assigned_operator_id: string | null }>>(
        "SELECT assigned_operator_id FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid",
        tenantId,
        workOrderId,
      );
      return linhas[0]?.assigned_operator_id ?? null;
    },
    async kmNoBanco(workOrderId: string): Promise<number | null> {
      const linhas = await client.$queryRawUnsafe<Array<{ mileage_start: string | null }>>(
        "SELECT mileage_start::text AS mileage_start FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid",
        tenantId,
        workOrderId,
      );
      const valor = linhas[0]?.mileage_start;
      return valor === null || valor === undefined ? null : Number(valor);
    },
    async contar(tabela: "work_order_attachments" | "work_order_comments", workOrderId: string, filtro = "TRUE"): Promise<number> {
      const linhas = await client.$queryRawUnsafe<Array<{ n: number }>>(
        `SELECT count(*)::int AS n FROM ${tabela} WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND ${filtro}`,
        tenantId,
        workOrderId,
      );
      return linhas[0]?.n ?? 0;
    },
  };
}

async function comCenario(connection: string, callback: (c: Cenario) => Promise<void>): Promise<void> {
  const c = await montarCenario(connection);
  try {
    await callback(c);
  } finally {
    await teardown(c.client, c.tenantId);
    await c.client.$disconnect();
  }
}

// Teardown ESCOPADO à organização descartável desta execução. Toda tabela com `tenant_id` uuid é varrida PELO ID
// QUE O CASO SEMEOU (nunca por curinga de nome), com os gatilhos de FK em modo réplica dentro da transação — o
// mesmo idioma de `work-order-checklists-sticky-db.test.ts`. Depois, a conferência: zero linha residual.
async function teardown(client: { $queryRawUnsafe: any; $transaction: any }, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await client.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  await client.$transaction(async (tx: { $executeRawUnsafe: (sql: string, ...p: unknown[]) => Promise<number> }) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    for (const { table_name } of tabelas) {
      await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    }
    await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
  });
  for (const { table_name } of tabelas) {
    const [{ n }]: Array<{ n: number }> = await client.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`,
      tenantId,
    );
    assert.equal(n, 0, `teardown deixou ${n} linha(s) em ${table_name} da organização descartável`);
  }
}
