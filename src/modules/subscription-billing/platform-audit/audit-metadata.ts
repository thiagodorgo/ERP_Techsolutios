// B-ASS-05 — a ALLOWLIST própria da trilha do módulo de cobrança (plano §3.6, R-VLT-7).
//
// O `sanitizeAuditMetadata` da casa é uma denylist por NOME (`audit-log.service.ts`): ele não pega `token`,
// `certificatePfxBase64` nem `password` escritos de outro jeito. Aqui é o contrário: só passam as chaves da lista,
// e cada valor passa pela forma esperada. O que não está na lista some, sem erro.

const FINGERPRINT = /^[0-9a-f]{16}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_CODE = /^[a-z][a-z0-9_]{0,39}$/;

type Rule = (value: unknown) => unknown;

const code: Rule = (value) => (typeof value === "string" && SHORT_CODE.test(value) ? value : undefined);
const uuidOrNull: Rule = (value) => (value === null ? null : typeof value === "string" && UUID.test(value) ? value : undefined);
const uuidList: Rule = (value) =>
  Array.isArray(value) && value.length <= 500 && value.every((item) => typeof item === "string" && UUID.test(item)) ? [...value] : undefined;
const fingerprint: Rule = (value) => (typeof value === "string" && FINGERPRINT.test(value) ? value : undefined);
const count: Rule = (value) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined);
// B-ASS-05b: a lista de códigos de plano da trilha `plans.bootstrapped_by_migration`. Até 50 itens, cada um na regra
// `SHORT_CODE`; qualquer item fora da forma derruba a chave inteira.
const codeList: Rule = (value) =>
  Array.isArray(value) && value.length <= 50 && value.every((item) => typeof item === "string" && SHORT_CODE.test(item)) ? [...value] : undefined;

/** As chaves que a trilha do cofre, dos provedores e dos planos aceita, e a forma de cada valor. Nada além disto. */
export const BILLING_AUDIT_RULES: Readonly<Record<string, Rule>> = {
  actor_user_id: uuidOrNull,
  provider: code,
  environment: code,
  kind: code,
  fingerprint,
  credential_ids: uuidList,
  unreadable_ids: uuidList,
  rotated_count: count,
  unreadable_count: count,
  // B-ASS-05b: a trilha dos planos semeados pela migração (`plans.service.ts`).
  codes: codeList,
  count,
};

export type BillingAuditMetadata = Readonly<Record<string, unknown>>;

/** Só as chaves de `allowed` (por padrão, todas as de `BILLING_AUDIT_RULES`), e só com valor na forma esperada. */
export function pickBillingAuditMetadata(
  input: Readonly<Record<string, unknown>>,
  allowed: readonly string[] = Object.keys(BILLING_AUDIT_RULES),
): BillingAuditMetadata {
  const output: Record<string, unknown> = {};
  for (const key of allowed) {
    const rule = BILLING_AUDIT_RULES[key];
    if (!rule || !Object.prototype.hasOwnProperty.call(input, key)) continue;
    const value = rule(input[key]);
    if (value !== undefined) output[key] = value;
  }
  return output;
}
