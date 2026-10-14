import { createHash } from "node:crypto";

import {
  ExpenseManagementError,
  type CreateExpenseItemInput,
  type CreateExpenseReportInput,
  type ExpenseActorContext,
  type MobileActionReceipt,
} from "./expense-management.types.js";
import {
  assertNonEmptyString,
  optionalString,
  parseNonNegativeNumber,
  parseOptionalUuid,
  parseRequiredDate,
  parseRequiredUuid,
  sanitizeJsonRecord,
} from "./expense-management.validators.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-03a (Ω6R-DIN-009) — sincronização de despesa ATÔMICA e sem lançamento em dobro.
//
// Plano v2 (`docs/revisoes/SAN3/B-O6R-03a-plano.md`) + emenda v3 (`B-O6R-03a-EMENDA-v3.md`) + decisão do
// dono `D-03a-MESMA-CHAVE-OUTRO-ATOR = A` (2026-10-11): a mesma ação de sincronização (o mesmo
// `client_action_id` gerado no celular) é UMA ação só, dentro da organização, e pertence a quem a enviou
// primeiro. Outro usuário que reenviar a mesma ação recebe CONFLITO e nada é lançado.
//
// Este arquivo é PURO (sem banco): a chave interna do recibo, o fingerprint do comando, os erros de domínio do
// sync e o classificador de falhas transitórias. Repositório e serviço o consomem.
// -----------------------------------------------------------------------------------------------

export const EXPENSE_SYNC_ACTION_TYPES = ["expense_report.create", "expense_item.create", "expense_report.submit"] as const;
export type ExpenseSyncActionType = (typeof EXPENSE_SYNC_ACTION_TYPES)[number];

/** Evento de prova do sync. O nome não muda (v2 §2.2): a versão do protocolo vive DENTRO do hash. */
export const EXPENSE_SYNC_EVENT_TYPE = "expense_report.synced_from_mobile";

/** Teto do id externo legado: o validador antigo faz `trim` e `slice(0, 160)` (v2 E08). */
export const LEGACY_CLIENT_ACTION_ID_MAX_LENGTH = 160;

/**
 * Prefixo ASCII de 161 caracteres (v2 §2.1 item 2). Nenhum id legado tem mais de 160 unidades, logo nenhum id
 * legado válido COMEÇA com este prefixo inteiro: os dois espaços de chave são DISJUNTOS por construção, inclusive
 * para `local:42`, `<uuid>:x`, ids de 160 unidades e ids que começam com o texto do próprio prefixo.
 */
export const EXPENSE_SYNC_RECEIPT_KEY_PREFIX = "expense-sync-v2/".padEnd(LEGACY_CLIENT_ACTION_ID_MAX_LENGTH + 1, "~");

/**
 * K2t (v3): a chave interna do recibo é `P + JSON([client_action_id])` — por ORGANIZAÇÃO e id, SEM o ator. O ator
 * vira DONO, conferido em `actor_user_id`. A PK atual `(tenant_id, client_action_id)` serializa u1 contra u2.
 * NUNCA passa por `assertNonEmptyString` (trim/slice de 160): é valor interno, não entrada do cliente.
 */
export function buildSyncReceiptKey(clientActionId: string): string {
  return EXPENSE_SYNC_RECEIPT_KEY_PREFIX + JSON.stringify([clientActionId]);
}

/** Decoder estrito: prefixo exato, JSON de um único id, reconstrução byte a byte. Qualquer outra forma = undefined. */
export function decodeSyncReceiptKey(receiptKey: string): string | undefined {
  if (!receiptKey.startsWith(EXPENSE_SYNC_RECEIPT_KEY_PREFIX)) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(receiptKey.slice(EXPENSE_SYNC_RECEIPT_KEY_PREFIX.length));
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || typeof parsed[0] !== "string") return undefined;

  return buildSyncReceiptKey(parsed[0]) === receiptKey ? parsed[0] : undefined;
}

// ---------- leitura compatível (v2 §2.1 item 3) ----------

export type SyncReceiptLookup = {
  /** recibo gravado pela versão ANTIGA, na chave crua do id externo */
  readonly legacy?: MobileActionReceipt;
  /** recibo gravado por esta versão, na chave K2t */
  readonly current?: MobileActionReceipt;
};

