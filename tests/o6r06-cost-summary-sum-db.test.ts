import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  O6R06_JANELA_RESERVADA,
  O6R06_LINHA_CORTADA_MICROS,
  O6R06_MOEDA,
  O6R06_SERVICO_COMUM,
  O6R06_SERVICO_DA_CORTADA,
  buildCostLineItemRows,
  microsParaDecimal,
  microsParaNumero,
} from "./helpers/o6r06-cost-fixtures.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 · Ω6R-DIN-007 — O RESUMO SOMA NO BANCO, contra o Postgres REAL, com 10.001 linhas.
//
// O achado: "resumo soma apenas listLineItems limitado silenciosamente a 10.000 linhas"; o teste que
// ele pede: "a 10.001ª linha de alto valor aparece no total e rateio".
//
// São DOIS defeitos superpostos, e esta bateria fecha os dois:
//   S1/S2/S4  TRUNCAMENTO — a 10.001ª (a mais recente, a que o `take` com `orderBy asc` cortava)
//             entra no total, no `lineItemCount` e em `services[]`; o detalhe segue paginado ≤500.
//   S3′/S10   ACUMULAÇÃO EM FLOAT — a referência é somada em micro-unidades INTEIRAS e comparada com
//             `totalUnblendedCostExact` com tolerância ZERO; e `totalUnblendedCost` (o `number` do
//             contrato antigo) é medido DIVERGINDO, em vez de o risco ficar prometido no papel.
//   S9        a premissa de VERSÃO: em Prisma 7.8.0 `aggregate()` ignora `take/skip/cursor/distinct`;
//             no Prisma 8 passa a honrá-los. Um `take` colado no agregado mudaria o faturamento no
//             upgrade sem uma linha deste bloco ser tocada.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const LINHAS_COMUNS = 10_000;

// -----------------------------------------------------------------------------------------------
// ISOLAMENTO SOB PARALELISMO — a janela reservada e a isca.
//
// `node --test` roda os ARQUIVOS em paralelo (`scripts/run-backend-tests.mjs` faz `spawn` sem
// `--test-concurrency`, e o job `backend` do CI e exatamente essa forma). Enquanto esta fixture
// morava em 2026-06 ela dividia o mes com `o6r06-allocation-basis-rls-db.test.ts`, e a colisao era
// BIDIRECIONAL:
//   1. `getSummary` filtra por PERIODO (`buildLineItemWhere`) -> as linhas do rateio entravam na
//      contagem de 10.001 daqui (medido: `ChecklistService` em `services[]`, 1 vermelho em 5);
//   2. `listCostLineItems` do rateio faz OVERLAP PURO de periodo, SEM `import_id` -> as 10.001
//      linhas daqui caiam no mes dele e inflavam `totalImportedCost` (o `40` que A1 divide 30/10).
//
// O `importId` fecha SO a direcao 1 — nao ha escopo por import a passar para `listCostLineItems`.
// Por isso o conserto tem DUAS camadas, e nenhuma delas e redundante:
//   - JANELA RESERVADA (`O6R06_JANELA_RESERVADA`, 2028-02): fecha as DUAS direcoes;
//   - ESCOPO POR `importId` nos aceites: fecha a direcao 1 PERMANENTEMENTE, mesmo que a convencao
//     da janela seja violada depois por quem nao leu este comentario.
//
// A ISCA (`O6R06_ISCA_*`) e o que transforma a segunda camada de convencao em TESTE: um SEGUNDO
// import, na MESMA janela, que o escopo tem de manter fora da conta. Remover o `importId` dos
// aceites deixa S1/S3'/S4/S10 vermelhos SEMPRE — nao intermitentemente, nao sob corrida.
// -----------------------------------------------------------------------------------------------
const O6R06_ISCA_SERVICO = "AmazonIscaDeColisao";
const O6R06_ISCA_MOEDA = "EUR";
const O6R06_ISCA_LINHAS = 3;
const O6R06_ISCA_MICROS = 777_000_000_007n;

