import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  cleanupIdentityFixture,
  createEphemeralRole,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — grupo identidade/backfill (§7): o SQL do backfill é EXTRAÍDO DA MIGRAÇÃO REAL
// (entre os marcadores BACKFILL:BEGIN/END) e reexecutado NAS DUAS configurações (V-DEVOPS-1/
// dba 2): privilegiada (cobre a base) e role efêmera NOSUPERUSER (lê ZERO, cria ZERO — a ponta
// silenciosa do §3.2.3 como ASSERÇÃO, não surpresa). Nenhuma detecção depende do output do
// migrate (que descarta warnings — medido pelas duas cadeiras).
// -----------------------------------------------------------------------------------------------

function extractBackfillSql(): string {
  const migration = readFileSync(
    path.join(
      __dirname,
      "..",
      "prisma",
      "migrations",
      "20260868000000_add_auth_identities",
      "migration.sql",
    ),
    "utf8",
  );
  const begin = migration.indexOf("-- BACKFILL:BEGIN");
  const end = migration.indexOf("-- BACKFILL:END");

  assert.ok(begin >= 0 && end > begin, "os marcadores BACKFILL:BEGIN/END precisam existir na migração");

  return migration
    .slice(begin + "-- BACKFILL:BEGIN".length, end)
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

if (!connectionString) {
  test("Identity backfill tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute identity backfill tests.",
  });
} else {
  test("backfill: por usuário (jamais por e-mail), idempotente, com evento na mesma cadeia — nas DUAS configurações", async (t) => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);

    const adminClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const ephemeral = await createEphemeralRole(adminClient, connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const backfillSql = extractBackfillSql();

    try {
      // Fixture: DOIS homônimos (mesmo e-mail, organizações distintas), criados DIRETO no banco
      // — sem vínculo (o caminho da base legada que o backfill cobre).
      const email = `backfill-${suffix}@example.com`;
      const tenantA = await adminClient.tenant.create({
        data: { name: `BF A ${suffix}`, slug: `bf-a-${suffix}` },
      });
      const tenantB = await adminClient.tenant.create({
        data: { name: `BF B ${suffix}`, slug: `bf-b-${suffix}` },
      });

      tenantIds.push(tenantA.id, tenantB.id);

      const userA = await adminClient.user.create({
        data: { tenant_id: tenantA.id, name: "BF A", email },
      });
      const userB = await adminClient.user.create({
        data: { tenant_id: tenantB.id, name: "BF B", email },
      });

      await t.test("configuração PRIVILEGIADA: cobre a base; homônimos nascem em identidades DISTINTAS", async () => {
        await adminClient.$executeRawUnsafe(backfillSql);

        const links = await adminClient.$queryRaw<
          Array<{ user_id: string; identity_id: string; attached_via: string }>
        >`
          SELECT user_id, identity_id, attached_via FROM auth_identity_links
          WHERE tenant_id = ANY(${[tenantA.id, tenantB.id]}::uuid[])
          ORDER BY tenant_id
        `;

        assert.equal(links.length, 2, "um vínculo por USUÁRIO");
        assert.notEqual(
          links[0]?.identity_id,
          links[1]?.identity_id,
          "homônimos NUNCA compartilham identidade (por usuário, jamais por e-mail)",
        );
        assert.deepEqual(
          links.map((link) => link.attached_via),
          ["backfill", "backfill"],
        );

        // O terceiro INSERT (evento) veio na MESMA cadeia: um evento 'backfill' por vínculo.
        const events = await adminClient.$queryRaw<Array<{ event: string; from_identity_id: string | null }>>`
          SELECT event, from_identity_id FROM auth_identity_link_events
          WHERE tenant_id = ANY(${[tenantA.id, tenantB.id]}::uuid[])
        `;

        assert.equal(events.length, 2);

        for (const event of events) {
          assert.equal(event.event, "backfill");
          assert.equal(event.from_identity_id, null, "nascimento: from é nulo");
        }
      });

      await t.test("idempotência: reexecutar cria ZERO — inclusive zero eventos novos", async () => {
        const eventsBefore = await countEvents(adminClient, [tenantA.id, tenantB.id]);

        await adminClient.$executeRawUnsafe(backfillSql);

        const links = await adminClient.authIdentityLink.count({
          where: { tenant_id: { in: [tenantA.id, tenantB.id] } },
        });
        const eventsAfter = await countEvents(adminClient, [tenantA.id, tenantB.id]);

        assert.equal(links, 2, "NOT EXISTS absorve a reexecução");
        assert.equal(eventsAfter, eventsBefore, "reexecução não duplica evento");
      });

      await t.test("a PONTA SILENCIOSA como asserção: sob role efêmera o backfill lê ZERO e cria ZERO", async () => {
        // Um usuário novo SEM vínculo…
        const tenantC = await adminClient.tenant.create({
          data: { name: `BF C ${suffix}`, slug: `bf-c-${suffix}` },
        });

        tenantIds.push(tenantC.id);

        const userC = await adminClient.user.create({
          data: { tenant_id: tenantC.id, name: "BF C", email: `bf-c-${suffix}@example.com` },
        });

        // …e o backfill rodando SEM privilégio: FORCE RLS sem GUC lê zero usuários → verde
        // criando NADA. É exatamente o que aconteceria num migrate com role sem BYPASSRLS.
        await ephemeral.client.$executeRawUnsafe(backfillSql);

        const links = await adminClient.authIdentityLink.count({
          where: { tenant_id: tenantC.id, user_id: userC.id },
        });

        assert.equal(links, 0, "a role sem privilégio termina VERDE tendo criado nada — detectável só pelos discriminantes");

        // Fecho: a configuração privilegiada cobre o que a silenciosa deixou.
        await adminClient.$executeRawUnsafe(backfillSql);

        const linksAfter = await adminClient.authIdentityLink.count({
          where: { tenant_id: tenantC.id, user_id: userC.id },
        });

        assert.equal(linksAfter, 1);
      });

      await t.test("uniques e CHECKs vivos; zero órfãs pós-backfill (discriminantes como invariantes)", async () => {
        // unique (tenant_id, user_id): segundo vínculo do mesmo par estoura.
        await assert.rejects(
          adminClient.$executeRaw`
            INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via)
            SELECT identity_id, tenant_id, user_id, 'backfill' FROM auth_identity_links
            WHERE tenant_id = ${tenantA.id}::uuid AND user_id = ${userA.id}::uuid
          `,
          /duplicate key|unique/i,
        );

        // CHECK de attached_via e de event.
        await assert.rejects(
          adminClient.$executeRaw`
            UPDATE auth_identity_links SET attached_via = 'invalido'
            WHERE tenant_id = ${tenantA.id}::uuid AND user_id = ${userA.id}::uuid
          `,
          /check constraint|attached_via/i,
        );

        // Zero órfãs no ESCOPO da fixture (asserção escopada — nunca contagem global).
        const orphans = await adminClient.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n FROM auth_identities i
          WHERE NOT EXISTS (SELECT 1 FROM auth_identity_links l WHERE l.identity_id = i.id)
            AND i.id IN (
              SELECT identity_id FROM auth_identity_links WHERE tenant_id = ANY(${tenantIds}::uuid[])
              UNION
              SELECT to_identity_id FROM auth_identity_link_events WHERE tenant_id = ANY(${tenantIds}::uuid[])
            )
        `;

        assert.equal(orphans[0]?.n, 0);

        // Usuários sem vínculo = 0 no escopo da fixture (o discriminante nº 1 do §8).
        const unlinked = await adminClient.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n FROM users u
          WHERE u.tenant_id = ANY(${tenantIds}::uuid[])
            AND NOT EXISTS (
              SELECT 1 FROM auth_identity_links l
              WHERE l.tenant_id = u.tenant_id AND l.user_id = u.id
            )
        `;

        assert.equal(unlinked[0]?.n, 0);

        void userB;
      });
    } finally {
      await cleanupIdentityFixture(adminClient, tenantIds);
      await ephemeral.drop();
      await adminClient.$disconnect();
    }
  });
}

async function countEvents(
  client: { $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> },
  tenantIds: readonly string[],
): Promise<number> {
  const rows = await client.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM auth_identity_link_events
    WHERE tenant_id = ANY(${[...tenantIds]}::uuid[])
  `;

  return rows[0]?.n ?? 0;
}
