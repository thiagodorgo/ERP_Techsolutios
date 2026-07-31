// Ω-VID PR-03 — backfill de identidade de veículo de terceiro (catch-up, reexecutável).
//
// Para cada tenant ATIVO (sequencial — NUNCA 2 tenants em paralelo, achado #6 da junta de arquitetura,
// docs/juntas/J-OMEGA-VID.md §3), agrupa os `ImpoundProcess` HISTÓRICOS sem `identity_id` e cria/associa
// `ThirdPartyVehicleIdentity` retroativamente (schema do PR-02, migração 20260854000000_add_vehicle_identity).
//
//   npx tsx scripts/backfill-third-party-vehicle-identity.ts
//
// REGRAS EXATAS do plano (docs/juntas/J-OMEGA-VID.md §4 + prompt do PR-03 — não desviar):
//   1) Agrupamento AUTOMÁTICO só por `plate_key` (normalizePlateKey, reexportado de portal-shared) EXATO.
//      Chassi/Renavam sozinhos NUNCA agrupam automaticamente (risco de erro de digitação) — viram, no máximo,
//      entrada na lista de AMBÍGUOS do relatório (§7 abaixo), nunca uma fusão silenciosa.
//   2) `vehicle_unidentified=true` -> SEMPRE identidade INDIVIDUAL. Nunca agrupado com outro "não identificado",
//      mesmo que pareçam o mesmo veículo — o máximo que o script faz é OFERECER uma sugestão de correspondência
//      no relatório (matchSuggestions), nunca mesclar.
//   3) confidence = CONFIRMED se o processo (ou algum processo do grupo) já tem IntakeInspection.completed_at
//      preenchido; senão PROVISIONAL. MERGED nunca é gravado por este script (fora de escopo — PR-04).
//   4) Sugestão de correspondência (o OFERECER-a-sugestão em si é decisão do dono, J-OMEGA-VID.md §4 —
//      "datas próximas" sem número explícito): dois processos "não identificados" no MESMO pátio (yard_id) +
//      datas de entrada a <= 72h (72h é ESCOLHA DE IMPLEMENTAÇÃO, não confirmada literalmente pelo dono —
//      ajustável se a revisão humana achar curta/longa demais) + marca/modelo/cor batendo (quando ambos
//      preenchidos) viram uma SUGESTÃO no relatório — nunca decide/mescla sozinho.
//   5) IDEMPOTENTE: só processa `ImpoundProcess` com `identity_id IS NULL`; reexecutar não duplica nada.
//   6) Performance/concorrência (achados críticos da junta de arquitetura):
//        - SEQUENCIAL por tenant (nunca paralelo).
//        - Dentro do tenant: 1 UPDATE por LOTE (`impoundProcess.updateMany` com `WHERE identity_id IS NULL`),
//          NUNCA um loop de UPDATE por linha.
//        - Leitura por KEYSET PAGINATION (`ORDER BY id` + cursor `id > $cursor`), NUNCA `OFFSET` (degrada em
//          tenants grandes).
//        - Lotes de 500.
//   7) Relatório de revisão humana (JSON, ver `writeReport`): identidades criadas por tenant, lista de
//      processos "ambíguos" (heurística que NÃO bateu o critério automático — ex. chassi/renavam batendo entre
//      identidades de placas diferentes, ou marca/modelo/cor batendo com placas diferentes) e a lista de
//      sugestões de correspondência do item 4. O script NUNCA decide/mescla nada sozinho a partir dessas duas
//      listas — são só colunas a mais para revisão humana.
//
// NOTA DE CONCORRÊNCIA (achado #1 da junta de arquitetura — leia antes de rodar em produção):
//   Este script é uma rodada de CATCH-UP, não um processo contínuo. Cada tenant é processado dentro de UMA
//   transação (leitura + escrita), então um `ImpoundProcess` criado por outro fluxo (ex.: o sweep de
//   reconciliação, `impound.reconcile.service.ts`) DEPOIS que a leitura deste tenant já começou fica órfão
//   (sem identity_id) até a PRÓXIMA execução deste script — não é um bug, é o desenho esperado de um job
//   catch-up reexecutável (idempotente, item 5). A solução DEFINITIVA da corrida (resolver a identidade NA
//   CRIAÇÃO do processo, eliminando a janela órfã) é o PR-05 (docs/juntas/J-OMEGA-VID.md §5) — este PR-03
//   cobre só o histórico pré-existente. Rode este script periodicamente (ou uma vez, seguido do PR-05) até lá.
//
// §2.8: o relatório nunca inclui token/path/bucket/storage key/base64/binário; só campos de negócio já
// presentes no domínio (placa, chassi, marca/modelo/cor, ids). tenant_id sempre do próprio registro (nunca
// resolvido por header/params externos).

