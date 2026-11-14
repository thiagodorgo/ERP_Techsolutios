// B-SAN3-10b-F4-SEED-ISOLADO — motor e verificador da demonstracao isolada, contra uma API FALSA em memoria.
//
// REGRA (A4 do plano v2): a API falsa so codifica comportamento MEDIDO contra a API real (Postgres, papel de
// runtime sem bypass de RLS). Cada comportamento cita, no comentario, a medicao que o mediu:
//   E10, E11          — evidencia do plano v2 (troca de senha, OS, recibo do sync)
//   E11-P2            — evidencia da Emenda 1.1 (login sem tenantId = 401 sob o papel de runtime)
//   F3-T2 … F3-T7     — diario do Dev B (usuarios, cadastros, criacao repetida, menu, token da provisoria)
// O que nao foi medido nao entra aqui: vai para o ensaio na pilha (V) ou para um teste `-db`.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { semear } from "../scripts/demo-isolado/semear.mjs";
import { avaliarEsperado, lerMatriz, verificar } from "../scripts/demo-isolado/verificar.mjs";

const FIXTURE = path.resolve("scripts/demo-isolado/fixture-exemplo.json");
const MATRIZ = path.resolve("scripts/demo-isolado/matriz-exemplo.tsv");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

type Json = Record<string, any>;
type Chamada = { metodo: string; caminho: string; corpo: Json | undefined };
type Conta = { id: string; tenantId: string; email: string; nome: string; senha: string; trocar: boolean; roles: string[] };

// Menu do servidor por papel: um SUBCONJUNTO do que a API real devolveu para cada login (F3-T6).
const MENU: Record<string, string[]> = {
  super_admin: ["/platform/dashboard", "/platform/tenants", "/dashboard", "/users"],
  tenant_admin: ["/dashboard", "/users", "/administrator/audit", "/audit", "/work-orders", "/operations/map", "/finance"],
  manager: ["/dashboard", "/work-orders", "/operations/map", "/patios/painel", "/finance"],
  field_dispatcher: ["/dashboard", "/work-orders", "/operations/dispatches"],
  field_technician: ["/dashboard", "/work-orders", "/operations/dispatches"],
  finance: ["/work-orders", "/finance", "/finance/payments"],
  auditor: ["/dashboard", "/audit", "/administrator/audit", "/work-orders", "/operations/map", "/finance"],
};

const SENHA_PLATAFORMA = `plat-${randomUUID()}`;
const SENHA_DEMO = `demo-${randomUUID()}`;
const PROVISORIA_ADMIN = `prov-${randomUUID()}`;

