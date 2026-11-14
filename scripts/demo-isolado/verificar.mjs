// B-SAN3-10b-F4-SEED-ISOLADO — verificador da demonstracao isolada (so leitura).
//
// Confere, pela API da pilha isolada e como o papel que vai olhar, cada pre-condicao de uma matriz. Nao
// escreve nada: toda leitura e GET, e o unico POST e o login.
//
// Uso:
//   node scripts/demo-isolado/verificar.mjs --fixture <arquivo.json> --matriz <arquivo.tsv> \
//     --admin-plataforma <arquivo> --senhas <arquivo> --provisorias <diretorio>
//   ambiente: DEMO_ISOLADO_PROJETO e DEMO_ISOLADO_API, com as mesmas travas do motor.
//
// Matriz (TSV, UTF-8; linhas vazias e linhas que comecam com `#` sao ignoradas). Cabecalho obrigatorio:
//   passo<TAB>id<TAB>papel<TAB>leitura<TAB>esperado
//   - papel: `plataforma`, `admin` ou a `chave` de um usuario da fixture (o login daquele papel);
//   - leitura: `GET <caminho>`, relativo a `/api/v1`. `{org}` vira o id da organizacao da fixture, e
//     `{<caminho>#<campo>=<valor>}` vira o `id` do 1o item daquela lista cujo campo tem aquele valor;
//   - esperado, uma das formas:
//       `existe <campo>=<valor> & <campo>=<valor>`  algum item da lista tem todos os pares
//       `minimo <n>`                                 a lista tem pelo menos n itens
//       `campo <caminho>=<valor>`                    o objeto da resposta tem o campo com o valor
//       `status <n>`                                 a resposta tem esse status HTTP
//       `menu tem=<a>,<b> nao_tem=<c>`               o menu do servidor (por caminho) tem e nao tem esses itens
//     `<campo>` aceita ponto (`operator.email`); o valor `*` aceita qualquer valor nao vazio.
//
// Saida: `PRE <id> OK` ou `PRE <id> FALTA <motivo curto>` por linha, e `VERIFICADOR ok=<n> falta=<n>`.
// Codigos: 0 tudo OK · 1 erro (matriz invalida ou vazia, fixture invalida) · 2 trava de alvo · 3 censo ·
// 4 senha ausente · 6 pelo menos 1 FALTA.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ErroTrava, avaliarAlvo, avaliarCenso, exigirSenha } from "./alvo.mjs";
import { ErroMotor, itensDe, lerSenha, validarFixture } from "./semear.mjs";

const FLAGS = ["--fixture", "--matriz", "--admin-plataforma", "--senhas", "--provisorias"];
const CABECALHO = ["passo", "id", "papel", "leitura", "esperado"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lerArgumentos(argv) {
  const lido = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!FLAGS.includes(argv[i]) || argv[i] in lido || argv[i + 1] === undefined) return null;
    lido[argv[i]] = argv[i + 1];
  }
  return lido;
}

export function lerMatriz(conteudo) {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "" && !l.trimStart().startsWith("#"));
  if (linhas.length === 0) throw new ErroMotor(1, "MATRIZ_INVALIDA vazia");
  const cabecalho = linhas[0].split("\t").map((c) => c.trim());
  if (cabecalho.join("|") !== CABECALHO.join("|")) throw new ErroMotor(1, "MATRIZ_INVALIDA cabecalho");
  const ids = new Set();
  const regras = linhas.slice(1).map((linha, i) => {
    const campos = linha.split("\t").map((c) => c.trim());
    if (campos.length !== CABECALHO.length || campos.some((c) => c === "")) {
      throw new ErroMotor(1, `MATRIZ_INVALIDA linha ${i + 2}`);
    }
    const [passo, id, papel, leitura, esperado] = campos;
    if (ids.has(id)) throw new ErroMotor(1, `MATRIZ_INVALIDA id repetido ${id}`);
    ids.add(id);
    return { passo, id, papel, leitura, esperado };
  });
  if (regras.length === 0) throw new ErroMotor(1, "MATRIZ_INVALIDA sem linhas");
  return regras;
}

const campoDe = (obj, caminho) => caminho.split(".").reduce((v, k) => (v == null ? undefined : v[k]), obj);
const confere = (v, esperado) => (esperado === "*" ? v !== undefined && v !== null && String(v) !== "" : String(v) === esperado);

function pares(texto) {
  return texto.split("&").map((p) => {
    const i = p.indexOf("=");
    if (i <= 0) return null;
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  });
}

const caminhosDoMenu = (itens) => (itens ?? []).flatMap((i) => [i.path, i.id, ...caminhosDoMenu(i.children)]);

