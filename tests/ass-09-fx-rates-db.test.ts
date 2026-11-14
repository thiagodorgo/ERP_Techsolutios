import "dotenv/config";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F5 — câmbio do mês da plataforma contra o PostgreSQL REAL (R-FX-db-1, R-FX-db-2 e o espelho do dublê).
//
// O código sob teste roda num papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`, o arnês único da casa,
// dentro do lock de catálogo); a URL admin só semeia a barreira e limpa. `platform_fx_rates` é global: cada execução usa
// uma moeda de origem PRÓPRIA (3 letras sorteadas, nunca `BRL`), e o teardown apaga só as linhas dela.
//
// A barreira do T-FX-db-1 é DE LINHA (Emenda 2.1 §1.3) e escopada pelo `application_name` da suíte: o admin grava a versão
// 2 do mesmo mês e moeda SEM COMMIT (segura `ROW EXCLUSIVE` na tabela e a linha no índice único) e só a desfaz depois que os
// dois `putRate` estão presos. Com a trava certa (`SHARE ROW EXCLUSIVE`), os dois param no próprio `LOCK TABLE`; desfeita a
// barreira, um ganha a trava e o outro espera: versões 2 e 3. Ela mata por construção as três mutações do mecanismo:
//   - M-FX-8 (sem a trava) e M-FX-16 (`ROW EXCLUSIVE`, que não se exclui): os dois leem `max = 1`, param no índice único à
//     espera do admin e, desfeita a barreira, os dois gravam a versão 2 → `Unique constraint failed`;
//   - M-FX-17 (`SHARE`): os dois param no `LOCK`, são concedidos juntos e cada INSERT espera o `SHARE` do outro → deadlock.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

type Ctx = Awaited<ReturnType<typeof bootstrap>>;

