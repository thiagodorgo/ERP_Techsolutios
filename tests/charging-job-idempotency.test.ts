import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Motor de diárias (I4) sob o Postgres vivo: idempotência (partial-unique period_seq + FOR UPDATE), catch-up,
// ADJUSTMENT append-only, cadeia I2 (CHARGE_ACCRUAL) e concorrência real. DB-gated (skip sem DATABASE_URL).
// NÃO seta process.env (node --test compartilha o processo entre arquivos) — constrói os serviços com um
// PrismaClient DEDICADO + repos diretos (padrão de impound-concurrency), sem depender do env-gate/singleton.
if (!connectionString) {
  test("charging daily accrual DB idempotency requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const MS_PER_DAY = 86_400_000;
  const T0 = new Date("2024-05-01T12:00:00.000Z");

  test("charging: motor de diárias no Postgres vivo — idempotência (period_seq), catch-up, ADJUSTMENT append-only, cadeia I2, concorrência", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
    const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
    const { RlsPrismaChargeRepository } = await import("../src/modules/charging/charge-prisma.repository.js");
    const { ChargeService } = await import("../src/modules/charging/charge.service.js");
    type Tariff = import("../src/modules/tariffs/tariff.types.js").Tariff;
    type TariffResolver = import("../src/modules/tariffs/tariff-resolution.js").TariffResolver;

    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const impound = new ImpoundService(new RlsPrismaImpoundRepository(client));
    const makeTariff = (unitPrice: number): Tariff => ({
      id: randomUUID(),
      tenantId: "stub",
      priceTableId: randomUUID(),
      name: "Diária",
      unitPrice,
      currency: "BRL",
      origin: "test",
      status: "active",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const stubResolver: TariffResolver = async () => makeTariff(10);
    const service = new ChargeService(new RlsPrismaChargeRepository(client), stubResolver);

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let tenantId: string | undefined;

    try {
      const tenant = await client.tenant.create({ data: { name: `CHG Tenant ${suffix}`, slug: `chg-${suffix}` } });
      tenantId = tenant.id;
      const user = await client.user.create({ data: { tenant_id: tenant.id, name: "CHG User", email: `chg-${suffix}@example.com` } });
      const profile = await client.jurisdictionProfile.create({
        data: { tenant_id: tenant.id, name: `CHG Perfil ${suffix}`, scope: "PUBLIC_AGREEMENT", daily_model: "ROLLING_24H", daily_cap: "SIX_MONTHS" },
      });
      const svc = await client.serviceCatalog.create({ data: { tenant_id: tenant.id, name: `CHG Diária ${suffix}` } });
      await client.jurisdictionProfile.update({ where: { id: profile.id }, data: { daily_service_catalog_id: svc.id } });

      const actor = {
        tenantId: tenant.id,
        userId: user.id,
        roles: ["manager" as const],
        permissions: ["impound:read", "impound:create", "charging:read", "charging:create"] as const,
      };

      // Processo com cadeia VÁLIDA via o serviço de impound (opening STATUS_CHANGE seq=1); depois backdate do t0.
      const process = await impound.create(actor, {
        profile_id: profile.id,
        origin_authority: "Autoridade solicitante",
        vehicle_unidentified: true,
        unidentified_reason: "Aguardando vistoria de recepção",
      });
      await client.impoundProcess.update({ where: { id: process.id }, data: { entered_at: T0, status: "ACTIVE_CUSTODY" } });

      // (C1) constraint viva: um DAILY com period_seq NULL é REJEITADO pelo daily_shape_chk (fecha o furo da
      // lógica-3-valores que burlava a idempotência — dupla cobrança). ref_date preenchida, FK do processo OK →
      // só o CHECK pode reprovar. Esperado: 23514 (check_violation).
      await assert.rejects(
        client.$executeRawUnsafe(
          `INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount)
           VALUES ('${tenant.id}'::uuid, '${process.id}'::uuid, 'DAILY', NULL, DATE '2024-05-01', 1, 10.00, 10.00)`,
        ),
        (error: unknown) => {
          const msg = String((error as Error)?.message ?? error);
          return msg.includes("process_charges_daily_shape_chk") || msg.includes("23514") || msg.toLowerCase().includes("check");
        },
        "DAILY com period_seq NULL deve violar process_charges_daily_shape_chk",
      );

      const dailyCount = async (): Promise<number> =>
        (await service.list(actor, process.id)).filter((c) => c.kind === "DAILY").length;
      const dailySeqs = async (): Promise<number[]> =>
        (await service.list(actor, process.id)).filter((c) => c.kind === "DAILY").map((c) => c.periodSeq ?? 0).sort((a, b) => a - b);

      // (A) idempotência: acumular 2× o mesmo now não duplica (partial-unique period_seq + FOR UPDATE).
      const nowA = new Date(T0.getTime() + 5 * MS_PER_DAY);
      const r1 = await service.accrueProcess(tenant.id, process.id, nowA);
      const r2 = await service.accrueProcess(tenant.id, process.id, nowA);
      assert.equal(r1.accrued, 5, "1º passe cria 5 diárias");
      assert.equal(r2.accrued, 0, "2º passe (mesmo now) NÃO duplica");
      assert.equal(await dailyCount(), 5);

      // (B) catch-up: "worker caído" 3 dias → o passe seguinte preenche as faltantes, contíguas.
      const r3 = await service.accrueProcess(tenant.id, process.id, new Date(T0.getTime() + 8 * MS_PER_DAY));
      assert.equal(r3.accrued, 3, "catch-up cria as 3 faltantes (6,7,8)");
      assert.deepEqual(await dailySeqs(), [1, 2, 3, 4, 5, 6, 7, 8]);

      // (C) concorrência: 3 passes PARALELOS no mesmo processo (t0+12d) → periods 9..12 exatamente 1× cada.
      const nowC = new Date(T0.getTime() + 12 * MS_PER_DAY);
      const parallel = await Promise.all([
        service.accrueProcess(tenant.id, process.id, nowC),
        service.accrueProcess(tenant.id, process.id, nowC),
        service.accrueProcess(tenant.id, process.id, nowC),
      ]);
      const totalConcurrent = parallel.reduce((sum, r) => sum + r.accrued, 0);
      assert.equal(totalConcurrent, 4, "concorrência: 4 diárias novas no total (sem duplicata)");
      assert.deepEqual(await dailySeqs(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "period_seq contíguo, sem duplicata");

      // (D) CHARGE_ACCRUAL na cadeia + verifyChain valid (I2 íntegro após acumular).
      const verifyAfterAccrual = await impound.verify(actor, process.id);
      assert.equal(verifyAfterAccrual.valid, true, "cadeia I2 valid após 12 CHARGE_ACCRUAL");
      const events = await impound.listEvents(actor, process.id);
      assert.equal(events.filter((e) => e.type === "CHARGE_ACCRUAL").length, 12);

      // (E) ADJUSTMENT append-only: nova linha + evento ADJUSTMENT; a diária original intacta; cadeia valid.
      const target = (await service.list(actor, process.id)).find((c) => c.kind === "DAILY" && c.periodSeq === 2);
      assert.ok(target);
      const adjustment = await service.createManual(actor, process.id, {
        kind: "ADJUSTMENT",
        unit_amount: "3.00", // magnitude >= 0; o SINAL vive no total_amount (contrato do ledger / CHECK)
        total_amount: "-3.00",
        quantity: "1",
        ref_date: target.refDate,
        adjustment_of_charge_id: target.id,
        description: "Correção retroativa",
      });
      assert.equal(adjustment.totalAmount, "-3.00", "ADJUSTMENT aceita delta negativo (CHECK relaxado)");
      const originalStill = (await service.list(actor, process.id)).find((c) => c.id === target.id);
      assert.equal(originalStill?.totalAmount, "10.00", "diária original NÃO sobrescrita (append-only)");
      assert.equal(await dailyCount(), 12, "nenhuma diária removida pelo ADJUSTMENT");
      const verifyAfterAdjust = await impound.verify(actor, process.id);
      assert.equal(verifyAfterAdjust.valid, true, "cadeia I2 valid após ADJUSTMENT");
      const eventsAfter = await impound.listEvents(actor, process.id);
      assert.equal(eventsAfter.filter((e) => e.type === "ADJUSTMENT").length, 1);

      // (F) run bookkeeping: accrueTenantScan abre/fecha um DailyAccrualRun (completed).
      const scan = await service.accrueTenantScan(tenant.id, nowC);
      assert.ok(scan.runId, "sweep abre um DailyAccrualRun");
      const run = await client.dailyAccrualRun.findUnique({ where: { id: scan.runId } });
      assert.equal(run?.status, "completed");
    } finally {
      if (tenantId) {
        // TEARDOWN FK-SAFE (superuser + session_replication_role=replica p/ o trigger append-only de custody_events;
        // process_charges/daily_accrual_runs/audit_logs ANTES de impound_processes; jurisdiction ANTES de service_catalog).
        await client.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
          await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM process_charges WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM daily_accrual_runs WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${tenantId}'::uuid`);
        });
      }
      await client.$disconnect();
    }
  });
}
