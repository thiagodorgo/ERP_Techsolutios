/**
 * B-RDV-COMPROVANTE · RR-db — o comprovante sob PostgreSQL REAL (RLS, papéis efêmeros sem
 * superusuário/BYPASSRLS, claim persistido em `mobile_action_receipts`, registro em
 * `expense_receipts`). Molde: `tests/expense-sync-atomic-db.test.ts`.
 *
 * RR-db.1 — isolamento: ator de outra organização recebe 404 (nunca 403) sob RLS de verdade; o
 *           replay do MESMO client_action_id por OUTRO ator da mesma organização é recusado.
 * RR-db.2 — idempotência persistida: replay (inclusive por "outro processo", um segundo cliente)
 *           devolve o MESMO comprovante sem linha nova; payload diferente responde 409.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

function jpegBytes(filler: number): Buffer {
  const buffer = Buffer.alloc(96, filler);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  return buffer;
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

if (!connectionString) {
  test("B-RDV-COMPROVANTE RR-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.NODE_ENV = "test";

  let h: Awaited<ReturnType<typeof bootstrap>>;

  before(async () => {
    h = await bootstrap(connectionString);
  });

  after(async () => {
    await h?.close();
  });

  test("RR-db.1 · RLS e dono: outra organização recebe 404; mesmo id por outro ator é recusado", async () => {
    const t = await h.seedTenantWithReport("rrdb1");
    const other = await h.seedTenantWithReport("rrdb1b");

    const bytes = jpegBytes(0x21);
    const attach = (service: any, actor: any, reportId: string, itemId: string, clientActionId: string, content = bytes) =>
      service.attachReceipt(actor, {
        reportId,
        itemId,
        clientActionId,
        buffer: content,
        declaredSha256: sha256Hex(content),
        declaredSizeBytes: content.length,
        declaredContentType: "image/jpeg",
      });

    // Caminho do dono primeiro (prova o arnês): 201 stored.
    const own = await attach(h.receiptServiceA, t.actorTech, t.reportId, t.itemId, "rrdb1-own");
    assert.equal(own.statusCode, 201);
    assert.equal(own.uploadStatus, "uploaded");

    // Ator da organização B sobre o relatório da A: 404 (nunca 403), sob papel SEM bypass.
    await assert.rejects(
      attach(h.receiptServiceB, other.actorTech, t.reportId, t.itemId, "rrdb1-cross"),
      (error: any) => error?.statusCode === 404,
      "cross-tenant deve ser 404",
    );

    // Mesmo client_action_id, OUTRO ator da MESMA organização: o dono do relatório barra ANTES
    // (404, nunca 403 nem 409) — o não-dono não descobre nem que o id existe. A posse por ator
    // (`action_owned_by_other_actor`) permanece como defesa em profundidade atrás desse 404.
    await assert.rejects(
      attach(h.receiptServiceA, { ...t.actorTech, userId: t.otherUserId }, t.reportId, t.itemId, "rrdb1-own"),
      (error: any) => error?.statusCode === 404,
      "mesmo id por outro ator (nao-dono) deve morrer no 404 do relatório",
    );

    // A linha persistida é UMA, da organização A (asserção escopada por tenant).
    const count = await h.countReceipts(t.tenantId);
    assert.equal(count, 1);
    assert.equal(await h.countReceipts(other.tenantId), 0);
  });

  test("RR-db.2 · idempotência persistida: replay (mesmo e outro processo) devolve o mesmo comprovante; payload diferente 409", async () => {
    const t = await h.seedTenantWithReport("rrdb2");
    const bytes = jpegBytes(0x42);
    const digest = sha256Hex(bytes);

    const input = (content: Buffer) => ({
      reportId: t.reportId,
      itemId: t.itemId,
      clientActionId: "rrdb2-replay",
      buffer: content,
      declaredSha256: sha256Hex(content),
      declaredSizeBytes: content.length,
      declaredContentType: "image/jpeg",
    });

    const first = await h.receiptServiceA.attachReceipt(t.actorTech, input(bytes));
    assert.equal(first.statusCode, 201);

    // Replay no MESMO serviço.
    const replay = await h.receiptServiceA.attachReceipt(t.actorTech, input(bytes));
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.receiptId, first.receiptId);

    // Replay por OUTRO processo (segundo cliente/papel efêmero): o claim é do BANCO, não da memória.
    const replayOtherProcess = await h.receiptServiceA2.attachReceipt(t.actorTech, input(bytes));
    assert.equal(replayOtherProcess.statusCode, 200);
    assert.equal(replayOtherProcess.receiptId, first.receiptId);

    // Payload diferente com o mesmo id: 409 payload_mismatch, nenhuma linha nova.
    const different = jpegBytes(0x43);
    await assert.rejects(
      h.receiptServiceA.attachReceipt(t.actorTech, input(different)),
      (error: any) => error?.statusCode === 409 && error?.reason === "payload_mismatch",
      "payload diferente deve ser 409 payload_mismatch",
    );

    const stored = await h.listReceipts(t.tenantId);
    assert.equal(stored.length, 1, "replay não pode criar linha nova");
    assert.equal(stored[0].upload_status, "uploaded");
    assert.ok(stored[0].file_key, "file_key persistido");
    assert.equal(stored[0].local_hash, digest);
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, prismaRepositoryModule, receiptModule, localStorageModule] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/expense-management/expense-management-prisma.repository.js"),
    import("../src/modules/expense-management/expense-receipt.service.js"),
    import("../src/modules/checklists/storage/local-checklist-storage.provider.js"),
  ]);
  const RlsRepository = prismaRepositoryModule.RlsPrismaExpenseManagementRepository;
  const { ExpenseReceiptService, configureExpenseReceiptStorageForTests, resetExpenseReceiptRuntimeForTests } = receiptModule;

  // Conserto c1 (§3, regressões movidas): a costura recebe o provedor da D-014 (local, raiz própria deste
  // arquivo); a limpeza da raiz passa a ser do próprio teste.
  const storageRoot = path.join(os.tmpdir(), `rdvcomp-db-${randomUUID()}`);
  configureExpenseReceiptStorageForTests({ provider: new localStorageModule.LocalChecklistStorageProvider(storageRoot) });

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) }) as any;
  const roles: EphemeralRole[] = [];
  roles.push(await createEphemeralRole(admin, connection));
  roles.push(await createEphemeralRole(admin, connection));
  roles.push(await createEphemeralRole(admin, connection));

  const repositoryA = new RlsRepository(roles[0].client as any);
  const repositoryA2 = new RlsRepository(roles[1].client as any);
  const repositoryB = new RlsRepository(roles[2].client as any);
  const tenantIds: string[] = [];

  return {
    admin,
    receiptServiceA: new ExpenseReceiptService(repositoryA),
    receiptServiceA2: new ExpenseReceiptService(repositoryA2),
    receiptServiceB: new ExpenseReceiptService(repositoryB),

    async seedTenantWithReport(marca: string) {
      const tenant = await admin.tenant.create({ data: { name: `Comprovante ${marca}`, slug: `rdv-comp-${marca}-${randomUUID().slice(0, 8)}` } });
      tenantIds.push(tenant.id);
      const tech = await admin.user.create({ data: { tenant_id: tenant.id, name: `tech-${marca}`, email: `tech-${marca}-${randomUUID().slice(0, 8)}@example.invalid` } });
      const otherUser = await admin.user.create({ data: { tenant_id: tenant.id, name: `tech2-${marca}`, email: `tech2-${marca}-${randomUUID().slice(0, 8)}@example.invalid` } });

      const report = await repositoryA.createReport({
        tenantId: tenant.id,
        employeeUserId: tech.id,
        periodStart: new Date("2026-11-01T00:00:00.000Z"),
        periodEnd: new Date("2026-11-07T00:00:00.000Z"),
        origin: "mobile",
        advanceAmount: 0,
        currency: "BRL",
        createdBy: tech.id,
      } as any);
      const item = await repositoryA.addItem({
        tenantId: tenant.id,
        reportId: report.id,
        categoryKey: "fuel",
        spentAt: new Date("2026-11-02T10:00:00.000Z"),
        amount: 120,
        currency: "BRL",
      } as any);

      return {
        tenantId: tenant.id,
        reportId: report.id,
        itemId: item.id,
        otherUserId: otherUser.id,
        actorTech: {
          tenantId: tenant.id,
          userId: tech.id,
          roles: [] as string[],
          permissions: ["expense_report:read_own", "expense_receipt:attach"],
        },
      };
    },

    async countReceipts(tenantId: string): Promise<number> {
      const rows = (await admin.$queryRawUnsafe(
        "SELECT count(*)::int AS n FROM expense_receipts WHERE tenant_id = $1::uuid",
        tenantId,
      )) as Array<{ n: number }>;
      return rows[0]?.n ?? 0;
    },

    async listReceipts(tenantId: string): Promise<Array<{ upload_status: string; file_key: string | null; local_hash: string }>> {
      return (await admin.$queryRawUnsafe(
        "SELECT upload_status, file_key, local_hash FROM expense_receipts WHERE tenant_id = $1::uuid",
        tenantId,
      )) as Array<{ upload_status: string; file_key: string | null; local_hash: string }>;
    },

    async close(): Promise<void> {
      try {
        for (const tenantId of tenantIds) {
          for (const table of ["expense_events", "mobile_action_receipts", "expense_receipts", "expense_items", "expense_reports", "expense_policies", "users"]) {
            await admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = $1::uuid`, tenantId);
          }
          await admin.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
        }
        await resetExpenseReceiptRuntimeForTests();
        rmSync(storageRoot, { recursive: true, force: true });
      } finally {
        for (const role of roles) {
          await role.drop();
        }
        await admin.$disconnect();
      }
    },
  };
}
