// B-SAN3-10b-F4-SEED-ISOLADO — travas puras da demonstracao isolada (item 44 do portao).
//
// Este modulo decide SE a fundacao (`fundacao.ts`) e o motor (`semear.mjs`) podem rodar, antes de
// qualquer conexao. Ele nao fala com rede nem com banco: so le o ambiente, a URL, o argv e o disco
// do diretorio de saida de segredos. Tudo aqui e fail-closed: o que nao e reconhecido recusa.
//
// Codigos de saida devolvidos em `{ ok: false, codigo, motivo }`:
//   2 — ambiente, alvo, Redis, projeto ou argumento recusados (nada saiu do processo)
//   3 — censo: base sem a organizacao de plataforma, base nao virgem, plataforma real, trava ocupada
//   4 — segredo: senha ausente, ou diretorio de saida ausente ou sem escrita
//
// O motor so aceita a API da pilha isolada; a fundacao so aceita o Postgres e o Redis da pilha
// isolada (ou de um cluster descartavel no host, na faixa de portas abaixo). Nao ha valor padrao
// para nenhuma URL, e nao ha escape para producao.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export class ErroTrava extends Error {
  constructor(codigo, motivo) {
    super(motivo);
    this.codigo = codigo;
    this.motivo = motivo;
  }
}

const recusa = (codigo, motivo) => ({ ok: false, codigo, motivo });

const PORTA_MIN = 3101;
const PORTA_MAX = 3199;
const PREFIXOS_PROJETO = ["b10b-", "demo-isolado-"];
const PG_PORTA_MIN = 55500;
const PG_PORTA_MAX = 55599;
const REDIS_PORTA_MIN = 6500;
const REDIS_PORTA_MAX = 6599;
const MIN_USUARIOS_PLATAFORMA = 1;
const FLAGS_FUNDACAO = ["--fixture", "--saida-segredo"];

// O parser de URL que o driver do produto usa de fato: `@prisma/adapter-pg` -> `pg` -> `pg-connection-string`.
// Resolvido pela mesma cadeia que o driver carrega (o `pg` nao e dependencia direta do repositorio).
export function parserDoDriver() {
  const daqui = createRequire(import.meta.url);
  const doAdaptador = createRequire(daqui.resolve("@prisma/adapter-pg"));
  const doPg = createRequire(doAdaptador.resolve("pg"));
  return doPg("pg-connection-string").parse;
}

// A fundacao so aceita `--fixture <valor>` e `--saida-segredo <valor>`, cada uma no maximo 1 vez.
// Chamada com `process.argv.slice(2)` antes de qualquer outro import. A mensagem nao ecoa o argumento.
export function avaliarArgumentos(argv) {
  const lido = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!FLAGS_FUNDACAO.includes(argv[i])) return recusa(2, "ARGUMENTO_RECUSADO");
    if (argv[i + 1] === undefined || argv[i] in lido) return recusa(2, "ARGUMENTO_RECUSADO");
    lido[argv[i]] = argv[i + 1];
  }
  return { ok: true, lido };
}

function avaliarAmbiente(env) {
  if (env.NODE_ENV === "production") return recusa(2, "AMBIENTE_PRODUCAO");
  return null;
}

function avaliarProjeto(env) {
  const p = String(env.DEMO_ISOLADO_PROJETO ?? "");
  const prefixo = PREFIXOS_PROJETO.find((x) => p.startsWith(x));
  if (!prefixo || !/^[a-z0-9-]{1,40}$/.test(p.slice(prefixo.length))) return recusa(2, "PROJETO_RECUSADO");
  return { ok: true };
}

// Motor: a API so pode ser `http://api:3000` (rede do projeto) ou `http://127.0.0.1:<3101-3199>`.
export function avaliarAlvo(env, base) {
  const amb = avaliarAmbiente(env);
  if (amb) return amb;
  let url;
  try {
    url = new URL(String(base ?? ""));
  } catch {
    return recusa(2, "ALVO_RECUSADO");
  }
  if (url.protocol !== "http:") return recusa(2, "ALVO_RECUSADO");
  const porta = Number(url.port);
  const naRede = url.hostname === "api" && url.port === "3000";
  const noHost = url.hostname === "127.0.0.1" && porta >= PORTA_MIN && porta <= PORTA_MAX;
  if (!naRede && !noHost) return recusa(2, "ALVO_RECUSADO");
  return avaliarProjeto(env);
}

function destinoPermitido(host, porta, banco) {
  if (!/^[0-9]{1,5}$/.test(porta)) return false;
  if (host === "postgres" && porta === "5432" && banco === "erp_techsolutions") return true;
  const n = Number(porta);
  return host === "127.0.0.1" && n >= PG_PORTA_MIN && n <= PG_PORTA_MAX && /^[a-z0-9_]{1,63}$/.test(banco);
}

