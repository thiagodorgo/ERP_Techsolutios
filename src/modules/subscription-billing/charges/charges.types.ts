// B-ASS-08 · F7 — `subscription_statement_charges` (G11): a cobrança criada no provedor, com o link/Pix/boleto que o
// cliente usa. NUNCA guarda valor em dinheiro — o cliente vê "como pagar", nunca quanto a plataforma gasta (R-CHG-1).

import type { ChargeStatus } from "../statements/statement.types.js";

export type SubscriptionStatementCharge = {
  readonly id: string;
  readonly tenantId: string;
  readonly statementId: string;
  readonly provider: string;
  readonly externalChargeId: string;
  readonly status: ChargeStatus;
  readonly payUrl: string | null;
  readonly pixCopyPaste: string | null;
  readonly boletoLine: string | null;
  readonly boletoUrl: string | null;
  readonly dueDate: string | null;
  readonly createdAt: Date;
  readonly cancelledAt: Date | null;
};

export type NewStatementCharge = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly provider: string;
  readonly externalChargeId: string;
  readonly status: ChargeStatus;
  readonly payUrl?: string | null;
  readonly pixCopyPaste?: string | null;
  readonly boletoLine?: string | null;
  readonly boletoUrl?: string | null;
  readonly dueDate?: string | null;
};
