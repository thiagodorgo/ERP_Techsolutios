import "dotenv/config";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test, { after, afterEach } from "node:test";

// B-PATIO-LEILAO-DIARIAS, fatias F1 e F1b (suíte PostgreSQL, plano §5.1, §5.2 e Emendas 1 a 10). Cadeia REAL: os serviços de
// leilão, liquidação e cobrança com CORE_SAAS_PERSISTENCE=prisma, organização nova por caso, cadeia de custódia válida
// desde a gênese, e limpeza só do que o caso criou. O bloco "sob a trava" chama os repositórios Prisma sem o serviço.
// Escrita ANTES do conserto: na `main` os casos VERMELHO do plano falham pela asserção (com o valor que veio) ou porque a
// API que o plano cria ainda não existe. Nenhum caso é um `assert.fail` fixo.

const connectionString = process.env.DATABASE_URL;
const MS_PER_DAY = 86_400_000;
const HOUR = 3_600_000;

if (!connectionString) {
  test("patio-leilao-diarias-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para executar a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL ??= "silent";

  const { createPrismaClient } = await import("../src/database/pg-connection.js");
  const { withTenantRls } = await import("../src/database/rls.js");
  const { computeEventHash, genesisHash, verifyChain } = await import("../src/modules/impound/impound.hashchain.js");
  const { createPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { AuctionService, createDefaultAuctionService } = await import("../src/modules/auction/auction.service.js");
  const { createDefaultAuctionSettlementService } = await import("../src/modules/auction/auction.settlement.service.js");
  const { RlsPrismaAuctionRepository, createPrismaAuctionPorts, createPrismaAuctionRepository } = await import("../src/modules/auction/auction-prisma.repository.js");
  const { RlsPrismaAuctionSettlementRepository } = await import("../src/modules/auction/auction-settlement-prisma.repository.js");
  const { distributeCascade } = await import("../src/modules/auction/auction.settlement.repository.js");
  const { createDefaultChargeService } = await import("../src/modules/charging/charge.service.js");
  const { createPrismaChargeRepository } = await import("../src/modules/charging/charge-prisma.repository.js");
  const { summarizeAccrual } = await import("../src/modules/charging/charge.accrual.js");
  const { createDefaultReleaseService } = await import("../src/modules/release/release.service.js");
  const { ImpoundPaymentService } = await import("../src/modules/impound-payments/impound-payment.service.js");
  const { createPrismaImpoundPaymentRepository } = await import("../src/modules/impound-payments/impound-payment-prisma.repository.js");
  const { PAYMENT_METHODS } = await import("../src/modules/impound-payments/impound-payment.types.js");

  const client = createPrismaClient(connectionString);
  const auctionRepo = new RlsPrismaAuctionRepository(client);
  const settlementRepo = new RlsPrismaAuctionSettlementRepository(client);

  type Status = "ACTIVE_CUSTODY" | "AUCTION_ELIGIBLE" | "AUCTION_PREP" | "LOTTED" | "AUCTIONED" | "AUCTION_CLOSED" | "DIRECT_RECYCLING" | "RELEASE_IN_PROGRESS";
  type Ctx = { tenantId: string; processId: string; profileId: string; userId: string; yardId: string | null; enteredAt: Date; frozenAt: Date | null };
  type SeedOptions = {
    status?: Status;
    enteredAt?: Date;
    frozenAt?: Date | null;
    tariff?: boolean;
    cap?: "SIX_MONTHS" | "THIRTY_DAYS_LEGACY" | "UNLIMITED";
    model?: "ROLLING_24H" | "CALENDAR";
    yard?: boolean;
    yardTimezone?: string;
    inspection?: boolean;
    removal?: boolean | "settled";
    trail?: boolean;
  };
  type Actor = { tenantId: string; userId: string; roles: string[]; permissions: string[] };

  const created: string[] = [];

  function actor(ctx: Ctx): Actor {
    return { tenantId: ctx.tenantId, userId: ctx.userId, roles: ["manager"], permissions: ["impound:read", "impound:transition", "auction:appraise", "charging:settle", "release:process", "release:approve"] };
  }

  function ago(days: number, extraMs = 2 * HOUR): Date {
    return new Date(Date.now() - days * MS_PER_DAY - extraMs);
  }

  async function seedPricing(ctx: Ctx): Promise<void> {
    const service = await client.serviceCatalog.create({ data: { tenant_id: ctx.tenantId, name: `Diária ${randomUUID().slice(0, 6)}` } });
    await client.$executeRawUnsafe("UPDATE jurisdiction_profiles SET daily_service_catalog_id = $1::uuid WHERE tenant_id = $2::uuid AND id = $3::uuid", service.id, ctx.tenantId, ctx.profileId);
    const table = await client.priceTable.create({ data: { tenant_id: ctx.tenantId, name: `Tabela ${randomUUID().slice(0, 6)}`, currency: "BRL", status: "published", is_active: true } });
    await client.tariff.create({ data: { tenant_id: ctx.tenantId, price_table_id: table.id, service_catalog_id: service.id, name: "Diária", unit_price: "40.00", currency: "BRL", origin: "test", status: "active", is_active: true } });
  }

  async function removeDailyService(ctx: Ctx): Promise<void> {
    await client.$executeRawUnsafe("UPDATE jurisdiction_profiles SET daily_service_catalog_id = NULL WHERE tenant_id = $1::uuid AND id = $2::uuid", ctx.tenantId, ctx.profileId);
    await client.$executeRawUnsafe("UPDATE impound_processes SET regime_daily_service_catalog_id = NULL WHERE tenant_id = $1::uuid AND id = $2::uuid", ctx.tenantId, ctx.processId);
  }

  async function completeInspection(ctx: Ctx): Promise<void> {
    await withTenantRls(client, ctx.tenantId, async (tx) => {
      const [inspection] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_intake_inspections (tenant_id, process_id, inspected_at, bodywork_state, paint_state, tires_state, internal_objects, missing_equipment, signature_status, completed_at, completed_by)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, ${new Date(ctx.enteredAt.getTime() + HOUR)}, 'Sem avarias', 'Original', 'Bom', 'nenhum', 'nenhum', 'ABSENT', now(), ${ctx.userId}::uuid)
        RETURNING id`;
      await tx.$executeRaw`
        INSERT INTO attachments (tenant_id, entity_type, entity_id, file_url, status, metadata)
        VALUES (${ctx.tenantId}::uuid, 'impound_intake_inspection', ${inspection.id}::uuid, 'https://arquivos.invalid/frente.jpg', 'stored', ${JSON.stringify({ set: "FRONT" })}::jsonb)`;
    });
  }

  async function assignYard(ctx: Ctx, timezone = "America/Sao_Paulo"): Promise<string> {
    return withTenantRls(client, ctx.tenantId, async (tx) => {
      const [yard] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO yards (tenant_id, name, address, timezone) VALUES (${ctx.tenantId}::uuid, 'Pátio Central', 'Rua X, 1', ${timezone}) RETURNING id`;
      await tx.$executeRaw`UPDATE impound_processes SET yard_id = ${yard.id}::uuid WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${ctx.processId}::uuid`;
      ctx.yardId = yard.id;
      return yard.id;
    });
  }

  async function addRemoval(ctx: Ctx, settled = false): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`
        INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount, settled_at)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'REMOVAL', 1, 150.00, 150.00, ${settled ? new Date() : null})`,
    );
  }

  async function seedDailies(ctx: Ctx, count: number, startSeq = 1): Promise<void> {
    for (let seq = startSeq; seq < startSeq + count; seq += 1) {
      await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$executeRaw`
          INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount)
          VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'DAILY', ${seq}, CURRENT_DATE, 1, 40.00, 40.00)`,
      );
    }
  }

  async function seedSoldAttempt(ctx: Ctx, amount = "8000.00", round = 1): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`
        INSERT INTO auction_attempts (tenant_id, process_id, round_number, outcome, winner_ref, sold_amount, sale_note_reference)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, ${round}, 'SOLD', 'Arrematante 1', ${amount}::numeric, 'NOTA-1')`,
    );
  }

  async function completeTrail(ctx: Ctx): Promise<void> {
    await withTenantRls(client, ctx.tenantId, async (tx) => {
      for (const kind of ["OWNER_INITIAL", "COMPLEMENTARY_EDICT"]) {
        await tx.$executeRaw`
          INSERT INTO process_notifications (tenant_id, process_id, kind, status, due_at, issued_at, channel)
          VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, ${kind}, 'ISSUED', now(), now(), 'POSTAL')`;
      }
    });
  }

  // Organização nova, perfil público, usuário e processo com a cadeia de custódia VÁLIDA desde a gênese (molde da sonda
  // do diagnóstico). O cenário comum do §5.1 + E6.1 é o padrão; cada caso tira o que precisa tirar.
  async function seed(label: string, options: SeedOptions = {}): Promise<Ctx> {
    const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.toLowerCase();
    const tenant = await client.tenant.create({ data: { name: `Leilão Diárias ${suffix}`, slug: `leilao-diarias-${suffix}` } });
    created.push(tenant.id);
    const enteredAt = options.enteredAt ?? ago(90);
    const frozenAt = options.frozenAt ?? null;
    const ids = await withTenantRls(client, tenant.id, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope, daily_model, daily_cap, required_photo_sets)
        VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT', ${options.model ?? "ROLLING_24H"}, ${options.cap ?? "SIX_MONTHS"}, ${JSON.stringify(["FRONT"])}::jsonb)
        RETURNING id`;
      const [user] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO users (tenant_id, name, email, status) VALUES (${tenant.id}::uuid, 'Operador Pátio', ${`op-${suffix}@leilao.invalid`}, 'active') RETURNING id`;
      const [process] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
        VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', ${options.status ?? "ACTIVE_CUSTODY"}, ${enteredAt}, ${frozenAt}, 0, NULL)
        RETURNING id`;
      const payload = { from: null, to: "IN_REMOVAL" };
      const prevHash = genesisHash(tenant.id, process.id);
      const hash = computeEventHash({ prevHash, seq: 1, type: "STATUS_CHANGE", payload, occurredAt: enteredAt, actorId: null });
      const [event] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
        VALUES (${tenant.id}::uuid, ${process.id}::uuid, 1, 'STATUS_CHANGE', ${JSON.stringify(payload)}::jsonb, ${enteredAt}, ${prevHash}, ${hash})
        RETURNING id`;
      await tx.$executeRaw`UPDATE impound_processes SET custody_seq_head = 1, custody_hash_head = ${hash} WHERE id = ${process.id}::uuid`;
      await tx.$executeRaw`
        INSERT INTO audit_logs (tenant_id, action, entity, entity_id, metadata)
        VALUES (${tenant.id}::uuid, 'impound.custody_event.appended', 'custody_event', ${event.id}, ${JSON.stringify({ processId: process.id, seq: 1, hash })}::jsonb)`;
      return { profileId: profile.id, userId: user.id, processId: process.id };
    });
    const ctx: Ctx = { tenantId: tenant.id, processId: ids.processId, profileId: ids.profileId, userId: ids.userId, yardId: null, enteredAt, frozenAt };
    if (options.tariff !== false) await seedPricing(ctx);
    if (options.yard !== false) await assignYard(ctx, options.yardTimezone);
    if (options.inspection !== false) await completeInspection(ctx);
    if (options.removal !== false) await addRemoval(ctx, options.removal === "settled");
    if (options.trail !== false) await completeTrail(ctx);
    return ctx;
  }

  // F1b (W7, L11f): outro processo na MESMA organização de `base` (mesmo perfil e usuário), com a cadeia válida desde a
  // gênese. Não cria pátio, vistoria, remoção nem trilha.
  async function addProcess(base: Ctx, options: { status: Status; enteredAt?: Date; frozenAt?: Date | null }): Promise<Ctx> {
    const enteredAt = options.enteredAt ?? ago(10);
    const frozenAt = options.frozenAt ?? null;
    const processId = await withTenantRls(client, base.tenantId, async (tx) => {
      const [process] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
        VALUES (${base.tenantId}::uuid, ${base.profileId}::uuid, 'Autoridade', true, 'Placa adulterada', ${options.status}, ${enteredAt}, ${frozenAt}, 0, NULL)
        RETURNING id`;
      const payload = { from: null, to: "IN_REMOVAL" };
      const prevHash = genesisHash(base.tenantId, process.id);
      const hash = computeEventHash({ prevHash, seq: 1, type: "STATUS_CHANGE", payload, occurredAt: enteredAt, actorId: null });
      await tx.$queryRaw`
        INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
        VALUES (${base.tenantId}::uuid, ${process.id}::uuid, 1, 'STATUS_CHANGE', ${JSON.stringify(payload)}::jsonb, ${enteredAt}, ${prevHash}, ${hash})
        RETURNING id`;
      await tx.$executeRaw`UPDATE impound_processes SET custody_seq_head = 1, custody_hash_head = ${hash} WHERE id = ${process.id}::uuid`;
      return process.id;
    });
    return { ...base, processId, yardId: null, enteredAt, frozenAt };
  }

  // F1b: liberação EM CURSO semeada (o estado que a liberação deixa), sem passar pelo serviço de liberação.
  async function seedActiveRelease(ctx: Ctx): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO impound_releases (tenant_id, process_id, kind, status) VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'STANDARD', 'IN_PROGRESS')`,
    );
  }

  // F1b: edital COMPLETO semeado inteiro por SQL, no estado pedido (molde de tests/auction-sale-concurrency.test.ts), sem
  // registerEdict nem setAppraisal (E10.2).
  async function seedEdictSql(ctx: Ctx, round: number, status: "LOTTED" | "CLOSED"): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`
        INSERT INTO auction_edicts (tenant_id, process_id, round_number, classification, appraisal_amount, min_bid_amount, edict_reference, published_at, business_days, status)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, ${round}, 'CONSERVED', 10000.00, 5000.00, ${`EDITAL-${round}/2026`}, ${new Date(Date.now() - 30 * MS_PER_DAY)}, 15, ${status})`,
    );
  }

  async function seedNoPaymentAttempt(ctx: Ctx, round: number, defaultedSaleRound: number): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`
        INSERT INTO auction_attempts (tenant_id, process_id, round_number, outcome, defaulted_sale_round)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, ${round}, 'NO_PAYMENT', ${defaultedSaleRound})`,
    );
  }

  // F1b: o legado que o código antigo deixava — entrada há 10 dias e 2 h, `frozen_at` de 5 dias atrás, e o livro com
  // as diárias até o congelamento (o motor de hoje lança até o `frozen_at`: 5 de 40,00).
  const LEGACY_FROZEN_DAYS = 5;
  async function seedLegacyFrozen(label: string, status: Status, options: SeedOptions = {}): Promise<Ctx> {
    const frozenAt = new Date(Date.now() - LEGACY_FROZEN_DAYS * MS_PER_DAY);
    const ctx = await seed(label, { status, enteredAt: ago(10), frozenAt, ...options });
    await (await createDefaultChargeService()).accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    return ctx;
  }

  async function dailySeqs(ctx: Ctx): Promise<number[]> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ period_seq: number }>>`SELECT period_seq FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY' ORDER BY period_seq`,
    );
    return rows.map((item) => Number(item.period_seq));
  }

  async function dailyTotal(ctx: Ctx): Promise<string> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ total: string | null }>>`SELECT COALESCE(sum(total_amount), 0)::text AS total FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY'`,
    );
    return Number(rows[0]?.total ?? 0).toFixed(2);
  }

  // O instante gravado no último evento do tipo (e, se dado, com o motivo) — é o "instante do ato".
  async function lastEventAt(ctx: Ctx, type: string, reason?: string): Promise<number | undefined> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ occurred_at: Date; payload: Record<string, unknown> }>>`
        SELECT occurred_at, payload FROM custody_events WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND type = ${type} ORDER BY seq DESC`,
    );
    const hit = rows.find((item) => reason === undefined || item.payload?.reason === reason);
    return hit ? new Date(hit.occurred_at).getTime() : undefined;
  }

  async function frozenMs(ctx: Ctx): Promise<number | null> {
    const frozen = (await row(ctx)).frozen_at;
    return frozen === null ? null : new Date(frozen).getTime();
  }

  // Limpeza só do que o caso criou: toda tabela com tenant_id, pela organização criada, em modo réplica (a cadeia é
  // append-only por gatilho), e a organização no fim.
  async function teardown(tenantId: string): Promise<void> {
    const tables = await client.$queryRaw<Array<{ table_name: string }>>`
      SELECT DISTINCT c.table_name FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.table_name <> 'tenants'`;
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      for (const { table_name: table } of tables) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE tenant_id = $1::uuid`, tenantId);
      }
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  }

  // Cada caso apaga o que criou logo ao terminar (também quando falha), para o script de cura do L11 não ver dados de
  // outro caso.
  afterEach(async () => {
    for (const tenantId of created.splice(0)) {
      await teardown(tenantId);
    }
  });

  after(async () => {
    await client.$disconnect();
  });

  async function row(ctx: Ctx): Promise<{ status: string; frozen_at: Date | null; entered_at: Date | null }> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ status: string; frozen_at: Date | null; entered_at: Date | null }>>`
        SELECT status, frozen_at, entered_at FROM impound_processes WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${ctx.processId}::uuid`,
    );
    assert.ok(rows[0], "o processo existe");
    return rows[0];
  }

  async function count(ctx: Ctx, sql: "DAILY" | "LINES" | "SOLD" | "SETTLEMENTS" | "SETTLED_LINES"): Promise<number> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) => {
      switch (sql) {
        case "DAILY":
          return tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY'`;
        case "LINES":
          return tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid`;
        case "SOLD":
          return tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM auction_attempts WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND outcome = 'SOLD'`;
        case "SETTLEMENTS":
          return tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM settlements WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid`;
        case "SETTLED_LINES":
          return tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND settled_at IS NOT NULL`;
      }
    });
    return rows[0]?.n ?? 0;
  }

  async function eventCount(ctx: Ctx, type: string): Promise<number> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND type = ${type}`,
    );
    return rows[0]?.n ?? 0;
  }

  async function events(ctx: Ctx): Promise<Array<{ seq: number; type: string; payload: Record<string, unknown> }>> {
    return withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ seq: number; type: string; payload: Record<string, unknown> }>>`
        SELECT seq, type, payload FROM custody_events WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid ORDER BY seq`,
    );
  }

  async function assertChainValid(ctx: Ctx): Promise<void> {
    const impound = await createPrismaImpoundRepository();
    const snapshot = await impound.readChainSnapshot(ctx.tenantId, ctx.processId);
    assert.ok(snapshot, "a cadeia existe");
    const result = verifyChain({ tenantId: ctx.tenantId, processId: ctx.processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
    assert.equal(result.valid, true, `cadeia de custódia válida (${JSON.stringify(result)})`);
  }

  async function isSweepCandidate(ctx: Ctx): Promise<boolean> {
    const repo = await createPrismaChargeRepository();
    return (await repo.listAccrualCandidates(ctx.tenantId, 500)).includes(ctx.processId);
  }

  function reasonOf(error: unknown): string {
    const typed = error as { statusCode?: number; reason?: string; message?: string };
    return typed.reason ? `${typed.statusCode ?? "?"} ${typed.reason}` : `sem razão: ${typed.message ?? String(error)}`;
  }

  async function outcome(run: () => Promise<unknown>): Promise<string> {
    try {
      await run();
      return "aceito";
    } catch (error) {
      return reasonOf(error);
    }
  }

  type DistResult = { allocations: ReadonlyArray<{ beneficiaryKind: string; amount: string; claimAmount?: string }>; settlement: { hammerAmount: string; shortfallAmount?: string } };
  function cascadeOf(result: DistResult) {
    const byKind = new Map(result.allocations.map((allocation) => [allocation.beneficiaryKind, allocation]));
    const cents = result.allocations.reduce((acc, allocation) => acc + Math.round(Number(allocation.amount) * 100), 0);
    return {
      creditoDoPatio: byKind.get("REMOVAL_STORAGE")?.amount,
      saldoDoExDono: byKind.get("OWNER_BALANCE")?.amount,
      somaDoRateioIgualAoLance: cents === Math.round(Number(result.settlement.hammerAmount) * 100),
    };
  }

  const edictBody = (round = 1) => ({ round_number: round, classification: "CONSERVED", edict_reference: `EDITAL-${round}/2026`, published_at: new Date(Date.now() - 30 * MS_PER_DAY).toISOString(), business_days: 15 });
  const saleBody = (amount = "8000.00", round = 1) => ({ round_number: round, winner_ref: `Arrematante ${round}`, sold_amount: amount, sale_note_reference: `NOTA-${round}` });

  async function lotViaService(ctx: Ctx, minBid = "5000.00"): Promise<void> {
    const auction = await createDefaultAuctionService();
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody());
    await auction.setAppraisal(actor(ctx), ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: minBid });
    await auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 });
  }

  async function twoDesertedRounds(ctx: Ctx): Promise<void> {
    const auction = await createDefaultAuctionService();
    for (const round of [1, 2]) {
      await auction.registerEdict(actor(ctx), ctx.processId, edictBody(round));
      await auction.recordAttempt(actor(ctx), ctx.processId, { round_number: round });
    }
  }

  // Leva ao estado de partida pelos ATÔMICOS do repositório, sem os portões do serviço (para semear AUCTION_PREP/LOTTED).
  async function prepViaRepository(ctx: Ctx, to: "AUCTION_PREP" | "LOTTED"): Promise<void> {
    const auction = await createDefaultAuctionService();
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody());
    await auction.setAppraisal(actor(ctx), ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "5000.00" });
    await auctionRepo.prepareAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, actorId: ctx.userId, occurredAt: new Date() });
    if (to === "LOTTED") {
      await auctionRepo.lotAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_PREP", roundNumber: 1, actorId: ctx.userId, occurredAt: new Date() });
    }
  }

  function settlementInput(ctx: Ctx, removalStorageCents: number, basis: unknown, hammerCents = 800_000): Record<string, unknown> {
    const claims = [
      { kind: "AUCTION_COST", claimCents: 0 },
      { kind: "REMOVAL_STORAGE", claimCents: removalStorageCents },
      { kind: "VEHICLE_TAXES", claimCents: 0 },
      { kind: "PRIORITY_CREDITORS", claimCents: 0 },
      { kind: "REALIZING_AGENCY_FINES", claimCents: 0 },
      { kind: "OTHER_SNT_FINES", claimCents: 0 },
      { kind: "OTHER_DEBITS", claimCents: 0 },
    ] as const;
    const { allocations, ownerBalanceCents, shortfallCents } = distributeCascade(hammerCents, claims as never);
    const now = new Date();
    return {
      tenantId: ctx.tenantId,
      processId: ctx.processId,
      expectedFrom: "AUCTION_CLOSED",
      soldRound: 1,
      hammerCents,
      allocations,
      ownerBalanceCents,
      shortfallCents,
      auctionCostCents: 0,
      removalStorageCents,
      currency: "BRL",
      ownerNotifyDueAt: new Date(now.getTime() + 30 * MS_PER_DAY),
      ownerClaimExpiresAt: new Date(now.getTime() + 5 * 365 * MS_PER_DAY),
      actorId: ctx.userId,
      occurredAt: now,
      chargeBasis: basis,
    };
  }

  const NO_OP_CLOSING = async () => ({ examined: true, accrued: 0, errors: 0 });

  // AuctionService Prisma pela API pública que o plano cria (portas 7 a 10). Na `main` o construtor tem 6 parâmetros.
  async function prismaAuctionServiceWith(ports: { closeDailies?: (t: string, p: string, now: Date, a?: string) => Promise<unknown>; chargeState?: (t: string, p: string, now: Date) => Promise<unknown> }) {
    const [repository, impound, auctionPorts, charge] = await Promise.all([createPrismaAuctionRepository(), createPrismaImpoundRepository(), createPrismaAuctionPorts(), createDefaultChargeService()]);
    const Ctor = AuctionService as unknown as new (...args: unknown[]) => InstanceType<typeof AuctionService>;
    return new Ctor(
      repository,
      impound,
      auctionPorts.profile,
      auctionPorts.notifications,
      auctionPorts.verifyChain,
      auctionPorts.hasActiveRelease,
      ports.closeDailies ?? ((t: string, p: string, now: Date, a?: string) => charge.accrueProcess(t, p, now, a)),
      ports.chargeState ?? ((t: string, p: string, now: Date) => charge.getReleaseChargeState(t, p, now)),
      async () => true,
      async () => true,
    );
  }

  async function quitAll(ctx: Ctx): Promise<void> {
    const charge = await createDefaultChargeService();
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    await charge.settle(actor(ctx), ctx.processId, { note: "quitado no balcão" });
  }

  function deferred() {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { promise, release };
  }

  // Segura um UPDATE do fuso do pátio numa transação aberta (a "conexão X" da E2.1) até `release()`.
  function holdYardTimezone(yardId: string, timezone: string) {
    const gate = deferred();
    const updated = deferred();
    const tx = client.$transaction(
      async (inner) => {
        await inner.$executeRawUnsafe("UPDATE yards SET timezone = $1 WHERE id = $2::uuid", timezone, yardId);
        updated.release();
        await gate.promise;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return { updated: updated.promise, commit: gate.release, done: tx };
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ────────────────────────────── §5.1 a cadeia real ──────────────────────────────

  test("L1 · arremate sem diária lançada: o recordSale lança as 90 sem congelar; o encerramento congela; liquidação 3750.00 / 4250.00", async () => {
    const ctx = await seed("L1", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    assert.deepEqual(
      { linhas: await count(ctx, "LINES"), diarias: await count(ctx, "DAILY"), congelado: (await row(ctx)).frozen_at !== null },
      { linhas: 91, diarias: 90, congelado: false },
      "L1: logo depois do recordSale, antes do closeAuction",
    );
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    assert.notEqual((await row(ctx)).frozen_at, null, "o encerramento congela");
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(cascadeOf(dist), { creditoDoPatio: "3750.00", saldoDoExDono: "4250.00", somaDoRateioIgualAoLance: true });
    await assertChainValid(ctx);
  });

  test("L1b · arremate com 89 diárias já lançadas (varredura parou 26 h antes): lança 1; crédito 3750.00, saldo 4250.00", async () => {
    const ctx = await seed("L1b", { status: "AUCTION_ELIGIBLE" });
    const charge = await createDefaultChargeService();
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(Date.now() - 26 * HOUR));
    assert.equal(await count(ctx, "DAILY"), 89, "pré-condição: 89 diárias lançadas");
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual({ diarias: await count(ctx, "DAILY"), ...cascadeOf(dist) }, { diarias: 90, creditoDoPatio: "3750.00", saldoDoExDono: "4250.00", somaDoRateioIgualAoLance: true });
    await assertChainValid(ctx);
  });

  test("L2 · reciclagem por 2 leilões desertos: 90 diárias, total do livro 3750.00", async () => {
    const ctx = await seed("L2", { status: "AUCTION_ELIGIBLE" });
    await twoDesertedRounds(ctx);
    const view = await (await createDefaultAuctionService()).reclassifyScrap(actor(ctx), ctx.processId);
    const statement = await (await createDefaultChargeService()).getStatement(actor(ctx), ctx.processId);
    assert.deepEqual({ estado: view.status, diarias: await count(ctx, "DAILY"), total: statement.total }, { estado: "DIRECT_RECYCLING", diarias: 90, total: "3750.00" });
    await assertChainValid(ctx);
  });

  test("L3 · reciclagem por inservibilidade: 90 diárias, total do livro 3750.00", async () => {
    const ctx = await seed("L3");
    const view = await (await createDefaultAuctionService()).reclassifyUnrecoverable(actor(ctx), ctx.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada, sem condição de circular" });
    const statement = await (await createDefaultChargeService()).getStatement(actor(ctx), ctx.processId);
    assert.deepEqual({ estado: view.status, diarias: await count(ctx, "DAILY"), total: statement.total }, { estado: "DIRECT_RECYCLING", diarias: 90, total: "3750.00" });
    await assertChainValid(ctx);
  });

  test("L4 · arremate sem serviço de diária: 409 auction_daily_charges_unpostable; segue LOTTED, sem congelar, sem SOLD, sem AUCTION_SOLD", async () => {
    const ctx = await seed("L4", { status: "AUCTION_ELIGIBLE" });
    await prepViaRepository(ctx, "LOTTED");
    await removeDailyService(ctx);
    const result = await outcome(async () => (await createDefaultAuctionService()).recordSale(actor(ctx), ctx.processId, saleBody()));
    const process = await row(ctx);
    assert.deepEqual(
      { resultado: result, estado: process.status, congelado: process.frozen_at !== null, vendas: await count(ctx, "SOLD"), eventosAuctionSold: await eventCount(ctx, "AUCTION_SOLD") },
      { resultado: "409 auction_daily_charges_unpostable", estado: "LOTTED", congelado: false, vendas: 0, eventosAuctionSold: 0 },
    );
  });

  test("L4r · as duas reciclagens sem serviço de diária: 409 auction_daily_charges_unpostable; estado e congelamento intocados", async () => {
    const scrap = await seed("L4r-s", { status: "AUCTION_ELIGIBLE", tariff: false });
    await twoDesertedRounds(scrap);
    const unrec = await seed("L4r-u", { tariff: false });
    const auction = await createDefaultAuctionService();
    const scrapResult = await outcome(() => auction.reclassifyScrap(actor(scrap), scrap.processId));
    const unrecResult = await outcome(() => auction.reclassifyUnrecoverable(actor(unrec), unrec.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada" }));
    assert.deepEqual(
      {
        sucata: scrapResult,
        sucataEstado: (await row(scrap)).status,
        sucataCongelada: (await row(scrap)).frozen_at !== null,
        inservivel: unrecResult,
        inservivelEstado: (await row(unrec)).status,
        inservivelCongelado: (await row(unrec)).frozen_at !== null,
      },
      {
        sucata: "409 auction_daily_charges_unpostable",
        sucataEstado: "AUCTION_ELIGIBLE",
        sucataCongelada: false,
        inservivel: "409 auction_daily_charges_unpostable",
        inservivelEstado: "ACTIVE_CUSTODY",
        inservivelCongelado: false,
      },
    );
  });

  test("L4c · serviço de diária retirado entre o arremate e o encerramento (com 1 diária a mais devida): o encerramento recusa 409 auction_daily_charges_unpostable; segue AUCTIONED", async () => {
    const ctx = await seed("L4c", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    // Um dia de espera pelo pagamento, como na L12 (o teste recua a entrada), e o serviço de diária retirado.
    await client.$executeRawUnsafe("UPDATE impound_processes SET entered_at = entered_at - interval '1 day' WHERE tenant_id = $1::uuid AND id = $2::uuid", ctx.tenantId, ctx.processId);
    await removeDailyService(ctx);
    const frozenBefore = (await row(ctx)).frozen_at;
    const result = await outcome(() => auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true }));
    assert.deepEqual(
      { resultado: result, estado: (await row(ctx)).status, congeladoAntesDoEncerramento: frozenBefore !== null },
      { resultado: "409 auction_daily_charges_unpostable", estado: "AUCTIONED", congeladoAntesDoEncerramento: false },
    );
  });

  test("L5 · remoção paga antes do leilão e 90 diárias em aberto: crédito só o em aberto 3600.00, saldo 4400.00", async () => {
    const ctx = await seed("L5", { status: "AUCTION_ELIGIBLE" });
    await (await createDefaultChargeService()).settle(actor(ctx), ctx.processId, { note: "remoção paga no balcão" });
    assert.equal(await count(ctx, "SETTLED_LINES"), 1, "pré-condição: a remoção quitada");
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(cascadeOf(dist), { creditoDoPatio: "3600.00", saldoDoExDono: "4400.00", somaDoRateioIgualAoLance: true });
  });

  test("L6 · legado já AUCTION_CLOSED e congelado, venda de 8000.00 gravada, 0 diárias, com tarifa: a liquidação lança 90; crédito 3750.00, saldo 4250.00", async () => {
    const frozenAt = new Date(Date.now() - HOUR);
    const ctx = await seed("L6", { status: "AUCTION_CLOSED", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt });
    await seedSoldAttempt(ctx);
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual({ diarias: await count(ctx, "DAILY"), ...cascadeOf(dist) }, { diarias: 90, creditoDoPatio: "3750.00", saldoDoExDono: "4250.00", somaDoRateioIgualAoLance: true });
    await assertChainValid(ctx);
  });

  test("L6b · legado congelado sem serviço de diária: 409 settlement_daily_charges_unpostable; nenhuma liquidação, nenhum AUCTION_SETTLEMENT", async () => {
    const frozenAt = new Date(Date.now() - HOUR);
    const ctx = await seed("L6b", { status: "AUCTION_CLOSED", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt, tariff: false });
    await seedSoldAttempt(ctx);
    const result = await outcome(async () => (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {}));
    assert.deepEqual(
      { resultado: result, liquidacoes: await count(ctx, "SETTLEMENTS"), eventosAuctionSettlement: await eventCount(ctx, "AUCTION_SETTLEMENT") },
      { resultado: "409 settlement_daily_charges_unpostable", liquidacoes: 0, eventosAuctionSettlement: 0 },
    );
  });

  test("L7 · regime de 30 diárias e 90 dias de pátio: lança exatamente 30; crédito 1350.00, saldo 6650.00", async () => {
    const ctx = await seed("L7", { status: "AUCTION_ELIGIBLE", cap: "THIRTY_DAYS_LEGACY" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual({ diarias: await count(ctx, "DAILY"), ...cascadeOf(dist) }, { diarias: 30, creditoDoPatio: "1350.00", saldoDoExDono: "6650.00", somaDoRateioIgualAoLance: true });
  });

  // E10.2: o L8 se divide. O L8a anda só pelo serviço; o L8b semeia a revenda (o produto não tem caminho para pôr em
  // lote a rodada nova depois da inadimplência — pendência P-LEILAO-REVENDA-SEM-CAMINHO).
  test("L8a · arremate e inadimplência pelo serviço: depois de cada um, frozen_at nulo e candidato da varredura; a varredura em seguida lança as diárias até agora (90)", async () => {
    const ctx = await seed("L8a", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    const afterSale = { congelado: (await row(ctx)).frozen_at !== null, candidato: await isSweepCandidate(ctx) };
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    const afterDefault = { congelado: (await row(ctx)).frozen_at !== null, candidato: await isSweepCandidate(ctx), estado: (await row(ctx)).status };
    await (await createDefaultChargeService()).accrueTenantScan(ctx.tenantId, new Date());
    assert.deepEqual(
      { afterSale, afterDefault, diariasDepoisDaVarredura: await count(ctx, "DAILY") },
      { afterSale: { congelado: false, candidato: true }, afterDefault: { congelado: false, candidato: true, estado: "LOTTED" }, diariasDepoisDaVarredura: 90 },
    );
  });

  test("L8b · ESTADO SEMEADO (P-LEILAO-REVENDA-SEM-CAMINHO): revenda com o edital da rodada 3 semeado por SQL já em lote; o 2º arremate passa; frozen_at nulo até o encerramento; 90 diárias, nenhuma faltando", async () => {
    const ctx = await seed("L8b", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`UPDATE auction_edicts SET status = 'CLOSED' WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND status = 'LOTTED'`,
    );
    await seedEdictSql(ctx, 3, "LOTTED");
    const resale = await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 3));
    const afterResale = { criado: resale.created, congelado: (await row(ctx)).frozen_at !== null };
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 3, payment_confirmed: true });
    const state = await (await createDefaultChargeService()).getReleaseChargeState(ctx.tenantId, ctx.processId);
    assert.deepEqual(
      { afterResale, congeladoNoEncerramento: (await row(ctx)).frozen_at !== null, diarias: await count(ctx, "DAILY"), devidas: state?.nAccrueAtFreeze, faltando: state?.dailyShortfall },
      { afterResale: { criado: true, congelado: false }, congeladoNoEncerramento: true, diarias: 90, devidas: 90, faltando: 0 },
    );
  });

  test("L9 · recordSale chamado duas vezes na mesma rodada: a 2ª devolve created=false; contagem de diárias igual (90)", async () => {
    const ctx = await seed("L9", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    const first = await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    const afterFirst = await count(ctx, "DAILY");
    const second = await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    assert.deepEqual(
      { primeira: first.created, segunda: second.created, diariasDepoisDa1a: afterFirst, diariasDepoisDa2a: await count(ctx, "DAILY") },
      { primeira: true, segunda: false, diariasDepoisDa1a: 90, diariasDepoisDa2a: 90 },
    );
  });

  test("L10 · lance de 1000.00 (o mínimo) menor que o devido: item I pedido 3750.00 e alocado 1000.00; shortfall 2750.00; saldo 0.00", async () => {
    const ctx = await seed("L10", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx, "1000.00");
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("1000.00"));
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    const itemI = dist.allocations.find((allocation) => allocation.beneficiaryKind === "REMOVAL_STORAGE");
    assert.deepEqual(
      { pedido: itemI?.claimAmount, alocado: itemI?.amount, shortfall: dist.settlement.shortfallAmount, saldo: cascadeOf(dist).saldoDoExDono, soma: cascadeOf(dist).somaDoRateioIgualAoLance },
      { pedido: "3750.00", alocado: "1000.00", shortfall: "2750.00", saldo: "0.00", soma: true },
    );
  });

  test("L12 · 3 dias entre o arremate e a confirmação do pagamento: 93 diárias; crédito 3870.00, saldo 4130.00", async () => {
    const ctx = await seed("L12", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await client.$executeRawUnsafe("UPDATE impound_processes SET entered_at = entered_at - interval '3 days' WHERE tenant_id = $1::uuid AND id = $2::uuid", ctx.tenantId, ctx.processId);
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual({ diarias: await count(ctx, "DAILY"), ...cascadeOf(dist) }, { diarias: 93, creditoDoPatio: "3870.00", saldoDoExDono: "4130.00", somaDoRateioIgualAoLance: true });
  });

  // ────────────────────────────── §5.2 sob a trava (repositórios direto) ──────────────────────────────

  // Processo com 3 diárias devidas (entrada 3 dias e 2 h antes do instante), no estado pedido.
  async function seedThreeOwed(label: string, status: Status, occurredAt: Date, frozenAt: Date | null = null, dailies = 0): Promise<Ctx> {
    const ctx = await seed(label, { status, enteredAt: new Date((frozenAt ?? occurredAt).getTime() - 3 * MS_PER_DAY - 2 * HOUR), frozenAt, yard: false });
    if (dailies > 0) await seedDailies(ctx, dailies);
    return ctx;
  }

  async function atomicFor(kind: "close" | "scrap" | "unrecoverable", ctx: Ctx, basis: unknown, occurredAt: Date) {
    const base = { tenantId: ctx.tenantId, processId: ctx.processId, actorId: ctx.userId, occurredAt, chargeBasis: basis };
    if (kind === "close") return auctionRepo.closeAuctionAtomic({ ...base, expectedFrom: "AUCTIONED", roundNumber: 1 } as never);
    if (kind === "scrap") return auctionRepo.reclassifyScrapAtomic({ ...base, expectedFrom: "AUCTION_ELIGIBLE", maxAttempts: 2 } as never);
    return auctionRepo.reclassifyUnrecoverableAtomic({ ...base, expectedFrom: "ACTIVE_CUSTODY" } as never);
  }

  const ACT_STATUS = { close: "AUCTIONED", scrap: "AUCTION_ELIGIBLE", unrecoverable: "ACTIVE_CUSTODY" } as const;

  async function directCase(label: string, kind: "close" | "scrap" | "unrecoverable", dailies: number, basisFor: (ctx: Ctx, occurredAt: Date) => unknown) {
    const occurredAt = new Date();
    const ctx = await seedThreeOwed(label, ACT_STATUS[kind], occurredAt, null, dailies);
    if (kind === "scrap") await twoDesertedRounds(ctx);
    const result = await outcome(() => atomicFor(kind, ctx, basisFor(ctx, occurredAt), occurredAt));
    const process = await row(ctx);
    return { resultado: result, estado: process.status, congelado: process.frozen_at !== null };
  }

  for (const [id, kind] of [["DB-1", "close"], ["DB-2", "scrap"], ["DB-3", "unrecoverable"]] as const) {
    test(`${id} · ${kind}: base com expectedDailyCount = 3 e livro sem diária: 409 auction_daily_charges_missing; nada congela`, async () => {
      const observed = await directCase(id, kind, 0, (ctx, occurredAt) => ({ expectedDailyCount: 3, enteredAt: ctx.enteredAt, frozenAt: occurredAt }));
      assert.deepEqual(observed, { resultado: "409 auction_daily_charges_missing", estado: ACT_STATUS[kind], congelado: false });
    });
  }

  for (const [id, kind] of [["DB-4a", "close"], ["DB-4b", "scrap"], ["DB-4c", "unrecoverable"]] as const) {
    test(`${id} · ${kind}: livro completo (3) e SÓ o frozenAt da base errado: 409 concurrent_custody_append; nada gravado`, async () => {
      const observed = await directCase(id, kind, 3, (ctx, occurredAt) => ({ expectedDailyCount: 3, enteredAt: ctx.enteredAt, frozenAt: new Date(occurredAt.getTime() - HOUR) }));
      assert.deepEqual(observed, { resultado: "409 concurrent_custody_append", estado: ACT_STATUS[kind], congelado: false });
    });
  }

  for (const [id, kind] of [["DB-7a", "close"], ["DB-7b", "scrap"], ["DB-7c", "unrecoverable"]] as const) {
    test(`${id} · ${kind}: livro completo (3) e base com expectedDailyCount uma abaixo (2): 409 concurrent_custody_append; nada congela`, async () => {
      const observed = await directCase(id, kind, 3, (ctx, occurredAt) => ({ expectedDailyCount: 2, enteredAt: ctx.enteredAt, frozenAt: occurredAt }));
      assert.deepEqual(observed, { resultado: "409 concurrent_custody_append", estado: ACT_STATUS[kind], congelado: false });
    });
  }

  async function settlementDirect(label: string, dailies: number, basisFor: (ctx: Ctx) => unknown, claimCents = 15_000 + dailies * 4_000, owedDays = 3) {
    const frozenAt = new Date(Date.now() - HOUR);
    const ctx = await seed(label, { status: "AUCTION_CLOSED", enteredAt: new Date(frozenAt.getTime() - owedDays * MS_PER_DAY - 2 * HOUR), frozenAt, yard: false });
    await seedSoldAttempt(ctx);
    if (dailies > 0) await seedDailies(ctx, dailies);
    return { ctx, run: () => settlementRepo.distributeSettlementAtomic(settlementInput(ctx, claimCents, basisFor(ctx)) as never) };
  }

  test("DB-5 · distributeSettlementAtomic com expectedDailyCount = 3 e livro sem diária: 409 settlement_daily_charges_missing; nenhuma liquidação", async () => {
    const { ctx, run } = await settlementDirect("DB-5", 0, (c) => ({ expectedDailyCount: 3, enteredAt: c.enteredAt, frozenAt: c.frozenAt }));
    assert.deepEqual({ resultado: await outcome(run), liquidacoes: await count(ctx, "SETTLEMENTS") }, { resultado: "409 settlement_daily_charges_missing", liquidacoes: 0 });
  });

  test("DB-6 · distributeSettlementAtomic com livro completo e SÓ a base errada (frozenAt): 409 concurrent_custody_append; nenhuma liquidação", async () => {
    const { ctx, run } = await settlementDirect("DB-6", 3, (c) => ({ expectedDailyCount: 3, enteredAt: c.enteredAt, frozenAt: new Date((c.frozenAt as Date).getTime() - HOUR) }));
    assert.deepEqual({ resultado: await outcome(run), liquidacoes: await count(ctx, "SETTLEMENTS") }, { resultado: "409 concurrent_custody_append", liquidacoes: 0 });
  });

  test("DB-8 · distributeSettlementAtomic com livro completo e expectedDailyCount uma abaixo (2): 409 concurrent_custody_append; nenhuma liquidação", async () => {
    const { ctx, run } = await settlementDirect("DB-8", 3, (c) => ({ expectedDailyCount: 2, enteredAt: c.enteredAt, frozenAt: c.frozenAt }));
    assert.deepEqual({ resultado: await outcome(run), liquidacoes: await count(ctx, "SETTLEMENTS") }, { resultado: "409 concurrent_custody_append", liquidacoes: 0 });
  });

  test("DB-9 · rateio calculado para 150.00 e um ADDITIONAL de 40.00 a mais no banco: 409 concurrent_custody_append; nenhuma liquidação, nenhum AUCTION_SETTLEMENT", async () => {
    const { ctx, run } = await settlementDirect("DB-9", 0, (c) => ({ expectedDailyCount: 0, enteredAt: c.enteredAt, frozenAt: c.frozenAt }), 15_000, 0);
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount) VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'ADDITIONAL', 1, 40.00, 40.00)`,
    );
    assert.deepEqual(
      { resultado: await outcome(run), liquidacoes: await count(ctx, "SETTLEMENTS"), eventosAuctionSettlement: await eventCount(ctx, "AUCTION_SETTLEMENT") },
      { resultado: "409 concurrent_custody_append", liquidacoes: 0, eventosAuctionSettlement: 0 },
    );
  });

  test("DB-10 · lotAuctionAtomic direto com o livro quitado no banco: 409 auction_debts_settled; segue AUCTION_PREP", async () => {
    const ctx = await seed("DB-10", { status: "AUCTION_ELIGIBLE", enteredAt: ago(0, 2 * HOUR), removal: "settled" });
    await prepViaRepository(ctx, "AUCTION_PREP");
    const result = await outcome(() => auctionRepo.lotAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_PREP", roundNumber: 1, actorId: ctx.userId, occurredAt: new Date() }));
    assert.deepEqual({ resultado: result, estado: (await row(ctx)).status }, { resultado: "409 auction_debts_settled", estado: "AUCTION_PREP" });
  });

  // ────────────────────────────── corridas ──────────────────────────────

  test("K1 · varredura × encerramento em paralelo (6 rodadas): nenhum period_seq repetido, diárias = D, cadeia válida, crédito 3750.00", async () => {
    for (let round = 0; round < 6; round += 1) {
      const ctx = await seed(`K1-${round}`, { status: "AUCTION_ELIGIBLE" });
      const auction = await createDefaultAuctionService();
      const charge = await createDefaultChargeService();
      await lotViaService(ctx);
      await auction.recordSale(actor(ctx), ctx.processId, saleBody());
      const [closing] = await Promise.allSettled([
        auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true }),
        charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined),
      ]);
      assert.equal(closing.status, "fulfilled", `K1 rodada ${round}: o encerramento passa (${closing.status === "rejected" ? reasonOf(closing.reason) : ""})`);
      const seqs = await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$queryRaw<Array<{ period_seq: number }>>`SELECT period_seq FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY'`,
      );
      const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
      assert.deepEqual(
        { diarias: seqs.length, unicas: new Set(seqs.map((item) => item.period_seq)).size, credito: cascadeOf(dist).creditoDoPatio },
        { diarias: 90, unicas: 90, credito: "3750.00" },
        `K1 rodada ${round}`,
      );
      await assertChainValid(ctx);
    }
  });

  test("K2 · uma diária semeada com data depois do frozen_at: o crédito da liquidação não a inclui (3750.00)", async () => {
    const frozenAt = new Date(Date.now() - HOUR);
    const ctx = await seed("K2", { status: "AUCTION_CLOSED", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt });
    await seedSoldAttempt(ctx);
    await seedDailies(ctx, 91);
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.equal(cascadeOf(dist).creditoDoPatio, "3750.00");
  });

  // Modelo por data de calendário: escolhe os fusos A (inicial) e B (novo) e a entrada t0 para que, no instante de
  // agora, o devido em B seja UMA diária a mais que em A.
  function calendarScenario(): { fusoA: string; fusoB: string; t0: Date } {
    const now = new Date();
    const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 90 * MS_PER_DAY;
    return now.getUTCHours() >= 3
      ? { fusoA: "UTC", fusoB: "America/Sao_Paulo", t0: new Date(base + 1 * HOUR) }
      : { fusoA: "America/Sao_Paulo", fusoB: "UTC", t0: new Date(base + 4 * HOUR) };
  }

  test("K3 · o fuso do pátio muda logo depois do fechamento (o devido sobe uma diária): o encerramento recusa com 409 e não congela; a nova chamada lança e passa; o crédito é o devido no fuso novo", async () => {
    const { fusoA, fusoB, t0 } = calendarScenario();
    const ctx = await seed("K3", { status: "AUCTION_ELIGIBLE", model: "CALENDAR", enteredAt: t0, yardTimezone: fusoA });
    const auction = await createDefaultAuctionService();
    const charge = await createDefaultChargeService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    const owedInA = (await charge.getReleaseChargeState(ctx.tenantId, ctx.processId))?.nAccrueAtFreeze ?? -1;
    let switched = false;
    const racing = await prismaAuctionServiceWith({
      closeDailies: async (t, p, now, a) => {
        const result = await charge.accrueProcess(t, p, now, a);
        if (!switched) {
          switched = true;
          await client.$executeRawUnsafe("UPDATE yards SET timezone = $1 WHERE id = $2::uuid", fusoB, ctx.yardId);
        }
        return result;
      },
    });
    const first = await outcome(() => racing.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true }));
    const afterFirst = await row(ctx);
    const firstObserved = { primeira: first.slice(0, 3), estado: afterFirst.status, congelado: afterFirst.frozen_at !== null, portaChamada: switched };
    assert.deepEqual(firstObserved, { primeira: "409", estado: "AUCTIONED", congelado: false, portaChamada: true });
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const owedInB = (await charge.getReleaseChargeState(ctx.tenantId, ctx.processId))?.nAccrueAtFreeze ?? -1;
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(
      { devidoSubiuUma: owedInB === owedInA + 1, diarias: await count(ctx, "DAILY"), credito: cascadeOf(dist).creditoDoPatio },
      { devidoSubiuUma: true, diarias: owedInB, credito: (150 + owedInB * 40).toFixed(2) },
    );
  });

  test("K5 · ADDITIONAL manual × liquidação em paralelo (6 rodadas): ou o crédito inclui o adicional, ou o evento do adicional vem depois do AUCTION_SETTLEMENT", async () => {
    for (let round = 0; round < 6; round += 1) {
      const frozenAt = new Date(Date.now() - HOUR);
      const ctx = await seed(`K5-${round}`, { status: "AUCTION_CLOSED", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt });
      await seedSoldAttempt(ctx);
      const charge = await createDefaultChargeService();
      await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined);
      const settlement = await createDefaultAuctionSettlementService();
      // A recusa 409 concurrent_custody_append manda o chamador tentar de novo (E1.1); a liquidação tenta até 3 vezes.
      const distributeWithRetry = async () => {
        for (let attempt = 0; ; attempt += 1) {
          try {
            return await settlement.distribute(actor(ctx), ctx.processId, {});
          } catch (error) {
            if (attempt >= 2 || (error as { reason?: string }).reason !== "concurrent_custody_append") throw error;
          }
        }
      };
      const [additional, dist] = await Promise.all([
        charge.createManual(actor(ctx), ctx.processId, { kind: "ADDITIONAL", quantity: "1", unit_amount: "40.00", description: "Taxa extra" }),
        distributeWithRetry(),
      ]);
      const chain = await events(ctx);
      const additionalSeq = chain.find((event) => event.payload?.chargeId === additional.id)?.seq ?? -1;
      const settlementSeq = chain.find((event) => event.type === "AUCTION_SETTLEMENT")?.seq ?? -1;
      const credit = cascadeOf(dist).creditoDoPatio;
      const consistent = credit === "3790.00" || (credit === "3750.00" && additionalSeq > settlementSeq);
      assert.equal(consistent, true, `K5 rodada ${round}: crédito ${credit}, adicional seq ${additionalSeq}, liquidação seq ${settlementSeq}`);
    }
  });

  test("K6 · o fuso do pátio muda numa transação aberta enquanto a liquidação grava: a liquidação espera a trava do pátio e recusa 409 concurrent_custody_append", async () => {
    // Congelamento à 01:00 UTC: em America/Sao_Paulo é a data anterior; em UTC, o devido é UMA diária maior.
    const today = new Date();
    const frozenAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - MS_PER_DAY + HOUR);
    const t0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 11 * MS_PER_DAY + 12 * HOUR);
    const fusoA = "America/Sao_Paulo";
    const owedInA = summarizeAccrual({ t0, asOf: frozenAt, timezone: fusoA, model: "CALENDAR", cap: "SIX_MONTHS", suspensions: [] }).nAccrue;
    const owedInB = summarizeAccrual({ t0, asOf: frozenAt, timezone: "UTC", model: "CALENDAR", cap: "SIX_MONTHS", suspensions: [] }).nAccrue;
    assert.equal(owedInB, owedInA + 1, "pré-condição do cenário: o fuso B deve uma diária a mais");
    const ctx = await seed("K6", { status: "AUCTION_CLOSED", model: "CALENDAR", enteredAt: t0, frozenAt, yardTimezone: fusoA });
    await seedSoldAttempt(ctx);
    await seedDailies(ctx, owedInA);
    const holder = holdYardTimezone(ctx.yardId as string, "UTC");
    await holder.updated;
    let finished = false;
    const call = outcome(() => settlementRepo.distributeSettlementAtomic(settlementInput(ctx, 15_000 + owedInA * 4_000, { expectedDailyCount: owedInA, enteredAt: t0, frozenAt }) as never)).then((value) => {
      finished = true;
      return value;
    });
    await sleep(300);
    const pendingWhileHeld = !finished;
    holder.commit();
    await holder.done;
    const result = await call;
    const charge = await createDefaultChargeService();
    const after = await charge.getReleaseChargeState(ctx.tenantId, ctx.processId);
    const claimAfter = await charge.getCascadeExpenseClaim(ctx.tenantId, ctx.processId);
    const stored = await settlementRepo.getByProcess(ctx.tenantId, ctx.processId);
    const property = stored === undefined || (after?.dailyShortfall === 0 && Math.round(Number(stored.settlement.removalStorageClaim) * 100) === claimAfter?.claimCents);
    assert.deepEqual(
      { pendenteComATravaDoPatio: pendingWhileHeld, resultado: result, liquidacoes: await count(ctx, "SETTLEMENTS"), eventosAuctionSettlement: await eventCount(ctx, "AUCTION_SETTLEMENT"), propriedade: property },
      { pendenteComATravaDoPatio: true, resultado: "409 concurrent_custody_append", liquidacoes: 0, eventosAuctionSettlement: 0, propriedade: true },
    );
  });

  test("K6b · processo sem pátio: a liquidação com a base certa passa na primeira chamada (a trava do pátio não inventa recusa)", async () => {
    const { ctx, run } = await settlementDirect("K6b", 0, (c) => ({ expectedDailyCount: 0, enteredAt: c.enteredAt, frozenAt: c.frozenAt }), 15_000, 0);
    assert.deepEqual({ resultado: await outcome(run), liquidacoes: await count(ctx, "SETTLEMENTS") }, { resultado: "aceito", liquidacoes: 1 });
  });

  test("K7 · o fuso do pátio muda numa transação aberta enquanto o encerramento congela: o encerramento espera a trava do pátio e recusa 409 concurrent_custody_append; segue AUCTIONED sem congelar", async () => {
    const today = new Date();
    const occurredAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - MS_PER_DAY + HOUR);
    const t0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 11 * MS_PER_DAY + 12 * HOUR);
    const owedInA = summarizeAccrual({ t0, asOf: occurredAt, timezone: "America/Sao_Paulo", model: "CALENDAR", cap: "SIX_MONTHS", suspensions: [] }).nAccrue;
    const ctx = await seed("K7", { status: "AUCTIONED", model: "CALENDAR", enteredAt: t0, yardTimezone: "America/Sao_Paulo" });
    await seedDailies(ctx, owedInA);
    const holder = holdYardTimezone(ctx.yardId as string, "UTC");
    await holder.updated;
    let finished = false;
    const call = outcome(() => atomicFor("close", ctx, { expectedDailyCount: owedInA, enteredAt: t0, frozenAt: occurredAt }, occurredAt)).then((value) => {
      finished = true;
      return value;
    });
    await sleep(300);
    const pendingWhileHeld = !finished;
    holder.commit();
    await holder.done;
    const result = await call;
    const process = await row(ctx);
    assert.deepEqual(
      { pendenteComATravaDoPatio: pendingWhileHeld, resultado: result, estado: process.status, congelado: process.frozen_at !== null },
      { pendenteComATravaDoPatio: true, resultado: "409 concurrent_custody_append", estado: "AUCTIONED", congelado: false },
    );
  });

  test("K8 · quitação × lote em paralelo (6 rodadas): nunca termina em LOTTED com tudo quitado, nunca SETTLEMENT depois do lote na cadeia", async () => {
    const observed: string[] = [];
    for (let round = 0; round < 6; round += 1) {
      const ctx = await seed(`K8-${round}`, { status: "AUCTION_ELIGIBLE" });
      const auction = await createDefaultAuctionService();
      const charge = await createDefaultChargeService();
      await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined);
      await auction.registerEdict(actor(ctx), ctx.processId, edictBody());
      await auction.setAppraisal(actor(ctx), ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "5000.00" });
      await auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 });
      await Promise.allSettled([charge.settle(actor(ctx), ctx.processId, {}), auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 })]);
      const state = await charge.getReleaseChargeState(ctx.tenantId, ctx.processId);
      const chain = await events(ctx);
      const status = (await row(ctx)).status;
      // O registro do edital também emite AUCTION_LOTTED; o do lote é o último, e só existe se o processo foi a LOTTED.
      const lotSeq = status === "LOTTED" ? (chain.filter((event) => event.type === "AUCTION_LOTTED").at(-1)?.seq ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      const settlementSeq = chain.find((event) => event.type === "SETTLEMENT")?.seq ?? Number.NEGATIVE_INFINITY;
      if ((status === "LOTTED" && state?.debtsSettled === true) || settlementSeq > lotSeq) {
        observed.push(`rodada ${round}: ${status}, quitado=${state?.debtsSettled}, SETTLEMENT seq ${settlementSeq} > lote seq ${lotSeq}`);
      }
    }
    assert.deepEqual(observed, []);
  });

  // ────────────────────────────── E1.4/E2.2 o script de cura da reciclagem ──────────────────────────────

  // E10.3: o script trabalha em UMA organização por execução (`--organizacao <id>` obrigatório); `--descongelar-legado` é
  // o modo da E9.1 (item 7). `organizacao: null` chama o script SEM o argumento (L11g).
  function runCure(apply: boolean, organizacao: string | null, mode: "cura" | "descongelar" = "cura"): { code: number | null; out: string } {
    const args = [
      "--import",
      "tsx",
      "scripts/patio-fechar-diarias-congelados.ts",
      ...(organizacao === null ? [] : ["--organizacao", organizacao]),
      ...(mode === "descongelar" ? ["--descongelar-legado"] : []),
      ...(apply ? ["--aplicar"] : []),
    ];
    const result = spawnSync(process.execPath, args, { env: process.env, encoding: "utf8", timeout: 300_000 });
    return { code: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
  }

  async function frozenRecycling(label: string, tariff: boolean): Promise<Ctx> {
    const frozenAt = new Date(Date.now() - HOUR);
    return seed(label, { status: "DIRECT_RECYCLING", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt, tariff });
  }

  async function seedSettlementRow(ctx: Ctx, claim = "150.00"): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`
        INSERT INTO settlements (tenant_id, process_id, sold_round, hammer_amount, removal_storage_claim, owner_balance_amount, shortfall_amount, currency, status)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 1, 8000.00, ${claim}::numeric, (8000.00 - ${claim}::numeric), 0, 'BRL', 'DISTRIBUTED')`,
    );
  }

  test("L11a · duas reciclagens congeladas com 90 devidas e 0 no livro (uma com tarifa, outra sem, cada uma na sua organização): sem --aplicar nada é gravado; com --aplicar 90 na primeira (3750.00, seção curáveis), a segunda listada como não lançável e saída ≠ 0", async () => {
    const withTariff = await frozenRecycling("L11a-t", true);
    const withoutTariff = await frozenRecycling("L11a-s", false);
    const dryWith = runCure(false, withTariff.tenantId);
    const dryWithout = runCure(false, withoutTariff.tenantId);
    const afterDry = { comTarifa: await count(withTariff, "DAILY"), semTarifa: await count(withoutTariff, "DAILY"), listaOsDois: dryWith.out.includes(withTariff.processId) && dryWithout.out.includes(withoutTariff.processId) };
    const applied = runCure(true, withTariff.tenantId);
    const appliedWithout = runCure(true, withoutTariff.tenantId);
    const statement = await (await createDefaultChargeService()).getStatement(actor(withTariff), withTariff.processId);
    assert.deepEqual(
      {
        afterDry,
        diariasComTarifa: await count(withTariff, "DAILY"),
        total: statement.total,
        secaoCuraveis: applied.out.includes("curáveis") && applied.out.includes(withTariff.processId),
        semTarifaListado: appliedWithout.out.includes(withoutTariff.processId),
        saidaNaoZero: appliedWithout.code !== 0 && appliedWithout.code !== null,
      },
      { afterDry: { comTarifa: 0, semTarifa: 0, listaOsDois: true }, diariasComTarifa: 90, total: "3750.00", secaoCuraveis: true, semTarifaListado: true, saidaNaoZero: true },
      `saída do script: código ${appliedWithout.code}; ${appliedWithout.out.slice(0, 300)}`,
    );
  });

  test("L11b · leilão já liquidado com livro incompleto: com --aplicar nenhuma linha nova, nenhum CHARGE_ACCRUAL; listado em 'liquidados com livro incompleto' com 3600.00; saída ≠ 0", async () => {
    const frozenAt = new Date(Date.now() - HOUR);
    const ctx = await seed("L11b", { status: "AUCTION_CLOSED", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt });
    await seedSoldAttempt(ctx);
    await seedSettlementRow(ctx);
    const applied = runCure(true, ctx.tenantId);
    assert.deepEqual(
      { diarias: await count(ctx, "DAILY"), chargeAccrual: await eventCount(ctx, "CHARGE_ACCRUAL"), listado: applied.out.includes(ctx.processId) && applied.out.includes("liquidados com livro incompleto") && applied.out.includes("3600.00"), saidaNaoZero: applied.code !== 0 && applied.code !== null },
      { diarias: 0, chargeAccrual: 0, listado: true, saidaNaoZero: true },
      `saída do script: código ${applied.code}; ${applied.out.slice(0, 300)}`,
    );
  });

  test("L11c · leilão AUCTIONED congelado, sem liquidação: com --aplicar nenhuma linha nova; listado em 'serão fechados na liquidação'", async () => {
    const frozenAt = new Date(Date.now() - HOUR);
    const ctx = await seed("L11c", { status: "AUCTIONED", enteredAt: new Date(frozenAt.getTime() - 90 * MS_PER_DAY - 2 * HOUR), frozenAt });
    const applied = runCure(true, ctx.tenantId);
    assert.deepEqual(
      { diarias: await count(ctx, "DAILY"), listado: applied.out.includes(ctx.processId) && applied.out.includes("serão fechados na liquidação") },
      { diarias: 0, listado: true },
      `saída do script: código ${applied.code}; ${applied.out.slice(0, 300)}`,
    );
  });

  test("L11d · --aplicar duas vezes: a segunda não cria linha nenhuma", async () => {
    const ctx = await frozenRecycling("L11d", true);
    runCure(true, ctx.tenantId);
    const afterFirst = await count(ctx, "LINES");
    const second = runCure(true, ctx.tenantId);
    assert.deepEqual({ diariasDepoisDa1a: await count(ctx, "DAILY"), linhasIguais: (await count(ctx, "LINES")) === afterFirst }, { diariasDepoisDa1a: 90, linhasIguais: true }, `saída: código ${second.code}; ${second.out.slice(0, 300)}`);
  });

  test("L11e · DIRECT_RECYCLING com uma liquidação semeada à mão (estado que o produto não gera): --aplicar não lança nada", async () => {
    const ctx = await frozenRecycling("L11e", true);
    await seedSettlementRow(ctx);
    const applied = runCure(true, ctx.tenantId);
    assert.deepEqual({ diarias: await count(ctx, "DAILY"), scriptExiste: !applied.out.includes("Cannot find module") }, { diarias: 0, scriptExiste: true }, `saída: código ${applied.code}; ${applied.out.slice(0, 300)}`);
  });

  // ────────────────────────────── F1b: E10.3 uma organização por execução; E9.1 item 7 o modo de descongelar ──────────────────────────────

  // Uma organização com um processo curável (reciclagem congelada, 90 devidas e 0 no livro, com tarifa) e um processo
  // descongelável (em lote, congelado há 5 dias, sem liquidação nem liberação em curso).
  async function orgWithCurableAndThawable(label: string): Promise<{ curable: Ctx; thawable: Ctx }> {
    const curable = await frozenRecycling(`${label}-c`, true);
    const thawable = await addProcess(curable, { status: "LOTTED", enteredAt: ago(10), frozenAt: new Date(Date.now() - LEGACY_FROZEN_DAYS * MS_PER_DAY) });
    return { curable, thawable };
  }

  async function snapshotOf(ctx: Ctx): Promise<{ linhas: number; eventos: number; congelado: number | null }> {
    return { linhas: await count(ctx, "LINES"), eventos: (await events(ctx)).length, congelado: await frozenMs(ctx) };
  }

  test("L11f · duas organizações; o script com --organizacao A --aplicar nos dois modos: A é curada e descongelada; em B nenhuma linha nova, nenhum evento novo, frozen_at intocado; o relatório não cita nenhum id de B", async () => {
    const a = await orgWithCurableAndThawable("L11f-A");
    const b = await orgWithCurableAndThawable("L11f-B");
    const beforeB = { curavel: await snapshotOf(b.curable), descongelavel: await snapshotOf(b.thawable) };
    const cure = runCure(true, a.curable.tenantId, "cura");
    const thaw = runCure(true, a.curable.tenantId, "descongelar");
    const out = `${cure.out}
${thaw.out}`;
    assert.deepEqual(
      {
        diariasCuradasEmA: await count(a.curable, "DAILY"),
        descongeladoEmA: (await row(a.thawable)).frozen_at === null,
        organizacaoNoRelatorio: cure.out.includes(a.curable.tenantId) && thaw.out.includes(a.curable.tenantId),
        b: { curavel: await snapshotOf(b.curable), descongelavel: await snapshotOf(b.thawable) },
        relatorioCitaB: out.includes(b.curable.processId) || out.includes(b.thawable.processId) || out.includes(b.curable.tenantId),
      },
      { diariasCuradasEmA: 90, descongeladoEmA: true, organizacaoNoRelatorio: true, b: beforeB, relatorioCitaB: false },
      `cura: código ${cure.code}; descongelar: código ${thaw.code}; ${out.slice(0, 300)}`,
    );
  });

  test("L11g · sem --organizacao: código de saída 2, a mensagem 'informe --organizacao', e nenhuma gravação em nenhuma das duas organizações", async () => {
    const a = await orgWithCurableAndThawable("L11g-A");
    const b = await orgWithCurableAndThawable("L11g-B");
    const before = { a: [await snapshotOf(a.curable), await snapshotOf(a.thawable)], b: [await snapshotOf(b.curable), await snapshotOf(b.thawable)] };
    const cure = runCure(true, null, "cura");
    const thaw = runCure(true, null, "descongelar");
    assert.deepEqual(
      {
        codigoCura: cure.code,
        codigoDescongelar: thaw.code,
        mensagem: cure.out.includes("informe --organizacao") && thaw.out.includes("informe --organizacao"),
        depois: { a: [await snapshotOf(a.curable), await snapshotOf(a.thawable)], b: [await snapshotOf(b.curable), await snapshotOf(b.thawable)] },
      },
      { codigoCura: 2, codigoDescongelar: 2, mensagem: true, depois: before },
      `${cure.out.slice(0, 200)} | ${thaw.out.slice(0, 200)}`,
    );
  });

  test("W7 · --descongelar-legado --aplicar numa organização: os cinco estados congelados (custódia, elegível, preparação, lote, arrematado) ficam com frozen_at nulo; o RELEASE_IN_PROGRESS e o LOTTED com liberação em curso ficam intocados e listados; nenhuma diária lançada; a 2ª execução não altera nada", async () => {
    const legacy = new Date(Date.now() - LEGACY_FROZEN_DAYS * MS_PER_DAY);
    const first = await seed("W7", { status: "ACTIVE_CUSTODY", enteredAt: ago(10), frozenAt: legacy });
    const thawable = [first];
    for (const status of ["AUCTION_ELIGIBLE", "AUCTION_PREP", "LOTTED", "AUCTIONED"] as const) {
      thawable.push(await addProcess(first, { status, frozenAt: legacy }));
    }
    const inRelease = await addProcess(first, { status: "RELEASE_IN_PROGRESS", frozenAt: legacy });
    await seedActiveRelease(inRelease);
    const lottedWithRelease = await addProcess(first, { status: "LOTTED", frozenAt: legacy });
    await seedActiveRelease(lottedWithRelease);
    const run1 = runCure(true, first.tenantId, "descongelar");
    const afterFirst = {
      cincoDescongelados: await Promise.all(thawable.map(async (ctx) => (await row(ctx)).frozen_at === null)),
      liberacaoIntocada: (await frozenMs(inRelease)) === legacy.getTime(),
      loteComLiberacaoIntocado: (await frozenMs(lottedWithRelease)) === legacy.getTime(),
      listados: run1.out.includes(inRelease.processId) && run1.out.includes(lottedWithRelease.processId),
      secaoDescongelaveis: run1.out.includes("descongeláveis") && thawable.every((ctx) => run1.out.includes(ctx.processId)),
      diarias: (await Promise.all([...thawable, inRelease, lottedWithRelease].map((ctx) => count(ctx, "DAILY")))).reduce((acc, n) => acc + n, 0),
    };
    const snapshot = async () => Promise.all([...thawable, inRelease, lottedWithRelease].map((ctx) => snapshotOf(ctx)));
    const beforeSecond = await snapshot();
    const run2 = runCure(true, first.tenantId, "descongelar");
    assert.deepEqual(
      { afterFirst, segundaIgual: JSON.stringify(await snapshot()) === JSON.stringify(beforeSecond) },
      {
        afterFirst: { cincoDescongelados: [true, true, true, true, true], liberacaoIntocada: true, loteComLiberacaoIntocado: true, listados: true, secaoDescongelaveis: true, diarias: 0 },
        segundaIgual: true,
      },
      `1ª: código ${run1.code}; 2ª: código ${run2.code}; ${run1.out.slice(0, 300)}`,
    );
  });

  // ────────────────────────────── E3.3 elegibilidade e E6.1 custódia documentada ──────────────────────────────

  test("E1 · elegibilidade sem serviço de diária: 409 auction_daily_charges_unpostable; segue ACTIVE_CUSTODY; nenhum evento novo", async () => {
    const ctx = await seed("E1", { tariff: false });
    const before = (await events(ctx)).length;
    const result = await outcome(async () => (await createDefaultAuctionService()).markEligible(actor(ctx), ctx.processId));
    assert.deepEqual(
      { resultado: result, estado: (await row(ctx)).status, eventosNovos: (await events(ctx)).length - before },
      { resultado: "409 auction_daily_charges_unpostable", estado: "ACTIVE_CUSTODY", eventosNovos: 0 },
    );
  });

  test("E2 · elegibilidade com tarifa e 0 diárias: lança as 90 e passa; frozen_at nulo; segue candidato da varredura", async () => {
    const ctx = await seed("E2");
    const view = await (await createDefaultAuctionService()).markEligible(actor(ctx), ctx.processId);
    assert.deepEqual(
      { estado: view.status, diarias: await count(ctx, "DAILY"), congelado: (await row(ctx)).frozen_at !== null, candidato: await isSweepCandidate(ctx) },
      { estado: "AUCTION_ELIGIBLE", diarias: 90, congelado: false, candidato: true },
    );
  });

  test("E3 · elegibilidade com porta de fechamento que não lança e 90 devidas: 409 auction_daily_charges_missing", async () => {
    const ctx = await seed("E3");
    const service = await prismaAuctionServiceWith({ closeDailies: NO_OP_CLOSING });
    const result = await outcome(() => service.markEligible(actor(ctx), ctx.processId));
    assert.deepEqual({ resultado: result, estado: (await row(ctx)).status }, { resultado: "409 auction_daily_charges_missing", estado: "ACTIVE_CUSTODY" });
  });

  test("E4 · ordem: sem tarifa e com menos de 60 dias, a razão é auction_deadline_not_reached", async () => {
    const ctx = await seed("E4", { tariff: false, enteredAt: ago(30) });
    assert.equal(await outcome(async () => (await createDefaultAuctionService()).markEligible(actor(ctx), ctx.processId)), "409 auction_deadline_not_reached");
  });

  test("C1 · controle: seis portões, vistoria completa, pátio, remoção e tarifa: fica elegível", async () => {
    const ctx = await seed("C1");
    assert.equal((await (await createDefaultAuctionService()).markEligible(actor(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
  });

  test("C2 · sem vistoria completa: 409 auction_custody_inspection_incomplete; completa e tenta de novo: passa", async () => {
    const ctx = await seed("C2", { inspection: false });
    const auction = await createDefaultAuctionService();
    const first = await outcome(() => auction.markEligible(actor(ctx), ctx.processId));
    assert.deepEqual({ resultado: first, estado: (await row(ctx)).status }, { resultado: "409 auction_custody_inspection_incomplete", estado: "ACTIVE_CUSTODY" });
    await completeInspection(ctx);
    assert.equal((await auction.markEligible(actor(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
  });

  test("C3 · sem pátio: 409 auction_custody_yard_missing; atribui e tenta de novo: passa", async () => {
    const ctx = await seed("C3", { yard: false });
    const auction = await createDefaultAuctionService();
    const first = await outcome(() => auction.markEligible(actor(ctx), ctx.processId));
    assert.deepEqual({ resultado: first, estado: (await row(ctx)).status }, { resultado: "409 auction_custody_yard_missing", estado: "ACTIVE_CUSTODY" });
    await assignYard(ctx);
    assert.equal((await auction.markEligible(actor(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
  });

  test("C4 · sem remoção lançada: 409 auction_custody_removal_charge_missing; lança e tenta de novo: passa", async () => {
    const ctx = await seed("C4", { removal: false });
    const auction = await createDefaultAuctionService();
    const first = await outcome(() => auction.markEligible(actor(ctx), ctx.processId));
    assert.deepEqual({ resultado: first, estado: (await row(ctx)).status }, { resultado: "409 auction_custody_removal_charge_missing", estado: "ACTIVE_CUSTODY" });
    await addRemoval(ctx);
    assert.equal((await auction.markEligible(actor(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
  });

  test("C5 · ordem: faltam vistoria, pátio, remoção e tarifa: a razão é a da vistoria", async () => {
    const ctx = await seed("C5", { inspection: false, yard: false, removal: false, tariff: false });
    assert.equal(await outcome(async () => (await createDefaultAuctionService()).markEligible(actor(ctx), ctx.processId)), "409 auction_custody_inspection_incomplete");
  });

  test("C6 · lote de processo em AUCTION_PREP sem pátio: 409 auction_custody_yard_missing; segue AUCTION_PREP", async () => {
    const ctx = await seed("C6", { status: "AUCTION_ELIGIBLE", yard: false });
    await prepViaRepository(ctx, "AUCTION_PREP");
    const result = await outcome(async () => (await createDefaultAuctionService()).lotForAuction(actor(ctx), ctx.processId, { round_number: 1 }));
    assert.deepEqual({ resultado: result, estado: (await row(ctx)).status }, { resultado: "409 auction_custody_yard_missing", estado: "AUCTION_PREP" });
  });

  // ────────────────────────────── E5.2/E5.3 quitação e lista do leilão ──────────────────────────────

  type WithdrawCapable = { withdrawSettled: (actor: Actor, processId: string, body: Record<string, unknown>) => Promise<{ status: string }> };

  test("Q1 · em preparação e quitado: o lote recusa 409 auction_debts_settled; withdraw-settled devolve à custódia com settled_before_auction; a liberação segue até o fim", async () => {
    const ctx = await seed("Q1", { status: "AUCTION_ELIGIBLE" });
    await prepViaRepository(ctx, "AUCTION_PREP");
    await quitAll(ctx);
    const auction = await createDefaultAuctionService();
    const lot = await outcome(() => auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 }));
    assert.deepEqual({ lote: lot, estado: (await row(ctx)).status }, { lote: "409 auction_debts_settled", estado: "AUCTION_PREP" });
    const withdrawn = await (auction as unknown as WithdrawCapable).withdrawSettled(actor(ctx), ctx.processId, {});
    assert.equal(withdrawn.status, "ACTIVE_CUSTODY");
    assert.equal((await events(ctx)).some((event) => event.payload?.reason === "settled_before_auction"), true, "motivo na cadeia");
    const release = await createDefaultReleaseService();
    await release.start(actor(ctx) as never, ctx.processId, { recipient_name: "Dono" });
    await release.approve(actor(ctx) as never, ctx.processId, { authority_reference: "AUT-1" });
    await release.consume(actor(ctx) as never, ctx.processId);
    assert.equal((await row(ctx)).status, "RELEASED");
  });

  test("Q2 · em lote: a quitação recusa 409 settle_after_auction_list; nenhuma linha quitada; nenhum SETTLEMENT", async () => {
    const ctx = await seed("Q2", { status: "AUCTION_ELIGIBLE" });
    await prepViaRepository(ctx, "LOTTED");
    const result = await outcome(async () => (await createDefaultChargeService()).settle(actor(ctx), ctx.processId, {}));
    assert.deepEqual(
      { resultado: result, quitadas: await count(ctx, "SETTLED_LINES"), eventosSettlement: await eventCount(ctx, "SETTLEMENT") },
      { resultado: "409 settle_after_auction_list", quitadas: 0, eventosSettlement: 0 },
    );
  });

  test("Q2b · em AUCTIONED e em AUCTION_CLOSED: a quitação recusa 409 settle_after_auction_list", async () => {
    const results: Record<string, string> = {};
    for (const status of ["AUCTIONED", "AUCTION_CLOSED"] as const) {
      const ctx = await seed(`Q2b-${status}`, { status, frozenAt: status === "AUCTION_CLOSED" ? new Date() : null });
      results[status] = await outcome(async () => (await createDefaultChargeService()).settle(actor(ctx), ctx.processId, {}));
    }
    assert.deepEqual(results, { AUCTIONED: "409 settle_after_auction_list", AUCTION_CLOSED: "409 settle_after_auction_list" });
  });

  // E10.1: Q2c é CONTROLE (verde antes e depois). A cobrança on-line só nasce em liberação; em lote, arrematado e
  // encerrado o portão que existe já recusa com 422 release_not_started, e nenhuma cobrança é criada.
  test("Q2c · controle: em LOTTED, AUCTIONED e AUCTION_CLOSED a criação de cobrança on-line recusa 422 release_not_started; nenhuma cobrança criada", async () => {
    const observed: Record<string, unknown> = {};
    for (const status of ["LOTTED", "AUCTIONED", "AUCTION_CLOSED"] as const) {
      const ctx = await seed(`Q2c-${status}`, { status, frozenAt: status === "AUCTION_CLOSED" ? new Date() : null });
      const service = new ImpoundPaymentService(
        await createPrismaImpoundPaymentRepository(),
        { resolve: async (tenantId: string) => ({ ok: true, account: { scope: "organization", connectionId: randomUUID(), ownerTenantId: tenantId }, provider: "asaas", methods: PAYMENT_METHODS }) } as never,
        { isEnabled: async () => true },
      );
      const result = await outcome(() => service.create({ tenantId: ctx.tenantId, userId: ctx.userId, roles: ["manager"], permissions: [] } as never, ctx.processId, { payerName: "Maria da Silva", payerDocument: "529.982.247-25" }));
      const intents = await withTenantRls(client, ctx.tenantId, (tx) => tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM impound_payment_intents WHERE tenant_id = ${ctx.tenantId}::uuid`);
      observed[status] = { resultado: result, cobrancas: intents[0]?.n ?? 0 };
    }
    const expected = { resultado: "422 release_not_started", cobrancas: 0 };
    assert.deepEqual(observed, { LOTTED: expected, AUCTIONED: expected, AUCTION_CLOSED: expected });
  });

  test("Q3 · controle: elegível e em preparação, a quitação é aceita", async () => {
    const eligible = await seed("Q3-e", { status: "AUCTION_ELIGIBLE" });
    const prep = await seed("Q3-p", { status: "AUCTION_ELIGIBLE" });
    await prepViaRepository(prep, "AUCTION_PREP");
    const charge = await createDefaultChargeService();
    assert.deepEqual(
      { elegivel: await outcome(() => charge.settle(actor(eligible), eligible.processId, {})), preparacao: await outcome(() => charge.settle(actor(prep), prep.processId, {})) },
      { elegivel: "aceito", preparacao: "aceito" },
    );
  });

  test("Q4 · elegível e quitado: a preparação recusa 409 auction_debts_settled; withdraw-settled funciona", async () => {
    const ctx = await seed("Q4", { status: "AUCTION_ELIGIBLE" });
    await quitAll(ctx);
    const auction = await createDefaultAuctionService();
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody());
    await auction.setAppraisal(actor(ctx), ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "5000.00" });
    const prep = await outcome(() => auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 }));
    assert.deepEqual({ preparacao: prep, estado: (await row(ctx)).status }, { preparacao: "409 auction_debts_settled", estado: "AUCTION_ELIGIBLE" });
    assert.equal((await (auction as unknown as WithdrawCapable).withdrawSettled(actor(ctx), ctx.processId, {})).status, "ACTIVE_CUSTODY");
  });

  test("Q5 · withdraw-settled com débito em aberto, pelo serviço e pelo atômico direto: 409 auction_withdraw_not_settled; estado intocado", async () => {
    const ctx = await seed("Q5", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    const viaService = await outcome(async () => (auction as unknown as WithdrawCapable).withdrawSettled(actor(ctx), ctx.processId, {}));
    const repo = auctionRepo as unknown as { withdrawSettledAtomic: (input: unknown) => Promise<unknown> };
    const viaAtomic = await outcome(async () => repo.withdrawSettledAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", actorId: ctx.userId, occurredAt: new Date() }));
    assert.deepEqual(
      { servico: viaService, atomico: viaAtomic, estado: (await row(ctx)).status },
      { servico: "409 auction_withdraw_not_settled", atomico: "409 auction_withdraw_not_settled", estado: "AUCTION_ELIGIBLE" },
    );
  });

  test("Q6 · pagou parte antes da lista (remoção + 50 diárias) e não quitou: vai a leilão; crédito só o em aberto 1600.00, saldo 6400.00", async () => {
    const ctx = await seed("Q6", { status: "AUCTION_ELIGIBLE" });
    const charge = await createDefaultChargeService();
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(Date.now() - 40 * MS_PER_DAY), ctx.userId);
    await charge.settle(actor(ctx), ctx.processId, { note: "pagou parte" });
    const auction = await createDefaultAuctionService();
    await lotViaService(ctx);
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(cascadeOf(dist), { creditoDoPatio: "1600.00", saldoDoExDono: "6400.00", somaDoRateioIgualAoLance: true });
  });

  test("Q7 · withdraw-settled a partir de LOTTED: 409 invalid_transition; segue LOTTED", async () => {
    const ctx = await seed("Q7", { status: "AUCTION_ELIGIBLE" });
    await prepViaRepository(ctx, "LOTTED");
    const result = await outcome(async () => ((await createDefaultAuctionService()) as unknown as WithdrawCapable).withdrawSettled(actor(ctx), ctx.processId, {}));
    assert.deepEqual({ resultado: result, estado: (await row(ctx)).status }, { resultado: "409 invalid_transition", estado: "LOTTED" });
  });

  test("Q8 · lote com cobrança on-line viva: 409 lot_payment_pending; segue AUCTION_PREP", async () => {
    const ctx = await seed("Q8", { status: "AUCTION_ELIGIBLE" });
    await prepViaRepository(ctx, "AUCTION_PREP");
    // A cobrança viva é semeada à mão (o produto só a cria em liberação; o caso guarda o lote contra a que sobrou viva).
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(
        `INSERT INTO impound_payment_intents (tenant_id, process_id, status, amount, methods, payer_name, payer_document, provider, payment_connection_id, expires_at, settled_charge_ids)
         VALUES ($1::uuid, $2::uuid, 'pending', 150.00, ARRAY['pix'], 'Maria', '52998224725', 'asaas', $3::uuid, now() + interval '1 day', ARRAY[]::uuid[])`,
        ctx.tenantId,
        ctx.processId,
        randomUUID(),
      );
    });
    const result = await outcome(async () => (await createDefaultAuctionService()).lotForAuction(actor(ctx), ctx.processId, { round_number: 1 }));
    assert.deepEqual({ resultado: result, estado: (await row(ctx)).status }, { resultado: "409 lot_payment_pending", estado: "AUCTION_PREP" });
  });

  // ────────────────────────────── F1b: E8.3 o resgate e a inadimplência desfazem o congelamento legado ──────────────────────────────

  const reclaimBody = { reason: "Dono apresentou a documentação" };

  test("V1 · (C2-07) resgate de processo em lote congelado há 5 dias (entrada há 10 dias e 2 h, 5 diárias no livro): frozen_at nulo e candidato logo depois do resgate; a liberação cobra 5 diárias, total 200.00", async () => {
    const ctx = await seedLegacyFrozen("V1", "LOTTED");
    assert.equal(await count(ctx, "DAILY"), 5, "pré-condição: o legado tem as 5 diárias até o congelamento");
    await (await createDefaultAuctionService()).reclaim(actor(ctx), ctx.processId, reclaimBody);
    const afterReclaim = { estado: (await row(ctx)).status, congelado: (await row(ctx)).frozen_at !== null, candidato: await isSweepCandidate(ctx) };
    const start = await outcome(async () => (await createDefaultReleaseService()).start(actor(ctx) as never, ctx.processId, { recipient_name: "Dono" }));
    assert.deepEqual(
      { afterReclaim, liberacao: start, diarias: await count(ctx, "DAILY"), totalDiarias: await dailyTotal(ctx) },
      { afterReclaim: { estado: "ACTIVE_CUSTODY", congelado: false, candidato: true }, liberacao: "aceito", diarias: 5, totalDiarias: "200.00" },
    );
    await assertChainValid(ctx);
  });

  test("V2 · controle: resgate de processo em lote SEM congelamento: frozen_at segue nulo; a mesma resposta de hoje (ACTIVE_CUSTODY)", async () => {
    const ctx = await seed("V2", { status: "LOTTED", enteredAt: ago(10) });
    const view = await (await createDefaultAuctionService()).reclaim(actor(ctx), ctx.processId, reclaimBody);
    assert.deepEqual({ resposta: view.status, estado: (await row(ctx)).status, congelado: (await row(ctx)).frozen_at !== null }, { resposta: "ACTIVE_CUSTODY", estado: "ACTIVE_CUSTODY", congelado: false });
  });

  test("V3 · inadimplência de processo arrematado e congelado há 5 dias: volta ao lote com frozen_at nulo e candidato da varredura", async () => {
    const ctx = await seedLegacyFrozen("V3", "AUCTIONED");
    await seedSoldAttempt(ctx);
    const result = await (await createDefaultAuctionService()).defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    assert.deepEqual(
      { resposta: result.status, criado: result.created, estado: (await row(ctx)).status, congelado: (await row(ctx)).frozen_at !== null, candidato: await isSweepCandidate(ctx) },
      { resposta: "LOTTED", criado: true, estado: "LOTTED", congelado: false, candidato: true },
    );
  });

  test("V4 · resgate × varredura em paralelo (6 rodadas) sobre o legado congelado: nenhum period_seq repetido; cadeia válida; ao fim, 5 diárias", async () => {
    const observed: string[] = [];
    for (let round = 0; round < 6; round += 1) {
      const ctx = await seedLegacyFrozen(`V4-${round}`, "LOTTED");
      const auction = await createDefaultAuctionService();
      const charge = await createDefaultChargeService();
      const [reclaim] = await Promise.allSettled([auction.reclaim(actor(ctx), ctx.processId, reclaimBody), charge.accrueTenantScan(ctx.tenantId, new Date())]);
      await charge.accrueTenantScan(ctx.tenantId, new Date());
      const seqs = await dailySeqs(ctx);
      const line = `rodada ${round}: resgate ${reclaim.status === "fulfilled" ? "aceito" : reasonOf(reclaim.reason)}, diarias ${seqs.length}, unicas ${new Set(seqs).size}`;
      if (reclaim.status !== "fulfilled" || seqs.length !== 5 || new Set(seqs).size !== 5) observed.push(line);
      await assertChainValid(ctx);
    }
    assert.deepEqual(observed, []);
  });

  // ────────────────────────────── F1b: E9.4 os congelamentos legados convergem para a P7 ──────────────────────────────

  test("W1 · legado AUCTIONED congelado há 5 dias (venda de 8000.00, 5 diárias), pagamento confirmado agora: frozen_at = instante do encerramento; 5 diárias, period_seq 1 a 5; crédito 350.00, saldo 7650.00", async () => {
    const ctx = await seedLegacyFrozen("W1", "AUCTIONED");
    await seedSoldAttempt(ctx);
    assert.equal(await count(ctx, "DAILY"), 5, "pré-condição: 5 diárias no livro");
    await (await createDefaultAuctionService()).closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const frozenAtClose = (await frozenMs(ctx)) === (await lastEventAt(ctx, "AUCTION_CLOSED"));
    const seqs = await dailySeqs(ctx);
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(
      { congelamentoNoEncerramento: frozenAtClose, seqs, ...cascadeOf(dist) },
      { congelamentoNoEncerramento: true, seqs: [1, 2, 3, 4, 5], creditoDoPatio: "350.00", saldoDoExDono: "7650.00", somaDoRateioIgualAoLance: true },
    );
  });

  test("W2 · ESTADO SEMEADO (P-LEILAO-REVENDA-SEM-CAMINHO): legado LOTTED congelado há 5 dias com a venda antiga e a inadimplência gravadas e a rodada 3 em lote: o recordSale descongela e mantém 5; o encerramento congela no instante dele; 5 sem repetição; crédito 350.00, saldo 7650.00", async () => {
    const ctx = await seedLegacyFrozen("W2", "LOTTED");
    await seedSoldAttempt(ctx);
    await seedNoPaymentAttempt(ctx, 2, 1);
    await seedEdictSql(ctx, 1, "CLOSED");
    await seedEdictSql(ctx, 3, "LOTTED");
    assert.equal(await count(ctx, "DAILY"), 5, "pré-condição: 5 diárias no livro");
    const auction = await createDefaultAuctionService();
    const sale = await outcome(() => auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 3)));
    const afterSale = { arremate: sale, congelado: (await row(ctx)).frozen_at !== null, diarias: await count(ctx, "DAILY") };
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 3, payment_confirmed: true });
    const frozenAtClose = (await frozenMs(ctx)) === (await lastEventAt(ctx, "AUCTION_CLOSED"));
    const seqs = await dailySeqs(ctx);
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(
      { afterSale, congelamentoNoEncerramento: frozenAtClose, seqs, ...cascadeOf(dist) },
      { afterSale: { arremate: "aceito", congelado: false, diarias: 5 }, congelamentoNoEncerramento: true, seqs: [1, 2, 3, 4, 5], creditoDoPatio: "350.00", saldoDoExDono: "7650.00", somaDoRateioIgualAoLance: true },
    );
  });

  for (const [id, missing, reason] of [
    ["W3-D", "inspection", "auction_custody_inspection_incomplete"],
    ["W3-E", "yard", "auction_custody_yard_missing"],
    ["W3-G", "removal", "auction_custody_removal_charge_missing"],
  ] as const) {
    test(`${id} · legado LOTTED com tarifa e diárias em dia, sem ${missing}: o arremate recusa 409 ${reason}; segue LOTTED; nenhum SOLD; cadeia igual; completa e tenta de novo: vende`, async () => {
      const ctx = await seed(id, { status: "LOTTED", [missing]: false });
      await seedEdictSql(ctx, 1, "LOTTED");
      await (await createDefaultChargeService()).accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
      const eventsBefore = (await events(ctx)).length;
      const auction = await createDefaultAuctionService();
      const first = await outcome(() => auction.recordSale(actor(ctx), ctx.processId, saleBody()));
      const afterFirst = { resultado: first, estado: (await row(ctx)).status, vendas: await count(ctx, "SOLD"), eventosNovos: (await events(ctx)).length - eventsBefore };
      if (missing === "inspection") await completeInspection(ctx);
      if (missing === "yard") await assignYard(ctx);
      if (missing === "removal") await addRemoval(ctx);
      const retry = await outcome(() => auction.recordSale(actor(ctx), ctx.processId, saleBody()));
      assert.deepEqual(
        { afterFirst, depoisDeCompletar: retry, estadoFinal: (await row(ctx)).status },
        { afterFirst: { resultado: `409 ${reason}`, estado: "LOTTED", vendas: 0, eventosNovos: 0 }, depoisDeCompletar: "aceito", estadoFinal: "AUCTIONED" },
      );
    });
  }

  test("W4 · legado AUCTION_ELIGIBLE congelado há 5 dias (2 leilões desertos, 5 diárias): a reciclagem congela no instante do ato; 10 diárias; total do livro 550.00", async () => {
    const ctx = await seedLegacyFrozen("W4", "AUCTION_ELIGIBLE");
    await twoDesertedRounds(ctx);
    const view = await (await createDefaultAuctionService()).reclassifyScrap(actor(ctx), ctx.processId);
    const statement = await (await createDefaultChargeService()).getStatement(actor(ctx), ctx.processId);
    assert.deepEqual(
      { estado: view.status, congelamentoNoAto: (await frozenMs(ctx)) === (await lastEventAt(ctx, "STATUS_CHANGE")), diarias: await count(ctx, "DAILY"), total: statement.total },
      { estado: "DIRECT_RECYCLING", congelamentoNoAto: true, diarias: 10, total: "550.00" },
    );
  });

  test("W4b · legado ACTIVE_CUSTODY congelado há 5 dias (5 diárias): a reciclagem por inservibilidade congela no instante do ato; 10 diárias; total do livro 550.00", async () => {
    const ctx = await seedLegacyFrozen("W4b", "ACTIVE_CUSTODY");
    const view = await (await createDefaultAuctionService()).reclassifyUnrecoverable(actor(ctx), ctx.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada, sem condição de circular" });
    const statement = await (await createDefaultChargeService()).getStatement(actor(ctx), ctx.processId);
    assert.deepEqual(
      { estado: view.status, congelamentoNoAto: (await frozenMs(ctx)) === (await lastEventAt(ctx, "STATUS_CHANGE")), diarias: await count(ctx, "DAILY"), total: statement.total },
      { estado: "DIRECT_RECYCLING", congelamentoNoAto: true, diarias: 10, total: "550.00" },
    );
  });

  type ThawCapable = { thawLegacyFreezeAtomic: (tenantId: string, processId: string) => Promise<boolean> };

  async function valueOrReason(run: () => Promise<unknown>): Promise<unknown> {
    try {
      return await run();
    } catch (error) {
      return reasonOf(error);
    }
  }

  test("W5 · controle do descongelamento: thawLegacyFreezeAtomic direto num RELEASE_IN_PROGRESS congelado e num AUCTION_CLOSED congelado devolve false; frozen_at intocado nos dois", async () => {
    const legacy = new Date(Date.now() - LEGACY_FROZEN_DAYS * MS_PER_DAY);
    const inRelease = await seed("W5-r", { status: "RELEASE_IN_PROGRESS", enteredAt: ago(10), frozenAt: legacy });
    await seedActiveRelease(inRelease);
    const closed = await seed("W5-c", { status: "AUCTION_CLOSED", enteredAt: ago(10), frozenAt: legacy });
    await seedSoldAttempt(closed);
    const repo = auctionRepo as unknown as ThawCapable;
    const observed = {
      liberacao: await valueOrReason(() => repo.thawLegacyFreezeAtomic(inRelease.tenantId, inRelease.processId)),
      encerrado: await valueOrReason(() => repo.thawLegacyFreezeAtomic(closed.tenantId, closed.processId)),
      liberacaoIntocada: (await frozenMs(inRelease)) === legacy.getTime(),
      encerradoIntocado: (await frozenMs(closed)) === legacy.getTime(),
    };
    assert.deepEqual(observed, { liberacao: false, encerrado: false, liberacaoIntocada: true, encerradoIntocado: true });
  });

  test("W6 · closeAuctionAtomic direto com o processo AUCTIONED ainda congelado (livro completo, 10 diárias): 409 concurrent_custody_append; segue AUCTIONED; frozen_at intocado", async () => {
    const ctx = await seed("W6", { status: "AUCTIONED", enteredAt: ago(10) });
    await seedSoldAttempt(ctx);
    await (await createDefaultChargeService()).accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const legacy = new Date(Date.now() - LEGACY_FROZEN_DAYS * MS_PER_DAY);
    await client.$executeRawUnsafe("UPDATE impound_processes SET frozen_at = $1 WHERE tenant_id = $2::uuid AND id = $3::uuid", legacy, ctx.tenantId, ctx.processId);
    const occurredAt = new Date();
    const result = await outcome(() => atomicFor("close", ctx, { expectedDailyCount: 10, enteredAt: ctx.enteredAt, frozenAt: occurredAt }, occurredAt));
    assert.deepEqual(
      { diariasNoLivro: await count(ctx, "DAILY"), resultado: result, estado: (await row(ctx)).status, congelamentoIntocado: (await frozenMs(ctx)) === legacy.getTime() },
      { diariasNoLivro: 10, resultado: "409 concurrent_custody_append", estado: "AUCTIONED", congelamentoIntocado: true },
    );
  });

  // ───────────────────── E11.1-E/E11.2: período na preparação, teto 180 e legado (G1) ─────────────────────

  async function suspensionsOfDb(ctx: Ctx): Promise<Array<{ from: number; to?: number }>> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ started_at: Date; ended_at: Date | null }>>`
        SELECT started_at, ended_at FROM impound_daily_suspensions WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid ORDER BY started_at`,
    );
    return rows.map((item) => ({ from: new Date(item.started_at).getTime(), to: item.ended_at ? new Date(item.ended_at).getTime() : undefined }));
  }

  async function prepBackdated(ctx: Ctx, prepAt: Date, lotAt?: Date, round = 1): Promise<void> {
    const auction = await createDefaultAuctionService();
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody(round));
    await auction.setAppraisal(actor(ctx), ctx.processId, { round_number: round, appraisal_amount: "10000.00", min_bid_amount: "5000.00" });
    await auctionRepo.prepareAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: round, actorId: ctx.userId, occurredAt: prepAt });
    if (lotAt) await auctionRepo.lotAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_PREP", roundNumber: round, actorId: ctx.userId, occurredAt: lotAt });
  }

  test("S1 · (E11.1-E) preparação abre o período; varredura em leilão lança 0; o arremate fecha com 90; crédito 3750.00, saldo 4250.00", async () => {
    const ctx = await seed("S1", { status: "AUCTION_ELIGIBLE", enteredAt: ago(95) });
    const charge = await createDefaultChargeService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 90 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prepAt, ctx.userId);
    await prepBackdated(ctx, prepAt, new Date(t0 + 92 * MS_PER_DAY));
    const sweep = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const afterSweep = { lancadas: sweep.accrued, diarias: await count(ctx, "DAILY") };
    const auction = await createDefaultAuctionService();
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    const afterSale = { diarias: await count(ctx, "DAILY"), congelado: (await row(ctx)).frozen_at !== null };
    await auction.closeAuction(actor(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
    const frozenAtMs = (await frozenMs(ctx)) ?? undefined;
    const dist = await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {});
    assert.deepEqual(
      { afterSweep, afterSale, periodos: await suspensionsOfDb(ctx), ...cascadeOf(dist) },
      { afterSweep: { lancadas: 0, diarias: 90 }, afterSale: { diarias: 90, congelado: false }, periodos: [{ from: prepAt.getTime(), to: frozenAtMs }], creditoDoPatio: "3750.00", saldoDoExDono: "4250.00", somaDoRateioIgualAoLance: true },
    );
  });

  test("S5 · (E11.1-E) arremate e inadimplência mantêm o período aberto da preparação; varredura lança 0; 90 diárias; frozen_at nulo", async () => {
    const ctx = await seed("S5", { status: "AUCTION_ELIGIBLE", enteredAt: ago(95) });
    const charge = await createDefaultChargeService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 90 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prepAt, ctx.userId);
    await prepBackdated(ctx, prepAt, new Date(t0 + 92 * MS_PER_DAY));
    const auction = await createDefaultAuctionService();
    await auction.recordSale(actor(ctx), ctx.processId, saleBody());
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    const sweep = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    assert.deepEqual(
      { lancadas: sweep.accrued, diarias: await count(ctx, "DAILY"), congelado: (await row(ctx)).frozen_at !== null, periodos: await suspensionsOfDb(ctx) },
      { lancadas: 0, diarias: 90, congelado: false, periodos: [{ from: prepAt.getTime(), to: undefined }] },
    );
  });

  test("S2 · (E11.1-E) 30 dias em leilão param a diária; retirada volta a cobrar; 120 diárias com seq 1..120; depois 180 (teto)", async () => {
    const ctx = await seed("S2", { status: "AUCTION_ELIGIBLE", enteredAt: ago(250) });
    const charge = await createDefaultChargeService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 100 * MS_PER_DAY);
    const reclaimAt = new Date(t0 + 130 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prepAt, ctx.userId);
    await prepBackdated(ctx, prepAt, prepAt);
    await auctionRepo.reclaimAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", actorId: ctx.userId, occurredAt: reclaimAt });
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(t0 + 150 * MS_PER_DAY), ctx.userId);
    const afterFirst = { diarias: await count(ctx, "DAILY"), seqs: await dailySeqs(ctx) };
    const legenda101 = (await withTenantRls(client, ctx.tenantId, (tx) => tx.$queryRaw<Array<{ ref_date: string | null }>>`
      SELECT to_char(ref_date, 'YYYY-MM-DD') AS ref_date FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY' AND period_seq = 101`))[0]?.ref_date;
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const afterSecond = { diarias: await count(ctx, "DAILY"), seqs: await dailySeqs(ctx) };
    assert.deepEqual(
      { afterFirst, legenda101, afterSecond },
      { afterFirst: { diarias: 120, seqs: Array.from({ length: 120 }, (_, index) => index + 1) }, legenda101: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(reclaimAt), afterSecond: { diarias: 180, seqs: Array.from({ length: 180 }, (_, index) => index + 1) } },
    );
  });

  test("S3 · (E11.1-E) entrada há 200 dias: 180 antes do lote e 180 no fim, nenhuma sobre-acumulada", async () => {
    const ctx = await seed("S3", { status: "AUCTION_ELIGIBLE", enteredAt: ago(260) });
    const charge = await createDefaultChargeService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 200 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prepAt, ctx.userId);
    const antesDoLote = await count(ctx, "DAILY");
    await prepBackdated(ctx, prepAt, prepAt);
    await auctionRepo.reclaimAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", actorId: ctx.userId, occurredAt: new Date(t0 + 230 * MS_PER_DAY) });
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const state = await charge.getReleaseChargeState(ctx.tenantId, ctx.processId);
    assert.deepEqual(
      { antesDoLote, noFim: await count(ctx, "DAILY"), sobreAcumuladas: (await count(ctx, "DAILY")) - (state?.nAccrueAtFreeze ?? 0) },
      { antesDoLote: 180, noFim: 180, sobreAcumuladas: 0 },
    );
  });

  test("S8 · (E11.1-E) retirada do quitado a partir da preparação fecha o período; 2 dias depois a varredura lança 92", async () => {
    const ctx = await seed("S8", { status: "AUCTION_ELIGIBLE", enteredAt: ago(96) });
    const charge = await createDefaultChargeService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 90 * MS_PER_DAY);
    const withdrawAt = new Date(t0 + 94 * MS_PER_DAY);
    await prepBackdated(ctx, prepAt);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, withdrawAt, ctx.userId);
    await charge.settle(actor(ctx), ctx.processId, { note: "quitado no balcão" });
    await auctionRepo.withdrawSettledAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_PREP", actorId: ctx.userId, occurredAt: withdrawAt });
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    assert.deepEqual(
      { diarias: await count(ctx, "DAILY"), seqs: await dailySeqs(ctx), periodos: await suspensionsOfDb(ctx) },
      { diarias: 92, seqs: Array.from({ length: 92 }, (_, index) => index + 1), periodos: [{ from: prepAt.getTime(), to: withdrawAt.getTime() }] },
    );
  });

  test("S8b · (E11.1-E) controle: retirada do quitado a partir de AUCTION_ELIGIBLE não abre período; 92 diárias", async () => {
    const ctx = await seed("S8b", { status: "AUCTION_ELIGIBLE", enteredAt: ago(92) });
    const charge = await createDefaultChargeService();
    const withdrawAt = new Date(ctx.enteredAt.getTime() + 90 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, withdrawAt, ctx.userId);
    await charge.settle(actor(ctx), ctx.processId, { note: "quitado no balcão" });
    await auctionRepo.withdrawSettledAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", actorId: ctx.userId, occurredAt: withdrawAt });
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    assert.deepEqual({ diarias: await count(ctx, "DAILY"), periodos: (await suspensionsOfDb(ctx)).length }, { diarias: 92, periodos: 0 });
  });

  test("S9 · (E11.1-E) 184 diárias com 182 pagas: motor dá 180; estorno só das 183 e 184; extrato acusa 4 acima do teto; script lista 1 processo, 2 pagas, 80.00", async () => {
    const ctx = await seed("S9", { enteredAt: ago(200) });
    await seedDailies(ctx, 184);
    await client.$executeRawUnsafe("UPDATE process_charges SET settled_at = now() WHERE tenant_id = $1::uuid AND process_id = $2::uuid AND kind = 'DAILY' AND period_seq <= 182", ctx.tenantId, ctx.processId);
    const charge = await createDefaultChargeService();
    const sweep = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const state = await charge.getReleaseChargeState(ctx.tenantId, ctx.processId, new Date());
    const statement = await charge.getStatement(actor(ctx), ctx.processId);
    const listar = spawnSync(process.execPath, ["--import", "tsx", "scripts/patio-fechar-diarias-congelados.ts", "--organizacao", ctx.tenantId, "--listar-pagas-acima-do-teto"], { env: process.env, encoding: "utf8", timeout: 300_000 });
    const settle = await charge.settle(actor(ctx), ctx.processId, { note: "quitado" });
    assert.deepEqual(
      { lancadas: sweep.accrued, sobreAcumuladas: statement.overAccruedDailies, estornadas: state?.overAccruedDailyIds.length, estornoCount: settle.estornoCount, lista1Processo: `${listar.stdout ?? ""}${listar.stderr ?? ""}`.includes("total de processos com pagas acima do teto: 1"), lista2Pagas80: `${listar.stdout ?? ""}${listar.stderr ?? ""}`.includes("2 pagas, 80.00") },
      { lancadas: 0, sobreAcumuladas: 4, estornadas: 2, estornoCount: 2, lista1Processo: true, lista2Pagas80: true },
    );
  });

  test("S9b · (E11.2/A2) contrato particular com 200 diárias: 180 devidas e 20 sobre-acumuladas; a liberação estorna 20; a cascata não as leva", async () => {
    const ctx = await seed("S9b", { enteredAt: ago(200), cap: "UNLIMITED" });
    await seedDailies(ctx, 200);
    const charge = await createDefaultChargeService();
    const sweep = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const state = await charge.getReleaseChargeState(ctx.tenantId, ctx.processId, new Date());
    const statement = await charge.getStatement(actor(ctx), ctx.processId);
    const cascade = await charge.getCascadeExpenseClaim(ctx.tenantId, ctx.processId, new Date());
    const settle = await charge.settle(actor(ctx), ctx.processId, { note: "quitado" });
    assert.deepEqual(
      { lancadas: sweep.accrued, sobreAcumuladas: statement.overAccruedDailies, estornadas: state?.overAccruedDailyIds.length, estornoCount: settle.estornoCount, cascadeClaim: cascade?.claimCents },
      { lancadas: 0, sobreAcumuladas: 20, estornadas: 20, estornoCount: 20, cascadeClaim: 735_000 },
    );
  });

  test("S11 · (E11.1-E) resgate fecha o 1º período; re-preparação abre o 2º; 105 diárias, dois períodos", async () => {
    const ctx = await seed("S11", { status: "AUCTION_ELIGIBLE", enteredAt: ago(125) });
    const charge = await createDefaultChargeService();
    const t0 = ctx.enteredAt.getTime();
    const prep1At = new Date(t0 + 100 * MS_PER_DAY);
    const reclaimAt = new Date(t0 + 110 * MS_PER_DAY);
    const eligibleAt = new Date(t0 + 115 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prep1At, ctx.userId);
    await prepBackdated(ctx, prep1At, prep1At);
    await auctionRepo.reclaimAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", actorId: ctx.userId, occurredAt: reclaimAt });
    const impound = await createPrismaImpoundRepository();
    await impound.applyTransition({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE", setEnteredAt: false, setFrozenAt: false, event: { type: "STATUS_CHANGE", payload: { from: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE", reason: "auction_eligible" }, occurredAt: eligibleAt, actorId: undefined } });
    await prepBackdated(ctx, eligibleAt, undefined, 2);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    assert.deepEqual(
      { diarias: await count(ctx, "DAILY"), periodos: await suspensionsOfDb(ctx) },
      { diarias: 105, periodos: [{ from: prep1At.getTime(), to: reclaimAt.getTime() }, { from: eligibleAt.getTime(), to: undefined }] },
    );
  });

  test("DB-11 · (E11.1-E) processo em preparação com período aberto e 90 diárias: accrueDailyCharge direto da 91 → 409 daily_not_due_under_lock; 90 diárias", async () => {
    const ctx = await seed("DB-11", { status: "AUCTION_ELIGIBLE", enteredAt: ago(90) });
    await prepBackdated(ctx, new Date());
    await seedDailies(ctx, 90);
    const repo = await createPrismaChargeRepository();
    const result = await outcome(() => repo.accrueDailyCharge({ tenantId: ctx.tenantId, processId: ctx.processId, periodSeq: 91, refDate: "2026-02-01", unitAmount: "40.00", currency: "BRL", actorId: ctx.userId, occurredAt: new Date(Date.now() + 2 * MS_PER_DAY) }));
    assert.deepEqual({ resultado: result, diarias: await count(ctx, "DAILY") }, { resultado: "409 daily_not_due_under_lock", diarias: 90 });
  });

  test("K9 · varredura × preparação em paralelo (6 rodadas, 3 vezes): o livro tem exatamente as diárias do instante da preparação; cadeia válida", async () => {
    for (let block = 0; block < 3; block += 1) {
      for (let round = 0; round < 6; round += 1) {
        const ctx = await seed(`K9-${block}-${round}`, { status: "AUCTION_ELIGIBLE" });
        const auction = await createDefaultAuctionService();
        await auction.registerEdict(actor(ctx), ctx.processId, edictBody());
        await auction.setAppraisal(actor(ctx), ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "5000.00" });
        const charge = await createDefaultChargeService();
        const [prep] = await Promise.allSettled([
          auctionRepo.prepareAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, actorId: ctx.userId, occurredAt: new Date() }),
          charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined),
        ]);
        assert.equal(prep.status, "fulfilled", `K9 bloco ${block} rodada ${round}: a preparação passa (${prep.status === "rejected" ? reasonOf(prep.reason) : ""})`);
        const seqs = await dailySeqs(ctx);
        assert.deepEqual({ diarias: seqs.length, unicas: new Set(seqs).size }, { diarias: 90, unicas: 90 }, `K9 bloco ${block} rodada ${round}`);
        await assertChainValid(ctx);
      }
    }
  });

  test("S10 · (E11.1-E) script --abrir-periodo-leilao: A abre o período no instante do evento; B e C ficam intocados e listados", async () => {
    const a = await seed("S10-A", { status: "AUCTION_ELIGIBLE", enteredAt: ago(100) });
    const prepA = new Date(Date.now() - 20 * MS_PER_DAY);
    await prepBackdated(a, prepA, new Date(Date.now() - 19 * MS_PER_DAY));
    await client.$executeRawUnsafe("DELETE FROM impound_daily_suspensions WHERE tenant_id = $1::uuid AND process_id = $2::uuid", a.tenantId, a.processId);
    await seedDailies(a, 100);

    const b = await seed("S10-B", { status: "AUCTION_ELIGIBLE", enteredAt: ago(100) });
    await prepBackdated(b, prepA, new Date(Date.now() - 19 * MS_PER_DAY));
    await client.$executeRawUnsafe("DELETE FROM impound_daily_suspensions WHERE tenant_id = $1::uuid AND process_id = $2::uuid", b.tenantId, b.processId);
    await seedDailies(b, 100);
    await client.$executeRawUnsafe("UPDATE process_charges SET settled_at = now() WHERE tenant_id = $1::uuid AND process_id = $2::uuid AND kind = 'DAILY' AND period_seq = 85", b.tenantId, b.processId);

    const c = await seed("S10-C", { status: "AUCTION_PREP", enteredAt: ago(100) });
    await seedDailies(c, 100);

    const run = (tenantId: string) => spawnSync(process.execPath, ["--import", "tsx", "scripts/patio-fechar-diarias-congelados.ts", "--organizacao", tenantId, "--abrir-periodo-leilao", "--aplicar"], { env: process.env, encoding: "utf8", timeout: 300_000 });
    run(a.tenantId);
    const aPeriodos = await suspensionsOfDb(a);
    const charge = await createDefaultChargeService();
    const aState = await charge.getReleaseChargeState(a.tenantId, a.processId);
    await charge.accrueProcess(a.tenantId, a.processId, new Date(), undefined);
    run(a.tenantId);
    const aPeriodosDepois = await suspensionsOfDb(a);
    run(b.tenantId);
    run(c.tenantId);
    assert.deepEqual(
      { aAberto: aPeriodos[0]?.from === prepA.getTime(), aMotor: aState?.nAccrueAtFreeze, aSobre: (await count(a, "DAILY")) - (aState?.nAccrueAtFreeze ?? 0), aIdempotente: aPeriodosDepois.length === 1, bIntocado: (await suspensionsOfDb(b)).length === 0, cIntocado: (await suspensionsOfDb(c)).length === 0 },
      { aAberto: true, aMotor: 80, aSobre: 20, aIdempotente: true, bIntocado: true, cIntocado: true },
    );
  });
}