import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

import { setTenantRlsContext } from "../src/database/rls.js";
import { normalizePlateKey, normalizeRenavamKey } from "../src/modules/portal-shared/index.js";

// ---------------- constantes ----------------

const BATCH_SIZE = 500;
const UNIDENTIFIED_MATCH_WINDOW_HOURS = 72; // escolha de implementação (não confirmada literalmente pelo dono — ver regra #4 acima), ajustável
const TENANT_TRANSACTION_TIMEOUT_MS = 10 * 60 * 1000; // catch-up de tenant pode ter histórico grande; generoso
const TENANT_TRANSACTION_MAX_WAIT_MS = 15_000;
const REPORT_DIR = path.resolve(process.cwd(), "docs/rodadas/omega-vid");

type TxClient = Prisma.TransactionClient;

// ---------------- tipos ----------------

export type ProcessRecord = {
  readonly id: string;
  readonly vehicle_plate: string | null;
  readonly vehicle_chassis: string | null;
  readonly vehicle_renavam: string | null;
  readonly vehicle_brand: string | null;
  readonly vehicle_model: string | null;
  readonly vehicle_color: string | null;
  readonly vehicle_year: number | null;
  readonly vehicle_unidentified: boolean;
  readonly unidentified_reason: string | null;
  readonly yard_id: string | null;
  readonly entered_at: Date | null;
  readonly created_at: Date;
  readonly intake_inspection: { readonly completed_at: Date | null } | null;
};

const PROCESS_SELECT = {
  id: true,
  vehicle_plate: true,
  vehicle_chassis: true,
  vehicle_renavam: true,
  vehicle_brand: true,
  vehicle_model: true,
  vehicle_color: true,
  vehicle_year: true,
  vehicle_unidentified: true,
  unidentified_reason: true,
  yard_id: true,
  entered_at: true,
  created_at: true,
  intake_inspection: { select: { completed_at: true } },
} satisfies Prisma.ImpoundProcessSelect;

export type TenantSummary = {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly processesScanned: number;
  readonly processesAlreadyLinkedBefore: number;
  readonly identitiesCreated: number;
  readonly identitiesReused: number;
  readonly processesLinked: number;
  readonly individualUnidentifiedCount: number;
};

export type AmbiguousEntry = {
  readonly tenantId: string;
  readonly unitA: string;
  readonly unitB: string;
  readonly processIdsA: readonly string[];
  readonly processIdsB: readonly string[];
  readonly reasons: readonly string[];
};

export type MatchSuggestion = {
  readonly tenantId: string;
  readonly processIdA: string;
  readonly processIdB: string;
  readonly yardId: string;
  readonly hoursApart: number;
  readonly matchedFields: readonly string[];
  readonly brand: string | null;
  readonly model: string | null;
  readonly color: string | null;
};

export type TenantBackfillResult = {
  readonly summary: TenantSummary;
  readonly ambiguous: readonly AmbiguousEntry[];
  readonly matchSuggestions: readonly MatchSuggestion[];
};

export type BackfillReport = {
  readonly generatedAt: string;
  readonly unidentifiedMatchWindowHours: number;
  readonly tenants: readonly TenantSummary[];
  readonly ambiguous: readonly AmbiguousEntry[];
  readonly matchSuggestions: readonly MatchSuggestion[];
  readonly totals: {
    identitiesCreated: number;
    identitiesReused: number;
    processesLinked: number;
  };
};

