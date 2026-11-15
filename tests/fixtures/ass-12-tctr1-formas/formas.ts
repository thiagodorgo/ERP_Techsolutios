// B-ASS-12 (Emenda 1.3.1) · fixture do T-CTR-1: cada FORMA de exportar um conjunto de textos que a derivação TEM de achar.
// Não é código de produto: só o verificador do TypeScript o lê (tests/ass-10b-contrato-overview.test.ts). Valores sintéticos.
const LISTA = ["d1", "d2"] as const;

export type Escrita = "e1" | "e2";
export type Derivada = (typeof LISTA)[number];
export type Mista = (typeof LISTA)[number] | "m1";
export enum EnumTs {
  A = "n1",
  B = "n2",
}
type Local = "l1" | "l2";
export type { Local };
export type { Fora } from "./fora.js";
export type Generica<T = unknown> = "g1" | "g2";
export type ComNull = "c1" | null;

// Os de baixo NÃO são conjunto de textos e NÃO entram.
export type Objeto = { readonly campo: "o1" };
export const VALOR = "v1";
