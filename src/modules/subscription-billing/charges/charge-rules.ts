// B-ASS-08c1c, conserto da J-579 (plano do conserto §3.2, desenho (b)) — a tabela-verdade ÚNICA e exaustiva do estado da
// cobrança da tabela `subscription_statement_charges`. Cada estado responde às 4 perguntas que os sítios do canal fazem:
//   A `cancelTarget` — o movimento que tira a conta do "a cobrar" pede o cancelamento (o despacho lista primeiro);
//   B `terminal` — acabou no provedor; a linha SENT pode sair do conjunto vivo;
//   C `occupiesSlot` — ocupa o lugar da cobrança do demonstrativo (o D1, o claim, o 1º termo do reopen, a regra 5 do espelho);
//   D `payable` — o cliente pode pagar por ela (a visão, o aviso Q4, a reconsulta pendente, o UNIQUE parcial).
// Todo sítio em TS lê a tabela; todo sítio em SQL interpola a lista GERADA dela (`sqlStatusList`). Um membro novo em
// `CHARGE_STATUSES` deixa o `tsc` vermelho até alguém escrever a linha dele (o `satisfies`). O estado desconhecido
// (`needs_review`, `failed`, `none` e a cobrança fora da tabela) falha fechado nos dois sentidos: é alvo de cancelamento e não
// é terminal.
// No ESPELHO do demonstrativo (`subscription_statements.charge_status`, cujo padrão é `none` = "sem cobrança"), só se lê
// `occupiesSlot` (a regra 5 do reopen): o `none` do espelho nunca chega a uma pergunta de cancelamento.

import { CHARGE_STATUSES, type ChargeStatus } from "../statements/statement.types.js";

export type ChargeRule = {
  /** A: a cobrança PODE estar cobrável no provedor; o movimento que tira a conta do "a cobrar" pede o cancelamento (o despacho lista primeiro). */
  readonly cancelTarget: boolean;
  /** B: acabou no provedor; a linha SENT pode sair do conjunto vivo. */
  readonly terminal: boolean;
  /** C: ocupa o lugar da cobrança do demonstrativo (o D1, o claim, o 1º termo do reopen, a regra 5 do espelho). */
  readonly occupiesSlot: boolean;
  /** D: o cliente pode pagar por ela (a visão, o aviso Q4, a reconsulta pendente, o UNIQUE parcial). */
  readonly payable: boolean;
};

export const CHARGE_RULES = {
  none:                { cancelTarget: true,  terminal: false, occupiesSlot: false, payable: false }, // [CHG-RULE-NONE]
  pending:             { cancelTarget: true,  terminal: false, occupiesSlot: true,  payable: true  }, // [CHG-RULE-PENDING]
  confirmed:           { cancelTarget: false, terminal: false, occupiesSlot: true,  payable: false }, // [CHG-RULE-CONFIRMED]
  failed:              { cancelTarget: true,  terminal: false, occupiesSlot: false, payable: false }, // [CHG-RULE-FAILED]
  cancelled:           { cancelTarget: false, terminal: true,  occupiesSlot: false, payable: false }, // [CHG-RULE-CANCELLED]
  partially_refunded:  { cancelTarget: false, terminal: false, occupiesSlot: false, payable: false }, // [CHG-RULE-PREFUNDED]
  refunded:            { cancelTarget: false, terminal: true,  occupiesSlot: false, payable: false }, // [CHG-RULE-REFUNDED]
  chargeback_disputed: { cancelTarget: false, terminal: false, occupiesSlot: false, payable: false }, // [CHG-RULE-DISPUTED]
  charged_back:        { cancelTarget: false, terminal: true,  occupiesSlot: false, payable: false }, // [CHG-RULE-CHARGEDBACK]
  needs_review:        { cancelTarget: true,  terminal: false, occupiesSlot: false, payable: false }, // [CHG-RULE-NEEDS-REVIEW]
} as const satisfies { readonly [S in ChargeStatus]: ChargeRule };

/** A cobrança que a linha SENT criou e que NÃO está na tabela vale como estado desconhecido (falha fechado). */
export function chargeRule(charge: { readonly status: ChargeStatus } | undefined): ChargeRule {
  return charge === undefined ? CHARGE_RULES.needs_review : CHARGE_RULES[charge.status];
}

export function chargeStatesWhere(question: keyof ChargeRule): readonly ChargeStatus[] {
  return CHARGE_STATUSES.filter((status) => CHARGE_RULES[status][question]);
}

/** A lista SQL gerada da tabela, para interpolar em `status IN (…)`. Só constantes do enum, cada uma conferida. */
export function sqlStatusList(question: keyof ChargeRule): string {
  const states = chargeStatesWhere(question);
  if (states.length === 0 || states.some((state) => !/^[a-z_]+$/.test(state))) throw new Error(`charge_rules_sql_${question}`);
  return states.map((state) => `'${state}'`).join(", ");
}