function criarApi() {
  const plataformaId = randomUUID();
  const orgId = randomUUID();
  const orgs = [
    { id: plataformaId, name: "Plataforma", slug: "platform" },
    { id: orgId, name: fixture.organizacao.nome, slug: "organizacao-exemplo-x" },
  ];
  const contas: Conta[] = [
    { id: randomUUID(), tenantId: plataformaId, email: fixture.plataforma.email, nome: "Plataforma", senha: SENHA_PLATAFORMA, trocar: false, roles: ["super_admin"] },
    { id: randomUUID(), tenantId: orgId, email: fixture.admin.email, nome: fixture.admin.nome, senha: PROVISORIA_ADMIN, trocar: true, roles: ["tenant_admin"] },
  ];
  const tokens = new Map<string, string>();
  const colecoes: Record<string, Json[]> = { customers: [], vehicles: [], teams: [], "service-catalog": [], "price-tables": [], tariffs: [] };
  const chamadas: Chamada[] = [];
  const opcoes = { semTenantIdNoLogin401: true };

  const resposta = (status: number, corpo: unknown) =>
    new Response(corpo === undefined ? "" : JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
  const erro = (status: number, code: string, reason?: string) => resposta(status, { error: { code, ...(reason ? { reason } : {}) } });
  const lista = (itens: Json[], url: URL) => {
    const busca = (url.searchParams.get("search") ?? "").toLowerCase();
    const filtrados = itens.filter((i) => !busca || [i.name, i.plate].some((v) => String(v ?? "").toLowerCase().includes(busca)));
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
    // Forma medida: {items, pagination:{limit, offset, total}}, sem o envelope `data` (F3-T3).
    return resposta(200, { items: filtrados.slice(offset, offset + limit), pagination: { limit, offset, total: filtrados.length } });
  };

  async function fetch(endereco: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
    const url = new URL(endereco);
    const metodo = (init.method ?? "GET").toUpperCase();
    const caminho = url.pathname.replace(/^\/api\/v1/, "");
    const corpo = init.body ? JSON.parse(init.body) : undefined;
    chamadas.push({ metodo, caminho: caminho + url.search, corpo });

    if (metodo === "POST" && caminho === "/auth/login") {
      // Sob o papel de runtime, login sem tenantId → 401 INVALID_CREDENTIALS (E11-P2; F3-T2).
      if (!corpo?.tenantId && opcoes.semTenantIdNoLogin401) return erro(401, "INVALID_CREDENTIALS");
      // tenantId de outra organizacao → 401 (F3-T7).
      const conta = contas.find((c) => c.email === corpo?.email && c.tenantId === corpo?.tenantId);
      if (!conta || conta.senha !== corpo?.password) return erro(401, "INVALID_CREDENTIALS");
      const token = `tok-${randomUUID()}`;
      tokens.set(token, conta.id);
      return resposta(200, { data: { access_token: token, must_change_password: conta.trocar } });
    }

    const token = (init.headers?.authorization ?? "").replace(/^Bearer /, "");
    const conta = contas.find((c) => c.id === tokens.get(token));
    // Token revogado pela troca de senha → 401 session_inactive (F3-T7).
    if (!conta) return erro(401, "UNAUTHORIZED", "session_inactive");

    if (metodo === "POST" && caminho === "/auth/password") {
      if (corpo?.currentPassword !== conta.senha) return erro(401, "UNAUTHORIZED", "invalid_credentials");
      conta.senha = corpo.newPassword;
      conta.trocar = false;
      // A troca derruba todas as sessoes da conta, inclusive a atual (F3-T7: revoked_sessions=1).
      for (const [t, id] of [...tokens]) if (id === conta.id) tokens.delete(t);
      return resposta(200, { data: { changed: true, revoked_sessions: 1, unlinked: false } });
    }
    // Token da provisoria fora da troca → 403 password_change_required (F3-T7).
    if (conta.trocar) return erro(403, "FORBIDDEN", "password_change_required");

    if (metodo === "GET" && caminho === "/navigation/menu") {
      const caminhos = [...new Set(conta.roles.flatMap((r) => MENU[r] ?? []))];
      return resposta(200, { data: caminhos.map((p) => ({ id: p, path: p, children: [] })) });
    }
    if (metodo === "GET" && caminho === "/platform/overview") {
      if (!conta.roles.includes("super_admin")) return erro(403, "FORBIDDEN");
      // Forma medida (F3-T2): {data:{totalOrgs, orgs:[{id,name,slug,…}]}}.
      return resposta(200, { data: { totalOrgs: orgs.length, orgs } });
    }
    if (conta.tenantId !== orgId) return erro(403, "FORBIDDEN", "module_not_enabled");

    if (caminho === "/users") {
      const daOrg = contas.filter((c) => c.tenantId === orgId);
      const dto = (c: Conta) => ({ id: c.id, tenantId: c.tenantId, name: c.nome, email: c.email, roles: c.roles, status: "active" });
      // GET /users → {data:[…]}, papeis como texto (F3-T2).
      if (metodo === "GET") return resposta(200, { data: daOrg.map(dto) });
      if (metodo === "POST") {
        // E-mail repetido → 409 user_email_conflict (E10; F3-T2).
        if (daOrg.some((c) => c.email === corpo.email)) return erro(409, "CONFLICT", "user_email_conflict");
        const nova: Conta = { id: randomUUID(), tenantId: orgId, email: corpo.email, nome: corpo.name, senha: `prov-${randomUUID()}`, trocar: true, roles: corpo.roles };
        contas.push(nova);
        // A provisoria volta UMA vez, no 201 (E10; F3-T2).
        return resposta(201, { data: { ...dto(nova), temporaryPassword: nova.senha } });
      }
    }

    const m = /^\/(customers|vehicles|teams|service-catalog|price-tables|tariffs)(?:\/([^/]+))?(\/members)?$/.exec(caminho);
    if (m) {
      const [, nome, id, membros] = m;
      const itens = colecoes[nome];
      if (metodo === "GET" && !id) return lista(itens, url);
      if (metodo === "GET" && id && !membros) {
        const item = itens.find((i) => i.id === id);
        return item ? resposta(200, { data: item }) : erro(404, "NOT_FOUND");
      }
      if (metodo === "POST" && !id) {
        // Repetido (F3-T7): cliente → 201 (duplica); viatura → 409 duplicate_plate; equipe, servico e tabela →
        // 409 duplicate_name. Tarifa repetida nao foi medida: o falso aceita (o motor tem de ler antes).
        if (nome === "vehicles" && itens.some((i) => i.plate === corpo.plate)) return erro(409, "CONFLICT", "duplicate_plate");
        if (["teams", "service-catalog", "price-tables"].includes(nome) && itens.some((i) => i.name === corpo.name)) {
          return erro(409, "CONFLICT", "duplicate_name");
        }
        const novo: Json = { id: randomUUID(), name: corpo.name, ...(nome === "vehicles" ? { plate: corpo.plate, status: "active" } : {}) };
        if (nome === "teams") Object.assign(novo, { members: [], memberCount: 0 });
        if (nome === "service-catalog") Object.assign(novo, { basePrice: 350 });
        if (nome === "price-tables") Object.assign(novo, { status: "draft" });
        if (nome === "tariffs") Object.assign(novo, { priceTableId: corpo.price_table_id, serviceCatalogId: corpo.service_catalog_id, unitPrice: 350 });
        itens.push(novo);
        return resposta(201, { data: novo });
      }
      if (metodo === "POST" && id && membros && nome === "teams") {
        const equipe = itens.find((i) => i.id === id);
        if (!equipe) return erro(404, "NOT_FOUND");
        // Membro repetido → 409 duplicate_member (F3-T3).
        if (equipe.members.some((x: Json) => x.userId === corpo.user_id)) return erro(409, "CONFLICT", "duplicate_member");
        equipe.members.push({ id: randomUUID(), userId: corpo.user_id });
        equipe.memberCount = equipe.members.length;
        return resposta(201, { data: equipe.members.at(-1) });
      }
      if (metodo === "PATCH" && id && nome === "price-tables") {
        const tabela = itens.find((i) => i.id === id);
        if (!tabela) return erro(404, "NOT_FOUND");
        // draft → published → 200 (F3-T3).
        tabela.status = corpo.status;
        return resposta(200, { data: tabela });
      }
    }
    return erro(404, "NOT_FOUND");
  }

  const escritas = () => chamadas.filter((c) => c.metodo !== "GET" && c.caminho !== "/auth/login");
  const estado = () => JSON.stringify({ colecoes, contas: contas.map((c) => ({ email: c.email, roles: c.roles, trocar: c.trocar })) });
  return { fetch, chamadas, escritas, estado, plataformaId, orgId, opcoes };
}

function prepararDir(api: ReturnType<typeof criarApi>, comTenantId = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "demo-isolado-motor-"));
  const saida = path.join(dir, "saida");
  fs.mkdirSync(saida);
  fs.writeFileSync(path.join(dir, "plataforma.pw"), `${SENHA_PLATAFORMA}\n`);
  fs.writeFileSync(path.join(dir, "demo.pw"), `${SENHA_DEMO}\n`);
  if (comTenantId) fs.writeFileSync(path.join(saida, "plataforma.tenant-id"), api.plataformaId);
  fs.writeFileSync(path.join(saida, `${fixture.admin.email}.provisoria`), PROVISORIA_ADMIN);
  return {
    dir,
    saida,
    argv: (extra: string[] = []) => [
      "--fixture", FIXTURE,
      "--admin-plataforma", path.join(dir, "plataforma.pw"),
      "--senhas", path.join(dir, "demo.pw"),
      "--provisorias", saida,
      ...extra,
    ],
    limpar: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

const AMBIENTE = ["DEMO_ISOLADO_API", "DEMO_ISOLADO_PROJETO", "NODE_ENV", "ALLOW_PROD_SEED", "ALLOW_PROD_BOOTSTRAP"];
async function comAmbiente<T>(valores: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const antes = Object.fromEntries(AMBIENTE.map((k) => [k, process.env[k]]));
  for (const k of AMBIENTE) delete process.env[k];
  for (const [k, v] of Object.entries(valores)) if (v !== undefined) process.env[k] = v;
  try {
    return await fn();
  } finally {
    for (const k of AMBIENTE) {
      if (antes[k] === undefined) delete process.env[k];
      else process.env[k] = antes[k];
    }
  }
}

const BOM = { DEMO_ISOLADO_API: "http://127.0.0.1:3111", DEMO_ISOLADO_PROJETO: "b10b-seed" };

async function rodarMotor(api: ReturnType<typeof criarApi>, argv: string[], ambiente: Record<string, string | undefined> = BOM) {
  const linhas: string[] = [];
  const codigo = await comAmbiente(ambiente, () => semear({ argv, fetch: api.fetch, escrever: (l: string) => linhas.push(l) }));
  return { codigo, linhas, saida: linhas.join("\n") };
}

async function rodarVerificador(api: ReturnType<typeof criarApi>, argv: string[], ambiente: Record<string, string | undefined> = BOM) {
  const linhas: string[] = [];
  const codigo = await comAmbiente(ambiente, () => verificar({ argv, fetch: api.fetch, escrever: (l: string) => linhas.push(l) }));
  return { codigo, linhas, saida: linhas.join("\n") };
}

const semProvisorias = (argv: string[]) => argv.filter((_, i, a) => a[i] !== "--provisorias" && a[i - 1] !== "--provisorias");

test("C6 idempotencia: a 1a execucao cria tudo; a 2a faz 0 escritas e imprime criados=0 (mata a M8)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r1 = await rodarMotor(api, d.argv());
    assert.equal(r1.codigo, 0, r1.saida);
    const fim1 = /DEMO-ISOLADO FIM criados=([0-9]+)/.exec(r1.saida);
    assert.ok(fim1 && fim1[1] !== "0", r1.saida);
    const estado1 = api.estado();
    const escritas1 = api.escritas().length;
    assert.ok(escritas1 > 0);

    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 0, r2.saida);
    assert.match(r2.saida, /^DEMO-ISOLADO FIM criados=0 existentes=[1-9][0-9]*$/m);
    for (const etapa of ["ET1", "ET2", "ET3"]) assert.match(r2.saida, new RegExp(`^ETAPA ${etapa} criados=0 `, "m"));
    assert.equal(api.escritas().length, escritas1, "a 2a execucao nao pode escrever");
    assert.equal(api.estado(), estado1);
  } finally {
    d.limpar();
  }
});

