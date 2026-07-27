import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-09 — trilha de notificações legais (I6) sob o Postgres vivo: cadeia hash I2 com NOTIFICATION intercalado
// a STATUS_CHANGE + CHARGE_ACCRUAL (prova a PARIDADE da 3ª réplica do append), cross-anchor reconciliado,
// tamper-evidência, concorrência (1 linha/1 evento por (process,kind)) e allowlist §2.8 (sem PII no payload/audit).
// DB-gated (skip sem DATABASE_URL). NÃO seta process.env (node --test compartilha o processo entre arquivos) —
// constrói os serviços com um PrismaClient DEDICADO + repos diretos (padrão de charging-job-idempotency).
if (!connectionString) {
  test("impound notifications DB chain requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const MS_PER_DAY = 86_400_000;
  const T0 = new Date("2024-05-01T12:00:00.000Z");

  test("notifications: cadeia I2 (NOTIFICATION intercalado), cross-anchor, tamper, concorrência, allowlist §2.8", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
    const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
    const { RlsPrismaChargeRepository } = await import("../src/modules/charging/charge-prisma.repository.js");
    const { ChargeService } = await import("../src/modules/charging/charge.service.js");
    const { RlsPrismaNotificationRepository } = await import("../src/modules/impound/impound.notifications-prisma.repository.js");
    const { NotificationService } = await import("../src/modules/impound/impound.notifications.service.js");
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
    const charge = new ChargeService(new RlsPrismaChargeRepository(client), stubResolver);
    const notify = new NotificationService(new RlsPrismaNotificationRepository(client));

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let tenantId: string | undefined;

    try {
      const tenant = await client.tenant.create({ data: { name: `NOTIF Tenant ${suffix}`, slug: `notif-${suffix}` } });
      tenantId = tenant.id;
      const user = await client.user.create({ data: { tenant_id: tenant.id, name: "NOTIF User", email: `notif-${suffix}@example.com` } });
      const profile = await client.jurisdictionProfile.create({
        data: { tenant_id: tenant.id, name: `NOTIF Perfil ${suffix}`, scope: "PUBLIC_AGREEMENT", owner_notif_days: 10, notice_edict_day: 30, daily_model: "ROLLING_24H", daily_cap: "SIX_MONTHS" },
      });
      const svc = await client.serviceCatalog.create({ data: { tenant_id: tenant.id, name: `NOTIF Diária ${suffix}` } });
      await client.jurisdictionProfile.update({ where: { id: profile.id }, data: { daily_service_catalog_id: svc.id } });

      const actor = {
        tenantId: tenant.id,
        userId: user.id,
        roles: ["manager" as const],
        permissions: ["impound:read", "impound:create", "impound:notify", "charging:read", "charging:create"] as const,
      };

      // Processo com cadeia VÁLIDA (opening STATUS_CHANGE seq=1); backdate do t0 + ACTIVE_CUSTODY (correndo o rito).
      const process = await impound.create(actor, {
        profile_id: profile.id,
        origin_authority: "Autoridade solicitante",
        vehicle_unidentified: true,
        unidentified_reason: "Aguardando vistoria de recepção",
      });
      await client.impoundProcess.update({ where: { id: process.id }, data: { entered_at: T0, status: "ACTIVE_CUSTODY" } });

      // Intercala CHARGE_ACCRUAL (5 diárias) ANTES das notificações — prova a paridade da 3ª réplica do append.
      await charge.accrueProcess(tenant.id, process.id, new Date(T0.getTime() + 5 * MS_PER_DAY));

      // (i) marcação DEVIDA: t0+40d ⇒ 2 NOTIFICATION DUE (OWNER_INITIAL@t0+10d, COMPLEMENTARY_EDICT@t0+30d).
      const marked = await notify.markDueProcess(tenant.id, process.id, new Date(T0.getTime() + 40 * MS_PER_DAY));
      assert.equal(marked.marked, 2, "2 marcos devidos em t0+40d");
      const dueList = await notify.list(actor, process.id);
      assert.equal(dueList.length, 2);
      assert.deepEqual(dueList.map((notification) => notification.kind), ["OWNER_INITIAL", "COMPLEMENTARY_EDICT"]);

      // EMISSÃO (DUE→ISSUED) + DISPENSA (DUE→WAIVED) — cada uma encadeia um NOTIFICATION a mais.
      const owner = dueList[0];
      const edict = dueList[1];
      const RECIPIENT = "MASKED-REF-ABC-123";
      const issued = await notify.issue(actor, process.id, owner.id, { channel: "POSTAL", recipient_ref: RECIPIENT, issued_at: new Date(T0.getTime() + 11 * MS_PER_DAY).toISOString() });
      assert.equal(issued.status, "ISSUED");
      const waived = await notify.waive(actor, process.id, edict.id, { reason: "Proprietário regularizou e retirou" });
      assert.equal(waived.status, "WAIVED");
      // reemitir ⇒ 409 not_due (guarda de status sob o updateMany).
      await assert.rejects(
        () => notify.issue(actor, process.id, owner.id, { channel: "SNE" }),
        (error: unknown) => (error as { reason?: string }).reason === "not_due",
      );

      // (i)+(ii) verifyChain valid com NOTIFICATION intercalado a STATUS_CHANGE + CHARGE_ACCRUAL + cross-anchor.
      const verify = await impound.verify(actor, process.id);
      assert.equal(verify.valid, true, "cadeia I2 valid com NOTIFICATION intercalado (paridade da réplica) + cross-anchor reconciliado");
      const events = await impound.listEvents(actor, process.id);
      const notifEvents = events.filter((event) => event.type === "NOTIFICATION");
      assert.equal(notifEvents.length, 4, "2 DUE + 1 issued + 1 waived");
      assert.ok(events.some((event) => event.type === "STATUS_CHANGE"), "STATUS_CHANGE presente");
      assert.equal(events.filter((event) => event.type === "CHARGE_ACCRUAL").length, 5, "5 CHARGE_ACCRUAL intercalados");

      // (v) allowlist §2.8: payload do NOTIFICATION só {event, kind, notificationId, dueAt, status, channel?} —
      // ZERO recipient_ref/PII/tenant_id/process UUID. O cross-anchor (audit_logs) só {processId, seq, hash}.
      for (const event of notifEvents) {
        const payloadStr = JSON.stringify(event.payload);
        assert.equal(payloadStr.includes(RECIPIENT), false, "recipient_ref NUNCA vaza ao payload da cadeia");
        assert.equal(payloadStr.includes(tenant.id), false, "tenant_id NUNCA no payload");
        assert.equal(payloadStr.includes(process.id), false, "process UUID cru NUNCA no payload");
        const payload = event.payload as Record<string, unknown>;
        const allowed = new Set(["event", "kind", "notificationId", "dueAt", "status", "channel"]);
        for (const key of Object.keys(payload)) {
          assert.ok(allowed.has(key), `payload key inesperada: ${key}`);
        }
      }
      const anchors = await client.$queryRaw<Array<{ metadata: unknown }>>`
        SELECT metadata FROM audit_logs
        WHERE tenant_id = ${tenant.id}::uuid AND action = 'impound.custody_event.appended' AND entity = 'custody_event'
      `;
      for (const anchor of anchors) {
        const metaStr = JSON.stringify(anchor.metadata);
        assert.equal(metaStr.includes(RECIPIENT), false, "recipient_ref NUNCA no cross-anchor");
        const meta = anchor.metadata as Record<string, unknown>;
        assert.deepEqual(Object.keys(meta).sort(), ["hash", "processId", "seq"], "cross-anchor só {processId, seq, hash}");
      }

      // (iii) tamper-evidência: mutar o payload de UM evento NOTIFICATION (bypass do trigger via replica) → hash_mismatch.
      const target = notifEvents[0];
      await client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        await tx.$executeRawUnsafe(
          `UPDATE custody_events SET payload = jsonb_set(payload, '{status}', '"HACKED"') WHERE tenant_id = '${tenant.id}'::uuid AND id = '${target.id}'::uuid`,
        );
      });
      const tampered = await impound.verify(actor, process.id);
      assert.equal(tampered.valid, false, "adulterar o payload de um NOTIFICATION quebra a cadeia");
      assert.equal(tampered.brokenAt?.reason, "hash_mismatch");
      assert.equal(tampered.brokenAt?.seq, target.seq);
    } finally {
      if (tenantId) {
        // TEARDOWN FK-SAFE (superuser + replica p/ o trigger append-only de custody_events). process_notifications/
        // process_charges → impound_processes/tenant é RESTRICT: purga ANTES do processo. attachments (comprovante)
        // e audit_logs antes do tenant. jurisdiction ANTES de service_catalog.
        await client.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
          await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM process_notifications WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM process_charges WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM daily_accrual_runs WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM attachments WHERE tenant_id = '${tenantId}'::uuid`);
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

  test("notifications: concorrência — 2 ticks paralelos na MESMA (process,kind) ⇒ 1 linha + 1 evento por kind", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
    const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
    const { RlsPrismaNotificationRepository } = await import("../src/modules/impound/impound.notifications-prisma.repository.js");
    const { NotificationService } = await import("../src/modules/impound/impound.notifications.service.js");

    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const impound = new ImpoundService(new RlsPrismaImpoundRepository(client));
    const notify = new NotificationService(new RlsPrismaNotificationRepository(client));
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let tenantId: string | undefined;

    try {
      const tenant = await client.tenant.create({ data: { name: `NOTIF Conc ${suffix}`, slug: `notif-conc-${suffix}` } });
      tenantId = tenant.id;
      const user = await client.user.create({ data: { tenant_id: tenant.id, name: "NOTIF Conc User", email: `notif-conc-${suffix}@example.com` } });
      const profile = await client.jurisdictionProfile.create({
        data: { tenant_id: tenant.id, name: `NOTIF Conc Perfil ${suffix}`, scope: "PUBLIC_AGREEMENT", owner_notif_days: 10, notice_edict_day: 30, daily_model: "ROLLING_24H", daily_cap: "SIX_MONTHS" },
      });
      const actor = {
        tenantId: tenant.id,
        userId: user.id,
        roles: ["manager" as const],
        permissions: ["impound:read", "impound:create"] as const,
      };
      const process = await impound.create(
        actor,
        { profile_id: profile.id, origin_authority: "Autoridade solicitante", vehicle_unidentified: true, unidentified_reason: "Aguardando vistoria de recepção" },
      );
      await client.impoundProcess.update({ where: { id: process.id }, data: { entered_at: T0, status: "ACTIVE_CUSTODY" } });

      const now = new Date(T0.getTime() + 40 * MS_PER_DAY);
      const parallel = await Promise.all([
        notify.markDueProcess(tenant.id, process.id, now),
        notify.markDueProcess(tenant.id, process.id, now),
        notify.markDueProcess(tenant.id, process.id, now),
      ]);
      const totalMarked = parallel.reduce((sum, result) => sum + result.marked, 0);
      assert.equal(totalMarked, 2, "3 ticks paralelos ⇒ exatamente 2 marcos (1 por kind), sem duplicata");

      const rows = await client.$queryRaw<Array<{ kind: string; count: bigint }>>`
        SELECT kind, COUNT(*)::bigint AS count FROM process_notifications WHERE tenant_id = ${tenant.id}::uuid GROUP BY kind
      `;
      assert.equal(rows.length, 2, "exatamente 2 kinds");
      for (const row of rows) {
        assert.equal(Number(row.count), 1, `1 linha por kind (${row.kind})`);
      }
      const evEvents = await client.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM custody_events WHERE tenant_id = ${tenant.id}::uuid AND type = 'NOTIFICATION'
      `;
      assert.equal(Number(evEvents[0].count), 2, "1 evento NOTIFICATION por marco (sem duplicata na cadeia)");
    } finally {
      if (tenantId) {
        await client.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
          await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM process_notifications WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${tenantId}'::uuid`);
        });
      }
      await client.$disconnect();
    }
  });
}
