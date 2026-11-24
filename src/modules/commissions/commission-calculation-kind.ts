import type { Prisma } from "@prisma/client";

// B-COMISSAO-MOTOR (Emenda 1.4 §A.1, Emenda 1.5 §B/§D) — classificação de linhas de `commission_calculations`
// pelo prefixo de `idempotency_key` (P-KIND).
export type CommissionCalculationKind = "commission" | "adjustment" | "unknown_reserved";

export function classifyCalculationKey(idempotencyKey: string): CommissionCalculationKind {
  if (!idempotencyKey.startsWith("engine:")) {
    return "commission"; // B-COMISSAO:classifica-antiga
  }
  if (idempotencyKey.startsWith("engine:calc:")) {
    return "commission";
  }
  if (idempotencyKey.startsWith("engine:adj:")) {
    return "adjustment";
  }
  return "unknown_reserved"; // B-COMISSAO:classe-desconhecida
}

export function isCommissionCalculationKey(idempotencyKey: string): boolean {
  return classifyCalculationKey(idempotencyKey) === "commission";
}

export function isAdjustmentCalculationKey(idempotencyKey: string): boolean {
  return classifyCalculationKey(idempotencyKey) === "adjustment";
}

// Fragmento Prisma para COMISSÃO = fora de `engine:` OU `engine:calc:`
export function buildCommissionKindWhere(): Prisma.CommissionCalculationWhereInput {
  return {
    // B-COMISSAO:classe-inclui-antiga
    OR: [
      { NOT: { idempotency_key: { startsWith: "engine:" } } },
      { idempotency_key: { startsWith: "engine:calc:" } },
    ],
  };
}

export function buildAdjustmentKindWhere(): Prisma.CommissionCalculationWhereInput {
  return {
    idempotency_key: { startsWith: "engine:adj:" },
  };
}

export function buildPendingAdjustmentWhere(): Prisma.CommissionCalculationWhereInput {
  // B-COMISSAO:pendente-com-situacao
  return {
    idempotency_key: { startsWith: "engine:adj:" },
    status: "approved",
    settled_at: null,
  };
}
