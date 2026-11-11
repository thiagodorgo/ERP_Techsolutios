/**
 * B-RDV-COMPROVANTE · RR-db — o comprovante sob PostgreSQL REAL (RLS, papéis efêmeros sem
 * superusuário/BYPASSRLS, claim persistido em `mobile_action_receipts`, registro em
 * `expense_receipts`). Molde: `tests/expense-sync-atomic-db.test.ts`.
 *
 * RR-db.1 — isolamento: ator de outra organização recebe 404 (nunca 403) sob RLS de verdade; o
 *           replay do MESMO client_action_id por OUTRO ator da mesma organização é recusado.
 * RR-db.2 — idempotência persistida: replay (inclusive por "outro processo", um segundo cliente)
 *           devolve o MESMO comprovante sem linha nova; payload diferente responde 409.
 *
 * Conserto c1 do #525 (§2(b), §12.4, §12.11) — a trava de verdade, sob papel efêmero NOSUPERUSER NOBYPASSRLS:
 * RR-db.3 — com o relatório em `FOR UPDATE` por outra conexão, o comprovante ESPERA em Lock; o dono submete e solta
 *           (< 1,5 s, abaixo do teto de 2 s) → 422 `report_not_editable`, 0 linha.
 * RR-db.4 — com a transação do comprovante pausada em `createExpenseReceipt` (a linha já travada), o submit de outro
 *           papel ESPERA em Lock; solta → os dois terminam: relatório `submitted`, comprovante existente.
 * RR-db.5 — o dono segura `FOR UPDATE` 4 s sem mudar nada: o comprovante e o submit terminam em 503 `sync_busy` em até
 *           2,5 s depois de entrar em Lock (o `lock_timeout` de 2 s), 0 linha, 0 objeto, status inalterado.
 * A espera é lida em `pg_stat_activity` filtrando pelo PAPEL EFÊMERO desta suíte (`usename`, único por suíte), nunca
 * pelo cluster inteiro.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** O resultado de uma promessa, sem rejeição solta: `{ ok }` ou `{ error }`, com a hora em que terminou. */
function settle<T>(promise: Promise<T>): Promise<{ ok?: T; error?: any; at: number }> {
  return promise.then(
    (ok) => ({ ok, at: Date.now() }),
    (error) => ({ error, at: Date.now() }),
  );
}

function barrier(): { entered: Promise<void>; signal: () => void; wait: Promise<void>; release: () => void } {
  let signal!: () => void;
  let release!: () => void;
  const entered = new Promise<void>((resolve) => {
    signal = resolve;
  });
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { entered, signal, wait, release };
}

/** Promessa que falha com a mensagem se `promise` não resolver em `ms` (nenhum teste fica pendurado). */
function within<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([promise, sleep(ms).then(() => Promise.reject(new Error(message)))]);
}