// ---------------- helpers PUROS (testáveis sem banco) ----------------

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Primeiro valor não-nulo/não-vazio de `field` entre os registros do grupo (ordem de chegada). */
export function pickFirstNonNull<T, K extends keyof T>(records: readonly T[], field: K): Extract<T[K], string | number> | null {
  for (const record of records) {
    const value = record[field];
    if (value !== null && value !== undefined && value !== "") {
      return value as Extract<T[K], string | number>;
    }
  }
  return null;
}

/** CONFIRMED se QUALQUER processo do grupo já tem vistoria de recepção completa; senão PROVISIONAL (regra #3). */
export function computeGroupConfidence(group: readonly Pick<ProcessRecord, "intake_inspection">[]): "PROVISIONAL" | "CONFIRMED" {
  return group.some((record) => record.intake_inspection?.completed_at != null) ? "CONFIRMED" : "PROVISIONAL";
}

function normalizeForCompare(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRenavamOrNull(value: string | null): string | null {
  return value ? normalizeRenavamKey(value) : null;
}

type IdentityUnit = {
  readonly key: string;
  readonly chassis: string | null;
  readonly renavamKey: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly color: string | null;
  readonly processIds: readonly string[];
};

/**
 * Heurística de AMBÍGUOS (regra #7) — NUNCA decide/mescla, só reporta. Compara todo par de identidades
 * distintas (grupos de placa + individuais sem placa) do MESMO tenant que NÃO bateram o critério automático
 * (plate_key exato) mas têm algum indício: chassi igual, renavam igual, ou marca+modelo+cor batendo com
 * placas diferentes.
 */
export function buildAmbiguousMatches(
  tenantId: string,
  plateGroups: ReadonlyMap<string, readonly ProcessRecord[]>,
  noPlateIndividuals: readonly ProcessRecord[],
): AmbiguousEntry[] {
  const units: IdentityUnit[] = [];
  for (const [plateKey, group] of plateGroups) {
    units.push({
      key: `plate:${plateKey}`,
      chassis: normalizeForCompare(pickFirstNonNull(group, "vehicle_chassis")),
      renavamKey: normalizeRenavamOrNull(pickFirstNonNull(group, "vehicle_renavam")),
      brand: normalizeForCompare(pickFirstNonNull(group, "vehicle_brand")),
      model: normalizeForCompare(pickFirstNonNull(group, "vehicle_model")),
      color: normalizeForCompare(pickFirstNonNull(group, "vehicle_color")),
      processIds: group.map((record) => record.id),
    });
  }
  for (const record of noPlateIndividuals) {
    units.push({
      key: `individual:${record.id}`,
      chassis: normalizeForCompare(record.vehicle_chassis),
      renavamKey: normalizeRenavamOrNull(record.vehicle_renavam),
      brand: normalizeForCompare(record.vehicle_brand),
      model: normalizeForCompare(record.vehicle_model),
      color: normalizeForCompare(record.vehicle_color),
      processIds: [record.id],
    });
  }

  const ambiguous: AmbiguousEntry[] = [];
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i]!;
      const b = units[j]!;
      const reasons: string[] = [];
      if (a.chassis && b.chassis && a.chassis === b.chassis) {
        reasons.push("chassi igual entre identidades distintas");
      }
      if (a.renavamKey && b.renavamKey && a.renavamKey === b.renavamKey) {
        reasons.push("renavam igual entre identidades distintas");
      }
      if (a.brand && b.brand && a.model && b.model && a.color && b.color && a.brand === b.brand && a.model === b.model && a.color === b.color) {
        reasons.push("marca/modelo/cor batendo com placas diferentes");
      }
      if (reasons.length === 0) continue;
      ambiguous.push({
        tenantId,
        unitA: a.key,
        unitB: b.key,
        processIdsA: a.processIds,
        processIdsB: b.processIds,
        reasons,
      });
    }
  }
  return ambiguous;
}

/**
 * Sugestão de correspondência (regra #4) — só entre processos `vehicle_unidentified=true` do MESMO tenant.
 * Critério: mesmo `yard_id` + datas de entrada a <= `windowHours` + pelo menos 1 campo marca/modelo/cor
 * comparável (ambos preenchidos) e todos os campos comparáveis batendo. NUNCA mescla — só entra no relatório.
 */
