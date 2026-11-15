// B-ASS-09 · F2 — regras PURAS de vigência do vínculo de organização a grupo econômico (plano v2 §3 P5 e P9). Sem banco,
// sem relógio: quem chama passa o dia.
//
// Datas de vigência são datas de negócio em São Paulo (`AAAA-MM-DD`, D-8); o intervalo é `[validFrom, validTo)` e
// `validTo` nulo é aberto. **Uma organização tem no máximo um vínculo em qualquer dia**: a M6 garante no banco
// (`EXCLUDE USING gist`), o serviço confere por intervalo (P9) e o motor da visão falha fechado se achar dois (P5).
//
// As expressões canônicas são o alvo das mutações literais do plano (§6, §C7 11(3)): não reescrever sem emenda.

import { deriveBusinessDate } from "../../../config/business-time.js";

/** O que as regras leem de um vínculo (o `EconomicGroupMembership` do repositório tem estes campos). */
export type MemberRow = {
  readonly tenantId: string;
  readonly groupId: string;
  /** `AAAA-MM-DD`, inclusivo. */
  readonly validFrom: string;
  /** `AAAA-MM-DD`, exclusivo; `null` = aberto. */
  readonly validTo: string | null;
};

/** A leitura achou dois vínculos da mesma organização no mesmo dia: a visão responde 500, sem número parcial (P5). */
export class MembershipOverlapError extends Error {
  readonly code = "membership_integrity_violation";

  constructor(readonly tenantId: string) {
    super("membership_integrity_violation: a organização tem mais de um vínculo de grupo no mesmo dia.");
    this.name = "MembershipOverlapError";
  }
}

/** Regra de vigência violada (P9): a rota responde 422 com o `reason`. */
export class MembershipRuleError extends Error {
  constructor(
    readonly reason: "membership_retroactive",
    message: string,
  ) {
    super(message);
    this.name = "MembershipRuleError";
  }
}

/** O vínculo vale no dia `day` (`AAAA-MM-DD`). */
export function isMemberOn(row: MemberRow, day: string): boolean {
  return row.validFrom <= day && (row.validTo === null || day < row.validTo);
}

/** Hoje, em data de negócio de São Paulo (a mesma regra do resto da casa, `src/config/business-time.ts`). */
export function todayBusinessDate(now: Date): string {
  return deriveBusinessDate(now);
}

/** O vínculo cruza o intervalo aberto `[from, ∞)`: ainda vale em `from` ou depois (inclusive os fechados no futuro). */
export function overlaps(row: MemberRow, from: string): boolean {
  return row.validTo === null || row.validTo > from;
}

/** O grupo da organização no dia, ou `null`. Dois vínculos no mesmo dia não são escolhidos: **falha fechado** (P5). */
export function groupOfTenantOn(rows: readonly MemberRow[], tenantId: string, day: string): string | null {
  const hits = rows.filter((r) => r.tenantId === tenantId && isMemberOn(r, day));
  if (hits.length > 1) throw new MembershipOverlapError(tenantId);
  return hits[0]?.groupId ?? null;
}

/** Entrada e saída valem só de hoje (SP) em diante: um mês encerrado não se reescreve (P9). */
export function assertNotBeforeToday(validFrom: string, today: string): void {
  if (validFrom < today) throw retroactive();
}

/**
 * Fechar um vínculo em `validFrom` exige `validFrom` DEPOIS do início dele (P9, A-05b): fechar no próprio dia do início
 * daria `valid_to = valid_from`, que o `CHECK (valid_to > valid_from)` da M6 recusa — a rota responde 422, nunca 500.
 */
export function assertCanClose(row: MemberRow, validFrom: string): void {
  if (validFrom <= row.validFrom) throw retroactive();
}

function retroactive(): MembershipRuleError {
  return new MembershipRuleError(
    "membership_retroactive",
    "membership_retroactive: a vigência do grupo só muda de hoje em diante e depois do início do vínculo.",
  );
}