// Avalia uma linha. Devolve null quando confere, ou o motivo curto da FALTA.
export function avaliarEsperado(esperado, resposta) {
  const espaco = esperado.indexOf(" ");
  const forma = espaco < 0 ? esperado : esperado.slice(0, espaco);
  const resto = espaco < 0 ? "" : esperado.slice(espaco + 1).trim();
  if (forma === "status") return String(resposta.status) === resto ? null : `status=${resposta.status}`;
  if (resposta.status !== 200) return `status=${resposta.status}`;
  if (forma === "minimo") {
    const itens = itensDe(resposta.json);
    if (!itens) return "sem lista";
    return itens.length >= Number.parseInt(resto, 10) ? null : `itens=${itens.length}`;
  }
  if (forma === "existe") {
    const itens = itensDe(resposta.json);
    if (!itens) return "sem lista";
    const ps = pares(resto);
    if (ps.some((p) => p === null)) return "esperado invalido";
    return itens.some((item) => ps.every(([c, v]) => confere(campoDe(item, c), v))) ? null : "nenhum item confere";
  }
  if (forma === "campo") {
    const ps = pares(resto);
    if (ps.length !== 1 || ps[0] === null) return "esperado invalido";
    const obj = resposta.json && typeof resposta.json === "object" && "data" in resposta.json ? resposta.json.data : resposta.json;
    return confere(campoDe(obj, ps[0][0]), ps[0][1]) ? null : `${ps[0][0]} difere`;
  }
  if (forma === "menu") {
    const presentes = new Set(caminhosDoMenu(itensDe(resposta.json)));
    const tem = (/(?:^|\s)tem=(\S+)/.exec(resto)?.[1] ?? "").split(",").filter(Boolean);
    const naoTem = (/(?:^|\s)nao_tem=(\S+)/.exec(resto)?.[1] ?? "").split(",").filter(Boolean);
    if (tem.length + naoTem.length === 0) return "esperado invalido";
    const falta = tem.filter((p) => !presentes.has(p));
    const sobra = naoTem.filter((p) => presentes.has(p));
    if (falta.length) return `menu sem ${falta.join(",")}`;
    if (sobra.length) return `menu com ${sobra.join(",")}`;
    return null;
  }
  return "esperado invalido";
}

