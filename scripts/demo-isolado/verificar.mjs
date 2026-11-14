// B-SAN3-10b-F4-SEED-ISOLADO — verificador da demonstracao isolada (so leitura).
//
// Confere, pela API da pilha isolada e como o papel que vai olhar, cada pre-condicao de uma matriz. Nao
// escreve nada: toda leitura e GET, e o unico POST e o login (com o id da organizacao, sempre).
//
// Uso:
//   node scripts/demo-isolado/verificar.mjs --fixture <arquivo.json> --matriz <arquivo.tsv> \
//     --admin-plataforma <arquivo> --senhas <arquivo> --provisorias <diretorio>
//   ambiente: DEMO_ISOLADO_PROJETO e DEMO_ISOLADO_API, com as mesmas travas do motor.
//
// Matriz (TSV, UTF-8; linhas vazias e linhas que comecam com `#` sao ignoradas). Cabecalho obrigatorio:
//   passo  id  papel  leitura_api  esperado  assercao_tela  errata
//   - papel: `plataforma`, `admin` ou a `chave` de um usuario da fixture; `-` = sem login.
//   - leitura_api: `GET /api/v1/<caminho>`, ou `POST <o login> {…} + GET /api/v1/<caminho>` (entra como
//     o papel e le). `-` com esperado `-` = linha de tela, que e da execucao do roteiro e nao do verificador.
//     Placeholders, resolvidos pela API como o papel da linha (o de usuario, como admin):
//       {tenant:org}  {id:usuario:<email>}  {id:os:<titulo>}  {id:processo:<placa>}  {id:patio:<nome>}
//       {id:area:<patio>/<area>}  {id:perfil:<nome>}  {data:hoje}  {data:hoje-<n>d}  {data:hoje+<n>d}
//   - esperado: predicados ligados por " E ":
//       status=<n> · existe(<filtro>) · nenhum(<filtro>) · todos(<filtro>) · conta=<n> · conta>=<n>
//       conta(<filtro>)=<n> · conta(<filtro>)>=<n> · campo(<caminho>)=<valor> · campo(<caminho>)>=<n>
//       campo(<caminho>)≠vazio · sequencia(<campo>: v1,v2,…) · menu⊇{r1|r2} · menu∌{r1|r2}
//     `<caminho>: <filtro>` no lugar do filtro usa a lista desse caminho; `conta(<caminho>)` conta essa lista.
//     filtro: termos `campo=valor` separados por "; ". `~` compara sem espaco nem hifen, em maiusculas;
//     `≠vazio` exige presente e nao vazio; `∋` exige que o array contenha o valor; `>=` compara numero.
//     Dinheiro compara como numero ("754.00" = 754). Texto compara exato, com acento.
//
// Saida: `PRE <id> OK` ou `PRE <id> FALTA <motivo curto>` por linha, `VERIFICADOR tela=<n> (nao verificadas)` e
// `VERIFICADOR ok=<n> falta=<n>`. Codigos: 0 tudo OK · 1 erro (matriz ou fixture invalida, matriz sem linha) ·
// 2 trava de alvo · 3 censo · 4 senha ausente · 6 pelo menos 1 FALTA.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ErroTrava, avaliarAlvo, avaliarCenso, exigirSenha } from "./alvo.mjs";
import { ErroMotor, dataDeNegocio, itensDe, lerSenha, normalizarPlaca, validarFixture } from "./semear.mjs";

const FLAGS = ["--fixture", "--matriz", "--admin-plataforma", "--senhas", "--provisorias"];
const CABECALHO = ["passo", "id", "papel", "leitura_api", "esperado", "assercao_tela", "errata"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPO = /^[A-Za-z_][A-Za-z0-9_.]*$/;

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
    if (campos.length !== CABECALHO.length || campos.slice(0, 5).some((c) => c === "")) {
      throw new ErroMotor(1, `MATRIZ_INVALIDA linha ${i + 2}`);
    }
    const [passo, id, papel, leitura, esperado] = campos;
    if (ids.has(id)) throw new ErroMotor(1, `MATRIZ_INVALIDA id repetido ${id}`);
    ids.add(id);
    return { passo, id, papel, leitura, esperado, tela: leitura === "-" && esperado === "-" };
  });
  if (regras.filter((r) => !r.tela).length === 0) throw new ErroMotor(1, "MATRIZ_INVALIDA sem linhas do verificador");
  return regras;
}

// ---------------------------------------------------------------------------------------------------------
// Comparacao
// ---------------------------------------------------------------------------------------------------------
const campoDe = (obj, caminho) => caminho.split(".").reduce((v, k) => (v == null ? undefined : v[k]), obj);
const DECIMAL = /^(-?)([0-9]+)(?:[.]([0-9]+))?$/;

