// Import TYPE-ONLY do client gerado: apagado na transpilação (tsx e tsc), logo não pesa um grama no
// modo memória — e o `npm run check` já exige o client gerado hoje (os repositórios Prisma importam
// `Prisma`). Se a primeira verificação falhar, o dev PARA e devolve, em vez de improvisar.
import type { Prisma } from "@prisma/client";

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

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C2 (P5) — UMA FONTE, DUAS PONTAS.
//
// O vínculo cheque -> lançamento estava escrito à mão em DOIS lugares que não se conhecem:
// `cheque.repository.ts:180` (memória, `clearedEntryId === entryId || bounceEntryId === entryId`) e
// `cheque-prisma.repository.ts:120` (Prisma, `OR: [{ cleared_entry_id }, { bounce_entry_id }]`).
// Duas listas manuais que precisam concordar é a definição do defeito do ciclo 1: uma ponta nova
// entra numa e não na outra, e a divergência nasce PERMITIDA — sem erro, sem teste, sem sinal.
//
// Agora as duas cópias CONSOMEM o derivado abaixo. Ponta nova segue um caminho único e obrigatório:
// classifica no tipo -> entra no mapa -> os DOIS repositórios a enxergam no MESMO commit, e os
// testes por ponta crescem sozinhos (eles iteram `CHEQUE_ENTRY_LINK_FIELDS`). Discordar não compila.
// -----------------------------------------------------------------------------------------------

/** O que um campo do cheque significa para o vínculo com lançamentos. */
export type ChequeFieldClass = "plain" | "entry_link";

/**
 * CLASSIFICAÇÃO TOTAL dos campos de `Cheque`. Ponta nova declarada no tipo e ausente daqui é TS1360;
 * chave aqui sem campo é TS2353. É a boca por onde toda ponta futura tem de passar.
 */
export const CHEQUE_FIELD_CLASS = {
  id: "plain",
  tenantId: "plain",
  accountId: "plain",
  direction: "plain",
  chequeNumber: "plain",
  bank: "plain",
  amount: "plain",
  currency: "plain",
  dueDate: "plain",
  status: "plain",
  // As DUAS pontas: o lançamento pertence à máquina de estados do cheque (Ω6R-DIN-011).
  clearedEntryId: "entry_link",
  bounceEntryId: "entry_link",
  bounceReason: "plain",
  notes: "plain",
  createdBy: "plain",
  updatedBy: "plain",
  createdAt: "plain",
  updatedAt: "plain",
  deletedAt: "plain",
} as const satisfies Record<keyof Cheque, ChequeFieldClass>;

/** As chaves DERIVADAS da classificação — ninguém as escreve à mão uma segunda vez. */
export type ChequeEntryLinkKey = {
  [K in keyof typeof CHEQUE_FIELD_CLASS]: (typeof CHEQUE_FIELD_CLASS)[K] extends "entry_link" ? K : never;
}[keyof typeof CHEQUE_FIELD_CLASS];

/**
 * O MAPA ÚNICO campo do domínio -> coluna do schema. Duas cercas de compilador de uma vez:
 *   · `Record<ChequeEntryLinkKey, ...>` — ponta classificada e ausente do mapa é TS1360; remover uma
 *     ponta daqui (drill D17b) é TS1360 também;
 *   · `Prisma.ChequeScalarFieldEnum` — coluna com typo ou fora do schema é TS2322. O tipo é a união
 *     das colunas REAIS do model `Cheque` no client gerado.
 */
export const CHEQUE_ENTRY_LINK_COLUMNS = {
  clearedEntryId: "cleared_entry_id",
  bounceEntryId: "bounce_entry_id",
} as const satisfies Record<ChequeEntryLinkKey, Prisma.ChequeScalarFieldEnum>;

/** A lista que as duas cópias iteram — e que os testes por ponta usam como tabela. */
export const CHEQUE_ENTRY_LINK_FIELDS = Object.keys(CHEQUE_ENTRY_LINK_COLUMNS) as readonly ChequeEntryLinkKey[];

/** A lista de COLUNAS correspondente, para quem fala com o banco. */
export const CHEQUE_ENTRY_LINK_COLUMN_NAMES = Object.values(
  CHEQUE_ENTRY_LINK_COLUMNS,
) as readonly Prisma.ChequeScalarFieldEnum[];

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
