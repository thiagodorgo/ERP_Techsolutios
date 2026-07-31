import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω-VID PR-02 — bateria de prova viva do schema (Postgres real). DB-gated (skip sem DATABASE_URL). Cobre os 9
// cenários exigidos pela junta de arquitetura (docs/juntas/J-OMEGA-VID.md):
//   1) CHECK identity_chk (unidentified coerente com identificadores)
//   2) CHECK merge_chk (MERGED exige canonical_identity_id)
//   3) CHECK confidence_chk (enum fechado)
//   4) self-FK canonical_identity_id cross-tenant rejeitada
//   5) trigger append-only em third_party_vehicle_identity_merge_events (UPDATE/DELETE bloqueados)
//   6) RLS isola as 2 tabelas novas por tenant
//   7) índice parcial não-único (2 PROVISIONAL da mesma placa coexistem)
//   8) FK composta ImpoundProcess.identity_id RESTRICT (delete de identidade referenciada falha)
//   9) prisma validate/migrate deploy/migrate status — cobertos fora deste arquivo (bateria final, CLI real)
if (!connectionString) {
  test("Vehicle identity schema (Ω-VID PR-02) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("(1) CHECK third_party_vehicle_identities_identity_chk", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "identity-chk");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");

      // unidentified=true SEM reason -> falha
      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenant.id, unidentified: true } }),
          ),
        /identity_chk/,
        "unidentified=true sem unidentified_reason deve violar identity_chk",
      );

      // unidentified=false SEM nenhum identificador -> falha
      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenant.id, unidentified: false } }),
          ),
        /identity_chk/,
        "unidentified=false sem plate_key/chassis/renavam_key deve violar identity_chk",
      );

      // Caminhos válidos passam.
      const withReason = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({
          data: { tenant_id: tenant.id, unidentified: true, unidentified_reason: "placa ilegível na foto" },
        }),
      );
      assert.ok(withReason.id);

      const withIdentifier = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({
          data: { tenant_id: tenant.id, unidentified: false, plate_key: "ABC1234" },
        }),
      );
      assert.ok(withIdentifier.id);
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(2) CHECK third_party_vehicle_identities_merge_chk", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "merge-chk");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.thirdPartyVehicleIdentity.create({
              data: { tenant_id: tenant.id, unidentified: false, plate_key: "MRG0001", confidence: "MERGED" },
            }),
          ),
        /merge_chk/,
        "confidence=MERGED sem canonical_identity_id deve violar merge_chk",
      );
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(3) CHECK third_party_vehicle_identities_confidence_chk", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "confidence-chk");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.thirdPartyVehicleIdentity.create({
              data: { tenant_id: tenant.id, unidentified: false, plate_key: "BOG0001", confidence: "BOGUS" as never },
            }),
          ),
        /confidence_chk|23514/,
        "confidence fora do enum deve ser rejeitado com 23514",
      );
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(4) self-FK canonical_identity_id cross-tenant é rejeitada por FK (não aceita silenciosamente)", async () => {
    const { client } = await bootstrap(connectionString);
    const tenantA = await seedTenant(client, "selffk-a");
    const tenantB = await seedTenant(client, "selffk-b");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");

      const identityB = await withTenantRls(client, tenantB.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenantB.id, unidentified: false, plate_key: "XTEN001" } }),
      );

      // Insere diretamente via SQL cru (bypassa o CRUD, que nunca expõe canonical_identity_id) para provar que a
      // trava é do BANCO (FK composta tenant-first), não só uma omissão da camada de aplicação.
      await assert.rejects(
        () =>
          withTenantRls(client, tenantA.id, (tx) =>
            tx.$executeRawUnsafe(
              `INSERT INTO third_party_vehicle_identities (tenant_id, unidentified, confidence, canonical_identity_id)
               VALUES ('${tenantA.id}'::uuid, false, 'MERGED', '${identityB.id}'::uuid)`,
            ),
          ),
        /foreign key|violates/i,
        "canonical_identity_id apontando para identidade de OUTRO tenant deve falhar por FK composta tenant-first",
      );
    } finally {
      await teardown(client, tenantA.id);
      await teardown(client, tenantB.id);
    }
  });

  test("(5) trigger append-only em third_party_vehicle_identity_merge_events bloqueia UPDATE e DELETE", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "merge-events-trigger");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const identity = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenant.id, unidentified: false, plate_key: "TRG0001" } }),
      );
      const identity2 = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenant.id, unidentified: false, plate_key: "TRG0002" } }),
      );
      const event = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentityMergeEvent.create({
          data: {
            tenant_id: tenant.id,
            target_identity_id: identity.id,
            merged_identity_id: identity2.id,
            reason: "teste de trigger",
            snapshot_before: { plate_key: identity2.plate_key },
          },
        }),
      );

      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE third_party_vehicle_identity_merge_events SET reason = 'forjado' WHERE id = '${event.id}'::uuid`,
            ),
          ),
        /append-only|restrict_violation/i,
        "UPDATE em merge_events deve ser bloqueado pelo trigger",
      );

      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE id = '${event.id}'::uuid`),
          ),
        /append-only|restrict_violation/i,
        "DELETE em merge_events deve ser bloqueado pelo trigger",
      );
    } finally {
      await teardown(client, tenant.id);
    }
  });

  // RLS só é EXECUTADA de fato para roles NÃO-superusuário (superuser sempre ignora RLS, mesmo com FORCE) — a
  // conexão padrão de DATABASE_URL neste repo (postgres/postgres) É superusuário. Mesmo padrão de
  // tests/rls-tenant-isolation.test.ts: cria uma role efêmera NOSUPERUSER, conecta com ela e prova o isolamento
  // de verdade (não apenas "o app filtra por tenant_id").
  test("(6) RLS isola third_party_vehicle_identities e third_party_vehicle_identity_merge_events por tenant", async () => {
    const { client: adminClient } = await bootstrap(connectionString);
    const roleName = `vid_rls_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const rolePassword = `vid-rls-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let client: BootstrapClient | undefined;
    let tenantA: { readonly id: string } | undefined;
    let tenantB: { readonly id: string } | undefined;
    try {
      await adminClient.$executeRawUnsafe(
        `CREATE ROLE "${roleName}" LOGIN PASSWORD '${escapeSqlLiteral(rolePassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
      await adminClient.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
      await adminClient.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`);
      await adminClient.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`);

      const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
      client = new PrismaClient({
        adapter: new PrismaPg({ connectionString: buildConnectionStringForRole(connectionString, roleName, rolePassword) }),
      }) as unknown as BootstrapClient;

      tenantA = await client.tenant.create({ data: { name: `VID rls-a ${uniq()}`, slug: `vid-rls-a-${uniq()}` } });
      tenantB = await client.tenant.create({ data: { name: `VID rls-b ${uniq()}`, slug: `vid-rls-b-${uniq()}` } });

      const { withTenantRls } = await import("../src/database/rls.js");
      const identityA = await withTenantRls(client, tenantA.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenantA!.id, unidentified: false, plate_key: "RLS0001" } }),
      );
      const identityA2 = await withTenantRls(client, tenantA.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenantA!.id, unidentified: false, plate_key: "RLS0002" } }),
      );
      await withTenantRls(client, tenantA.id, (tx) =>
        tx.thirdPartyVehicleIdentityMergeEvent.create({
          data: {
            tenant_id: tenantA!.id,
            target_identity_id: identityA.id,
            merged_identity_id: identityA2.id,
            reason: "seed",
            snapshot_before: {},
          },
        }),
      );

      // B (role NOSUPERUSER) não enxerga as linhas de A, mesmo filtrando explicitamente por tenant_id de A.
      const identitiesFromB = await withTenantRls(client, tenantB.id, (tx) =>
        tx.thirdPartyVehicleIdentity.findMany({ where: { tenant_id: tenantA!.id } }),
      );
      assert.equal(identitiesFromB.length, 0, "sessão de B não vê identidades de A (RLS real, role NOSUPERUSER)");

      const eventsFromB = await withTenantRls(client, tenantB.id, (tx) =>
        tx.thirdPartyVehicleIdentityMergeEvent.findMany({ where: { tenant_id: tenantA!.id } }),
      );
      assert.equal(eventsFromB.length, 0, "sessão de B não vê merge_events de A (RLS real, role NOSUPERUSER)");

      // B não consegue EDITAR (UPDATE afeta 0 linhas sob a policy de B).
      const updateResult = await withTenantRls(client, tenantB.id, (tx) =>
        tx.thirdPartyVehicleIdentity.updateMany({ where: { id: identityA.id }, data: { color: "forjado" } }),
      );
      assert.equal(updateResult.count, 0, "sessão de B não consegue editar identidade de A (RLS)");

      // A continua vendo as próprias linhas.
      const identitiesFromA = await withTenantRls(client, tenantA.id, (tx) =>
        tx.thirdPartyVehicleIdentity.findMany({ where: { tenant_id: tenantA!.id } }),
      );
      assert.equal(identitiesFromA.length, 2, "sessão de A vê as próprias identidades normalmente");
    } finally {
      // Teardown pelo adminClient (superuser) — a role NOSUPERUSER não pode setar session_replication_role
      // (exige superuser), então a limpeza FK-safe roda sempre pela conexão administrativa.
      if (tenantA) await teardown(adminClient, tenantA.id, { skipDisconnect: true });
      if (tenantB) await teardown(adminClient, tenantB.id, { skipDisconnect: true });
      if (client) await client.$disconnect();
      await adminClient.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`).catch(() => undefined);
      await adminClient.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`).catch(() => undefined);
      await adminClient.$disconnect();
    }
  });

  test("(7) índice parcial NÃO-único: 2 identidades PROVISIONAL com a mesma placa coexistem sem erro", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "partial-idx");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const first = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({
          data: { tenant_id: tenant.id, unidentified: false, plate_key: "DUP0001", confidence: "PROVISIONAL" },
        }),
      );
      const second = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({
          data: { tenant_id: tenant.id, unidentified: false, plate_key: "DUP0001", confidence: "PROVISIONAL" },
        }),
      );
      assert.notEqual(first.id, second.id);
      assert.equal(first.plate_key, second.plate_key);

      // Confirma que o índice é de fato PARCIAL e NÃO-único (definição real no catálogo do Postgres).
      const indexRows = await client.$queryRaw<Array<{ indexdef: string }>>`
        SELECT indexdef FROM pg_indexes
        WHERE tablename = 'third_party_vehicle_identities' AND indexname = 'third_party_vehicle_identities_plate_key_active_idx'
      `;
      assert.equal(indexRows.length, 1, "o índice parcial deve existir");
      assert.doesNotMatch(indexRows[0].indexdef, /UNIQUE/i, "o índice deve ser NÃO-único por desenho");
      assert.match(indexRows[0].indexdef, /WHERE/i, "o índice deve ser PARCIAL (cláusula WHERE)");
      assert.match(indexRows[0].indexdef, /confidence/i, "o índice deve filtrar por confidence <> 'MERGED'");
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(8) FK composta ImpoundProcess.identity_id RESTRICT: apagar identidade referenciada por processo ativo falha", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "fk-restrict");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const identity = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenant.id, unidentified: false, plate_key: "FKR0001" } }),
      );
      const profile = await withTenantRls(client, tenant.id, async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil FK', 'PUBLIC_AGREEMENT') RETURNING id
        `;
        return rows[0];
      });
      const process = await withTenantRls(client, tenant.id, async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_plate, identity_id)
          VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade Teste', 'FKR0001', ${identity.id}::uuid)
          RETURNING id
        `;
        return rows[0];
      });
      assert.ok(process.id);

      await assert.rejects(
        () =>
          withTenantRls(client, tenant.id, (tx) =>
            tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE id = '${identity.id}'::uuid`),
          ),
        /foreign key|violates/i,
        "apagar identidade referenciada por um ImpoundProcess ativo deve falhar por FK RESTRICT",
      );
    } finally {
      await teardown(client, tenant.id);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client };
}

async function seedTenant(client: BootstrapClient, label: string) {
  const suffix = uniq();
  return client.tenant.create({ data: { name: `VID ${label} ${suffix}`, slug: `vid-${label}-${suffix}` } });
}

// Teardown FK-safe (superuser + replica p/ os triggers append-only): impound_processes -> merge_events ->
// identities -> jurisdiction_profiles -> audit_logs, ANTES do tenant. SEMPRE desconecta (finally), a menos que
// skipDisconnect (chamadas em sequência no MESMO client, ex.: teardown de A e B pelo mesmo adminClient).
async function teardown(client: BootstrapClient, tenantId: string, options?: { readonly skipDisconnect?: boolean }): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`UPDATE third_party_vehicle_identities SET canonical_identity_id = NULL WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    if (!options?.skipDisconnect) await client.$disconnect();
  }
}

function buildConnectionStringForRole(source: string, roleName: string, rolePassword: string): string {
  const url = new URL(source);
  url.username = roleName;
  url.password = rolePassword;
  return url.toString();
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
