import {
  INTENT_STATUSES,
  LIVE_LINK_STATUSES,
  type HeldReason,
  type IntentStatus,
} from "./impound-payment.types.js";

// B-PATIO-REC-01 (plano v3 §4.4, §4.5, §4.6, §4.8) — a máquina de estados da intenção como TABELA DE DADOS. Cada linha
// é uma transição escrita, com o gatilho (provedor, operador ou sistema), a célula do plano que a origina (`via`), a
// restrição de motivo (quando a saída só vale para alguns `held_reason`) e a pergunta do dono que a ligou (§4.6).
// Os blocos seguintes (REC-02a, REC-02b) EXECUTAM as transições; este arquivo é a fonte que os testes conferem:
// - P-REC-18: todo estado tem saída escrita; nenhum estado é terminal para dinheiro novo (P-REC-15);
// - `funds_held` tem uma saída do OPERADOR que não depende de pergunta nem de motivo: DEVOLVER (E5);
// - P-REC-27: nenhuma transição entra num estado de LINK ABERTO vinda de outro estado (só a criação entra em `pending`,
//   e só o `pending` vai a `cancel_requested`), e por isso a UNIQUE do banco nunca derruba uma transição de dinheiro.

export type TransitionTrigger = "provider" | "operator" | "system";

export type TransitionRow = {
  readonly from: IntentStatus | "created";
  readonly to: IntentStatus;
  readonly via: string;
  readonly trigger: TransitionTrigger;
  readonly onlyForHeldReasons?: readonly HeldReason[];
  readonly ownerQuestion?: string;
  readonly note: string;
};