export function findUnidentifiedMatchSuggestions(
  tenantId: string,
  unidentifiedRecords: readonly ProcessRecord[],
  windowHours: number,
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const fields = ["vehicle_brand", "vehicle_model", "vehicle_color"] as const;

  for (let i = 0; i < unidentifiedRecords.length; i++) {
    for (let j = i + 1; j < unidentifiedRecords.length; j++) {
      const a = unidentifiedRecords[i]!;
      const b = unidentifiedRecords[j]!;
      if (!a.yard_id || !b.yard_id || a.yard_id !== b.yard_id) continue;

      const dateA = a.entered_at ?? a.created_at;
      const dateB = b.entered_at ?? b.created_at;
      const hoursApart = Math.abs(dateA.getTime() - dateB.getTime()) / 3_600_000;
      if (hoursApart > windowHours) continue;

      const comparableFields = fields.filter((field) => normalizeForCompare(a[field]) && normalizeForCompare(b[field]));
      if (comparableFields.length === 0) continue; // sem nenhum sinal de marca/modelo/cor -> evidência fraca demais
      const allMatch = comparableFields.every((field) => normalizeForCompare(a[field]) === normalizeForCompare(b[field]));
      if (!allMatch) continue;

      suggestions.push({
        tenantId,
        processIdA: a.id,
        processIdB: b.id,
        yardId: a.yard_id,
        hoursApart: Math.round(hoursApart * 10) / 10,
        matchedFields: comparableFields.map((field) => field.replace("vehicle_", "")),
        brand: a.vehicle_brand,
        model: a.vehicle_model,
        color: a.vehicle_color,
      });
    }
  }
  return suggestions;
}

// ---------------- execução (impura, usa Prisma) ----------------

