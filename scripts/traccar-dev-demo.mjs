// B-TRC-01 · o smoke vertical do Traccar em DEV (plano v2.1 §8.1). ZERO dependência nova. Um comando finito:
//
//   node scripts/traccar-dev-demo.mjs              # roda, confere e derruba tudo
//   node scripts/traccar-dev-demo.mjs --keep       # deixa o projeto de pé no fim (derrube com o comando impresso)
//   TRC_DEMO_PASSWORD=… node scripts/traccar-dev-demo.mjs --keep --with-web
//                                                  # opcional: sobe o `web` em 127.0.0.1:18080 e cria o login do
//                                                  # operador de despacho com a senha que o DONO passa (nunca impressa)
//
// Passos, nesta ordem (saída: só nome de passo e estado — nunca segredo, token, id de organização ou coordenada):
//   1. terreno: Docker responde; a sub-rede da `traccar_private` não colide; ≥ 10 GB livres (senão pede DEEP_CLEAN);
//   2. segredo de forward da rodada (`randomBytes(32)`), só no ambiente do processo filho do `docker compose`;
//   3. sobe, sob o projeto FIXO `erp-trc01-demo`, `docker-compose.prod.yml` + `docker-compose.traccar.yml`, só
//      `postgres redis migrate api traccar`, com `--build --wait`;
//   4. semeia: RBAC pelo provisionamento oficial (`scripts/provision-rbac.ts`, no contêiner de build, como o migrador);
//      organização com `field_operations`, técnico e operador de despacho pelo agregado core-saas DENTRO da `api`;
//      viatura, OS, despacho (inserido numa transação e ACEITO noutra) e o vínculo `trcdemo01 → viatura` na instância
//      `erp-dev`, por SQL como `postgres`;
//   5. abre o SSE `/api/v1/operations/field-events/stream` com um token `field_dispatcher` (HS256 com o placeholder
//      do compose, como o smoke de persistência);
//   6. manda uma posição OsmAnd pelo `traccar-sim` (rede `traccar_devices`; retenta só erro de conexão);
//   7. espera, até 60 s, `/api/v1/field-locations/latest` devolver o técnico na coordenada enviada (1e-6), `traccar`;
//   8. confere que o SSE recebeu `field_location.updated` sem nenhuma chave de coordenada;
//   9. confere por SQL: 1 recibo, 1 localização `traccar`, 0 quarentena;
//  10. reenvia o MESMO ponto, espera 10 s, e confere: ainda 1 recibo e 1 localização;
//  11. derruba tudo com `down -v --remove-orphans` (com os perfis), SEMPRE, inclusive em falha — salvo `--keep`;
//  12. mede, dentro dos contêineres, onde a web/REST do Traccar e a ingestão escutam (só endereço:porta).
// Nenhuma porta 3200, 5055 ou 8082 aparece no host; nunca os servidores públicos de demonstração do Traccar.
//
// B-TRC-02 (plano v2 §5.1, §5.5; emenda v2.1) — passos 13-19, com o event.forward ligado no overlay (status de dev):
//  13. o 1º fix gerou 1 device_online;  14. ignição off → on: 1 ignition_on e 2 amostras novas;  15. alarm=sos: 1 alarm/sos;
//  16. o MESMO corpo de evento entregue 2× direto no listener (de dentro da api): 1 linha;  17. tipo forjado → 204 e 0 linha;
//      dispositivo sem vínculo → 202 e 1 episódio de quarentena, 0 linha;  18. fix com power=-1 → a localização entra e
//      nenhuma amostra nova (o domínio fechado descarta o atributo no parser);  19. rajada de 120 posições + 1 evento: o evento
//      entra (204) enquanto posições levam 429 — o bucket é por rota; depois: SELECT sem coordenada/JSON/nome na tabela,
//      log da api sem segredo, coordenada nem tipo forjado, e o md5 da OS igual.
//  --with-web [Q2 = SIM, D-TRC02-RESPOSTAS]: o passo nomeado do EXECUTE em auth_login_candidates ao papel de runtime, SÓ na
//  demonstração (produção = passo 5 do runbook de docs/deployment.md, ato do dono), e a leitura de /health/ready.
// Projeto: `erp-trc01-demo` por padrão; `TRC_DEMO_PROJECT` troca o nome (o terreno de cada dev).

