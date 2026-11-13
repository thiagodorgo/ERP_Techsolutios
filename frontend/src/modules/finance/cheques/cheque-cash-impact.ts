import type { Cheque } from "./cheques.types";

// B-SAN3-24 (24a, R-CAIXA — achado ALTA A-01 da crítica r1) — a ÚNICA fonte do sentido do caixa na tela de Cheques.
// O servidor decide o sentido pela DIREÇÃO do cheque (`src/modules/cheques/cheque.service.ts`): compensar um cheque
// recebido ENTRA e um emitido SAI; devolver depois de compensar faz o inverso; devolver depositado não move caixa.
// Com título: compensar baixa o título; devolver depois de compensar reabre o título (em aberto ou parcial, N-05 da
// crítica r2); devolver depositado tira o cheque das pendências do título. A tela não escreve sentido de caixa fora
// daqui, e o teste A6a confere este cálculo contra o lançamento que o servidor de fato gravou.
// R-E2E-JWT: só TypeScript puro.

export type CashMovement = "in" | "out" | "none";
export type CashImpactAction = "deposit" | "clear" | "bounce" | "cancel" | "delete";
export type TitleEffect = "settles" | "reopens" | "leaves-pending" | null;
/** Situação do título DEPOIS de devolver um cheque compensado (N-05): só conhecida quando o título foi lido. */
export type TitleAfter = "open" | "partially_paid" | null;

/** O que a tela sabe do título vinculado (lido de `GET /financial-titles/:id`), quando sabe. */
export type CashImpactTitle = {
  readonly document: string | null;
  readonly amount: number;
  readonly paidAmount: number;
};

export type CashImpactRefs = {
  readonly accountName?: string | null;
  readonly title?: CashImpactTitle | null;
};

export type CashImpact = {
  readonly action: CashImpactAction;
  readonly movement: CashMovement;
  /** Devolução de cheque já compensado: o lançamento é um estorno da compensação. */
  readonly reversal: boolean;
  readonly amount: number;
  readonly accountId: string;
  readonly accountName: string | null;
  readonly title: TitleEffect;
  readonly titleDocument: string | null;
  readonly titleAfter: TitleAfter;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.234,56" (formatação pt-BR; nenhuma conta de dinheiro acontece aqui). */
export function formatMoney(value: number): string {
  return BRL.format(value);
}

/** Situação do título depois de o servidor desfazer a baixa de `chequeAmount` (o que ele faz em `restorePaymentGuarded`). */
function titleAfterRestore(title: CashImpactTitle | null | undefined, chequeAmount: number): TitleAfter {
  if (!title) return null;
  const remainingPaidCents = Math.round(title.paidAmount * 100) - Math.round(chequeAmount * 100);
  return remainingPaidCents > 0 ? "partially_paid" : "open";
}

export function cashImpactFor(cheque: Cheque, action: CashImpactAction, refs: CashImpactRefs = {}): CashImpact {
  const base = {
    action,
    reversal: false,
    amount: cheque.amount,
    accountId: cheque.accountId,
    accountName: refs.accountName ?? null,
    titleDocument: cheque.titleId !== null ? (refs.title?.document ?? null) : null,
    titleAfter: null as TitleAfter,
  };
  const clearMovement = cheque.direction === "received" ? "in" : "out";
  if (action === "clear") {
    return { ...base, movement: clearMovement, title: cheque.titleId !== null ? "settles" : null };
  }
  if (action === "bounce" && cheque.status === "cleared") {
    const reverse: CashMovement = clearMovement === "in" ? "out" : "in";
    if (cheque.titleId !== null) return { ...base, reversal: true, movement: reverse, title: "reopens", titleAfter: titleAfterRestore(refs.title, cheque.amount) };
    return { ...base, reversal: true, movement: reverse, title: null };
  }
  if (action === "bounce") {
    return { ...base, movement: "none", title: cheque.titleId !== null ? "leaves-pending" : null };
  }
  return { ...base, movement: "none", title: null };
}

function titlePhrase(impact: CashImpact): string {
  return impact.titleDocument ? `o título ${impact.titleDocument}` : "o título vinculado";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** O texto da confirmação, igual nas 3 aparências. Sai SÓ do `CashImpact` (o sentido nunca é escrito na tela). */
export function cashImpactText(impact: CashImpact): string {
  const money = formatMoney(impact.amount);
  const account = impact.accountName ?? "do cheque";
  const parts: string[] = [];
  if (impact.movement === "none") parts.push("Nenhum dinheiro se move.");
  else if (impact.reversal) {
    parts.push(impact.movement === "out" ? `Sai ${money} da conta ${account} (estorno da compensação).` : `Volta ${money} para a conta ${account} (estorno da compensação).`);
  } else {
    parts.push(impact.movement === "in" ? `Entra ${money} na conta ${account} hoje.` : `Sai ${money} da conta ${account} hoje.`);
  }
  if (impact.action === "clear" && impact.title === null) parts.push("Nenhum título será baixado.");
  if (impact.title === "settles") parts.push(`Baixa ${titlePhrase(impact)}.`);
  if (impact.title === "reopens") {
    const subject = capitalize(titlePhrase(impact));
    parts.push(impact.titleAfter === "partially_paid" ? `${subject} volta a ficar parcialmente pago.` : `${subject} volta a ficar em aberto.`);
  }
  if (impact.title === "leaves-pending") parts.push(`O cheque sai das pendências d${titlePhrase(impact)}, e o motivo é obrigatório.`);
  return parts.join(" ");
}
