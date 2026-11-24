import { env } from "../src/config/env.js";
import { withTenantRls } from "../src/database/rls.js";
import { prisma } from "../src/database/prisma.js";
import { createPrismaAuctionRepository } from "../src/modules/auction/auction-prisma.repository.js";
import { createDefaultChargeService } from "../src/modules/charging/charge.service.js";
import { createPrismaReleaseRepository } from "../src/modules/release/release-prisma.repository.js";

type FrozenRow = {
  id: string;
  status: string;
  temLiquidacao: boolean;
  temLiberacaoEmCurso: boolean;
};

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function money(value: number): string {
  return value.toFixed(2);
}

async function listFrozen(tenantId: string): Promise<FrozenRow[]> {
  return withTenantRls(prisma, tenantId, (tx) => tx.$queryRaw<FrozenRow[]>`
    SELECT
      ip.id,
      ip.status,
      EXISTS (SELECT 1 FROM settlements s WHERE s.tenant_id = ip.tenant_id AND s.process_id = ip.id) AS "temLiquidacao",
      EXISTS (
        SELECT 1
          FROM impound_releases r
         WHERE r.tenant_id = ip.tenant_id
           AND r.process_id = ip.id
           AND r.status IN ('IN_PROGRESS', 'AUTHORIZED')
      ) AS "temLiberacaoEmCurso"
    FROM impound_processes ip
    WHERE ip.tenant_id = ${tenantId}::uuid
      AND ip.frozen_at IS NOT NULL
    ORDER BY ip.created_at ASC
  `);
}

async function resolveDailyUnit(tenantId: string, processId: string): Promise<number> {
  const rows = await withTenantRls(prisma, tenantId, (tx) => tx.$queryRaw<Array<{ unit_price: string | null }>>`
    SELECT t.unit_price::text AS unit_price
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      JOIN tariffs t ON t.tenant_id = ip.tenant_id
                    AND t.service_catalog_id = COALESCE(ip.regime_daily_service_catalog_id, jp.daily_service_catalog_id)
      JOIN price_tables pt ON pt.tenant_id = t.tenant_id AND pt.id = t.price_table_id
     WHERE ip.tenant_id = ${tenantId}::uuid
       AND ip.id = ${processId}::uuid
       AND t.is_active = true
       AND t.status = 'active'
       AND (t.valid_from IS NULL OR t.valid_from <= now())
       AND (t.valid_to IS NULL OR t.valid_to > now())
       AND pt.is_active = true
       AND pt.status = 'published'
       AND (pt.valid_from IS NULL OR pt.valid_from <= now())
       AND (pt.valid_to IS NULL OR pt.valid_to > now())
       AND (pt.scope IS NULL OR pt.scope = ip.regime_scope)
     ORDER BY
       CASE WHEN pt.scope IS NULL THEN 1 ELSE 0 END,
       t.valid_from DESC NULLS LAST,
       t.created_at DESC
     LIMIT 1
  `);
  return Number(rows[0]?.unit_price ?? "0");
}

const DAILY_CAP_DAYS = 180;