import { spawnSync } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { statfsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROJECT = process.env.TRC_DEMO_PROJECT?.trim() || "erp-trc01-demo";
const BASE_FILE = path.join(REPO_ROOT, "docker-compose.prod.yml");
const OVERLAY_FILE = path.join(REPO_ROOT, "docker-compose.traccar.yml");
const PRIVATE_SUBNET = process.env.TRC_PRIVATE_SUBNET?.trim() || "172.31.250.0/24";
const API_PORT = Number(process.env.TRC_API_PORT?.trim() || "3102");
const WEB_PORT = Number(process.env.TRC_WEB_PORT?.trim() || "18080");
const HOST = "127.0.0.1"; // loopback CRAVADO: não há variável que aponte este script para outro host
const BASE_URL = `http://${HOST}:${API_PORT}`;
const KEEP = process.argv.includes("--keep") || process.argv.includes("--with-web");
const WITH_WEB = process.argv.includes("--with-web");
const MIN_FREE_BYTES = 10 * 1024 ** 3;
const PLACEHOLDER_SECRET = /^local-prod-validation-[a-z0-9-]*not-a-secret$/;
const DEVICE_ID = "trcdemo01";
const INSTANCE_KEY = "erp-dev";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Coordenada SINTÉTICA (centro de São Paulo), nunca impressa.
const SIM_LAT = -23.55052;
const SIM_LON = -46.633308;
const SIM_SPEED_KNOTS = 10;

const forwardSecret = randomBytes(32).toString("base64url");

function composeEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("TRC_SIM_") || key === "COMPOSE_PROJECT_NAME" || key === "COMPOSE_PROFILES") delete env[key];
  }
  delete env.TRC_DEMO_PASSWORD;
  return {
    ...env,
    COMPOSE_PROGRESS: "plain",
    // Tag PRÓPRIA da imagem da api do demo: nunca sobrescreve a `erp-techsolutions-api:local` de quem usa o compose.
    API_IMAGE: process.env.TRC_DEMO_API_IMAGE?.trim() || "erp-trc01-demo-api:local",
    TRC_PRIVATE_SUBNET: PRIVATE_SUBNET,
    TRC_API_PORT: String(API_PORT),
    TRC_WEB_PORT: String(WEB_PORT),
    TRC_FORWARD_SECRET: forwardSecret,
    TRC_FORWARD_HEADER: `X-Traccar-Forward-Token: ${forwardSecret}`,
    ...extra,
  };
}

function redact(text) {
  return String(text ?? "")
    .split(forwardSecret)
    .join("<segredo-redigido>")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`]+/gi, "<uri-redigida>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/-?\d{1,3}\.\d{4,}/g, "<numero>");
}

function docker(args, { allowFailure = false, extraEnv = {}, timeout = 900_000 } = {}) {
  const result = spawnSync("docker", args, {
    cwd: REPO_ROOT,
    env: composeEnv(extraEnv),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout,
  });
  if (result.error) throw new Error(`docker ${args.slice(0, 3).join(" ")}: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    const detail = redact(`${result.stderr ?? ""}${result.stdout ?? ""}`.trim().split("\n").slice(-6).join(" | "));
    throw new Error(`docker ${args.slice(0, 8).join(" ")} saiu com ${result.status}: ${detail}`);
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function compose(...args) {
  return ["compose", "-p", PROJECT, "-f", BASE_FILE, "-f", OVERLAY_FILE, ...args];
}

function psql(sql) {
  const { stdout } = docker(
    compose("exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "erp_techsolutions", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql),
    { timeout: 60_000 },
  );
  return stdout.trim();
}

let stepIndex = 0;
async function step(name, fn) {
  stepIndex += 1;
  const startedAt = Date.now();
  try {
    const value = await fn();
    console.log(`[traccar-demo] OK   ${stepIndex}. ${name} (${Date.now() - startedAt} ms)`);
    return value;
  } catch (error) {
    console.error(`[traccar-demo] FAIL ${stepIndex}. ${name}: ${redact(error.message)}`);
    throw error;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pollUntil(description, probe, timeoutMs, intervalMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  let last = "sem tentativa";
  while (Date.now() < deadline) {
    try {
      return await probe();
    } catch (error) {
      last = error.message;
    }
    await sleep(intervalMs);
  }
  throw new Error(`${description}: expirou em ${Math.round(timeoutMs / 1000)} s (último motivo: ${redact(last)})`);
}

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}
function cidrRange(cidr) {
  const [ip, bitsText] = cidr.split("/");
  const bits = Number(bitsText);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const start = (ipv4ToInt(ip) & mask) >>> 0;
  return [start, (start | (~mask >>> 0)) >>> 0];
}

function signAccessToken(secret, claims) {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ ...claims, type: "access", iat: issuedAt, exp: issuedAt + 900, iss: "erp-techsolutions", aud: "erp-techsolutions-api" });
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Endereços em LISTEN de um contêiner, lidos de /proc/net/tcp{,6} (sem ferramenta extra na imagem). */
function listeningAddresses(service) {
  const { stdout } = docker(compose("exec", "-T", service, "cat", "/proc/net/tcp", "/proc/net/tcp6"), { timeout: 60_000, allowFailure: true });
  const out = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 4 || cols[3] !== "0A") continue;
    const [hexIp, hexPort] = cols[1].split(":");
    const port = parseInt(hexPort, 16);
    // /proc/net/tcp{,6} grava cada palavra de 32 bits na ordem do host (little-endian).
    const ipv4 = (hex) => [3, 2, 1, 0].map((index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16)).join(".");
    let ip;
    if (hexIp.length === 8) {
      ip = ipv4(hexIp);
    } else if (/^0{16}FFFF0000[0-9A-F]{8}$/i.test(hexIp)) {
      ip = `::ffff:${ipv4(hexIp.slice(24))}`; // IPv4 mapeado em IPv6 (a JVM liga assim)
    } else {
      ip = /^0+$/.test(hexIp) ? "::" : hexIp === "00000000000000000000000001000000" ? "::1" : `v6:${hexIp}`;
    }
    out.add(`${ip}:${port}`);
  }
  return [...out].sort();
}