/**
 * Lookup compatível, SEMPRE ligado (v2 §2.1): busca exata da chave crua E da K2t, no mesmo tenant. A origem é
 * discriminada pela BUSCA realizada — nunca pela aparência do id (`includes(":")` não decide nada).
 */
export async function findCompatibleSyncReceipts(
  findExact: (input: { readonly tenantId: string; readonly clientActionId: string }) => Promise<MobileActionReceipt | undefined>,
  input: { readonly tenantId: string; readonly clientActionId: string },
): Promise<SyncReceiptLookup> {
  const legacy = await findExact({ tenantId: input.tenantId, clientActionId: input.clientActionId });
  const current = await findExact({ tenantId: input.tenantId, clientActionId: buildSyncReceiptKey(input.clientActionId) });

  return { legacy, current };
}

// ---------- marca do claim (v2 §4.3) ----------

declare const syncClaimBrand: unique symbol;

/**
 * Prova de que o INSERT do claim deu certo NESTA transação. Só os repositórios a emitem, logo depois do INSERT.
 * Limita chamadas acidentais; NÃO prova atomicidade em runtime (v2 §0.2) — quem prova é a falha injetada.
 */
export type SyncClaim = {
  readonly tenantId: string;
  readonly receiptKey: string;
  readonly actorUserId: string;
  readonly actionType: string;
  readonly [syncClaimBrand]: true;
};

export type ClaimMobileActionReceiptInput = {
  readonly tenantId: string;
  readonly receiptKey: string;
  readonly actorUserId: string;
  readonly actionType: ExpenseSyncActionType;
};

export function issueSyncClaim(input: ClaimMobileActionReceiptInput): SyncClaim {
  return { ...input } as SyncClaim;
}

/** O INSERT do claim colidiu na PK: outra transação gravou a mesma ação. Relançado SEM SQL adicional no tx. */
export class SyncActionAlreadyClaimedError extends Error {
  constructor(readonly receiptKey: string) {
    super("Sync action was already claimed by a concurrent transaction.");
    this.name = "SyncActionAlreadyClaimedError";
  }
}

// ---------- comando normalizado e fingerprint v2 (v2 §2.2, §4.4) ----------

export type ExpenseSyncCommand =
  | { readonly type: "expense_report.create"; readonly input: CreateExpenseReportInput }
  | { readonly type: "expense_item.create"; readonly reportId: string; readonly input: CreateExpenseItemInput }
  | { readonly type: "expense_report.submit"; readonly reportId: string };

// ---------- parse PURO, o mesmo para REST e sync (v2 §4.4: "extrair rotinas puras com o mesmo parse") ----------

type RawRecord = Record<string, unknown>;

/** Create: empregado resolvido pela permissão do ator (só quem lê todos escolhe outro empregado). */
export function parseCreateReportCommand(actor: ExpenseActorContext, body: RawRecord): CreateExpenseReportInput {
  const periodStart = parseRequiredDate(body.periodStart ?? body.period_start, "periodStart");
  const periodEnd = parseRequiredDate(body.periodEnd ?? body.period_end, "periodEnd");
  if (periodEnd < periodStart) {
    throw new ExpenseManagementError(400, "EXPENSE_INVALID", "invalid_period", "periodEnd must be after periodStart.");
  }

  return {
    tenantId: actor.tenantId,
    employeeUserId: resolveEmployeeUserId(actor, body),
    periodStart,
    periodEnd,
    origin: assertNonEmptyString(body.origin, "origin", 80),
    workOrderId: parseOptionalUuid(body.workOrderId ?? body.work_order_id, "workOrderId"),
    projectId: optionalString(body.projectId ?? body.project_id, 120),
    costCenter: optionalString(body.costCenter ?? body.cost_center, 120),
    city: optionalString(body.city, 120),
    advanceAmount: parseNonNegativeNumber(body.advanceAmount ?? body.advance_amount, "advanceAmount", 0),
    currency: optionalString(body.currency, 8) ?? "BRL",
    policyVersion: optionalString(body.policyVersion ?? body.policy_version, 80),
    createdBy: actor.userId,
  };
}

