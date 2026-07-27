import {
  AUCTION_CLASSIFICATIONS,
  AuctionError,
  type AuctionClassification,
} from "./auction.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new AuctionError(400, "AUCTION_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new AuctionError(400, "AUCTION_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

// round_number = ordinal 1-based da rodada (chave de idempotência do fecho). Inteiro positivo obrigatório. Ausente/
// malformado/<=0/não-inteiro ⇒ 422. Teto defensivo (1000) contra abuso.
export function parseRoundNumber(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new AuctionError(422, "AUCTION_INVALID", "round_number_required", "A round number is required to record an auction attempt.");
  }
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 1000) {
    throw new AuctionError(422, "AUCTION_INVALID", "round_number_invalid", "round_number must be a 1-based integer.");
  }
  return numeric;
}

// notes = texto de domínio OPCIONAL (§2.8: sem PII; NUNCA entra no payload da cadeia — só na tabela de domínio RLS'd).
export function parseNotes(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > 1000) {
    throw new AuctionError(400, "AUCTION_INVALID", "notes_too_long", "notes must be at most 1000 characters.");
  }
  return normalized;
}

// ── Ω5P PR-13a — validadores do edital + reciclagem ───────────────────────────────────────────────────────────
// edict_reference OBRIGATÓRIA no registro do edital (piso mínimo de designação REAL — barra o "edital vazio"/round nu).
// Ausente/vazia/só-espaços ⇒ 400 edict_reference_required. §2.8: referência PÚBLICA do edital, minimizada (não PII).
export function parseRequiredEdictReference(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new AuctionError(400, "AUCTION_INVALID", "edict_reference_required", "edict_reference is required (a real edict designation, not an empty round marker).");
  }
  if (normalized.length > 200) {
    throw new AuctionError(400, "AUCTION_INVALID", "edict_reference_too_long", "edict_reference must be at most 200 characters.");
  }
  return normalized;
}

// Texto curto OPCIONAL (§2.8: sem PII; auctioneerRef/edictReference minimizados). Vazio ⇒ undefined; teto defensivo.
export function parseOptionalLabel(value: unknown, field: string, maxLength = 200): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new AuctionError(400, "AUCTION_INVALID", `${field}_too_long`, `${field} must be at most ${maxLength} characters (use a masked label, not full PII).`);
  }
  return normalized;
}

// classification = CONSERVED|SCRAP|UNRECOVERABLE (app-validada; enum INGLÊS). OPCIONAL no registro do edital.
export function parseClassification(value: unknown): AuctionClassification | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) return undefined;
  if (!AUCTION_CLASSIFICATIONS.includes(normalized as AuctionClassification)) {
    throw new AuctionError(422, "AUCTION_INVALID", "classification_invalid", "classification must be one of CONSERVED, SCRAP or UNRECOVERABLE.");
  }
  return normalized as AuctionClassification;
}

// business_days = prazo do edital em dias úteis. OPCIONAL; inteiro >= 1 quando presente (o PISO >=15 da venda é 13b).
export function parseBusinessDays(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 3650) {
    throw new AuctionError(422, "AUCTION_INVALID", "business_days_invalid", "business_days must be a positive integer.");
  }
  return numeric;
}

// published_at = data de publicação do edital externo. OPCIONAL; ISO/parseável quando presente.
export function parsePublishedAt(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AuctionError(422, "AUCTION_INVALID", "published_at_invalid", "published_at must be a valid date.");
  }
  return date;
}

// Ω5P PR-13b — dinheiro Decimal(12,2) NÃO-negativo, normalizado à string canônica "0.00". OPCIONAL (undefined quando
// ausente — o gate PURO trata "ausente" como falha de negócio 409, não como 400). Malformado ⇒ 400 amount_invalid.
const moneyPattern = /^\d{1,10}(\.\d{1,2})?$/;
export function parseOptionalMoney(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!moneyPattern.test(raw)) {
    throw new AuctionError(400, "AUCTION_INVALID", `${field}_invalid`, `${field} must be a non-negative decimal with up to 2 places.`);
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AuctionError(400, "AUCTION_INVALID", `${field}_invalid`, `${field} must be a finite non-negative decimal.`);
  }
  const fixed = numeric.toFixed(2);
  return fixed === "-0.00" ? "0.00" : fixed;
}

// Comparação Decimal-exata em centavos (o float é intermediário e imediatamente arredondado — espelha moneyToCents da
// charging). undefined ⇒ trata como abaixo (o arremate sem valor NUNCA supera o mínimo). ambos "0.00" canônicos.
export function isBelowMinBid(sold: string | undefined, minBid: string | undefined): boolean {
  if (sold === undefined || minBid === undefined) return true;
  return Math.round(Number(sold) * 100) < Math.round(Number(minBid) * 100);
}

// Um valor "> 0" (avaliação/min_bid presentes e positivos). undefined/"0.00" ⇒ false (ausente/nulo).
export function isPositiveMoney(value: string | undefined): boolean {
  if (value === undefined) return false;
  return Math.round(Number(value) * 100) > 0;
}

// Máscara §2.8 da referência do edital p/ o payload da cadeia (NUNCA o valor bruto). Mostra só o sufixo curto —
// suficiente p/ correlacionar o strike ao seu edital sem vazar o identificador completo (espelha maskAuthorityReference).
export function maskEdictReference(reference: string | undefined): string | null {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return "…";
  return `…${trimmed.slice(-4)}`;
}