async function fetchUnlinkedProcesses(tx: TxClient, tenantId: string): Promise<ProcessRecord[]> {
  const out: ProcessRecord[] = [];
  let cursor: string | undefined;
  for (;;) {
    const batch = await tx.impoundProcess.findMany({
      where: { tenant_id: tenantId, identity_id: null, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" }, // keyset pagination — NUNCA offset (regra #6)
      take: BATCH_SIZE,
      select: PROCESS_SELECT,
    });
    if (batch.length === 0) break;
    out.push(...batch);
    cursor = batch[batch.length - 1]!.id;
    if (batch.length < BATCH_SIZE) break;
  }
  return out;
}

async function linkProcesses(tx: TxClient, tenantId: string, processIds: readonly string[], identityId: string): Promise<number> {
  let linked = 0;
  for (const batch of chunk(processIds, BATCH_SIZE)) {
    // 1 UPDATE por lote (regra #6) — nunca um loop de UPDATE individual. WHERE identity_id IS NULL preserva a
    // idempotência mesmo sob corrida (uma 2ª execução concorrente não re-vincula/duplica).
    const result = await tx.impoundProcess.updateMany({
      where: { tenant_id: tenantId, identity_id: null, id: { in: batch } },
      data: { identity_id: identityId },
    });
    linked += result.count;
  }
  return linked;
}

async function resolveOrCreatePlateIdentity(
  tx: TxClient,
  tenantId: string,
  plateKey: string,
  group: readonly ProcessRecord[],
): Promise<{ readonly id: string; readonly reused: boolean }> {
  // Reaproveita uma identidade ATIVA (não-MERGED) já existente para a mesma placa — importante para reexecuções
  // (catch-up): processos novos da mesma placa se juntam à identidade já criada numa rodada anterior, em vez de
  // fundar uma segunda. A mais antiga é a canônica por convenção (determinístico).
  const existing = await tx.thirdPartyVehicleIdentity.findFirst({
    where: { tenant_id: tenantId, plate_key: plateKey, confidence: { not: "MERGED" } },
    orderBy: { created_at: "asc" },
  });
  if (existing) return { id: existing.id, reused: true };

  const created = await tx.thirdPartyVehicleIdentity.create({
    data: {
      tenant_id: tenantId,
      plate_raw: pickFirstNonNull(group, "vehicle_plate"),
      plate_key: plateKey,
      chassis: pickFirstNonNull(group, "vehicle_chassis"),
      renavam_key: normalizeRenavamOrNull(pickFirstNonNull(group, "vehicle_renavam")),
      brand: pickFirstNonNull(group, "vehicle_brand"),
      model: pickFirstNonNull(group, "vehicle_model"),
      color: pickFirstNonNull(group, "vehicle_color"),
      year: pickFirstNonNull(group, "vehicle_year"),
      unidentified: false,
      confidence: computeGroupConfidence(group),
    },
  });
  return { id: created.id, reused: false };
}

async function createNoPlateIdentifiedIdentity(tx: TxClient, tenantId: string, record: ProcessRecord): Promise<string> {
  // unidentified=false com plate_key ausente (só chassi/renavam) — regra #1: chassi/renavam sozinhos NÃO
  // agrupam automaticamente, então cada um vira sua própria identidade (heurística de ambíguos cobre o resto).
  const created = await tx.thirdPartyVehicleIdentity.create({
    data: {
      tenant_id: tenantId,
      chassis: record.vehicle_chassis,
      renavam_key: normalizeRenavamOrNull(record.vehicle_renavam),
      brand: record.vehicle_brand,
      model: record.vehicle_model,
      color: record.vehicle_color,
      year: record.vehicle_year,
      unidentified: false,
      confidence: record.intake_inspection?.completed_at != null ? "CONFIRMED" : "PROVISIONAL",
    },
  });
  return created.id;
}

async function createUnidentifiedIndividualIdentity(tx: TxClient, tenantId: string, record: ProcessRecord): Promise<string> {
  // Regra #2: SEMPRE individual. Deliberadamente NÃO copia plate_key/chassis/renavam_key do processo mesmo se
  // presentes na origem — o achado do PR-02 (assertIdentityCoherence, unidentified_conflicts_with_identifier)
  // fechou exatamente essa ambiguidade (unidentified=true + identificador preenchido); o backfill não a
  // reabre por outra porta.
  const created = await tx.thirdPartyVehicleIdentity.create({
    data: {
      tenant_id: tenantId,
      brand: record.vehicle_brand,
      model: record.vehicle_model,
      color: record.vehicle_color,
      year: record.vehicle_year,
      unidentified: true,
      unidentified_reason:
        record.unidentified_reason && record.unidentified_reason.trim().length > 0
          ? record.unidentified_reason
          : "Backfill Ω-VID PR-03: processo histórico de custódia sem identificação confirmada.",
      confidence: record.intake_inspection?.completed_at != null ? "CONFIRMED" : "PROVISIONAL",
    },
  });
  return created.id;
}

export async function backfillTenant(tx: TxClient, tenant: { readonly id: string; readonly slug: string }): Promise<TenantBackfillResult> {
  const processesAlreadyLinkedBefore = await tx.impoundProcess.count({
    where: { tenant_id: tenant.id, identity_id: { not: null } },
  });

  const records = await fetchUnlinkedProcesses(tx, tenant.id);
  const unidentified = records.filter((record) => record.vehicle_unidentified);
  const identified = records.filter((record) => !record.vehicle_unidentified);

  const plateGroups = new Map<string, ProcessRecord[]>();
  const noPlateIndividuals: ProcessRecord[] = [];
  for (const record of identified) {
    const plateKey = record.vehicle_plate ? normalizePlateKey(record.vehicle_plate) : null;
    if (!plateKey) {
      noPlateIndividuals.push(record);
      continue;
    }
    const group = plateGroups.get(plateKey) ?? [];
    group.push(record);
    plateGroups.set(plateKey, group);
  }

  let identitiesCreated = 0;
  let identitiesReused = 0;
  let processesLinked = 0;

  for (const [plateKey, group] of plateGroups) {
    const { id, reused } = await resolveOrCreatePlateIdentity(tx, tenant.id, plateKey, group);
    if (reused) identitiesReused++;
    else identitiesCreated++;
    processesLinked += await linkProcesses(
      tx,
      tenant.id,
      group.map((record) => record.id),
      id,
    );
  }

  for (const record of noPlateIndividuals) {
    const id = await createNoPlateIdentifiedIdentity(tx, tenant.id, record);
    identitiesCreated++;
    processesLinked += await linkProcesses(tx, tenant.id, [record.id], id);
  }

  for (const record of unidentified) {
    const id = await createUnidentifiedIndividualIdentity(tx, tenant.id, record);
    identitiesCreated++;
    processesLinked += await linkProcesses(tx, tenant.id, [record.id], id);
  }

  return {
    summary: {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      processesScanned: records.length,
      processesAlreadyLinkedBefore,
      identitiesCreated,
      identitiesReused,
      processesLinked,
      individualUnidentifiedCount: unidentified.length,
    },
    ambiguous: buildAmbiguousMatches(tenant.id, plateGroups, noPlateIndividuals),
    matchSuggestions: findUnidentifiedMatchSuggestions(tenant.id, unidentified, UNIDENTIFIED_MATCH_WINDOW_HOURS),
  };
}

async function runTenantBackfill(
  prisma: PrismaClient,
  tenant: { readonly id: string; readonly slug: string },
): Promise<TenantBackfillResult> {
  return prisma.$transaction(
    async (tx) => {
      await setTenantRlsContext(tx, tenant.id);
      return backfillTenant(tx, tenant);
    },
    { timeout: TENANT_TRANSACTION_TIMEOUT_MS, maxWait: TENANT_TRANSACTION_MAX_WAIT_MS },
  );
}

async function writeReport(report: BackfillReport): Promise<string> {
  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = new Date(report.generatedAt).toISOString().replace(/[:.]/g, "-");
  const file = path.join(REPORT_DIR, `backfill-report-${stamp}.json`);
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return file;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[backfill-vehicle-identity] env obrigatória ausente: DATABASE_URL");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "active" },
      select: { id: true, slug: true },
      orderBy: { created_at: "asc" },
    });
    console.log(`[backfill-vehicle-identity] ${tenants.length} tenant(s) ativo(s) — processando SEQUENCIALMENTE (regra #6).`);

    const report: BackfillReport = {
      generatedAt: new Date().toISOString(),
      unidentifiedMatchWindowHours: UNIDENTIFIED_MATCH_WINDOW_HOURS,
      tenants: [],
      ambiguous: [],
      matchSuggestions: [],
      totals: { identitiesCreated: 0, identitiesReused: 0, processesLinked: 0 },
    };

    // Sequencial — nunca Promise.all (regra #6 / achado da junta de arquitetura).
    for (const tenant of tenants) {
      const result = await runTenantBackfill(prisma, tenant);
      (report.tenants as TenantSummary[]).push(result.summary);
      (report.ambiguous as AmbiguousEntry[]).push(...result.ambiguous);
      (report.matchSuggestions as MatchSuggestion[]).push(...result.matchSuggestions);
      report.totals.identitiesCreated += result.summary.identitiesCreated;
      report.totals.identitiesReused += result.summary.identitiesReused;
      report.totals.processesLinked += result.summary.processesLinked;
      console.log(
        `[backfill-vehicle-identity] tenant ${tenant.slug}: ${result.summary.identitiesCreated} criada(s), ` +
          `${result.summary.identitiesReused} reaproveitada(s), ${result.summary.processesLinked} processo(s) vinculado(s), ` +
          `${result.ambiguous.length} ambíguo(s), ${result.matchSuggestions.length} sugestão(ões).`,
      );
    }

    const reportPath = await writeReport(report);
    console.log(`[backfill-vehicle-identity] relatório de revisão humana: ${reportPath}`);
    console.log(
      `[backfill-vehicle-identity] VERDE — totais: ${report.totals.identitiesCreated} identidade(s) criada(s), ` +
        `${report.totals.identitiesReused} reaproveitada(s), ${report.totals.processesLinked} processo(s) vinculado(s), ` +
        `${report.ambiguous.length} ambíguo(s) no relatório, ${report.matchSuggestions.length} sugestão(ões) de correspondência.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Só executa main() quando rodado como script (não em import de teste) — mesmo padrão de scripts/backup-database.mjs.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("backfill-third-party-vehicle-identity.ts")) {
  try {
    await main();
  } catch (error) {
    console.error(`[backfill-vehicle-identity] FAIL: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    process.exit(1);
  }
}
