// B-SAN3-10b-F4-SEED-ISOLADO — motor da demonstracao isolada (item 44 do portao).
//
// Monta, SO PELA API da pilha isolada, o estado de dados que o roteiro de demonstracao pede, depois que a
// fundacao (`fundacao.ts`) criou a organizacao e o administrador dela. O motor nao fala com banco: toda
// escrita passa pelas rotas do produto, com o papel que a faria no produto.
//
// Uso (dentro da rede do projeto isolado):
//   node scripts/demo-isolado/semear.mjs --fixture <arquivo.json> --admin-plataforma <arquivo> \
//     --senhas <arquivo> --provisorias <diretorio> [--so-censo]
//   ambiente: DEMO_ISOLADO_PROJETO (b10b-… ou demo-isolado-…) e DEMO_ISOLADO_API (http://api:3000 ou
//   http://127.0.0.1:<3101-3199>). Nenhum dos dois tem valor padrao.
//
// Entradas de segredo: `--admin-plataforma` e `--senhas` sao arquivos cuja 1a linha e a senha (a mesma
// regra de leitura do bootstrap da plataforma). `--provisorias` e o diretorio de saida da fundacao: dele
// vem o id da organizacao de plataforma (`plataforma.tenant-id`) e as senhas provisorias
// (`<e-mail>.provisoria`), que o motor apaga quando a troca termina. Nada disso vai para a saida.
//
// Etapas: ET1 troca da provisoria do admin · ET2 usuarios por papel · ET3 cadastros · ET4 perfil normativo,
// patios, areas e vagas · ET5 processos de patio (recepcao, vaga, vistoria, fotos, custodia, encargos) ·
// ET6 localizacao, OS, atribuicao e os passos do app · ET7 contas, titulos, baixas e conciliacao · ET8 marcador.
//
// Codigos de saida:
//   0 concluido · 1 erro inesperado (sem corpo de resposta nem segredo na mensagem) · 2 trava de ambiente,
//   alvo, projeto ou argumento (nada saiu do processo) · 3 censo: fundacao ausente, base nao virgem ou
//   API sem persistencia real · 4 senha ausente · 5 ESTADO_INESPERADO <etapa> (o motor nao forca estado)
//
// Idempotencia: toda escrita e precedida de uma leitura pela chave natural (`garantir`), e toda mudanca de
// situacao so sai se a situacao lida for a anterior ao passo (`avancarSituacao`). A 2a execucao com a mesma
// fixture faz 0 escritas e imprime `criados=0`, inclusive depois de a API reiniciar: o motor nunca confia no
// recibo do sync (que vive na memoria do processo da API) e nunca cria OS pelo sync.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ErroTrava, avaliarAlvo, avaliarCenso, exigirSenha } from "./alvo.mjs";

export class ErroMotor extends Error {
  constructor(codigo, motivo) {
    super(motivo);
    this.codigo = codigo;
    this.motivo = motivo;
  }
}

const FLAGS_COM_VALOR = ["--fixture", "--admin-plataforma", "--senhas", "--provisorias"];
const FLAGS_SEM_VALOR = ["--so-censo"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DINHEIRO = /^[0-9]{1,12}[.][0-9]{2}$/;
const LIMITE_LISTA = 100;
const MAX_PAGINAS = 50;
const CAMINHO_OS = ["open", "assigned", "accepted", "on_route", "on_site", "in_progress", "completed"];
const CAMINHO_PROCESSO = ["IN_REMOVAL", "RECEPTION", "ACTIVE_CUSTODY"];
const CAMINHO_TITULO = ["open", "paid"];
const CONJUNTOS_DE_FOTO = ["FRONT", "REAR", "LEFT", "RIGHT", "ROOF", "DASH_PANEL", "ENGINE", "CHASSIS_ID", "ODOMETER", "INNER_OBJECTS", "DAMAGES"];
// A foto da vistoria e so uma URL (o produto nao guarda o binario dela). Dominio reservado: nunca resolve.
const BASE_DAS_FOTOS = "https://fotos.exemplo.invalid";
const CHAVE_MARCADOR = "demo_isolado.fixture_sha256";
// Os dados minimos da vistoria que a fixture nao declarar: texto honesto, nunca um estado inventado.
const VISTORIA_PADRAO = {
  lataria: "Nao informado",
  pintura: "Nao informado",
  pneus: "Nao informado",
  objetos_internos: "Nao informado",
  equipamentos_faltando: "Nao informado",
  assinatura: "ABSENT",
};
const CAMPOS_VISTORIA = [
  ["lataria", "bodywork_state", "bodyworkState"],
  ["pintura", "paint_state", "paintState"],
  ["pneus", "tires_state", "tiresState"],
  ["objetos_internos", "internal_objects", "internalObjects"],
  ["equipamentos_faltando", "missing_equipment", "missingEquipment"],
  ["assinatura", "signature_status", "signatureStatus"],
  ["agente", "agent_name", "agentName"],
];

export function lerArgumentos(argv) {
  const lido = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (FLAGS_SEM_VALOR.includes(flag)) {
      if (flag in lido) return null;
      lido[flag] = true;
      continue;
    }
    if (!FLAGS_COM_VALOR.includes(flag) || flag in lido || argv[i + 1] === undefined) return null;
    lido[flag] = argv[i + 1];
    i += 1;
  }
  return lido;
}

// A 1a linha do arquivo, pela mesma regra do bootstrap da plataforma. Arquivo ausente = vazio (a trava decide).
export function lerSenha(arquivo) {
  if (!arquivo) return "";
  try {
    return fs.readFileSync(arquivo, "utf8").split(/\r?\n/)[0] ?? "";
  } catch {
    return "";
  }
}

export const normalizarPlaca = (p) => String(p ?? "").replace(/[\s-]/g, "").toUpperCase();

// Data de negocio em America/Sao_Paulo (nunca UTC puro), deslocada em dias. Nenhuma data de sistema e recuada.
export function dataDeNegocio(dias, agora = new Date()) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
  const [a, m, d] = hoje.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------------------------------------
// Fixture: esquema escrito em codigo (sem dependencia nova), validado antes de qualquer chamada. As chaves de
// topo sao as do overlay do roteiro; todas, menos as 4 primeiras, sao opcionais.
// ---------------------------------------------------------------------------------------------------------
const texto = (v) => typeof v === "string" && v.trim().length > 0;
const lista = (v) => (Array.isArray(v) ? v : []);
const inteiro = (v) => typeof v === "number" && Number.isInteger(v);

