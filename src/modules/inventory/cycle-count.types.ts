import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { InventoryAbcClass } from "./inventory.types.js";

/**
 * R7.6 — cycle count session status. `concluida`/`cancelada` are terminal.
 * B-O6R-04a — `fechando`: há um fechamento em curso ou interrompido. Nele, `close` RETOMA; `recordEntry` é aceito
 * para entrada ainda NÃO ajustada e recusado para a já ajustada; `cancel` só é aceito sem ajuste aplicado. Saídas:
 * `fechando → concluida` (finishClose), `fechando (0 ajustes) → aberta` (abortClose) e `→ cancelada` (cancel).
 */
export const CYCLE_COUNT_STATUSES = ["aberta", "fechando", "concluida", "cancelada"] as const;
export type CycleCountStatus = (typeof CYCLE_COUNT_STATUSES)[number];

/**
 * B-O6R-04a ciclo 2 (C2-03) — A CLASSIFICAÇÃO DE STATUS É UMA SÓ, E EXAUSTIVA POR CONSTRUÇÃO.
 *
 * Antes, os dois lados da I9 eram ALLOWLIST do lado aberto (`IN ('aberta','fechando')` no SQL e um `Set` em
 * memória): um status não classificado — `suspensa` semeada por SQL, `cycle_counts.status` é TEXT sem CHECK —
 * era tratado como TERMINAL e LIBERAVA o item para uma 2ª sessão (medido: o predicado segurava 0 itens).
 * Aqui há UMA tabela; o `satisfies Record<CycleCountStatus, …>` faz um membro novo da enumeração SEM
 * classificação QUEBRAR O BUILD (`TS1360`), e os dois lados fechados nascem dela:
 *   · segurar item (I9)      = NÃO terminal  → o desconhecido SEGURA;
 *   · aceitar escrita (V7/V8) = membro `non_terminal` → o desconhecido RECUSA (`not_open`).
 * Nenhuma lista de status é escrita à mão em nenhum outro arquivo (guard D8).
 */
export const CYCLE_COUNT_STATUS_KIND = {
  aberta: "non_terminal",
  fechando: "non_terminal",
  concluida: "terminal",
  cancelada: "terminal",
} as const satisfies Record<CycleCountStatus, "terminal" | "non_terminal">;

/** Derivado da tabela acima — nunca escrito à mão. */
export const TERMINAL_CYCLE_COUNT_STATUSES = CYCLE_COUNT_STATUSES.filter(
  (status) => CYCLE_COUNT_STATUS_KIND[status] === "terminal",
);

/** Derivado da tabela acima — nunca escrito à mão. */
export const WRITABLE_CYCLE_COUNT_STATUSES = CYCLE_COUNT_STATUSES.filter(
  (status) => CYCLE_COUNT_STATUS_KIND[status] === "non_terminal",
);

/** Terminal = a sessão não segura mais os seus itens. Status desconhecido NÃO é terminal (ele segura). */
export const isTerminalCycleCountStatus = (status: string): boolean =>
  (TERMINAL_CYCLE_COUNT_STATUSES as readonly string[]).includes(status);

/** Escrevível = membro `non_terminal` da enumeração. Status desconhecido NÃO é escrevível (recusa). */
export const isWritableCycleCountStatus = (status: string): status is "aberta" | "fechando" =>
  (WRITABLE_CYCLE_COUNT_STATUSES as readonly string[]).includes(status);

export type CycleCountActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