if (!connectionString) {
  test("B-ASS-09 · câmbio -db exige DATABASE_URL e um banco migrado", {
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

  test("T-FX-db-2 · 3 versões no Postgres → a vigente é a maior; o histórico vem da maior para a menor", async () => {
    // MUTAÇÃO QUE MATA: M-FX-9 (`orderBy: { version: "desc" }` → `"asc"` no repositório Prisma).
    const c = ctx!;
    for (const rate of ["5.4", "5.500000", "5.6"]) {
      await c.service.putRate("2026-09", { currencyFrom: c.currency, rate, actorId: null });
    }
    const current = await c.service.currentRate("2026-09", c.currency);
    assert.equal(current?.rate, "5.600000");
    assert.equal(current?.version, 3);
    const versions = await c.repository.listVersions({ month: "2026-09", currencyFrom: c.currency, currencyTo: "BRL" });
    assert.deepEqual(
      versions.map((v) => [v.version, v.rate]),
      [
        [3, "5.600000"],
        [2, "5.500000"],
        [1, "5.400000"],
      ],
    );
    const listed = (await c.service.listRates("2026-09", "2026-09")).filter((v) => v.currencyFrom === c.currency);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]!.rate, "5.600000");
    assert.equal(listed[0]!.version, 3);
    assert.deepEqual(
      listed[0]!.history.map((h) => h.version),
      [3, 2, 1],
    );
    const stored = (await c.admin.$queryRawUnsafe(
      `SELECT version, rate::text AS rate FROM platform_fx_rates WHERE month = '2026-09' AND currency_from = $1 ORDER BY version`,
      c.currency,
    )) as Array<{ version: number; rate: string }>;
    assert.deepEqual(stored, [
      { version: 1, rate: "5.400000" },
      { version: 2, rate: "5.500000" },
      { version: 3, rate: "5.600000" },
    ], "só acréscimo: as 3 versões continuam gravadas, nenhuma alterada");
  });

  test("T-FX-db-1 · dois PUT do mesmo mês ao mesmo tempo → versões n+1 e n+2, nenhuma perdida, nenhum erro", async () => {
    // MUTAÇÕES QUE MATAM: M-FX-8 (a linha do `LOCK TABLE … SHARE ROW EXCLUSIVE MODE` apagada → UNIQUE), M-FX-16
    // (`IN ROW EXCLUSIVE MODE` → UNIQUE) e M-FX-17 (`IN SHARE MODE` → deadlock). A barreira é a versão 2 do admin, sem COMMIT.
    const c = ctx!;
    await c.service.putRate("2026-10", { currencyFrom: c.currency, rate: "5.000000", actorId: null });
    const before = await c.service.currentRate("2026-10", c.currency);
    assert.equal(before?.version, 1);

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
        await tx.$executeRawUnsafe(
          "INSERT INTO platform_fx_rates (month, currency_from, currency_to, rate, version) VALUES ('2026-10', $1, 'BRL', 9, 2)",
          c.currency,
        );
        locked();
        await released;
        throw BARRIER_ROLLBACK;
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
    await lockHeld;

    const racers = [
      c.service.putRate("2026-10", { currencyFrom: c.currency, rate: "5.100000", actorId: null }),
      c.service.putRate("2026-10", { currencyFrom: c.currency, rate: "5.200000", actorId: null }),
    ].map((p) => p.then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error })));

    try {
      await c.waitForOwnBlocked(2, "os dois putRate presos atrás da versão 2 do admin");
    } finally {
      release();
      await assert.rejects(
        holder,
        (error: unknown) => error === BARRIER_ROLLBACK,
        "a barreira só termina pela sentinela: a versão 2 do admin é desfeita, nunca gravada",
      );
    }
    const outcomes = await Promise.all(racers);
    const failures = outcomes.filter((o) => !o.ok).map((o) => String((o as { error: unknown }).error));
    assert.deepEqual(failures, [], "nenhum dos dois PUT falha");

    const versions = await c.repository.listVersions({ month: "2026-10", currencyFrom: c.currency, currencyTo: "BRL" });
    assert.deepEqual(
      versions.map((v) => v.version),
      [3, 2, 1],
      "as versões n+1 e n+2 existem, consecutivas, e a n continua",
    );
    assert.deepEqual(
      versions.slice(0, 2).map((v) => v.rate).sort(),
      ["5.100000", "5.200000"],
      "as duas taxas da corrida foram gravadas, cada uma na sua versão",
    );
  });

  test("Espelho do dublê · a mesma sequência no dublê em memória e no Postgres dá as mesmas versões e a mesma vigente", async () => {
    // MUTAÇÃO QUE MATA: M-FX-6 (no dublê, `.sort((a, b) => b.version - a.version)` → `a.version - b.version`).
    const c = ctx!;
    const memory = new c.InMemoryFxRatesRepository();
    const memoryService = new c.FxRatesService(memory, () => FIXED_NOW);
    const sequence: Array<[string, string]> = [
      ["2026-08", "5.400000"],
      ["2026-08", "5.500000"],
      ["2026-07", "4.900000"],
      ["2026-08", "5.450000"],
    ];
    for (const [month, rate] of sequence) {
      const fromPg = await c.service.putRate(month, { currencyFrom: c.currency, rate, actorId: null });
      const fromMemory = await memoryService.putRate(month, { currencyFrom: c.currency, rate, actorId: null });
      assert.deepEqual(
        [fromMemory.current.version, fromMemory.current.rate, fromMemory.history.map((h) => h.version)],
        [fromPg.current.version, fromPg.current.rate, fromPg.history.map((h) => h.version)],
        `dublê e Postgres divergem depois de ${month} ${rate}`,
      );
    }
    for (const month of ["2026-07", "2026-08"]) {
      const pg = await c.service.currentRate(month, c.currency);
      const mem = await memoryService.currentRate(month, c.currency);
      assert.deepEqual([mem?.version, mem?.rate], [pg?.version, pg?.rate], `vigente de ${month}`);
    }
    assert.equal((await memoryService.currentRate("2026-08", c.currency))?.rate, "5.450000");
    const own = (v: { currencyFrom: string }): boolean => v.currencyFrom === c.currency;
    const pgRange = (await c.service.listRates("2026-07", "2026-08")).filter(own).map((v) => [v.month, v.version, v.rate, v.history.length]);
    const memRange = (await memoryService.listRates("2026-07", "2026-08")).filter(own).map((v) => [v.month, v.version, v.rate, v.history.length]);
    assert.deepEqual(memRange, pgRange);
    assert.deepEqual(pgRange, [
      ["2026-07", 1, "4.900000", 1],
      ["2026-08", 3, "5.450000", 3],
    ]);
  });

  test("T-FX-6 (serviço, no Postgres) · entrada inválida é recusada com o código e nada é gravado", async () => {
    // MUTAÇÃO QUE MATA: M-FX-7 (a regex da taxa sem o limite de 6 casas → "5.1234567" aceito e gravado).
    const c = ctx!;
    const month = "2026-06";
    const rejects = async (
      label: string,
      run: () => Promise<unknown>,
      expected: { statusCode: number; reason: string },
    ): Promise<void> => {
      await assert.rejects(run, (error: any) => {
        assert.equal(error?.statusCode, expected.statusCode, `${label}: status`);
        assert.equal(error?.reason, expected.reason, `${label}: motivo`);
        return true;
      }, label);
    };
    for (const rate of ["0", "0.000000", "-1", "5.1234567", "abc", "1e3", "1000", "", " 5.4", "5,4"]) {
      await rejects(`rate ${JSON.stringify(rate)}`, () => c.service.putRate(month, { currencyFrom: c.currency, rate, actorId: null }), {
        statusCode: 422,
        reason: "rate_invalid",
      });
    }
    await rejects("mês 2026-13", () => c.service.putRate("2026-13", { currencyFrom: c.currency, rate: "5.4", actorId: null }), {
      statusCode: 400,
      reason: "invalid_month",
    });
    await rejects(
      "destino USD",
      () => c.service.putRate(month, { currencyFrom: c.currency, currencyTo: "USD", rate: "5.4", actorId: null }),
      { statusCode: 422, reason: "currency_pair_unsupported" },
    );
    await rejects("origem BRL", () => c.service.putRate(month, { currencyFrom: "BRL", rate: "5.4", actorId: null }), {
      statusCode: 422,
      reason: "currency_pair_unsupported",
    });
    await rejects("origem em minúsculas", () => c.service.putRate(month, { currencyFrom: "usd", rate: "5.4", actorId: null }), {
      statusCode: 422,
      reason: "currency_pair_unsupported",
    });
    // Relógio 2026-12-01T01:30Z = 30/11 22:30 em São Paulo: dezembro ainda é futuro (data de negócio, nunca UTC).
    const atNightSp = new c.FxRatesService(c.repository, () => new Date("2026-12-01T01:30:00.000Z"));
    await rejects("mês futuro em SP", () => atNightSp.putRate("2026-12", { currencyFrom: c.currency, rate: "5.4", actorId: null }), {
      statusCode: 422,
      reason: "fx_month_in_future",
    });
    await rejects("período de 25 meses", () => c.service.listRates("2024-01", "2026-01"), { statusCode: 422, reason: "range_too_large" });
    await rejects("período invertido", () => c.service.listRates("2026-02", "2026-01"), { statusCode: 400, reason: "invalid_month" });
    assert.deepEqual(
      (await c.service.listRates("2024-02", "2026-01")).filter((v) => v.currencyFrom === c.currency),
      [],
      "24 meses é aceito",
    );

    const written = (await c.admin.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM platform_fx_rates WHERE currency_from IN ($1, 'BRL', 'usd') AND month IN ('2026-06', '2026-12', '2026-13')`,
      c.currency,
    )) as Array<{ n: number }>;
    assert.equal(written[0]!.n, 0, "nenhuma entrada recusada chegou ao banco");

    const accepted = await atNightSp.putRate("2026-11", { currencyFrom: c.currency, rate: "5.4", actorId: null });
    assert.equal(accepted.current.rate, "5.400000", "o mês corrente em SP (novembro, às 22:30 do dia 30) é aceito e normalizado");
  });
}

const FIXED_NOW = new Date("2026-11-14T01:30:00.000Z");

/** A única rejeição que a barreira do T-FX-db-1 aceita: desfaz a versão 2 do admin. */
const BARRIER_ROLLBACK = new Error("B-ASS-09 · barreira do T-FX-db-1 desfeita de propósito");

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const barrier = await import("./helpers/pg-barrier.js");
  const applicationName = barrier.buildApplicationName("ass09-fx");
  const tagged = barrier.withApplicationName(connection, applicationName);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
  const role = await createEphemeralRole(admin, tagged);
  const attributes = (await admin.$queryRawUnsafe(
    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
    role.roleName,
  )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.deepEqual(attributes, [{ rolsuper: false, rolbypassrls: false }], "o código sob teste roda SEM superusuário e SEM bypass de RLS");
  await barrier.assertApplicationNamePropagated(role.client, applicationName);

  const [{ PrismaFxRatesRepository }, { InMemoryFxRatesRepository }, { FxRatesService }] = await Promise.all([
    import("../src/modules/subscription-billing/fx-rates/fx-rates.prisma.js"),
    import("../src/modules/subscription-billing/fx-rates/fx-rates.repository.js"),
    import("../src/modules/subscription-billing/fx-rates/fx-rates.service.js"),
  ]);
  const repository = new PrismaFxRatesRepository(role.client);
  const service = new FxRatesService(repository, () => FIXED_NOW);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const pick = (): string => letters[Math.floor(Math.random() * letters.length)]!;
  let currency = "BRL";
  while (currency === "BRL" || currency === "USD") currency = `Q${pick()}${pick()}`;

  return {
    admin,
    role,
    repository,
    service,
    currency,
    InMemoryFxRatesRepository,
    FxRatesService,
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
    async close(): Promise<void> {
      try {
        await admin.$executeRawUnsafe(`DELETE FROM platform_fx_rates WHERE currency_from = $1`, currency);
        await role.drop();
      } finally {
        await admin.$disconnect();
      }
    },
  };
}