export function parseCreateItemCommand(tenantId: string, reportId: string, body: RawRecord): CreateExpenseItemInput {
  return {
    tenantId,
    reportId,
    categoryKey: assertNonEmptyString(body.categoryKey ?? body.category_key, "categoryKey", 80),
    spentAt: parseRequiredDate(body.spentAt ?? body.spent_at, "spentAt"),
    city: optionalString(body.city, 120),
    vendorName: optionalString(body.vendorName ?? body.vendor_name, 160),
    amount: parseNonNegativeNumber(body.amount, "amount"),
    currency: optionalString(body.currency, 8) ?? "BRL",
    km: body.km === undefined ? undefined : parseNonNegativeNumber(body.km, "km"),
    notes: optionalString(body.notes, 500),
    policyFlags: sanitizeJsonRecord(body.policyFlags ?? body.policy_flags ?? {}),
  };
}

function resolveEmployeeUserId(actor: ExpenseActorContext, body: RawRecord): string {
  const requestedEmployeeUserId = optionalString(body.employeeUserId ?? body.employee_user_id, 80);
  if (!requestedEmployeeUserId) return actor.userId;

  return actor.permissions.includes("expense_report:read") ? requestedEmployeeUserId : actor.userId;
}

/** Tipo do lote → comando normalizado. Tipo fora da lista (inclusive `receipt.attach`) → 400 antes de qualquer tx. */
export function parseSyncCommand(actor: ExpenseActorContext, type: string, payload: RawRecord): ExpenseSyncCommand {
  if (type === "expense_report.create") {
    return { type, input: parseCreateReportCommand(actor, payload) };
  }
  if (type === "expense_item.create") {
    const reportId = parseRequiredUuid(payload.reportId ?? payload.report_id, "reportId");
    return { type, reportId, input: parseCreateItemCommand(actor.tenantId, reportId, payload) };
  }
  if (type === "expense_report.submit") {
    return { type, reportId: parseRequiredUuid(payload.reportId ?? payload.report_id, "reportId") };
  }

  throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "unsupported_action", "Unsupported sync action: " + type + ".");
}

/** Uma ação do lote validada e normalizada, com fingerprint e chave interna. NADA aqui toca o banco (A10). */
export type PreparedSyncAction = {
  readonly clientActionId: string;
  /** o tipo pedido, já validado — mesmo nome do campo do recibo (`actionType`) com que ele é conferido */
  readonly actionType: ExpenseSyncActionType;
  readonly command: ExpenseSyncCommand;
  readonly fingerprint: string;
  readonly receiptKey: string;
};

export function prepareSyncAction(actor: ExpenseActorContext, action: RawRecord): PreparedSyncAction {
  const clientActionId = assertNonEmptyString(action.clientActionId ?? action.client_action_id, "clientActionId", LEGACY_CLIENT_ACTION_ID_MAX_LENGTH);
  const requestedType = assertNonEmptyString(action.type, "type", 80);
  const payload = sanitizeJsonRecord(action.payload ?? {});
  const command = parseSyncCommand(actor, requestedType, payload);
  const fingerprint = computeSyncFingerprint({
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    clientActionId,
    type: command.type,
    normalized: normalizeSyncCommand(command),
  });

  return { clientActionId, actionType: command.type, command, fingerprint, receiptKey: buildSyncReceiptKey(clientActionId) };
}

/** O relatório que o comando afeta, quando o comando o nomeia (item e submit). */
export function syncCommandReportId(command: ExpenseSyncCommand): string | undefined {
  return command.type === "expense_report.create" ? undefined : command.reportId;
}

/**
 * Normalizado = exatamente o que alimenta o efeito, com campos EXPLÍCITOS (v2 §2.2: não espalhar payload capaz
 * de sobrescrever identidade). Tenant e autor saem daqui: vêm da sessão e entram no envelope do fingerprint.
 */
