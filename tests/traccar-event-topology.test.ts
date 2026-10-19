import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { TRACCAR_EVENT_INGEST_PATH } from "../src/integrations/traccar/traccar-ingest.app.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · topologia de DEV do forward de EVENTOS do Traccar e guardas estáticas do bloco (plano v2 §9.2 suíte H,
// emenda v2.1 R3-2/R3-3). Lê a configuração que o Docker Compose RESOLVE (`docker compose … config --format json`, que
// não sobe nem baixa nada) e o texto do overlay, do `traccar.xml`, das fixtures, dos scripts e das suítes `-db`.
// Sem Docker o teste FALHA com mensagem clara (o job `backend` da CI tem Docker), como a suíte do B-TRC-01.
// -----------------------------------------------------------------------------------------------

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), "..");
const OVERLAY = path.join(ROOT, "docker-compose.traccar.yml");
const BASE = path.join(ROOT, "docker-compose.prod.yml");
const TRACCAR_XML = path.join(ROOT, "infra", "traccar", "dev", "traccar.xml");
const FIXTURES_DIR = path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0");
const DEMO_SCRIPT = path.join(ROOT, "scripts", "traccar-dev-demo.mjs");
const CAPTURE_SCRIPT = path.join(ROOT, "scripts", "traccar-capture-fixture.mjs");
const TESTS_DIR = path.join(ROOT, "tests");

const FORBIDDEN_PUBLISHED_PORTS = new Set(["3200", "5055", "8082"]);
const PUBLISHING_SERVICES = ["api", "web"];
const PUBLIC_DEMO_HOST = /demo\d?\.traccar\.org/i;
const FORWARD_TOKEN_HEADER = "X-Traccar-Forward-Token";
const EVENT_FIXTURES = [
  "event-device-online.json",
  "event-ignition-on.json",
  "event-alarm-sos.json",
  "event-device-unknown.json",
  "event-device-offline.json",
] as const;
// A caixa SINTÉTICA do centro de São Paulo que o B-TRC-01 usa (lat -23.5505200, lon -46.6333080), com folga.
const SYNTHETIC_BOX = { latMin: -23.6, latMax: -23.5, lonMin: -46.7, lonMax: -46.58 };
const RESERVED_KEYS = new Set(["tenantid", "tenant_id", "token", "secret", "authorization", "path", "bucket", "storagekey"]);
// Toda suíte `-db` do Traccar cujo bloco de limpeza apaga `traccar_ingress_receipts` (lista nominal, emenda R3-2): as 5 do
// B-TRC-01 e as do próprio B-TRC-02. Um arnês novo entra aqui por ato consciente — vermelho por contagem até lá.
const FK_SAFE_TEARDOWN_SUITES = [
  "traccar-binding-uniqueness-db.test.ts",
  "traccar-event-ingestion-db.test.ts",
  "traccar-event-rls-db.test.ts",
  "traccar-event-sample-db.test.ts",
  "traccar-event-sample-quarantine-db.test.ts",
  "traccar-idempotency-db.test.ts",
  "traccar-position-ingestion-db.test.ts",
  "traccar-quarantine-db.test.ts",
  "traccar-resolution-race-db.test.ts",
] as const;

type ComposePort = { target?: number | string; published?: number | string; host_ip?: string };
type ComposeService = { ports?: ComposePort[]; environment?: Record<string, string | null> };
type ComposeConfig = { services: Record<string, ComposeService> };

const PLACEHOLDER_HEADER = `${FORWARD_TOKEN_HEADER}: event-topology-placeholder-not-a-secret`;

function placeholderEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("TRC_") || key === "API_PORT" || key === "COMPOSE_PROFILES") continue;
    env[key] = value;
  }
  env.TRC_FORWARD_SECRET = "event-topology-placeholder-not-a-secret-000000";
  env.TRC_FORWARD_HEADER = PLACEHOLDER_HEADER;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return env;
}

