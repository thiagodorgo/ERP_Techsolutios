import { createHash } from "node:crypto";

import pino from "pino";

import { env } from "../../config/env.js";
import type { CloudCostImport } from "../cloud-costs/aws-cur.types.js";
import type { CloudCostAllocationService } from "./cloud-cost-allocation.service.js";

/**
 * B-ASS-09a — o rateio automático a partir da importação (item 61 do portão).
 *
 * Plano `plano-B-ASS-09a-v2.md` + Emenda 1 (fora do repositório). As propriedades que este arquivo sustenta:
 *
 *  - **P1** toda importação `completed` MARCADA (`metadata.autoAllocation = "v1"`, gravado na conclusão pelo código
 *    deste bloco), com 1 a 24 pares de período, ganha UMA run automática por par BRUTO das suas linhas — salvo o par
 *    que já tenha run MANUAL daquela importação no mesmo dia UTC (P7).
 *  - **P2** a idempotência é da PK: o id é UUIDv5 de `cloud-cost-allocation:import:<importId>:<início>:<fim>`, com os
 *    ISO brutos do par. Reenviar a tarefa, repetir o gatilho ou rodar em paralelo cai na mesma linha.
 *  - **P5** o gatilho nunca derruba a importação (quem o chama engole e registra a falha), e a varredura de 6 em 6 h
 *    (`runImportCatchUp`) restabelece P1 e P4 pelo que FALTA (R2-02).
 *  - **P7** mês publicado não muda sozinho: nenhum caminho automático cria run para importação não marcada (a seleção
 *    da varredura filtra o marcador) nem para par que já tenha run manual da mesma importação.
 *
 * O módulo importa só TIPOS de `cloud-costs` e do serviço de rateio: quem o carrega em runtime é a fábrica Prisma de
 * `aws-cur.service.ts`, por `import()` dinâmico, sem ciclo de import.
 */

/** Teto de pares de período por importação (R11). Acima dele: nenhuma run automática e um aviso no log. */
export const MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT = 24;

/**
 * O marcador gravado na conclusão da importação pelo código deste bloco. `aws-cur.service.ts` repete o literal
 * (`CLOUD_COST_AUTO_ALLOCATION_MARKER`) para não importar este módulo estaticamente; o T11 confere que os dois são iguais.
 */
export const AUTO_ALLOCATION_MARKER = "v1";

/** Namespace fixo do UUIDv5 das runs automáticas: v5(namespace URL, "urn:erp-techsolutions:cloud-cost-allocation:import-run"). */
export const IMPORT_RUN_NAMESPACE = "2db5c7d2-bf28-51df-809b-9f186a52c4c5";

/** UUID versão 5 (RFC 4122, SHA-1) com `node:crypto` — sem dependência nova. */
export function uuidV5(namespace: string, name: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ""), "hex");
  if (namespaceBytes.length !== 16) {
    throw new Error("uuidV5 requires a 16-byte namespace UUID.");
  }
  const bytes = createHash("sha1").update(namespaceBytes).update(name, "utf8").digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** P2 — o id determinístico da run automática de um par BRUTO de período de uma importação. */
export function importRunId(importId: string, billingPeriodStart: Date, billingPeriodEnd: Date): string {
  const name = `cloud-cost-allocation:import:${importId}:${billingPeriodStart.toISOString()}:${billingPeriodEnd.toISOString()}`;
  return uuidV5(IMPORT_RUN_NAMESPACE, name);
}

export type ImportTriggerLogger = {
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
};

const moduleLogger = pino({ level: env.LOG_LEVEL });

export const defaultImportTriggerLogger: ImportTriggerLogger = {
  warn: (payload, message) => moduleLogger.warn(payload, message),
  error: (payload, message) => moduleLogger.error(payload, message),
};

/** As operações do serviço de rateio que o gatilho usa. O serviço real cumpre isto; os testes passam o real. */
export type ImportRunAllocationPort = Pick<
  CloudCostAllocationService,
  "findImportForAllocation" | "listImportBillingPeriods" | "listRunsByImport" | "importRunWindow" | "createImportRun"
>;

export type EnsureImportRunsResult = {
  /** `not_eligible`: importação inexistente, não concluída ou sem linha; `too_many_periods`: passou do teto. */
  readonly outcome: "not_eligible" | "too_many_periods" | "ensured";
  /** Runs automáticas criadas AGORA (as que já existiam não contam). */
  readonly created: number;
  /** Runs automáticas desta importação que seguem `pending` depois da passada (o que o gatilho enfileira). */
  readonly pendingCount: number;
};

