import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  createEphemeralRole,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S-c (SC) — HD1 (trava do dev, 1.8.3 §6): a conferência de sessão com par `concessao`
// não pode custar mais de 20 ms de p95 além da conferência do par de origem (não concessao), no
// mesmo banco. O X5 (par não concessao = exatamente 1 leitura) também é conferido aqui.
// Comando do plano: node --test --import tsx tests/bapporg2sc_custo-db.test.ts
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
process.env.CORE_SAAS_PERSISTENCE = "prisma";

const connectionString = process.env.DATABASE_URL;
const randomHex = (length: number): string => randomBytes(length).toString("hex");

if (!connectionString) {
  test("B-APP-ORG-2S-c (HD1) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrations para executar esta suíte.",
  });
} else {
  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly groupIds: string[];
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);
      (globalThis as { prisma?: unknown }).prisma = role.client;
      return { admin, role, tenantIds: [], groupIds: [] };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await h.admin.userCreationLog.deleteMany({ where: { tenant_id: { in: h.tenantIds } } });
      await h.admin.economicGroupMember.deleteMany({ where: { tenant_id: { in: h.tenantIds } } });
      await h.admin.economicGroup.deleteMany({ where: { id: { in: h.groupIds } } });
      await cleanupIdentityFixture(h.admin, h.tenantIds);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  test("HD1 — p95 da conferência de sessão (concessao) menos p95 (origem) ≤ 20 ms; par não concessao = 1 leitura", async () => {
    const h = await harness();
    const suffix = `${Date.now()}-${randomHex(4)}`;

    const group = await h.admin.economicGroup.create({ data: { name: `SC HD1 ${suffix}` } });
    h.groupIds.push(group.id);
    const origin = await h.admin.tenant.create({
      data: { name: `SC HD1 P ${suffix}`, slug: `sc-hd1-p-${suffix.toLowerCase()}` },
    });
    const dest = await h.admin.tenant.create({
      data: { name: `SC HD1 Y ${suffix}`, slug: `sc-hd1-y-${suffix.toLowerCase()}` },
    });
    h.tenantIds.push(origin.id, dest.id);

    await h.admin.$executeRaw`
      INSERT INTO economic_group_members (tenant_id, group_id, valid_from)
      VALUES (${origin.id}::uuid, ${group.id}::uuid, '2026-11-01'::date)
    `;
    await h.admin.$executeRaw`
      INSERT INTO economic_group_members (tenant_id, group_id, valid_from)
      VALUES (${dest.id}::uuid, ${group.id}::uuid, '2026-11-01'::date)
    `;

    const email = `sc-hd1-${suffix}@example.com`;
    const originUser = await h.admin.user.create({
      data: { tenant_id: origin.id, name: `Origem ${suffix}`, email, status: "active" },
      select: { id: true },
    });
    const destUser = await h.admin.user.create({
      data: { tenant_id: dest.id, name: `Destino ${suffix}`, email, status: "active" },
      select: { id: true },
    });
    const identity = await h.admin.authIdentity.create({ data: { id: randomUUID() } });

    await h.admin.authIdentityLink.create({
      data: { identity_id: identity.id, tenant_id: origin.id, user_id: originUser.id, attached_via: "backfill" },
    });
    await h.admin.authIdentityLink.create({
      data: { identity_id: identity.id, tenant_id: dest.id, user_id: destUser.id, attached_via: "concessao" },
    });
    await h.admin.userCreationLog.create({
      data: {
        tenant_id: dest.id,
        user_id: destUser.id,
        origin_tenant_id: origin.id,
        state: "concessao",
        email_key: randomHex(32),
      },
    });

    const { withTenantRls } = await import("../src/database/rls.js");
    const { grantEndedByGroupExit, isGrantOutsideGroup } = await import(
      "../src/modules/core-saas/services/grant-group-guard.js"
    );

    const conference = (tenantId: string, userId: string): Promise<boolean> =>
      withTenantRls(h.role.client, tenantId, (tx) =>
        grantEndedByGroupExit(tx, { tenantId, userId }),
      );

    // Aquecimento: as primeiras chamadas abrem pool/cache e estabilizam a fila de conexões.
    for (let warm = 0; warm < 30; warm += 1) {
      await conference(dest.id, destUser.id);
      await conference(origin.id, originUser.id);
    }

    const measure = async (tenantId: string, userId: string, rounds: number): Promise<number[]> => {
      const samples: number[] = [];

      for (let index = 0; index < rounds; index += 1) {
        const start = process.hrtime.bigint();
        await conference(tenantId, userId);
        const end = process.hrtime.bigint();
        samples.push(Number(end - start) / 1_000_000);
      }

      return samples.sort((left, right) => left - right);
    };

    const concessaoSamples = await measure(dest.id, destUser.id, 200);
    const origemSamples = await measure(origin.id, originUser.id, 200);

    const p95 = (sorted: number[]): number => sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted.at(-1)!;

    const concessaoP95 = p95(concessaoSamples);
    const origemP95 = p95(origemSamples);

    assert.ok(
      concessaoP95 - origemP95 <= 20,
      `p95(concessao)=${concessaoP95.toFixed(2)} ms, p95(origem)=${origemP95.toFixed(2)} ms; diferença deve ser ≤ 20 ms`,
    );

    // X5 dentro do HD1: par que não é concessao faz exatamente 1 leitura (o modo do vínculo).
    const counts = { link: 0, group: 0, log: 0 };
    const wrap = (tx: Prisma.TransactionClient): Prisma.TransactionClient =>
      new Proxy(tx, {
        get(target, prop) {
          if (prop === "authIdentityLink") {
            return new Proxy(Reflect.get(target, prop), {
              get(target2, prop2) {
                const value = Reflect.get(target2, prop2);
                if (prop2 === "findFirst") {
                  return (...args: unknown[]) => {
                    counts.link += 1;
                    return (value as (...a: unknown[]) => unknown).apply(target2, args);
                  };
                }
                return typeof value === "function" ? value.bind(target2) : value;
              },
            });
          }
          if (prop === "userCreationLog") {
            return new Proxy(Reflect.get(target, prop), {
              get(target2, prop2) {
                const value = Reflect.get(target2, prop2);
                if (prop2 === "findFirst") {
                  return (...args: unknown[]) => {
                    counts.log += 1;
                    return (value as (...a: unknown[]) => unknown).apply(target2, args);
                  };
                }
                return typeof value === "function" ? value.bind(target2) : value;
              },
            });
          }
          if (prop === "$queryRaw") {
            const value = Reflect.get(target, prop);
            return (...args: unknown[]) => {
              counts.group += 1;
              return (value as (...a: unknown[]) => unknown).apply(target, args);
            };
          }
          const value = Reflect.get(target, prop);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });

    const outside = await withTenantRls(h.role.client, origin.id, (tx) =>
      isGrantOutsideGroup(wrap(tx), origin.id, originUser.id),
    );

    assert.equal(outside, false);
    assert.deepEqual(counts, { link: 1, group: 0, log: 0 }, "par não concessao: exatamente 1 leitura");
  });
}