// Fundacao: Postgres e Redis da pilha isolada, conferidos no texto bruto, no `new URL` e no parser do driver.
export function avaliarAlvoBanco(env, parse = parserDoDriver()) {
  const amb = avaliarAmbiente(env);
  if (amb) return amb;
  if (env.DOTENV_CONFIG_OVERRIDE != null || env.DOTENV_CONFIG_PATH != null) return recusa(2, "ALVO_RECUSADO");
  const bruto = String(env.DATABASE_URL ?? "");
  if (/[?#]/.test(bruto)) return recusa(2, "ALVO_RECUSADO");
  let url;
  try {
    url = new URL(bruto);
  } catch {
    return recusa(2, "ALVO_RECUSADO");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return recusa(2, "ALVO_RECUSADO");
  if (!destinoPermitido(url.hostname, url.port, url.pathname.slice(1))) return recusa(2, "ALVO_RECUSADO");
  const lido = parse(bruto);
  if (!destinoPermitido(String(lido.host ?? ""), String(lido.port ?? ""), String(lido.database ?? ""))) return recusa(2, "ALVO_RECUSADO");
  const redisBruto = String(env.REDIS_URL ?? "");
  let redis;
  try {
    redis = new URL(redisBruto);
  } catch {
    return recusa(2, "REDIS_RECUSADO");
  }
  if (redis.protocol !== "redis:" || /[?#]/.test(redisBruto)) return recusa(2, "REDIS_RECUSADO");
  const rp = Number(redis.port);
  const redisNaRede = redis.hostname === "redis" && redis.port === "6379";
  const redisNoHost = redis.hostname === "127.0.0.1" && rp >= REDIS_PORTA_MIN && rp <= REDIS_PORTA_MAX;
  if (!redisNaRede && !redisNoHost) return recusa(2, "REDIS_RECUSADO");
  return avaliarProjeto(env);
}

// Censo (logica pura, usada pela fundacao e pelo motor). `orgs` = [{ slug, name }].
// Permitidas: exatamente 1 `platform` e no maximo 1 organizacao com o nome da fixture.
export function avaliarCenso(orgs, nomeFixture, papel) {
  if (orgs.length === 0) return recusa(3, "PERSISTENCIA_NAO_REAL");
  if (!orgs.some((o) => o.slug === "platform")) return recusa(3, "BASE_SEM_OP6");
  const estranhas = orgs.filter((o) => o.slug !== "platform" && o.name !== nomeFixture);
  const mesmas = orgs.filter((o) => o.name === nomeFixture);
  if (estranhas.length > 0 || mesmas.length > 1) return recusa(3, "ALVO_NAO_VIRGEM");
  if (mesmas.length === 0 && papel === "motor") return recusa(3, "FUNDACAO_AUSENTE");
  return { ok: true, existente: mesmas[0] ?? null };
}

// Plataforma real: a organizacao de plataforma tem de ter ao menos 1 usuario, e todos com e-mail `.invalid`.
export function avaliarPlataforma(emailsPlataforma) {
  if (emailsPlataforma.length < MIN_USUARIOS_PLATAFORMA) return recusa(3, "BASE_SEM_OP6");
  const foraDeInvalid = emailsPlataforma.filter((e) => !/\.invalid$/.test(e));
  if (foraDeInvalid.length > 0) return recusa(3, "PLATAFORMA_REAL");
  return { ok: true };
}

export function exigirSenha(senha) {
  if (!senha) throw new ErroTrava(4, "SENHA_AUSENTE");
  return senha;
}

// Reconferencia depois do import do Prisma: o alvo nao pode ter mudado desde a avaliacao.
export function alvoMudou(env, avaliado) {
  return env.DATABASE_URL !== avaliado.DATABASE_URL || env.REDIS_URL !== avaliado.REDIS_URL;
}

// Sonda de escrita no diretorio de saida de segredos, antes de conectar. Nao deixa arquivo.
export function sondarSaida(dir) {
  if (!dir) return recusa(4, "SAIDA_SEGREDO_AUSENTE");
  const sonda = path.join(dir, `.sonda-${process.pid}`);
  try {
    fs.writeFileSync(sonda, "", { flag: "wx" });
    fs.unlinkSync(sonda);
  } catch {
    return recusa(4, "SAIDA_SEGREDO_AUSENTE");
  }
  return { ok: true };
}

// Trava de execucao unica, por arquivo (sem SQL). Pega antes de qualquer `await`; solta no `finally`.
export function adquirirTrava(dir) {
  const trava = path.join(dir, "fundacao.trava");
  try {
    fs.writeFileSync(trava, String(process.pid), { flag: "wx" });
  } catch {
    return recusa(3, "FUNDACAO_EM_CURSO");
  }
  return { ok: true, soltar: () => fs.rmSync(trava, { force: true }) };
}