async function chamar(ctx, metodo, caminho, token, corpo) {
  const headers = { accept: "application/json" };
  if (corpo !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await ctx.fetch(`${ctx.base}/api/v1${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const bruto = await r.text();
  let json = null;
  try {
    json = bruto ? JSON.parse(bruto) : null;
  } catch {
    json = null;
  }
  return { status: r.status, json };
}

// O UNICO ponto que entra na API. Todo login manda o id da organizacao (a API recusa sem ele).
async function entrar(ctx, email, senha, tenantId) {
  const corpo = { email, password: senha, tenantId };
  const r = await chamar(ctx, "POST", "/auth/login", null, corpo);
  const token = r.status === 200 ? r.json?.data?.access_token : undefined;
  return token ? { ok: true, token } : { ok: false, status: r.status };
}

async function sessaoDe(ctx, papel) {
  if (papel in ctx.sessoes) return ctx.sessoes[papel];
  const f = ctx.fixture;
  let sessao;
  if (papel === "plataforma") sessao = await entrar(ctx, f.plataforma.email, ctx.senhaPlataforma, ctx.plataformaId);
  else if (papel === "admin") sessao = await entrar(ctx, f.admin.email, ctx.senhaDemo, ctx.orgId);
  else {
    const u = f.usuarios.find((x) => x.chave === papel);
    sessao = u ? await entrar(ctx, u.email, ctx.senhaDemo, ctx.orgId) : { ok: false, status: "papel fora da fixture" };
  }
  ctx.sessoes[papel] = sessao;
  return sessao;
}

// `{org}` e `{<caminho>#<campo>=<valor>}` na leitura.
async function resolverLeitura(ctx, sessao, caminho) {
  let saida = caminho.replaceAll("{org}", ctx.orgId);
  for (const m of [...saida.matchAll(/\{([^{}#]+)#([^{}=]+)=([^{}]*)\}/g)]) {
    const [inteiro, lista, campo, valor] = m;
    const r = await chamar(ctx, "GET", lista, sessao.token);
    const item = r.status === 200 ? (itensDe(r.json) ?? []).find((i) => confere(campoDe(i, campo), valor)) : undefined;
    if (!item?.id) return { falta: `sem item ${campo}=${valor} em ${lista.split("?")[0]}` };
    saida = saida.replace(inteiro, encodeURIComponent(item.id));
  }
  return { caminho: saida };
}

export async function verificar(opcoes = {}) {
  const argv = opcoes.argv ?? process.argv.slice(2);
  const escrever = opcoes.escrever ?? ((linha) => console.log(linha));
  const base = process.env.DEMO_ISOLADO_API;
  const veredito = avaliarAlvo(process.env, base);
  if (!veredito.ok) {
    escrever(`VERIFICADOR RECUSA ${veredito.motivo}`);
    return veredito.codigo;
  }
  const args = lerArgumentos(argv);
  if (!args) {
    escrever("VERIFICADOR RECUSA ARGUMENTO_RECUSADO");
    return 2;
  }
  const ctx = { fetch: opcoes.fetch ?? globalThis.fetch, base: String(base).replace(/\/+$/, ""), sessoes: {} };
  try {
    ctx.senhaPlataforma = exigirSenha(lerSenha(args["--admin-plataforma"]));
    ctx.senhaDemo = exigirSenha(lerSenha(args["--senhas"]));
    let fixture;
    let regras;
    try {
      fixture = JSON.parse(fs.readFileSync(String(args["--fixture"] ?? ""), "utf8"));
    } catch {
      throw new ErroMotor(1, "FIXTURE_ILEGIVEL");
    }
    const falhas = validarFixture(fixture);
    if (falhas.length) throw new ErroMotor(1, `FIXTURE_INVALIDA ${falhas.slice(0, 5).join(", ")}`);
    ctx.fixture = fixture;
    try {
      regras = lerMatriz(fs.readFileSync(String(args["--matriz"] ?? ""), "utf8"));
    } catch (erro) {
      if (erro instanceof ErroMotor) throw erro;
      throw new ErroMotor(1, "MATRIZ_ILEGIVEL");
    }
    const dir = String(args["--provisorias"] ?? "");
    try {
      ctx.plataformaId = dir ? fs.readFileSync(path.join(dir, "plataforma.tenant-id"), "utf8") : "";
    } catch {
      ctx.plataformaId = "";
    }
    if (!UUID.test(ctx.plataformaId)) throw new ErroMotor(3, "FUNDACAO_AUSENTE");

    const plataforma = await sessaoDe(ctx, "plataforma");
    if (!plataforma.ok) throw new ErroMotor(1, `ACESSO_NEGADO papel=plataforma rota=login status=${plataforma.status}`);
    const visao = await chamar(ctx, "GET", "/platform/overview", plataforma.token);
    if (visao.status !== 200) throw new ErroMotor(1, `HTTP_${visao.status} papel=plataforma rota=GET /platform/overview`);
    const orgs = Array.isArray(visao.json?.data?.orgs) ? visao.json.data.orgs : [];
    const censo = visao.json?.data?.totalOrgs === 0 ? { ok: false, codigo: 3, motivo: "PERSISTENCIA_NAO_REAL" } : avaliarCenso(orgs, fixture.organizacao.nome, "motor");
    if (!censo.ok) throw new ErroMotor(censo.codigo, censo.motivo);
    ctx.orgId = censo.existente.id;

    let ok = 0;
    let falta = 0;
    for (const regra of regras) {
      let motivo = null;
      if (!regra.leitura.startsWith("GET /")) motivo = "leitura nao e GET";
      const sessao = motivo ? null : await sessaoDe(ctx, regra.papel);
      if (!motivo && !sessao.ok) motivo = `login ${regra.papel} status=${sessao.status}`;
      if (!motivo) {
        const alvo = await resolverLeitura(ctx, sessao, regra.leitura.slice(4).trim());
        if (alvo.falta) motivo = alvo.falta;
        else motivo = avaliarEsperado(regra.esperado, await chamar(ctx, "GET", alvo.caminho, sessao.token));
      }
      if (motivo) {
        falta += 1;
        escrever(`PRE ${regra.id} FALTA ${motivo}`);
      } else {
        ok += 1;
        escrever(`PRE ${regra.id} OK`);
      }
    }
    escrever(`VERIFICADOR ok=${ok} falta=${falta}`);
    return falta > 0 ? 6 : 0;
  } catch (erro) {
    if (erro instanceof ErroTrava || erro instanceof ErroMotor) {
      escrever(`VERIFICADOR ${erro.codigo === 1 ? "ERRO" : "RECUSA"} ${erro.motivo}`);
      return erro.codigo;
    }
    escrever(`VERIFICADOR ERRO inesperado ${String(erro?.name ?? "Error")}`);
    return 1;
  }
}

function ehPrincipal() {
  if (!process.argv[1]) return false;
  try {
    const aqui = fs.realpathSync(fileURLToPath(import.meta.url));
    return aqui.toLowerCase() === fs.realpathSync(process.argv[1]).toLowerCase();
  } catch {
    return false;
  }
}

if (ehPrincipal()) {
  process.exitCode = await verificar();
}