async function runAbrirPeriodoLeilao(tenantId: string, apply: boolean): Promise<number> {
  const rows = await withTenantRls(prisma, tenantId, (tx) => tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT ip.id, ip.status
    FROM impound_processes ip
    WHERE ip.tenant_id = ${tenantId}::uuid
      AND ip.status IN ('AUCTION_PREP', 'LOTTED', 'AUCTIONED')
      AND NOT EXISTS (
        SELECT 1
          FROM impound_daily_suspensions ids
         WHERE ids.tenant_id = ip.tenant_id
           AND ids.process_id = ip.id
           AND ids.ended_at IS NULL
      )
    ORDER BY ip.created_at ASC
  `);

  const emLeilaoSemPeriodo: Array<{ id: string; status: string; preparadoEm?: Date; diariasPagasNoPeriodo: number; pagas: Array<{ periodSeq: number; total: string }> }> = [];
  for (const row of rows) {
    const preparacao = await withTenantRls(prisma, tenantId, (tx) => tx.$queryRaw<Array<{ occurred_at: Date }>>`
      SELECT occurred_at
      FROM custody_events
      WHERE tenant_id = ${tenantId}::uuid
        AND process_id = ${row.id}::uuid
        AND type = 'AUCTION_PREP'
      ORDER BY occurred_at DESC, seq DESC
      LIMIT 1
    `);
    const preparadoEm = preparacao[0]?.occurred_at;
    const pagas = await withTenantRls(prisma, tenantId, (tx) => tx.$queryRaw<Array<{ period_seq: number; total: string }>>`
      SELECT pc.period_seq, pc.total_amount::text AS total
      FROM process_charges pc
      WHERE pc.tenant_id = ${tenantId}::uuid
        AND pc.process_id = ${row.id}::uuid
        AND pc.kind = 'DAILY'
        AND pc.settled_at IS NOT NULL
        AND pc.ref_date >= ${preparadoEm}::date
        AND pc.ref_date <= now()::date
      ORDER BY pc.period_seq ASC
    `);
    emLeilaoSemPeriodo.push({
      id: row.id,
      status: row.status,
      preparadoEm,
      diariasPagasNoPeriodo: pagas.length,
      pagas: pagas.map((linha) => ({ periodSeq: linha.period_seq, total: linha.total })),
    });
  }

  const periodoAbrivel = emLeilaoSemPeriodo.filter((processo) => processo.diariasPagasNoPeriodo === 0 && processo.preparadoEm !== undefined);

  for (const processo of periodoAbrivel) {
    if (apply && processo.preparadoEm !== undefined) {
      await withTenantRls(prisma, tenantId, (tx) => tx.$executeRaw`
        INSERT INTO impound_daily_suspensions (tenant_id, process_id, started_at, reason)
        VALUES (${tenantId}::uuid, ${processo.id}::uuid, ${processo.preparadoEm}, 'AUCTION')
      `);
    }
  }

  console.log(`organização: ${tenantId}`);
  console.log("em leilão sem período:");
  for (const processo of emLeilaoSemPeriodo) {
    const pagas = processo.pagas.map((linha) => `#${linha.periodSeq} ${linha.total}`).join(", ");
    console.log(`- ${processo.id} (${processo.status}) preparadoEm=${processo.preparadoEm?.toISOString() ?? "sem evento"} pagasNoPeriodo=${processo.diariasPagasNoPeriodo}${pagas ? ` [${pagas}]` : ""}`);
  }
  console.log(`total em leilão sem período: ${emLeilaoSemPeriodo.length}`);
  console.log("períodos abertos:");
  for (const processo of periodoAbrivel) console.log(`- ${processo.id} (${processo.status})`);
  console.log(`total de períodos abertos: ${periodoAbrivel.length}`);

  return periodoAbrivel.length === emLeilaoSemPeriodo.length ? 0 : 1;
}

async function runListarPagasAcimaDoTeto(tenantId: string): Promise<number> {
  const diariasPagas = await withTenantRls(prisma, tenantId, (tx) => tx.$queryRaw<Array<{ processId: string; periodSeq: number; total: string }>>`
    SELECT pc.process_id AS "processId", pc.period_seq AS "periodSeq", pc.total_amount::text AS total
    FROM process_charges pc
    WHERE pc.tenant_id = ${tenantId}::uuid
      AND pc.kind = 'DAILY'
      AND pc.settled_at IS NOT NULL
      AND pc.period_seq IS NOT NULL
    ORDER BY pc.process_id ASC, pc.period_seq ASC
  `);
  const pagasAcimaDoTeto = diariasPagas.filter((diaria) => diaria.periodSeq > DAILY_CAP_DAYS);

  const porProcesso = new Map<string, { periodSeq: number; total: string }[]>();
  for (const diaria of pagasAcimaDoTeto) {
    const lista = porProcesso.get(diaria.processId) ?? [];
    lista.push({ periodSeq: diaria.periodSeq, total: diaria.total });
    porProcesso.set(diaria.processId, lista);
  }

  console.log(`organização: ${tenantId}`);
  console.log("diárias pagas acima do teto (180):");
  for (const [processId, lista] of porProcesso) {
    const valor = lista.reduce((acc, linha) => acc + Number(linha.total), 0).toFixed(2);
    console.log(`- ${processId}: ${lista.length} pagas, ${valor}`);
    for (const linha of lista) console.log(`  #${linha.periodSeq} ${linha.total}`);
  }
  console.log(`total de processos com pagas acima do teto: ${porProcesso.size}`);
  console.log(`total de pagas acima do teto: ${pagasAcimaDoTeto.length}`);

  return 0;
}