function runComposeConfig(env: NodeJS.ProcessEnv): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    "docker",
    ["compose", "-p", "trc-event-topology", "-f", BASE, "-f", OVERLAY, "--profile", "tools", "--profile", "capture", "config", "--format", "json"],
    { cwd: ROOT, env, encoding: "utf8", timeout: 60_000 },
  );
  if (result.error) {
    throw new Error(
      `B-TRC-02 topologia: não foi possível executar "docker compose" (${result.error.message}). ` +
        "Este teste exige Docker com Compose v2.24+; ele falha em vez de se declarar pulado.",
    );
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

let resolvedConfig: ComposeConfig | undefined;
function composeConfig(): ComposeConfig {
  if (resolvedConfig) return resolvedConfig;
  const result = runComposeConfig(placeholderEnv());
  assert.equal(result.status, 0, `docker compose config falhou: ${result.stderr.slice(0, 600)}`);
  resolvedConfig = JSON.parse(result.stdout) as ComposeConfig;
  return resolvedConfig;
}

function read(file: string): string {
  assert.ok(existsSync(file), `${path.relative(ROOT, file)} não existe`);
  return readFileSync(file, "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

test("evento: EVENT_FORWARD_URL do Traccar aponta para a api na 3200 e para a rota de eventos", { timeout: 60_000 }, () => {
  const overlay = read(OVERLAY);
  assert.match(
    overlay,
    /EVENT_FORWARD_URL:\s*"?\$\{TRC_EVENT_FORWARD_URL:-http:\/\/api:3200\/ingest\/traccar\/v1\/events\}/,
    "EVENT_FORWARD_URL precisa do default http://api:3200/ingest/traccar/v1/events",
  );
  const url = composeConfig().services.traccar?.environment?.EVENT_FORWARD_URL;
  assert.ok(url, "o serviço traccar precisa de EVENT_FORWARD_URL");
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "api");
  assert.equal(parsed.port, "3200");
  assert.equal(parsed.pathname, TRACCAR_EVENT_INGEST_PATH, "o caminho do forward de eventos é o da rota do listener");
  assert.equal(parsed.search, "", "segredo nunca em query string");
});

test("evento: EVENT_FORWARD_HEADER só entra por interpolação obrigatória de TRC_FORWARD_HEADER", { timeout: 60_000 }, () => {
  const overlay = read(OVERLAY);
  assert.match(overlay, /EVENT_FORWARD_HEADER:\s*"?\$\{TRC_FORWARD_HEADER:\?/, "EVENT_FORWARD_HEADER precisa de ${TRC_FORWARD_HEADER:?}");
  assert.equal(composeConfig().services.traccar?.environment?.EVENT_FORWARD_HEADER, PLACEHOLDER_HEADER);
  const withoutHeader = runComposeConfig(placeholderEnv({ TRC_FORWARD_HEADER: undefined }));
  assert.notEqual(withoutHeader.status, 0, "sem TRC_FORWARD_HEADER o compose tem de recusar a configuração");
  assert.match(withoutHeader.stderr, /TRC_FORWARD_HEADER/);
});

test("evento: nenhum `ports` novo; 3200, 5055 e 8082 nunca publicadas", { timeout: 60_000 }, () => {
  const services = composeConfig().services;
  const publishing = Object.entries(services)
    .filter(([, service]) => (service.ports ?? []).length > 0)
    .map(([name]) => name)
    .sort();
  assert.deepEqual(publishing, PUBLISHING_SERVICES, "só api e web publicam porta (o B-TRC-02 não abre porta)");
  for (const [name, service] of Object.entries(services)) {
    for (const port of service.ports ?? []) {
      assert.ok(!FORBIDDEN_PUBLISHED_PORTS.has(String(port.target)), `${name} publica a ${String(port.target)}`);
      assert.equal(port.host_ip, "127.0.0.1", `${name} publica fora do loopback`);
    }
  }
  assert.equal((services.traccar?.ports ?? []).length, 0);
});

test("evento: EVENT_STATUS_ENABLE e STATUS_TIMEOUT só no overlay de dev, nunca no compose de produção", { timeout: 60_000 }, () => {
  const env = composeConfig().services.traccar?.environment ?? {};
  assert.equal(env.EVENT_STATUS_ENABLE, "true");
  assert.equal(env.STATUS_TIMEOUT, "60");
  const composes = readdirSync(ROOT)
    .filter((name) => /^docker-compose.*\.ya?ml$/.test(name))
    .map((name) => path.join(ROOT, name))
    .filter((file) => file !== OVERLAY);
  assert.ok(composes.includes(BASE));
  for (const file of composes) {
    assert.doesNotMatch(read(file), /EVENT_STATUS_ENABLE|STATUS_TIMEOUT|EVENT_FORWARD|event\.status|status\.timeout/, `${rel(file)} configura evento`);
  }
});

test("evento: nenhum servidor público de demonstração no overlay, no xml, nos scripts, nas fixtures ou na config", { timeout: 60_000 }, () => {
  const files = [OVERLAY, TRACCAR_XML, DEMO_SCRIPT, CAPTURE_SCRIPT, ...walk(FIXTURES_DIR)];
  for (const file of files) {
    assert.doesNotMatch(read(file), PUBLIC_DEMO_HOST, `${rel(file)} cita servidor de demonstração`);
  }
  assert.doesNotMatch(JSON.stringify(composeConfig()), PUBLIC_DEMO_HOST);
});

test("evento: o segredo do forward nunca vai para o traccar.xml nem para literal no overlay", { timeout: 60_000 }, () => {
  const xml = read(TRACCAR_XML);
  // Qualquer chave cujo NOME termine em `forward.header` (forward.header, event.forward.header, …) — A-03.
  assert.doesNotMatch(xml, /<entry\s+key=['"][A-Za-z0-9_.-]*forward\.header['"]/i, "nenhuma *forward.header no traccar.xml");
  assert.ok(!xml.includes(FORWARD_TOKEN_HEADER), `o literal ${FORWARD_TOKEN_HEADER} não aparece no traccar.xml`);
  const overlay = read(OVERLAY);
  const allowed: Array<[number, number]> = [];
  for (const match of overlay.matchAll(/\$\{TRC_FORWARD_HEADER:\?[^}]*\}/g)) {
    allowed.push([match.index, match.index + match[0].length]);
  }
  for (const match of overlay.matchAll(new RegExp(FORWARD_TOKEN_HEADER, "g"))) {
    const inside = allowed.some(([start, end]) => match.index >= start && match.index < end);
    assert.ok(inside, `o literal ${FORWARD_TOKEN_HEADER} no overlay fora de \${TRC_FORWARD_HEADER:?…} (offset ${match.index})`);
  }
});

test("evento: o GRANT EXECUTE em auth_login_candidates existe só no passo nomeado do demo --with-web", { timeout: 60_000 }, () => {
  const needle = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.auth_login_candidates/gi;
  const scanned = [
    ...walk(path.join(ROOT, "prisma", "migrations")),
    ...walk(path.join(ROOT, "scripts")),
    ...readdirSync(ROOT)
      .filter((name) => /^docker-compose.*\.ya?ml$/.test(name))
      .map((name) => path.join(ROOT, name)),
    ...walk(path.join(ROOT, "src")),
    ...walk(path.join(ROOT, "infra")),
    ...walk(path.join(ROOT, ".github")),
    ...walk(TESTS_DIR),
  ].filter((file) => path.resolve(file) !== path.resolve(SELF));
  const hits = scanned.filter((file) => new RegExp(needle.source, "i").test(readFileSync(file, "utf8"))).map(rel).sort();
  assert.deepEqual(hits, ["scripts/traccar-dev-demo.mjs"], "o GRANT do demo vive em exatamente um arquivo");
  const demo = read(DEMO_SCRIPT);
  const occurrences = [...demo.matchAll(needle)];
  assert.equal(occurrences.length, 1, "uma ocorrência só no demo");
  const at = occurrences[0]!.index;
  const withWeb = demo.indexOf("if (WITH_WEB)");
  assert.ok(withWeb >= 0 && withWeb < at, "a concessão fica dentro do bloco if (WITH_WEB)");
  const stepStart = demo.lastIndexOf("step(", at);
  assert.ok(stepStart > withWeb, "a concessão é um step( dentro do bloco WITH_WEB");
  assert.ok(demo.slice(stepStart, at).includes("SÓ nesta demonstração"), "o passo se declara SÓ nesta demonstração");
});

function collectKeys(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, out);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, inner] of Object.entries(value)) {
      out.push(key);
      collectKeys(inner, out);
    }
  }
  return out;
}