export function validarFixture(f) {
  const falhas = [];
  const exige = (ok, campo) => {
    if (!ok) falhas.push(campo);
  };
  if (!f || typeof f !== "object" || Array.isArray(f)) return ["raiz"];
  exige(texto(f.organizacao?.nome), "organizacao.nome");
  exige(texto(f.admin?.nome), "admin.nome");
  exige(texto(f.admin?.email), "admin.email");
  exige(texto(f.plataforma?.email), "plataforma.email");
  exige(Array.isArray(f.usuarios), "usuarios");
  const chaves = new Set(["admin"]);
  for (const [i, u] of lista(f.usuarios).entries()) {
    exige(texto(u?.chave) && /^[a-z][a-z0-9_]{0,30}$/.test(u.chave) && u.chave !== "plataforma", `usuarios[${i}].chave`);
    exige(!chaves.has(u?.chave), `usuarios[${i}].chave repetida`);
    chaves.add(u?.chave);
    exige(texto(u?.nome) && texto(u?.email) && texto(u?.papel), `usuarios[${i}]`);
  }
  const usuario = (c) => chaves.has(c);
  const papelDe = (c) => lista(f.usuarios).find((u) => u.chave === c)?.papel;
  const nomes = (k, campo = "nome") => new Set(lista(f[k]).map((x) => x?.[campo]));
  const dinheiro = (v, campo) => exige(typeof v === "string" && DINHEIRO.test(v), campo);
  for (const [i, x] of lista(f.clientes).entries()) exige(texto(x?.nome), `clientes[${i}].nome`);
  for (const [i, x] of lista(f.viaturas).entries()) exige(texto(x?.placa), `viaturas[${i}].placa`);
  for (const [i, x] of lista(f.equipes).entries()) {
    exige(texto(x?.nome), `equipes[${i}].nome`);
    for (const m of lista(x?.membros)) exige(usuario(m), `equipes[${i}].membros ${m}`);
  }
  for (const [i, x] of lista(f.servicos).entries()) {
    exige(texto(x?.nome), `servicos[${i}].nome`);
    if (x?.preco_base !== undefined) dinheiro(x.preco_base, `servicos[${i}].preco_base`);
  }
  const servicos = nomes("servicos");
  for (const [i, x] of lista(f.tabelas).entries()) {
    exige(texto(x?.nome) && texto(x?.moeda), `tabelas[${i}]`);
    for (const [j, t] of lista(x?.tarifas).entries()) {
      exige(texto(t?.nome) && servicos.has(t?.servico) && texto(t?.origem), `tabelas[${i}].tarifas[${j}]`);
      dinheiro(t?.valor, `tabelas[${i}].tarifas[${j}].valor`);
    }
  }
  for (const [i, x] of lista(f.perfis_normativos).entries()) {
    exige(texto(x?.nome) && texto(x?.escopo), `perfis_normativos[${i}]`);
    for (const r of lista(x?.requisitos_liberacao)) exige(texto(r?.codigo) && texto(r?.rotulo), `perfis_normativos[${i}].requisitos_liberacao`);
  }
  const vagas = new Set();
  for (const [i, p] of lista(f.patios).entries()) {
    exige(texto(p?.nome) && texto(p?.endereco) && texto(p?.fuso), `patios[${i}]`);
    for (const a of lista(p?.areas)) {
      exige(texto(a?.nome) && texto(a?.tipo), `patios[${i}].areas`);
      for (const v of lista(a?.vagas)) {
        exige(texto(v?.codigo) && !vagas.has(`${p?.nome}/${v?.codigo}`), `patios[${i}].vagas ${v?.codigo}`);
        vagas.add(`${p?.nome}/${v?.codigo}`);
      }
    }
  }
  const perfis = nomes("perfis_normativos");
  const placas = new Set();
  for (const [i, x] of lista(f.processos).entries()) {
    exige(texto(x?.placa) && !placas.has(normalizarPlaca(x?.placa)), `processos[${i}].placa`);
    placas.add(normalizarPlaca(x?.placa));
    exige(perfis.has(x?.perfil) && texto(x?.autoridade), `processos[${i}].perfil/autoridade`);
    exige(!x?.vaga || vagas.has(`${x?.patio}/${x?.vaga}`), `processos[${i}].vaga`);
    exige(CAMINHO_PROCESSO.slice(1).includes(x?.situacao_final ?? "RECEPTION"), `processos[${i}].situacao_final`);
    for (const fo of lista(x?.vistoria?.fotos)) exige(CONJUNTOS_DE_FOTO.includes(fo?.set), `processos[${i}].vistoria.fotos ${fo?.set}`);
    const descricoes = new Set();
    for (const e of lista(x?.encargos)) {
      exige(texto(e?.tipo) && texto(e?.descricao) && !descricoes.has(e?.descricao), `processos[${i}].encargos ${e?.descricao}`);
      descricoes.add(e?.descricao);
      dinheiro(e?.valor, `processos[${i}].encargos.valor`);
    }
  }
  for (const [i, l] of lista(f.localizacoes).entries()) {
    exige(usuario(l?.usuario) && typeof l?.latitude === "number" && typeof l?.longitude === "number", `localizacoes[${i}]`);
  }
  const clientes = nomes("clientes");
  const viaturas = new Set(lista(f.viaturas).map((v) => normalizarPlaca(v?.placa)));
  const equipes = nomes("equipes");
  const titulosOs = new Set();
  for (const [i, o] of lista(f.ordens_de_servico).entries()) {
    exige(texto(o?.titulo) && !titulosOs.has(o?.titulo), `ordens_de_servico[${i}].titulo`);
    titulosOs.add(o?.titulo);
    exige(usuario(o?.criada_por), `ordens_de_servico[${i}].criada_por`);
    exige(!o?.cliente || clientes.has(o.cliente), `ordens_de_servico[${i}].cliente`);
    exige(!o?.viatura || viaturas.has(normalizarPlaca(o.viatura)), `ordens_de_servico[${i}].viatura`);
    exige(!o?.equipe || equipes.has(o.equipe), `ordens_de_servico[${i}].equipe`);
    exige(!o?.servico || servicos.has(o.servico), `ordens_de_servico[${i}].servico`);
    if (o?.atribuicao) {
      exige(usuario(o.atribuicao.por) && usuario(o.atribuicao.tecnica), `ordens_de_servico[${i}].atribuicao`);
      exige(papelDe(o.atribuicao.tecnica) === "field_technician", `ordens_de_servico[${i}].atribuicao.tecnica`);
    }
    const passos = lista(o?.passos_do_app).map((p) => p?.para);
    exige(passos.length === 0 || o?.atribuicao, `ordens_de_servico[${i}].passos sem atribuicao`);
    exige(passos.every((p, j) => p === CAMINHO_OS[2 + j]), `ordens_de_servico[${i}].passos_do_app fora do caminho`);
    exige(!passos.includes("on_site") || texto(o?.placa_atendida), `ordens_de_servico[${i}].placa_atendida`);
  }
  const contas = nomes("contas");
  for (const [i, c] of lista(f.contas).entries()) {
    exige(texto(c?.nome) && ["cash", "bank"].includes(c?.tipo), `contas[${i}]`);
    dinheiro(c?.saldo_inicial, `contas[${i}].saldo_inicial`);
  }
  const documentos = new Set();
  for (const [i, t] of lista(f.titulos).entries()) {
    exige(texto(t?.documento) && !documentos.has(`${t?.direcao}/${t?.documento}`), `titulos[${i}].documento`);
    documentos.add(`${t?.direcao}/${t?.documento}`);
    exige(["receivable", "payable"].includes(t?.direcao) && texto(t?.tipo_parte) && texto(t?.parte), `titulos[${i}]`);
    dinheiro(t?.valor, `titulos[${i}].valor`);
    exige(inteiro(t?.vencimento_relativo_dias), `titulos[${i}].vencimento_relativo_dias`);
    if (t?.baixa) {
      exige(contas.has(t.baixa.conta) && texto(t.baixa.meio), `titulos[${i}].baixa`);
      dinheiro(t.baixa.valor, `titulos[${i}].baixa.valor`);
    }
  }
  const precisa = (cond, papel, campo) => exige(!cond || lista(f.usuarios).some((u) => u.papel === papel), campo);
  precisa(lista(f.contas).length + lista(f.titulos).length > 0, "finance", "usuarios: falta o papel finance");
  precisa(lista(f.perfis_normativos).length + lista(f.patios).length + lista(f.processos).length + lista(f.localizacoes).length > 0, "manager", "usuarios: falta o papel manager");
  return falhas;
}