export function normalizeSyncCommand(command: ExpenseSyncCommand): Record<string, unknown> {
  if (command.type === "expense_report.create") {
    const input = command.input;
    return {
      employeeUserId: input.employeeUserId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      origin: input.origin,
      workOrderId: input.workOrderId,
      projectId: input.projectId,
      costCenter: input.costCenter,
      city: input.city,
      advanceAmount: input.advanceAmount,
      currency: input.currency,
      policyVersion: input.policyVersion,
    };
  }

  if (command.type === "expense_item.create") {
    const input = command.input;
    return {
      reportId: input.reportId,
      categoryKey: input.categoryKey,
      spentAt: input.spentAt,
      city: input.city,
      vendorName: input.vendorName,
      amount: input.amount,
      currency: input.currency,
      km: input.km,
      notes: input.notes,
      policyFlags: input.policyFlags,
    };
  }

  return { reportId: command.reportId };
}

/** JSON canônico: chaves ordenadas em todo nível, arrays preservados, `undefined` omitido, Date → ISO. Aceita frações. */
export function canonicalizeSyncValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => canonicalizeSyncValue(item));
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const canonical: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] === undefined) continue;
      canonical[key] = canonicalizeSyncValue(record[key]);
    }
    return canonical;
  }

  return value;
}

export type SyncFingerprintInput = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly clientActionId: string;
  readonly type: string;
  readonly normalized: Record<string, unknown>;
};

/**
 * Fingerprint v2 = SHA-256 do JSON canônico de `{v:2, tenantId, actorUserId, clientActionId, type, normalized}`.
 * O ator está no hash E no predicado da busca da prova (as DUAS proteções do M10, v2 §4.4).
 */
export function computeSyncFingerprint(input: SyncFingerprintInput): string {
  const envelope = {
    v: 2,
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    clientActionId: input.clientActionId,
    type: input.type,
    normalized: input.normalized,
  };

  return createHash("sha256").update(JSON.stringify(canonicalizeSyncValue(envelope))).digest("hex");
}

// ---------- contrato de conflito por ação (v2 §4.2 + v3) ----------

export const EXPENSE_SYNC_CONFLICT_CODES = [
  "payload_mismatch",
  "legacy_payload_unverifiable",
  "receipt_unverifiable",
  "receipt_ambiguous",
  "action_owned_by_other_actor",
] as const;
export type ExpenseSyncConflictCode = (typeof EXPENSE_SYNC_CONFLICT_CODES)[number];

export function isCompleteSyncReceipt(receipt: MobileActionReceipt): boolean {
  return receipt.status === "processed" && typeof receipt.resultRef === "string" && receipt.resultRef !== "";
}

// ---------- falhas transitórias → 503 (v2 §4.2, A9) ----------

export function syncBusyError(): ExpenseManagementError {
  return new ExpenseManagementError(
    503,
    "EXPENSE_SYNC_UNAVAILABLE",
    "sync_busy",
    "Expense sync is temporarily unavailable; resend the same action later.",
  );
}

/**
 * Lista FECHADA de códigos que o TEMPO resolve (mesma lista e mesma leitura de
 * `src/modules/inventory/inventory-prisma.repository.ts`, duplicada aqui de propósito para não importar o
 * módulo de estoque inteiro — pendência `P-O6R-B03-TRANSIENT-CODES-DUPLICADOS`, que nasce neste bloco).
 *   P2028 transação interativa expirada · P2034 conflito/impasse · P2024 pool esgotado
 *   40P01 deadlock · 40001 serialization_failure · 55P03 lock_not_available
 */
const TRANSIENT_SYNC_DB_CODES: ReadonlySet<string> = new Set(["P2028", "P2034", "P2024", "40P01", "40001", "55P03"]);

/** Códigos de um erro de banco nas formas medidas no Prisma 7 + adapter-pg (KnownRequestError, DriverAdapterError, P2010). */
export function syncDatabaseErrorCodes(error: unknown): readonly string[] {
  if (typeof error !== "object" || error === null) return [];

  const codes: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value !== "") codes.push(value);
  };
  const record = error as {
    readonly code?: unknown;
    readonly meta?: { readonly code?: unknown; readonly driverAdapterError?: { readonly cause?: { readonly code?: unknown; readonly originalCode?: unknown } } };
    readonly cause?: { readonly code?: unknown; readonly originalCode?: unknown };
  };

  push(record.code);
  push(record.meta?.code);
  push(record.meta?.driverAdapterError?.cause?.code);
  push(record.meta?.driverAdapterError?.cause?.originalCode);
  push(record.cause?.code);
  push(record.cause?.originalCode);

  return codes;
}

