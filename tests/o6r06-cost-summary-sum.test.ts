import assert from "node:assert/strict";
import test from "node:test";

import { buildMemoryCostLineItems } from "./helpers/o6r06-cost-fixtures.js";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 · Ω6R-DIN-007 — O CONTRATO DO RESUMO, em memória: o que acontece com NULL, com zero linha
// e com o `limit` que deixou de existir.
//
// A parte que só o Postgres prova (10.001 linhas, SUM(numeric), GROUP BY) está em
// `o6r06-cost-summary-sum-db`. Aqui mora a REGRA DE CONTRATO, que é onde o `?? 0` mataria a diferença
// entre "janela vazia" e "soma nula":
//
//   S5  o dublê soma SEM LIMITE, e `getSummary` NÃO passa `limit` ao repositório (spy)
//   S6  exatidão: 0.1 + 0.2 + 0.3 = 0.6, e o serviço NÃO reduz o array (o total vem pronto)
//   S7  janela vazia → forma exata com zeros explícitos; nenhum `null`, nenhum `NaN`
//   S8  `lineItemCount > 0` com `total === null` → o serviço LANÇA (combinação impossível)
//
// S7 e S8 são um PAR de propósito: S7 sozinho PASSA com um `?? 0` incondicional — é S8 que mata o
// `?? 0`. Declarar isso é o que impede a leitura preguiçosa de "S7 verde, logo está protegido".
// -----------------------------------------------------------------------------------------------

test("S5 · o dublê soma SEM limite, e getSummary não passa `limit` ao repositório", async () => {
  const { CloudCostService, InMemoryCloudCostRepository } = await bootstrap();
  const periodStart = new Date("2026-06-01T00:00:00.000Z");
  const { items, fixture } = buildMemoryCostLineItems({ linhasComuns: 10_000, periodStart });

  const repository = new InMemoryCloudCostRepository();
  await semearNoRepositorioDeMemoria(repository, items);

  const filtrosVistos: Record<string, unknown>[] = [];
  const espiao = {
    ...repository,
    summarizeLineItems: (filtros: Record<string, unknown>) => {
      filtrosVistos.push(filtros);

      return repository.summarizeLineItems(filtros as never);
    },
    listLineItems: repository.listLineItems.bind(repository),
  };

  const service = new CloudCostService(espiao as never);
  const resumo = await service.getSummary({ periodStart, periodEnd: fixture.periodEnd });

  assert.equal(resumo.lineItemCount, 10_001, "o dublê agrega as 10.001, sem teto");
  assert.equal(filtrosVistos.length, 1);
  assert.equal(
    "limit" in filtrosVistos[0]!,
    false,
    "`normalizeSummaryFilters` não pode mais produzir `limit` — era ele o truncamento silencioso",
  );
});

test("S6 · exatidão: 0.1 + 0.2 + 0.3 = 0.6, e o serviço NÃO reduz o array (o total vem somado)", async () => {
  const { CloudCostService, InMemoryCloudCostRepository } = await bootstrap();
  const periodStart = new Date("2026-06-01T00:00:00.000Z");
  const repository = new InMemoryCloudCostRepository();

  await semearNoRepositorioDeMemoria(
    repository,
    [0.1, 0.2, 0.3].map((valor, indice) => linha(indice, valor, periodStart)),
  );

  let listLineItemsChamado = 0;
  const espiao = {
    ...repository,
    summarizeLineItems: repository.summarizeLineItems.bind(repository),
    listLineItems: (filtros: unknown) => {
      listLineItemsChamado += 1;

      return repository.listLineItems(filtros as never);
    },
  };

  const service = new CloudCostService(espiao as never);
  const resumo = await service.getSummary({
    periodStart,
    periodEnd: new Date(periodStart.getTime() + 24 * 60 * 60 * 1000),
  });

  assert.equal(resumo.totalUnblendedCostExact, "0.600000", "somado em inteiros, não em float (0.6, nunca 0.6000000000000001)");
  assert.equal(resumo.totalUnblendedCost, 0.6);
  assert.equal(
    listLineItemsChamado,
    0,
    "o caminho do resumo NÃO lê a lista: quem soma é o banco/dublê, e o serviço só converte na borda",
  );
});

