import type { Prisma } from "@prisma/client";

import { PrismaWorkOrderRepository } from "./work-order-prisma.repository.js";
import type { WorkOrderRepository } from "./work-order.repository.js";

// B-O6R-09 · fatia 6 (item fundido pelo dono, `D-PORTAO-3-RECOMENDACOES-1111` Q1 (c); emenda 1 §1.4 e emenda 1.1 EM1-07) —
// o ESCOPO DE ESCRITA de uma OS criada dentro de uma transação de outro módulo (a aprovação do orçamento). No Prisma, o
// escopo é o `tx` da transação de quem chama: a OS, as vistorias e o evento `work_order_created` são gravados nele, junto
// da reserva e do vínculo do orçamento. Na memória, é um repositório que delega ao armazém compartilhado e sabe desfazer
// o que gravou (`discardStaged`), de forma síncrona.
//
// Só três escritas: é o que `WorkOrderService.persistPreparedCreate` precisa (`nextCode`, `create`, `createEvent`).

export type WorkOrderWriteRepository = Pick<WorkOrderRepository, "nextCode" | "create" | "createEvent">;

export type MemoryWorkOrderScope = {
  readonly kind: "memory";
  readonly repository: WorkOrderWriteRepository;
  /** Confirma o que foi gravado (só limpa o registro de desfazer). */
  commitStaged(): void;
  /** Desfaz, de forma síncrona, a OS, os eventos, as atribuições e as vistorias gravados por este escopo. */
  discardStaged(): void;
};

export type WorkOrderWriteScope = { readonly kind: "prisma"; readonly tx: Prisma.TransactionClient } | MemoryWorkOrderScope;

export function workOrderRepositoryForScope(scope: WorkOrderWriteScope): WorkOrderWriteRepository {
  if (scope.kind === "prisma") {
    return new PrismaWorkOrderRepository(scope.tx);
  }

  return scope.repository;
}