// ---------------------------------------------------------------------------------------------------------
// HTTP: um ajudante para todas as chamadas. Nada de corpo de resposta nem de segredo nas mensagens.
// ---------------------------------------------------------------------------------------------------------
async function chamar(ctx, metodo, caminho, token, corpo) {
  const headers = { accept: "application/json" };
  if (corpo !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const resposta = await ctx.fetch(`${ctx.base}/api/v1${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const bruto = await resposta.text();
  let json = null;
  try {
    json = bruto ? JSON.parse(bruto) : null;
  } catch {
    json = null;
  }
  return { status: resposta.status, json };
}

const motivoDe = (r) => {
  const m = r.json?.error?.reason ?? r.json?.error?.code ?? "";
  return /^[A-Za-z_]{1,60}$/.test(m) ? m : "sem_motivo";
};

function exigir(r, esperados, papel, rotulo, etapa) {
  if (esperados.includes(r.status)) return r;
  const motivo = motivoDe(r);
  if (r.status === 401 || r.status === 403) {
    const dica = motivo === "module_not_enabled" ? " (a organizacao da fundacao esta sem o modulo desta rota)" : "";
    throw new ErroMotor(1, `ACESSO_NEGADO papel=${papel} rota=${rotulo} status=${r.status} motivo=${motivo}${dica}`);
  }
  if (r.status === 404) throw new ErroMotor(1, `NAO_ENCONTRADO papel=${papel} rota=${rotulo}`);
  if (r.status === 409 || r.status === 422) {
    throw new ErroMotor(5, `ESTADO_INESPERADO ${etapa} rota=${rotulo} status=${r.status} motivo=${motivo}`);
  }
  throw new ErroMotor(1, `HTTP_${r.status} papel=${papel} rota=${rotulo} motivo=${motivo}`);
}

// Lista normalizada: as rotas devolvem `{data:[…]}`, `{items:[…]}` ou `{data:{items:[…]}}` (medido na F3).
export function itensDe(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  return null;
}

const dadoDe = (json) => (json && typeof json === "object" && "data" in json ? json.data : json);

// Le uma lista paginada inteira, para a busca pela chave natural nunca perder um item.
async function lerLista(ctx, sessao, caminho, etapa) {
  const juntar = caminho.includes("?") ? "&" : "?";
  const rotulo = `GET ${caminho.split("?")[0]}`;
  const todos = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
    const r = exigir(
      await chamar(ctx, "GET", `${caminho}${juntar}limit=${LIMITE_LISTA}&offset=${pagina * LIMITE_LISTA}`, sessao.token),
      [200],
      sessao.chave,
      rotulo,
      etapa,
    );
    const itens = itensDe(r.json);
    if (!itens) throw new ErroMotor(1, `RESPOSTA_SEM_LISTA rota=${rotulo}`);
    todos.push(...itens);
    const total = r.json?.pagination?.total;
    if (typeof total !== "number" || todos.length >= total || itens.length < LIMITE_LISTA) return todos;
  }
  throw new ErroMotor(1, `LISTA_LONGA_DEMAIS rota=${rotulo}`);
}

// Le uma lista sem paginacao (areas, vagas, encargos).
async function lerItens(ctx, sessao, caminho, etapa) {
  const r = exigir(await chamar(ctx, "GET", caminho, sessao.token), [200], sessao.chave, `GET ${caminho}`, etapa);
  const itens = itensDe(r.json);
  if (!itens) throw new ErroMotor(1, `RESPOSTA_SEM_LISTA rota=GET ${caminho}`);
  return itens;
}

async function lerUm(ctx, sessao, caminho, etapa) {
  return dadoDe(exigir(await chamar(ctx, "GET", caminho, sessao.token), [200], sessao.chave, `GET ${caminho}`, etapa).json);
}

const JA_EXISTE = Symbol("ja-existe");

// Le antes de escrever. Se o item ja existe, nao escreve. Um 409 na criacao quer dizer "ja existe": rele.
async function garantir(contagem, ler, criar) {
  const existente = await ler();
  contagem.existentes += existente ? 1 : 0;
  if (existente) return { criado: false, item: existente };
  const criado = await criar();
  if (criado === JA_EXISTE) {
    const relido = await ler();
    if (!relido) throw new ErroMotor(5, `ESTADO_INESPERADO ${contagem.etapa} 409 sem item na releitura`);
    contagem.existentes += 1;
    return { criado: false, item: relido };
  }
  contagem.criados += 1;
  return { criado: true, item: criado };
}

function criador(ctx, sessao, rota, corpo, etapa) {
  return async () => {
    const r = await chamar(ctx, "POST", rota, sessao.token, corpo);
    if (r.status === 409) return JA_EXISTE;
    return dadoDe(exigir(r, [201, 200], sessao.chave, `POST ${rota.replace(UUID_NA_ROTA, ":id")}`, etapa).json);
  };
}
const UUID_NA_ROTA = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Muda a situacao so se a lida for a ANTERIOR ao passo: ja adiante, pula; incompativel, para com 5.
// Vale mesmo com chave de idempotencia deterministica: o recibo do sync morre quando a API reinicia.
async function avancarSituacao(contagem, { caminho, anterior, alvo, ler, enviar }) {
  const pularOuParar = (situacao, passo) => {
    const onde = caminho.indexOf(situacao);
    if (onde >= 0 && onde >= caminho.indexOf(passo)) {
      contagem.existentes += 1;
      return "pulado";
    }
    throw new ErroMotor(5, `ESTADO_INESPERADO ${contagem.etapa} situacao=${situacao} passo=${passo}`);
  };
  const atual = await ler();
  if (atual.status !== anterior) return pularOuParar(atual.status, alvo);
  await enviar();
  contagem.criados += 1;
  const depois = await ler();
  if (depois.status !== alvo) throw new ErroMotor(5, `ESTADO_INESPERADO ${contagem.etapa} situacao=${depois.status} esperada=${alvo}`);
  return "feito";
}

function contar(etapa) {
  return { etapa, criados: 0, existentes: 0 };
}

// ---------------------------------------------------------------------------------------------------------
// Login: o UNICO ponto que entra na API. Todo login manda o id da organizacao (a API recusa sem ele).
// ---------------------------------------------------------------------------------------------------------
async function entrar(ctx, email, senha, tenantId) {
  const corpo = { email, password: senha, tenantId };
  const r = await chamar(ctx, "POST", "/auth/login", null, corpo);
  if (r.status !== 200) return { ok: false, status: r.status };
  const token = r.json?.data?.access_token;
  if (!token) throw new ErroMotor(1, "LOGIN_SEM_TOKEN");
  return { ok: true, token, trocar: r.json?.data?.must_change_password === true };
}

const arquivoProvisoria = (ctx, email) => path.join(ctx.dirProvisorias, `${email}.provisoria`);

// Entra com a senha de demonstracao; se a conta ainda pede troca, troca a provisoria pela rota do produto
// (`POST /auth/password`) e apaga o arquivo da provisoria. A troca derruba as sessoes, entao entra de novo.
async function entrarComTroca(ctx, contagem, chave, email, tenantId) {
  const arq = arquivoProvisoria(ctx, email);
  if (fs.existsSync(arq)) {
    const provisoria = exigirSenha(lerSenha(arq));
    const comProvisoria = await entrar(ctx, email, provisoria, tenantId);
    if (comProvisoria.ok && comProvisoria.trocar) {
      exigir(
        await chamar(ctx, "POST", "/auth/password", comProvisoria.token, {
          currentPassword: provisoria,
          newPassword: ctx.senhaDemo,
        }),
        [200],
        chave,
        "POST /auth/password",
        contagem.etapa,
      );
      contagem.criados += 1;
      fs.rmSync(arq, { force: true });
    } else if (comProvisoria.ok) {
      throw new ErroMotor(5, `ESTADO_INESPERADO ${contagem.etapa} a provisoria de ${chave} entra sem pedir troca`);
    } else {
      // A troca ja aconteceu numa execucao que caiu antes de apagar o arquivo.
      fs.rmSync(arq, { force: true });
    }
  }
  const sessao = await entrar(ctx, email, ctx.senhaDemo, tenantId);
  if (!sessao.ok) {
    throw new ErroMotor(5, `ESTADO_INESPERADO ${contagem.etapa} a senha de demonstracao de ${chave} foi recusada (status=${sessao.status}) e nao ha provisoria`);
  }
  if (sessao.trocar) throw new ErroMotor(5, `ESTADO_INESPERADO ${contagem.etapa} ${chave} ainda pede troca de senha`);
  return { chave, email, token: sessao.token };
}

// Sessao de quem faz cada coisa no produto (o primeiro usuario da fixture com aquele papel).
function sessaoDoPapel(ctx, papel) {
  const u = ctx.fixture.usuarios.find((x) => x.papel === papel);
  const s = u ? ctx.sessoes[u.chave] : undefined;
  if (!s) throw new ErroMotor(1, `FIXTURE_SEM_PAPEL ${papel}`);
  return s;
}
const sessaoDe = (ctx, chave) => {
  const s = ctx.sessoes[chave];
  if (!s) throw new ErroMotor(1, `FIXTURE_SEM_USUARIO ${chave}`);
  return s;
};

// ---------------------------------------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------------------------------------
async function et1(ctx) {
  const contagem = contar("ET1");
  ctx.sessoes.admin = await entrarComTroca(ctx, contagem, "admin", ctx.fixture.admin.email, ctx.orgId);
  if (contagem.criados === 0) contagem.existentes += 1;
  return contagem;
}

async function et2(ctx) {
  const contagem = contar("ET2");
  const admin = ctx.sessoes.admin;
  const lerUsuarios = async () => (await lerItens(ctx, admin, "/users", "ET2"));
  for (const u of ctx.fixture.usuarios) {
    const email = u.email.trim().toLowerCase();
    const { item } = await garantir(
      contagem,
      async () => (await lerUsuarios()).find((x) => String(x.email).toLowerCase() === email),
      async () => {
        // Provisoria sem usuario e diretorio de saida de outra pilha: nao cria (o arquivo novo nao caberia).
        if (fs.existsSync(arquivoProvisoria(ctx, email))) {
          throw new ErroMotor(5, `ESTADO_INESPERADO ET2 ha provisoria de ${u.chave} sem usuario: recrie o diretorio de saida`);
        }
        const r = await chamar(ctx, "POST", "/users", admin.token, { name: u.nome, email, roles: [u.papel] });
        if (r.status === 409) return JA_EXISTE;
        const criado = dadoDe(exigir(r, [201], "admin", "POST /users", "ET2").json);
        // A provisoria volta UMA vez, no 201: vai para o disco antes de qualquer outra chamada.
        fs.writeFileSync(arquivoProvisoria(ctx, email), exigirSenha(criado?.temporaryPassword), { flag: "wx", mode: 0o600 });
        return criado;
      },
    );
    const papeis = (item.roles ?? []).map((p) => (typeof p === "string" ? p : p?.key));
    if (!papeis.includes(u.papel)) {
      throw new ErroMotor(5, `ESTADO_INESPERADO ET2 ${u.chave} existe com outro papel`);
    }
    ctx.ids.usuarios[u.chave] = item.id;
    ctx.sessoes[u.chave] = await entrarComTroca(ctx, contagem, u.chave, email, ctx.orgId);
  }
  return contagem;
}

async function et3(ctx) {
  const contagem = contar("ET3");
  const admin = ctx.sessoes.admin;
  const f = ctx.fixture;
  const buscar = (rota, termo) => lerLista(ctx, admin, `${rota}?search=${encodeURIComponent(termo)}`, "ET3");

  for (const x of f.clientes ?? []) {
    const corpo = { name: x.nome };
    if (x.documento) corpo.document = x.documento;
    if (x.telefone) corpo.phone = x.telefone;
    if (x.email) corpo.email = x.email;
    if (x.endereco) corpo.address = x.endereco;
    if (x.cidade) corpo.city = x.cidade;
    if (x.uf) corpo.state = x.uf;
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/customers", x.nome)).find((i) => i.name === x.nome),
      criador(ctx, admin, "/customers", corpo, "ET3"),
    );
    ctx.ids.clientes[x.nome] = item.id;
  }
  for (const x of f.viaturas ?? []) {
    const placa = normalizarPlaca(x.placa);
    const corpo = { plate: placa };
    if (x.tipo) corpo.type = x.tipo;
    if (x.modelo) corpo.model = x.modelo;
    if (inteiro(x.ano)) corpo.year = x.ano;
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/vehicles", placa)).find((i) => normalizarPlaca(i.plate) === placa),
      criador(ctx, admin, "/vehicles", corpo, "ET3"),
    );
    ctx.ids.viaturas[placa] = item.id;
  }
  for (const x of f.equipes ?? []) {
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/teams", x.nome)).find((i) => i.name === x.nome),
      criador(ctx, admin, "/teams", { name: x.nome }, "ET3"),
    );
    ctx.ids.equipes[x.nome] = item.id;
    for (const membro of x.membros ?? []) {
      const userId = ctx.ids.usuarios[membro];
      if (!userId) throw new ErroMotor(1, `MEMBRO_SEM_USUARIO ${membro}`);
      await garantir(
        contagem,
        async () => ((await lerUm(ctx, admin, `/teams/${item.id}`, "ET3"))?.members ?? []).find((m) => m.userId === userId),
        criador(ctx, admin, `/teams/${item.id}/members`, { user_id: userId }, "ET3"),
      );
    }
  }
  for (const x of f.servicos ?? []) {
    const corpo = { name: x.nome };
    if (x.tipo) corpo.service_type = x.tipo;
    if (typeof x.exige_destino === "boolean") corpo.requires_destination = x.exige_destino;
    if (x.preco_base) corpo.base_price = x.preco_base;
    if (inteiro(x.duracao_estimada_min)) corpo.estimated_duration_minutes = x.duracao_estimada_min;
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/service-catalog", x.nome)).find((i) => i.name === x.nome),
      criador(ctx, admin, "/service-catalog", corpo, "ET3"),
    );
    ctx.ids.servicos[x.nome] = item.id;
  }
  for (const x of f.tabelas ?? []) {
    const { item: tabela } = await garantir(
      contagem,
      async () => (await buscar("/price-tables", x.nome)).find((i) => i.name === x.nome),
      criador(ctx, admin, "/price-tables", { name: x.nome, currency: x.moeda }, "ET3"),
    );
    for (const t of x.tarifas ?? []) {
      const servicoId = ctx.ids.servicos[t.servico];
      await garantir(
        contagem,
        async () =>
          (await lerLista(ctx, admin, `/tariffs?price_table_id=${tabela.id}`, "ET3")).find(
            (i) => i.priceTableId === tabela.id && i.serviceCatalogId === servicoId && i.name === t.nome,
          ),
        criador(ctx, admin, "/tariffs", {
          price_table_id: tabela.id,
          service_catalog_id: servicoId,
          name: t.nome,
          unit_price: t.valor,
          currency: x.moeda,
          origin: t.origem,
        }, "ET3"),
      );
    }
    if (x.publicar) {
      await avancarSituacao(contagem, {
        caminho: ["draft", "published"],
        anterior: "draft",
        alvo: "published",
        ler: () => lerUm(ctx, admin, `/price-tables/${tabela.id}`, "ET3"),
        enviar: async () =>
          exigir(await chamar(ctx, "PATCH", `/price-tables/${tabela.id}`, admin.token, { status: "published" }), [200], "admin", "PATCH /price-tables/:id", "ET3"),
      });
    }
  }
  return contagem;
}

async function et4(ctx) {
  const contagem = contar("ET4");
  const f = ctx.fixture;
  if (!(f.perfis_normativos?.length || f.patios?.length)) return contagem;
  const gestao = sessaoDoPapel(ctx, "manager");
  for (const p of f.perfis_normativos ?? []) {
    const corpo = {
      name: p.nome,
      scope: p.escopo,
      release_requirements: (p.requisitos_liberacao ?? []).map((r) => ({ code: r.codigo, label: r.rotulo, required: r.obrigatorio !== false })),
    };
    if (p.modelo_diaria) corpo.daily_model = p.modelo_diaria;
    if (p.teto_diaria) corpo.daily_cap = p.teto_diaria;
    const { item } = await garantir(
      contagem,
      async () => (await lerLista(ctx, gestao, "/jurisdiction-profiles", "ET4")).find((i) => i.name === p.nome),
      criador(ctx, gestao, "/jurisdiction-profiles", corpo, "ET4"),
    );
    ctx.ids.perfis[p.nome] = item.id;
  }
  for (const pt of f.patios ?? []) {
    const { item: patio } = await garantir(
      contagem,
      async () => (await lerLista(ctx, gestao, "/yards", "ET4")).find((i) => i.name === pt.nome),
      criador(ctx, gestao, "/yards", { name: pt.nome, address: pt.endereco, timezone: pt.fuso }, "ET4"),
    );
    ctx.ids.patios[pt.nome] = patio.id;
    for (const a of pt.areas ?? []) {
      const { item: area } = await garantir(
        contagem,
        async () => (await lerItens(ctx, gestao, `/yards/${patio.id}/areas`, "ET4")).find((i) => i.name === a.nome),
        criador(ctx, gestao, `/yards/${patio.id}/areas`, { name: a.nome, kind: a.tipo }, "ET4"),
      );
      for (const v of a.vagas ?? []) {
        const lerVaga = async () => (await lerItens(ctx, gestao, `/yard-areas/${area.id}/spots`, "ET4")).find((i) => i.code === v.codigo);
        const { item: vaga } = await garantir(
          contagem,
          lerVaga,
          criador(ctx, gestao, `/yard-areas/${area.id}/spots`, { code: v.codigo, vehicle_class: v.classe ?? "ANY" }, "ET4"),
        );
        ctx.ids.vagas[`${pt.nome}/${v.codigo}`] = { id: vaga.id, areaId: area.id };
        if (v.bloqueada) {
          await avancarSituacao(contagem, {
            caminho: ["FREE", "BLOCKED"],
            anterior: "FREE",
            alvo: "BLOCKED",
            ler: lerVaga,
            enviar: async () =>
              exigir(await chamar(ctx, "PATCH", `/yard-spots/${vaga.id}`, gestao.token, { status: "BLOCKED" }), [200], gestao.chave, "PATCH /yard-spots/:id", "ET4"),
          });
        }
      }
    }
  }
  return contagem;
}

const urlDaFoto = (placa, conjunto) => `${BASE_DAS_FOTOS}/${encodeURIComponent(placa)}/${conjunto}.png`;

async function et5(ctx) {
  const contagem = contar("ET5");
  const f = ctx.fixture;
  if (!f.processos?.length) return contagem;
  const gestao = sessaoDoPapel(ctx, "manager");
  for (const p of f.processos) {
    const placa = normalizarPlaca(p.placa);
    const corpo = {
      vehicle_plate: placa,
      profile_id: ctx.ids.perfis[p.perfil],
      origin_authority: p.autoridade,
    };
    if (p.marca) corpo.vehicle_brand = p.marca;
    if (p.modelo) corpo.vehicle_model = p.modelo;
    if (p.cor) corpo.vehicle_color = p.cor;
    if (inteiro(p.ano)) corpo.vehicle_year = p.ano;
    if (p.chassi) corpo.vehicle_chassis = p.chassi;
    if (p.procedimento) corpo.authority_case_number = p.procedimento;
    if (p.fundamento_legal) corpo.legal_basis = p.fundamento_legal;
    if (p.patio) corpo.yard_id = ctx.ids.patios[p.patio];
    const { item } = await garantir(
      contagem,
      async () => (await lerLista(ctx, gestao, `/impound-processes?plate=${encodeURIComponent(placa)}`, "ET5")).find((i) => normalizarPlaca(i.vehiclePlate) === placa),
      criador(ctx, gestao, "/impound-processes", corpo, "ET5"),
    );
    const id = item.id;
    const lerProcesso = () => lerUm(ctx, gestao, `/impound-processes/${id}`, "ET5");
    const transicao = (to) => async () =>
      exigir(await chamar(ctx, "POST", `/impound-processes/${id}/transitions`, gestao.token, { to }), [200], gestao.chave, "POST /impound-processes/:id/transitions", "ET5");
    await avancarSituacao(contagem, { caminho: CAMINHO_PROCESSO, anterior: "IN_REMOVAL", alvo: "RECEPTION", ler: lerProcesso, enviar: transicao("RECEPTION") });

    if (p.vaga) {
      const alvo = ctx.ids.vagas[`${p.patio}/${p.vaga}`];
      if (!alvo) throw new ErroMotor(1, `VAGA_FORA_DA_FIXTURE ${p.vaga}`);
      await garantir(
        contagem,
        async () => {
          const vaga = (await lerItens(ctx, gestao, `/yard-areas/${alvo.areaId}/spots`, "ET5")).find((i) => i.id === alvo.id);
          if (vaga?.currentProcessId === id) return vaga;
          if (vaga?.status !== "FREE") throw new ErroMotor(5, `ESTADO_INESPERADO ET5 vaga ${p.vaga} em ${vaga?.status}`);
          return undefined;
        },
        async () =>
          dadoDe(exigir(await chamar(ctx, "POST", `/impound-processes/${id}/spot`, gestao.token, { spot_id: alvo.id }), [200, 201], gestao.chave, "POST /impound-processes/:id/spot", "ET5").json) ?? {},
      );
    }

    const alvoFinal = p.situacao_final ?? "RECEPTION";
    if (alvoFinal === "ACTIVE_CUSTODY" || p.vistoria) {
      const lerVistoria = async () => {
        const r = await chamar(ctx, "GET", `/impound-processes/${id}/inspection`, gestao.token);
        if (r.status === 404) return null;
        return dadoDe(exigir(r, [200], gestao.chave, "GET /impound-processes/:id/inspection", "ET5").json);
      };
      const dados = { ...VISTORIA_PADRAO, ...(p.vistoria?.dados ?? {}) };
      dados.assinatura = String(dados.assinatura).toUpperCase();
      const lida = await lerVistoria();
      const difere = !lida?.inspection || CAMPOS_VISTORIA.some(([k, , camel]) => dados[k] !== undefined && String(lida.inspection[camel] ?? "") !== String(dados[k]));
      if (difere) {
        const corpoVistoria = { inspected_at: lida?.inspection?.inspectedAt ?? new Date().toISOString() };
        for (const [k, snake] of CAMPOS_VISTORIA) if (dados[k] !== undefined) corpoVistoria[snake] = dados[k];
        exigir(await chamar(ctx, "PUT", `/impound-processes/${id}/inspection`, gestao.token, corpoVistoria), [200], gestao.chave, "PUT /impound-processes/:id/inspection", "ET5");
        contagem.criados += 1;
      } else {
        contagem.existentes += 1;
      }
      for (const declarada of p.vistoria?.fotos ?? []) {
        const foto = { set: declarada.set, file_url: urlDaFoto(placa, declarada.set) };
        await garantir(
          contagem,
          async () => {
            const fotos = (await lerVistoria())?.photos ?? [];
            const existente = fotos.find((f) => f.set === foto.set && f.fileUrl === foto.file_url);
            return existente;
          },
          criador(ctx, gestao, `/impound-processes/${id}/inspection/photos`, foto, "ET5"),
        );
      }
      if (alvoFinal === "ACTIVE_CUSTODY") {
        const vistoria = await lerVistoria();
        const guardados = new Set((vistoria?.photos ?? []).map((x) => x.set));
        const faltam = (vistoria?.requiredSets ?? []).filter((s) => !guardados.has(s));
        if (faltam.length) throw new ErroMotor(5, `ESTADO_INESPERADO ET5 ${placa}: a fixture nao declara os conjuntos de foto obrigatorios ${faltam.join(",")}`);
        if (!vistoria.inspection?.completedAt) {
          exigir(await chamar(ctx, "POST", `/impound-processes/${id}/inspection/complete`, gestao.token, {}), [200], gestao.chave, "POST /impound-processes/:id/inspection/complete", "ET5");
          contagem.criados += 1;
        } else {
          contagem.existentes += 1;
        }
        await avancarSituacao(contagem, { caminho: CAMINHO_PROCESSO, anterior: "RECEPTION", alvo: "ACTIVE_CUSTODY", ler: lerProcesso, enviar: transicao("ACTIVE_CUSTODY") });
      }
    }

    // Encargo e leitura de encargo sao da gestao, nunca do financeiro (A2 da Emenda 1: 403 como finance).
    for (const e of p.encargos ?? []) {
      const encargo = { kind: e.tipo, description: e.descricao };
      await garantir(
        contagem,
        async () => {
          const encargos = await lerItens(ctx, gestao, `/impound-processes/${id}/charges`, "ET5");
          const existente = encargos.find((c) => c.kind === encargo.kind && c.description === encargo.description);
          return existente;
        },
        criador(ctx, gestao, `/impound-processes/${id}/charges`, { ...encargo, unit_amount: e.valor, quantity: "1" }, "ET5"),
      );
    }
  }
  return contagem;
}

async function et6(ctx) {
  const contagem = contar("ET6");
  const f = ctx.fixture;
  if (f.localizacoes?.length) {
    const gestao = sessaoDoPapel(ctx, "manager");
    for (const l of f.localizacoes) {
      const tecnica = sessaoDe(ctx, l.usuario);
      const emailTecnica = tecnica.email;
      await garantir(
        contagem,
        // Pela gestao, que nao grava auditoria nessa leitura; nunca pelo historico, que grava (A2 da Emenda 1).
        async () => {
          const posicoes = await lerItens(ctx, gestao, "/field-locations/latest", "ET6");
          const existente = posicoes.find((p) => p.operator?.email === emailTecnica);
          return existente;
        },
        criador(ctx, tecnica, "/mobile/field-locations", { latitude: l.latitude, longitude: l.longitude, source: l.origem ?? "mobile" }, "ET6"),
      );
    }
  }
  for (const [indice, o] of (f.ordens_de_servico ?? []).entries()) {
    const autor = sessaoDe(ctx, o.criada_por);
    const corpo = { title: o.titulo, priority: o.prioridade ?? "medium" };
    if (o.descricao) corpo.description = o.descricao;
    if (o.cliente) corpo.customer_id = ctx.ids.clientes[o.cliente];
    if (o.viatura) corpo.vehicle_id = ctx.ids.viaturas[normalizarPlaca(o.viatura)];
    if (o.equipe) corpo.team_id = ctx.ids.equipes[o.equipe];
    if (o.servico) corpo.service_catalog_id = ctx.ids.servicos[o.servico];
    if (o.placa_atendida) corpo.service_details = { plate: normalizarPlaca(o.placa_atendida) };
    for (const [lado, prefixo] of [["origem", "service"], ["destino", "destination"]]) {
      const e = o[lado];
      if (!e) continue;
      if (e.endereco) corpo[`${prefixo}Address`] = e.endereco;
      if (e.cidade) corpo[`${prefixo}City`] = e.cidade;
      if (e.uf) corpo[`${prefixo}State`] = e.uf;
      if (typeof e.latitude === "number") corpo[`${prefixo}Latitude`] = e.latitude;
      if (typeof e.longitude === "number") corpo[`${prefixo}Longitude`] = e.longitude;
    }
    // A OS nasce SO pelo POST /work-orders, depois de buscar pelo titulo. Nunca pelo sync.
    const { item } = await garantir(
      contagem,
      async () => (await lerLista(ctx, autor, `/work-orders?search=${encodeURIComponent(o.titulo)}`, "ET6")).find((i) => i.title === o.titulo),
      criador(ctx, autor, "/work-orders", corpo, "ET6"),
    );
    const id = item.id;
    if (!o.atribuicao) continue;
    const quemAtribui = sessaoDe(ctx, o.atribuicao.por);
    const tecnica = sessaoDe(ctx, o.atribuicao.tecnica);
    const tecnicaId = ctx.ids.usuarios[o.atribuicao.tecnica];
    await avancarSituacao(contagem, {
      caminho: CAMINHO_OS,
      anterior: "open",
      alvo: "assigned",
      ler: () => lerUm(ctx, quemAtribui, `/work-orders/${id}`, "ET6"),
      enviar: async () =>
        exigir(await chamar(ctx, "POST", `/work-orders/${id}/assign`, quemAtribui.token, { userId: tecnicaId }), [200], quemAtribui.chave, "POST /work-orders/:id/assign", "ET6"),
    });
    const lerPelaTecnica = () => lerUm(ctx, tecnica, `/work-orders/${id}`, "ET6");
    const atribuida = await lerPelaTecnica();
    if (atribuida?.assignedUserId && atribuida.assignedUserId !== tecnicaId) {
      throw new ErroMotor(5, `ESTADO_INESPERADO ET6 ${o.titulo} atribuida a outra pessoa`);
    }
    let anterior = "assigned";
    for (const passo of o.passos_do_app ?? []) {
      const payload = { work_order_id: id, status: passo.para };
      if (passo.mensagem) payload.message = passo.mensagem;
      // O "No local" confere os 2 ultimos caracteres da placa atendida (B-SAN3-26), lidos da fixture.
      if (passo.para === "on_site") payload.checkin_confirmation = { last_digits: normalizarPlaca(o.placa_atendida).slice(-2) };
      await avancarSituacao(contagem, {
        caminho: CAMINHO_OS,
        anterior,
        alvo: passo.para,
        ler: lerPelaTecnica,
        enviar: async () => {
          const r = exigir(
            await chamar(ctx, "POST", "/mobile/sync/work-order-actions", tecnica.token, {
              client_batch_id: `demo-isolado:${ctx.fixtureSha256.slice(0, 12)}:os:${indice}:${passo.para}`,
              actions: [{ client_action_id: `demo-isolado:${ctx.fixtureSha256.slice(0, 12)}:os:${indice}:${passo.para}`, type: "work_order.status_change", payload }],
            }),
            [200],
            tecnica.chave,
            "POST /mobile/sync/work-order-actions",
            "ET6",
          );
          const d = r.json?.data ?? {};
          const aceitos = (d.accepted?.length ?? 0) + (d.already_applied?.length ?? 0);
          if (aceitos !== 1) {
            const c = [...(d.conflicts ?? []), ...(d.rejected ?? [])][0];
            const motivo = c?.error?.reason ?? c?.reason ?? "sem_motivo";
            throw new ErroMotor(5, `ESTADO_INESPERADO ET6 sync ${passo.para} recusado motivo=${/^[a-z_]{1,60}$/.test(motivo) ? motivo : "sem_motivo"}`);
          }
        },
      });
      anterior = passo.para;
    }
  }
  return contagem;
}

async function et7(ctx) {
  const contagem = contar("ET7");
  const f = ctx.fixture;
  if (!(f.contas?.length || f.titulos?.length)) return contagem;
  const fin = sessaoDoPapel(ctx, "finance");
  for (const c of f.contas ?? []) {
    const corpo = { name: c.nome, kind: c.tipo, currency: "BRL", opening_balance: c.saldo_inicial };
    if (c.banco) corpo.bank_name = c.banco;
    if (c.agencia) corpo.agency = c.agencia;
    if (c.numero) corpo.account_number = c.numero;
    const { item } = await garantir(
      contagem,
      async () => (await lerLista(ctx, fin, "/financial-accounts", "ET7")).find((i) => i.name === c.nome),
      criador(ctx, fin, "/financial-accounts", corpo, "ET7"),
    );
    ctx.ids.contas[c.nome] = item.id;
  }
  for (const t of f.titulos ?? []) {
    const corpo = {
      direction: t.direcao,
      party_type: t.tipo_parte,
      party_name: t.parte,
      amount: t.valor,
      currency: "BRL",
      due_date: dataDeNegocio(t.vencimento_relativo_dias),
      document: t.documento,
    };
    if (t.descricao) corpo.description = t.descricao;
    const { item } = await garantir(
      contagem,
      async () => (await lerLista(ctx, fin, `/financial-titles?direction=${t.direcao}`, "ET7")).find((i) => i.document === t.documento),
      criador(ctx, fin, "/financial-titles", corpo, "ET7"),
    );
    if (!t.baixa) continue;
    const corpoBaixa = { account_id: ctx.ids.contas[t.baixa.conta], amount: t.baixa.valor, payment_method: t.baixa.meio };
    if (t.baixa.descricao) corpoBaixa.description = t.baixa.descricao;
    await avancarSituacao(contagem, {
      caminho: CAMINHO_TITULO,
      anterior: "open",
      alvo: "paid",
      ler: () => lerUm(ctx, fin, `/financial-titles/${item.id}`, "ET7"),
      enviar: async () =>
        exigir(await chamar(ctx, "POST", `/financial-titles/${item.id}/pay`, fin.token, corpoBaixa), [200, 201], fin.chave, "POST /financial-titles/:id/pay", "ET7"),
    });
    if (!t.baixa.conciliar) continue;
    const lancamento = (await lerLista(ctx, fin, "/financial-entries", "ET7")).find((e) => e.titleId === item.id);
    if (!lancamento) throw new ErroMotor(5, `ESTADO_INESPERADO ET7 ${t.documento} pago sem lancamento`);
    if (lancamento.reconciled === true) {
      contagem.existentes += 1;
      continue;
    }
    // Trava otimista do produto: o pedido diz o estado de conciliacao que leu.
    exigir(
      await chamar(ctx, "PATCH", `/financial-entries/${lancamento.id}/reconcile`, fin.token, {
        reconciled: true,
        expected_reconciled: false,
        expected_reconciled_at: lancamento.reconciledAt ?? null,
      }),
      [200],
      fin.chave,
      "PATCH /financial-entries/:id/reconcile",
      "ET7",
    );
    contagem.criados += 1;
  }
  return contagem;
}

// O marcador so e escrito se estiver ausente ou diferente: o PUT repetido grava auditoria de novo (N4).
async function et8(ctx) {
  const contagem = contar("ET8");
  const admin = ctx.sessoes.admin;
  const caminho = `/tenant-settings/${CHAVE_MARCADOR}`;
  const r = await chamar(ctx, "GET", caminho, admin.token);
  const atual = r.status === 404 ? null : dadoDe(exigir(r, [200], "admin", `GET /tenant-settings/:key`, "ET8").json);
  if (atual?.value === ctx.fixtureSha256) {
    contagem.existentes += 1;
    return contagem;
  }
  exigir(await chamar(ctx, "PUT", caminho, admin.token, { value: ctx.fixtureSha256 }), [200], "admin", "PUT /tenant-settings/:key", "ET8");
  contagem.criados += 1;
  return contagem;
}

const ETAPAS = [et1, et2, et3, et4, et5, et6, et7, et8];

// ---------------------------------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------------------------------
export async function semear(opcoes = {}) {
  const argv = opcoes.argv ?? process.argv.slice(2);
  const escrever = opcoes.escrever ?? ((linha) => console.log(linha));
  const base = process.env.DEMO_ISOLADO_API;
  const veredito = avaliarAlvo(process.env, base);
  if (!veredito.ok) {
    escrever(`DEMO-ISOLADO RECUSA ${veredito.motivo}`);
    return veredito.codigo;
  }
  const args = lerArgumentos(argv);
  if (!args) {
    escrever("DEMO-ISOLADO RECUSA ARGUMENTO_RECUSADO");
    return 2;
  }
  const ctx = {
    fetch: opcoes.fetch ?? globalThis.fetch,
    base: String(base).replace(/\/+$/, ""),
    sessoes: {},
    ids: { usuarios: {}, clientes: {}, viaturas: {}, equipes: {}, servicos: {}, perfis: {}, patios: {}, vagas: {}, contas: {} },
  };
  try {
    const senhaPlataforma = exigirSenha(lerSenha(args["--admin-plataforma"]));
    ctx.senhaDemo = exigirSenha(lerSenha(args["--senhas"]));
    let bruto;
    try {
      bruto = fs.readFileSync(String(args["--fixture"] ?? ""));
    } catch {
      throw new ErroMotor(1, "FIXTURE_ILEGIVEL");
    }
    let fixture;
    try {
      fixture = JSON.parse(bruto.toString("utf8"));
    } catch {
      throw new ErroMotor(1, "FIXTURE_INVALIDA json");
    }
    const falhas = validarFixture(fixture);
    if (falhas.length) throw new ErroMotor(1, `FIXTURE_INVALIDA ${falhas.slice(0, 5).join(", ")}`);
    ctx.fixture = fixture;
    const sha = createHash("sha256").update(bruto).digest("hex");
    ctx.fixtureSha256 = sha;
    escrever(`DEMO-ISOLADO projeto=${process.env.DEMO_ISOLADO_PROJETO} api=${ctx.base} fixture_sha256=${sha}`);

    ctx.dirProvisorias = String(args["--provisorias"] ?? "");
    let plataformaId = "";
    try {
      plataformaId = fs.readFileSync(path.join(ctx.dirProvisorias, "plataforma.tenant-id"), "utf8");
    } catch {
      plataformaId = "";
    }
    if (!ctx.dirProvisorias || !UUID.test(plataformaId)) throw new ErroMotor(3, "FUNDACAO_AUSENTE");

    // M-L4: censo na fonte real (`GET /platform/overview`), com o admin de plataforma.
    const plataforma = await entrar(ctx, fixture.plataforma.email, senhaPlataforma, plataformaId);
    if (!plataforma.ok) throw new ErroMotor(1, `ACESSO_NEGADO papel=plataforma rota=login status=${plataforma.status}`);
    ctx.sessoes.plataforma = { chave: "plataforma", email: fixture.plataforma.email, token: plataforma.token };
    const visao = exigir(await chamar(ctx, "GET", "/platform/overview", plataforma.token), [200], "plataforma", "GET /platform/overview", "M-L4");
    const orgs = Array.isArray(visao.json?.data?.orgs) ? visao.json.data.orgs : [];
    const totalOrgs = typeof visao.json?.data?.totalOrgs === "number" ? visao.json.data.totalOrgs : 0;
    const mesmas = orgs.filter((o) => o.name === fixture.organizacao.nome).length;
    escrever(`DEMO-ISOLADO CENSO totalOrgs=${totalOrgs} orgs=${orgs.length} mesmas=${mesmas}`);
    const censo = totalOrgs === 0 ? { ok: false, codigo: 3, motivo: "PERSISTENCIA_NAO_REAL" } : avaliarCenso(orgs, fixture.organizacao.nome, "motor");
    if (!censo.ok) throw new ErroMotor(censo.codigo, censo.motivo);
    if (args["--so-censo"]) {
      escrever("DEMO-ISOLADO FIM so-censo");
      return 0;
    }
    ctx.orgId = censo.existente.id;
    if (!UUID.test(String(ctx.orgId))) throw new ErroMotor(3, "FUNDACAO_AUSENTE");

    let criados = 0;
    let existentes = 0;
    for (const etapa of ETAPAS) {
      const r = await etapa(ctx);
      escrever(`ETAPA ${r.etapa} criados=${r.criados} existentes=${r.existentes}`);
      criados += r.criados;
      existentes += r.existentes;
    }
    escrever(`DEMO-ISOLADO FIM criados=${criados} existentes=${existentes}`);
    return 0;
  } catch (erro) {
    if (erro instanceof ErroTrava || erro instanceof ErroMotor) {
      const rotulo = erro.codigo === 5 ? "" : erro.codigo === 1 ? "ERRO " : "RECUSA ";
      escrever(`DEMO-ISOLADO ${rotulo}${erro.motivo}`);
      return erro.codigo;
    }
    escrever(`DEMO-ISOLADO ERRO inesperado ${String(erro?.name ?? "Error")}`);
    return 1;
  }
}

// Roda so quando chamado como programa (o teste importa `semear` sem disparar nada).
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
  process.exitCode = await semear();
}