const NOT_ELIGIBLE: EnsureImportRunsResult = Object.freeze({ outcome: "not_eligible", created: 0, pendingCount: 0 });
const TOO_MANY_PERIODS: EnsureImportRunsResult = Object.freeze({ outcome: "too_many_periods", created: 0, pendingCount: 0 });

/**
 * P1/P2/P7 — garante uma run automática por par BRUTO de período da importação. Idempotente: chamar de novo devolve as
 * mesmas runs (`created: 0`). Não executa nada; quem executa é o job `cloud-cost-allocation.run` com `mode: import_auto`.
 */
export async function ensureImportRuns(
  allocation: ImportRunAllocationPort,
  importId: string,
  options: { readonly logger?: ImportTriggerLogger } = {},
): Promise<EnsureImportRunsResult> {
  const logger = options.logger ?? defaultImportTriggerLogger;
  const costImport = await allocation.findImportForAllocation(importId);
  if (!costImport) return NOT_ELIGIBLE;
  if (costImport.status !== "completed" || costImport.rowCount === 0) return NOT_ELIGIBLE;

  const periods = await allocation.listImportBillingPeriods(importId);
  if (periods.length > MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT) {
    logger.warn(
      { importId, periods: periods.length, cap: MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT },
      "cloud_cost_auto_allocation_skipped_too_many_periods",
    );
    return TOO_MANY_PERIODS;
  }

  // P7 — run MANUAL desta importação (qualquer status) no mesmo dia UTC de início e de fim da janela: o operador agiu
  // antes, e o rateio automático não cria uma segunda run que trocaria o número que ele publicou.
  const manualRuns = (await allocation.listRunsByImport(importId)).filter((run) => run.metadata.trigger !== "import");
  let created = 0;
  let pendingCount = 0;
  for (const period of periods) {
    const window = allocation.importRunWindow(period.billingPeriodStart, period.billingPeriodEnd);
    const manualRunExists = manualRuns.some(
      (run) => sameUtcDay(run.periodStart, window.periodStart) && sameUtcDay(run.periodEnd, window.periodEnd),
    );
    if (manualRunExists) continue;
    const result = await allocation.createImportRun({
      importId,
      billingPeriodStart: period.billingPeriodStart,
      billingPeriodEnd: period.billingPeriodEnd,
      // CE-G2 — o rateio automático é ação do sistema, consequência da importação; a run guarda quem importou.
      createdBy: costImport.importedBy,
    });
    if (result.created) created += 1;
    if (result.run.status === "pending") pendingCount += 1;
  }

  return { outcome: "ensured", created, pendingCount };
}