function countFiles(root: string): number {
  if (!existsSync(root)) return 0;
  return readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).length;
}

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

    // Caminho do dono primeiro (prova o arnês): 201 uploaded.
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
    // Conserto c1 (§2(a)2) — o `file_key` leva o provedor da D-014 e começa na organização da linha.
    assert.match(String(stored[0].file_key), new RegExp(`^local:${t.tenantId}/expense-receipt-${t.reportId}/[0-9a-f-]{36}-comprovante\\.jpg$`));
    assert.equal(stored[0].local_hash, digest);
  });

  // -------------------------------------------------------------------------------------------------------------
  // Conserto c1 do #525 — a trava de verdade (§2(b), §12.4)
  // -------------------------------------------------------------------------------------------------------------

  const attachInput = (t: { reportId: string; itemId: string }, clientActionId: string, content: Buffer) => ({
    reportId: t.reportId,
    itemId: t.itemId,
    clientActionId,
    buffer: content,
    declaredSha256: sha256Hex(content),
    declaredSizeBytes: content.length,
    declaredContentType: "image/jpeg",
  });

  test("RR-db.3 · trava de verdade: o relatório em FOR UPDATE por outra conexão faz o comprovante (papel NOSUPERUSER NOBYPASSRLS) ESPERAR em Lock; o dono submete e solta em < 1,5 s → 422 report_not_editable, 0 linha", async () => {
    // O papel efêmero não contorna o RLS: atributos e o controle sem contexto (vazio).
    const attributes = (await h.roles.a.client.$queryRawUnsafe(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(attributes[0], { rolsuper: false, rolbypassrls: false }, "o papel do teste contorna o RLS");
    const t = await h.seedTenantWithReport("rrdb3");
    const withoutContext = (await h.roles.a.client.$queryRawUnsafe(
      "SELECT count(*)::int AS n FROM expense_reports WHERE id = $1::uuid",
      t.reportId,
    )) as Array<{ n: number }>;
    assert.equal(withoutContext[0]?.n, 0, "sem contexto de organização o papel enxergou o relatório: o RLS não vale para ele");

    const holderLocked = barrier();
    const holderRelease = barrier();
    const holder = settle(
      h.admin.$transaction(
        async (tx: any) => {
          await tx.$queryRawUnsafe("SELECT 1 FROM expense_reports WHERE id = $1::uuid FOR UPDATE", t.reportId);
          holderLocked.signal();
          await holderRelease.wait;
          await tx.$executeRawUnsafe("UPDATE expense_reports SET status = 'submitted', submitted_at = now() WHERE id = $1::uuid", t.reportId);
        },
        { timeout: 15_000, maxWait: 15_000 },
      ),
    );
    try {
      await within(holderLocked.entered, 10_000, "o dono não conseguiu travar o relatório");
      const upload = settle(h.receiptServiceA.attachReceipt(t.actorTech, attachInput(t, "rrdb3-trava", jpegBytes(0x31))));
      const waitingAt = await h.waitForRoleInLock(h.roles.a.roleName, 3_000);
      assert.ok(waitingAt > 0, "o comprovante não esperou em Lock: nenhuma trava na linha do relatório");
      await sleep(300); // o dono segura < 1,5 s no total, abaixo do teto de 2 s do comprovante
      holderRelease.release();
      const outcome = await upload;
      assert.ok(outcome.error, `o comprovante entrou num relatório submetido: ${JSON.stringify(outcome.ok)}`);
      assert.equal(outcome.error?.statusCode, 422, String(outcome.error?.message));
      assert.equal(outcome.error?.reason, "report_not_editable");
      assert.equal(await h.countReceiptsForItem(t.tenantId, t.itemId), 0, "linha gravada depois da submissão");
    } finally {
      holderRelease.release();
      const held = await holder;
      assert.ok(!held.error, `o dono da trava falhou: ${held.error?.message}`);
    }
  });

  test("RR-db.4 · o submit espera o comprovante: com a transação do comprovante pausada em createExpenseReceipt (linha já travada), o submit de outro papel ESPERA em Lock; solta em < 1,5 s → os dois terminam, relatório submitted e comprovante existente", async () => {
    const t = await h.seedTenantWithReport("rrdb4");
    const gate = barrier();
    const service = new h.ExpenseReceiptService(h.barrierRepository(h.roles.a.client, gate));
    const upload = settle(service.attachReceipt(t.actorTech, attachInput(t, "rrdb4-espera", jpegBytes(0x41))));
    try {
      await within(gate.entered, 10_000, "o comprovante não chegou à barreira em createExpenseReceipt");
      const submit = settle(h.expenseServiceA2.submitReport(t.actorTech, t.reportId));
      const waitingAt = await h.waitForRoleInLock(h.roles.a2.roleName, 3_000);
      await sleep(300); // a barreira segura < 1,5 s, abaixo do teto de 2 s do submit
      gate.release();
      assert.ok(waitingAt > 0, "o submit não esperou a transação do comprovante");
      const uploaded = await upload;
      assert.ok(!uploaded.error, `comprovante: ${uploaded.error?.message}`);
      assert.equal(uploaded.ok?.statusCode, 201);
      const submitted = await submit;
      assert.ok(!submitted.error, `submit: ${submitted.error?.message}`);
      assert.equal(submitted.ok?.status, "submitted");
      assert.equal(await h.reportStatus(t.reportId), "submitted");
      assert.equal(await h.countReceiptsForItem(t.tenantId, t.itemId), 1, "o comprovante não ficou gravado");
    } finally {
      gate.release();
      await upload;
    }
  });

  test("RR-db.5 · teto da trava (§12.4): o dono segura FOR UPDATE 4 s sem mudar nada → o comprovante termina em 503 sync_busy em até 2,5 s depois de entrar em Lock (0 linha, 0 objeto); o submit (outro papel), com o seu dono de 4 s, também 503 sync_busy em até 2,5 s, status inalterado", async () => {
    const t = await h.seedTenantWithReport("rrdb5");

    // Cada operação mede a SUA espera sob um dono próprio de 4 s. Medido (F3 do conserto c1): com as duas na fila
    // da MESMA linha ao mesmo tempo, a 2ª espera primeiro a trava da tupla (até 2 s) e depois a transação do dono
    // (outros até 2 s) — o `lock_timeout` vale por aquisição. A espera continua limitada (≈ 4 s < 5 s da transação).
    async function underFourSecondHolder<T>(operation: () => Promise<T>, roleName: string) {
      const holderLocked = barrier();
      const holder = settle(
        h.admin.$transaction(
          async (tx: any) => {
            await tx.$queryRawUnsafe("SELECT 1 FROM expense_reports WHERE id = $1::uuid FOR UPDATE", t.reportId);
            holderLocked.signal();
            await sleep(4_000);
          },
          { timeout: 15_000, maxWait: 15_000 },
        ),
      );
      await within(holderLocked.entered, 10_000, "o dono não conseguiu travar o relatório");
      const outcome = settle(operation());
      const waitingAt = await h.waitForRoleInLock(roleName, 3_000);
      const settled = await outcome;
      const held = await holder;
      assert.ok(!held.error, `o dono da trava falhou: ${held.error?.message}`);
      return { waitingAt, settled };
    }

    const upload = await underFourSecondHolder(
      () => h.receiptServiceA.attachReceipt(t.actorTech, attachInput(t, "rrdb5-teto", jpegBytes(0x51))),
      h.roles.a.roleName,
    );
    assert.ok(upload.waitingAt > 0, "o comprovante não esperou em Lock");
    assert.equal(upload.settled.error?.statusCode, 503, `comprovante: ${upload.settled.error?.message ?? JSON.stringify(upload.settled.ok)}`);
    assert.equal(upload.settled.error?.reason, "sync_busy");
    assert.ok(upload.settled.at - upload.waitingAt <= 2_500, `o comprovante esperou ${upload.settled.at - upload.waitingAt} ms depois de entrar em Lock (teto 2,5 s)`);
    assert.equal(await h.countReceiptsForItem(t.tenantId, t.itemId), 0, "linha gravada com a trava ocupada");
    assert.equal(countFiles(path.join(h.storageRoot, t.tenantId, `expense-receipt-${t.reportId}`)), 0, "o objeto não foi compensado");

    const submit = await underFourSecondHolder(() => h.expenseServiceA2.submitReport(t.actorTech, t.reportId), h.roles.a2.roleName);
    assert.ok(submit.waitingAt > 0, "o submit não esperou em Lock");
    assert.equal(submit.settled.error?.statusCode, 503, `submit: ${submit.settled.error?.message ?? JSON.stringify(submit.settled.ok)}`);
    assert.equal(submit.settled.error?.reason, "sync_busy");
    assert.ok(submit.settled.at - submit.waitingAt <= 2_500, `o submit esperou ${submit.settled.at - submit.waitingAt} ms depois de entrar em Lock (teto 2,5 s)`);
    assert.equal(await h.reportStatus(t.reportId), "draft", "o status mudou com a trava ocupada");
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, prismaRepositoryModule, receiptModule, localStorageModule, managementModule] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/expense-management/expense-management-prisma.repository.js"),
    import("../src/modules/expense-management/expense-receipt.service.js"),
    import("../src/modules/checklists/storage/local-checklist-storage.provider.js"),
    import("../src/modules/expense-management/expense-management.service.js"),
  ]);
  const RlsRepository = prismaRepositoryModule.RlsPrismaExpenseManagementRepository;
  const { ExpenseReceiptService, configureExpenseReceiptStorageForTests, resetExpenseReceiptRuntimeForTests } = receiptModule;
  const { ExpenseManagementService } = managementModule;

  /**
   * RR-db.4 — o repositório de sempre, com a transação do comprovante embrulhada: `createExpenseReceipt` para na
   * barreira (DENTRO da transação, com a linha do relatório já travada) até o teste soltar.
   */
  class BarrierRepository extends RlsRepository {
    constructor(client: unknown, private readonly gate: ReturnType<typeof barrier>) {
      super(client as any);
    }

    withSyncTransaction<T>(tenantId: string, work: (repository: any) => Promise<T>): Promise<T> {
      const gate = this.gate;
      return super.withSyncTransaction(tenantId, (repository: any) =>
        work(
          new Proxy(repository, {
            get(target, property, receiver) {
              if (property === "createExpenseReceipt") {
                return async (input: unknown) => {
                  gate.signal();
                  await gate.wait;
                  return target.createExpenseReceipt(input);
                };
              }
              const value = Reflect.get(target, property, receiver);
              return typeof value === "function" ? value.bind(target) : value;
            },
          }),
        ),
      );
    }
  }

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
    storageRoot,
    roles: { a: roles[0], a2: roles[1], b: roles[2] },
    ExpenseReceiptService,
    receiptServiceA: new ExpenseReceiptService(repositoryA),
    receiptServiceA2: new ExpenseReceiptService(repositoryA2),
    receiptServiceB: new ExpenseReceiptService(repositoryB),
    /** O submit HTTP (`ExpenseManagementService.submitReport`) sob OUTRO papel efêmero. */
    expenseServiceA2: new ExpenseManagementService(repositoryA2),
    barrierRepository: (client: unknown, gate: ReturnType<typeof barrier>) => new BarrierRepository(client, gate),

    /**
     * Espera um backend DO PAPEL EFÊMERO desta suíte em `wait_event_type = 'Lock'` (o `usename` é único por suíte,
     * então a barreira não se satisfaz com bloqueio alheio). Devolve a hora em que viu, ou -1 no prazo.
     */
    async waitForRoleInLock(roleName: string, timeoutMs: number): Promise<number> {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const rows = (await admin.$queryRawUnsafe(
          "SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = $1 AND wait_event_type = 'Lock' AND state = 'active'",
          roleName,
        )) as Array<{ n: number }>;
        if ((rows[0]?.n ?? 0) >= 1) return Date.now();
        if (Date.now() > deadline) return -1;
        await sleep(25);
      }
    },

    async countReceiptsForItem(tenantId: string, itemId: string): Promise<number> {
      const rows = (await admin.$queryRawUnsafe(
        "SELECT count(*)::int AS n FROM expense_receipts WHERE tenant_id = $1::uuid AND item_id = $2::uuid",
        tenantId,
        itemId,
      )) as Array<{ n: number }>;
      return rows[0]?.n ?? 0;
    },

    async reportStatus(reportId: string): Promise<string | undefined> {
      const rows = (await admin.$queryRawUnsafe("SELECT status FROM expense_reports WHERE id = $1::uuid", reportId)) as Array<{ status: string }>;
      return rows[0]?.status;
    },

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