// Decimal como inteiro em BigInt com 6 casas: compara dinheiro e contagem sem converter para numero de ponto.
function escala(valor) {
  const m = DECIMAL.exec(String(valor).trim());
  if (!m) return null;
  const n = BigInt(`${m[2]}${(m[3] ?? "").padEnd(6, "0").slice(0, 6)}`);
  return m[1] === "-" ? -n : n;
}

export function igual(atual, esperado) {
  if (atual === undefined || atual === null) return false;
  if (String(atual) === esperado) return true;
  const a = escala(atual);
  const b = escala(esperado);
  return a !== null && b !== null && a === b;
}

const presente = (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
const normalizado = (v) => normalizarPlaca(v);

function confereTermo(item, termo) {
  if (termo.endsWith("≠vazio")) {
    const campo = termo.slice(0, -"≠vazio".length).trim();
    return CAMPO.test(campo) ? presente(campoDe(item, campo)) : null;
  }
  const m = /^([A-Za-z_][A-Za-z0-9_.]*)\s*(>=|∋|~|=)\s*(.*)$/.exec(termo);
  if (!m) return null;
  const [, campo, op, valor] = m;
  const atual = campoDe(item, campo);
  if (op === "=") return igual(atual, valor);
  if (op === "~") return presente(atual) && normalizado(atual) === normalizado(valor);
  if (op === "∋") return Array.isArray(atual) && atual.some((x) => String(typeof x === "object" && x !== null ? x.key ?? x.role ?? x.code ?? "" : x) === valor);
  const a = escala(atual);
  const b = escala(valor);
  return a !== null && b !== null && a >= b;
}

// Divide no nivel 0 de parenteses e chaves (os valores podem ter parenteses: "Fulana (Gestora)").
function dividir(texto, separador) {
  const partes = [];
  let nivel = 0;
  let inicio = 0;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === "(" || c === "{") nivel += 1;
    else if (c === ")" || c === "}") nivel -= 1;
    else if (nivel === 0 && texto.startsWith(separador, i)) {
      partes.push(texto.slice(inicio, i));
      inicio = i + separador.length;
      i += separador.length - 1;
    }
  }
  partes.push(texto.slice(inicio));
  return partes.map((p) => p.trim());
}

// `nome(argumento)resto`, com o parentese de fechamento casado.
function chamada(texto, nome) {
  if (!texto.startsWith(`${nome}(`)) return null;
  let nivel = 0;
  for (let i = nome.length; i < texto.length; i += 1) {
    if (texto[i] === "(") nivel += 1;
    else if (texto[i] === ")") {
      nivel -= 1;
      if (nivel === 0) return { arg: texto.slice(nome.length + 1, i), resto: texto.slice(i + 1).trim() };
    }
  }
  return null;
}

const dadoDe = (json) => (json && typeof json === "object" && !Array.isArray(json) && "data" in json ? json.data : json);

// `<caminho>: <filtro>` usa a lista do caminho; so `<caminho>` e a lista inteira; o resto e filtro da lista padrao.
function listaEFiltro(resposta, arg) {
  const comCaminho = /^([A-Za-z_][A-Za-z0-9_.]*):\s+(.+)$/.exec(arg);
  if (comCaminho) return { itens: campoDe(dadoDe(resposta.json), comCaminho[1]), termos: dividir(comCaminho[2], "; ") };
  if (CAMPO.test(arg.trim())) {
    const doCaminho = campoDe(dadoDe(resposta.json), arg.trim());
    if (Array.isArray(doCaminho)) return { itens: doCaminho, termos: [] };
  }
  return { itens: itensDe(resposta.json), termos: arg.trim() === "" ? [] : dividir(arg, "; ") };
}

function filtrar(itens, termos) {
  const saida = [];
  for (const item of itens) {
    const resultados = termos.map((t) => confereTermo(item, t));
    if (resultados.includes(null)) return null;
    if (resultados.every(Boolean)) saida.push(item);
  }
  return saida;
}

const rotulosDoMenu = (itens) => (itens ?? []).flatMap((i) => [i.label, ...rotulosDoMenu(i.children)]);

function compara(op, atual, numero) {
  const a = escala(atual);
  const b = escala(numero);
  if (a === null || b === null) return false;
  return op === ">=" ? a >= b : a === b;
}

// Avalia o esperado inteiro. Devolve null quando confere, ou o motivo curto da FALTA.
export function avaliarEsperado(esperado, resposta) {
  for (const predicado of dividir(esperado, " E ")) {
    const motivo = avaliarPredicado(predicado, resposta);
    if (motivo) return `${predicado.slice(0, 60)}: ${motivo}`;
  }
  return null;
}