test("S7 · janela VAZIA devolve a forma exata com zeros explícitos — nenhum null, nenhum NaN", async () => {
  const { CloudCostService, InMemoryCloudCostRepository } = await bootstrap();
  const service = new CloudCostService(new InMemoryCloudCostRepository());
  const periodStart = new Date("2030-01-01T00:00:00.000Z");
  const resumo = await service.getSummary({ periodStart, periodEnd: new Date("2030-01-31T00:00:00.000Z") });

  assert.equal(resumo.lineItemCount, 0);
  assert.equal(resumo.totalUnblendedCost, 0);
  assert.equal(resumo.totalUnblendedCostExact, "0");
  assert.deepEqual(resumo.services, []);
  assert.deepEqual(resumo.currencies, []);
  assert.equal(Number.isNaN(resumo.totalUnblendedCost), false);

  // NOTA DE HONESTIDADE, exigida pela EMENDA E1·5: este aceite PASSA mesmo com um `?? 0`
  // incondicional. Ele não protege nada sozinho — quem mata o `?? 0` é o S8 abaixo.
});

test("S8 · `lineItemCount > 0` com total nulo é combinação IMPOSSÍVEL: o serviço LANÇA em vez de devolver 0", async () => {
  const { CloudCostService } = await bootstrap();

  // O repositório-dublê devolve o estado que só um BUG produziria: houve linha para somar e a soma
  // veio nula. Um `?? 0` incondicional transformaria isso num total de faturamento igual a ZERO,
  // publicado com cara de verdade — é exatamente o `|| 0` que já fabricou pico no painel desta casa.
  const service = new CloudCostService({
    summarizeLineItems: async () => ({
      total: null,
      lineItemCount: 3,
      byServiceCurrency: [],
      currencies: [],
    }),
  } as never);

  await assert.rejects(
    () => service.getSummary({ periodStart: new Date("2026-06-01"), periodEnd: new Date("2026-06-30") }),
    (error: unknown) =>
      (error as { code?: string }).code === "CLOUD_COST_SUMMARY_INCONSISTENT" &&
      (error as { reason?: string }).reason === "summary_total_missing",
    "a combinação impossível tem de falhar ALTO, com código próprio",
  );
});

// --- apoio -----------------------------------------------------------------------------------------

async function bootstrap() {
  const [repositorio, servico] = await Promise.all([
    import("../src/modules/cloud-costs/aws-cur.repository.js"),
    import("../src/modules/cloud-costs/aws-cur.service.js"),
  ]);

  return {
    CloudCostService: servico.CloudCostService,
    InMemoryCloudCostRepository: repositorio.InMemoryCloudCostRepository,
  };
}

function linha(indice: number, unblendedCost: number, periodStart: Date) {
  return {
    id: `s6-${indice}`,
    importId: "s6",
    provider: "aws" as const,
    billingPeriodStart: periodStart,
    billingPeriodEnd: new Date(periodStart.getTime() + 60 * 60 * 1000),
    serviceCode: "AmazonEC2",
    usageType: "BoxUsage",
    unblendedCost,
    currency: "USD",
    rawLineHash: `s6-${indice}`,
    metadata: {},
    createdAt: periodStart,
  };
}

/**
 * O `InMemoryCloudCostRepository` só ganha linhas por `createLineItems`, que exige um import. Semear
 * pelo caminho público mantém o dublê íntegro — nada de escrever no campo privado por fora.
 */
async function semearNoRepositorioDeMemoria(
  repository: { createImport(input: unknown): Promise<{ id: string }>; createLineItems(importId: string, lines: unknown): Promise<unknown> },
  items: readonly Record<string, unknown>[],
): Promise<void> {
  const importado = await repository.createImport({
    provider: "aws",
    sourceType: "mock_fixture",
    status: "completed",
    metadata: {},
  });

  await repository.createLineItems(importado.id, items as never);
}
