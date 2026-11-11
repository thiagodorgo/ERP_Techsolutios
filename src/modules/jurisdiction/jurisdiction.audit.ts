import type { JurisdictionProfile } from "./jurisdiction.types.js";

// B-O6R-12 (P-AUDIT, E1.3) — campos cuja auditoria leva {from, to}. `notes` fica de fora (texto livre do operador):
// entra só em changed_fields. `name` e `release_requirements` levam valor (E1.3; os rótulos já são públicos no portal).
export const CHANGE_VALUE_FIELDS = ["name", "scope", "owner_notif_days", "notice_edict_day", "auction_eligible_day", "auction_edict_business_days", "daily_model", "daily_cap", "release_requirements", "active"] as const;

export type ProfileChanges = {
  readonly changedFields: string[];
  readonly changes: Record<string, { readonly from: unknown; readonly to: unknown }>;
};

const fields = [
  ["name", "name"],
  ["scope", "scope"],
  ["owner_notif_days", "ownerNotifDays"],
  ["notice_edict_day", "noticeEdictDay"],
  ["auction_eligible_day", "auctionEligibleDay"],
  ["auction_edict_business_days", "auctionEdictBusinessDays"],
  ["daily_model", "dailyModel"],
  ["daily_cap", "dailyCap"],
  ["release_requirements", "releaseRequirements"],
  ["notes", "notes"],
  ["active", "active"],
] as const;

export function computeProfileChanges(before: JurisdictionProfile, after: JurisdictionProfile): ProfileChanges {
  const changedFields: string[] = [];
  const changes: Record<string, { readonly from: unknown; readonly to: unknown }> = {};
  for (const [external, internal] of fields) {
    const from = before[internal];
    const to = after[internal];
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changedFields.push(external);
    if ((CHANGE_VALUE_FIELDS as readonly string[]).includes(external)) changes[external] = { from, to };
  }
  return { changedFields, changes };
}
