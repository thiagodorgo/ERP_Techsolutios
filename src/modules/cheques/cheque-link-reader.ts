import { env } from "../../config/env.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 2 · C2 (Ω6R-DIN-011) — PORTA DE LEITURA do vínculo cheque → lançamento.
//
// O defeito, medido pela junta no head `e4e914a`: `clear`/`bounce` vinculam o lançamento ao cheque
// no NASCIMENTO (`cleared_entry_id`/`bounce_entry_id`, na mesma unidade), mas a superfície de
// LANÇAMENTOS (`delete`/`reverse`) nunca consultava esse vínculo. Estornar o lançamento de
// compensação era aceito, o cheque continuava `cleared`, e o `bounce` seguinte — legal — postava o
// contra-lançamento: **200 devolvidos num cheque de 100**.
//
// A regra é a mesma da liquidação (C1): lançamento vinculado a um agregado só se desfaz PELO FLUXO
// DO AGREGADO. Aqui isso significa: quem desfaz um movimento de cheque é a máquina de estados do
// cheque (`bounce`), nunca a porta dos lançamentos.
//
// POR QUE UMA PORTA PRÓPRIA, e não o `ChequeRepository` inteiro: o serviço de lançamentos precisa de
// UMA leitura, não da superfície de escrita do cheque — e um import estático de `cheque.service.ts`
// (onde vive o singleton InMemory) fecharia ciclo. O resolver abaixo usa o MESMO idioma de
// `createDefaultFinancialUnitOfWork`: imports DINÂMICOS, env-switched, sem ciclo em tempo de módulo.
//
// Livre de corrida POR CONSTRUÇÃO, como o `title_id`: os vínculos são fixados no nascimento e
// nenhuma API vincula lançamento pré-existente a cheque nem move o vínculo depois.
// -----------------------------------------------------------------------------------------------

/**
 * Leitura ESTREITA: existe cheque ATIVO deste tenant referenciando `entryId` por
 * `cleared_entry_id` ou `bounce_entry_id`? Devolve o mínimo para o guard decidir e para a mensagem
 * ficar sem PII (§2.8) — os dois repositórios de cheque a satisfazem estruturalmente.
 */
export interface ChequeLinkReader {
  findActiveByLinkedEntry(
    tenantId: string,
    entryId: string,
  ): Promise<{ readonly id: string; readonly status: string } | undefined>;
}

/** Resolver da porta — mesmo idioma dos service-resolvers dos módulos financeiros. */
export type ChequeLinkReaderResolver = () => Promise<ChequeLinkReader>;

/**
 * Memória fora de produção (o MESMO singleton InMemory que o serviço de cheques usa, senão o guard
 * leria um repositório vazio e ficaria verde sem defender nada); Prisma quando
 * `CORE_SAAS_PERSISTENCE=prisma`, com RLS por tenant.
 */
export async function createDefaultChequeLinkReader(): Promise<ChequeLinkReader> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    const { getMemoryChequeRepositoryForTests } = await import("./cheque.service.js");
    return getMemoryChequeRepositoryForTests();
  }
  const { createPrismaChequeRepository } = await import("./cheque-prisma.repository.js");
  return createPrismaChequeRepository();
}
