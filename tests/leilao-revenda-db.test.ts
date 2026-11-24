import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, afterEach } from "node:test";

// B-LEILAO-REVENDA (suíte PostgreSQL; plano §7, Emendas 1, 2 e 2.1). Cadeia REAL: o app (`src/app.ts`) e os serviços de
// leilão, liquidação e cobrança com CORE_SAAS_PERSISTENCE=prisma, organização nova por caso, cadeia de custódia válida
// desde a gênese, e limpeza só do que o caso criou. Os casos de PRODUTO vão pela ROTA (E1.2: a rota sobe com Prisma);
// os INTERNOS chamam o repositório Prisma direto. Forma (E1.2): um objeto de resultado e UMA comparação no fim; nenhum
// `assert.fail`. Cenário comum (§7): vistoria com fotos, pátio, remoção de 150,00, tarifa de 40,00, entrada há 90 dias
// e 2 h; arremate da rodada 1 por 8.000,00; inadimplência registrada na rodada 2.

const connectionString = process.env.DATABASE_URL;
const MS_PER_DAY = 86_400_000;
const HOUR = 3_600_000;

if (!connectionString) {
  test("leilao-revenda-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para executar a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL ??= "silent";

  const { createPrismaClient } = await import("../src/database/pg-connection.js");
  const { withTenantRls } = await import("../src/database/rls.js");
  const { computeEventHash, genesisHash, verifyChain } = await import("../src/modules/impound/impound.hashchain.js");
  const { createPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { createDefaultAuctionService } = await import("../src/modules/auction/auction.service.js");
  const { createDefaultAuctionSettlementService } = await import("../src/modules/auction/auction.settlement.service.js");
  const { RlsPrismaAuctionRepository } = await import("../src/modules/auction/auction-prisma.repository.js");
  const { createDefaultChargeService } = await import("../src/modules/charging/charge.service.js");
  const { createPrismaChargeRepository } = await import("../src/modules/charging/charge-prisma.repository.js");
  const { app } = await import("../src/app.js");

  const client = createPrismaClient(connectionString);
  const auctionRepo = new RlsPrismaAuctionRepository(client);

  type Ctx = { tenantId: string; processId: string; profileId: string; userId: string; enteredAt: Date };
  type SeedOptions = { status?: "ACTIVE_CUSTODY" | "AUCTION_ELIGIBLE" | "LOTTED"; enteredAt?: Date; tariff?: boolean; yard?: boolean; inspection?: boolean; removal?: boolean; trail?: boolean };
  type Actor = { tenantId: string; userId: string; roles: string[]; permissions: string[] };
  type Http = { status: number; reason?: string; data: Record<string, unknown>; body: Record<string, unknown> };

  const created: string[] = [];
  // E1.2: toda recusa do preparo (edital e avaliação de uma rodada) é guardada como VALOR, e não interrompe o caso;
  // cada caso compara o preparo junto do resultado (`check`), com o esperado vazio.
  const setupFailures: string[] = [];

  function check(actual: unknown, expected: unknown): void {
    assert.deepEqual({ preparo: [...setupFailures], resultado: actual }, { preparo: [], resultado: expected });
  }

  function actor(ctx: Ctx): Actor {
    return { tenantId: ctx.tenantId, userId: ctx.userId, roles: ["manager"], permissions: ["impound:read", "impound:transition", "auction:appraise", "auction:reclaim", "charging:settle", "release:process", "release:approve"] };
  }

  function ago(days: number, extraMs = 2 * HOUR): Date {
    return new Date(Date.now() - days * MS_PER_DAY - extraMs);
  }

  // ───────────────────────── semeadura (molde: tests/patio-leilao-diarias-db.test.ts) ─────────────────────────

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

  async function assignYard(ctx: Ctx): Promise<void> {
    await withTenantRls(client, ctx.tenantId, async (tx) => {
      const [yard] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO yards (tenant_id, name, address, timezone) VALUES (${ctx.tenantId}::uuid, 'Pátio Central', 'Rua X, 1', 'America/Sao_Paulo') RETURNING id`;
      await tx.$executeRaw`UPDATE impound_processes SET yard_id = ${yard.id}::uuid WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${ctx.processId}::uuid`;
    });
  }

  async function addRemoval(ctx: Ctx): Promise<void> {
    await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$executeRaw`
        INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'REMOVAL', 1, 150.00, 150.00)`,
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

  async function seed(label: string, options: SeedOptions = {}): Promise<Ctx> {
    const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.toLowerCase();
    const tenant = await client.tenant.create({ data: { name: `Leilão Revenda ${suffix}`, slug: `leilao-revenda-${suffix}` } });
    created.push(tenant.id);
    const enteredAt = options.enteredAt ?? ago(90);
    const ids = await withTenantRls(client, tenant.id, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope, daily_model, daily_cap, required_photo_sets)
        VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT', 'ROLLING_24H', 'SIX_MONTHS', ${JSON.stringify(["FRONT"])}::jsonb)
        RETURNING id`;
      const [user] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO users (tenant_id, name, email, status) VALUES (${tenant.id}::uuid, 'Operador Pátio', ${`op-${suffix}@revenda.invalid`}, 'active') RETURNING id`;
      const [process] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
        VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', ${options.status ?? "ACTIVE_CUSTODY"}, ${enteredAt}, NULL, 0, NULL)
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
    const ctx: Ctx = { tenantId: tenant.id, processId: ids.processId, profileId: ids.profileId, userId: ids.userId, enteredAt };
    if (options.tariff !== false) await seedPricing(ctx);
    if (options.yard !== false) await assignYard(ctx);
    if (options.inspection !== false) await completeInspection(ctx);
    if (options.removal !== false) await addRemoval(ctx);
    if (options.trail !== false) await completeTrail(ctx);
    return ctx;
  }

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

  let server: Server | undefined;
  let baseUrl = "";

  afterEach(async () => {
    setupFailures.length = 0;
    for (const tenantId of created.splice(0)) {
      await teardown(tenantId);
    }
  });

  after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
    await client.$disconnect();
  });

  // ───────────────────────── a rota (E1.2) ─────────────────────────

  async function base(): Promise<string> {
    if (!server) {
      server = app.listen(0);
      await new Promise<void>((resolve) => server?.once("listening", resolve));
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    }
    return baseUrl;
  }

  async function http(ctx: Ctx, method: "GET" | "POST", suffix: string, body?: unknown, who: { role?: string; tenantId?: string } = {}): Promise<Http> {
    const response = await fetch(`${await base()}/api/v1/impound-processes/${ctx.processId}/auction${suffix}`, {
      method,
      headers: { "content-type": "application/json", "x-tenant-id": who.tenantId ?? ctx.tenantId, "x-user-id": ctx.userId, "x-role": who.role ?? "manager" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text) as Record<string, unknown>; } catch { parsed = { raw: text.slice(0, 200) }; }
    return { status: response.status, reason: (parsed.error as { reason?: string } | undefined)?.reason, data: (parsed.data as Record<string, unknown> | undefined) ?? {}, body: parsed };
  }

  const res = (result: Http): string => (result.status >= 200 && result.status < 300 ? String(result.status) : `${result.status} ${result.reason ?? "sem razão"}`);
  const readSeq = async (ctx: Ctx): Promise<number> => Number((await http(ctx, "GET", "")).data.custodySeq);
  const relot = (ctx: Ctx, round: number, seq: unknown) => http(ctx, "POST", "/relot", seq === undefined ? { round_number: round } : { round_number: round, custody_seq: seq });
  const reclaim = (ctx: Ctx, seq: unknown, role = "manager") => http(ctx, "POST", "/reclaim", seq === undefined ? { reason: "Dono apresentou a documentação" } : { reason: "Dono apresentou a documentação", custody_seq: seq }, { role });

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

  // ───────────────────────── leituras do banco ─────────────────────────

  async function row(ctx: Ctx): Promise<{ status: string; frozen_at: Date | null }> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ status: string; frozen_at: Date | null }>>`SELECT status, frozen_at FROM impound_processes WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${ctx.processId}::uuid`,
    );
    assert.ok(rows[0], "o processo existe");
    return rows[0];
  }

  async function dailyCount(ctx: Ctx): Promise<number> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY'`,
    );
    return rows[0]?.n ?? 0;
  }

  async function dailySeqs(ctx: Ctx): Promise<number[]> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ period_seq: number }>>`SELECT period_seq FROM process_charges WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY' ORDER BY period_seq`,
    );
    return rows.map((item) => Number(item.period_seq));
  }

  async function events(ctx: Ctx): Promise<Array<{ seq: number; type: string; payload: Record<string, unknown> }>> {
    return withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ seq: number; type: string; payload: Record<string, unknown> }>>`
        SELECT seq, type, payload FROM custody_events WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid ORDER BY seq`,
    );
  }

  async function eventsAfter(ctx: Ctx, seq: number): Promise<string[]> {
    return (await events(ctx)).filter((event) => Number(event.seq) > seq).map((event) => `${event.type}${event.payload?.round === undefined ? "" : `:${event.payload.round}`}`);
  }

  async function edicts(ctx: Ctx): Promise<Record<number, string>> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ round_number: number; status: string }>>`SELECT round_number, status FROM auction_edicts WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid ORDER BY round_number`,
    );
    return Object.fromEntries(rows.map((item) => [Number(item.round_number), item.status]));
  }

  async function minBidOf(ctx: Ctx, round: number): Promise<string | undefined> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ min_bid: string | null }>>`SELECT min_bid_amount::text AS min_bid FROM auction_edicts WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND round_number = ${round}`,
    );
    const value = rows[0]?.min_bid;
    return value === null || value === undefined ? undefined : Number(value).toFixed(2);
  }

  async function appraisalOf(ctx: Ctx, round: number): Promise<string | undefined> {
    const rows = await withTenantRls(
      client,
      ctx.tenantId,
      (tx) =>
        tx.$queryRaw<
          Array<{
            appraisal: string | null;
            min_bid: string | null;
            status: string;
          }>
        >`
        SELECT appraisal_amount::text AS appraisal, min_bid_amount::text AS min_bid, status
        FROM auction_edicts WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND round_number = ${round}`,
    );
    const item = rows[0];
    return item ? `${item.appraisal === null ? "null" : Number(item.appraisal).toFixed(2)}/${item.min_bid === null ? "null" : Number(item.min_bid).toFixed(2)} ${item.status}` : undefined;
  }

  async function attempts(ctx: Ctx): Promise<string[]> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ round_number: number; outcome: string; sold: string | null }>>`
        SELECT round_number, outcome, sold_amount::text AS sold FROM auction_attempts WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid ORDER BY round_number`,
    );
    return rows.map((item) => `${item.round_number}:${item.outcome}${item.sold === null ? "" : `:${Number(item.sold).toFixed(2)}`}`);
  }

  async function suspensions(ctx: Ctx): Promise<Array<{ from: number; to?: number }>> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ started_at: Date; ended_at: Date | null }>>`
        SELECT started_at, ended_at FROM impound_daily_suspensions WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid ORDER BY started_at`,
    );
    return rows.map((item) => ({ from: new Date(item.started_at).getTime(), to: item.ended_at ? new Date(item.ended_at).getTime() : undefined }));
  }

  async function lastEventAt(ctx: Ctx, type: string, reason?: string): Promise<number | undefined> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ occurred_at: Date; payload: Record<string, unknown> }>>`
        SELECT occurred_at, payload FROM custody_events WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND type = ${type} ORDER BY seq DESC`,
    );
    const hit = rows.find((item) => reason === undefined || item.payload?.reason === reason);
    return hit ? new Date(hit.occurred_at).getTime() : undefined;
  }

  async function chainValid(ctx: Ctx): Promise<boolean> {
    const impound = await createPrismaImpoundRepository();
    const snapshot = await impound.readChainSnapshot(ctx.tenantId, ctx.processId);
    if (!snapshot) return false;
    return verifyChain({ tenantId: ctx.tenantId, processId: ctx.processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors }).valid;
  }

  async function isSweepCandidate(ctx: Ctx): Promise<boolean> {
    const repo = await createPrismaChargeRepository();
    return (await repo.listAccrualCandidates(ctx.tenantId, 500)).includes(ctx.processId);
  }

  // O tempo passa sem esperar (E11.7 do leilão): recuam-se por SQL a entrada e as bordas do período.
  async function shiftDays(ctx: Ctx, days: number): Promise<void> {
    await client.$executeRawUnsafe(`UPDATE impound_processes SET entered_at = entered_at - interval '${days} days' WHERE tenant_id = $1::uuid AND id = $2::uuid`, ctx.tenantId, ctx.processId);
    await client.$executeRawUnsafe(
      `UPDATE impound_daily_suspensions SET started_at = started_at - interval '${days} days', ended_at = ended_at - interval '${days} days' WHERE tenant_id = $1::uuid AND process_id = $2::uuid`,
      ctx.tenantId,
      ctx.processId,
    );
  }

  type DistResult = { allocations: ReadonlyArray<{ beneficiaryKind: string; amount: string }>; settlement: { hammerAmount: string } };
  function cascadeOf(result: DistResult) {
    const byKind = new Map(result.allocations.map((allocation) => [allocation.beneficiaryKind, allocation]));
    const cents = result.allocations.reduce((acc, allocation) => acc + Math.round(Number(allocation.amount) * 100), 0);
    return {
      lance: Number(result.settlement.hammerAmount).toFixed(2),
      creditoDoPatio: byKind.get("REMOVAL_STORAGE")?.amount,
      saldoDoExDono: byKind.get("OWNER_BALANCE")?.amount,
      somaDoRateioIgualAoLance: cents === Math.round(Number(result.settlement.hammerAmount) * 100),
    };
  }

  async function settlementCount(ctx: Ctx): Promise<number> {
    const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM settlements WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid`,
    );
    return rows[0]?.n ?? 0;
  }

  // ───────────────────────── os caminhos do leilão ─────────────────────────

  const edictBody = (round: number) => ({ round_number: round, classification: "CONSERVED", edict_reference: `EDITAL-${round}/2026`, published_at: new Date(Date.now() - 30 * MS_PER_DAY).toISOString(), business_days: 15 });
  const saleBody = (amount: string, round: number) => ({ round_number: round, winner_ref: `Arrematante ${round}`, sold_amount: amount, sale_note_reference: `NOTA-${round}` });

  async function newRound(ctx: Ctx, round: number, minBid = "5000.00"): Promise<void> {
    const auction = await createDefaultAuctionService();
    const edital = await outcome(() => auction.registerEdict(actor(ctx), ctx.processId, edictBody(round)));
    const avaliacao = await outcome(() => auction.setAppraisal(actor(ctx), ctx.processId, { round_number: round, appraisal_amount: "10000.00", min_bid_amount: minBid }));
    if (edital !== "aceito" || avaliacao !== "aceito") setupFailures.push(`rodada ${round}: edital ${edital}; avaliação ${avaliacao}`);
  }

  // O cenário comum, pelo serviço: edital e avaliação da rodada 1, preparação, lote, arremate por 8.000,00 e a
  // inadimplência na rodada 2. `round2Edict` registra também o edital da rodada 2 antes do 1º lote (RV5).
  async function resaleScenario(label: string, options: SeedOptions & { round2Edict?: boolean } = {}): Promise<Ctx> {
    const ctx = await seed(label, { status: "AUCTION_ELIGIBLE", ...options });
    const auction = await createDefaultAuctionService();
    await newRound(ctx, 1);
    if (options.round2Edict) await newRound(ctx, 2);
    await auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 1));
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    return ctx;
  }

  async function desertedThenDefaultScenario(label: string): Promise<Ctx> {
    const ctx = await seed(label, { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody(1));
    await auction.setAppraisal(actor(ctx), ctx.processId, {
      round_number: 1,
      appraisal_amount: "12000.00",
      min_bid_amount: "6000.00",
    });
    await auction.recordAttempt(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody(2));
    await auction.setAppraisal(actor(ctx), ctx.processId, {
      round_number: 2,
      appraisal_amount: "10000.00",
      min_bid_amount: "5000.00",
    });
    await auction.prepareForAuction(actor(ctx), ctx.processId, {
      round_number: 2,
    });
    await auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 2 });
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 2));
    await auction.defaultAuction(actor(ctx), ctx.processId, {
      round_number: 3,
    });
    return ctx;
  }

  // O mesmo caminho pelos ATÔMICOS do repositório, sem os portões do serviço (RV6: custódia incompleta; sem tarifa).
  async function resaleViaRepository(label: string, options: SeedOptions = {}): Promise<Ctx> {
    const ctx = await seed(label, { status: "AUCTION_ELIGIBLE", ...options });
    const at = { tenantId: ctx.tenantId, processId: ctx.processId, actorId: ctx.userId };
    await newRound(ctx, 1);
    await auctionRepo.prepareAuctionAtomic({ ...at, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() });
    await auctionRepo.lotAuctionAtomic({ ...at, expectedFrom: "AUCTION_PREP", roundNumber: 1, occurredAt: new Date() });
    await auctionRepo.recordSaleAtomic({ ...at, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "Arrematante 1", soldAmount: "8000.00", saleNoteReference: "NOTA-1", occurredAt: new Date() });
    await auctionRepo.defaultAuctionAtomic({ ...at, expectedFrom: "AUCTIONED", roundNumber: 2, occurredAt: new Date() });
    return ctx;
  }

  async function sellCloseDistribute(ctx: Ctx, amount: string, round: number) {
    const auction = await createDefaultAuctionService();
    const venda = await outcome(() => auction.recordSale(actor(ctx), ctx.processId, saleBody(amount, round)));
    const congeladoAntesDoEncerramento = (await row(ctx)).frozen_at !== null;
    const encerramento = await outcome(() => auction.closeAuction(actor(ctx), ctx.processId, { round_number: round, payment_confirmed: true }));
    let dist: ReturnType<typeof cascadeOf> | string;
    try {
      dist = cascadeOf(await (await createDefaultAuctionSettlementService()).distribute(actor(ctx), ctx.processId, {}));
    } catch (error) {
      dist = reasonOf(error);
    }
    return { venda, congeladoAntesDoEncerramento, encerramento, dist };
  }

  // A trava do processo segurada numa transação aberta (barreira das "duas ordens de trava").
  function deferred() {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { promise, release };
  }

  async function holdProcessLock(ctx: Ctx): Promise<{ pid: number; release: () => void; done: Promise<unknown> }> {
    const gate = deferred();
    const ready = deferred();
    let pid = 0;
    const done = client.$transaction(
      async (tx) => {
        pid = Number((await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid);
        await tx.$queryRaw`SELECT id FROM impound_processes WHERE id = ${ctx.processId}::uuid FOR UPDATE`;
        ready.release();
        await gate.promise;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    await ready.promise;
    return { pid, release: gate.release, done };
  }

  // Espera até haver um backend (fora `known`) bloqueado por algum de `blockers`.
  async function waitBlockedBy(blockers: number[], known: number[]): Promise<number> {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const rows = await client.$queryRawUnsafe<Array<{ pid: number }>>(
        "SELECT pid FROM pg_stat_activity WHERE pg_blocking_pids(pid) && $1::int[] AND NOT (pid = ANY($2::int[]))",
        blockers,
        known,
      );
      if (rows.length > 0) return Number(rows[0].pid);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("barreira: nenhum backend bloqueado em 10 s");
  }

  // Dispara `first` e `second` na ordem dada de aquisição da trava do processo; devolve o desfecho de cada um.
  async function inLockOrder(ctx: Ctx, first: () => Promise<unknown>, second: () => Promise<unknown>): Promise<[string, string]> {
    const holder = await holdProcessLock(ctx);
    // Um ato que termina sem chegar a esperar a trava (ex.: o método não existe) não segura a barreira.
    const a = outcome(first);
    const pidA = await Promise.race([waitBlockedBy([holder.pid], []), a.then(() => undefined)]);
    const b = outcome(second);
    await Promise.race([waitBlockedBy(pidA === undefined ? [holder.pid] : [holder.pid, pidA], pidA === undefined ? [] : [pidA]), b.then(() => undefined)]);
    holder.release();
    await holder.done;
    return [await a, await b];
  }

  // ═════════════════════════ E2.3.3 — dinheiro e diária ═════════════════════════

  test("RV1 · revenda inteira pela rota: edital e avaliação da rodada 3, relote, arremate por 7000.00, encerramento e distribuição; 90 diárias; crédito 3750.00; saldo 3250.00; um período só", async () => {
    const ctx = await resaleScenario("RV1");
    const prepAt = await lastEventAt(ctx, "AUCTION_PREP");
    const edital3 = res(await http(ctx, "POST", "/edicts", edictBody(3)));
    const avaliacao3 = res(await http(ctx, "POST", "/appraisal", { round_number: 3, appraisal_amount: "10000.00", min_bid_amount: "5000.00" }));
    const relote = res(await relot(ctx, 3, await readSeq(ctx)));
    const depoisDoRelote = { editais: await edicts(ctx), congelado: (await row(ctx)).frozen_at !== null };
    const fim = await sellCloseDistribute(ctx, "7000.00", 3);
    const frozen = (await row(ctx)).frozen_at;
    check(
      { edital3, avaliacao3, relote, depoisDoRelote, ...fim, diarias: await dailyCount(ctx), tentativas: await attempts(ctx), periodos: await suspensions(ctx), liquidacoes: await settlementCount(ctx), cadeiaValida: await chainValid(ctx) },
      {
        edital3: "201",
        avaliacao3: "200",
        relote: "200",
        depoisDoRelote: { editais: { 1: "CLOSED", 3: "LOTTED" }, congelado: false },
        venda: "aceito",
        congeladoAntesDoEncerramento: false,
        encerramento: "aceito",
        dist: { lance: "7000.00", creditoDoPatio: "3750.00", saldoDoExDono: "3250.00", somaDoRateioIgualAoLance: true },
        diarias: 90,
        tentativas: ["1:SOLD:8000.00", "2:NO_PAYMENT", "3:SOLD:7000.00"],
        periodos: [{ from: prepAt, to: frozen ? new Date(frozen).getTime() : undefined }],
        liquidacoes: 1,
        cadeiaValida: true,
      },
    );
  });

  test("RV2 · os dias da espera (molde S5): entrada há 95 dias, preparação retroativa em t0+90 d; a varredura em leilão lança 0; 90 diárias e não 95; crédito 3750.00; saldo 3250.00", async () => {
    const ctx = await seed("RV2", { status: "AUCTION_ELIGIBLE", enteredAt: ago(95) });
    const charge = await createDefaultChargeService();
    const auction = await createDefaultAuctionService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 90 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prepAt, ctx.userId);
    await newRound(ctx, 1);
    await auctionRepo.prepareAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, actorId: ctx.userId, occurredAt: prepAt });
    await auctionRepo.lotAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_PREP", roundNumber: 1, actorId: ctx.userId, occurredAt: new Date(t0 + 92 * MS_PER_DAY) });
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 1));
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    const sweep = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    await newRound(ctx, 3);
    const relote = res(await relot(ctx, 3, await readSeq(ctx)));
    const fim = await sellCloseDistribute(ctx, "7000.00", 3);
    const frozen = (await row(ctx)).frozen_at;
    check(
      { lancadasNaEspera: sweep.accrued, relote, ...fim, diarias: await dailyCount(ctx), periodos: await suspensions(ctx) },
      {
        lancadasNaEspera: 0,
        relote: "200",
        venda: "aceito",
        congeladoAntesDoEncerramento: false,
        encerramento: "aceito",
        dist: { lance: "7000.00", creditoDoPatio: "3750.00", saldoDoExDono: "3250.00", somaDoRateioIgualAoLance: true },
        diarias: 90,
        periodos: [{ from: prepAt.getTime(), to: frozen ? new Date(frozen).getTime() : undefined }],
      },
    );
  });

  test("RV6a · P5/P8/P9: relote sem pátio, sem vistoria e sem remoção (um por vez): 409 com a razão do item, edital 3 fora do lote, nenhum evento; completado o item e relida a tela, passa", async () => {
    const cases = [
      { label: "RV6a-patio", option: { yard: false }, complete: assignYard },
      { label: "RV6a-vistoria", option: { inspection: false }, complete: completeInspection },
      { label: "RV6a-remocao", option: { removal: false }, complete: addRemoval },
    ] as const;
    const observed: Record<string, unknown> = {};
    for (const item of cases) {
      const ctx = await resaleViaRepository(item.label, item.option);
      await newRound(ctx, 3);
      const seq = await readSeq(ctx);
      const recusa = res(await relot(ctx, 3, seq));
      const semEvento = (await eventsAfter(ctx, seq)).length === 0;
      const edital3 = (await edicts(ctx))[3];
      await item.complete(ctx);
      const depois = res(await relot(ctx, 3, await readSeq(ctx)));
      observed[item.label] = { recusa, semEvento, edital3, depois, editalDepois: (await edicts(ctx))[3] };
    }
    check(observed, {
      "RV6a-patio": { recusa: "409 auction_custody_yard_missing", semEvento: true, edital3: "DESIGNATED", depois: "200", editalDepois: "LOTTED" },
      "RV6a-vistoria": { recusa: "409 auction_custody_inspection_incomplete", semEvento: true, edital3: "DESIGNATED", depois: "200", editalDepois: "LOTTED" },
      "RV6a-remocao": { recusa: "409 auction_custody_removal_charge_missing", semEvento: true, edital3: "DESIGNATED", depois: "200", editalDepois: "LOTTED" },
    });
  });

  test("RV6b · sem tarifa (molde L4): relote 409 auction_daily_charges_unpostable, nada gravado; com o serviço de diária de volta e a tela relida, 200 na 1ª tentativa, com as 90 diárias que faltavam lançadas", async () => {
    const ctx = await resaleViaRepository("RV6b");
    await newRound(ctx, 3);
    await removeDailyService(ctx);
    const seq = await readSeq(ctx);
    const recusa = res(await relot(ctx, 3, seq));
    const depoisDaRecusa = { eventos: (await eventsAfter(ctx, seq)).length, diarias: await dailyCount(ctx), edital3: (await edicts(ctx))[3] };
    await seedPricing(ctx);
    const relida = await readSeq(ctx);
    const primeira = res(await relot(ctx, 3, relida));
    const lancadas = (await eventsAfter(ctx, relida)).filter((event) => event !== "AUCTION_LOTTED:3").length;
    check(
      { recusa, depoisDaRecusa, primeira, lancadas, diarias: await dailyCount(ctx), seqs: await dailySeqs(ctx), edital3: (await edicts(ctx))[3], estado: (await row(ctx)).status },
      { recusa: "409 auction_daily_charges_unpostable", depoisDaRecusa: { eventos: 0, diarias: 0, edital3: "DESIGNATED" }, primeira: "200", lancadas: 90, diarias: 90, seqs: Array.from({ length: 90 }, (_, index) => index + 1), edital3: "LOTTED", estado: "LOTTED" },
    );
  });

  test("RV10 · segunda inadimplência: depois do arremate da rodada 3, inadimplência na 4, edital e relote da 5, arremate por 6000.00; uma distribuição só, sobre 6000.00; crédito 3750.00; saldo 2250.00", async () => {
    const ctx = await resaleScenario("RV10");
    const prepAt = await lastEventAt(ctx, "AUCTION_PREP");
    const auction = await createDefaultAuctionService();
    await newRound(ctx, 3);
    const relote3 = res(await relot(ctx, 3, await readSeq(ctx)));
    const venda3 = await outcome(() => auction.recordSale(actor(ctx), ctx.processId, saleBody("7000.00", 3)));
    const inadimplencia4 = await outcome(() => auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 4 }));
    await newRound(ctx, 5);
    const relote5 = res(await relot(ctx, 5, await readSeq(ctx)));
    const fim = await sellCloseDistribute(ctx, "6000.00", 5);
    const frozen = (await row(ctx)).frozen_at;
    check(
      { relote3, venda3, inadimplencia4, relote5, ...fim, tentativas: await attempts(ctx), liquidacoes: await settlementCount(ctx), periodos: await suspensions(ctx), diarias: await dailyCount(ctx), cadeiaValida: await chainValid(ctx) },
      {
        relote3: "200",
        venda3: "aceito",
        inadimplencia4: "aceito",
        relote5: "200",
        venda: "aceito",
        congeladoAntesDoEncerramento: false,
        encerramento: "aceito",
        dist: { lance: "6000.00", creditoDoPatio: "3750.00", saldoDoExDono: "2250.00", somaDoRateioIgualAoLance: true },
        tentativas: ["1:SOLD:8000.00", "2:NO_PAYMENT", "3:SOLD:7000.00", "4:NO_PAYMENT", "5:SOLD:6000.00"],
        liquidacoes: 1,
        periodos: [{ from: prepAt, to: frozen ? new Date(frozen).getTime() : undefined }],
        diarias: 90,
        cadeiaValida: true,
      },
    );
  });

  test("RV11 · o período no relote: logo depois, frozen_at nulo, LOTTED, a mesma linha de período aberta desde a 1ª preparação e nenhuma outra; a varredura lança 0", async () => {
    const ctx = await resaleScenario("RV11");
    await newRound(ctx, 3);
    const antes = await suspensions(ctx);
    const relote = res(await relot(ctx, 3, await readSeq(ctx)));
    const process = await row(ctx);
    const sweep = await (await createDefaultChargeService()).accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    check(
      { relote, congelado: process.frozen_at !== null, estado: process.status, periodos: await suspensions(ctx), lancadas: sweep.accrued, candidato: await isSweepCandidate(ctx), eventosPrep: (await events(ctx)).filter((event) => event.type === "AUCTION_PREP").length },
      { relote: "200", congelado: false, estado: "LOTTED", periodos: [{ from: antes[0]?.from, to: undefined }], lancadas: 0, candidato: true, eventosPrep: 1 },
    );
  });

  test("RV23 · a fala do dono inteira: 170 diárias antes do leilão; revenda; resgate; 20 dias depois, 180 (teto), com 10 lançadas; mais 20 dias, 180 e 0 lançadas; um período só; nenhuma diária dentro dele", async () => {
    const ctx = await seed("RV23", { status: "AUCTION_ELIGIBLE", enteredAt: ago(230) });
    const charge = await createDefaultChargeService();
    const auction = await createDefaultAuctionService();
    const t0 = ctx.enteredAt.getTime();
    const prepAt = new Date(t0 + 170 * MS_PER_DAY);
    await charge.accrueProcess(ctx.tenantId, ctx.processId, prepAt, ctx.userId);
    await newRound(ctx, 1);
    await auctionRepo.prepareAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, actorId: ctx.userId, occurredAt: prepAt });
    await auctionRepo.lotAuctionAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_PREP", roundNumber: 1, actorId: ctx.userId, occurredAt: new Date(t0 + 172 * MS_PER_DAY) });
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 1));
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    await newRound(ctx, 3);
    const relote = res(await relot(ctx, 3, await readSeq(ctx)));
    const resgate = res(await reclaim(ctx, await readSeq(ctx)));
    // Diárias com vencimento estritamente dentro do período (de `minSeq` em diante). O recuo do tempo (shiftDays) move as
    // bordas do período e a entrada, mas não a data das diárias já lançadas; por isso a conta de todas é feita ANTES do
    // recuo, e a das novas (171 a 180), depois dele.
    const insidePeriod = async (minSeq: number): Promise<number | undefined> =>
      (await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n FROM process_charges c JOIN impound_daily_suspensions s ON s.tenant_id = c.tenant_id AND s.process_id = c.process_id
          WHERE c.tenant_id = ${ctx.tenantId}::uuid AND c.process_id = ${ctx.processId}::uuid AND c.kind = 'DAILY' AND c.period_seq >= ${minSeq}
            AND c.ref_date > (s.started_at AT TIME ZONE 'America/Sao_Paulo')::date AND c.ref_date < (s.ended_at AT TIME ZONE 'America/Sao_Paulo')::date`,
      ))[0]?.n;
    const antesDoRecuo = { diarias: await dailyCount(ctx), dentroDoPeriodo: await insidePeriod(1) };
    await shiftDays(ctx, 20);
    const first = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const primeira = { lancadas: first.accrued, diarias: await dailyCount(ctx), seqs: await dailySeqs(ctx), novasDentroDoPeriodo: await insidePeriod(171) };
    await shiftDays(ctx, 20);
    const second = await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const periodos = await suspensions(ctx);
    check(
      { relote, resgate, antesDoRecuo, primeira, segunda: { lancadas: second.accrued, diarias: await dailyCount(ctx) }, periodos: periodos.length, periodoFechado: periodos[0]?.to !== undefined, estado: (await row(ctx)).status },
      { relote: "200", resgate: "200", antesDoRecuo: { diarias: 170, dentroDoPeriodo: 0 }, primeira: { lancadas: 10, diarias: 180, seqs: Array.from({ length: 180 }, (_, index) => index + 1), novasDentroDoPeriodo: 0 }, segunda: { lancadas: 0, diarias: 180 }, periodos: 1, periodoFechado: true, estado: "ACTIVE_CUSTODY" },
    );
  });

  // ═════════════════════════ §7, E1 e E2.1.7 — a revenda pendente e a leitura ═════════════════════════

  test("RV3 · controle: processo em lote que nunca foi vendido: edital → 409 auction_edict_wrong_state; avaliação → 409 appraisal_locked_after_lot; relote pela rota → 409 resale_not_pending", async () => {
    const ctx = await seed("RV3", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await newRound(ctx, 1);
    await auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    const seq = await readSeq(ctx);
    check(
      {
        edital2: res(await http(ctx, "POST", "/edicts", edictBody(2))),
        avaliacao1: res(await http(ctx, "POST", "/appraisal", { round_number: 1, appraisal_amount: "11000.00", min_bid_amount: "5500.00" })),
        relote: res(await relot(ctx, 2, seq)),
        eventos: await eventsAfter(ctx, seq),
      },
      { edital2: "409 auction_edict_wrong_state", avaliacao1: "409 appraisal_locked_after_lot", relote: "409 resale_not_pending", eventos: [] },
    );
  });

  test("RV4 · controle: com a revenda pendente, a avaliação da rodada 1 (a que está em lote) recusa 409 appraisal_locked_after_lot; o lance mínimo dela fica intocado", async () => {
    const ctx = await resaleScenario("RV4");
    const avaliacao1 = res(await http(ctx, "POST", "/appraisal", { round_number: 1, appraisal_amount: "12000.00", min_bid_amount: "4000.00" }));
    check({ avaliacao1, minimo1: await minBidOf(ctx, 1) }, { avaliacao1: "409 appraisal_locked_after_lot", minimo1: "5000.00" });
  });

  test("RV24 · rodada deserta não pode ser reavaliada durante a revenda; a rodada nova segue até o relote", async () => {
    const ctx = await desertedThenDefaultScenario("RV24");
    const avaliacao1 = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 1,
        appraisal_amount: "9000.00",
        min_bid_amount: "4500.00",
      }),
    );
    const avaliacao3 = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 3,
        appraisal_amount: "9000.00",
        min_bid_amount: "4500.00",
      }),
    );
    const edital1Registro = res(await http(ctx, "POST", "/edicts", edictBody(1)));
    const edital4 = res(await http(ctx, "POST", "/edicts", edictBody(4)));
    const avaliacao4 = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 4,
        appraisal_amount: "9000.00",
        min_bid_amount: "4500.00",
      }),
    );
    const relote4 = res(await relot(ctx, 4, await readSeq(ctx)));
    check(
      {
        avaliacao1,
        edital1: await appraisalOf(ctx, 1),
        avaliacao3,
        edital1Registro,
        edital4,
        avaliacao4,
        relote4,
        editais: await edicts(ctx),
      },
      {
        avaliacao1: "409 appraisal_round_has_result",
        edital1: "12000.00/6000.00 DESIGNATED",
        avaliacao3: "409 appraisal_round_has_result",
        edital1Registro: "409 resale_round_not_new",
        edital4: "201",
        avaliacao4: "200",
        relote4: "200",
        editais: { 1: "DESIGNATED", 2: "CLOSED", 4: "LOTTED" },
      },
    );
  });

  test("RV25 · avaliação da rodada nova exige edital antes de gravar", async () => {
    const ctx = await resaleScenario("RV25");
    const avaliacao3SemEdital = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 3,
        appraisal_amount: "9000.00",
        min_bid_amount: "4500.00",
      }),
    );
    const edital3 = res(await http(ctx, "POST", "/edicts", edictBody(3)));
    const avaliacao3 = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 3,
        appraisal_amount: "9000.00",
        min_bid_amount: "4500.00",
      }),
    );
    check(
      { avaliacao3SemEdital, edital3, avaliacao3, editais: await edicts(ctx) },
      {
        avaliacao3SemEdital: "404 auction_edict_not_found",
        edital3: "201",
        avaliacao3: "200",
        editais: { 1: "LOTTED", 3: "DESIGNATED" },
      },
    );
  });

  test("RV26 · avaliação de rodada com resultado é recusada no elegível, na preparação e na custódia ativa", async () => {
    const ctx = await seed("RV26", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody(1));
    await auction.setAppraisal(actor(ctx), ctx.processId, {
      round_number: 1,
      appraisal_amount: "12000.00",
      min_bid_amount: "6000.00",
    });
    await auction.recordAttempt(actor(ctx), ctx.processId, { round_number: 1 });
    const elegivel = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 1,
        appraisal_amount: "11000.00",
        min_bid_amount: "5500.00",
      }),
    );
    const valores1Elegivel = await appraisalOf(ctx, 1);
    await auction.registerEdict(actor(ctx), ctx.processId, edictBody(2));
    const nova2 = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 2,
        appraisal_amount: "10000.00",
        min_bid_amount: "5000.00",
      }),
    );
    await auction.prepareForAuction(actor(ctx), ctx.processId, {
      round_number: 2,
    });
    const preparacao = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 1,
        appraisal_amount: "1.00",
        min_bid_amount: "1.00",
      }),
    );
    const valores1Prep = await appraisalOf(ctx, 1);
    await auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 2 });
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 2));
    await auction.defaultAuction(actor(ctx), ctx.processId, {
      round_number: 3,
    });
    await reclaim(ctx, await readSeq(ctx));
    const custodia = res(
      await http(ctx, "POST", "/appraisal", {
        round_number: 2,
        appraisal_amount: "2.00",
        min_bid_amount: "2.00",
      }),
    );
    check(
      {
        elegivel,
        valores1Elegivel,
        nova2,
        preparacao,
        valores1Prep,
        estado: (await row(ctx)).status,
        custodia,
        valores2Custodia: await appraisalOf(ctx, 2),
      },
      {
        elegivel: "409 appraisal_round_has_result",
        valores1Elegivel: "12000.00/6000.00 DESIGNATED",
        nova2: "200",
        preparacao: "409 appraisal_round_has_result",
        valores1Prep: "12000.00/6000.00 DESIGNATED",
        estado: "ACTIVE_CUSTODY",
        custodia: "409 appraisal_round_has_result",
        valores2Custodia: "10000.00/5000.00 CLOSED",
      },
    );
  });

  test("RV5 · rodada que não é nova: edital, relote pela rota e relote atômico nas rodadas 1 (vendida) e 2 (inadimplida) → 409 resale_round_not_new nos seis", async () => {
    const ctx = await resaleScenario("RV5", { round2Edict: true });
    const seq = await readSeq(ctx);
    const at = { tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED" as const, expectedCustodySeq: seq, actorId: ctx.userId };
    check(
      {
        edital1: res(await http(ctx, "POST", "/edicts", edictBody(1))),
        edital2: res(await http(ctx, "POST", "/edicts", edictBody(2))),
        relote1: res(await relot(ctx, 1, seq)),
        relote2: res(await relot(ctx, 2, seq)),
        atomico1: await outcome(() => auctionRepo.relotAtomic({ ...at, roundNumber: 1, occurredAt: new Date() })),
        atomico2: await outcome(() => auctionRepo.relotAtomic({ ...at, roundNumber: 2, occurredAt: new Date() })),
        eventos: await eventsAfter(ctx, seq),
      },
      {
        edital1: "409 resale_round_not_new",
        edital2: "409 resale_round_not_new",
        relote1: "409 resale_round_not_new",
        relote2: "409 resale_round_not_new",
        atomico1: "409 resale_round_not_new",
        atomico2: "409 resale_round_not_new",
        eventos: [],
      },
    );
  });

  test("RV7 · repetição: relote da rodada 3 com s0 → 200; o mesmo com s0 → 409 auction_reading_stale; com a leitura nova s1 → 409 resale_not_pending; um evento só depois de s0; um edital em lote, o 3", async () => {
    const ctx = await resaleScenario("RV7");
    await newRound(ctx, 3);
    const s0 = await readSeq(ctx);
    const primeiro = res(await relot(ctx, 3, s0));
    const segundo = res(await relot(ctx, 3, s0));
    const terceiro = res(await relot(ctx, 3, await readSeq(ctx)));
    const editais = await edicts(ctx);
    check(
      { primeiro, segundo, terceiro, eventos: await eventsAfter(ctx, s0), emLote: Object.entries(editais).filter(([, status]) => status === "LOTTED").map(([round]) => Number(round)) },
      { primeiro: "200", segundo: "409 auction_reading_stale", terceiro: "409 resale_not_pending", eventos: ["AUCTION_LOTTED:3"], emLote: [3] },
    );
  });


  test("RV7c · INTERNO: relotAtomic direto na revenda pendente com expectedCustodySeq = cabeça − 1: 409 auction_reading_stale; edital 3 fora do lote; nada gravado", async () => {
    const ctx = await resaleScenario("RV7c");
    await newRound(ctx, 3);
    const seq = (await auctionRepo.getState(ctx.tenantId, ctx.processId))?.custodySeqHead ?? -1;
    const result = await outcome(() =>
      auctionRepo.relotAtomic({
        tenantId: ctx.tenantId,
        processId: ctx.processId,
        expectedFrom: "LOTTED",
        roundNumber: 3,
        expectedCustodySeq: seq - 1,
        actorId: ctx.userId,
        occurredAt: new Date(),
      }),
    );
    check(
      { result, estado: (await row(ctx)).status, edital3: (await edicts(ctx))[3], eventos: await eventsAfter(ctx, seq) },
      { result: "409 auction_reading_stale", estado: "LOTTED", edital3: "DESIGNATED", eventos: [] },
    );
  });
  test("RV8a · corrida: 6 relotes da rodada 3 em paralelo com s0, 6 rodadas: exatamente um 200, os outros 409; um edital em lote e um evento; cadeia válida", async () => {
    const observed: unknown[] = [];
    for (let round = 0; round < 6; round += 1) {
      const ctx = await resaleScenario(`RV8a-${round}`);
      await newRound(ctx, 3);
      const s0 = await readSeq(ctx);
      const results = (await Promise.all(Array.from({ length: 6 }, () => relot(ctx, 3, s0)))).map(res);
      const editais = await edicts(ctx);
      observed.push({
        sucessos: results.filter((result) => result === "200").length,
        recusas409: results.filter((result) => result.startsWith("409 ")).length,
        emLote: Object.entries(editais).filter(([, status]) => status === "LOTTED").map(([value]) => Number(value)),
        eventos: await eventsAfter(ctx, s0),
        cadeiaValida: await chainValid(ctx),
      });
    }
    check(observed, Array.from({ length: 6 }, () => ({ sucessos: 1, recusas409: 5, emLote: [3], eventos: ["AUCTION_LOTTED:3"], cadeiaValida: true })));
  });

  test("RV8b · corrida: relotes das rodadas 3, 4 e 5 (todas registradas) em paralelo com s0, 6 rodadas: exatamente um 200; um edital em lote e um evento; cadeia válida", async () => {
    const observed: unknown[] = [];
    for (let round = 0; round < 6; round += 1) {
      const ctx = await resaleScenario(`RV8b-${round}`);
      for (const value of [3, 4, 5]) await newRound(ctx, value);
      const s0 = await readSeq(ctx);
      const results = (await Promise.all([3, 4, 5].map((value) => relot(ctx, value, s0)))).map(res);
      const lotted = Object.entries(await edicts(ctx)).filter(([, status]) => status === "LOTTED").map(([value]) => Number(value));
      const winner = [3, 4, 5][results.indexOf("200")];
      observed.push({
        sucessos: results.filter((result) => result === "200").length,
        recusas409: results.filter((result) => result.startsWith("409 ")).length,
        umEmLoteEhOVencedor: lotted.length === 1 && lotted[0] === winner,
        eventos: (await eventsAfter(ctx, s0)).length,
        cadeiaValida: await chainValid(ctx),
      });
    }
    check(observed, Array.from({ length: 6 }, () => ({ sucessos: 1, recusas409: 2, umEmLoteEhOVencedor: true, eventos: 1, cadeiaValida: true })));
  });

  test("RV8c · relote × arremate da rodada 3: pela rota em paralelo (6 rodadas) e nas duas ordens de trava (6 rodadas cada): nunca uma venda em rodada fora do lote; cadeia válida", async () => {
    const violations: string[] = [];
    const orders: string[] = [];
    const saleFirstOutcomes = new Set<string>();
    const inspect = async (ctx: Ctx, label: string): Promise<void> => {
      const chain = await events(ctx);
      const lotSeq = chain.filter((event) => event.type === "AUCTION_LOTTED" && event.payload?.round === 3).map((event) => Number(event.seq));
      const soldSeq = chain.find((event) => event.type === "AUCTION_SOLD" && event.payload?.round === 3)?.seq;
      const sold3 = (await attempts(ctx)).some((item) => item.startsWith("3:SOLD"));
      // O registro do edital também grava AUCTION_LOTTED:3; o do relote é o 2º. A venda só vale depois dele.
      if (sold3 && (lotSeq.length < 2 || soldSeq === undefined || Number(soldSeq) < lotSeq[1])) violations.push(`${label}: venda da rodada 3 fora do lote`);
      if (!(await chainValid(ctx))) violations.push(`${label}: cadeia inválida`);
    };
    for (let round = 0; round < 6; round += 1) {
      const ctx = await resaleScenario(`RV8c-r${round}`);
      await newRound(ctx, 3);
      const s0 = await readSeq(ctx);
      await Promise.all([relot(ctx, 3, s0), http(ctx, "POST", "/sale", saleBody("7000.00", 3))]);
      await inspect(ctx, `rota ${round}`);
    }
    for (const order of ["relote-primeiro", "venda-primeiro"] as const) {
      for (let round = 0; round < 6; round += 1) {
        const ctx = await resaleScenario(`RV8c-${order}-${round}`);
        await newRound(ctx, 3);
        const seq = await readSeq(ctx);
        const relotNow = () => auctionRepo.relotAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: seq, actorId: ctx.userId, occurredAt: new Date() });
        const saleNow = () => auctionRepo.recordSaleAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 3, winnerRef: "Arrematante 3", soldAmount: "7000.00", saleNoteReference: "NOTA-3", actorId: ctx.userId, occurredAt: new Date() });
        const [first, second] = order === "relote-primeiro" ? await inLockOrder(ctx, relotNow, saleNow) : await inLockOrder(ctx, saleNow, relotNow);
        orders.push(`${order}:${first}/${second}`);
        if (order === "venda-primeiro") saleFirstOutcomes.add(first);
        await inspect(ctx, `${order} ${round}`);
      }
    }
    check(
      { violations, relotePrimeiro: orders.filter((item) => item === "relote-primeiro:aceito/aceito").length, vendaPrimeiro: [...saleFirstOutcomes] },
      { violations: [], relotePrimeiro: 6, vendaPrimeiro: ["409 sale_round_not_lotted"] },
    );
  });

  test("RV9a · controle (P10): com a revenda pendente e depois do relote, a quitação recusa 409 settle_after_auction_list e a retirada do quitado recusa 409 invalid_transition", async () => {
    const ctx = await resaleScenario("RV9a");
    await newRound(ctx, 3);
    const charge = await createDefaultChargeService();
    const auction = await createDefaultAuctionService();
    const pendente = {
      quitacao: await outcome(() => charge.settle(actor(ctx), ctx.processId, { note: "quitado no balcão" })),
      retirada: await outcome(() => auction.withdrawSettled(actor(ctx), ctx.processId, {})),
    };
    const relote = res(await relot(ctx, 3, await readSeq(ctx)));
    const depois = {
      quitacao: await outcome(() => charge.settle(actor(ctx), ctx.processId, { note: "quitado no balcão" })),
      retirada: await outcome(() => auction.withdrawSettled(actor(ctx), ctx.processId, {})),
    };
    check(
      { pendente, relote, depois, estado: (await row(ctx)).status },
      { pendente: { quitacao: "409 settle_after_auction_list", retirada: "409 invalid_transition" }, relote: "200", depois: { quitacao: "409 settle_after_auction_list", retirada: "409 invalid_transition" }, estado: "LOTTED" },
    );
  });

  test("RV9b · P11: o resgate com a leitura atual devolve à custódia; depois dele, o relote recusa 409 resale_not_pending", async () => {
    const ctx = await resaleScenario("RV9b");
    await newRound(ctx, 3);
    const resgate = res(await reclaim(ctx, await readSeq(ctx)));
    const relote = res(await relot(ctx, 3, await readSeq(ctx)));
    check({ resgate, relote, estado: (await row(ctx)).status }, { resgate: "200", relote: "409 resale_not_pending", estado: "ACTIVE_CUSTODY" });
  });

  test("RV12 · INTERNO: relotAtomic direto num processo em lote com venda efetiva semeada: 409 resale_not_pending; nada gravado", async () => {
    const ctx = await seed("RV12", { status: "LOTTED" });
    await withTenantRls(client, ctx.tenantId, async (tx) => {
      await tx.$executeRaw`
        INSERT INTO auction_edicts (tenant_id, process_id, round_number, classification, appraisal_amount, min_bid_amount, edict_reference, published_at, business_days, status)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 1, 'CONSERVED', 10000.00, 5000.00, 'EDITAL-1/2026', ${new Date(Date.now() - 30 * MS_PER_DAY)}, 15, 'LOTTED'),
               (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 3, 'CONSERVED', 10000.00, 5000.00, 'EDITAL-3/2026', ${new Date(Date.now() - 30 * MS_PER_DAY)}, 15, 'DESIGNATED')`;
      await tx.$executeRaw`
        INSERT INTO auction_attempts (tenant_id, process_id, round_number, outcome, winner_ref, sold_amount, sale_note_reference)
        VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 1, 'SOLD', 'Arrematante 1', 8000.00, 'NOTA-1')`;
    });
    const seq = (await auctionRepo.getState(ctx.tenantId, ctx.processId))?.custodySeqHead ?? -1;
    const result = await outcome(() => auctionRepo.relotAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: seq, actorId: ctx.userId, occurredAt: new Date() }));
    check({ result, editais: await edicts(ctx), eventos: await eventsAfter(ctx, seq) }, { result: "409 resale_not_pending", editais: { 1: "LOTTED", 3: "DESIGNATED" }, eventos: [] });
  });

  test("RV12b · INTERNO (#631): relotAtomic direto com tudo quitado semeado: 409 auction_debts_settled; nada gravado", async () => {
    const ctx = await resaleScenario("RV12b");
    await newRound(ctx, 3);
    await withTenantRls(client, ctx.tenantId, (tx) => tx.$executeRaw`UPDATE process_charges SET settled_at = now() WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid`);
    const seq = (await auctionRepo.getState(ctx.tenantId, ctx.processId))?.custodySeqHead ?? -1;
    const result = await outcome(() => auctionRepo.relotAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: seq, actorId: ctx.userId, occurredAt: new Date() }));
    check({ result, edital3: (await edicts(ctx))[3], eventos: await eventsAfter(ctx, seq) }, { result: "409 auction_debts_settled", edital3: "DESIGNATED", eventos: [] });
  });

  test("RV14 · leitura pela rota em quatro momentos: resalePending falso, verdadeiro, falso, falso; custodySeq inteiro em todos; nenhum campo além dos seis da leitura", async () => {
    const ctx = await seed("RV14", { status: "AUCTION_ELIGIBLE" });
    const auction = await createDefaultAuctionService();
    await newRound(ctx, 1);
    await auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 });
    await auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 1));
    const moments: Array<Record<string, unknown>> = [];
    const snap = async () => {
      const data = (await http(ctx, "GET", "")).data;
      moments.push({ pendente: data.resalePending, seqInteiro: Number.isInteger(data.custodySeq), campos: Object.keys(data).sort() });
    };
    await snap();
    await auction.defaultAuction(actor(ctx), ctx.processId, { round_number: 2 });
    await snap();
    await newRound(ctx, 3);
    await relot(ctx, 3, await readSeq(ctx));
    await snap();
    const venda3 = await outcome(() => auction.recordSale(actor(ctx), ctx.processId, saleBody("7000.00", 3)));
    await snap();
    const campos = ["custodySeq", "maxAttempts", "resalePending", "status", "strikeCount", "strikesRemaining"];
    check({ venda3, moments }, { venda3: "aceito", moments: [false, true, false, false].map((pendente) => ({ pendente, seqInteiro: true, campos })) });
  });

  test("RV15 · relote da rodada 3 com s0 e depois resgate com a mesma leitura s0: relote 200; resgate 409 auction_reading_stale; segue LOTTED com o edital 3 em lote; nenhum STATUS_CHANGE de resgate", async () => {
    const ctx = await resaleScenario("RV15");
    await newRound(ctx, 3);
    const s0 = await readSeq(ctx);
    const relote = res(await relot(ctx, 3, s0));
    const resgate = res(await reclaim(ctx, s0));
    const chain = await events(ctx);
    check(
      { relote, resgate, estado: (await row(ctx)).status, edital3: (await edicts(ctx))[3], resgatesNaCadeia: chain.filter((event) => event.type === "STATUS_CHANGE" && event.payload?.reason === "reclaimed_before_sale").length },
      { relote: "200", resgate: "409 auction_reading_stale", estado: "LOTTED", edital3: "LOTTED", resgatesNaCadeia: 0 },
    );
  });

  test("RV15b · P11 e #631: depois do relote, o gestor resgata com a leitura atual (200, ACTIVE_CUSTODY, edital 3 encerrado, um período só, da 1ª preparação ao resgate); 2 dias depois a varredura lança 2 e ficam 92; num gêmeo, o administrador também resgata", async () => {
    const ctx = await resaleScenario("RV15b");
    const prepAt = await lastEventAt(ctx, "AUCTION_PREP");
    await newRound(ctx, 3);
    await relot(ctx, 3, await readSeq(ctx));
    const gestor = res(await reclaim(ctx, await readSeq(ctx), "manager"));
    const reclaimAt = await lastEventAt(ctx, "STATUS_CHANGE", "reclaimed_before_sale");
    const periodos = await suspensions(ctx);
    await shiftDays(ctx, 2);
    const sweep = await (await createDefaultChargeService()).accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const twin = await resaleScenario("RV15b-adm");
    await newRound(twin, 3);
    await relot(twin, 3, await readSeq(twin));
    const administrador = res(await reclaim(twin, await readSeq(twin), "tenant_admin"));
    check(
      { gestor, estado: (await row(ctx)).status, edital3: (await edicts(ctx))[3], periodos, lancadas: sweep.accrued, diarias: await dailyCount(ctx), administrador, estadoGemeo: (await row(twin)).status },
      { gestor: "200", estado: "ACTIVE_CUSTODY", edital3: "CLOSED", periodos: [{ from: prepAt, to: reclaimAt }], lancadas: 2, diarias: 92, administrador: "200", estadoGemeo: "ACTIVE_CUSTODY" },
    );
  });


  test("RV15d · dois resgates em série com a mesma leitura s0: 200 no primeiro; 409 auction_reading_stale no segundo", async () => {
    const ctx = await resaleScenario("RV15d");
    const s0 = await readSeq(ctx);
    const primeiro = res(await reclaim(ctx, s0));
    const segundo = res(await reclaim(ctx, s0));
    check(
      { primeiro, segundo, estado: (await row(ctx)).status, edital1: (await edicts(ctx))[1] },
      { primeiro: "200", segundo: "409 auction_reading_stale", estado: "ACTIVE_CUSTODY", edital1: "CLOSED" },
    );
  });
  test("RV15c · INTERNO: reclaimAtomic direto com expectedCustodySeq = cabeça − 1: 409 auction_reading_stale; nada gravado", async () => {
    const ctx = await resaleScenario("RV15c");
    const seq = (await auctionRepo.getState(ctx.tenantId, ctx.processId))?.custodySeqHead ?? -1;
    const result = await outcome(() => auctionRepo.reclaimAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", expectedCustodySeq: seq - 1, actorId: ctx.userId, occurredAt: new Date() }));
    check({ result, estado: (await row(ctx)).status, eventos: await eventsAfter(ctx, seq), periodosAbertos: (await suspensions(ctx)).filter((item) => item.to === undefined).length }, { result: "409 auction_reading_stale", estado: "LOTTED", eventos: [], periodosAbertos: 1 });
  });

  test("RV16 · relote × resgate com a mesma leitura s0: pela rota em paralelo (6 rodadas) e nas duas ordens de trava (6 rodadas cada): em toda rodada exatamente um 2xx; fica o estado do vencedor; cadeia válida", async () => {
    const observed: string[] = [];
    const bad: string[] = [];
    const judge = async (ctx: Ctx, label: string, relotOk: boolean, reclaimOk: boolean, loser: string): Promise<void> => {
      const status = (await row(ctx)).status;
      const expected = relotOk ? "LOTTED" : "ACTIVE_CUSTODY";
      if (relotOk === reclaimOk) bad.push(`${label}: relote=${relotOk} resgate=${reclaimOk}`);
      else if (status !== expected) bad.push(`${label}: estado ${status}, esperado ${expected}`);
      else if (!["409 auction_reading_stale", "409 concurrent_custody_append", "409 resale_not_pending"].includes(loser)) bad.push(`${label}: perdedor ${loser}`);
      if (!(await chainValid(ctx))) bad.push(`${label}: cadeia inválida`);
      observed.push(relotOk ? "relote" : "resgate");
    };
    for (let round = 0; round < 6; round += 1) {
      const ctx = await resaleScenario(`RV16-r${round}`);
      await newRound(ctx, 3);
      const s0 = await readSeq(ctx);
      const [a, b] = (await Promise.all([relot(ctx, 3, s0), reclaim(ctx, s0)])).map(res);
      await judge(ctx, `rota ${round}`, a === "200", b === "200", a === "200" ? b : a);
    }
    for (const order of ["relote-primeiro", "resgate-primeiro"] as const) {
      for (let round = 0; round < 6; round += 1) {
        const ctx = await resaleScenario(`RV16-${order}-${round}`);
        await newRound(ctx, 3);
        const seq = await readSeq(ctx);
        const relotNow = () => auctionRepo.relotAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: seq, actorId: ctx.userId, occurredAt: new Date() });
        const reclaimNow = () => auctionRepo.reclaimAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", expectedCustodySeq: seq, actorId: ctx.userId, occurredAt: new Date() });
        const [first, second] = order === "relote-primeiro" ? await inLockOrder(ctx, relotNow, reclaimNow) : await inLockOrder(ctx, reclaimNow, relotNow);
        const relotResult = order === "relote-primeiro" ? first : second;
        const reclaimResult = order === "relote-primeiro" ? second : first;
        await judge(ctx, `${order} ${round}`, relotResult === "aceito", reclaimResult === "aceito", relotResult === "aceito" ? reclaimResult : relotResult);
      }
    }
    check({ bad, ordemRelote: observed.slice(6, 12), ordemResgate: observed.slice(12, 18) }, { bad: [], ordemRelote: Array(6).fill("relote"), ordemResgate: Array(6).fill("resgate") });
  });

  test("RV17 · relote × avaliação da rodada 3 com outro lance mínimo, em paralelo, 6 rodadas: o mínimo do edital em lote é o da avaliação se ela foi aceita, ou o anterior; depois do lote, nova avaliação recusa 409 appraisal_locked_after_lot", async () => {
    const observed: unknown[] = [];
    for (let round = 0; round < 6; round += 1) {
      const ctx = await resaleScenario(`RV17-${round}`);
      await newRound(ctx, 3, "5000.00");
      const s0 = await readSeq(ctx);
      const [relotResult, appraisalResult] = (await Promise.all([relot(ctx, 3, s0), http(ctx, "POST", "/appraisal", { round_number: 3, appraisal_amount: "10000.00", min_bid_amount: "6000.00" })])).map(res);
      const minimo = await minBidOf(ctx, 3);
      const depois = res(await http(ctx, "POST", "/appraisal", { round_number: 3, appraisal_amount: "10000.00", min_bid_amount: "7000.00" }));
      observed.push({
        relote: relotResult,
        minimoCoerente: minimo === (appraisalResult === "200" ? "6000.00" : "5000.00"),
        avaliacaoAceitaOuTravada: ["200", "409 appraisal_locked_after_lot"].includes(appraisalResult),
        depois,
        minimoFinalIgual: (await minBidOf(ctx, 3)) === minimo,
      });
    }
    check(observed, Array.from({ length: 6 }, () => ({ relote: "200", minimoCoerente: true, avaliacaoAceitaOuTravada: true, depois: "409 appraisal_locked_after_lot", minimoFinalIgual: true })));
  });

  test("RV27 · avaliação × resultado da mesma rodada nunca troca valores depois do resultado", async () => {
    const observed: unknown[] = [];
    for (const order of ["avaliacao-primeiro", "deserta-primeiro"] as const) {
      for (let round = 0; round < 6; round += 1) {
        const ctx = await seed(`RV27-${order}-${round}`, {
          status: "AUCTION_ELIGIBLE",
        });
        const auction = await createDefaultAuctionService();
        await auction.registerEdict(actor(ctx), ctx.processId, edictBody(1));
        await auction.setAppraisal(actor(ctx), ctx.processId, {
          round_number: 1,
          appraisal_amount: "12000.00",
          min_bid_amount: "6000.00",
        });
        const appraisal = () =>
          auction.setAppraisal(actor(ctx), ctx.processId, {
            round_number: 1,
            appraisal_amount: "11000.00",
            min_bid_amount: "5500.00",
          });
        const deserted = () => auction.recordAttempt(actor(ctx), ctx.processId, { round_number: 1 });
        const [first, second] = order === "avaliacao-primeiro" ? await inLockOrder(ctx, appraisal, deserted) : await inLockOrder(ctx, deserted, appraisal);
        observed.push({
          order,
          first,
          second,
          valores: await appraisalOf(ctx, 1),
          cadeia: await chainValid(ctx),
        });
      }
    }
    for (const order of ["avaliacao-primeiro", "arremate-primeiro"] as const) {
      for (let round = 0; round < 6; round += 1) {
        const ctx = await resaleScenario(`RV27-lote-${order}-${round}`);
        await newRound(ctx, 3, "5000.00");
        await relot(ctx, 3, await readSeq(ctx));
        const auction = await createDefaultAuctionService();
        const appraisal = () =>
          auction.setAppraisal(actor(ctx), ctx.processId, {
            round_number: 3,
            appraisal_amount: "11000.00",
            min_bid_amount: "5500.00",
          });
        const sale = () => auction.recordSale(actor(ctx), ctx.processId, saleBody("8000.00", 3));
        const [first, second] = order === "avaliacao-primeiro" ? await inLockOrder(ctx, appraisal, sale) : await inLockOrder(ctx, sale, appraisal);
        observed.push({
          order,
          first,
          second,
          valores: await appraisalOf(ctx, 3),
          cadeia: await chainValid(ctx),
        });
      }
    }
    const expected = [
      ...Array.from({ length: 6 }, () => ({
        order: "avaliacao-primeiro",
        first: "aceito",
        second: "aceito",
        valores: "11000.00/5500.00 DESIGNATED",
        cadeia: true,
      })),
      ...Array.from({ length: 6 }, () => ({
        order: "deserta-primeiro",
        first: "aceito",
        second: "409 appraisal_round_has_result",
        valores: "12000.00/6000.00 DESIGNATED",
        cadeia: true,
      })),
      ...Array.from({ length: 6 }, () => ({
        order: "avaliacao-primeiro",
        first: "409 appraisal_locked_after_lot",
        second: "aceito",
        valores: "10000.00/5000.00 LOTTED",
        cadeia: true,
      })),
      ...Array.from({ length: 6 }, () => ({
        order: "arremate-primeiro",
        first: "aceito",
        second: "409 appraisal_locked_after_lot",
        valores: "10000.00/5000.00 LOTTED",
        cadeia: true,
      })),
    ];
    check(observed, expected);
  });

  test("RV18 · depois do relote da rodada 3, com a leitura nova: edital da rodada 4 → 409 auction_edict_wrong_state; relote da 4 → 409 resale_not_pending; a rodada 3 segue em lote", async () => {
    const ctx = await resaleScenario("RV18");
    await newRound(ctx, 3);
    await relot(ctx, 3, await readSeq(ctx));
    const edital4 = res(await http(ctx, "POST", "/edicts", edictBody(4)));
    const relote4 = res(await relot(ctx, 4, await readSeq(ctx)));
    check({ edital4, relote4, editais: await edicts(ctx) }, { edital4: "409 auction_edict_wrong_state", relote4: "409 resale_not_pending", editais: { 1: "CLOSED", 3: "LOTTED" } });
  });

  test("RV20 · o ABA: leitura s0 na revenda pendente; resgate com s0 (200); volta pelo caminho normal (elegível, preparação e lote da rodada 1); relote da rodada 3 com o s0 antigo → 409 auction_reading_stale; a rodada 1 segue em lote", async () => {
    const ctx = await resaleScenario("RV20");
    const auction = await createDefaultAuctionService();
    await newRound(ctx, 3);
    const s0 = await readSeq(ctx);
    const resgate = res(await reclaim(ctx, s0));
    const elegivel = await outcome(() => auction.markEligible(actor(ctx), ctx.processId));
    const preparacao = await outcome(() => auction.prepareForAuction(actor(ctx), ctx.processId, { round_number: 1 }));
    const lote = await outcome(() => auction.lotForAuction(actor(ctx), ctx.processId, { round_number: 1 }));
    const caminho = { resgate, elegivel, preparacao, lote, pendenteDeNovo: (await http(ctx, "GET", "")).data.resalePending };
    const relote = res(await relot(ctx, 3, s0));
    check(
      { caminho, relote, editais: await edicts(ctx), estado: (await row(ctx)).status },
      { caminho: { resgate: "200", elegivel: "aceito", preparacao: "aceito", lote: "aceito", pendenteDeNovo: true }, relote: "409 auction_reading_stale", editais: { 1: "LOTTED", 3: "DESIGNATED" }, estado: "LOTTED" },
    );
  });

  test("RV21 · resgate sem custody_seq → 422 custody_seq_required; com 'abc' → 422 custody_seq_invalid; relote sem custody_seq → 422 custody_seq_required; nada gravado", async () => {
    const ctx = await resaleScenario("RV21");
    await newRound(ctx, 3);
    const seq = await readSeq(ctx);
    check(
      { semMarcador: res(await reclaim(ctx, undefined)), texto: res(await reclaim(ctx, "abc")), relote: res(await relot(ctx, 3, undefined)), eventos: await eventsAfter(ctx, seq), estado: (await row(ctx)).status },
      { semMarcador: "422 custody_seq_required", texto: "422 custody_seq_invalid", relote: "422 custody_seq_required", eventos: [], estado: "LOTTED" },
    );
  });

  test("RV22 · #631: revenda pendente com uma cobrança on-line viva (semeada, molde Q8): relote → 409 lot_payment_pending; edital 3 fora do lote; nenhum evento novo", async () => {
    const ctx = await resaleScenario("RV22");
    await newRound(ctx, 3);
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
    const seq = await readSeq(ctx);
    check(
      { relote: res(await relot(ctx, 3, seq)), edital3: (await edicts(ctx))[3], eventos: await eventsAfter(ctx, seq) },
      { relote: "409 lot_payment_pending", edital3: "DESIGNATED", eventos: [] },
    );
  });
}
