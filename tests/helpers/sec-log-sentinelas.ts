// B-SEC-LOG-SANITIZA — os sentinelas do bloco, a contagem e a medição de porta livre (plano v2 §5.1 com a Emenda 1 §E5).
//
// A contagem é a mesma do aceite de boot (`aceite-boot.sh` da emenda):
// 1. sentinela de TEXTO conta por ocorrência;
// 2. sentinela NUMÉRICO (5439, 6391 e, se houver, a porta do cluster) só conta como NÚMERO INTEIRO, sem dígito encostado
//    de nenhum lado — a porta sorteada 54390 não é o sentinela 5439 (R2-08);
// 3. os campos `"time"` e `"pid"` do pino saem antes de contar.
import { spawn } from "node:child_process";
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

// ---------------------------------------------------------------------------------------------------------------------
// O boot na forma real (B1 a B4; plano v2 §5.3, Emenda 1.2 §5.5 e Emenda 1.2.1 §2.7 item 5).
//
// O servidor sobe como processo filho (`process.execPath --import tsx src/server.ts`), com o env SÓ da variante (mais
// `PATH` e `SystemRoot`), `NODE_ENV=development`, `TRACCAR_INGEST_ENABLED=false` e duas portas livres medidas. Nenhum tempo
// fixo: o teste espera a linha positiva da variante (mensagem e os dois códigos NA MESMA LINHA), com teto de 120 s;
// achada a linha, espera mais 3 s e encerra o filho. Depois, nesta ordem:
// - sentinela no log: VAZOU, falha na hora, sem repetir;
// - positivo ≥ 1: LIMPO;
// - sem positivo e COM o marcador de caminho completo (modo `sonda`: a linha de escuta e a linha de desfecho da sonda de
//   login com valor diferente de `unreachable`; modo `escuta`: a linha de escuta): subiu por inteiro sem a linha positiva,
//   falha na hora;
// - qualquer outro caso (teto sem log, `unreachable`, log de arranque sem o marcador): AMBIENTE, repete UMA vez; se
//   persistir, falha dizendo que o servidor não chegou a rodar o caminho.
// - `EADDRINUSE` no log (a porta foi tomada entre medir e subir): mede outra e repete uma vez (risco R8 do v2).
// ---------------------------------------------------------------------------------------------------------------------

export type ModoDoMarcador = "sonda" | "escuta";

export type VarianteDeBoot = {
  readonly rotulo: string;
  readonly env: Readonly<Record<string, string>>;
  /** A linha positiva: casa a mensagem e tem os dois códigos da falha provocada. */
  readonly mensagem: RegExp;
  readonly codigos: readonly [string, string];
  readonly modo: ModoDoMarcador;
  /** A porta do banco da variante, quando ele está no ar: conta como sentinela numérico (como no aceite de boot). */
  readonly portaCluster?: number;
};

export type SubidaDeBoot = {
  readonly log: string;
  readonly positivo: number;
  readonly sentinelas: readonly string[];
  readonly completo: boolean;
  readonly unreachable: boolean;
  readonly linhasDoServidor: number;
  readonly eaddrinuse: boolean;
  readonly esperaMs: number;
  readonly portas: readonly [number, number];
};

export type VereditoDeBoot = "LIMPO" | "VAZOU" | "SUBIU-SEM-POSITIVO" | "AMBIENTE";

export type ResultadoDeBoot = { readonly veredito: VereditoDeBoot; readonly tentativas: readonly SubidaDeBoot[] };

const LINHA_DE_ESCUTA = '"msg":"ERP Techsolutions API listening"';
const DESFECHO_DA_SONDA = /"loginWithoutOrgOutcome":"([^"]*)"/;

function linhasDoPino(log: string): string[] {
  return log.split(/\r?\n/).filter((linha) => linha.startsWith('{"level":'));
}

export function contarPositivo(log: string, variante: Pick<VarianteDeBoot, "mensagem" | "codigos">): number {
  return log
    .split(/\r?\n/)
    .filter(
      (linha) =>
        variante.mensagem.test(linha) && linha.includes(variante.codigos[0]) && linha.includes(variante.codigos[1]),
    ).length;
}

export function temMarcadorCompleto(log: string, modo: ModoDoMarcador): boolean {
  const linhas = linhasDoPino(log);
  const escutou = linhas.some((linha) => linha.includes(LINHA_DE_ESCUTA));
  if (modo === "escuta") return escutou;
  const desfecho = linhas.some((linha) => {
    const valor = DESFECHO_DA_SONDA.exec(linha)?.[1];
    return valor !== undefined && valor !== "unreachable";
  });
  return escutou && desfecho;
}