test("evento: as 5 fixtures de evento estão sanitizadas (dado pessoal sintético, coordenada na caixa sintética)", { timeout: 60_000 }, () => {
  for (const name of EVENT_FIXTURES) {
    const body = JSON.parse(read(path.join(FIXTURES_DIR, name))) as Record<string, Record<string, unknown> | undefined>;
    assert.ok(body.event && typeof body.event === "object", `${name}: sem event`);
    const device = body.device;
    assert.ok(device && typeof device === "object", `${name}: sem device`);
    if (device.name !== undefined && device.name !== null) assert.match(String(device.name), /Sintetic/, `${name}: device.name`);
    if (device.contact !== undefined && device.contact !== null) assert.match(String(device.contact), /Sintetic/, `${name}: device.contact`);
    if (device.phone !== undefined && device.phone !== null) assert.match(String(device.phone), /^\+5500/, `${name}: device.phone`);
    assert.deepEqual(device.attributes ?? {}, {}, `${name}: device.attributes não é {}`);
    const position = body.position;
    if (position) {
      const lat = Number(position.latitude);
      const lon = Number(position.longitude);
      assert.ok(lat >= SYNTHETIC_BOX.latMin && lat <= SYNTHETIC_BOX.latMax, `${name}: latitude fora da caixa sintética`);
      assert.ok(lon >= SYNTHETIC_BOX.lonMin && lon <= SYNTHETIC_BOX.lonMax, `${name}: longitude fora da caixa sintética`);
    }
    for (const key of collectKeys(body)) {
      assert.ok(!RESERVED_KEYS.has(key.toLowerCase()), `${name}: chave reservada ${key}`);
    }
  }
  const offline = JSON.parse(read(path.join(FIXTURES_DIR, "event-device-offline.json"))) as Record<string, unknown>;
  assert.match(String(offline._sintetica ?? ""), /sint[ée]tica/i, "a fixture offline é sintética e diz isso");
});