async function main(): Promise<number> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    console.error("ERROR: execute com CORE_SAAS_PERSISTENCE=prisma");
    return 2;
  }

  const tenantId = readArg("--organizacao");
  if (!tenantId) {
    console.error("informe --organizacao <tenant_id>");
    return 2;
  }

  const apply = hasFlag("--aplicar");
  const thawMode = hasFlag("--descongelar-legado");
  const openMode = hasFlag("--abrir-periodo-leilao");
  const listOverMode = hasFlag("--listar-pagas-acima-do-teto");

  if (openMode) return runAbrirPeriodoLeilao(tenantId, apply);
  if (listOverMode) return runListarPagasAcimaDoTeto(tenantId);

  const charge = await createDefaultChargeService();
  const release = await createPrismaReleaseRepository();
  const auction = thawMode ? await createPrismaAuctionRepository() : undefined;
  const rows = await listFrozen(tenantId);

  const curaveis: string[] = [];
  const naoLancaveis: string[] = [];
  const liquidacao: string[] = [];
  const liquidados: string[] = [];
  const liberados: string[] = [];
  const descongelados: string[] = [];
  const bloqueados: string[] = [];

  let exitCode = 0;

  const estadosDescongelaveis = ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE", "AUCTION_PREP", "LOTTED", "AUCTIONED"] as const;
  const congeladosVivos = rows.filter((processo) => estadosDescongelaveis.includes(processo.status as (typeof estadosDescongelaveis)[number]));
  const descongelaveis = congeladosVivos.filter((processo) => !processo.temLiquidacao && !processo.temLiberacaoEmCurso);
  const curaveisFiltrados = rows.filter((processo) => processo.status === "DIRECT_RECYCLING" && !processo.temLiquidacao);

  for (const row of rows) {
    const state = await charge.getReleaseChargeState(tenantId, row.id);
    const shortfall = state?.dailyShortfall ?? 0;
    if (shortfall <= 0 && !thawMode) continue;

    if (!thawMode) {
      if (curaveisFiltrados.some((processo) => processo.id === row.id)) {
        curaveis.push(row.id);
        if (apply) {
          const result = await charge.accrueProcess(tenantId, row.id, new Date(), undefined);
          if (result.errors > 0) {
            naoLancaveis.push(row.id);
            exitCode = 1;
          }
        }
        continue;
      }

      if (row.temLiquidacao) {
        const valorFaltante = shortfall * (await resolveDailyUnit(tenantId, row.id));
        liquidados.push(`${row.id} (${money(valorFaltante)})`);
        exitCode = 1;
        continue;
      }

      if (row.status === "AUCTIONED" || row.status === "AUCTION_CLOSED" || row.status === "LOTTED") {
        liquidacao.push(row.id);
        continue;
      }

      if (row.status === "RELEASED") {
        liberados.push(row.id);
        exitCode = 1;
      }
      continue;
    }

    const activeRelease = await release.hasActiveRelease(tenantId, row.id);
    if (!descongelaveis.some((processo) => processo.id === row.id) || row.status === "AUCTION_CLOSED" || row.status === "RELEASE_IN_PROGRESS" || (row.status === "LOTTED" && activeRelease)) {
      bloqueados.push(row.id);
      if (row.status === "RELEASE_IN_PROGRESS" || (row.status === "LOTTED" && activeRelease)) {
        exitCode = 1;
      }
      continue;
    }

    descongelados.push(row.id);
    if (apply) {
      await auction?.thawLegacyFreezeAtomic(tenantId, row.id);
    }
  }

  console.log(`organização: ${tenantId}`);

  if (!thawMode) {
    console.log("curáveis:");
    for (const id of curaveis) console.log(`- ${id}`);
    console.log(`total curáveis: ${curaveis.length}`);
    if (naoLancaveis.length > 0) {
      console.log("não lançáveis:");
      for (const id of naoLancaveis) console.log(`- ${id}`);
      console.log(`total não lançáveis: ${naoLancaveis.length}`);
    }
    if (liquidacao.length > 0) {
      console.log("serão fechados na liquidação:");
      for (const id of liquidacao) console.log(`- ${id}`);
      console.log(`total em liquidação: ${liquidacao.length}`);
    }
    if (liquidados.length > 0) {
      console.log("liquidados com livro incompleto:");
      for (const id of liquidados) console.log(`- ${id}`);
      console.log(`total liquidados incompletos: ${liquidados.length}`);
    }
    if (liberados.length > 0) {
      console.log("liberados com livro incompleto:");
      for (const id of liberados) console.log(`- ${id}`);
      console.log(`total liberados incompletos: ${liberados.length}`);
    }
  } else {
    console.log("descongeláveis:");
    for (const id of descongelados) console.log(`- ${id}`);
    console.log(`total descongeláveis: ${descongelados.length}`);
    if (bloqueados.length > 0) {
      console.log("bloqueados:");
      for (const id of bloqueados) console.log(`- ${id}`);
      console.log(`total bloqueados: ${bloqueados.length}`);
    }
  }

  return exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
