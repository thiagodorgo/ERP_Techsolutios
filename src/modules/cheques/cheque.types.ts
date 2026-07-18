import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4-7 — Cheque como INSTRUMENTO de pagamento com ciclo de vida próprio (registered→deposited→
// cleared/bounced; registered→cancelled). direction ∈ {received,issued}: recebido (cliente nos paga —
// entra ao compensar) vs emitido (pagamos fornecedor — sai ao compensar). O registro é INDEPENDENTE de
// título (title_id FORA de escopo — liquidar título com cheque é o caminho payTitle(payment_method='check');
// P-Ω4-7-DUPLA-CONTAGEM). amount Decimal(12,2) > 0 (mesma máquina monetária do lançamento → todo cheque
// registrado é COMPENSÁVEL). currency = moeda da conta (validada no REGISTRO). due_date ("bom para"/pré-datado)
// é MEMO — NÃO entra na competência; a compensação SEMPRE posta caixa na competência CORRENTE (server-now).
//
// Semântica de dinheiro (invariante: cada cheque contribui com NO MÁXIMO 1 lançamento líquido de caixa):
//   COMPENSAR (deposited→cleared) posta 1 lançamento (received→'in', issued→'out') via entryService.create,
//     server-now → chokepoint da competência corrente. A transição é o MUTEX (flip condicional): só o vencedor
//     posta; falha do post (período fechado/conta inativa) → rollback deposited. cleared_entry_id = o lançamento.
//   DEVOLVER-APÓS-COMPENSAR (cleared→bounced) posta um CONTRA-lançamento NOVO (direção invertida,
//     category='cheque_bounce', server-now) — NÃO reverse() do original (que travaria se já conciliado, Ω4-5).
//     bounce_entry_id = o contra-lançamento.
//   DEVOLVER-ANTES (deposited→bounced) e CANCELAR (registered→cancelled) NÃO postam nada (nunca houve caixa).

export const CHEQUE_DIRECTIONS = ["received", "issued"] as const;
export type ChequeDirection = (typeof CHEQUE_DIRECTIONS)[number];

export const CHEQUE_STATUSES = ["registered", "deposited", "cleared", "bounced", "cancelled"] as const;
export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

export type ChequeActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type Cheque = {
  readonly id: string;
  readonly tenantId: string;
  readonly accountId: string;
  readonly direction: string;
  readonly chequeNumber: string;
  readonly bank: string;
  readonly amount: number;
  readonly currency: string;
  readonly dueDate?: Date;
  readonly status: string;
  readonly clearedEntryId?: string;
  readonly bounceEntryId?: string;
  readonly bounceReason?: string;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

// title_id/status/cleared_entry_id NÃO entram pelo create público: status nasce SEMPRE 'registered'; os ids
// de lançamento são preenchidos só pelas transições de compensação/devolução.
export type CreateChequeInput = {
  readonly tenantId: string;
  readonly accountId: string;
  readonly direction: string;
  readonly chequeNumber: string;
  readonly bank: string;
  readonly amount: number;
  readonly currency: string;
  readonly dueDate?: Date;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

// PATCH — editáveis SÓ enquanto 'registered' (antes de qualquer movimento): due_date/notes/cheque_number/bank.
// amount/direction/account/currency são IMUTÁVEIS pós-create (mexer neles furaria a garantia de compensabilidade).
export type UpdateChequeInput = {
  readonly tenantId: string;
  readonly chequeId: string;
  readonly chequeNumber?: string;
  readonly bank?: string;
  readonly dueDate?: Date | null;
  readonly notes?: string | null;
  readonly updatedBy?: string;
};

// Transição ATÔMICA de status (o MUTEX contra dupla-postagem): só efetiva se o status ATUAL == fromStatus
// (flip condicional). patch carrega os campos vinculados pela transição (ids de lançamento, motivo, ator).
export type TransitionChequeInput = {
  readonly tenantId: string;
  readonly chequeId: string;
  readonly fromStatus: ChequeStatus;
  readonly toStatus: ChequeStatus;
  readonly clearedEntryId?: string | null;
  readonly bounceEntryId?: string | null;
  readonly bounceReason?: string | null;
  readonly updatedBy?: string;
};

export type ListChequeInput = {
  readonly tenantId: string;
  readonly includeDeleted: boolean;
  readonly accountId?: string;
  readonly direction?: string;
  readonly status?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListChequeResult = {
  readonly items: readonly Cheque[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export class ChequeError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ChequeError";
  }
}