test("C6 provisorias: cada troca termina e apaga o arquivo; na 2a execucao nenhum login usa provisoria", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    assert.deepEqual(fs.readdirSync(d.saida), ["plataforma.tenant-id"]);
    const logins = () => api.chamadas.filter((c) => c.caminho === "/auth/login");
    const antes = logins().length;
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const segunda = logins().slice(antes);
    // 1 login por papel por execucao (R2 do plano v2): plataforma, admin e os 5 usuarios.
    assert.equal(segunda.length, 2 + fixture.usuarios.length);
    assert.ok(segunda.every((c) => c.corpo?.password === SENHA_DEMO || c.corpo?.password === SENHA_PLATAFORMA));
  } finally {
    d.limpar();
  }
});

test("C2 motor: alvo recusado sai 2 com 0 chamadas (mata a M5)", async () => {
  const bases = [
    "https://api.producao.exemplo.invalid",
    "http://localhost:3101",
    "http://192.168.0.10:3101",
    "http://100.64.0.1:3101",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3200",
    "https://api:3000",
    "https://127.0.0.1:3101",
    undefined,
  ];
  for (const base of bases) {
    const api = criarApi();
    const d = prepararDir(api);
    try {
      const r = await rodarMotor(api, d.argv(), { ...BOM, DEMO_ISOLADO_API: base });
      assert.equal(r.codigo, 2, `${base}: ${r.saida}`);
      assert.match(r.saida, /^DEMO-ISOLADO RECUSA ALVO_RECUSADO$/m);
      assert.equal(api.chamadas.length, 0, `${base}: houve chamada`);
    } finally {
      d.limpar();
    }
  }
});