const TETO_MS = 120_000;
const JANELA_MS = 3_000;

/** UMA subida do servidor da variante, até a linha positiva (mais a janela) ou até o teto. */
export async function subirUmaVez(raiz: string, variante: VarianteDeBoot): Promise<SubidaDeBoot> {
  const proibidas = variante.portaCluster === undefined ? [] : [variante.portaCluster];
  const porta = await medirPortaLivre(proibidas);
  const portaDoPortal = await medirPortaLivre([...proibidas, porta]);
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    NODE_ENV: "development",
    TRACCAR_INGEST_ENABLED: "false",
    CORE_SAAS_PERSISTENCE: "prisma",
    PORT: String(porta),
    PORTAL_PORT: String(portaDoPortal),
    ...variante.env,
  };
  if (process.env.SystemRoot !== undefined) env.SystemRoot = process.env.SystemRoot;
  const inicio = Date.now();
  const filho = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: raiz,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let log = "";
  let esperaMs = 0;
  await new Promise<void>((resolve) => {
    let janela: NodeJS.Timeout | undefined;
    const teto = setTimeout(() => filho.kill(), TETO_MS);
    const olhar = (pedaco: Buffer) => {
      log += pedaco.toString("utf8");
      if (janela === undefined && contarPositivo(log, variante) >= 1) {
        esperaMs = Date.now() - inicio;
        janela = setTimeout(() => filho.kill(), JANELA_MS);
      }
    };
    filho.stdout.on("data", olhar);
    filho.stderr.on("data", olhar);
    filho.once("close", () => {
      clearTimeout(teto);
      if (janela !== undefined) clearTimeout(janela);
      if (esperaMs === 0) esperaMs = Date.now() - inicio;
      resolve();
    });
  });
  return {
    log,
    positivo: contarPositivo(log, variante),
    sentinelas: sentinelasEncontrados(log, { portaCluster: variante.portaCluster }),
    completo: temMarcadorCompleto(log, variante.modo),
    unreachable: log.includes('"loginWithoutOrgOutcome":"unreachable"'),
    linhasDoServidor: linhasDoPino(log).length,
    eaddrinuse: log.includes("EADDRINUSE"),
    esperaMs,
    portas: [porta, portaDoPortal],
  };
}

/** A regra inteira do §5.5 da Emenda 1.2 com o item 5 da Emenda 1.2.1: até 2 subidas (mais 1 por `EADDRINUSE`). */
export async function bootNaFormaReal(raiz: string, variante: VarianteDeBoot): Promise<ResultadoDeBoot> {
  const tentativas: SubidaDeBoot[] = [];
  let repetiuPorAmbiente = false;
  let repetiuPorPorta = false;
  for (;;) {
    const subida = await subirUmaVez(raiz, variante);
    tentativas.push(subida);
    if (subida.sentinelas.length > 0) return { veredito: "VAZOU", tentativas };
    if (subida.positivo >= 1) return { veredito: "LIMPO", tentativas };
    if (subida.eaddrinuse && !repetiuPorPorta) {
      repetiuPorPorta = true;
      continue;
    }
    if (subida.completo && !subida.unreachable) return { veredito: "SUBIU-SEM-POSITIVO", tentativas };
    if (!repetiuPorAmbiente) {
      repetiuPorAmbiente = true;
      continue;
    }
    return { veredito: "AMBIENTE", tentativas };
  }
}

/** A mensagem de falha que diz o que aconteceu: vazou, subiu sem a linha, ou o ambiente não deixou o caminho rodar. */
export function explicarBoot(variante: VarianteDeBoot, resultado: ResultadoDeBoot): string {
  const ultima = resultado.tentativas[resultado.tentativas.length - 1];
  const resumo = resultado.tentativas
    .map(
      (t, i) =>
        `tentativa ${i + 1}: positivo=${t.positivo} sentinelas=${t.sentinelas.length} completo=${t.completo} ` +
        `unreachable=${t.unreachable} linhas-do-servidor=${t.linhasDoServidor} espera=${t.esperaMs}ms portas=${t.portas.join("/")}`,
    )
    .join("; ");
  const motivo = {
    LIMPO: "limpo",
    VAZOU: `vazou: ${JSON.stringify(ultima.sentinelas)}`,
    "SUBIU-SEM-POSITIVO": "subiu por inteiro sem a linha positiva",
    AMBIENTE: "o servidor não chegou a rodar o caminho (ambiente)",
  }[resultado.veredito];
  return `${variante.rotulo}: ${motivo} | ${resumo}\n--- log da última tentativa ---\n${semTempoNemPid(ultima.log).slice(0, 4000)}`;
}
