import assert from "node:assert/strict";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C4 (P8) — PRÉ-CONDIÇÃO DE CATÁLOGO PROVISIONADA PELA PRÓPRIA SUÍTE.
//
// O defeito que a junta do ciclo 2 nomeou no B-3: duas suítes `-db` trocaram o `upsert` por
// `findUnique` + `assert.ok(..., "rode npm run db:seed")`. A troca fechava uma classe real
// (`XX000 tuple concurrently updated` — dois processos do lote dando upsert na MESMA linha da tabela
// GLOBAL `permissions`, registrado em `P-O6R-ARNES-ISOLAMENTO`) e abria outra: as suítes passaram a
// EXIGIR seed, e o job `backend` da CI **nunca seeda** (roda `migrate deploy` e vai direto ao
// `npm test`). Contra banco só-migrado, as duas suítes ficam vermelhas por pré-condição ausente —
// medido: `npm test` exit 1, 6 falhas, todas `ausente do catalogo`.
//
// P8 — os DOIS BRAÇOS são legítimos, e cada um é DECLARADO:
//   · job `backend` (`npm test`, SEEDLESS DE PROPÓSITO) → a suíte auto-provisiona a própria
//     pré-condição, que é o padrão da casa (4 suítes irmãs já o fazem por upsert);
//   · job roteado (lista SUITES, com `npm run db:seed` no próprio job) → o JOB fornece, e a suíte
//     não escreve nada.
// Nenhuma suíte pode assumir seed onde o job não seeda. E o job `backend` PERMANECE sem seed de
// propósito: ele é o DETECTOR PERMANENTE — qualquer suíte futura que volte a assumir catálogo
// pronto fica vermelha no primeiro PR que rodar CI. Acrescentar `db:seed` a ele mataria o detector.
//
// POR QUE NÃO O `upsert` DAS IRMÃS: `upsert` ESCREVE mesmo quando a linha já existe (o `update` do
// ramo encontrado), e é exatamente essa escrita concorrente na linha global que produzia o `XX000`.
// Este helper preserva o ganho real do ciclo 2 — **zero escrita em regime seeded**:
//
//   findUnique → achou?  devolve (nenhum write; é o caminho do job roteado e do dev com seed)
//              → ausente? create  → P2002 (outro processo do lote venceu a corrida; quem decide é o
//                                   índice único de `permissions.key`, não um lock nosso)
//                                 → re-findUnique → assert
//
// **NUNCA `update`.** Uma suíte não sobrescreve catálogo: se a linha existe, ela é a verdade — a
// descrição do seed oficial vence a nossa, sempre. A descrição rotulada abaixo só aparece em linha
// que a suíte teve de CRIAR, isto é, em banco só-migrado, e diz de onde veio.
// -----------------------------------------------------------------------------------------------

/** Rótulo da linha nascida de teste — diz, no próprio dado, que ela não veio do seed oficial. */
export const TEST_PROVISIONED_DESCRIPTION = "[provisionado por teste — ausente do seed em banco só-migrado]";

/** Só o que o helper lê de volta; o `id` é o que os chamadores usam para ligar `role_permissions`. */
export type PermissionRow = { readonly id: string; readonly key: string };

/**
 * A superfície MÍNIMA do Prisma Client que este helper toca. Estrutural, como `PgQueryClient` do
 * `pg-barrier`: o helper serve a qualquer harness que exponha `permission.findUnique/create`, e não
 * arrasta um import estático de `@prisma/client` para dentro do arnês.
 */
export type PermissionCatalogClient = {
  permission: {
    findUnique(args: { where: { key: string } }): PromiseLike<PermissionRow | null>;
    create(args: { data: { key: string; description: string } }): PromiseLike<PermissionRow>;
  };
};

/** P2002 = violação de constraint única no Prisma. Aqui só pode ser `permissions.key`. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/**
 * Garante que a chave de permissão EXISTE no catálogo do banco, de forma idempotente e sem clobber,
 * e devolve a linha.
 *
 * Idempotente: chamar N vezes deixa o banco no mesmo estado de chamar 1 vez.
 * Sem clobber: linha pré-existente NUNCA é alterada (sem `update`, sem `upsert`).
 * Livre de corrida: quem arbitra duas criações simultâneas é o índice único da coluna `key` — o
 * perdedor recebe P2002, relê e segue com a linha do vencedor.
 */
export async function ensurePermission(client: PermissionCatalogClient, key: string): Promise<PermissionRow> {
  const existing = await client.permission.findUnique({ where: { key } });
  if (existing) return existing;

  try {
    return await client.permission.create({ data: { key, description: TEST_PROVISIONED_DESCRIPTION } });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Corrida perdida: a linha do vencedor já está commitada — reler é o desfecho correto.
    const winner = await client.permission.findUnique({ where: { key } });
    assert.ok(
      winner,
      `permissao ${key}: create falhou por P2002 mas a releitura nao encontrou a linha — ` +
        "o indice unico de permissions.key deixou de arbitrar, e o arnes nao pode adivinhar o motivo",
    );
    return winner;
  }
}