test("C1 motor: producao sai 2, sem escape, com 0 chamadas", async () => {
  for (const extra of [{}, { ALLOW_PROD_SEED: "1" }, { ALLOW_PROD_BOOTSTRAP: "1" }]) {
    const api = criarApi();
    const d = prepararDir(api);
    try {
      const r = await rodarMotor(api, d.argv(), { ...BOM, NODE_ENV: "production", ...extra });
      assert.equal(r.codigo, 2, r.saida);
      assert.match(r.saida, /AMBIENTE_PRODUCAO/);
      assert.equal(api.chamadas.length, 0);
    } finally {
      d.limpar();
    }
  }
});

test("C3 motor: projeto fora da lista sai 2 com 0 chamadas", async () => {
  for (const projeto of ["erp-o6r-smoke", "", "b10b-", "b10bx-seed", "b10b-Seed"]) {
    const api = criarApi();
    const d = prepararDir(api);
    try {
      const r = await rodarMotor(api, d.argv(), { ...BOM, DEMO_ISOLADO_PROJETO: projeto });
      assert.equal(r.codigo, 2, `${projeto}: ${r.saida}`);
      assert.equal(api.chamadas.length, 0);
    } finally {
      d.limpar();
    }
  }
});

test("C5 motor: sem senha sai 4 com 0 chamadas; senha, provisoria e id nunca na saida", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const semSenha = d.argv().filter((_, i, a) => a[i] !== "--senhas" && a[i - 1] !== "--senhas");
    const r = await rodarMotor(api, semSenha);
    assert.equal(r.codigo, 4, r.saida);
    assert.match(r.saida, /SENHA_AUSENTE/);
    assert.equal(api.chamadas.length, 0);

    const semPlataforma = d.argv().filter((_, i, a) => a[i] !== "--admin-plataforma" && a[i - 1] !== "--admin-plataforma");
    const r2 = await rodarMotor(api, semPlataforma);
    assert.equal(r2.codigo, 4, r2.saida);
    assert.equal(api.chamadas.length, 0);

    const ok = await rodarMotor(api, d.argv());
    assert.equal(ok.codigo, 0, ok.saida);
    for (const segredo of [SENHA_DEMO, SENHA_PLATAFORMA, PROVISORIA_ADMIN, api.plataformaId, api.orgId]) {
      assert.equal(ok.saida.includes(segredo), false, "segredo ou id na saida");
    }
  } finally {
    d.limpar();
  }
});

