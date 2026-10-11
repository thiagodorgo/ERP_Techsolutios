// B-SAN3-06b — regra única do estado "dados desatualizados" das telas ligadas da plataforma (Organizações, Visão
// Geral e Cloud Billing). Espelho de `modules/work-orders/work-orders.state.ts` (`nextListState`): vive fora dos hooks
// para ser testável sem React. Numa atualização em SEGUNDO PLANO que falha (resposta `fallback` que não é 403), a tela
// mantém o último dado confirmado e marca `stale`; qualquer outra resposta substitui o estado inteiro. O 403 nunca é
// "desatualizado": a permissão revogada tira o dado da tela. Nada aqui fabrica valor.

export type RefreshableState = {
  readonly source: string;
  readonly forbidden: boolean;
  readonly stale?: boolean;
};

export function nextRefreshState<T extends RefreshableState>(current: T, next: T, background: boolean): T {
  if (background && next.source === "fallback" && !next.forbidden && current.source !== "fallback") {
    return { ...current, stale: true };
  }
  return { ...next, stale: false };
}
