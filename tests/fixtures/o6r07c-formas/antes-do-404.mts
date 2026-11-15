// B-SEC-LOG-SANITIZA (Emenda 1.3) — onde uma camada injetada entra "como um dev a escreveria": ANTES do 404
// `route_not_found` de /api/v1. O 404 é achado pela PROPRIEDADE, nunca por índice fixo: é a última camada do app que
// não é tratador de erro (aridade 4 — o Express só a chama com `next(erro)`) e que, chamada, responde 404
// `route_not_found`. Depois dele só pode haver tratador de erro (hoje, o `finalErrorHandler` de `src/app.ts`).
// Falha FECHADA: se a cauda do app mudar e o 404 não for achado, a injeção LANÇA e o censo fica vermelho. Camada
// injetada depois do 404 nunca é alcançada, e uma forma que ninguém alcança não prova nada.
export function indiceDo404(pilha: any[]): number {
  for (let i = pilha.length - 1; i >= 0; i--) {
    const camada = pilha[i]; const h = camada?.handle;
    if (typeof h === "function" && h.length === 4) continue;
    let status = 0; let corpo: any;
    const res: any = { status(c: number) { status = c; return res; }, json(b: any) { corpo = b; return res; } };
    try { if (typeof h === "function" && !camada.route && !h.stack) h({}, res, () => undefined); } catch { /* não é o 404 */ }
    if (status === 404 && corpo?.error?.reason === "route_not_found") return i;
    throw new Error("antes-do-404: a última camada que não é tratador de erro (índice " + i + ", " + ((h && h.name) || "(anônima)") + ") não respondeu 404 route_not_found");
  }
  throw new Error("antes-do-404: o app não tem camada que não seja tratador de erro");
}
// Move para antes do 404 as camadas registradas a partir de `desde` (o `stack.length` de antes do `app.use`).
export function moverParaAntesDo404(pilha: any[], desde: number): any[] {
  const novas = pilha.splice(desde, pilha.length - desde);
  pilha.splice(indiceDo404(pilha), 0, ...novas);
  return novas;
}