export const INTENT_TRANSITIONS: readonly TransitionRow[] = [
  { from: "created", to: "pending", via: "C", trigger: "operator", note: "criação da cobrança (§5.2)" },

  // pending
  { from: "pending", to: "settled", via: "M1", trigger: "provider", note: "pago = devido: S quita" },
  { from: "pending", to: "settled", via: "M3", trigger: "provider", ownerQuestion: "Q4", note: "pago a mais: S quita, excedente retido (overpayment)" },
  { from: "pending", to: "funds_held", via: "M2", trigger: "provider", ownerQuestion: "Q14", note: "pago a menos: FH(amount_short)" },
  { from: "pending", to: "funds_held", via: "M19", trigger: "provider", ownerQuestion: "Q4", note: "baixa manual com link vivo: FH(paid_after_manual_settlement)" },
  { from: "pending", to: "cancel_requested", via: "M12", trigger: "provider", note: "vencida no provedor: CR(expire)" },
  { from: "pending", to: "cancel_requested", via: "E1", trigger: "operator", note: "operador cancela (reconsulta antes)" },
  { from: "pending", to: "cancel_requested", via: "E2", trigger: "system", note: "arrumação: validade passou" },
  { from: "pending", to: "cancel_requested", via: "E3", trigger: "system", note: "arrumação: processo já sem devido" },
  { from: "pending", to: "cancel_requested", via: "E10", trigger: "system", note: "arrumação: o devido mudou" },
  { from: "pending", to: "cancel_requested", via: "E12", trigger: "system", ownerQuestion: "Q17", note: "irmã entrou em funds_held/disputed" },
  { from: "pending", to: "cancelled", via: "M13", trigger: "provider", note: "cancelada no provedor, nada pago" },

  // cancel_requested
  { from: "cancel_requested", to: "cancelled", via: "M13", trigger: "provider", note: "cancelamento confirmado e 0 pago" },
  { from: "cancel_requested", to: "funds_held", via: "M1", trigger: "provider", ownerQuestion: "Q15", note: "pago na corrida: FH pelo motivo do pedido" },

  // cancelled / expired (terminais para a vigilância, nunca para dinheiro novo)
  { from: "cancelled", to: "funds_held", via: "M4", trigger: "provider", ownerQuestion: "Q15", note: "pagamento tardio: FH(paid_after_cancel)" },
  { from: "expired", to: "funds_held", via: "M4", trigger: "provider", ownerQuestion: "Q15", note: "pagamento tardio: FH(paid_after_expire)" },

  // settled
  { from: "settled", to: "funds_held", via: "M6", trigger: "provider", ownerQuestion: "Q14", note: "estorno parcial além do retido: R + FH(reversal_remainder)" },
  { from: "settled", to: "funds_held", via: "M8", trigger: "provider", note: "estorno sem valor confiável: R + FH(refund_unclassified)" },
  { from: "settled", to: "funds_held", via: "E5", trigger: "operator", note: "devolver tudo: R na hora + FH(refund_requested)" },
  { from: "settled", to: "disputed", via: "M9", trigger: "provider", ownerQuestion: "Q16", note: "contestação aberta: R + DI" },
  { from: "settled", to: "reversed", via: "M7", trigger: "provider", note: "estorno total: R + C" },
  { from: "settled", to: "reversed", via: "M11", trigger: "provider", note: "contestação perdida (aviso da abertura perdido)" },

  // funds_held
  {
    from: "funds_held",
    to: "reversed",
    via: "E5",
    trigger: "operator",
    note: "DEVOLVER: a saída que existe sempre, para todo motivo, sem depender de pergunta (§4.5, P-REC-18); confirma em M5/M7",
  },
  { from: "funds_held", to: "reversed", via: "M7", trigger: "provider", note: "devolução/estorno confirmado: C → RV" },
  { from: "funds_held", to: "settled", via: "M4", trigger: "provider", onlyForHeldReasons: ["amount_short"], note: "o pagador completou: S" },
  { from: "funds_held", to: "disputed", via: "M9", trigger: "provider", note: "contestação aberta: DI (o retido segue retido)" },
  {
    from: "funds_held",
    to: "reversed",
    via: "E7",
    trigger: "operator",
    onlyForHeldReasons: ["refund_unclassified"],
    note: "classificar o estorno e reaplicar o §4.3",
  },
  {
    from: "funds_held",
    to: "settled",
    via: "E8",
    trigger: "operator",
    onlyForHeldReasons: ["paid_after_cancel", "paid_after_expire", "paid_after_reversal", "reversal_remainder"],
    ownerQuestion: "Q15",
    note: "aplicar o retido ao débito ainda aberto",
  },
  {
    from: "funds_held",
    to: "settled",
    via: "E8b",
    trigger: "operator",
    onlyForHeldReasons: ["amount_short"],
    ownerQuestion: "Q14",
    note: "receber a diferença no balcão e dar a baixa",
  },
  {
    from: "funds_held",
    to: "settled",
    via: "E6",
    trigger: "system",
    onlyForHeldReasons: ["refund_requested"],
    note: "a devolução falhou: S com o retido (reconsulta antes, emenda X-76)",
  },

  // disputed
  { from: "disputed", to: "settled", via: "M10", trigger: "provider", ownerQuestion: "Q16", note: "contestação ganha: S com o retido" },
  { from: "disputed", to: "funds_held", via: "M10", trigger: "provider", ownerQuestion: "Q16", note: "contestação ganha com o devido mudado: FH" },
  { from: "disputed", to: "reversed", via: "M11", trigger: "provider", ownerQuestion: "Q16", note: "contestação perdida: C → RV" },

  // reversed
  { from: "reversed", to: "funds_held", via: "M4", trigger: "provider", ownerQuestion: "Q15", note: "dinheiro novo depois da reversão: FH(paid_after_reversal)" },
];

export function exitsOf(status: IntentStatus): readonly TransitionRow[] {
  return INTENT_TRANSITIONS.filter((row) => row.from === status);
}

// A saída que não depende de NADA além do operador: vale para todo motivo e não espera pergunta do dono.
export function unconditionalOperatorExits(status: IntentStatus): readonly TransitionRow[] {
  return exitsOf(status).filter(
    (row) => row.trigger === "operator" && row.onlyForHeldReasons === undefined && row.ownerQuestion === undefined,
  );
}

export function statesWithoutExit(): readonly IntentStatus[] {
  return INTENT_STATUSES.filter((status) => exitsOf(status).length === 0);
}

// P-REC-27 — as linhas que entram num estado de link aberto vindas de um estado que não é a própria origem permitida.
export function transitionsIntoLiveLinkFromElsewhere(): readonly TransitionRow[] {
  const liveLink = new Set<string>(LIVE_LINK_STATUSES);
  return INTENT_TRANSITIONS.filter((row) => {
    if (!liveLink.has(row.to)) return false;
    if (row.to === "pending") return row.from !== "created";
    return row.from !== "pending";
  });
}
