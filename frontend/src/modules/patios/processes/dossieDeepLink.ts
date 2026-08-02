// Ω-VID PR-07 — deep-link do dossiê do veículo. A troca de navegação (Link→modal) NÃO pode quebrar link
// compartilhável nem botão-voltar (exigência do coordenador-de-acessos): o modal é sincronizado com a query string
// via `?dossie=<processId>`. Estas funções PURAS aplicam/removem o param preservando os demais (filtros, etc.),
// e são a base testável de abrir/fechar em PatioDetailPage. §allowlist: processId é opaco (só query, nunca texto).
export const DOSSIE_PARAM = "dossie";

/** Copia os params atuais e seta `?dossie=<processId>` (abre o modal), preservando os demais params. */
export function setDossieParam(current: URLSearchParams, processId: string): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set(DOSSIE_PARAM, processId);
  return next;
}

/** Copia os params atuais e remove `?dossie=` (fecha o modal), preservando os demais params. */
export function clearDossieParam(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete(DOSSIE_PARAM);
  return next;
}