if (!connectionString) {
  test("B-O6R-06 cost summary SUM requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("S1 · a 10.001ª linha ENTRA no total, no lineItemCount e em services[] (o truncamento morreu)", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    try {
      const resumo = await ctx.service.getSummary({
        periodStart: cenario.fixture.periodStart,
        periodEnd: cenario.fixture.periodEnd,
        // ESCOPO: a isca vive na MESMA janela; sem este `importId` o numero abaixo passa a 10.004.
        importId: cenario.importId,
      });

      assert.equal(resumo.lineItemCount, LINHAS_COMUNS + 1, "todas as 10.001 linhas foram AGREGADAS");
      assertDecimalIgual(
        resumo.totalUnblendedCostExact,
        cenario.fixture.totalMicros,
        "o total exato bate com a soma em micro-unidades — inclusive a 10.001ª",
      );

      const daCortada = resumo.services.find((servico) => servico.serviceCode === O6R06_SERVICO_DA_CORTADA);

      assert.ok(daCortada, "o serviço exclusivo da 10.001ª aparece no agrupamento");
      assertDecimalIgual(daCortada!.unblendedCostExact, O6R06_LINHA_CORTADA_MICROS);
      assert.deepEqual(resumo.currencies, [O6R06_MOEDA]);
    } finally {
      await teardown(ctx, cenario.ids);
    }
  });

  test("S2 · o DETALHE continua paginado: 500 por página, e `limit` alto NÃO fura o teto", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    try {
      const filtros = { periodStart: cenario.fixture.periodStart, periodEnd: cenario.fixture.periodEnd };

      assert.equal((await ctx.service.listLineItems({ ...filtros, limit: 500 })).length, 500);
      assert.equal(
        (await ctx.service.listLineItems({ ...filtros, limit: 10_001 })).length,
        500,
        "o clamp de `normalizeLimit` (≤500) segue intacto — o resumo é que deixou de ter teto",
      );
      assert.equal((await ctx.service.listLineItems(filtros)).length, 200, "o default do detalhe não mudou");
    } finally {
      await teardown(ctx, cenario.ids);
    }
  });

  test("S3′ · referência em BigInt sobre 21 páginas de 500: tolerância ZERO contra o total exato", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    try {
      // ESCOPO por `importId`: a referencia crua abaixo ja le `WHERE import_id = $1`, entao sem ele
      // os dois lados mediriam universos diferentes assim que qualquer outro import tocasse a janela.
      const filtros = {
        periodStart: cenario.fixture.periodStart,
        periodEnd: cenario.fixture.periodEnd,
        importId: cenario.importId,
      };
      const resumo = await ctx.service.getSummary(filtros);

      // A REFERÊNCIA NÃO PODE SER SOMADA EM FLOAT: era esse o defeito do aceite original (tolerância
      // 1e-6 contra uma divergência medida de 1,1e-3). Lemos as linhas cruas como TEXTO e somamos em
      // micro-unidades inteiras — o único jeito de a referência ser mais exata do que o que ela confere.
      const linhasCruas = await ctx.client.$queryRawUnsafe<Array<{ unblended_cost: string; service_code: string }>>(
        `SELECT unblended_cost::text AS unblended_cost, service_code
           FROM cloud_cost_line_items
          WHERE import_id = $1::uuid
          ORDER BY billing_period_start ASC`,
        cenario.importId,
      );

      assert.equal(linhasCruas.length, LINHAS_COMUNS + 1, "a referência lê TODAS as linhas, sem teto");

      let referenciaMicros = 0n;
      const porServico = new Map<string, bigint>();

      for (const linha of linhasCruas) {
        const micros = decimalParaMicros(linha.unblended_cost);
        referenciaMicros += micros;
        porServico.set(linha.service_code, (porServico.get(linha.service_code) ?? 0n) + micros);
      }

      assertDecimalIgual(
        resumo.totalUnblendedCostExact,
        referenciaMicros,
        "tolerância ZERO: o `SUM(numeric)` do banco e a soma inteira da referência são idênticos",
      );

      for (const servico of resumo.services) {
        assertDecimalIgual(
          servico.unblendedCostExact,
          porServico.get(servico.serviceCode)!,
          `o GROUP BY de ${servico.serviceCode} bate com a soma manual das páginas`,
        );
      }
    } finally {
      await teardown(ctx, cenario.ids);
    }
  });

  test("S4 · o `where` do resumo é o MESMO do detalhe: filtrar por serviço soma só ele, e a contagem confere", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    try {
      // PERÍODO EXPLÍCITO NOS DOIS LADOS (ressalva E9 do crítico): o resumo injeta um default de 30
      // dias que o detalhe não tem. A diferença é de CONTRATO e está documentada; o que este aceite
      // mede é o `where` compartilhado, então os dois lados recebem o mesmo período de propósito.
      const filtros = {
        periodStart: cenario.fixture.periodStart,
        periodEnd: cenario.fixture.periodEnd,
        importId: cenario.importId,
      };

      const soDaCortada = await ctx.service.getSummary({ ...filtros, serviceCode: O6R06_SERVICO_DA_CORTADA });
      assert.equal(soDaCortada.lineItemCount, 1);
      assertDecimalIgual(soDaCortada.totalUnblendedCostExact, O6R06_LINHA_CORTADA_MICROS);
      assert.equal((await ctx.service.listLineItems({ ...filtros, serviceCode: O6R06_SERVICO_DA_CORTADA })).length, 1);

      const soComum = await ctx.service.getSummary({ ...filtros, serviceCode: O6R06_SERVICO_COMUM });
      assert.equal(soComum.lineItemCount, LINHAS_COMUNS, "o filtro do resumo enxerga as 10.000, não 10.000 truncadas");

      const porRegiao = await ctx.service.getSummary({ ...filtros, region: "sa-east-1" });
      assert.equal(porRegiao.lineItemCount, LINHAS_COMUNS + 1, "região casa com todas");

      const regiaoInexistente = await ctx.service.getSummary({ ...filtros, region: "nao-existe" });
      assert.equal(regiaoInexistente.lineItemCount, 0);
      assert.equal(regiaoInexistente.totalUnblendedCost, 0, "janela vazia devolve ZERO explícito, nunca null");

      const doImport = await ctx.service.getSummary(filtros);
      assert.equal(doImport.lineItemCount, LINHAS_COMUNS + 1, "o escopo por `importId` isola o import deste teste");

      // A ISCA — e o que SUBSTITUI a antiga linha `getSummary({ ...filtros, importId })`. Com
      // `filtros` ja carregando o proprio `importId`, aquela linha virou `{x, x}`: uma TAUTOLOGIA,
      // que passa a valer por construcao e deixa de medir. No lugar dela, uma asercao ESTRITAMENTE
      // MAIS FORTE — existe um SEGUNDO import na MESMA janela, e e o escopo, nao a sorte, que o
      // mantem fora de todos os numeros acima.
      const semEscopo = await ctx.service.getSummary({
        periodStart: cenario.fixture.periodStart,
        periodEnd: cenario.fixture.periodEnd,
      });

      assert.equal(
        semEscopo.lineItemCount,
        LINHAS_COMUNS + 1 + O6R06_ISCA_LINHAS,
        "sem `importId` a janela devolve OS DOIS imports. Se este numero vier 10.001, a isca sumiu e " +
          "os aceites acima passaram a valer por acidente; se vier outro, alguem mais escreveu na janela reservada",
      );
      assert.notEqual(
        semEscopo.totalUnblendedCostExact,
        doImport.totalUnblendedCostExact,
        "a isca MOVE o total — e por isso que remover o escopo por `importId` fica vermelho SEMPRE, nao sob corrida",
      );
      assert.ok(
        semEscopo.services.some((servico) => servico.serviceCode === O6R06_ISCA_SERVICO),
        "a isca esta plantada e VISIVEL na janela: o detector nao e teatro",
      );
    } finally {
      await teardown(ctx, cenario.ids);
    }
  });

  test("S9 · o agregado NÃO recebe take/skip/cursor/distinct — a premissa de versão, pinada por spy", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    try {
      const { PrismaCloudCostRepository } = await import("../src/modules/cloud-costs/aws-cur-prisma.repository.js");
      const { CloudCostService } = await import("../src/modules/cloud-costs/aws-cur.service.js");
      const argumentos: Record<string, unknown>[] = [];
      const espiao = spyOnAggregates(ctx.client, argumentos);
      const service = new CloudCostService(new PrismaCloudCostRepository(espiao));

      await service.getSummary({
        periodStart: cenario.fixture.periodStart,
        periodEnd: cenario.fixture.periodEnd,
      });

      assert.equal(argumentos.length, 2, "o resumo faz exatamente 1 aggregate e 1 groupBy");

      for (const argumento of argumentos) {
        for (const proibida of ["take", "skip", "cursor", "distinct"]) {
          assert.equal(
            proibida in argumento,
            false,
            `\`${proibida}\` não pode existir aqui: o Prisma 7.8.0 o IGNORA e o Prisma 8 passa a honrá-lo — ` +
              "um teto invisível hoje viraria subfaturamento no upgrade",
          );
        }
      }
    } finally {
      await teardown(ctx, cenario.ids);
    }
  });

  test("S10 · acima de 2^53 micro-unidades o campo EXATO bate e o `number` NÃO — o Risco 6, executado", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    try {
      const resumo = await ctx.service.getSummary({
        periodStart: cenario.fixture.periodStart,
        periodEnd: cenario.fixture.periodEnd,
        // ESCOPO: a referencia `doBanco` abaixo soma `WHERE import_id = $1`; sem este `importId` o
        // resumo somaria tambem a isca e a igualdade viraria uma corrida.
        importId: cenario.importId,
      });

      const doBanco = await ctx.client.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT sum(unblended_cost)::text AS total FROM cloud_cost_line_items WHERE import_id = $1::uuid`,
        cenario.importId,
      );

      assert.ok(
        cenario.fixture.totalMicros > 2n ** 53n,
        "a fixture PRECISA passar de 2^53 micro-unidades, senão este aceite não mede nada",
      );
      assert.equal(resumo.totalUnblendedCostExact, doBanco[0]!.total, "o exato é o que o banco somou, sem conversão");

      // E é AQUI que o campo antigo do contrato se revela lossy: `totalUnblendedCost` é `number`, e
      // `Number(exato)` não representa 9,9e9 com 6 casas. Não é bug do bloco — é a razão de
      // `totalUnblendedCostExact` existir, e de `P-O6R-B06-DECIMAL-NA-BORDA` seguir aberta para o painel.
      assert.equal(resumo.totalUnblendedCost, microsParaNumero(cenario.fixture.totalMicros));
      assert.notEqual(
        String(resumo.totalUnblendedCost),
        resumo.totalUnblendedCostExact,
        "o `number` PERDE casas nesta faixa — medido, não prometido",
      );
    } finally {
      await teardown(ctx, cenario.ids);
    }
  });

  test("S11 · vaza-metro: o teardown apaga OS DOIS imports e devolve a janela reservada VAZIA", async () => {
    // O defeito que este caso existe para impedir: a isca cria um SEGUNDO import, e um teardown que
    // so conhecesse o primeiro deixaria lixo PERMANENTE em 2028-02 — a isca viraria a fonte de
    // colisao que ela existe para detectar. Aqui isso e MEDIDO, nao prometido.
    const ctx = await bootstrap(connectionString);
    const cenario = await seedLineItems(ctx);

    await teardown(ctx, cenario.ids);

    // Conexao NOVA de proposito: quem confere a limpeza nao pode ser a mesma sessao que a executou
    // (e `teardown` fecha a dele no `finally`).
    const conferente = await bootstrap(connectionString);

    try {
      for (const id of cenario.ids) {
        const linhas = await conferente.client.$queryRawUnsafe<Array<{ n: number }>>(
          `SELECT count(*)::int AS n FROM cloud_cost_line_items WHERE import_id = $1::uuid`,
          id,
        );
        const imports = await conferente.client.$queryRawUnsafe<Array<{ n: number }>>(
          `SELECT count(*)::int AS n FROM cloud_cost_imports WHERE id = $1::uuid`,
          id,
        );

        assert.equal(linhas[0]!.n, 0, `o import ${id} nao deixou NENHUMA linha para tras`);
        assert.equal(imports[0]!.n, 0, `o proprio import ${id} foi removido`);
      }

      // E a RESERVA em si, medida no banco: fora estes dois imports, ninguem escreve em 2028-02. Se
      // este numero for > 0, ou um teardown deste arquivo falhou, ou a janela deixou de ser
      // reservada — e o guard estatico `o6r06-janela-reservada-guard` diz qual dos dois.
      const naJanela = await conferente.client.$queryRawUnsafe<Array<{ n: number }>>(
        `SELECT count(*)::int AS n
           FROM cloud_cost_line_items
          WHERE billing_period_start >= $1::timestamptz AND billing_period_start <= $2::timestamptz`,
        cenario.fixture.periodStart,
        cenario.fixture.periodEnd,
      );

      assert.equal(naJanela[0]!.n, 0, "a janela reservada 2028-02 ficou VAZIA — nem debris nosso, nem de terceiro");
    } finally {
      await conferente.client.$disconnect();
    }
  });
}

// ── infra ────────────────────────────────────────────────────────────────────────────────────────
async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { PrismaCloudCostRepository } = await import("../src/modules/cloud-costs/aws-cur-prisma.repository.js");
  const { CloudCostService } = await import("../src/modules/cloud-costs/aws-cur.service.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  return { client, service: new CloudCostService(new PrismaCloudCostRepository(client)) };
}

type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>;

/** Espiã dos argumentos de `aggregate`/`groupBy` — só o `cloudCostLineItem` é interceptado. */
function spyOnAggregates<T extends object>(client: T, coletados: Record<string, unknown>[]): T {
  return new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (property !== "cloudCostLineItem") {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return new Proxy(value as object, {
        get(delegate, method, delegateReceiver) {
          const original = Reflect.get(delegate, method, delegateReceiver);

          if (method !== "aggregate" && method !== "groupBy") {
            return typeof original === "function" ? original.bind(delegate) : original;
          }

          return (args: Record<string, unknown>) => {
            coletados.push(args);

            return (original as (input: unknown) => unknown).call(delegate, args);
          };
        },
      });
    },
  }) as T;
}

/**
 * TOLERÂNCIA ZERO, mas comparando VALOR e não FORMATO: `Decimal.toString()` apara zeros à direita
 * (`9900000000.01`), enquanto a referência escreve as 6 casas (`9900000000.010000`). Comparar as
 * strings puniria a formatação, não a aritmética — e afrouxar para `Number()` traria de volta o
 * float que este arquivo existe para eliminar. Micro-unidades inteiras resolvem os dois.
 */
function assertDecimalIgual(exato: string, esperadoMicros: bigint, mensagem?: string): void {
  assert.equal(decimalParaMicros(exato), esperadoMicros, mensagem);
}

function decimalParaMicros(value: string): bigint {
  const [inteiro, fracao = ""] = value.split(".");

  return BigInt(inteiro!) * 1_000_000n + BigInt(fracao.padEnd(6, "0").slice(0, 6));
}

async function seedLineItems(ctx: BootstrapContext) {
  // JANELA RESERVADA — 2028-02, nunca mais 2026-06. Ver a nota no topo do arquivo e o comentario da
  // constante no helper: e a UNICA das duas camadas que fecha a direcao 2 (o overlap de periodo do
  // rateio, que nao aceita `import_id` nenhum).
  const periodStart = O6R06_JANELA_RESERVADA;
  const importado = await ctx.client.cloudCostImport.create({
    data: { provider: "aws", source_type: "mock_fixture", status: "completed", metadata: {} },
  });
  const { rows, fixture } = buildCostLineItemRows({
    importId: importado.id,
    linhasComuns: LINHAS_COMUNS,
    periodStart,
  });

  // UM statement para as 10.001 linhas. 10.001 `create` levariam minutos e a suíte falharia por
  // tempo, não por defeito — que é o jeito mais fácil de um teste de faturamento virar teatro.
  await ctx.client.cloudCostLineItem.createMany({ data: rows as never });

  const isca = await plantarIsca(ctx, periodStart);

  return { importId: importado.id, iscaImportId: isca, ids: [importado.id, isca] as const, fixture };
}

/**
 * A ISCA: um segundo import, na MESMA janela, que os aceites escopados NAO PODEM ver. Ela tem
 * `serviceCode`, moeda e valor proprios de proposito — assim a remocao do escopo por `importId`
 * quebra mais de um aceite por vias diferentes: `lineItemCount` (S1/S4), `currencies` (S1, que
 * passaria a ["EUR","USD"]), `services[]` e o total exato (S1/S3'/S10), e a contagem por regiao
 * (S4, que compartilha `sa-east-1` de proposito). Nao e uma corrida: e determinismo.
 */
async function plantarIsca(ctx: BootstrapContext, periodStart: Date): Promise<string> {
  const isca = await ctx.client.cloudCostImport.create({
    data: { provider: "aws", source_type: "mock_fixture", status: "completed", metadata: {} },
  });
  const umaHora = 60 * 60 * 1000;
  const inicio = new Date(periodStart.getTime() + umaHora);

  await ctx.client.cloudCostLineItem.createMany({
    data: Array.from({ length: O6R06_ISCA_LINHAS }, (_, indice) => ({
      import_id: isca.id,
      provider: "aws",
      billing_period_start: inicio,
      billing_period_end: new Date(inicio.getTime() + umaHora),
      service_code: O6R06_ISCA_SERVICO,
      usage_type: "BoxUsage",
      // MESMA regiao da fixture principal, de proposito: e o que faz o `porRegiao` de S4 cair
      // junto com os outros quando o escopo some.
      region: "sa-east-1",
      unblended_cost: microsParaDecimal(O6R06_ISCA_MICROS),
      currency: O6R06_ISCA_MOEDA,
      raw_line_hash: `o6r06-isca-${indice}-${isca.id}`,
      metadata: {},
    })) as never,
  });

  return isca.id;
}

/**
 * DOIS ids, nao um. A isca cria um SEGUNDO import — se o teardown continuasse apagando so o
 * primeiro, ela viraria exatamente a fonte de colisao que existe para detectar: lixo permanente na
 * janela reservada, que envenenaria a proxima execucao (e a asercao `LINHAS_COMUNS + 1 + ISCA` de
 * S4 seria a primeira a cair). Quem mede a limpeza e `S11`.
 */
async function teardown(ctx: BootstrapContext, importIds: readonly string[]): Promise<void> {
  try {
    // Teardown ESCOPADO nos imports que ESTE teste criou — nunca wildcard, nunca a partir de listagem.
    await ctx.client.cloudCostLineItem.deleteMany({ where: { import_id: { in: [...importIds] } } });
    await ctx.client.cloudCostImport.deleteMany({ where: { id: { in: [...importIds] } } });
  } finally {
    await ctx.client.$disconnect();
  }
}
