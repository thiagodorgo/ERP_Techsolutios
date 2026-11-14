import "dotenv/config";

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F5 — grupo econômico e vínculo de organização a grupo contra o PostgreSQL REAL.
//
// R-GRP-db-2 (RLS) e R-GRP-db-3 (a)(d) — a sequência do crítico, em SQL direto — medem a M6 sob o papel de runtime: um
// papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`, o arnês único da casa, dentro do lock de catálogo), com o
// GUC da organização posto por `withTenantRls` (`src/database/rls.ts`). A URL admin (superusuário) só semeia organizações e
// grupos e limpa no fim, só o que esta suíte criou.
//
// O "espelho" prova que o dublê em memória lança, para a mesma sequência, os mesmos erros de domínio que o caminho Prisma
// lança para 23P01 (exclusão), 23514 (CHECK) e 23505 (nome), e termina no mesmo estado.
//
// F5b (Emenda 2 §2.1): R-GRP-db-1 (a corrida de dois `putMembers`, com barreira escopada pelo `application_name` da suíte:
// o admin segura `LOCK TABLE economic_group_members IN SHARE MODE` — a leitura passa, o INSERT espera — até os dois estarem
// presos no INSERT, depois de os dois terem passado pela conferência do serviço) e R-GRP-db-3 (b) pelo serviço sobre o
// Prisma; o (c) é a M-GRP-11 aplicada a esse mesmo caso (409 `membership_conflict`: quem segura é o banco). A trilha da troca
// entra na MESMA transação (Emenda 2 §2.4): a troca perdida não deixa linha em `audit_logs`.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

type Ctx = Awaited<ReturnType<typeof bootstrap>>;

