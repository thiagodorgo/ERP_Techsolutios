// DEMO-A · AC-03 do plano DEMO-SOCIO — os dados da demonstração ao sócio, na pilha isolada `demo-socio`.
// ZERO dependência nova. Pré-requisito: a pilha de pé, subida UMA vez pelo script do repositório:
//
//   TRC_DEMO_PROJECT=demo-socio TRC_DEMO_PASSWORD=… node scripts/traccar-dev-demo.mjs --keep --with-web
//
// Uso (senhas SÓ por variável de ambiente; nunca no código, no argv nem no log):
//
//   DEMO_MANAGER_PASSWORD=… DEMO_ADMIN_PASSWORD=… DEMO_TECH_PASSWORD=… DEMO_DISPATCHER_PASSWORD=… \
//     node scripts/demo-socio-seed.mjs            # cria o que falta; rodar de novo não duplica nada
//   DEMO_TECH_PASSWORD=… node scripts/demo-socio-seed.mjs --posicao [--lat=<lat> --lon=<lon>]
//                                                # posição inicial do guincheiro pelo caminho REAL do app
//                                                # (POST /api/v1/mobile/field-locations), até 15 min antes da demo
//
// O que cria (plano §1.2): organização "Guincho Exemplo" com os 6 módulos; gestor, administrador, guincheiro e
// despachante, todos COM senha; serviço "Remoção / Guincho" (socorro, com destino) e a tarifa vigente que a OS
// com cliente + serviço exige; 3 viaturas ("Guincho 01" sem manutenção em execução) e 3 clientes; Frota (multa,
// seguro e manutenção) nas OUTRAS viaturas; Pátio Central, Perfil Normativo e 2 Processos; o modelo de checklist
// "Vistoria de guincho" publicado e a regra de aplicabilidade para o serviço; o vínculo `guincho01` ↔ "Guincho 01";
// 11 OS de fundo em status variados (nenhuma com o "Guincho 01") e 1 OS reserva com o "Guincho 01", sem despacho.
//
// Caminho de cada dado (rota da API sempre que existe; o resto DECLARADO aqui):
//   - organização e usuários: o agregado core-saas DENTRO da `api` (o mesmo caminho de scripts/traccar-dev-demo.mjs).
//     Criar organização exige `platform_admin`, que a pilha não tem, e NÃO HÁ ROTA que grave senha (o "Novo
//     usuário" da web cria cadastro sem credencial — pendência ALTA P-USERS-DEFEITOS-14-10).
//   - módulos que faltarem numa organização que já existe: SQL (UPDATE tenants), pela mesma razão.
//   - regra de aplicabilidade do checklist: SQL — NÃO HÁ ROTA (checklist-applicability nasceu sem REST, PR-04a).
//   - vínculo do rastreador: SQL — NÃO HÁ ROTA nem tela (plano §1.3; a tela é etapa futura).
//   - todo o resto: rotas REST /api/v1, logado como o administrador da organização (e o guincheiro no --posicao).
//
// Trava: recusa rodar fora do projeto `demo-socio` (rótulo do compose) e da API 127.0.0.1:3102. Nunca toca a base
// viva (5432/6379), nem contêiner `erp-*`, nem as portas 3000/5173/5050/8899 (scripts/demo-socio-lib.mjs).
// Saída: só nome de passo e contagens — nunca senha, token, id de organização ou coordenada.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DEMO_API_HOST,
  DEMO_API_PORT,
  DEMO_DEVICE_ID,
  DEMO_INSTANCE_KEY,
  DEMO_PROJECT,
  PASSWORD_ENV,
  demoTargetRefusals,
  missingPasswords,
  normalizeKey,
  planEnsure,
  readFlag,
  redactSecrets,
  statusPath,
} from "./demo-socio-lib.mjs";

const BASE_URL = `http://${DEMO_API_HOST}:${DEMO_API_PORT}/api/v1`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;

// ------------------------------------------------------------------------------------------------ dados (fictícios)
export const TENANT = Object.freeze({
  name: "Guincho Exemplo",
  modules: Object.freeze(["dashboard", "work_orders", "field_operations", "tenant_checklist", "finance", "notifications"]),
});

export const USERS = Object.freeze([
  { key: "manager", name: "Gestor Demo", email: "gestor@guincho-exemplo.demo.invalid", roles: ["manager"], passwordEnv: PASSWORD_ENV.manager },
  { key: "admin", name: "Administrador Demo", email: "admin@guincho-exemplo.demo.invalid", roles: ["tenant_admin"], passwordEnv: PASSWORD_ENV.admin },
  { key: "tech", name: "Carlos Guincheiro", email: "guincheiro@guincho-exemplo.demo.invalid", roles: ["field_technician"], passwordEnv: PASSWORD_ENV.tech },
  { key: "dispatcher", name: "Despacho Demo", email: "despacho@guincho-exemplo.demo.invalid", roles: ["field_dispatcher"], passwordEnv: PASSWORD_ENV.dispatcher },
]);

