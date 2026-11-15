// B-ASS-09 · F6 — a trilha do câmbio e dos grupos (plano v2 §4.3). Taxa, criar, renomear e excluir grupo →
// `platform_audit_logs` (ato sem organização); entrar e sair de grupo → `audit_logs` DA ORGANIZAÇÃO, na mesma transação da
// troca (Emenda 2 §2.4: o repositório grava; o conteúdo vem daqui).
//
// A metadata passa SÓ pela allowlist do módulo (`pickBillingAuditMetadata`, com as chaves do §4.3). Quem chama entrega o
// contexto do ato inteiro (com nome e notas, se tiver); a allowlist recorta. Nome de grupo, nome de organização e
// `tenant_id` nunca entram (§2.8). É o alvo da M-ACC-3: não reescrever sem emenda.

import type { MembershipAuditEvent } from "../economic-groups/economic-groups.repository.js";
import type { MembershipAuditBuilder } from "../economic-groups/economic-groups.service.js";
import { pickBillingAuditMetadata } from "../platform-audit/audit-metadata.js";

/** As chaves que a trilha do câmbio e dos grupos aceita (plano v2 §4.3), mais o ator. Nada além disto. */
export const OVERVIEW_TRAIL_KEYS = [
  "actor_user_id",
  "group_id",
  "month",
  "currency_from",
  "currency_to",
  "rate",
  "version",
  "valid_from",
  "valid_to",
] as const;

export type TrailMetadata = Readonly<Record<string, string | number | boolean | null>>;

/** O contexto do ato → só as chaves da lista, na forma de cada regra. */
export function trailMetadata(context: Readonly<Record<string, unknown>>): TrailMetadata {
  const picked = pickBillingAuditMetadata(context, OVERVIEW_TRAIL_KEYS);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(picked)) {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
  }
  return out;
}

/** O evento de trilha de uma entrada ou saída de grupo (`audit_logs` da organização), montado pela allowlist. */
export const membershipAuditBuilder: MembershipAuditBuilder = (change): MembershipAuditEvent => ({
  tenantId: change.tenantId,
  actorId: change.actorId,
  action: `economic_group.member_${change.kind}`,
  entityId: change.groupId,
  metadata: trailMetadata({
    tenant_id: change.tenantId,
    group_id: change.groupId,
    valid_from: change.validFrom,
    valid_to: change.validTo,
  }),
});
