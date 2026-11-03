import type { ImpoundPaymentIntent } from "./impound-payment.types.js";
import { maskPayerDocument } from "./impound-payment.validators.js";

// B-PATIO-REC-01 (v3 §6.1, P-REC-8, §2.8; emenda X-56, §3.1 F3) — ALLOWLIST. A resposta é construída campo a campo, nunca
// por espalhamento da linha: fora ficam `tenantId`, o id externo da cobrança, os ids de conexão e de grupo e qualquer
// segredo. O documento do pagador sai mascarado (Q5). `accountScope` diz só "do grupo" ou "da organização".

export type ImpoundPaymentIntentDto = {
  readonly id: string;
  readonly status: string;
  readonly cancelReason: string | null;
  readonly currency: string;
  readonly amountCents: number;
  readonly amountLabel: string;
  readonly paidCents: number;
  readonly appliedCents: number;
  readonly heldCents: number;
  readonly heldReason: string | null;
  readonly refundedCents: number;
  readonly methods: readonly string[];
  readonly payerName: string;
  readonly payerDocument: string;
  readonly accountScope: "group" | "organization";
  readonly payUrl: string | null;
  readonly pixCopyPaste: string | null;
  readonly expiresAt: string;
  readonly settledAt: string | null;
  readonly reversedAt: string | null;
  readonly createdAt: string;
};

export function toImpoundPaymentIntentDto(intent: ImpoundPaymentIntent): ImpoundPaymentIntentDto {
  return {
    id: intent.id,
    status: intent.status,
    cancelReason: intent.cancelReason ?? null,
    currency: intent.currency,
    amountCents: intent.amountCents,
    amountLabel: formatBrl(intent.amountCents),
    paidCents: intent.paidCents,
    appliedCents: intent.appliedCents,
    heldCents: intent.heldCents,
    heldReason: intent.heldReason ?? null,
    refundedCents: intent.refundedCents,
    methods: [...intent.methods],
    payerName: intent.payerName,
    payerDocument: maskPayerDocument(intent.payerDocument),
    accountScope: intent.account.scope,
    payUrl: intent.payUrl ?? null,
    pixCopyPaste: intent.pixCopyPaste ?? null,
    expiresAt: intent.expiresAt.toISOString(),
    settledAt: intent.settledAt?.toISOString() ?? null,
    reversedAt: intent.reversedAt?.toISOString() ?? null,
    createdAt: intent.createdAt.toISOString(),
  };
}

// "R$ 1.234,56" — centavos inteiros, sem float nem dependência de locale do runtime.
export function formatBrl(cents: number): string {
  const absolute = Math.abs(cents);
  const reais = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}R$ ${reais},${fraction}`;
}
