import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · topologia de DEV do Traccar (plano v2.1 §6.1, §8.6; A-01, A2-01; D-TRC-PD-APROVADA-2026-10-11).
// O teste lê a configuração que o Docker Compose RESOLVE (`docker compose … config --format json`, que não sobe
// nem baixa nada) e o texto do overlay, do `traccar.xml` e dos dois scripts. A propriedade provada é "3200, 5055 e
// 8082 não publicadas; o que é publicado fica em 127.0.0.1" — NÃO é inalcançabilidade a partir do host (A2-01).
// Sem Docker o teste FALHA com mensagem clara: o job `backend` da CI roda em ubuntu-latest, que tem Docker.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY = path.join(ROOT, "docker-compose.traccar.yml");
const BASE = path.join(ROOT, "docker-compose.prod.yml");
const TRACCAR_XML = path.join(ROOT, "infra", "traccar", "dev", "traccar.xml");
const DEMO_SCRIPT = path.join(ROOT, "scripts", "traccar-dev-demo.mjs");
const CAPTURE_SCRIPT = path.join(ROOT, "scripts", "traccar-capture-fixture.mjs");

const FORBIDDEN_PUBLISHED_PORTS = new Set(["3200", "5055", "8082"]);
const OVERLAY_SERVICES = ["traccar", "traccar-sim", "traccar-capture"] as const;
const PUBLIC_DEMO_HOST = /demo\d?\.traccar\.org/i;

type ComposePort = { target?: number | string; published?: number | string; host_ip?: string };
type ComposeService = {
  image?: string;
  ports?: ComposePort[];
  environment?: Record<string, string | null>;
  networks?: Record<string, { ipv4_address?: string } | null>;
  profiles?: string[];
};
type ComposeConfig = {
  services: Record<string, ComposeService>;
  networks?: Record<string, { internal?: boolean; name?: string }>;
};

function placeholderEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("TRC_") || key === "API_PORT" || key === "COMPOSE_PROFILES") continue;
    env[key] = value;
  }
  env.TRC_FORWARD_SECRET = "topology-placeholder-not-a-secret-0000000000";
  env.TRC_FORWARD_HEADER = "X-Traccar-Forward-Token: topology-placeholder-not-a-secret";
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return env;
}

