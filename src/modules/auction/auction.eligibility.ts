import { FEDERAL_DEFAULTS } from "../jurisdiction/jurisdiction.defaults.js";
import type { ProcessNotification } from "../impound/impound.notifications.types.js";

// Ω5P PR-12 — PREDICADOS PUROS do gate de elegibilidade ao leilão (I8/I6), formalização do ESTUDO §6 + §4.3. Zero
// I/O, testáveis por DI (espelha impound.notifications.ts / charge.accrual.ts). O auction.service os chama para
// computar as flags e as injeta em TransitionInputs; as guardas de impound.transitions são PURAS e só leem as flags.
//
// Tempo ABSOLUTO (enteredAt + prazo·24h em ms), DST-IMUNE por definição (24h são 24h), coerente com o rolling-24h
// federal do §5. SEM lib de data.

const MS_PER_DAY = 86_400_000;

// PISO LEGAL (CTB art. 328 / Lei 13.160/2015): a elegibilidade NUNCA pode ser encurtada abaixo do prazo federal
// (60d). Um perfil pode ALONGAR (auctionEligibleDay > 60) mas nunca reduzir — fecha o furo "admin zera
// auctionEligibleDay para leiloar antes de 60 dias". FEDERAL_DEFAULTS.auctionEligibleDay é a fonte única (=60).
export const AUCTION_MIN_ELIGIBLE_DAYS = FEDERAL_DEFAULTS.auctionEligibleDay;

// PISO 1 (prazo): a rodada de leilão só se abre em now >= enteredAt + max(auctionEligibleDay, 60)·24h. FAIL-CLOSED:
// enteredAt ausente (sem t0) OU prazo não-finito ⇒ NÃO elegível (jamais fabrica data). O max() deixa o perfil
// ALONGAR mas nunca encurtar abaixo do PISO federal.
export function isAuctionDeadlineReached(
  enteredAt: Date | undefined,
  auctionEligibleDay: number,
  now: Date,
): boolean {
  if (!enteredAt) return false; // fail-closed: sem t0, nunca elegível
  const profileDays = Number.isFinite(auctionEligibleDay) ? auctionEligibleDay : 0;
  const eligibleDay = Math.max(profileDays, AUCTION_MIN_ELIGIBLE_DAYS);
  const deadlineMs = enteredAt.getTime() + eligibleDay * MS_PER_DAY;
  if (!Number.isFinite(deadlineMs)) return false; // fail-closed: prazo não-finito
  return now.getTime() >= deadlineMs;
}

// PISO 2 (OWNER_INITIAL): a trilha DEVE conter a notificação inicial ao proprietário EMITIDA (ISSUED) ou DISPENSADA
// com fundamento (WAIVED + reason), INDEPENDENTE do que requiredNotificationKinds(profile) diz. Fecha o furo "admin
// zera ownerNotifDays → OWNER_INITIAL sai de required → leilão sem notificar o dono" (ilegal/anulável). Este é o
// cross-check herdado do critico do PR-09.
export function isOwnerInitialSatisfied(notifications: readonly ProcessNotification[]): boolean {
  const owner = notifications.find((notification) => notification.kind === "OWNER_INITIAL");
  if (!owner) return false;
  if (owner.status === "ISSUED") return true;
  if (owner.status === "WAIVED") return typeof owner.reason === "string" && owner.reason.trim().length > 0;
  return false; // DUE / FAILED ⇒ não satisfeito
}
