import { env } from "../src/config/env.js";
import { withTenantRls } from "../src/database/rls.js";
import { prisma } from "../src/database/prisma.js";
import { createDefaultChargeService } from "../src/modules/charging/charge.service.js";
import { createPrismaReleaseRepository } from "../src/modules/release/release-prisma.repository.js";

type FrozenRow = {
  id: string;
  status: string;
  has_settlement: boolean;
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
      EXISTS (SELECT 1 FROM settlements s WHERE s.tenant_id = ip.tenant_id AND s.process_id = ip.id) AS has_settlement
    FROM impound_processes ip
    WHERE ip.tenant_id = ${tenantId}::uuid
      AND ip.frozen_at IS NOT NULL
    ORDER BY ip.created_at ASC
  `);
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

  const charge = await createDefaultChargeService();
  const release = await createPrismaReleaseRepository();
  const rows = await listFrozen(tenantId);

  const curaveis: string[] = [];
  const naoLancaveis: string[] = [];
  const liquidacao: string[] = [];
  const liquidados: string[] = [];
  const liberados: string[] = [];
  const descongelaveis: string[] = [];
  const bloqueados: string[] = [];

  let exitCode = 0;

  for (const row of rows) {
    const state = await charge.getReleaseChargeState(tenantId, row.id);
    const shortfall = state?.dailyShortfall ?? 0;
    if (shortfall <= 0 && !thawMode) continue;

    if (!thawMode) {
      if (row.status === "DIRECT_RECYCLING" && !row.has_settlement) {
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

      if (row.has_settlement) {
        liquidados.push(`${row.id} (${money(shortfall * 40)})`);
        exitCode = 1;
        continue;
      }

      if (row.status === "AUCTIONED" || row.status === "AUCTION_CLOSED" || row.status === "LOTTED") {
        liquidacao.push(row.id);
        exitCode = 1;
        continue;
      }

      if (row.status === "RELEASED") {
        liberados.push(row.id);
        exitCode = 1;
      }
      continue;
    }

    const activeRelease = await release.hasActiveRelease(tenantId, row.id);
    const thawable = ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE", "AUCTION_PREP", "LOTTED", "AUCTIONED"].includes(row.status);
    if (!thawable || row.status === "AUCTION_CLOSED" || row.status === "RELEASE_IN_PROGRESS" || (row.status === "LOTTED" && activeRelease)) {
      bloqueados.push(row.id);
      if (row.status === "RELEASE_IN_PROGRESS" || (row.status === "LOTTED" && activeRelease)) {
        exitCode = 1;
      }
      continue;
    }

    descongelaveis.push(row.id);
    if (apply) {
      await withTenantRls(prisma, tenantId, (tx) => tx.$executeRaw`
        UPDATE impound_processes
        SET frozen_at = NULL
        WHERE tenant_id = ${tenantId}::uuid AND id = ${row.id}::uuid
      `);
    }
  }

  console.log(`organização: ${tenantId}`);

  if (!thawMode) {
    console.log("curáveis:");
    for (const id of curaveis) console.log(`- ${id}`);
    if (naoLancaveis.length > 0) {
      console.log("não lançáveis:");
      for (const id of naoLancaveis) console.log(`- ${id}`);
    }
    if (liquidacao.length > 0) {
      console.log("serão fechados na liquidação:");
      for (const id of liquidacao) console.log(`- ${id}`);
    }
    if (liquidados.length > 0) {
      console.log("liquidados com livro incompleto:");
      for (const id of liquidados) console.log(`- ${id}`);
    }
    if (liberados.length > 0) {
      console.log("liberados com livro incompleto:");
      for (const id of liberados) console.log(`- ${id}`);
    }
  } else {
    console.log("descongeláveis:");
    for (const id of descongelaveis) console.log(`- ${id}`);
    if (bloqueados.length > 0) {
      console.log("bloqueados:");
      for (const id of bloqueados) console.log(`- ${id}`);
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