function avaliarPredicado(p, resposta) {
  const st = /^status=([0-9]{3})$/.exec(p);
  if (st) return String(resposta.status) === st[1] ? null : `status=${resposta.status}`;
  if (resposta.status !== 200) return `status=${resposta.status}`;
  const menu = /^menu(⊇|∌)\{(.+)\}$/.exec(p);
  if (menu) {
    const presentes = new Set(rotulosDoMenu(itensDe(resposta.json)));
    const pedidos = menu[2].split("|").map((r) => r.trim());
    const errados = menu[1] === "⊇" ? pedidos.filter((r) => !presentes.has(r)) : pedidos.filter((r) => presentes.has(r));
    return errados.length ? `${menu[1] === "⊇" ? "sem" : "com"} ${errados.join(",")}` : null;
  }
  const seq = chamada(p, "sequencia");
  if (seq && seq.resto === "") {
    const m = /^([A-Za-z_][A-Za-z0-9_.]*):\s*(.+)$/.exec(seq.arg);
    const itens = itensDe(resposta.json);
    if (!m || !itens) return "sequencia invalida";
    const esperados = m[2].split(",").map((v) => v.trim());
    const conjunto = new Set(esperados);
    const obtidos = [...itens]
      .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))
      .map((i) => String(campoDe(i, m[1]) ?? ""))
      .filter((v) => conjunto.has(v));
    return obtidos.join(",") === esperados.join(",") ? null : `obtido ${obtidos.join(",")}`;
  }
  const campo = chamada(p, "campo");
  if (campo) {
    const atual = campoDe(dadoDe(resposta.json), campo.arg.trim());
    if (campo.resto === "≠vazio") return presente(atual) ? null : "vazio";
    const m = /^(>=|=)(.*)$/.exec(campo.resto);
    if (!m) return "campo invalido";
    if (m[1] === ">=") return compara(">=", atual, m[2]) ? null : `valor=${String(atual).slice(0, 30)}`;
    return igual(atual, m[2]) ? null : `valor=${String(atual).slice(0, 30)}`;
  }
  for (const nome of ["existe", "nenhum", "todos"]) {
    const c = chamada(p, nome);
    if (!c || c.resto !== "") continue;
    const { itens, termos } = listaEFiltro(resposta, c.arg);
    if (!Array.isArray(itens)) return "sem lista";
    const achados = filtrar(itens, termos);
    if (achados === null) return "filtro invalido";
    if (nome === "existe") return achados.length > 0 ? null : "nenhum item confere";
    if (nome === "nenhum") return achados.length === 0 ? null : `${achados.length} item(ns) conferem`;
    return itens.length > 0 && achados.length === itens.length ? null : `${itens.length - achados.length} de ${itens.length} nao conferem`;
  }
  const conta = chamada(p, "conta");
  const contaSimples = /^conta(>=|=)([0-9]+)$/.exec(p);
  if (conta || contaSimples) {
    let itens;
    let termos = [];
    let op;
    let numero;
    if (contaSimples) {
      itens = itensDe(resposta.json);
      [, op, numero] = contaSimples;
    } else {
      ({ itens, termos } = listaEFiltro(resposta, conta.arg));
      const m = /^(>=|=)([0-9]+)$/.exec(conta.resto);
      if (!m) return "conta invalida";
      [, op, numero] = m;
    }
    if (!Array.isArray(itens)) return "sem lista";
    const achados = filtrar(itens, termos);
    if (achados === null) return "filtro invalido";
    return compara(op, String(achados.length), numero) ? null : `conta=${achados.length}`;
  }
  return "predicado desconhecido";
}

// ---------------------------------------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------------------------------------
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

// Busca de id pela API, como o papel da linha (o de usuario, como admin). Devolve o id ou null.
const BUSCAS = {
  usuario: { rota: () => "/users", confere: (i, v) => String(i.email).toLowerCase() === v.toLowerCase(), papel: "admin" },
  os: { rota: (v) => `/work-orders?search=${encodeURIComponent(v)}&limit=100`, confere: (i, v) => i.title === v },
  processo: { rota: () => "/impound-processes?limit=100", confere: (i, v) => normalizarPlaca(i.vehiclePlate) === normalizarPlaca(v) },
  patio: { rota: () => "/yards?limit=100", confere: (i, v) => i.name === v },
  perfil: { rota: () => "/jurisdiction-profiles?limit=100", confere: (i, v) => i.name === v },
};

