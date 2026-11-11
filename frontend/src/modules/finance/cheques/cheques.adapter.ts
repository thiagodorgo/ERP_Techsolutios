import { CHEQUE_STATUSES, type Cheque, type ChequeDirection, type ChequeStatus, type ChequesData, type ChequesSource } from "./cheques.types";

// B-SAN3-24 (24a) — adaptador do DTO de cheque (`toChequeDto` no detalhe, `toChequeListDto` na lista). Defensivo: o
// que não tem a forma do contrato não vira linha (a tela não mostra o que o servidor não deu). Situação ou direção fora
// do conjunto conhecido descarta a linha, para nenhuma ação ser oferecida sobre um estado que a tela não entende.

type RecordLike = Record<string, unknown>;

const STATUS_SET: ReadonlySet<string> = new Set(CHEQUE_STATUSES);

function asRecord(value: unknown): RecordLike | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as RecordLike) : undefined;
}

function str(record: RecordLike | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function num(record: RecordLike | undefined, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Um item do DTO (lista ou detalhe) → `Cheque`; null quando falta campo obrigatório ou o estado é desconhecido. */
export function adaptCheque(raw: unknown): Cheque | null {
  const item = asRecord(raw);
  const id = str(item, "id");
  const accountId = str(item, "accountId");
  const direction = str(item, "direction");
  const status = str(item, "status");
  const amount = num(item, "amount");
  if (!id || !accountId || amount === null) return null;
  if (direction !== "received" && direction !== "issued") return null;
  if (!status || !STATUS_SET.has(status)) return null;
  return {
    id,
    accountId,
    titleId: str(item, "titleId"),
    direction: direction as ChequeDirection,
    chequeNumber: str(item, "chequeNumber") ?? "",
    bank: str(item, "bank") ?? "",
    amount,
    currency: str(item, "currency") ?? "BRL",
    dueDate: str(item, "dueDate"),
    status: status as ChequeStatus,
    clearedEntryId: str(item, "clearedEntryId"),
    bounceEntryId: str(item, "bounceEntryId"),
    bounceReason: str(item, "bounceReason"),
    notes: str(item, "notes"),
    active: item?.active !== false,
    createdAt: str(item, "createdAt") ?? "",
  };
}

/** Resposta de escrita/detalhe (`{ data: <cheque> }`). Forma inválida → erro (a tela não inventa o estado). */
export function adaptChequeResponse(payload: unknown): Cheque {
  const root = asRecord(payload);
  const cheque = adaptCheque(asRecord(root?.data) ?? root);
  if (!cheque) throw new Error("invalid_cheque_response");
  return cheque;
}

/** Resposta da lista (`{ items, pagination }`). */
export function adaptChequesList(payload: unknown, source: ChequesSource): ChequesData {
  const root = asRecord(payload);
  const rawItems = Array.isArray(root?.items) ? (root?.items as unknown[]) : [];
  const items: Cheque[] = [];
  for (const raw of rawItems) {
    const cheque = adaptCheque(raw);
    if (cheque) items.push(cheque);
  }
  const pagination = asRecord(root?.pagination);
  return {
    items,
    pagination: {
      limit: num(pagination, "limit") ?? items.length,
      offset: num(pagination, "offset") ?? 0,
      total: num(pagination, "total") ?? items.length,
    },
    source,
  };
}