test("C6-e11 motor: todo login manda tenantId; sem o arquivo do id sai 3 com 0 chamadas (mata a M23)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r = await rodarMotor(api, d.argv());
    assert.equal(r.codigo, 0, r.saida);
    const logins = api.chamadas.filter((c) => c.caminho === "/auth/login");
    assert.ok(logins.length >= 7);
    assert.ok(logins.every((c) => typeof c.corpo?.tenantId === "string" && c.corpo.tenantId.length === 36), "login sem tenantId");
    assert.equal(logins[0].corpo?.tenantId, api.plataformaId);
    assert.ok(logins.slice(1).every((c) => c.corpo?.tenantId === api.orgId));
  } finally {
    d.limpar();
  }
  for (const conteudo of [undefined, "nao-e-uuid"]) {
    const api2 = criarApi();
    const d2 = prepararDir(api2, false);
    try {
      if (conteudo) fs.writeFileSync(path.join(d2.saida, "plataforma.tenant-id"), conteudo);
      const r = await rodarMotor(api2, d2.argv());
      assert.equal(r.codigo, 3, r.saida);
      assert.match(r.saida, /^DEMO-ISOLADO RECUSA FUNDACAO_AUSENTE$/m);
      assert.equal(api2.chamadas.length, 0);
    } finally {
      d2.limpar();
    }
  }
});

