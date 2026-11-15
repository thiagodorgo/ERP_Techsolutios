import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryFxRatesRepository } from "../src/modules/subscription-billing/fx-rates/fx-rates.repository.js";
import { FxRatesService } from "../src/modules/subscription-billing/fx-rates/fx-rates.service.js";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F5a — câmbio do mês em MEMÓRIA (Emenda 2 §2.3): o dublê `InMemoryFxRatesRepository` e o `FxRatesService`, sem
// banco. É aqui que a M-FX-6 e a M-FX-7 morrem sem Postgres (a cadeira de dinheiro roda "na mesa"); as versões `-db` do
// mesmo comportamento ficam em `tests/ass-09-fx-rates-db.test.ts`. "A visão usa 5.500000" é de quem lê a taxa na visão (F6).
// -----------------------------------------------------------------------------------------------

// 14/11 01:30 UTC = 13/11 22:30 em São Paulo: o mês corrente de negócio é novembro.
const FIXED_NOW = new Date("2026-11-14T01:30:00.000Z");

function setup(now: Date = FIXED_NOW) {
  const repository = new InMemoryFxRatesRepository();
  const service = new FxRatesService(repository, () => now);
  return { repository, service };
}

test("T-FX-5 · 5.400000 e depois 5.500000 → vigente 5.500000, versão 2, histórico com 2 linhas da maior para a menor", async () => {
  // MUTAÇÃO QUE MATA: M-FX-6 (no dublê, `.sort((a, b) => b.version - a.version)` → `.sort((a, b) => a.version - b.version)`).
  const { service } = setup();
  await service.putRate("2026-10", { currencyFrom: "USD", rate: "5.400000", actorId: null });
  const second = await service.putRate("2026-10", { currencyFrom: "USD", rate: "5.500000", actorId: null });
  assert.equal(second.current.rate, "5.500000");
  assert.equal(second.current.version, 2);
  assert.deepEqual(
    second.history.map((h) => [h.version, h.rate]),
    [
      [2, "5.500000"],
      [1, "5.400000"],
    ],
  );
  const current = await service.currentRate("2026-10", "USD");
  assert.deepEqual([current?.version, current?.rate], [2, "5.500000"]);
  const listed = await service.listRates("2026-10", "2026-10");
  assert.equal(listed.length, 1);
  assert.deepEqual(
    [listed[0]!.version, listed[0]!.rate, listed[0]!.history.map((h) => h.version)],
    [2, "5.500000", [2, 1]],
  );
  assert.equal(await service.currentRate("2026-09", "USD"), null, "mês sem taxa: nulo, nunca 1");
});

test("T-FX-6 · entrada inválida é recusada com o código, e nada é gravado", async () => {
  // MUTAÇÃO QUE MATA: M-FX-7 (a regex da taxa sem o limite de 6 casas → "5.1234567" aceito).
  const { repository, service } = setup();
  const rejects = async (
    label: string,
    run: () => Promise<unknown>,
    expected: { statusCode: number; reason: string },
  ): Promise<void> => {
    await assert.rejects(
      run,
      (error: any) => {
        assert.equal(error?.statusCode, expected.statusCode, `${label}: status`);
        assert.equal(error?.reason, expected.reason, `${label}: motivo`);
        return true;
      },
      label,
    );
  };
  for (const rate of ["0", "0.000000", "-1", "5.1234567", "abc", "1e3", "1000", "", " 5.4", "5,4"]) {
    await rejects(`rate ${JSON.stringify(rate)}`, () => service.putRate("2026-10", { currencyFrom: "USD", rate, actorId: null }), {
      statusCode: 422,
      reason: "rate_invalid",
    });
  }
  await rejects("mês 2026-13", () => service.putRate("2026-13", { currencyFrom: "USD", rate: "5.4", actorId: null }), {
    statusCode: 400,
    reason: "invalid_month",
  });
  await rejects(
    "destino USD",
    () => service.putRate("2026-10", { currencyFrom: "EUR", currencyTo: "USD", rate: "5.4", actorId: null }),
    { statusCode: 422, reason: "currency_pair_unsupported" },
  );
  await rejects("origem BRL", () => service.putRate("2026-10", { currencyFrom: "BRL", rate: "5.4", actorId: null }), {
    statusCode: 422,
    reason: "currency_pair_unsupported",
  });
  await rejects("origem em minúsculas", () => service.putRate("2026-10", { currencyFrom: "usd", rate: "5.4", actorId: null }), {
    statusCode: 422,
    reason: "currency_pair_unsupported",
  });
  // Relógio 2026-12-01T01:30Z = 30/11 22:30 em São Paulo: dezembro ainda é futuro (data de negócio, nunca UTC).
  const atNightSp = new FxRatesService(repository, () => new Date("2026-12-01T01:30:00.000Z"));
  await rejects("mês futuro em SP", () => atNightSp.putRate("2026-12", { currencyFrom: "USD", rate: "5.4", actorId: null }), {
    statusCode: 422,
    reason: "fx_month_in_future",
  });
  await rejects("período de 25 meses", () => service.listRates("2024-01", "2026-01"), { statusCode: 422, reason: "range_too_large" });
  await rejects("período invertido", () => service.listRates("2026-02", "2026-01"), { statusCode: 400, reason: "invalid_month" });

  assert.deepEqual(await repository.listRange("2000-01", "2099-12"), [], "nenhuma entrada recusada chegou ao repositório");
  assert.deepEqual(await service.listRates("2024-02", "2026-01"), [], "24 meses é aceito");

  const accepted = await atNightSp.putRate("2026-11", { currencyFrom: "USD", rate: "5.4", actorId: null });
  assert.equal(accepted.current.rate, "5.400000", "o mês corrente em SP (novembro, às 22:30 do dia 30) é aceito e normalizado");
  assert.equal(accepted.current.version, 1);
});