/** O bloco de limpeza: o texto do primeiro `after(` até o `)` que o fecha (strings e comentários de linha ignorados). */
function cleanupBlock(source: string): string | undefined {
  const start = source.indexOf("after(");
  if (start < 0) return undefined;
  let depth = 0;
  let quote: string | undefined;
  for (let index = start + "after".length; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      const newline = source.indexOf("\n", index);
      index = newline < 0 ? source.length : newline;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return undefined;
}

test("evento: todo arnês -db do Traccar que apaga recibos apaga vehicle_telemetry_events ANTES (FK RESTRICT)", { timeout: 60_000 }, () => {
  const suites = readdirSync(TESTS_DIR).filter((name) => /^traccar-.*-db\.test\.ts$/.test(name)).sort();
  const covered: string[] = [];
  for (const name of suites) {
    const block = cleanupBlock(read(path.join(TESTS_DIR, name)));
    if (!block || !block.includes("traccar_ingress_receipts")) continue;
    covered.push(name);
    const telemetry = block.indexOf("vehicle_telemetry_events");
    const receipts = block.indexOf("traccar_ingress_receipts");
    assert.ok(telemetry >= 0, `${name}: o bloco de limpeza apaga recibos e não apaga vehicle_telemetry_events`);
    assert.ok(telemetry < receipts, `${name}: vehicle_telemetry_events precisa vir ANTES de traccar_ingress_receipts`);
  }
  assert.deepEqual(covered, [...FK_SAFE_TEARDOWN_SUITES], "a lista nominal de arnês FK-safe mudou: atualize-a conscientemente");
  assert.ok(suites.includes("traccar-ingest-pool-db.test.ts") && !covered.includes("traccar-ingest-pool-db.test.ts"), "controle: o pool não apaga recibos");
});
