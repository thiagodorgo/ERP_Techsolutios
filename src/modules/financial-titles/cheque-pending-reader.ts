import { env } from "../../config/env.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a (§4.2 e §4.3, decisão do dono 25/10 "Só cheque do valor exato") — PORTA ESTREITA títulos → cheques.
//
// O conjunto "cheque pendente do título" = cheques ATIVOS (deleted_at IS NULL) com title_id = T e status ∈
// {registered, deposited}. Enquanto ele não está vazio, NENHUMA via muda o saldo do título senão a compensação do
// cheque ou o desvínculo (`POST /cheques/:id/unlink-title`): a baixa manual (`/pay`), o `PATCH` que muda `amount` e o
// `DELETE` do título respondem 422 `title_has_pending_cheque`.
//
// POR QUE UMA PORTA PRÓPRIA (idioma de `cheques/cheque-link-reader.ts`): o serviço de títulos e o de lançamentos
// precisam de UMA leitura, não da superfície de escrita do cheque — e um import estático de `cheque.service.ts` (onde
// vive o singleton InMemory) fecharia ciclo. Imports DINÂMICOS, env-switched, sem ciclo em tempo de módulo.
// -----------------------------------------------------------------------------------------------

/** O mínimo que a recusa precisa: id e valor de cada cheque pendente (sem número, banco nem tenant — §B2.8). */
export interface ChequePendingReader {
  findPendingByTitle(
    tenantId: string,
    titleId: string,
  ): Promise<readonly { readonly id: string; readonly amount: number; readonly status: string }[]>;
}

export type ChequePendingReaderResolver = () => Promise<ChequePendingReader>;

/**
 * Memória fora de produção (o MESMO singleton InMemory do serviço de cheques — senão a recusa leria um repositório
 * vazio e ficaria verde sem defender nada); Prisma quando `CORE_SAAS_PERSISTENCE=prisma`, com RLS por tenant.
 */
export async function createDefaultChequePendingReader(): Promise<ChequePendingReader> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    const { getMemoryChequeRepositoryForTests } = await import("../cheques/cheque.service.js");
    return getMemoryChequeRepositoryForTests();
  }
  const { createPrismaChequeRepository } = await import("../cheques/cheque-prisma.repository.js");
  return createPrismaChequeRepository();
}