if (!connectionString) {
  test("B-ASS-09 · grupos -db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL para o PostgreSQL descartável do bloco.",
  });
} else {
  let ctx: Ctx | undefined;

  before(async () => {
    ctx = await bootstrap(connectionString);
  });

  after(async () => {
    await ctx?.close();
  });

  // Cada caso parte sem vínculo nem trilha das organizações da suíte: um caso vermelho não contamina o seguinte.
  beforeEach(async () => {
    await ctx?.clearMemberships();
  });

  test("T-GRP-db-2 · RLS: com o GUC de A não se vê B; sem GUC, 0 linhas; gravar linha de outra organização com o GUC de A é recusado", async () => {
    // MUTAÇÃO QUE MATA: M-GRP-6 (= M-MIG-2: a M6 sem `FORCE ROW LEVEL SECURITY`), num cluster migrado com ela.
    const c = ctx!;
    const flags = (await c.admin.$queryRawUnsafe(
      `SELECT relrowsecurity AS enabled, relforcerowsecurity AS forced FROM pg_class WHERE relname = 'economic_group_members'`,
    )) as Array<{ enabled: boolean; forced: boolean }>;
    assert.deepEqual(flags, [{ enabled: true, forced: true }], "RLS ENABLE + FORCE: nem o dono da tabela escapa da política");

    await c.withTenantRls(c.role.client, c.tenantA, (tx: any) =>
      tx.$executeRawUnsafe(
        `INSERT INTO economic_group_members (tenant_id, group_id, valid_from) VALUES ($1::uuid, $2::uuid, '2031-01-01')`,
        c.tenantA,
        c.group1,
      ),
    );
    await c.withTenantRls(c.role.client, c.tenantB, (tx: any) =>
      tx.$executeRawUnsafe(
        `INSERT INTO economic_group_members (tenant_id, group_id, valid_from) VALUES ($1::uuid, $2::uuid, '2031-01-01')`,
        c.tenantB,
        c.group1,
      ),
    );
    const seenByA = (await c.withTenantRls(c.role.client, c.tenantA, (tx: any) =>
      tx.$queryRawUnsafe(
        `SELECT tenant_id::text AS "tenantId" FROM economic_group_members WHERE tenant_id = ANY($1::uuid[])`,
        [c.tenantA, c.tenantB],
      ),
    )) as Array<{ tenantId: string }>;
    assert.deepEqual(seenByA.map((row) => row.tenantId), [c.tenantA], "com o GUC de A, só a linha de A");

    const withoutGuc = (await c.role.client.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM economic_group_members WHERE tenant_id = ANY($1::uuid[])`,
      [c.tenantA, c.tenantB],
    )) as Array<{ n: number }>;
    assert.equal(withoutGuc[0]!.n, 0, "sem GUC, a política devolve zero linhas");

    await assert.rejects(
      c.withTenantRls(c.role.client, c.tenantA, (tx: any) =>
        tx.$executeRawUnsafe(
          `INSERT INTO economic_group_members (tenant_id, group_id, valid_from) VALUES ($1::uuid, $2::uuid, '2031-06-01')`,
          c.tenantC,
          c.group2,
        ),
      ),
      (error: unknown) => {
        assert.match(String((error as Error).message), /row-level security/i);
        return true;
      },
      "gravar linha de C com o GUC de A é recusado pela política",
    );
    const repo = await c.prismaRepository.listMembershipsOfTenants([c.tenantA, c.tenantB, c.tenantC]);
    assert.deepEqual(
      repo.filter((row) => row.validFrom === "2031-01-01").map((row) => row.tenantId).sort(),
      [c.tenantA, c.tenantB].sort(),
      "o repositório lê cada organização sob o próprio GUC (forEachTenantRls) e não vê a linha recusada",
    );
    assert.equal(repo.filter((row) => row.tenantId === c.tenantC).length, 0);
    await c.clearMemberships();
  });

  test("T-GRP-db-3 (a)(d) · a sequência do crítico no Postgres: o 2º vínculo que cruza o 1º cai com 23P01; a fronteira [) passa", async () => {
    // MUTAÇÃO QUE MATA: M-GRP-9 (a M6 sem a sentença `ALTER TABLE … ADD CONSTRAINT economic_group_members_no_overlap
    // EXCLUDE …`), num cluster migrado com ela → o 2º INSERT é aceito e a contagem dá 2.
    const c = ctx!;
    const insert = (group: string, from: string, to: string | null) =>
      c.withTenantRls(c.role.client, c.tenantC, (tx: any) =>
        tx.$executeRawUnsafe(
          `INSERT INTO economic_group_members (tenant_id, group_id, valid_from, valid_to) VALUES ($1::uuid, $2::uuid, $3::date, $4::date)`,
          c.tenantC,
          group,
          from,
          to,
        ),
      );
    const vigentesEm = async (day: string): Promise<number> => {
      const rows = (await c.withTenantRls(c.role.client, c.tenantC, (tx: any) =>
        tx.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM economic_group_members
            WHERE tenant_id = $1::uuid AND valid_from <= $2::date AND (valid_to IS NULL OR $2::date < valid_to)`,
          c.tenantC,
          day,
        ),
      )) as Array<{ n: number }>;
      return rows[0]!.n;
    };

    await insert(c.group1, "2026-10-01", "2026-12-01");
    let sqlState: string | null = null;
    await assert.rejects(insert(c.group2, "2026-11-15", null), (error: unknown) => {
      sqlState = c.sqlStateOf(error);
      return true;
    });
    assert.equal(sqlState, "23P01", "o banco recusa o 2º vínculo pela exclusão por intervalo");
    assert.equal(await vigentesEm("2026-11-20"), 1, "em 2026-11-20 a organização C tem exatamente 1 vínculo");

    // (d) fronteira `[)`: o vínculo que começa no dia em que o outro termina não cruza.
    await insert(c.group2, "2026-12-01", null);
    assert.equal(await vigentesEm("2026-11-30"), 1);
    assert.equal(await vigentesEm("2026-12-01"), 1);
    const groups = (await c.withTenantRls(c.role.client, c.tenantC, (tx: any) =>
      tx.$queryRawUnsafe(
        `SELECT group_id::text AS g, valid_from::text AS f, valid_to::text AS t FROM economic_group_members
          WHERE tenant_id = $1::uuid ORDER BY valid_from`,
        c.tenantC,
      ),
    )) as Array<{ g: string; f: string; t: string | null }>;
    assert.deepEqual(groups, [
      { g: c.group1, f: "2026-10-01", t: "2026-12-01" },
      { g: c.group2, f: "2026-12-01", t: null },
    ]);
    // Dois vínculos abertos da mesma organização também se excluem (limite superior nulo = infinito).
    let openState: string | null = null;
    await assert.rejects(insert(c.group3, "2027-03-01", null), (error: unknown) => {
      openState = c.sqlStateOf(error);
      return true;
    });
    assert.equal(openState, "23P01");
    await c.clearMemberships();
  });

  test("T-GRP-db-3 (b) · a sequência do crítico pelo serviço sobre o Prisma: 422 tenant_in_another_group; a fronteira [) passa", async () => {
    // MUTAÇÃO QUE MATA, o (c): M-GRP-11 (`overlaps` sem o fechado no futuro) → a 3ª chamada chega ao banco e cai no 23P01:
    // 409 `membership_conflict` no lugar de 422 — é o banco que segura.
    const c = ctx!;
    const service = c.serviceAt("2026-10-01T15:00:00.000Z");
    await service.putMembers(c.group1, { tenantIds: [c.tenantC], validFrom: "2026-10-01", actorId: null });
    await service.putMembers(c.group1, { tenantIds: [], validFrom: "2026-12-01", actorId: null });
    await assert.rejects(
      service.putMembers(c.group2, { tenantIds: [c.tenantC], validFrom: "2026-11-15", actorId: null }),
      (error: any) => {
        assert.deepEqual([error?.statusCode, error?.reason], [422, "tenant_in_another_group"]);
        assert.deepEqual(error?.tenantIds, [c.tenantC]);
        return true;
      },
    );
    await service.putMembers(c.group2, { tenantIds: [c.tenantC], validFrom: "2026-12-01", actorId: null });
    const rows = await c.prismaRepository.listMembershipsOfTenants([c.tenantC]);
    assert.deepEqual(
      rows.map((row) => [row.groupId === c.group1 ? "G1" : "G2", row.validFrom, row.validTo]),
      [
        ["G1", "2026-10-01", "2026-12-01"],
        ["G2", "2026-12-01", null],
      ],
      "histórico de C no Postgres: 2 linhas sem sobreposição",
    );
    assert.deepEqual(
      await c.auditActions(c.tenantC),
      ["economic_group.member_joined", "economic_group.member_left", "economic_group.member_joined"],
      "a trilha da organização tem uma linha por troca que valeu, e nenhuma da recusada",
    );
    await c.clearMemberships();
  });

  test("T-GRP-db-1 · dois putMembers de grupos diferentes para a mesma organização, ao mesmo tempo → exatamente 1 vence", async () => {
    // MUTAÇÃO QUE MATA: M-GRP-9 (a M6 sem a `EXCLUDE`, em base nova) → os dois vencem e C fica em dois grupos.
    const c = ctx!;
    const service = c.serviceAt("2026-10-01T15:00:00.000Z");
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let locked!: () => void;
    const lockHeld = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const holder = c.admin.$transaction(
      async (tx: any) => {
        await tx.$executeRawUnsafe("LOCK TABLE economic_group_members IN SHARE MODE");
        locked();
        await released;
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
    await lockHeld;
    const racers = [
      service.putMembers(c.group1, { tenantIds: [c.tenantC], validFrom: "2026-11-01", actorId: null }),
      service.putMembers(c.group2, { tenantIds: [c.tenantC], validFrom: "2026-11-15", actorId: null }),
    ].map((p) => p.then(() => ({ ok: true as const }), (error: any) => ({ ok: false as const, error })));
    try {
      await c.waitForOwnBlocked(2, "os dois putMembers presos no INSERT, depois da conferência do serviço");
    } finally {
      release();
      await holder;
    }
    const outcomes = await Promise.all(racers);
    const winners = outcomes.filter((o) => o.ok).length;
    const losers = outcomes.filter((o) => !o.ok).map((o) => (o as { error: any }).error);
    assert.equal(winners, 1, "exatamente um dos dois vence");
    assert.equal(losers.length, 1);
    assert.ok(
      ["409 membership_conflict", "422 tenant_in_another_group"].includes(`${losers[0]?.statusCode} ${losers[0]?.reason}`),
      `o perdedor responde 409 membership_conflict ou 422 tenant_in_another_group, nunca 500 (veio ${losers[0]?.statusCode} ${losers[0]?.reason ?? losers[0]})`,
    );
    const rows = await c.prismaRepository.listMembershipsOfTenants([c.tenantC]);
    assert.equal(rows.length, 1, "C tem um vínculo só");
    assert.deepEqual(await c.auditActions(c.tenantC), ["economic_group.member_joined"], "a troca perdida não deixou trilha");
    await c.clearMemberships();
  });

  test("Espelho do dublê (vínculos) · a mesma sequência no dublê e no Postgres dá os mesmos erros (23P01, 23514) e o mesmo estado", async () => {
    // MUTAÇÕES SUPLEMENTARES QUE MATAM (declaradas no diário): tirar do dublê a checagem da exclusão, ou a do CHECK.
    const c = ctx!;
    const memory = new c.InMemoryEconomicGroupsRepository();
    const prisma = c.prismaRepository;
    const run = async (repo: any): Promise<{ outcomes: string[]; final: string[] }> => {
      const outcomes: string[] = [];
      const step = async (label: string, work: () => Promise<unknown>): Promise<unknown> => {
        try {
          const value = await work();
          outcomes.push(`${label}:ok`);
          return value;
        } catch (error) {
          outcomes.push(`${label}:${(error as { code?: string }).code ?? "erro-desconhecido"}`);
          return undefined;
        }
      };
      const open = (tenantId: string, groupId: string, validFrom: string) => ({ tenantId, groupId, validFrom, createdBy: null });
      const first = (await step("1-abre A→G1 out", () =>
        repo.applyMembershipChanges({ closes: [], opens: [open(c.tenantA, c.group1, "2026-10-01")] }),
      )) as { opened: Array<{ id: string }> };
      await step("2-abre A→G2 15/11", () => repo.applyMembershipChanges({ closes: [], opens: [open(c.tenantA, c.group2, "2026-11-15")] }));
      const moved = (await step("3-troca A G1→G2 em 01/12", () =>
        repo.applyMembershipChanges({
          closes: [{ tenantId: c.tenantA, membershipId: first.opened[0]!.id, validTo: "2026-12-01", closedBy: null }],
          opens: [open(c.tenantA, c.group2, "2026-12-01")],
        }),
      )) as { opened: Array<{ id: string }> };
      await step("4-abre A→G3 20/11", () => repo.applyMembershipChanges({ closes: [], opens: [open(c.tenantA, c.group3, "2026-11-20")] }));
      await step("5-fecha A@G2 no dia do início", () =>
        repo.applyMembershipChanges({
          closes: [{ tenantId: c.tenantA, membershipId: moved.opened[0]!.id, validTo: "2026-12-01", closedBy: null }],
          opens: [],
        }),
      );
      await step("6-B→G1 junto com A→G3 que cruza (tudo ou nada)", () =>
        repo.applyMembershipChanges({ closes: [], opens: [open(c.tenantB, c.group1, "2026-10-01"), open(c.tenantA, c.group3, "2026-10-15")] }),
      );
      await step("7-B→G1 out (outra organização, mesmo grupo e datas)", () =>
        repo.applyMembershipChanges({ closes: [], opens: [open(c.tenantB, c.group1, "2026-10-01")] }),
      );
      await step("8-fecha vínculo que não existe", () =>
        repo.applyMembershipChanges({
          closes: [{ tenantId: c.tenantB, membershipId: "00000000-0000-4000-8000-000000000009", validTo: "2027-01-01", closedBy: null }],
          opens: [],
        }),
      );
      const alias = (id: string): string =>
        ({ [c.tenantA]: "A", [c.tenantB]: "B", [c.tenantC]: "C", [c.group1]: "G1", [c.group2]: "G2", [c.group3]: "G3" })[id] ?? id;
      const rows = (await repo.listMembershipsOfTenants([c.tenantA, c.tenantB, c.tenantC])) as Array<{
        tenantId: string;
        groupId: string;
        validFrom: string;
        validTo: string | null;
      }>;
      const final = rows.map((row) => `${alias(row.tenantId)} ${alias(row.groupId)} [${row.validFrom}, ${row.validTo ?? "∞"})`).sort();
      return { outcomes, final };
    };

    const fromPrisma = await run(prisma);
    const fromMemory = await run(memory);
    assert.deepEqual(fromMemory.outcomes, fromPrisma.outcomes, "dublê e Postgres respondem igual a cada passo");
    assert.deepEqual(fromMemory.final, fromPrisma.final, "dublê e Postgres terminam no mesmo estado");
    assert.deepEqual(fromPrisma.outcomes, [
      "1-abre A→G1 out:ok",
      "2-abre A→G2 15/11:membership_conflict",
      "3-troca A G1→G2 em 01/12:ok",
      "4-abre A→G3 20/11:membership_conflict",
      "5-fecha A@G2 no dia do início:membership_range_invalid",
      "6-B→G1 junto com A→G3 que cruza (tudo ou nada):membership_conflict",
      "7-B→G1 out (outra organização, mesmo grupo e datas):ok",
      "8-fecha vínculo que não existe:membership_not_found",
    ]);
    assert.deepEqual(fromPrisma.final, ["A G1 [2026-10-01, 2026-12-01)", "A G2 [2026-12-01, ∞)", "B G1 [2026-10-01, ∞)"]);
    await c.clearMemberships();
  });

  test("Espelho do dublê (grupos) · nome único sem diferenciar maiúsculas entre os não excluídos e CHECK de 1 a 120", async () => {
    // MUTAÇÃO QUE MATA: M-GRP-8 (comparar o nome sem `lower` no dublê → o duplicado passa no dublê e não no Postgres).
    const c = ctx!;
    const memory = new c.InMemoryEconomicGroupsRepository();
    const prisma = c.prismaRepository;
    const base = `Grupo Espelho ${c.suffix}`;
    const run = async (repo: any): Promise<string[]> => {
      const outcomes: string[] = [];
      const step = async (label: string, work: () => Promise<unknown>): Promise<any> => {
        try {
          const value = await work();
          outcomes.push(`${label}:ok`);
          return value;
        } catch (error) {
          outcomes.push(`${label}:${(error as { code?: string }).code ?? "erro-desconhecido"}`);
          return undefined;
        }
      };
      const g1 = await step("cria", () => repo.createGroup({ name: base, notes: null, createdBy: null }));
      await step("mesmo nome, outra caixa e espaços nas pontas", () =>
        repo.createGroup({ name: `  ${base.toLowerCase()}  `, notes: null, createdBy: null }),
      );
      await step("só espaços", () => repo.createGroup({ name: "    ", notes: null, createdBy: null }));
      await step("121 caracteres", () => repo.createGroup({ name: `${c.suffix}${"x".repeat(121 - c.suffix.length)}`, notes: null, createdBy: null }));
      const g120 = await step("120 caracteres", () =>
        repo.createGroup({ name: `${c.suffix}${"y".repeat(120 - c.suffix.length)}`, notes: null, createdBy: null }),
      );
      await step("renomeia para o nome ativo", () => repo.updateGroup(g120.id, { name: base.toUpperCase(), updatedBy: null }));
      await step("exclui o primeiro", () => repo.softDeleteGroup(g1.id, null, new Date("2026-11-14T00:00:00.000Z")));
      const g3 = await step("o nome excluído volta a valer", () => repo.createGroup({ name: base, notes: null, createdBy: null }));
      const listed = (await repo.listGroups()) as Array<{ id: string }>;
      outcomes.push(`lista:${[g120.id, g3.id].every((id) => listed.some((g) => g.id === id))}:${listed.some((g) => g.id === g1.id)}`);
      c.createdGroups.push(...[g1, g120, g3].filter(Boolean).map((g: { id: string }) => g.id));
      return outcomes;
    };
    const fromPrisma = await run(prisma);
    await c.deleteCreatedGroups();
    const fromMemory = await run(memory);
    assert.deepEqual(fromMemory, fromPrisma, "dublê e Postgres respondem igual a cada passo");
    assert.deepEqual(fromPrisma, [
      "cria:ok",
      "mesmo nome, outra caixa e espaços nas pontas:group_name_exists",
      "só espaços:name_invalid",
      "121 caracteres:name_invalid",
      "120 caracteres:ok",
      "renomeia para o nome ativo:group_name_exists",
      "exclui o primeiro:ok",
      "o nome excluído volta a valer:ok",
      "lista:true:false",
    ]);
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connection) });
  const barrier = await import("./helpers/pg-barrier.js");
  const applicationName = barrier.buildApplicationName("ass09-grp");
  const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
  const role = await createEphemeralRole(admin, barrier.withApplicationName(connection, applicationName));
  const attributes = (await admin.$queryRawUnsafe(
    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
    role.roleName,
  )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.deepEqual(attributes, [{ rolsuper: false, rolbypassrls: false }], "o código sob teste roda SEM superusuário e SEM bypass de RLS");
  await barrier.assertApplicationNamePropagated(role.client, applicationName);

  const [{ withTenantRls }, prismaModule, memoryModule, serviceModule] = await Promise.all([
    import("../src/database/rls.js"),
    import("../src/modules/subscription-billing/economic-groups/economic-groups.prisma.js"),
    import("../src/modules/subscription-billing/economic-groups/economic-groups.repository.js"),
    import("../src/modules/subscription-billing/economic-groups/economic-groups.service.js"),
  ]);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = async (letter: string): Promise<string> =>
    (await admin.tenant.create({ data: { name: `B-ASS-09 grupos ${letter} ${suffix}`, slug: `ass09-grp-${letter.toLowerCase()}-${suffix}` } })).id;
  const tenantA = await tenant("A");
  const tenantB = await tenant("B");
  const tenantC = await tenant("C");
  const group = async (n: number): Promise<string> =>
    (await admin.economicGroup.create({ data: { name: `B-ASS-09 Grupo ${n} ${suffix}` } })).id;
  const group1 = await group(1);
  const group2 = await group(2);
  const group3 = await group(3);
  const tenants = [tenantA, tenantB, tenantC];
  const createdGroups: string[] = [];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // As organizações desta suíte, lidas do registro global `tenants` pelo papel de runtime.
  const directory = {
    async getTenant(id: string) {
      if (!UUID.test(id)) return null;
      const row = await role.client.tenant.findUnique({ where: { id }, select: { id: true, slug: true, name: true } });
      return row ? { id: row.id, slug: row.slug, name: row.name } : null;
    },
    async listTenantIds() {
      return tenants;
    },
  };
  const prismaRepository = new prismaModule.PrismaEconomicGroupsRepository(role.client);
  const audit = (change: { kind: string; tenantId: string; groupId: string; validFrom: string; actorId: string | null }) => ({
    tenantId: change.tenantId,
    actorId: change.actorId,
    action: `economic_group.member_${change.kind}`,
    entityId: change.groupId,
    metadata: { valid_from: change.validFrom },
  });
  const serviceAt = (instant: string) =>
    new serviceModule.EconomicGroupsService(prismaRepository, directory, () => new Date(instant), audit);

  return {
    admin,
    role,
    suffix,
    tenantA,
    tenantB,
    tenantC,
    group1,
    group2,
    group3,
    createdGroups,
    withTenantRls,
    sqlStateOf: prismaModule.sqlStateOf,
    prismaRepository,
    serviceAt,
    async waitForOwnBlocked(minWaiters: number, label: string): Promise<void> {
      const deadline = Date.now() + 15_000;
      for (;;) {
        const rows = (await admin.$queryRawUnsafe(
          `SELECT count(*)::int AS waiting FROM pg_stat_activity
            WHERE pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND state = 'active' AND application_name = $1`,
          applicationName,
        )) as Array<{ waiting: number }>;
        if ((rows[0]?.waiting ?? 0) >= minWaiters) return;
        if (Date.now() > deadline) assert.fail(`timeout esperando ${minWaiters} statements presos da suíte: ${label}`);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    },
    async auditActions(tenantId: string): Promise<string[]> {
      const rows = (await admin.$queryRawUnsafe(
        `SELECT action FROM audit_logs WHERE tenant_id = $1::uuid AND action LIKE 'economic_group.%' ORDER BY created_at, id`,
        tenantId,
      )) as Array<{ action: string }>;
      return rows.map((row) => row.action);
    },
    InMemoryEconomicGroupsRepository: memoryModule.InMemoryEconomicGroupsRepository,
    async clearMemberships(): Promise<void> {
      await admin.$executeRawUnsafe(`DELETE FROM economic_group_members WHERE tenant_id = ANY($1::uuid[])`, tenants);
      await admin.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = ANY($1::uuid[])`, tenants);
    },
    async deleteCreatedGroups(): Promise<void> {
      await admin.$executeRawUnsafe(`DELETE FROM economic_groups WHERE id = ANY($1::uuid[])`, createdGroups.splice(0));
    },
    async close(): Promise<void> {
      try {
        await admin.$executeRawUnsafe(`DELETE FROM economic_group_members WHERE tenant_id = ANY($1::uuid[])`, tenants);
        await admin.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = ANY($1::uuid[])`, tenants);
        await admin.$executeRawUnsafe(
          `DELETE FROM economic_groups WHERE id = ANY($1::uuid[])`,
          [group1, group2, group3, ...createdGroups],
        );
        await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, tenants);
        await role.drop();
      } finally {
        await admin.$disconnect();
      }
    },
  };
}
