import { ChargeError } from "./charge.types.js";

const SETTLEMENT_CUTOFF_STATUSES = new Set(["LOTTED", "AUCTIONED", "AUCTION_CLOSED"]);

export function assertSettlementBeforeAuctionList(status: string): void {
  if (!SETTLEMENT_CUTOFF_STATUSES.has(status)) {
    return;
  }
  throw new ChargeError(409, "CHARGE_INVALID", "settle_after_auction_list", "Cannot settle charges after auction listing.");
}
