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
// Codigos de saida:
//   0 concluido · 1 erro inesperado (sem corpo de resposta nem segredo na mensagem) · 2 trava de ambiente,
//   alvo, projeto ou argumento (nada saiu do processo) · 3 censo: fundacao ausente, base nao virgem ou
//   API sem persistencia real · 4 senha ausente · 5 ESTADO_INESPERADO <etapa> (o motor nao forca estado)
//
// Idempotencia: toda escrita e precedida de uma leitura pela chave natural (`garantir`); a 2a execucao com a
// mesma fixture faz 0 escritas e imprime `criados=0`.
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

// ---------------------------------------------------------------------------------------------------------
// Fixture: esquema escrito em codigo (sem dependencia nova), validado antes de qualquer chamada.
// ---------------------------------------------------------------------------------------------------------
const texto = (v) => typeof v === "string" && v.trim().length > 0;
const lista = (v) => Array.isArray(v);

export function validarFixture(f) {
  const falhas = [];
  const exige = (ok, campo) => {
    if (!ok) falhas.push(campo);
  };
  exige(f && typeof f === "object", "raiz");
  if (falhas.length) return falhas;
  exige(texto(f.organizacao?.nome), "organizacao.nome");
  exige(texto(f.admin?.nome), "admin.nome");
  exige(texto(f.admin?.email), "admin.email");
  exige(texto(f.plataforma?.email), "plataforma.email");
  exige(texto(f.prefixo), "prefixo");
  exige(lista(f.usuarios), "usuarios");
  const chaves = new Set(["admin", "plataforma"]);
  for (const [i, u] of (lista(f.usuarios) ? f.usuarios : []).entries()) {
    exige(texto(u?.chave) && /^[a-z][a-z0-9_]{0,30}$/.test(u.chave), `usuarios[${i}].chave`);
    exige(!chaves.has(u?.chave), `usuarios[${i}].chave repetida`);
    chaves.add(u?.chave);
    exige(texto(u?.nome), `usuarios[${i}].nome`);
    exige(texto(u?.email), `usuarios[${i}].email`);
    exige(texto(u?.papel), `usuarios[${i}].papel`);
  }
  const c = f.cadastros ?? {};
  exige(f.cadastros && typeof f.cadastros === "object", "cadastros");
  for (const [i, x] of (lista(c.clientes) ? c.clientes : []).entries()) exige(texto(x?.nome), `cadastros.clientes[${i}].nome`);
  for (const [i, x] of (lista(c.viaturas) ? c.viaturas : []).entries()) exige(texto(x?.placa), `cadastros.viaturas[${i}].placa`);
  for (const [i, x] of (lista(c.equipes) ? c.equipes : []).entries()) {
    exige(texto(x?.nome), `cadastros.equipes[${i}].nome`);
    for (const m of lista(x?.membros) ? x.membros : []) exige(chaves.has(m), `cadastros.equipes[${i}].membros ${m}`);
  }
  const servicos = new Set();
  for (const [i, x] of (lista(c.servicos) ? c.servicos : []).entries()) {
    exige(texto(x?.nome), `cadastros.servicos[${i}].nome`);
    exige(x?.preco_base === undefined || DINHEIRO.test(String(x.preco_base)), `cadastros.servicos[${i}].preco_base`);
    servicos.add(x?.nome);
  }
  for (const [i, x] of (lista(c.tabelas) ? c.tabelas : []).entries()) {
    exige(texto(x?.nome), `cadastros.tabelas[${i}].nome`);
    exige(texto(x?.moeda), `cadastros.tabelas[${i}].moeda`);
    for (const [j, t] of (lista(x?.tarifas) ? x.tarifas : []).entries()) {
      exige(texto(t?.nome), `cadastros.tabelas[${i}].tarifas[${j}].nome`);
      exige(servicos.has(t?.servico), `cadastros.tabelas[${i}].tarifas[${j}].servico`);
      exige(typeof t?.valor === "string" && DINHEIRO.test(t.valor), `cadastros.tabelas[${i}].tarifas[${j}].valor`);
      exige(texto(t?.origem), `cadastros.tabelas[${i}].tarifas[${j}].origem`);
    }
  }
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
  if (r.status === 422 || motivo === "WORK_ORDER_STATUS_INVALID") {
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

// Le uma lista inteira (pagina por pagina), para a busca pela chave natural nunca perder um item.
async function lerLista(ctx, sessao, caminho, rotulo, etapa) {
  const juntar = caminho.includes("?") ? "&" : "?";
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
const JA_EXISTE = Symbol("ja-existe");

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
  const lerUsuarios = async () =>
    itensDe(exigir(await chamar(ctx, "GET", "/users", admin.token), [200], "admin", "GET /users", "ET2").json) ?? [];
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
  const c = ctx.fixture.cadastros ?? {};
  const buscar = (rota, termo) => lerLista(ctx, admin, `${rota}?search=${encodeURIComponent(termo)}`, `GET ${rota}`, "ET3");
  const criar = (rota, corpo) => async () => {
    const r = await chamar(ctx, "POST", rota, admin.token, corpo);
    if (r.status === 409) return JA_EXISTE;
    return dadoDe(exigir(r, [201], "admin", `POST ${rota}`, "ET3").json);
  };

  for (const x of c.clientes ?? []) {
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/customers", x.nome)).find((i) => i.name === x.nome),
      criar("/customers", { name: x.nome, ...(x.telefone ? { phone: x.telefone } : {}) }),
    );
    ctx.ids.clientes[x.nome] = item.id;
  }
  for (const x of c.viaturas ?? []) {
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/vehicles", x.placa)).find((i) => i.plate === x.placa),
      criar("/vehicles", { plate: x.placa, ...(x.tipo ? { type: x.tipo } : {}), ...(x.modelo ? { model: x.modelo } : {}), ...(x.ano ? { year: x.ano } : {}) }),
    );
    ctx.ids.viaturas[x.placa] = item.id;
  }
  for (const x of c.equipes ?? []) {
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/teams", x.nome)).find((i) => i.name === x.nome),
      criar("/teams", { name: x.nome }),
    );
    ctx.ids.equipes[x.nome] = item.id;
    for (const membro of x.membros ?? []) {
      const userId = ctx.ids.usuarios[membro];
      if (!userId) throw new ErroMotor(1, `MEMBRO_SEM_USUARIO ${membro}`);
      await garantir(
        contagem,
        async () => {
          const r = exigir(await chamar(ctx, "GET", `/teams/${item.id}`, admin.token), [200], "admin", "GET /teams/:id", "ET3");
          return (dadoDe(r.json)?.members ?? []).find((m) => m.userId === userId);
        },
        async () => {
          const r = await chamar(ctx, "POST", `/teams/${item.id}/members`, admin.token, { user_id: userId });
          if (r.status === 409) return JA_EXISTE;
          return dadoDe(exigir(r, [201], "admin", "POST /teams/:id/members", "ET3").json);
        },
      );
    }
  }
  for (const x of c.servicos ?? []) {
    const { item } = await garantir(
      contagem,
      async () => (await buscar("/service-catalog", x.nome)).find((i) => i.name === x.nome),
      criar("/service-catalog", {
        name: x.nome,
        ...(x.tipo ? { service_type: x.tipo } : {}),
        ...(x.preco_base ? { base_price: x.preco_base } : {}),
      }),
    );
    ctx.ids.servicos[x.nome] = item.id;
  }
  for (const x of c.tabelas ?? []) {
    const { item: tabela } = await garantir(
      contagem,
      async () => (await buscar("/price-tables", x.nome)).find((i) => i.name === x.nome),
      criar("/price-tables", { name: x.nome, currency: x.moeda }),
    );
    ctx.ids.tabelas[x.nome] = tabela.id;
    for (const t of x.tarifas ?? []) {
      const servicoId = ctx.ids.servicos[t.servico];
      await garantir(
        contagem,
        async () =>
          (await lerLista(ctx, admin, `/tariffs?price_table_id=${tabela.id}`, "GET /tariffs", "ET3")).find(
            (i) => i.priceTableId === tabela.id && i.serviceCatalogId === servicoId && i.name === t.nome,
          ),
        criar("/tariffs", {
          price_table_id: tabela.id,
          service_catalog_id: servicoId,
          name: t.nome,
          unit_price: t.valor,
          currency: x.moeda,
          origin: t.origem,
        }),
      );
    }
    // Publicar e mudanca de situacao: so sai se a situacao lida for a anterior (rascunho).
    if (x.publicar && tabela.status !== "published") {
      if (tabela.status !== "draft") throw new ErroMotor(5, `ESTADO_INESPERADO ET3 tabela ${x.nome} em ${tabela.status}`);
      exigir(
        await chamar(ctx, "PATCH", `/price-tables/${tabela.id}`, admin.token, { status: "published" }),
        [200],
        "admin",
        "PATCH /price-tables/:id",
        "ET3",
      );
      contagem.criados += 1;
    }
  }
  return contagem;
}

const ETAPAS = [et1, et2, et3];

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
    ids: { usuarios: {}, clientes: {}, viaturas: {}, equipes: {}, servicos: {}, tabelas: {} },
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
