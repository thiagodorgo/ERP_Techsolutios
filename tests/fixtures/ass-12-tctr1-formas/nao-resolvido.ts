// B-ASS-12 (Emenda 1.3.1) · fixture do T-CTR-1: uma re-exportação que o verificador NÃO resolve (o arquivo não existe).
// A derivação tem de devolver o marcador de não resolvido, e o T-CTR-1 fica VERMELHO (fail-closed), nunca calado.
export type { Nada } from "./nao-existe.js";
