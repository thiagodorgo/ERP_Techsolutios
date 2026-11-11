import { WORK_ORDER_MUTATION_SCOPE } from "../work-orders/work-order.types.js";
import type { ActorOperatorProfile, InventoryActorContext, StockCustody } from "./inventory.types.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-15a (P1; plano `plano-B-SAN3-15-v2.md` §2.1 e §2.2; Pergunta 5 (a), resposta do dono de 11/11) — DE ONDE
// SAI A PEÇA DO ATOR. Uma regra só, usada pela leitura do estoque do técnico (15a) e pela baixa da peça (15b), para
// que o seletor nunca mostre uma custódia diferente da que a baixa usa:
//   1. ator com cadastro de profissional ATIVO → a custódia PROFISSIONAL dele;
//   2. ator SEM cadastro ativo e com algum papel `tenant_wide` (o gerente: a P21 do plano de reenvios, "o gerente
//      também baixa pelo app") → a BASE da organização;
//   3. qualquer outro ator → nenhuma custódia (o vazio honesto da leitura; a recusa da baixa).
// A organização e o usuário vêm SEMPRE do ator autenticado; nada do pedido entra aqui.
//
// CE-G1: o mapa de escopo é o `WORK_ORDER_MUTATION_SCOPE` (`satisfies Record<Role, …>`): papel novo sem entrada
// reprova o `npm run check`; papel `assigned_only` ou `no_mutation` sem cadastro cai no ramo 3.
// -----------------------------------------------------------------------------------------------

/** N-12 — presença e união: basta UM papel do ator ser `tenant_wide` (a mesma regra do `get` do bloco C). */
export function hasTenantWideRole(actor: Pick<InventoryActorContext, "roles">): boolean {
  return actor.roles.some((role) => WORK_ORDER_MUTATION_SCOPE[role] === "tenant_wide");
}

export function resolveActorStockCustody(
  actor: Pick<InventoryActorContext, "roles">,
  profile: ActorOperatorProfile | undefined,
): StockCustody | undefined {
  if (profile && profile.isActive) {
    return { custodyType: "professional", custodyOperatorProfileId: profile.id };
  }
  // Ramo 2 (a BASE para o ator sem cadastro com papel `tenant_wide`): fatia F1g, depois da Pergunta 5.

  return undefined;
}

/** O rótulo da BASE na tela do app (P2: `custody.label`). */
export const BASE_CUSTODY_LABEL = "Base da organização";
