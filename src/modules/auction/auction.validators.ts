import { AuctionError } from "./auction.types.js";

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