test("C4 motor: censo na fonte real — fundacao ausente, base nao virgem e API em memoria saem 3 sem escrita", async () => {
  // Os casos mexem no `overview` da API falsa: o falso devolve a lista de orgs que o teste injetar.
  for (const [nome, motivo, orgs] of [
    ["sem a org da fixture", "FUNDACAO_AUSENTE", (a: any) => [{ id: a.plataformaId, name: "Plataforma", slug: "platform" }]],
    ["com outra organizacao", "ALVO_NAO_VIRGEM", (a: any) => [
      { id: a.plataformaId, name: "Plataforma", slug: "platform" },
      { id: a.orgId, name: fixture.organizacao.nome, slug: "organizacao-exemplo-x" },
      { id: randomUUID(), name: "Outra Exemplo", slug: "outra-exemplo-x" },
    ]],
    ["API em memoria (lista vazia)", "PERSISTENCIA_NAO_REAL", () => []],
  ] as const) {
    const api = criarApi();
    const d = prepararDir(api);
    const original = api.fetch;
    const comOverview = async (endereco: string, init: any = {}) => {
      if (new URL(endereco).pathname.endsWith("/platform/overview")) {
        api.chamadas.push({ metodo: "GET", caminho: "/platform/overview", corpo: undefined });
        const lista = (orgs as any)(api);
        return new Response(JSON.stringify({ data: { totalOrgs: lista.length, orgs: lista } }), { status: 200 });
      }
      return original(endereco, init);
    };
    try {
      const linhas: string[] = [];
      const codigo = await comAmbiente(BOM, () => semear({ argv: d.argv(), fetch: comOverview, escrever: (l: string) => linhas.push(l) }));
      assert.equal(codigo, 3, `${nome}: ${linhas.join("\n")}`);
      assert.ok(linhas.includes(`DEMO-ISOLADO RECUSA ${motivo}`), `${nome}: ${linhas.join("\n")}`);
      assert.equal(api.escritas().length, 0, `${nome}: escreveu`);
    } finally {
      d.limpar();
    }
  }
});

test("verificador: depois do motor, a matriz generica fecha com falta=0", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const r = await rodarVerificador(api, [...semProvisorias(d.argv()), "--matriz", MATRIZ, "--provisorias", d.saida]);
    assert.equal(r.codigo, 0, r.saida);
    const total = lerMatriz(fs.readFileSync(MATRIZ, "utf8")).length;
    assert.match(r.saida, new RegExp(`^VERIFICADOR ok=${total} falta=0$`, "m"));
    assert.equal((r.saida.match(/^PRE MENU-[a-z]+ OK$/gm) ?? []).length, 7);
  } finally {
    d.limpar();
  }
});