/** Falha transitória vira 503 `sync_busy`; qualquer outra passa INTACTA (nunca engole erro determinístico). */
export function mapTransientSyncFailure(error: unknown): unknown {
  if (error instanceof ExpenseManagementError) return error;

  return syncDatabaseErrorCodes(error).some((code) => TRANSIENT_SYNC_DB_CODES.has(code)) ? syncBusyError() : error;
}

const MOBILE_ACTION_RECEIPTS_PKEY = { name: "mobile_action_receipts_pkey", columns: ["tenant_id", "client_action_id"] } as const;

/**
 * Violação da PK de `mobile_action_receipts` (P2002/23505), classificada pela IDENTIDADE da restrição — colunas
 * quando o driver as expõe, senão o nome entre aspas no `originalMessage` do driver (medido nesta máquina:
 * as duas formas chegam, direta e com espera). Violação única não identificada PROPAGA: nunca vira replay.
 */
export function isSyncReceiptKeyViolation(error: unknown): boolean {
  if (!syncDatabaseErrorCodes(error).some((code) => code === "P2002" || code === "23505")) return false;

  const record = error as {
    readonly meta?: { readonly target?: unknown; readonly driverAdapterError?: { readonly cause?: { readonly constraint?: unknown; readonly originalMessage?: unknown } } };
    readonly cause?: { readonly constraint?: unknown; readonly originalMessage?: unknown };
  };
  const causes = [record.meta?.driverAdapterError?.cause, record.cause];
  for (const cause of causes) {
    const fields = (cause?.constraint as { readonly fields?: unknown } | undefined)?.fields;
    if (Array.isArray(fields) && fields.join(",") === MOBILE_ACTION_RECEIPTS_PKEY.columns.join(",")) return true;
    if (typeof cause?.originalMessage === "string" && cause.originalMessage.includes(`"${MOBILE_ACTION_RECEIPTS_PKEY.name}"`)) return true;
  }
  const target = record.meta?.target;

  return Array.isArray(target) && target.join(",") === MOBILE_ACTION_RECEIPTS_PKEY.columns.join(",");
}

const WORK_ORDER_FOREIGN_KEY = "expense_reports_tenant_id_work_order_id_fkey";

/**
 * P2003 da FK de work order do relatório → 404 `work_order_not_found` (v2 §4.5). Identidade pela restrição
 * (`constraint.index` do driver ou nome entre aspas no `originalMessage`), medida nesta máquina para create e
 * update. Outras FKs (empregado, autor) NÃO são mascaradas: passam intactas.
 */
export function isWorkOrderForeignKeyViolation(error: unknown): boolean {
  if (!syncDatabaseErrorCodes(error).some((code) => code === "P2003" || code === "23503")) return false;

  const record = error as {
    readonly meta?: { readonly field_name?: unknown; readonly driverAdapterError?: { readonly cause?: { readonly constraint?: unknown; readonly originalMessage?: unknown } } };
    readonly cause?: { readonly constraint?: unknown; readonly originalMessage?: unknown };
  };
  const causes = [record.meta?.driverAdapterError?.cause, record.cause];
  for (const cause of causes) {
    if ((cause?.constraint as { readonly index?: unknown } | undefined)?.index === WORK_ORDER_FOREIGN_KEY) return true;
    if (typeof cause?.originalMessage === "string" && cause.originalMessage.includes(`"${WORK_ORDER_FOREIGN_KEY}"`)) return true;
  }

  return typeof record.meta?.field_name === "string" && record.meta.field_name.includes(WORK_ORDER_FOREIGN_KEY);
}

export function workOrderNotFoundError(): ExpenseManagementError {
  return new ExpenseManagementError(404, "EXPENSE_NOT_FOUND", "work_order_not_found", "Work order was not found.");
}