// --------------------------------------------------------------------------------------------- execução
let broughtUp = false;
let tornDown = false;
function teardown() {
  if (!broughtUp || tornDown) return;
  tornDown = true;
  if (KEEP) {
    console.log(
      `[traccar-demo] --keep: projeto ${PROJECT} de pé. Derrube com: docker compose -p ${PROJECT} -f docker-compose.prod.yml -f docker-compose.traccar.yml --profile tools --profile capture down -v --remove-orphans`,
    );
    return;
  }
  const result = docker(compose("--profile", "tools", "--profile", "capture", "down", "-v", "--remove-orphans"), {
    allowFailure: true,
    timeout: 300_000,
  });
  if (result.status !== 0) {
    console.error(`[traccar-demo] AVISO: down -v falhou (${result.status})`);
    process.exitCode = 1;
  } else {
    console.log("[traccar-demo] projeto derrubado (down -v --remove-orphans, com os perfis)");
  }
}
process.on("exit", teardown);

let sseAbort;
try {
  await step("terreno: Docker responde, sub-rede livre e ≥ 10 GB livres", async () => {
    docker(["version", "--format", "{{.Server.Version}}"], { timeout: 30_000 });
    const stats = statfsSync(REPO_ROOT);
    const free = stats.bavail * stats.bsize;
    if (free < MIN_FREE_BYTES) {
      throw new Error(`${(free / 1024 ** 3).toFixed(1)} GB livres (< 10 GB): rode DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh antes`);
    }
    docker(compose("--profile", "tools", "--profile", "capture", "down", "-v", "--remove-orphans"), { allowFailure: true, timeout: 300_000 });
    const [ownStart, ownEnd] = cidrRange(PRIVATE_SUBNET);
    const ids = docker(["network", "ls", "-q"]).stdout.split(/\s+/).filter(Boolean);
    const networks = ids.length > 0 ? JSON.parse(docker(["network", "inspect", ...ids]).stdout) : [];
    for (const network of networks) {
      for (const config of network?.IPAM?.Config ?? []) {
        if (!config?.Subnet || config.Subnet.includes(":")) continue;
        const [start, end] = cidrRange(config.Subnet);
        if (start <= ownEnd && ownStart <= end) throw new Error(`a sub-rede ${PRIVATE_SUBNET} colide com a rede Docker "${network.Name}"`);
      }
    }
  });

  const jwtSecret = await step("trava: o alvo é o compose de VALIDAÇÃO LOCAL (placeholder rotulado, NODE_ENV=production)", async () => {
    const config = JSON.parse(docker(compose("config", "--format", "json"), { timeout: 60_000 }).stdout);
    const environment = config?.services?.api?.environment ?? {};
    if (!PLACEHOLDER_SECRET.test(String(environment.JWT_SECRET ?? ""))) throw new Error("JWT_SECRET do alvo não é o placeholder rotulado de validação local");
    if (String(environment.NODE_ENV ?? "") !== "production") throw new Error("o serviço api não declara NODE_ENV=production");
    if (String(environment.TRACCAR_INGEST_ENABLED ?? "") !== "true") throw new Error("o overlay não ligou a ingestão na api");
    return String(environment.JWT_SECRET);
  });

  await step(`sobe ${PROJECT} (postgres redis migrate api traccar; --build --wait)`, async () => {
    broughtUp = true;
    docker(compose("up", "-d", "--build", "--wait", "--wait-timeout", "600", "postgres", "redis", "migrate", "api", "traccar"), { timeout: 1_500_000 });
  });

  await step("API pública pronta em 127.0.0.1", async () =>
    pollUntil(
      "readiness",
      async () => {
        const response = await fetchWithTimeout(`${BASE_URL}/api/v1/health/ready`);
        if (response.status !== 200) throw new Error(`readiness ${response.status}`);
        await response.arrayBuffer();
      },
      240_000,
      3_000,
    ),
  );

  await step("RBAC provisionado pelo script oficial (contêiner de build, como o migrador)", async () => {
    docker(
      compose("run", "--rm", "-T", "--no-deps", "-v", `${path.join(REPO_ROOT, "scripts")}:/app/scripts:ro`, "migrate", "npx", "tsx", "scripts/provision-rbac.ts"),
      { timeout: 600_000 },
    );
  });

  const seed = await step("organização, técnico e operador de despacho pelo agregado core-saas (dentro da api)", async () => {
    const script = [
      "const { pathToFileURL } = await import('node:url');",
      "const runtime = await import(pathToFileURL(process.cwd() + '/dist/modules/core-saas/core-saas-runtime.js').href);",
      "try {",
      "  const service = await runtime.createCoreSaasService();",
      "  const suffix = Math.random().toString(16).slice(2, 10);",
      "  const tenant = await service.createTenant({ name: 'Demo Traccar ' + suffix, modules: ['field_operations'] });",
      "  const tech = await service.createUser({ tenantId: tenant.id, name: 'Tecnico Demo Traccar', email: 'tecnico.trc.' + suffix + '@demo.invalid', roles: ['field_technician'] });",
      "  const dispatcher = await service.createUser({ tenantId: tenant.id, name: 'Despacho Demo Traccar', email: 'despacho.trc.' + suffix + '@demo.invalid', roles: ['field_dispatcher'] });",
      "  const pw = process.env.TRC_DEMO_PASSWORD;",
      "  if (pw) {",
      "    const { hashPassword } = await import(pathToFileURL(process.cwd() + '/dist/modules/auth/services/password.service.js').href);",
      "    const { prisma } = await import(pathToFileURL(process.cwd() + '/dist/database/prisma.js').href);",
      "    const { withTenantRls } = await import(pathToFileURL(process.cwd() + '/dist/database/rls.js').href);",
      "    const hashed = await hashPassword(pw);",
      "    await withTenantRls(prisma, tenant.id, (tx) => tx.localAuthCredential.create({ data: { tenant_id: tenant.id, user_id: dispatcher.id, email: dispatcher.email, ...hashed } }));",
      "  }",
      "  const out = ['DEMO_TENANT=' + tenant.id, 'DEMO_TECH=' + tech.id, 'DEMO_DISPATCHER=' + dispatcher.id, 'DEMO_DISPATCHER_EMAIL=' + dispatcher.email].join('\\n') + '\\n';",
      "  await new Promise((resolve) => process.stdout.write(out, resolve));",
      "  process.exit(0);",
      "} catch (error) {",
      "  await new Promise((resolve) => process.stdout.write('DEMO_SEED_FAILED=' + ((error && error.name) || 'Error') + '\\n', resolve));",
      "  process.exit(1);",
      "}",
    ].join("\n");
    const execArgs = ["exec", "-T"];
    if (WITH_WEB && process.env.TRC_DEMO_PASSWORD) execArgs.push("-e", "TRC_DEMO_PASSWORD");
    const { stdout } = docker(compose(...execArgs, "api", "node", "--input-type=module", "-e", script), {
      timeout: 120_000,
      extraEnv: WITH_WEB && process.env.TRC_DEMO_PASSWORD ? { TRC_DEMO_PASSWORD: process.env.TRC_DEMO_PASSWORD } : {},
    });
    const read = (key) => new RegExp(`${key}=([^\\s]+)`).exec(stdout)?.[1];
    const values = { tenantId: read("DEMO_TENANT"), techId: read("DEMO_TECH"), dispatcherId: read("DEMO_DISPATCHER"), dispatcherEmail: read("DEMO_DISPATCHER_EMAIL") };
    if (!UUID.test(values.tenantId ?? "") || !UUID.test(values.techId ?? "") || !UUID.test(values.dispatcherId ?? "")) {
      throw new Error(`semeadura falhou (${/DEMO_SEED_FAILED=(\w+)/.exec(stdout)?.[1] ?? "sem saída"})`);
    }
    return values;
  });

  await step("viatura, OS, despacho e vínculo trcdemo01 (SQL como postgres; o aceite numa SEGUNDA transação)", async () => {
    const vehicleId = randomUUID();
    const workOrderId = randomUUID();
    const dispatchId = randomUUID();
    psql(
      [
        `INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ('${vehicleId}', '${seed.tenantId}', 'TRC0D01', 'Viatura demo Traccar');`,
        `INSERT INTO work_orders (id, tenant_id, code, title, vehicle_id) VALUES ('${workOrderId}', '${seed.tenantId}', 'TRC-DEMO-01', 'OS demo Traccar', '${vehicleId}');`,
        `INSERT INTO field_dispatches (id, tenant_id, work_order_id, operator_user_id, status) VALUES ('${dispatchId}', '${seed.tenantId}', '${workOrderId}', '${seed.techId}', 'assigned');`,
        `INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key) VALUES ('${seed.tenantId}', '${vehicleId}', '${INSTANCE_KEY}', '${DEVICE_ID}');`,
      ].join(" "),
    );
    await sleep(1_100);
    psql(`UPDATE field_dispatches SET status = 'accepted', accepted_at = now() WHERE id = '${dispatchId}';`);
    const check = psql(
      `SELECT (operator_assigned_at IS NOT NULL AND operator_assigned_at <= accepted_at)::text FROM field_dispatches WHERE id = '${dispatchId}';`,
    );
    if (check !== "true") throw new Error("o despacho não ficou com operator_assigned_at <= accepted_at");
    if (psql(`SELECT (vehicle_assigned_at IS NOT NULL)::text FROM work_orders WHERE id = '${workOrderId}';`) !== "true")
      throw new Error("a OS não ficou com vehicle_assigned_at preenchido pelo gatilho");
  });

  const dispatcherToken = signAccessToken(jwtSecret, {
    sub: seed.dispatcherId,
    tenant_id: seed.tenantId,
    email: seed.dispatcherEmail,
    roles: ["field_dispatcher"],
  });
  const authHeaders = { authorization: `Bearer ${dispatcherToken}` };

  const sse = await step("SSE do mapa aberto com o token field_dispatcher", async () => {
    sseAbort = new AbortController();
    const response = await fetch(`${BASE_URL}/api/v1/operations/field-events/stream`, { headers: authHeaders, signal: sseAbort.signal });
    if (response.status !== 200) throw new Error(`SSE respondeu ${response.status}`);
    const events = [];
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let readyResolve;
    const ready = new Promise((resolve) => (readyResolve = resolve));
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            const name = /^event: (.+)$/m.exec(block)?.[1];
            const data = /^data: (.+)$/m.exec(block)?.[1];
            if (name === "ready") readyResolve();
            if (name === "field_ops_event" && data) events.push(JSON.parse(data));
          }
        }
      } catch {
        // fim da leitura (abort no fim do demo)
      }
    })();
    await Promise.race([ready, sleep(15_000).then(() => { throw new Error("SSE sem evento ready em 15 s"); })]);
    return { events };
  });

  const simTimestamp = String(Math.ceil(Date.now() / 1000) + 1); // estritamente depois do aceite (OsmAnd tem resolução de 1 s)
  const sendPosition = () => {
    const { stdout } = docker(compose("--profile", "tools", "run", "--rm", "-T", "traccar-sim"), {
      extraEnv: {
        TRC_SIM_ID: DEVICE_ID,
        TRC_SIM_LAT: String(SIM_LAT),
        TRC_SIM_LON: String(SIM_LON),
        TRC_SIM_TIMESTAMP: simTimestamp,
        TRC_SIM_SPEED: String(SIM_SPEED_KNOTS),
      },
      timeout: 180_000,
    });
    if (!/osmand_status=2\d\d/.test(stdout)) throw new Error(`o Traccar não aceitou o ponto OsmAnd (${stdout.trim().split("\n").pop() ?? "sem saída"})`);
  };

  await step("posição OsmAnd trcdemo01 enviada pelo traccar-sim à 5055 do Traccar", async () => sendPosition());

  await step("o latest devolve o técnico na coordenada enviada, com source=traccar (até 60 s)", async () =>
    pollUntil(
      "latest",
      async () => {
        const response = await fetchWithTimeout(`${BASE_URL}/api/v1/field-locations/latest`, { headers: authHeaders });
        if (response.status !== 200) throw new Error(`latest ${response.status}`);
        const body = await response.json();
        const mine = (body?.data ?? []).find((item) => item.operatorUserId === seed.techId);
        if (!mine) throw new Error("técnico ainda sem posição");
        if (mine.source !== "traccar") throw new Error(`fonte ${mine.source}`);
        if (Math.abs(mine.latitude - SIM_LAT) > 1e-6 || Math.abs(mine.longitude - SIM_LON) > 1e-6) throw new Error("coordenada diferente da enviada");
      },
      60_000,
    ),
  );

  await step("o SSE recebeu field_location.updated SEM chave de coordenada", async () =>
    pollUntil(
      "evento SSE",
      async () => {
        const event = sse.events.find((item) => item.name === "field_location.updated" && item.payload?.source === "traccar");
        if (!event) throw new Error("evento ainda não chegou");
        const keys = JSON.stringify(event).match(/"(lat|lon|lng|latitude|longitude)"\s*:/gi);
        if (keys) throw new Error("o evento carrega chave de coordenada");
      },
      15_000,
      500,
    ),
  );

  // B-TRC-02: com o event.forward ligado, a organização também ganha recibos 'event' — este passo conta só os de POSIÇÃO.
  const countsSql = `SELECT (SELECT count(*) FROM traccar_ingress_receipts WHERE tenant_id = '${seed.tenantId}' AND message_kind = 'position') || ',' ||
       (SELECT count(*) FROM field_operator_locations WHERE tenant_id = '${seed.tenantId}' AND source = 'traccar') || ',' ||
       (SELECT count(*) FROM traccar_quarantine_items WHERE instance_key = '${INSTANCE_KEY}');`;
  await step("SQL: 1 recibo, 1 localização traccar, 0 quarentena", async () => {
    const counts = psql(countsSql);
    if (counts !== "1,1,0") throw new Error(`contagens (recibo, localização, quarentena) = ${counts}`);
  });

  await step("reenvio do MESMO ponto: depois de 10 s, ainda 1 recibo e 1 localização", async () => {
    sendPosition();
    await sleep(10_000);
    const counts = psql(countsSql);
    if (counts !== "1,1,0") throw new Error(`contagens depois do reenvio = ${counts}`);
  });

  // ------------------------------------------------------------------ B-TRC-02: eventos e telemetria veicular
  const kindCount = (kind, extra = "") =>
    Number(psql(`SELECT count(*) FROM vehicle_telemetry_events WHERE tenant_id = '${seed.tenantId}' AND kind = '${kind}' ${extra};`));
  const workOrderMd5 = () => psql(`SELECT md5(w::text) FROM work_orders w WHERE tenant_id = '${seed.tenantId}';`);
  const md5Before = workOrderMd5();
  let simClock = Number(simTimestamp);
  const sendFix = (extra) => {
    simClock += 2;
    const { stdout } = docker(compose("--profile", "tools", "run", "--rm", "-T", "traccar-sim"), {
      extraEnv: {
        TRC_SIM_ID: DEVICE_ID,
        TRC_SIM_LAT: String(SIM_LAT),
        TRC_SIM_LON: String(SIM_LON),
        TRC_SIM_TIMESTAMP: String(simClock),
        TRC_SIM_SPEED: "0",
        TRC_SIM_EXTRA: extra,
      },
      timeout: 180_000,
    });
    if (!/osmand_status=2\d\d/.test(stdout)) throw new Error(`o Traccar não aceitou o ponto OsmAnd (${stdout.trim().split("\n").pop() ?? "sem saída"})`);
  };
  /** POSTs ao listener privado DE DENTRO da api (a 3200 nunca é publicada); imprime só os status. */
  const postFromApi = (route, bodies, { parallel = false } = {}) => {
    const script = [
      "const bodies = JSON.parse(Buffer.from(process.env.TRC_DEMO_BODIES, 'base64').toString('utf8'));",
      "const url = 'http://' + process.env.TRACCAR_INGEST_HOST + ':3200' + process.env.TRC_DEMO_ROUTE;",
      "const send = async (body) => { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-traccar-forward-token': process.env.TRACCAR_FORWARD_SECRET_CURRENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) }); await r.arrayBuffer(); return r.status; };",
      "const statuses = process.env.TRC_DEMO_PARALLEL === '1' ? await Promise.all(bodies.map(send)) : await bodies.reduce(async (acc, body) => [...(await acc), await send(body)], Promise.resolve([]));",
      "process.stdout.write('TRC_DEMO_STATUSES=' + JSON.stringify(statuses) + '\\n');",
    ].join("\n");
    const encoded = Buffer.from(JSON.stringify(bodies)).toString("base64");
    const { stdout } = docker(
      compose("exec", "-T", "-e", `TRC_DEMO_BODIES=${encoded}`, "-e", `TRC_DEMO_ROUTE=${route}`, "-e", `TRC_DEMO_PARALLEL=${parallel ? "1" : "0"}`, "api", "node", "--input-type=module", "-e", script),
      { timeout: 120_000 },
    );
    const statuses = /TRC_DEMO_STATUSES=(\[[^\]]*\])/.exec(stdout)?.[1];
    if (!statuses) throw new Error("o POST de dentro da api não devolveu status");
    return JSON.parse(statuses);
  };
  const eventBody = (uniqueId, type, eventTime, attributes = {}) => ({
    event: { id: 0, attributes, deviceId: 1, type, eventTime, positionId: 0, geofenceId: 0, maintenanceId: 0 },
    device: { id: 1, attributes: {}, name: "Viatura Sintetica TRC01", uniqueId, phone: "+550000000000", contact: "Contato Sintetico" },
  });
  const FORGED_TYPE = "tipoForjadoDemoTrc";

  await step("evento: o 1º fix gerou 1 device_online (status de dev ligado no overlay)", async () =>
    pollUntil(
      "device_online",
      async () => {
        const online = kindCount("device_online");
        if (online !== 1) throw new Error(`device_online = ${online}`);
      },
      30_000,
    ),
  );

  const samplesBefore = kindCount("sample");
  await step("evento: ignição off → on → 1 ignition_on e 2 amostras novas", async () => {
    sendFix("ignition=false");
    sendFix("ignition=true");
    await pollUntil(
      "ignition_on",
      async () => {
        const on = kindCount("ignition_on");
        const samples = kindCount("sample") - samplesBefore;
        if (on !== 1 || samples !== 2) throw new Error(`ignition_on = ${on}, amostras novas = ${samples}`);
      },
      30_000,
    );
  });

  await step("evento: alarm=sos → 1 linha alarm/sos", async () => {
    sendFix("ignition=true&alarm=sos");
    await pollUntil(
      "alarm",
      async () => {
        const sos = kindCount("alarm", "AND alarm_code = 'sos'");
        if (sos !== 1) throw new Error(`alarm/sos = ${sos}`);
      },
      30_000,
    );
  });

  await step("evento: o MESMO corpo entregue 2× direto no listener → 204 e 1 linha só", async () => {
    const at = new Date(simClock * 1000 + 500).toISOString();
    const statuses = postFromApi("/ingest/traccar/v1/events", [eventBody(DEVICE_ID, "deviceStopped", at), eventBody(DEVICE_ID, "deviceStopped", at)]);
    if (JSON.stringify(statuses) !== "[204,204]") throw new Error(`status do reenvio = ${JSON.stringify(statuses)}`);
    if (kindCount("device_stopped") !== 1) throw new Error(`device_stopped = ${kindCount("device_stopped")}`);
  });

  await step("evento: tipo forjado → 204 e 0 linha; dispositivo sem vínculo → 202, 1 episódio de quarentena e 0 linha", async () => {
    const rows = () => Number(psql(`SELECT count(*) FROM vehicle_telemetry_events WHERE tenant_id = '${seed.tenantId}';`));
    const before = rows();
    const now = new Date().toISOString();
    const [forged] = postFromApi("/ingest/traccar/v1/events", [eventBody(DEVICE_ID, FORGED_TYPE, now)]);
    if (forged !== 204 || rows() !== before) throw new Error(`tipo forjado: ${forged}, linhas ${before} → ${rows()}`);
    const [unmapped] = postFromApi("/ingest/traccar/v1/events", [eventBody("trcdemo99", "ignitionOn", now)]);
    const episodes = psql(`SELECT count(*) FROM traccar_quarantine_items WHERE instance_key = '${INSTANCE_KEY}' AND external_device_key = 'trcdemo99' AND reason = 'unmapped_device';`);
    if (unmapped !== 202 || episodes !== "1" || rows() !== before) throw new Error(`sem vínculo: ${unmapped}, episódios ${episodes}`);
  });

  await step("amostra: fix com power=-1 → a localização entra e nenhuma amostra nova (o parser descarta o atributo fora do domínio)", async () => {
    const locations = () => Number(psql(`SELECT count(*) FROM field_operator_locations WHERE tenant_id = '${seed.tenantId}' AND source = 'traccar';`));
    const beforeLocations = locations();
    const beforeSamples = kindCount("sample");
    sendFix("power=-1");
    await pollUntil(
      "localização do fix com power=-1",
      async () => {
        if (locations() !== beforeLocations + 1) throw new Error("localização ainda não chegou");
      },
      30_000,
    );
    if (kindCount("sample") !== beforeSamples) throw new Error("uma amostra nasceu do power=-1");
  });

  await step("limitador por rota: 120 posições em rajada e 1 evento — o evento entra (204) enquanto posições levam 429", async () => {
    const position = {
      position: { id: 0, attributes: {}, deviceId: 1, protocol: "osmand", fixTime: new Date().toISOString(), valid: true, latitude: SIM_LAT, longitude: SIM_LON, speed: 0, course: 0, accuracy: 0 },
      device: { id: 1, attributes: {}, uniqueId: "trcburst01" },
    };
    const burst = postFromApi("/ingest/traccar/v1/positions", Array.from({ length: 120 }, () => position), { parallel: true });
    const at = new Date(simClock * 1000 + 900).toISOString();
    const [event] = postFromApi("/ingest/traccar/v1/events", [eventBody(DEVICE_ID, "ignitionOff", at)]);
    const limited = burst.filter((status) => status === 429).length;
    console.log(`[traccar-demo]      rajada: ${limited} de 120 posições com 429; evento depois: ${event}`);
    if (limited === 0) throw new Error("nenhuma posição levou 429: a rajada não esgotou o bucket de posições");
    if (event !== 204) throw new Error(`o evento depois da rajada respondeu ${event}`);
  });

  await step("banco e log: a tabela não tem coluna de coordenada/JSON/nome; o log da api não tem segredo, coordenada nem tipo forjado; OS intacta", async () => {
    const columns = psql(
      `SELECT string_agg(column_name || ':' || data_type, ',') FROM information_schema.columns WHERE table_name = 'vehicle_telemetry_events';`,
    );
    if (/lat|lon|json|name|phone|contact|double/i.test(columns)) throw new Error(`coluna suspeita em vehicle_telemetry_events: ${columns}`);
    const { stdout } = docker(compose("logs", "--no-color", "--no-log-prefix", "api"), { timeout: 60_000, allowFailure: true });
    if (stdout.includes(forwardSecret)) throw new Error("o segredo do forward apareceu no log da api");
    if (/23\.5505|46\.6333/.test(stdout)) throw new Error("a coordenada apareceu no log da api");
    if (stdout.includes(FORGED_TYPE)) throw new Error("o tipo forjado apareceu no log da api");
    if (!/"outcome":"ignored"/.test(stdout)) throw new Error("o ignored não foi contado no log");
    if (workOrderMd5() !== md5Before) throw new Error("a OS mudou (nada pode escrever em mileage_*)");
  });

  await step("onde escutam, medido dentro dos contêineres (Traccar e ingestão)", async () => {
    const traccar = listeningAddresses("traccar");
    const api = listeningAddresses("api");
    console.log(`[traccar-demo]      traccar LISTEN: ${traccar.join(" ")}`);
    console.log(`[traccar-demo]      api LISTEN: ${api.join(" ")}`);
    const web = traccar.filter((address) => address.endsWith(":8082"));
    if (web.length === 0 || web.some((address) => !address.startsWith("127.0.0.1:") && !address.startsWith("::ffff:127.0.0.1:"))) {
      throw new Error("a web/REST do Traccar (8082) não está presa ao 127.0.0.1 do contêiner");
    }
    const ingest = api.filter((address) => address.endsWith(":3200"));
    if (ingest.length !== 1 || ingest[0].startsWith("0.0.0.0") || ingest[0].startsWith("::")) {
      throw new Error("a ingestão (3200) não está presa a um único endereço privado");
    }
  });

  if (WITH_WEB) {
    await step("demo: GRANT EXECUTE em auth_login_candidates ao erp_runtime (SÓ nesta demonstração; produção = passo 5 do runbook, ato do dono)", async () => {
      psql("GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime;");
      // O desfecho do login sem organização é instantâneo de boot: a api relê depois de reiniciar.
      docker(compose("restart", "api"), { timeout: 300_000 });
      await pollUntil(
        "login sem organização depois da concessão",
        async () => {
          const response = await fetchWithTimeout(`${BASE_URL}/api/v1/health/ready`);
          const body = await response.json();
          if (response.status !== 200) throw new Error(`readiness ${response.status}`);
          if (body.login_without_org === "inert_no_execute") throw new Error("login_without_org ainda inert_no_execute");
          console.log(`[traccar-demo]      login_without_org: ${body.login_without_org}`);
        },
        240_000,
        3_000,
      );
    });

    await step(`web do ERP em 127.0.0.1:${WEB_PORT} (opcional, --with-web)`, async () => {
      docker(compose("up", "-d", "--build", "web"), { timeout: 1_500_000 });
      console.log(`[traccar-demo]      abra http://127.0.0.1:${WEB_PORT} e entre como o operador de despacho (${process.env.TRC_DEMO_PASSWORD ? "senha: a que você passou em TRC_DEMO_PASSWORD" : "sem TRC_DEMO_PASSWORD: sem login criado"})`);
    });
  }

  console.log("[traccar-demo] VERDE");
} catch {
  process.exitCode = 1;
} finally {
  sseAbort?.abort();
  teardown();
}