/** A counting session (R7.6). The saldo is NEVER stored — only the snapshot. */
export type CycleCount = {
  readonly id: string;
  readonly tenantId: string;
  readonly abcClass?: InventoryAbcClass;
  readonly status: CycleCountStatus;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/**
 * A counted line. `systemQuantity` is the saldo snapshotted at OPEN;
 * `countedQuantity` is filled while counting; `variance` (counted − system) and
 * `adjustmentMovementId` (the generated ajuste) are filled at CLOSE.
 */
export type CycleCountEntry = {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly itemId: string;
  readonly systemQuantity: number;
  readonly countedQuantity?: number;
  readonly variance?: number;
  readonly adjustmentMovementId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CycleCountWithEntries = CycleCount & {
  readonly entries: readonly CycleCountEntry[];
};

export type CycleCountEntrySnapshot = {
  readonly itemId: string;
  readonly systemQuantity: number;
};

export type CreateCycleCountInput = {
  readonly tenantId: string;
  readonly abcClass?: InventoryAbcClass;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly entries: readonly CycleCountEntrySnapshot[];
};

export type ListCycleCountsInput = {
  readonly tenantId: string;
  readonly status?: CycleCountStatus;
  readonly isActive?: boolean;
  readonly limit: number;
  readonly offset: number;
};

export type ListCycleCountsResult = {
  readonly items: readonly CycleCount[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type RecordEntryCountInput = {
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly entryId: string;
  readonly countedQuantity: number;
  readonly updatedBy?: string;
};

/**
 * B-O6R-04a — o carimbo de UMA unidade do fechamento (variância + o ajuste que ela gerou ou reaproveitou), gravado
 * na MESMA transação do ajuste, sob o lock da sessão e do item.
 */
export type StampEntryInput = {
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly entryId: string;
  readonly variance: number;
  readonly adjustmentMovementId: string;
};

/** `beginClose`: sessão `FOR UPDATE`; `aberta` → CAS `fechando` ("started"); `fechando` → "resumed". */
export type BeginCloseOutcome =
  | { readonly status: "started" | "resumed"; readonly session: CycleCountWithEntries; readonly entries: readonly CycleCountEntry[] }
  | { readonly status: "not_found" }
  | { readonly status: "not_open"; readonly current: CycleCountStatus };

/** `abortClose` (S-01): `fechando` sem ajuste aplicado volta a `aberta`; com ajuste aplicado, fica `fechando`. */
export type AbortCloseOutcome =
  | { readonly status: "reverted" }
  | { readonly status: "kept"; readonly stamped: number }
  | { readonly status: "not_closing"; readonly current?: CycleCountStatus };

/** `finishClose` (S-02): o total é o da sessão INTEIRA, somado no banco sob o lock, na transação do CAS final. */
export type FinishCloseOutcome =
  | { readonly status: "ok"; readonly session: CycleCountWithEntries; readonly totalVarianceValue: number }
  | { readonly status: "not_found" }
  | { readonly status: "not_open"; readonly current: CycleCountStatus }
  | { readonly status: "pending"; readonly remaining: number };

/** `recordEntryCount` sob `FOR SHARE` da sessão (V7 — TOCTOU fechado). */
export type RecordEntryOutcome =
  | { readonly status: "ok"; readonly entry: CycleCountEntry }
  | { readonly status: "not_found" }
  | { readonly status: "entry_not_found" }
  | { readonly status: "not_open"; readonly current: CycleCountStatus }
  | { readonly status: "entry_adjusted" };

/** `cancelSession` sob `FOR UPDATE` da sessão (V8). */
export type CancelOutcome =
  | { readonly status: "ok"; readonly session: CycleCount }
  | { readonly status: "not_found" }
  | { readonly status: "not_open"; readonly current: CycleCountStatus }
  | { readonly status: "close_in_progress"; readonly stamped: number };

/** The variance report returned by close: the closed session + total variance value. */
export type CycleCountVarianceReport = {
  readonly cycleCount: CycleCountWithEntries;
  readonly totalVarianceValue: number;
};

export class CycleCountError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CycleCountError";
  }
}

export function cycleCountNotFound(): CycleCountError {
  return new CycleCountError(404, "CYCLE_COUNT_NOT_FOUND", "not_found", "Cycle count was not found.");
}

export function cycleCountEntryNotFound(): CycleCountError {
  return new CycleCountError(404, "CYCLE_COUNT_ENTRY_NOT_FOUND", "not_found", "Cycle count entry was not found.");
}

/** R7.6 — a concluida/cancelada session is terminal: any further mutation is a 422. */
export function cycleCountNotOpen(status: CycleCountStatus): CycleCountError {
  return new CycleCountError(
    422,
    "CYCLE_COUNT_INVALID",
    "invalid_status_transition",
    `A contagem cíclica está "${status}" e não aceita mais alterações.`,
  );
}

/** B-O6R-04a — o banco não atendeu a tempo (contenção/impasse): nada foi gravado; repetir resolve. */
export function cycleCountBusyError(): CycleCountError {
  return new CycleCountError(
    503,
    "CYCLE_COUNT_UNAVAILABLE",
    "cycle_count_busy",
    "A contagem cíclica está ocupada com outra operação. Nada foi gravado; tente novamente em instantes.",
  );
}

/** B-O6R-04a — defesa: a sessão ainda tem entrada divergente sem ajuste ao concluir (não deve ocorrer). */
export function closeIncompleteError(remaining: number): CycleCountError {
  return new CycleCountError(
    409,
    "CYCLE_COUNT_CONFLICT",
    "close_incomplete",
    `O fechamento não pôde ser concluído: ${remaining} entrada(s) ainda sem ajuste. Tente fechar novamente.`,
  );
}

/** B-O6R-04a (S-01) — recontagem de uma entrada cujo ajuste já foi aplicado por um fechamento. */
export function entryAlreadyAdjustedError(): CycleCountError {
  return new CycleCountError(
    422,
    "CYCLE_COUNT_INVALID",
    "entry_already_adjusted",
    "Esta entrada já teve o ajuste aplicado e não aceita nova contagem.",
  );
}

/** B-O6R-04a (S-01) — cancelar uma contagem que já tem ajuste aplicado: a saída é recontar e concluir. */
export function closeInProgressError(stamped: number): CycleCountError {
  return new CycleCountError(
    422,
    "CYCLE_COUNT_INVALID",
    "close_in_progress",
    `Há ${stamped} ajuste(s) aplicado(s); reconte as entradas pendentes e conclua o fechamento.`,
  );
}

/** B-O6R-04a (N-OVL, I9) — um item está em no máximo UMA contagem não terminal da organização. */
export function itemsInOpenSessionError(count: number): CycleCountError {
  return new CycleCountError(
    409,
    "CYCLE_COUNT_CONFLICT",
    "items_in_open_session",
    `${count} item(ns) já estão em uma contagem aberta. Conclua ou cancele essa contagem antes de abrir outra.`,
  );
}