test("C6-e11 verificador: todo login do verificador manda tenantId (mata a M23b)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const antes = api.chamadas.length;
    const r = await rodarVerificador(api, [...semProvisorias(d.argv()), "--matriz", MATRIZ, "--provisorias", d.saida]);
    assert.equal(r.codigo, 0, r.saida);
    const logins = api.chamadas.slice(antes).filter((c) => c.caminho === "/auth/login");
    assert.equal(logins.length, 7, "1 login por papel");
    assert.ok(logins.every((c) => typeof c.corpo?.tenantId === "string" && c.corpo.tenantId.length === 36), "login sem tenantId");
    assert.equal(api.chamadas.slice(antes).filter((c) => c.metodo !== "GET" && c.caminho !== "/auth/login").length, 0, "o verificador escreveu");
  } finally {
    d.limpar();
  }
});

test("verificador morde: antes do motor sai 6 com falta>0; sem o id sai 3 sem chamada", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r = await rodarVerificador(api, [...semProvisorias(d.argv()), "--matriz", MATRIZ, "--provisorias", d.saida]);
    assert.equal(r.codigo, 6, r.saida);
    const m = /^VERIFICADOR ok=([0-9]+) falta=([0-9]+)$/m.exec(r.saida);
    assert.ok(m && m[2] !== "0", r.saida);
  } finally {
    d.limpar();
  }
  const api2 = criarApi();
  const d2 = prepararDir(api2, false);
  try {
    const r = await rodarVerificador(api2, [...semProvisorias(d2.argv()), "--matriz", MATRIZ, "--provisorias", d2.saida]);
    assert.equal(r.codigo, 3, r.saida);
    assert.equal(api2.chamadas.length, 0);
  } finally {
    d2.limpar();
  }
});

test("verificador: matriz vazia, so com cabecalho ou com cabecalho errado sai 1 (nunca verde vazio)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    for (const conteudo of ["", "# so comentario\n", "passo\tid\tpapel\tleitura\tesperado\n", "a\tb\tc\td\te\nx\ty\tz\tGET /users\tminimo 1\n"]) {
      const arq = path.join(d.dir, "m.tsv");
      fs.writeFileSync(arq, conteudo);
      const r = await rodarVerificador(api, [...semProvisorias(d.argv()), "--matriz", arq, "--provisorias", d.saida]);
      assert.equal(r.codigo, 1, JSON.stringify(conteudo) + r.saida);
      assert.match(r.saida, /MATRIZ_INVALIDA/);
    }
  } finally {
    d.limpar();
  }
});

test("verificador: as formas do esperado", () => {
  const lista = { status: 200, json: { items: [{ name: "A", operator: { email: "x@exemplo.invalid" }, roles: ["manager"] }] } };
  assert.equal(avaliarEsperado("existe name=A", lista), null);
  assert.equal(avaliarEsperado("existe operator.email=x@exemplo.invalid & roles.0=manager", lista), null);
  assert.notEqual(avaliarEsperado("existe name=B", lista), null);
  assert.equal(avaliarEsperado("existe name=*", lista), null);
  assert.equal(avaliarEsperado("minimo 1", lista), null);
  assert.notEqual(avaliarEsperado("minimo 2", lista), null);
  assert.equal(avaliarEsperado("campo memberCount=1", { status: 200, json: { data: { memberCount: 1 } } }), null);
  assert.notEqual(avaliarEsperado("campo memberCount=1", { status: 200, json: { data: { memberCount: 0 } } }), null);
  assert.equal(avaliarEsperado("status 403", { status: 403, json: null }), null);
  assert.notEqual(avaliarEsperado("minimo 0", { status: 403, json: null }), null);
  const menu = { status: 200, json: { data: [{ id: "a", path: "/a", children: [{ id: "b", path: "/b" }] }] } };
  assert.equal(avaliarEsperado("menu tem=/a,/b nao_tem=/c", menu), null);
  assert.notEqual(avaliarEsperado("menu tem=/c", menu), null);
  assert.notEqual(avaliarEsperado("menu nao_tem=/b", menu), null);
  assert.notEqual(avaliarEsperado("forma-desconhecida x", lista), null);
});