async function buscarId(ctx, papel, tipo, valor) {
  const chave = `${papel}|${tipo}|${valor}`;
  if (chave in ctx.ids) return ctx.ids[chave];
  let id = null;
  if (tipo === "area") {
    const corte = valor.indexOf("/");
    const patio = corte > 0 ? await buscarId(ctx, papel, "patio", valor.slice(0, corte)) : null;
    if (patio) {
      const s = await sessaoDe(ctx, papel);
      const r = s.ok ? await chamar(ctx, "GET", `/yards/${patio}/areas`, s.token) : { status: 0 };
      id = r.status === 200 ? (itensDe(r.json) ?? []).find((i) => i.name === valor.slice(corte + 1))?.id ?? null : null;
    }
  } else if (BUSCAS[tipo]) {
    const b = BUSCAS[tipo];
    const s = await sessaoDe(ctx, b.papel ?? papel);
    const r = s.ok ? await chamar(ctx, "GET", b.rota(valor), s.token) : { status: 0 };
    id = r.status === 200 ? (itensDe(r.json) ?? []).find((i) => b.confere(i, valor))?.id ?? null : null;
  }
  ctx.ids[chave] = id;
  return id;
}

// Troca os placeholders do texto. Devolve { texto } ou { falta }.
async function resolver(ctx, papel, texto, codificar) {
  let saida = "";
  let resto = texto;
  for (;;) {
    const m = /\{(tenant:org|id:([a-z]+):([^{}]+)|data:hoje(?:([+-])([0-9]{1,4})d)?)\}/.exec(resto);
    if (!m) return { texto: saida + resto };
    let valor;
    if (m[1] === "tenant:org") valor = ctx.orgId;
    else if (m[1].startsWith("data:")) valor = dataDeNegocio(m[4] ? Number.parseInt(`${m[4]}${m[5]}`, 10) : 0);
    else {
      if (papel === "-" && m[2] !== "usuario") return { falta: "placeholder sem login" };
      valor = await buscarId(ctx, papel === "-" ? "admin" : papel, m[2], m[3]);
      if (!valor) return { falta: `sem ${m[2]} ${m[3].slice(0, 40)}` };
    }
    saida += resto.slice(0, m.index) + (codificar ? encodeURIComponent(valor) : valor);
    resto = resto.slice(m.index + m[0].length);
  }
}

// O caminho da leitura, com a consulta codificada (a matriz escreve o texto cru: "search=Fulano Silva").
function montarCaminho(cru) {
  const [base, consulta] = cru.split(/\?(.*)/s);
  if (!consulta) return base;
  const pares = consulta.split("&").map((par) => {
    const i = par.indexOf("=");
    const k = i < 0 ? par : par.slice(0, i);
    const v = i < 0 ? "" : par.slice(i + 1);
    let cruV = v;
    try {
      cruV = decodeURIComponent(v);
    } catch {
      cruV = v;
    }
    return `${encodeURIComponent(k)}=${encodeURIComponent(cruV)}`;
  });
  return `${base}?${pares.join("&")}`;
}

async function verificarLinha(ctx, regra) {
  const login = /^POST \/api\/v1\/auth\/login\b.*\+\s*GET\s+(\/api\/v1\/\S.*)$/.exec(regra.leitura);
  const simples = /^GET\s+(\/api\/v1\/\S.*)$/.exec(regra.leitura);
  const leitura = login?.[1] ?? simples?.[1];
  if (!leitura) return "leitura nao suportada pelo verificador";
  let token;
  if (regra.papel !== "-") {
    const sessao = await sessaoDe(ctx, regra.papel);
    if (!sessao.ok) return `login ${regra.papel} status=${sessao.status}`;
    token = sessao.token;
  } else if (login) {
    return "login sem papel";
  }
  const caminho = await resolver(ctx, regra.papel, leitura.trim().replace(/^\/api\/v1/, ""), true);
  if (caminho.falta) return caminho.falta;
  const esperado = await resolver(ctx, regra.papel, regra.esperado, false);
  if (esperado.falta) return esperado.falta;
  return avaliarEsperado(esperado.texto, await chamar(ctx, "GET", montarCaminho(caminho.texto), token));
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
  const ctx = { fetch: opcoes.fetch ?? globalThis.fetch, base: String(base).replace(/\/+$/, ""), sessoes: {}, ids: {} };
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
    let tela = 0;
    for (const regra of regras) {
      if (regra.tela) {
        tela += 1;
        continue;
      }
      const motivo = await verificarLinha(ctx, regra);
      if (motivo) {
        falta += 1;
        escrever(`PRE ${regra.id} FALTA ${motivo}`);
      } else {
        ok += 1;
        escrever(`PRE ${regra.id} OK`);
      }
    }
    escrever(`VERIFICADOR tela=${tela} (nao verificadas)`);
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
