// B-ASS-02 — motor de vigência e versionamento (R-PLAN-2, §3.4 do plano). Funções PURAS + relógio
// injetado: "hoje" é a data civil no fuso de negócio (America/Sao_Paulo). Bordas comparadas como
// data civil ("YYYY-MM-DD"), nunca como instante cru.

import { deriveBusinessDate } from "../../../config/business-time.js";

export type VersionDateRange = {
  readonly validFrom: Date;
  readonly validTo: Date | null;
};

export const NEW_VERSION_ERROR_REASONS = [
  "version_retroactive",
  "version_not_after_latest",
  "inaugural_not_allowed",
] as const;
export type NewVersionErrorReason = (typeof NEW_VERSION_ERROR_REASONS)[number];

export type NewVersionValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: NewVersionErrorReason };

// Data civil (YYYY-MM-DD) de um instante, no fuso de negócio.
export function businessDateOf(instant: Date): string {
  return deriveBusinessDate(instant);
}

// "hoje" em data civil SP.
export function todayBusinessDate(now: Date = new Date()): string {
  return deriveBusinessDate(now);
}

export function monthStart(businessDate: string): string {
  return `${businessDate.slice(0, 7)}-01`;
}

export function previousMonthStart(businessDate: string): string {
  const [year, month] = businessDate.slice(0, 7).split("-").map(Number);
  const totalMonths = year! * 12 + (month! - 1) - 1;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
}

// A versão de maior `validFrom` (a "última" cadastrada — vigente OU futura). Nunca compara só com a vigente.
export function latestVersion<T extends VersionDateRange>(versions: readonly T[]): T | null {
  if (versions.length === 0) return null;
  return versions.reduce((latest, version) =>
    version.validFrom.getTime() > latest.validFrom.getTime() ? version : latest,
  );
}

// A versão cujo intervalo [validFrom, validTo) contém `at` (borda `validTo` é EXCLUSIVA).
export function resolveVersionAt<T extends VersionDateRange>(
  versions: readonly T[],
  at: Date,
): T | null {
  let resolved: T | null = null;
  for (const version of versions) {
    const contains =
      version.validFrom.getTime() <= at.getTime() &&
      (version.validTo === null || at.getTime() < version.validTo.getTime());
    if (!contains) continue;
    if (resolved === null || version.validFrom.getTime() > resolved.validFrom.getTime()) {
      resolved = version;
    }
  }
  return resolved;
}

// Regras de vigência para uma NOVA versão (G5, §3.4). Não escreve nada: só julga.
export function validateNewVersionDate(args: {
  readonly existingVersions: readonly VersionDateRange[];
  readonly validFrom: Date;
  readonly inaugural: boolean;
  readonly now: Date;
}): NewVersionValidation {
  const today = todayBusinessDate(args.now);
  const validFromBiz = businessDateOf(args.validFrom);
  const latest = latestVersion(args.existingVersions);

  if (args.existingVersions.length === 0) {
    if (args.inaugural) {
      const allowed = new Set([monthStart(today), previousMonthStart(today)]);
      if (!allowed.has(validFromBiz)) {
        return { ok: false, reason: "inaugural_not_allowed" };
      }
      return { ok: true };
    }
    if (validFromBiz < today) {
      return { ok: false, reason: "version_retroactive" };
    }
    return { ok: true };
  }

  if (args.inaugural) {
    return { ok: false, reason: "inaugural_not_allowed" };
  }
  if (validFromBiz < today) {
    return { ok: false, reason: "version_retroactive" };
  }
  if (latest !== null && validFromBiz <= businessDateOf(latest.validFrom)) {
    return { ok: false, reason: "version_not_after_latest" };
  }
  return { ok: true };
}