export const SERVICE = Object.freeze({
  name: "Remoção / Guincho",
  category: "Guincho",
  serviceType: "socorro",
  requiresDestination: true,
  estimatedDurationMinutes: 90,
  basePrice: 350,
  description: "Remoção de veículo com guincho até o destino informado.",
});

export const PRICE_TABLE = Object.freeze({ name: "Tabela Guincho Exemplo 2026", currency: "BRL", description: "Tabela de valores da demonstração." });
export const TARIFF = Object.freeze({ name: "Remoção / Guincho – tarifa padrão", unitPrice: 350, currency: "BRL", origin: "manual" });

export const GUINCHO_01_PLATE = "GEX1A23";
export const VEHICLES = Object.freeze([
  { plate: GUINCHO_01_PLATE, model: "Guincho 01", type: "Guincho plataforma", year: 2021 },
  { plate: "GEX2B34", model: "Guincho 02", type: "Guincho asa-delta", year: 2019 },
  { plate: "GEX3C45", model: "Plataforma 03", type: "Guincho plataforma", year: 2017 },
]);

export const CUSTOMERS = Object.freeze([
  { key: "seguradora", name: "Seguradora Horizonte (demo)", document: "11222333000181", phone: "1130000001", email: "sinistros@horizonte.demo.invalid", city: "São Paulo", state: "SP" },
  { key: "particular", name: "Mariana Souza (demo)", document: "12345678909", phone: "11990000002", city: "São Paulo", state: "SP" },
  { key: "locadora", name: "Locadora Rápida (demo)", document: "44555666000172", phone: "1130000003", email: "frota@rapida.demo.invalid", city: "São Paulo", state: "SP" },
]);

/** Frota só nas OUTRAS viaturas: o "Guincho 01" não pode ter manutenção em execução (plano §1.2). */
export const FLEET = Object.freeze({
  maintenance: [
    { plate: "GEX2B34", type: "preventiva", description: "Troca de óleo e filtros (demo)", odometer: 85000, cost: 450, scheduledInDays: 7 },
    { plate: "GEX3C45", type: "corretiva", description: "Revisão do sistema hidráulico da plataforma (demo)", odometer: 132000, cost: 1800, scheduledInDays: 3 },
  ],
  fines: [
    { plate: "GEX2B34", numeroAuto: "SP-DEMO-0001", orgao: "DETRAN-SP", valor: 293.47, pontos: 7, descricao: "Avançar o sinal vermelho (demo)", daysAgo: 20 },
    { plate: "GEX3C45", numeroAuto: "SP-DEMO-0002", orgao: "CET-SP", valor: 195.23, pontos: 5, descricao: "Estacionar em local proibido (demo)", daysAgo: 12 },
  ],
  insurance: [
    { plate: "GEX2B34", numeroApolice: "APL-DEMO-2026-001", seguradora: "Seguradora Horizonte (demo)", valor: 4800, cobertura: "Compreensiva", startedDaysAgo: 60 },
    { plate: "GEX3C45", numeroApolice: "APL-DEMO-2026-002", seguradora: "Seguradora Horizonte (demo)", valor: 5200, cobertura: "Compreensiva", startedDaysAgo: 150 },
  ],
});

export const YARD = Object.freeze({ name: "Pátio Central", address: "Rua Guaicurus, 1000 – Lapa, São Paulo – SP", capacityHint: 120 });
export const JURISDICTION = Object.freeze({
  name: "Convênio DETRAN-SP (demo)",
  scope: "PUBLIC_AGREEMENT",
  notes: "Perfil normativo fictício da demonstração.",
  releaseRequirements: [
    { code: "crlv", label: "CRLV do veículo", required: true },
    { code: "doc_proprietario", label: "Documento do proprietário", required: true },
    { code: "guia_diarias", label: "Guia de pagamento das diárias", required: true },
  ],
});
export const IMPOUND_PROCESSES = Object.freeze([
  { vehiclePlate: "DEM4E56", vehicleBrand: "Fiat", vehicleModel: "Uno", vehicleColor: "Branco", vehicleYear: 2012, originAuthority: "DETRAN-SP", legalBasis: "CTB, art. 328", incidentReportNumber: "AIT-DEMO-1001" },
  { vehiclePlate: "DEM7F89", vehicleBrand: "Honda", vehicleModel: "Civic", vehicleColor: "Preto", vehicleYear: 2018, originAuthority: "Polícia Militar – SP", legalBasis: "CTB, art. 230", incidentReportNumber: "AIT-DEMO-1002" },
]);

