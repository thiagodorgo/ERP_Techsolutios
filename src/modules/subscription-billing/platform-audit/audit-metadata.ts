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
// B-ASS-09 (plano v2 §4.3): a trilha do câmbio e dos grupos. Id do grupo, mês, par de moedas, taxa normalizada (6 casas),
// versão e as datas de negócio da vigência. Nome de grupo e de organização nunca entram (não há regra para eles).
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const CURRENCY = /^[A-Z]{3}$/;
const RATE = /^\d{1,3}\.\d{6}$/;
const BUSINESS_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const uuid: Rule = (value) => (typeof value === "string" && UUID.test(value) ? value : undefined);
const month: Rule = (value) => (typeof value === "string" && MONTH.test(value) ? value : undefined);
const currency: Rule = (value) => (typeof value === "string" && CURRENCY.test(value) ? value : undefined);
const rate: Rule = (value) => (typeof value === "string" && RATE.test(value) ? value : undefined);
const version: Rule = (value) => (typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined);
const businessDate: Rule = (value) => (typeof value === "string" && BUSINESS_DATE.test(value) ? value : undefined);
const businessDateOrNull: Rule = (value) => (value === null ? null : businessDate(value));

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
  // B-ASS-09: a trilha do câmbio (`platform_audit_logs`) e da entrada e saída de grupo (`audit_logs` da organização).
  group_id: uuid,
  month,
  currency_from: currency,
  currency_to: currency,
  rate,
  version,
  valid_from: businessDate,
  valid_to: businessDateOrNull,
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
