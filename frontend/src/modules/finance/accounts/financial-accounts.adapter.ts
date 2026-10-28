import type {
  FinancialAccount,
  FinancialAccountBalance,
  FinancialAccountKind,
  FinancialAccountsData,
  FinancialAccountsSource,
} from "./financial-accounts.types";

// B-SAN3-12b — adaptador das contas. Lê os bytes do backend de forma defensiva: item sem id, sem nome ou com tipo fora
// da lista não vira conta; saldo sem `balance` numérico vira null (a tela diz "saldo indisponível", nunca R$ 0,00).

type RecordLike = Record<string, unknown>;

const KINDS: readonly FinancialAccountKind[] = ["cash", "bank", "wallet"];
const KIND_LABELS: Readonly<Record<FinancialAccountKind, string>> = { bank: "Conta bancária", cash: "Caixa", wallet: "Carteira digital" };

function asRecord(value: unknown): RecordLike | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as RecordLike) : undefined;
}

function readString(record: RecordLike | undefined, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

function readNumber(record: RecordLike | undefined, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function unwrap(payload: unknown): RecordLike | undefined {
  const root = asRecord(payload);
  return asRecord(root?.data) ?? root;
}

function adaptAccount(input: unknown): FinancialAccount | null {
  const item = asRecord(input);
  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  const kind = readString(item, ["kind"]);
  if (!id || !name || !kind || !(KINDS as readonly string[]).includes(kind)) return null;
  const isActive = item?.isActive ?? item?.is_active;
  return {
    id,
    name,
    kind: kind as FinancialAccountKind,
    currency: readString(item, ["currency"]) ?? "BRL",
    openingBalance: readNumber(item, ["openingBalance", "opening_balance"]) ?? 0,
    bankName: readString(item, ["bankName", "bank_name"]) ?? null,
    active: typeof isActive === "boolean" ? isActive : readString(item, ["status"]) !== "inactive",
    createdAt: readString(item, ["createdAt", "created_at"]) ?? "",
  };
}

/** Lista: aceita o DTO real (`{ items, pagination }`), `{ data: { items } }` e `{ data: [...] }`. */
export function adaptFinancialAccountsResponse(payload: unknown, source: FinancialAccountsSource): FinancialAccountsData {
  const root = asRecord(payload);
  const nested = asRecord(root?.data);
  const raw = Array.isArray(root?.items) ? root.items : Array.isArray(nested?.items) ? nested.items : Array.isArray(root?.data) ? root.data : [];
  const items = (raw as unknown[]).map(adaptAccount).filter((account): account is FinancialAccount => account !== null);
  const pagination = asRecord(root?.pagination) ?? asRecord(nested?.pagination);
  return {
    items,
    pagination: {
      limit: readNumber(pagination, ["limit"]) ?? items.length,
      offset: readNumber(pagination, ["offset"]) ?? 0,
      total: readNumber(pagination, ["total"]) ?? items.length,
    },
    source,
  };
}

export function adaptFinancialAccountResponse(payload: unknown): FinancialAccount | null {
  return adaptAccount(unwrap(payload));
}

export function adaptFinancialAccountBalance(payload: unknown): FinancialAccountBalance | null {
  const data = unwrap(payload);
  const balance = readNumber(data, ["balance"]);
  const accountId = readString(data, ["accountId", "account_id"]);
  if (balance === undefined || !accountId) return null;
  return {
    accountId,
    openingBalance: readNumber(data, ["openingBalance", "opening_balance"]) ?? 0,
    inflow: readNumber(data, ["in", "inflow"]) ?? 0,
    outflow: readNumber(data, ["out", "outflow"]) ?? 0,
    balance,
  };
}

export function getAccountKindLabel(kind: FinancialAccountKind): string {
  return KIND_LABELS[kind];
}
