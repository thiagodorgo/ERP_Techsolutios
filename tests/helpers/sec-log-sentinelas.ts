// B-SEC-LOG-SANITIZA — os sentinelas do bloco, a contagem e a medição de porta livre (plano v2 §5.1 com a Emenda 1 §E5).
//
// A contagem é a mesma do aceite de boot (`aceite-boot.sh` da emenda):
// 1. sentinela de TEXTO conta por ocorrência;
// 2. sentinela NUMÉRICO (5439, 6391 e, se houver, a porta do cluster) só conta como NÚMERO INTEIRO, sem dígito encostado
//    de nenhum lado — a porta sorteada 54390 não é o sentinela 5439 (R2-08);
// 3. os campos `"time"` e `"pid"` do pino saem antes de contar.
import net from "node:net";

export const DATABASE_URL_SENTINELA = "postgresql://usrdb-sentinela:pwddb-sentinela@hstdb-sentinela:5439/bcodb-sentinela";
export const REDIS_URL_SENTINELA = "redis://usrrd-sentinela:pwdrd-sentinela@hstrd-sentinela:6391/0";

export const SENTINELAS_TEXTO: readonly string[] = [
  "usrdb-sentinela",
  "pwddb-sentinela",
  "hstdb-sentinela",
  "bcodb-sentinela",
  "usrnx-sentinela",
  "usrrd-sentinela",
  "pwdrd-sentinela",
  "hstrd-sentinela",
];
export const SENTINELAS_NUMERICOS: readonly number[] = [5439, 6391];

export type OpcoesDeContagem = {
  /** A porta do cluster descartável, quando a variante a usa (conta como sentinela numérico). */
  readonly portaCluster?: number;
  /** Sentinelas de texto a mais, só deste caso. */
  readonly extrasTexto?: readonly string[];
  /** Sentinelas numéricos a mais, só deste caso. */
  readonly extrasNumericos?: readonly number[];
};

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Tira `"time":<n>` e `"pid":<n>` das linhas do pino. */
export function semTempoNemPid(texto: string): string {
  return texto.replace(/"(time|pid)":[0-9]+/g, "");
}

/** As ocorrências de sentinela no texto, uma por entrada (para o detalhe de uma falha). */
export function sentinelasEncontrados(texto: string, opcoes: OpcoesDeContagem = {}): string[] {
  const limpo = semTempoNemPid(texto);
  const textos = [...SENTINELAS_TEXTO, ...(opcoes.extrasTexto ?? [])].map(escapar);
  const numeros = [...SENTINELAS_NUMERICOS, ...(opcoes.extrasNumericos ?? [])];
  if (opcoes.portaCluster !== undefined) numeros.push(opcoes.portaCluster);
  const partes = [...textos];
  if (numeros.length > 0) partes.push(`(?<![0-9])(?:${numeros.join("|")})(?![0-9])`);
  return limpo.match(new RegExp(partes.join("|"), "g")) ?? [];
}

export function contarSentinelas(texto: string, opcoes: OpcoesDeContagem = {}): number {
  return sentinelasEncontrados(texto, opcoes).length;
}

function sortearPorta(): Promise<number> {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", () => {
      const endereco = servidor.address() as net.AddressInfo;
      servidor.close(() => resolve(endereco.port));
    });
  });
}

/**
 * Uma porta livre em 127.0.0.1, nunca igual a um sentinela numérico (nem às `proibidas`). Nunca 0. O `sortear` existe
 * para o teste S1 provar o novo sorteio sem depender da sorte.
 */
export async function medirPortaLivre(
  proibidas: readonly number[] = [],
  sortear: () => Promise<number> = sortearPorta,
): Promise<number> {
  const vetadas = new Set<number>([...SENTINELAS_NUMERICOS, ...proibidas]);
  for (let tentativa = 0; tentativa < 50; tentativa += 1) {
    const porta = await sortear();
    if (porta > 0 && !vetadas.has(porta)) return porta;
  }
  throw new Error("medirPortaLivre: 50 sorteios caíram em porta vetada.");
}
