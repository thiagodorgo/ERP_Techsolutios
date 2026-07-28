import { moneyToCents } from "../charging/charge.validators.js";
import { AuctionSettlementError } from "./auction.settlement.types.js";

// Dinheiro Decimal(12,2) NÃO-negativo → CENTAVOS INTEIROS EXATOS. OPCIONAL: ausente ⇒ 0 centavos (tier não
// declarado = sem reclamação). Malformado/negativo ⇒ 400. Espelha o moneyPattern do charging (o float é só
// intermediário, imediatamente arredondado ao inteiro de centavos via moneyToCents — NUNCA soma em float).
const moneyPattern = /^\d{1,10}(\.\d{1,2})?$/;
export function parseClaimCents(value: unknown, field: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!moneyPattern.test(raw)) {
    throw new AuctionSettlementError(400, "SETTLEMENT_INVALID", `${field}_invalid`, `${field} must be a non-negative decimal with up to 2 places.`);
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AuctionSettlementError(400, "SETTLEMENT_INVALID", `${field}_invalid`, `${field} must be a finite non-negative decimal.`);
  }
  return moneyToCents(raw);
}