export const CHECKLIST = Object.freeze({
  name: "Vistoria de guincho",
  description: "Vistoria do veículo antes da remoção: estado geral, avarias e foto.",
  type: "towing_collection",
  components: [
    { componentKey: "estado_geral", type: "single_choice", label: "Estado geral do veículo", required: true, orderIndex: 0, config: { options: ["Bom", "Regular", "Ruim"] } },
    { componentKey: "avarias", type: "damage_map", label: "Avarias encontradas", required: false, orderIndex: 1, config: {} },
    // Foto NÃO obrigatória: o servidor da demo recusa todo arquivo até existir o antivírus (plano §4, P1); foto
    // obrigatória travaria o "Concluir OS".
    { componentKey: "foto_avaria", type: "photo_upload", label: "Foto da avaria", required: false, orderIndex: 2, config: {} },
    { componentKey: "observacoes", type: "observation", label: "Observações do guincheiro", required: false, orderIndex: 3, config: {} },
  ],
});

/** Origem do chamado = fim do trajeto (o pino "chega"); destino = Pátio Central. Coordenadas SINTÉTICAS. */
export const RESERVE_ORDER = Object.freeze({
  title: "Remoção de veículo – pane elétrica (reserva)",
  description: "OS reserva da demonstração: usar só se a criação ao vivo falhar.",
  priority: "high",
  serviceAddress: "Av. Paulista, 2000 – Bela Vista",
  serviceCity: "São Paulo",
  serviceState: "SP",
  serviceLatitude: -23.569,
  serviceLongitude: -46.6494,
  destinationAddress: YARD.address,
  destinationCity: "São Paulo",
  destinationState: "SP",
  destinationLatitude: -23.5275,
  destinationLongitude: -46.678,
  serviceDetails: { plate: "FIC9D87", vehicle: "VW Gol 2015", color: "Prata" },
});

/** OS de fundo: nenhuma com viatura (logo nenhuma com o "Guincho 01") e nenhuma com despacho. */
export const BACKGROUND_ORDERS = Object.freeze([
  { title: "Remoção – pane seca na Marginal Pinheiros", customer: "seguradora", priority: "high", status: "completed" },
  { title: "Socorro – bateria descarregada na Vila Mariana", customer: "particular", priority: "medium", status: "completed" },
  { title: "Remoção – colisão leve na Av. Rebouças", customer: "seguradora", priority: "high", status: "completed" },
  { title: "Remoção – carro de locadora em Pinheiros", customer: "locadora", priority: "medium", status: "completed" },
  { title: "Remoção – veículo parado na Mooca", customer: "seguradora", priority: "urgent", status: "in_progress" },
  { title: "Socorro – pane mecânica no Butantã", customer: "particular", priority: "medium", status: "paused" },
  { title: "Socorro – pneu furado na Av. Brasil", customer: "locadora", priority: "low", status: "on_route" },
  { title: "Remoção – pane elétrica na Consolação", customer: "seguradora", priority: "high", status: "accepted" },
  { title: "Remoção – troca de veículo da locadora na Lapa", customer: "locadora", priority: "medium", status: "assigned" },
  { title: "Socorro – chave trancada em Moema", customer: "particular", priority: "low", status: "open" },
  { title: "Remoção – sinistro em Santana", customer: "seguradora", priority: "high", status: "open" },
  { title: "Remoção – chamado duplicado no Tatuapé", customer: "particular", priority: "low", status: "cancelled" },
]);

/** Posição inicial do guincheiro: perto do início do trajeto, mas NÃO no mesmo ponto (plano §1.2, §1.4). */
export const DEFAULT_START_POSITION = Object.freeze({ lat: -23.5609, lon: -46.6566 });