function runComposeConfig(env: NodeJS.ProcessEnv): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-p",
      "trc-topology",
      "-f",
      BASE,
      "-f",
      OVERLAY,
      "--profile",
      "tools",
      "--profile",
      "capture",
      "config",
      "--format",
      "json",
    ],
    { cwd: ROOT, env, encoding: "utf8", timeout: 60_000 },
  );
  if (result.error) {
    throw new Error(
      `B-TRC-01 topologia: não foi possível executar "docker compose" (${result.error.message}). ` +
        "Este teste exige Docker com Compose v2.24+; ele falha em vez de se declarar pulado.",
    );
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

let resolvedConfig: ComposeConfig | undefined;
function composeConfig(): ComposeConfig {
  if (resolvedConfig) return resolvedConfig;
  assert.ok(existsSync(OVERLAY), "docker-compose.traccar.yml não existe");
  const result = runComposeConfig(placeholderEnv());
  assert.equal(result.status, 0, `docker compose config falhou: ${result.stderr.slice(0, 600)}`);
  resolvedConfig = JSON.parse(result.stdout) as ComposeConfig;
  return resolvedConfig;
}

function read(file: string): string {
  assert.ok(existsSync(file), `${path.relative(ROOT, file)} não existe`);
  return readFileSync(file, "utf8");
}

function xmlEntry(xml: string, key: string): string | undefined {
  const pattern = new RegExp(`<entry\\s+key=['"]${key.replace(/\./g, "\\.")}['"]\\s*>([^<]*)</entry>`);
  return pattern.exec(xml)?.[1]?.trim();
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

test("traccar: o serviço do Traccar não tem `ports`", { timeout: 60_000 }, () => {
  const traccar = composeConfig().services.traccar;
  assert.ok(traccar, "serviço `traccar` ausente do overlay");
  assert.equal(traccar.ports?.length ?? 0, 0, "o Traccar não pode publicar porta nenhuma no host");
});

test("traccar: nenhum serviço publica 3200, 5055 ou 8082", { timeout: 60_000 }, () => {
  for (const [name, service] of Object.entries(composeConfig().services)) {
    for (const port of service.ports ?? []) {
      assert.ok(!FORBIDDEN_PUBLISHED_PORTS.has(String(port.target)), `${name} publica a porta interna ${port.target}`);
      assert.ok(
        !FORBIDDEN_PUBLISHED_PORTS.has(String(port.published ?? "")),
        `${name} publica no host a porta ${port.published}`,
      );
    }
  }
});

test("traccar: a `api` publica só a 3000 e só em 127.0.0.1", { timeout: 60_000 }, () => {
  const ports = composeConfig().services.api?.ports ?? [];
  assert.equal(ports.length, 1, `a api deve publicar exatamente uma porta; publica ${ports.length}`);
  assert.equal(String(ports[0]!.target), "3000");
  assert.equal(ports[0]!.host_ip, "127.0.0.1");
});

test("traccar: o `web`, se presente, só em 127.0.0.1; nada publicado fora do loopback", { timeout: 60_000 }, () => {
  const services = composeConfig().services;
  for (const port of services.web?.ports ?? []) {
    assert.equal(port.host_ip, "127.0.0.1", "o web só pode ser publicado em 127.0.0.1");
  }
  for (const [name, service] of Object.entries(services)) {
    for (const port of service.ports ?? []) {
      assert.equal(port.host_ip, "127.0.0.1", `${name} publica ${port.target} fora de 127.0.0.1`);
    }
  }
});

test("traccar: `traccar_private` e `traccar_devices` são redes internas", { timeout: 60_000 }, () => {
  const networks = composeConfig().networks ?? {};
  for (const name of ["traccar_private", "traccar_devices"]) {
    assert.ok(networks[name], `rede ${name} ausente`);
    assert.equal(networks[name]!.internal, true, `rede ${name} precisa ser internal`);
  }
  const services = composeConfig().services;
  assert.deepEqual(Object.keys(services.traccar?.networks ?? {}).sort(), ["traccar_devices", "traccar_private"]);
  assert.deepEqual(Object.keys(services["traccar-sim"]?.networks ?? {}), ["traccar_devices"]);
  assert.deepEqual(Object.keys(services["traccar-capture"]?.networks ?? {}), ["traccar_private"]);
});

test("traccar: TRACCAR_INGEST_HOST da `api` é o ipv4_address dela na `traccar_private`", { timeout: 60_000 }, () => {
  const api = composeConfig().services.api!;
  const privateIp = api.networks?.traccar_private?.ipv4_address;
  assert.ok(privateIp, "a api precisa de ipv4_address fixo na traccar_private");
  assert.equal(api.environment?.TRACCAR_INGEST_HOST, privateIp);
  assert.equal(api.environment?.TRACCAR_INGEST_ENABLED, "true");
  assert.equal(api.environment?.TRACCAR_INGEST_PORT, "3200");
  assert.ok(Object.keys(api.networks ?? {}).includes("default"), "a api continua na rede default (banco e Redis)");
});

test("traccar: as imagens do overlay vêm por tag e por @sha256", { timeout: 60_000 }, () => {
  const services = composeConfig().services;
  for (const name of OVERLAY_SERVICES) {
    const image = services[name]?.image ?? "";
    assert.match(image, /^[a-z0-9./_-]+:[A-Za-z0-9._-]+@sha256:[0-9a-f]{64}$/, `${name} sem tag+digest: ${image}`);
  }
  assert.equal(
    services.traccar!.image,
    "traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda",
    "a imagem do Traccar é a da PD aprovada (D-TRC-PD-APROVADA-2026-10-11)",
  );
});

test(
  "traccar: CONFIG_USE_ENVIRONMENT_VARIABLES=true e FORWARD_HEADER só por interpolação obrigatória",
  { timeout: 60_000 },
  () => {
    const traccar = composeConfig().services.traccar!;
    assert.equal(traccar.environment?.CONFIG_USE_ENVIRONMENT_VARIABLES, "true");
    const overlay = read(OVERLAY);
    assert.match(overlay, /FORWARD_HEADER:\s*"?\$\{TRC_FORWARD_HEADER:\?/, "FORWARD_HEADER precisa de ${TRC_FORWARD_HEADER:?}");
    assert.match(
      overlay,
      /TRACCAR_FORWARD_SECRET_CURRENT:\s*"?\$\{TRC_FORWARD_SECRET:\?/,
      "o segredo da api precisa de ${TRC_FORWARD_SECRET:?}",
    );
    const withoutHeader = runComposeConfig(placeholderEnv({ TRC_FORWARD_HEADER: undefined }));
    assert.notEqual(withoutHeader.status, 0, "sem TRC_FORWARD_HEADER o compose tem de recusar a configuração");
    assert.match(withoutHeader.stderr, /TRC_FORWARD_HEADER/);
  },
);

test("traccar: o traccar.xml liga só o OsmAnd, forward JSON com retry, sem geocoder", { timeout: 60_000 }, () => {
  const xml = read(TRACCAR_XML);
  assert.equal(xmlEntry(xml, "protocols.enable"), "osmand");
  assert.equal(xmlEntry(xml, "forward.retry.enable"), "true");
  assert.equal(xmlEntry(xml, "forward.type"), "json");
  assert.equal(xmlEntry(xml, "geocoder.enable"), "false");
  assert.equal(xmlEntry(xml, "web.address"), "127.0.0.1");
  assert.doesNotMatch(xml, /key=['"]forward\.header['"]/i, "o segredo do forward nunca vai para o traccar.xml");
});

test("traccar: nenhum servidor público de demonstração no overlay, na config ou nos scripts", { timeout: 60_000 }, () => {
  const files = [OVERLAY, TRACCAR_XML, DEMO_SCRIPT, CAPTURE_SCRIPT];
  for (const file of files) {
    assert.doesNotMatch(read(file), PUBLIC_DEMO_HOST, `${path.relative(ROOT, file)} cita servidor de demonstração`);
  }
  assert.doesNotMatch(JSON.stringify(composeConfig()), PUBLIC_DEMO_HOST);
});

test("traccar: `database.registerUnknown` só em infra/traccar/dev/", { timeout: 60_000 }, () => {
  const candidates = [
    ...readdirSync(ROOT)
      .filter((name) => /^docker-compose.*\.ya?ml$/.test(name))
      .map((name) => path.join(ROOT, name)),
    ...walk(path.join(ROOT, "infra")),
    ...walk(path.join(ROOT, "scripts")),
    ...walk(path.join(ROOT, "src")),
  ];
  const devDir = path.join(ROOT, "infra", "traccar", "dev") + path.sep;
  const hits = candidates.filter((file) => /registerUnknown|REGISTER_UNKNOWN/.test(readFileSync(file, "utf8")));
  assert.ok(hits.length > 0, "o traccar.xml de dev precisa ligar database.registerUnknown (trcdemo01)");
  for (const file of hits) {
    assert.ok(file.startsWith(devDir), `database.registerUnknown fora de infra/traccar/dev/: ${path.relative(ROOT, file)}`);
  }
});

test("traccar: os scripts de demo e de captura têm teto e não usam `tail -f` nem `docker system prune`", { timeout: 60_000 }, () => {
  for (const file of [DEMO_SCRIPT, CAPTURE_SCRIPT]) {
    const text = read(file);
    const rel = path.relative(ROOT, file);
    assert.match(text, /AbortSignal\.timeout\(|timeout:\s*\d/, `${rel} sem teto de tempo`);
    assert.doesNotMatch(text, /tail\s+-f|--follow|logs\s+-f\b/, `${rel} acompanha log`);
    assert.doesNotMatch(text, /system\s+prune|\bprune\b/, `${rel} usa prune`);
    assert.match(text, /down["',\s]+.*-v|"-v"/s, `${rel} precisa derrubar com down -v`);
  }
});