function sameUtcDay(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------------------------
// F2 — o gancho da importação concluída
// -----------------------------------------------------------------------------------------------

/** O payload que o rateio automático enfileira no job que já existe (`cloud-cost-allocation.run`, sem nome novo). */
export type CloudCostAllocationAutoJobPayload = {
  readonly mode: "import_auto" | "import_catch_up";
  readonly importId?: string;
};

export type CloudCostAllocationEnqueue = (
  name: "cloud-cost-allocation.run",
  payload: CloudCostAllocationAutoJobPayload,
  options?: { readonly delayMs?: number },
) => Promise<unknown>;

/** A fila padrão (Redis), carregada só quando o gancho enfileira — quem importa este módulo não puxa a fila. */
export const enqueueOnDefaultJobQueue: CloudCostAllocationEnqueue = async (name, payload, options) => {
  const { getDefaultJobQueue } = await import("../../infra/jobs/job.queue.js");
  return getDefaultJobQueue().enqueue(name, payload, options ?? {});
};

export type CloudCostImportHookDeps = {
  readonly allocation: ImportRunAllocationPort;
  readonly enqueue: CloudCostAllocationEnqueue;
  readonly logger?: ImportTriggerLogger;
};

/**
 * P1/P5 — o gancho que `CloudCostService` chama DEPOIS de gravar `completed`. Cria as runs automáticas da importação e
 * faz UM enfileiramento (R11), qualquer que seja o número de meses. Erro aqui sobe para quem chamou, que o engole e o
 * registra (`aws-cur.service.ts`): a importação continua válida, e a varredura completa o que faltou.
 */
export function buildCloudCostImportHook(deps: CloudCostImportHookDeps): (costImport: CloudCostImport) => Promise<void> {
  return async (costImport) => {
    const { pendingCount } = await ensureImportRuns(deps.allocation, costImport.id, { logger: deps.logger });
    await enqueueImportRunsIfPending(deps, costImport.id, pendingCount);
  };
}

/** Um enfileiramento por importação, só se sobrou run automática `pending` (o gancho e a varredura usam o mesmo). */
async function enqueueImportRunsIfPending(
  deps: Pick<CloudCostImportHookDeps, "enqueue">,
  importId: string,
  pendingCount: number,
): Promise<void> {
  if (pendingCount > 0) await deps.enqueue("cloud-cost-allocation.run", { mode: "import_auto", importId });
}

// -----------------------------------------------------------------------------------------------
// F4 — a varredura de recuperação (P5, R2-02)
// -----------------------------------------------------------------------------------------------

/** Quantas importações (e quantas runs `pending`) uma passada da varredura alcança. Injetável (R2-02). */
export const IMPORT_CATCH_UP_LIMIT = 50;

export type ImportCatchUpAllocationPort = ImportRunAllocationPort &
  Pick<CloudCostAllocationService, "listImportsForAutoAllocation" | "listPendingImportRuns">;

export type ImportCatchUpDeps = {
  readonly allocation: ImportCatchUpAllocationPort;
  readonly enqueue: CloudCostAllocationEnqueue;
  readonly logger?: ImportTriggerLogger;
  readonly limit?: number;
};

export type ImportCatchUpResult = {
  /** Importações marcadas sem nenhuma run automática que esta passada alcançou. */
  readonly importsScanned: number;
  readonly runsCreated: number;
  /** Importações com run automática `pending` que esta passada enfileirou (um enfileiramento por importação). */
  readonly importsEnqueued: number;
  /** Importações cuja criação falhou nesta passada (registrada; a próxima passada tenta de novo). */
  readonly importsFailed: number;
};

/**
 * P5 · R2-02 — a varredura de 6 em 6 h. Seleciona pelo que FALTA, nunca "as N mais antigas":
 *  1. importação marcada sem nenhuma run automática → `ensureImportRuns` (o gancho falhou antes de criar);
 *  2. run automática `pending`, de qualquer importação → um enfileiramento por importação (o gancho criou e não
 *     enfileirou, ou o job se perdeu).
 * NÃO reexecuta run `failed` (pergunta 3 do §9, recomendação (a)) e NÃO toca importação sem marcador (P7). A falha de
 * uma importação é registrada e não impede as outras (a falha GERAL, como a listagem, sobe para o job, que a registra).
 */
export async function runImportCatchUp(deps: ImportCatchUpDeps): Promise<ImportCatchUpResult> {
  const logger = deps.logger ?? defaultImportTriggerLogger;
  const limit = deps.limit ?? IMPORT_CATCH_UP_LIMIT;

  const missing = await deps.allocation.listImportsForAutoAllocation(limit);
  let runsCreated = 0;
  let importsFailed = 0;
  for (const costImport of missing) {
    try {
      runsCreated += (await ensureImportRuns(deps.allocation, costImport.id, { logger })).created;
    } catch (error) {
      importsFailed += 1;
      logger.warn(
        { importId: costImport.id, code: errorCode(error) },
        "cloud_cost_auto_allocation_catch_up_import_failed",
      );
    }
  }

  const pendingByImport = new Map<string, number>();
  for (const run of await deps.allocation.listPendingImportRuns(limit)) {
    const importId = typeof run.metadata.importId === "string" ? run.metadata.importId : undefined;
    if (!importId) continue;
    pendingByImport.set(importId, (pendingByImport.get(importId) ?? 0) + 1);
  }
  for (const [importId, pendingCount] of pendingByImport) {
    await enqueueImportRunsIfPending(deps, importId, pendingCount);
  }

  return { importsScanned: missing.length, runsCreated, importsEnqueued: pendingByImport.size, importsFailed };
}

/** Só o código/nome do erro no log: a mensagem pode trazer SQL ou valor (allowlist §2.8). */
export function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const record = error as { readonly code?: unknown; readonly reason?: unknown; readonly name?: unknown };
    if (typeof record.reason === "string") return record.reason;
    if (typeof record.code === "string") return record.code;
    if (typeof record.name === "string") return record.name;
  }
  return "unknown";
}