// ------------------------------------------------------------------------------------------------ infraestrutura
function docker(args, { input, env, timeout = 120_000, allowFailure = false } = {}) {
  const result = spawnSync("docker", args, {
    input,
    env: env ?? process.env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout,
  });
  if (result.error) throw new Error(`docker ${args[0]}: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    const detail = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim().split("\n").slice(-4).join(" | ");
    throw new Error(`docker ${args.slice(0, 2).join(" ")} saiu com ${result.status}: ${redact(detail)}`);
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function secrets() {
  return Object.values(PASSWORD_ENV).map((key) => process.env[key]);
}
function redact(text) {
  return redactSecrets(text, secrets())
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<token>");
}

/** Lê o `docker ps` inteiro e aplica a trava pura. Devolve os nomes dos contêineres api e postgres do projeto. */
export function guardTerrain() {
  const requested = process.env.TRC_DEMO_PROJECT?.trim() || DEMO_PROJECT;
  const { stdout } = docker(["ps", "--format", "{{json .}}"], { timeout: 30_000 });
  const containers = stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const refusals = demoTargetRefusals({ project: requested, apiHost: DEMO_API_HOST, apiPort: DEMO_API_PORT, containers });
  if (refusals.length > 0) throw new Error(`RECUSADO: ${refusals.join("; ")}`);
  const byService = (service) =>
    containers.find((row) => row.Labels?.includes(`com.docker.compose.project=${DEMO_PROJECT}`) && row.Labels?.includes(`com.docker.compose.service=${service}`))?.Names;
  const api = byService("api");
  const postgres = byService("postgres");
  if (!api || !postgres) throw new Error("RECUSADO: api ou postgres do projeto demo-socio não encontrados");
  return { api, postgres };
}

/** O que um passo descobre e o seguinte usa (ids nunca vão para a saída). */
const state = {};

let stepIndex = 0;
async function step(name, fn) {
  stepIndex += 1;
  const startedAt = Date.now();
  try {
    const detail = await fn();
    console.log(`[demo-seed] OK   ${stepIndex}. ${name}${detail ? ` — ${detail}` : ""} (${Date.now() - startedAt} ms)`);
    return detail;
  } catch (error) {
    console.error(`[demo-seed] FAIL ${stepIndex}. ${name}: ${redact(error.message)}`);
    throw error;
  }
}

function psql(postgresContainer, sql) {
  const { stdout } = docker(
    ["exec", "-i", postgresContainer, "psql", "-U", "postgres", "-d", "erp_techsolutions", "-v", "ON_ERROR_STOP=1", "-At"],
    { input: sql, timeout: 60_000 },
  );
  return stdout.trim();
}

function assertUuid(value, what) {
  if (!UUID.test(String(value ?? ""))) throw new Error(`${what} não é um UUID`);
  return value;
}

async function http(method, path, { token, body, expect } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  const ok = expect ? expect.includes(response.status) : response.status >= 200 && response.status < 300;
  if (!ok) {
    const code = json?.error?.code ?? json?.code ?? "";
    const reason = json?.error?.reason ?? json?.error?.details?.reason ?? json?.reason ?? "";
    const message = json?.error?.message ?? json?.message ?? "";
    throw new Error(`${method} ${path.split("?")[0]} → ${response.status} ${code} ${reason} ${redact(String(message)).slice(0, 200)}`.trim());
  }
  return { status: response.status, json };
}

/** Extrai a lista de qualquer formato de listagem da casa ({data:{items}}, {data:[…]}, {items}). */
export function listItems(json) {
  const data = json?.data ?? json;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(json?.items)) return json.items;
  return [];
}

async function listAll(token, path) {
  const out = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let offset = 0; offset < 5_000; offset += 100) {
    const { json } = await http("GET", `${path}${sep}limit=100&offset=${offset}`, { token });
    const items = listItems(json);
    out.push(...items);
    const total = json?.data?.pagination?.total ?? json?.pagination?.total;
    if (items.length < 100 || (typeof total === "number" && out.length >= total)) break;
  }
  return out;
}

async function listPlain(token, path) {
  const { json } = await http("GET", path, { token });
  return listItems(json);
}

async function login(tenantId, user) {
  const { json } = await http("POST", "/auth/login", { body: { tenantId, email: user.email, password: process.env[user.passwordEnv] } });
  const token = json?.data?.accessToken ?? json?.data?.access_token;
  if (typeof token !== "string" || token.length < 20) throw new Error(`login de ${user.key} sem token`);
  return token;
}

const field = (item, ...names) => {
  for (const name of names) if (item?.[name] !== undefined && item?.[name] !== null) return item[name];
  return undefined;
};
const isoDaysFromNow = (days) => new Date(Date.now() + days * DAY_MS).toISOString();

/** Garante uma coleção pela chave natural; devolve o mapa chave → item e as contagens. */
async function ensureCollection({ token, listPath, plain = false, desired, existingKey, desiredKey, create }) {
  const existing = plain ? await listPlain(token, listPath) : await listAll(token, listPath);
  const plan = planEnsure(existing, desired, existingKey, desiredKey);
  const byKey = new Map(plan.present.map(({ desired: item, existing: found }) => [normalizeKey(desiredKey(item)), found]));
  for (const item of plan.toCreate) {
    const created = await create(item);
    byKey.set(normalizeKey(desiredKey(item)), created);
  }
  return { byKey, created: plan.toCreate.length, present: plan.present.length };
}
const counted = (result) => `criados ${result.created}, já existiam ${result.present}`;

// ------------------------------------------------------------------------------------------------ identidade (no contêiner)
function identityScript() {
  const spec = JSON.stringify({ tenant: TENANT, users: USERS.map(({ key, name, email, roles, passwordEnv }) => ({ key, name, email, roles, passwordEnv })) });
  return `
const { pathToFileURL } = await import('node:url');
const load = (p) => import(pathToFileURL(process.cwd() + p).href);
const spec = ${spec};
try {
  const runtime = await load('/dist/modules/core-saas/core-saas-runtime.js');
  const { hashPassword } = await load('/dist/modules/auth/services/password.service.js');
  const { prisma } = await load('/dist/database/prisma.js');
  const { withTenantRls } = await load('/dist/database/rls.js');
  const service = await runtime.createCoreSaasService();
  const found = await prisma.tenant.findMany({ where: { name: spec.tenant.name }, orderBy: { created_at: 'asc' } });
  if (found.length > 1) throw Object.assign(new Error('mais de uma organizacao com o nome'), { name: 'DuplicateTenant' });
  let tenant = found[0];
  let tenantCreated = false;
  if (!tenant) { tenant = await service.createTenant({ name: spec.tenant.name, modules: spec.tenant.modules }); tenantCreated = true; }
  const missingModules = spec.tenant.modules.filter((m) => !(tenant.modules ?? []).includes(m));
  const users = {};
  let usersCreated = 0;
  for (const u of spec.users) {
    let user = await withTenantRls(prisma, tenant.id, (tx) => tx.user.findFirst({ where: { tenant_id: tenant.id, email: u.email } }));
    if (!user) { user = await service.createUser({ tenantId: tenant.id, name: u.name, email: u.email, roles: u.roles }); usersCreated += 1; }
    const hashed = await hashPassword(process.env[u.passwordEnv]);
    await withTenantRls(prisma, tenant.id, async (tx) => {
      const cred = await tx.localAuthCredential.findFirst({ where: { tenant_id: tenant.id, user_id: user.id } });
      if (cred) await tx.localAuthCredential.update({ where: { id: cred.id }, data: { ...hashed, email: u.email, failed_attempts: 0, locked_until: null, password_updated_at: new Date() } });
      else await tx.localAuthCredential.create({ data: { tenant_id: tenant.id, user_id: user.id, email: u.email, ...hashed } });
    });
    users[u.key] = user.id;
  }
  const out = 'DEMO_IDENTITY=' + JSON.stringify({ tenantId: tenant.id, tenantCreated, missingModules, users, usersCreated }) + '\\n';
  await new Promise((resolve) => process.stdout.write(out, resolve));
  process.exit(0);
} catch (error) {
  await new Promise((resolve) => process.stdout.write('DEMO_IDENTITY_FAILED=' + ((error && error.name) || 'Error') + '\\n', resolve));
  process.exit(1);
}
`;
}

function runIdentity(apiContainer) {
  const envArgs = USERS.flatMap((user) => ["-e", user.passwordEnv]); // só o NOME: o valor vem do ambiente deste processo
  const { stdout, status } = docker(["exec", "-i", ...envArgs, apiContainer, "node", "--input-type=module", "-"], {
    input: identityScript(),
    timeout: 180_000,
    allowFailure: true,
  });
  const line = /DEMO_IDENTITY=(\{.*\})/.exec(stdout)?.[1];
  if (status !== 0 || !line) throw new Error(`identidade falhou (${/DEMO_IDENTITY_FAILED=(\w+)/.exec(stdout)?.[1] ?? `saída ${status}`})`);
  const identity = JSON.parse(line);
  assertUuid(identity.tenantId, "tenantId");
  for (const user of USERS) assertUuid(identity.users[user.key], `usuário ${user.key}`);
  return identity;
}

// ------------------------------------------------------------------------------------------------ modos
async function seed({ api, postgres }) {
  const identity = await step("organização \"Guincho Exemplo\" e 4 usuários com senha (agregado core-saas na api; senha não tem rota)", async () => {
    const result = runIdentity(api);
    state.identity = result;
    return `organização ${result.tenantCreated ? "criada" : "já existia"}; usuários criados ${result.usersCreated}, já existiam ${USERS.length - result.usersCreated}; credenciais gravadas 4`;
  }).then(() => state.identity);
  const tenantId = identity.tenantId;

  await step("os 6 módulos da organização (SQL só se faltar: organização não tem rota sem platform_admin)", async () => {
    if (identity.missingModules.length === 0) return "nenhum faltando";
    const list = identity.missingModules.map((module) => `'${module.replace(/[^a-z_]/g, "")}'`).join(",");
    psql(postgres, `UPDATE tenants SET modules = (SELECT array_agg(DISTINCT m) FROM unnest(modules || ARRAY[${list}]::text[]) AS m) WHERE id = '${tenantId}';`);
    return `acrescentados ${identity.missingModules.length}`;
  });

  const admin = USERS.find((user) => user.key === "admin");
  const token = await login(tenantId, admin);

  const service = await step("serviço \"Remoção / Guincho\" (socorro, exige destino) — POST /service-catalog", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/service-catalog",
      desired: [SERVICE],
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async (item) => (await http("POST", "/service-catalog", { token, body: item })).json.data,
    });
    const found = result.byKey.get(normalizeKey(SERVICE.name));
    if (found.serviceType !== SERVICE.serviceType || found.requiresDestination !== true) {
      await http("PATCH", `/service-catalog/${assertUuid(found.id, "serviço")}`, { token, body: { serviceType: SERVICE.serviceType, requiresDestination: true } });
    }
    state.service = found;
    return counted(result);
  }).then(() => state.service);

  const priceTable = await step("tabela de valores publicada — POST /price-tables + PATCH status", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/price-tables",
      desired: [PRICE_TABLE],
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async (item) => (await http("POST", "/price-tables", { token, body: item })).json.data,
    });
    const found = result.byKey.get(normalizeKey(PRICE_TABLE.name));
    if (found.status !== "published") {
      await http("PATCH", `/price-tables/${assertUuid(found.id, "tabela")}`, { token, body: { status: "published" } });
    }
    state.priceTable = found;
    return `${counted(result)}; publicada`;
  }).then(() => state.priceTable);

  await step("tarifa vigente do serviço (a OS com cliente + serviço exige) — POST /tariffs", async () => {
    const result = await ensureCollection({
      token,
      listPath: `/tariffs?priceTableId=${assertUuid(priceTable.id, "tabela")}`,
      desired: [TARIFF],
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async (item) =>
        (await http("POST", "/tariffs", { token, body: { ...item, priceTableId: priceTable.id, serviceCatalogId: service.id } })).json.data,
    });
    return counted(result);
  });

  const customers = await step("3 clientes fictícios — POST /customers", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/customers",
      desired: CUSTOMERS,
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async ({ key, ...item }) => (await http("POST", "/customers", { token, body: item })).json.data,
    });
    state.customers = new Map(CUSTOMERS.map((customer) => [customer.key, result.byKey.get(normalizeKey(customer.name))]));
    return counted(result);
  }).then(() => state.customers);

  const vehicles = await step("3 viaturas (placa Mercosul fictícia; uma é \"Guincho 01\") — POST /vehicles", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/vehicles",
      desired: VEHICLES,
      existingKey: (item) => item.plate,
      desiredKey: (item) => item.plate,
      create: async (item) => (await http("POST", "/vehicles", { token, body: item })).json.data,
    });
    state.vehicles = result.byKey;
    return counted(result);
  }).then(() => state.vehicles);
  const vehicleId = (plate) => assertUuid(vehicles.get(normalizeKey(plate))?.id, `viatura ${plate}`);

  await step("Frota nas OUTRAS viaturas: manutenção, multa e seguro — POST /maintenance-orders, /fines, /insurance-policies", async () => {
    const maintenance = await ensureCollection({
      token,
      listPath: "/maintenance-orders",
      desired: FLEET.maintenance,
      existingKey: (item) => item.description,
      desiredKey: (item) => item.description,
      create: async (item) =>
        (
          await http("POST", "/maintenance-orders", {
            token,
            body: { vehicleId: vehicleId(item.plate), type: item.type, description: item.description, odometer: item.odometer, cost: item.cost, scheduledFor: isoDaysFromNow(item.scheduledInDays) },
          })
        ).json.data,
    });
    const fines = await ensureCollection({
      token,
      listPath: "/fines",
      desired: FLEET.fines,
      existingKey: (item) => field(item, "numeroAuto", "numero_auto"),
      desiredKey: (item) => item.numeroAuto,
      create: async (item) =>
        (
          await http("POST", "/fines", {
            token,
            body: {
              vehicleId: vehicleId(item.plate),
              numeroAuto: item.numeroAuto,
              orgao: item.orgao,
              valor: item.valor,
              pontos: item.pontos,
              descricao: item.descricao,
              dataInfracao: isoDaysFromNow(-item.daysAgo),
              prazoPagamento: isoDaysFromNow(30 - item.daysAgo),
            },
          })
        ).json.data,
    });
    const insurance = await ensureCollection({
      token,
      listPath: "/insurance-policies",
      desired: FLEET.insurance,
      existingKey: (item) => field(item, "numeroApolice", "numero_apolice"),
      desiredKey: (item) => item.numeroApolice,
      create: async (item) =>
        (
          await http("POST", "/insurance-policies", {
            token,
            body: {
              vehicleId: vehicleId(item.plate),
              numeroApolice: item.numeroApolice,
              seguradora: item.seguradora,
              valor: item.valor,
              cobertura: item.cobertura,
              vigenciaInicio: isoDaysFromNow(-item.startedDaysAgo),
              vigenciaFim: isoDaysFromNow(365 - item.startedDaysAgo),
            },
          })
        ).json.data,
    });
    return `manutenções ${counted(maintenance)}; multas ${counted(fines)}; seguros ${counted(insurance)}`;
  });

  await step("o \"Guincho 01\" sem manutenção em execução — GET /maintenance-orders", async () => {
    const own = await listAll(token, `/maintenance-orders?vehicleId=${vehicleId(GUINCHO_01_PLATE)}`);
    const running = own.filter((item) => field(item, "status") === "em_execucao");
    if (running.length > 0) throw new Error(`o Guincho 01 tem ${running.length} manutenção(ões) em execução: a OS seria recusada`);
    return `manutenções do Guincho 01: ${own.length}, em execução: 0`;
  });

  const yard = await step("Pátio Central — POST /yards", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/yards",
      desired: [YARD],
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async (item) => (await http("POST", "/yards", { token, body: item })).json.data,
    });
    state.yard = result.byKey.get(normalizeKey(YARD.name));
    return counted(result);
  }).then(() => state.yard);

  const profile = await step("Perfil Normativo — POST /jurisdiction-profiles", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/jurisdiction-profiles",
      desired: [JURISDICTION],
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async (item) => (await http("POST", "/jurisdiction-profiles", { token, body: item })).json.data,
    });
    state.profile = result.byKey.get(normalizeKey(JURISDICTION.name));
    return counted(result);
  }).then(() => state.profile);

  await step("2 Processos de recolhimento com dossiê — POST /impound-processes", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/impound-processes",
      desired: IMPOUND_PROCESSES,
      existingKey: (item) => field(item, "vehiclePlate", "vehicle_plate", "plate"),
      desiredKey: (item) => item.vehiclePlate,
      create: async (item) =>
        (
          await http("POST", "/impound-processes", {
            token,
            body: { ...item, profileId: assertUuid(profile.id, "perfil"), yardId: assertUuid(yard.id, "pátio") },
          })
        ).json.data,
    });
    return counted(result);
  });

  const template = await step("modelo de checklist \"Vistoria de guincho\" publicado — POST /tenant/checklists + /publish", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/tenant/checklists",
      plain: true,
      desired: [CHECKLIST],
      existingKey: (item) => item.name,
      desiredKey: (item) => item.name,
      create: async (item) => (await http("POST", "/tenant/checklists", { token, body: item })).json.data,
    });
    const found = result.byKey.get(normalizeKey(CHECKLIST.name));
    if (found.status !== "published") await http("POST", `/tenant/checklists/${assertUuid(found.id, "modelo")}/publish`, { token });
    state.template = found;
    return `${counted(result)}; publicado`;
  }).then(() => state.template);

  await step("regra de aplicabilidade modelo ↔ serviço (SQL: a regra não tem rota)", async () => {
    const t = assertUuid(tenantId, "tenantId");
    const tpl = assertUuid(template.id, "modelo");
    const svc = assertUuid(service.id, "serviço");
    const out = psql(
      postgres,
      [
        `INSERT INTO checklist_applicability_rules (tenant_id, template_id, service_catalog_id, role, is_active, notes)`,
        `SELECT '${t}', '${tpl}', '${svc}', 'generic', true, 'demo-socio: vistoria do serviço de guincho'`,
        `WHERE NOT EXISTS (SELECT 1 FROM checklist_applicability_rules WHERE tenant_id = '${t}' AND service_catalog_id = '${svc}'`,
        `  AND service_type IS NULL AND customer_id IS NULL AND role = 'generic' AND is_active AND deleted_at IS NULL);`,
        `SELECT count(*) FROM checklist_applicability_rules WHERE tenant_id = '${t}' AND template_id = '${tpl}' AND service_catalog_id = '${svc}' AND is_active AND deleted_at IS NULL;`,
      ].join("\n"),
    );
    const lines = out.split(/\r?\n/);
    const inserted = /INSERT 0 (\d)/.exec(out)?.[1] ?? "?";
    if (lines.at(-1) !== "1") throw new Error(`regra ativa do modelo para o serviço = ${lines.at(-1)} (esperado 1; o balde pode estar ocupado por outro modelo)`);
    return inserted === "1" ? "criada" : "já existia";
  });

  await step(`vínculo do rastreador ${DEMO_DEVICE_ID} ↔ "Guincho 01" (SQL: o vínculo não tem rota nem tela)`, async () => {
    const t = assertUuid(tenantId, "tenantId");
    const v = vehicleId(GUINCHO_01_PLATE);
    const out = psql(
      postgres,
      [
        `INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)`,
        `SELECT '${t}', '${v}', '${DEMO_INSTANCE_KEY}', '${DEMO_DEVICE_ID}'`,
        `WHERE NOT EXISTS (SELECT 1 FROM vehicle_tracking_bindings WHERE instance_key = '${DEMO_INSTANCE_KEY}' AND external_device_key = '${DEMO_DEVICE_ID}' AND valid_to IS NULL);`,
        `SELECT (tenant_id = '${t}' AND vehicle_id = '${v}')::text FROM vehicle_tracking_bindings WHERE instance_key = '${DEMO_INSTANCE_KEY}' AND external_device_key = '${DEMO_DEVICE_ID}' AND valid_to IS NULL;`,
      ].join("\n"),
    );
    if (out.split(/\r?\n/).at(-1) !== "true") throw new Error(`o ${DEMO_DEVICE_ID} está vinculado a outra viatura ou organização`);
    return /INSERT 0 1/.test(out) ? "criado" : "já existia";
  });

  await step("OS reserva com o \"Guincho 01\", sem despacho — POST /work-orders", async () => {
    const result = await ensureCollection({
      token,
      listPath: "/work-orders",
      desired: [RESERVE_ORDER],
      existingKey: (item) => item.title,
      desiredKey: (item) => item.title,
      create: async (item) =>
        (
          await http("POST", "/work-orders", {
            token,
            body: {
              ...item,
              customerId: assertUuid(customers.get("seguradora")?.id, "cliente"),
              serviceCatalogId: service.id,
              vehicleId: vehicleId(GUINCHO_01_PLATE),
            },
          })
        ).json.data,
    });
    return counted(result);
  });

  await step(`${BACKGROUND_ORDERS.length} OS de fundo em status variados (sem viatura e sem despacho) — POST /work-orders, PATCH /status, POST /cancel`, async () => {
    const result = await ensureCollection({
      token,
      listPath: "/work-orders",
      desired: BACKGROUND_ORDERS,
      existingKey: (item) => item.title,
      desiredKey: (item) => item.title,
      create: async (item) =>
        (
          await http("POST", "/work-orders", {
            token,
            body: {
              title: item.title,
              description: "OS de fundo da demonstração.",
              priority: item.priority,
              customerId: assertUuid(customers.get(item.customer)?.id, "cliente"),
              serviceCity: "São Paulo",
              serviceState: "SP",
            },
          })
        ).json.data,
    });
    let moves = 0;
    for (const order of BACKGROUND_ORDERS) {
      const current = result.byKey.get(normalizeKey(order.title));
      const id = assertUuid(current?.id, "OS");
      const { json } = await http("GET", `/work-orders/${id}`, { token });
      const status = json?.data?.workOrder?.status ?? json?.data?.status;
      if (order.status === "cancelled") {
        if (status === "cancelled") continue;
        await http("POST", `/work-orders/${id}/cancel`, { token, body: { reason: "Chamado duplicado (demo)", financialDecision: "zero" } });
        moves += 1;
        continue;
      }
      const path = statusPath(status, order.status);
      if (path === null) throw new Error(`OS de fundo em ${status} não chega a ${order.status}`);
      for (const next of path) {
        await http("PATCH", `/work-orders/${id}/status`, { token, body: { status: next } });
        moves += 1;
      }
    }
    return `${counted(result)}; transições aplicadas ${moves}`;
  });

  console.log(`[demo-seed] VERDE — logins: ${USERS.map((user) => `${user.key}=${user.email}`).join(" · ")} (senhas: as das variáveis DEMO_*_PASSWORD)`);
}

async function sendStartPosition({ postgres }) {
  const tech = USERS.find((user) => user.key === "tech");
  const lat = Number(readFlag(process.argv, "lat") ?? DEFAULT_START_POSITION.lat);
  const lon = Number(readFlag(process.argv, "lon") ?? DEFAULT_START_POSITION.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("--lat/--lon inválidos");
  const tenantId = await step("organização da demo (leitura por SQL)", async () => {
    const id = psql(postgres, `SELECT id FROM tenants WHERE name = '${TENANT.name}' ORDER BY created_at LIMIT 1;`);
    state.tenantId = assertUuid(id, "organização (rode o seed antes do --posicao)");
    return "encontrada";
  }).then(() => state.tenantId);
  const token = await login(tenantId, tech);
  await step("posição inicial do guincheiro pelo caminho real do app — POST /mobile/field-locations", async () => {
    const { status } = await http("POST", "/mobile/field-locations", {
      token,
      body: { latitude: lat, longitude: lon, accuracyMeters: 8, recordedAt: new Date().toISOString(), source: "mobile" },
      expect: [201],
    });
    return `status ${status}; vale por 15 min no mapa`;
  });
  console.log("[demo-seed] VERDE — posição inicial enviada");
}

async function main() {
  const mode = process.argv.includes("--posicao") ? "posicao" : "seed";
  const missing = missingPasswords(process.env, mode);
  if (missing.length > 0) {
    console.error(`[demo-seed] RECUSADO: defina ${missing.join(", ")} (mínimo 8 caracteres; nunca no código nem no argv)`);
    process.exitCode = 1;
    return;
  }
  try {
    const containers = await step(`trava: projeto ${DEMO_PROJECT}, API ${DEMO_API_HOST}:${DEMO_API_PORT}, nada de base viva nem erp-*`, async () => {
      state.containers = guardTerrain();
      return "terreno é o demo-socio";
    }).then(() => state.containers);
    await step("API pronta — GET /health/ready", async () => {
      await http("GET", "/health/ready");
    });
    if (mode === "posicao") await sendStartPosition(containers);
    else await seed(containers);
  } catch {
    process.exitCode = 1;
  }
}


if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
