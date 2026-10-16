// B-TRC-01 · passo 3 de §8.5 do plano do Traccar (v2.1) — captura do corpo REAL que o Traccar 6.16.0 encaminha.
// ZERO dependência nova. Projeto compose FIXO (`erp-trc01-capture`); nada no host além do Docker.
//
// O que faz, nesta ordem:
//   1. confere o terreno: Docker responde; a sub-rede da `traccar_private` não colide com rede Docker existente;
//   2. sorteia um segredo de forward só para esta rodada (vive só no ambiente do processo filho; nunca impresso);
//   3. sobe SÓ `traccar` + `traccar-capture` (o receptor fica na `traccar_private`, sem porta no host);
//   4. espera o `traccar-capture` declarar que escuta, ANTES do primeiro envio;
//   5. manda um ponto OsmAnd `trcdemo01` pelo `traccar-sim` (rede `traccar_devices`, só alcança o Traccar);
//   6. lê o corpo recebido; RECUSA se não for `{position, device}` ou se `device.uniqueId` não for `trcdemo01`;
//   7. troca `device.name`, `device.phone` e `device.contact` por valores sintéticos e esvazia `device.attributes`
//      ANTES de gravar ou imprimir (N2-05; v2.2 A-8); registra se o corpo veio da primeira entrega (`id` ausente
//      ou 0) ou de um retry (`id > 0`) e grava a fixture com `position.id = 0` (A2-10);
//   8. derruba o projeto com `down -v --remove-orphans` SEMPRE, inclusive em falha.
// Imprime só nomes de passo, nomes de header e estado — nunca valor de header, segredo ou coordenada.
//
// USO: node scripts/traccar-capture-fixture.mjs

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROJECT = "erp-trc01-capture";
const BASE_FILE = path.join(REPO_ROOT, "docker-compose.prod.yml");
const OVERLAY_FILE = path.join(REPO_ROOT, "docker-compose.traccar.yml");
const FIXTURE_FILE = path.join(REPO_ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json");
const DEVICE_ID = "trcdemo01";
const PRIVATE_SUBNET = process.env.TRC_PRIVATE_SUBNET?.trim() || "172.31.250.0/24";
const CAPTURE_URL = "http://traccar-capture:3200/ingest/traccar/v1/positions";
const DOCKER_TIMEOUT_MS = 600_000;
const WAIT_TIMEOUT_MS = 120_000;

// Coordenada SINTÉTICA (centro de São Paulo), nunca impressa.
const SIM_LAT = "-23.5505200";
const SIM_LON = "-46.6333080";
const SIM_SPEED_KNOTS = "10";

const secret = randomBytes(32).toString("base64url");

function composeEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("TRC_") || key === "COMPOSE_PROJECT_NAME" || key === "COMPOSE_PROFILES") delete env[key];
  }
  return {
    ...env,
    COMPOSE_PROGRESS: "plain",
    TRC_PRIVATE_SUBNET: PRIVATE_SUBNET,
    TRC_FORWARD_SECRET: secret,
    TRC_FORWARD_HEADER: `X-Traccar-Forward-Token: ${secret}`,
    TRC_FORWARD_URL: CAPTURE_URL,
    ...extra,
  };
}

function redact(text) {
  return String(text ?? "")
    .split(secret)
    .join("<segredo-redigido>")
    .replace(/-?\d{1,3}\.\d{4,}/g, "<numero-redigido>");
}

function docker(args, { allowFailure = false, extraEnv = {}, timeout = DOCKER_TIMEOUT_MS } = {}) {
  const result = spawnSync("docker", args, {
    cwd: REPO_ROOT,
    env: composeEnv(extraEnv),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout,
  });
  if (result.error) throw new Error(`docker ${args.slice(0, 3).join(" ")}: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    const detail = redact(`${result.stderr ?? ""}`.trim().split("\n").slice(-4).join(" | "));
    throw new Error(`docker ${args.slice(0, 6).join(" ")} saiu com ${result.status}: ${detail}`);
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function compose(...args) {
  return ["compose", "-p", PROJECT, "-f", BASE_FILE, "-f", OVERLAY_FILE, ...args];
}

let stepIndex = 0;
async function step(name, fn) {
  stepIndex += 1;
  try {
    const value = await fn();
    console.log(`[traccar-capture] OK   ${stepIndex}. ${name}`);
    return value;
  } catch (error) {
    console.error(`[traccar-capture] FAIL ${stepIndex}. ${name}: ${redact(error.message)}`);
    throw error;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(description, probe) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const value = probe();
    if (value !== undefined) return value;
    await sleep(1_000);
  }
  throw new Error(`${description}: expirou em ${WAIT_TIMEOUT_MS / 1000}s`);
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

function assertNoSubnetCollision() {
  const [ownStart, ownEnd] = cidrRange(PRIVATE_SUBNET);
  const ids = docker(["network", "ls", "-q"]).stdout.split(/\s+/).filter(Boolean);
  if (ids.length === 0) return;
  const inspected = JSON.parse(docker(["network", "inspect", ...ids]).stdout);
  for (const network of inspected) {
    for (const config of network?.IPAM?.Config ?? []) {
      const subnet = config?.Subnet;
      if (!subnet || subnet.includes(":")) continue;
      const [start, end] = cidrRange(subnet);
      if (start <= ownEnd && ownStart <= end) {
        throw new Error(`a sub-rede ${PRIVATE_SUBNET} colide com a rede Docker "${network.Name}" (${subnet})`);
      }
    }
  }
}

function captureLines(prefix) {
  const { stdout } = docker(compose("logs", "--no-color", "--no-log-prefix", "traccar-capture"), {
    allowFailure: true,
    timeout: 60_000,
  });
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length).trim());
}

let broughtUp = false;
let tornDown = false;
function teardown() {
  if (!broughtUp || tornDown) return;
  tornDown = true;
  const result = docker(compose("--profile", "capture", "--profile", "tools", "down", "-v", "--remove-orphans"), { allowFailure: true, timeout: 300_000 });
  if (result.status !== 0) {
    console.error(`[traccar-capture] AVISO: down -v falhou (${result.status})`);
    process.exitCode = 1;
  } else {
    console.log("[traccar-capture] projeto derrubado (down -v --remove-orphans)");
  }
}
process.on("exit", teardown);

try {
  await step("Docker responde", async () => {
    docker(["version", "--format", "{{.Server.Version}}"], { timeout: 30_000 });
  });

  await step("projeto da rodada anterior derrubado (idempotente)", async () => {
    docker(compose("--profile", "capture", "--profile", "tools", "down", "-v", "--remove-orphans"), { allowFailure: true, timeout: 300_000 });
  });

  await step(`sub-rede ${PRIVATE_SUBNET} sem colisão`, async () => assertNoSubnetCollision());

  await step("sobe traccar + traccar-capture (sem porta no host)", async () => {
    broughtUp = true;
    docker(compose("--profile", "capture", "up", "-d", "--wait", "traccar", "traccar-capture"));
  });

  await step("traccar-capture escuta antes do primeiro envio", async () =>
    waitFor("traccar-capture pronto", () => (captureLines("TRC_CAPTURE_READY").length > 0 ? true : undefined)),
  );

  await step("ponto OsmAnd trcdemo01 enviado pelo traccar-sim", async () => {
    const { stdout } = docker(compose("--profile", "tools", "run", "--rm", "-T", "traccar-sim"), {
      extraEnv: {
        TRC_SIM_ID: DEVICE_ID,
        TRC_SIM_LAT: SIM_LAT,
        TRC_SIM_LON: SIM_LON,
        TRC_SIM_TIMESTAMP: String(Math.floor(Date.now() / 1000)),
        TRC_SIM_SPEED: SIM_SPEED_KNOTS,
      },
      timeout: 180_000,
    });
    if (!/osmand_status=2\d\d/.test(stdout)) {
      throw new Error(`o Traccar não aceitou o ponto OsmAnd (${stdout.trim().split("\n").pop() ?? "sem saída"})`);
    }
  });

  const raw = await step("corpo encaminhado recebido pelo traccar-capture", async () =>
    waitFor("corpo do forward", () => captureLines("TRC_CAPTURE_BODY")[0]),
  );

  const headerNames = captureLines("TRC_CAPTURE_HEADERS")[0];
  console.log(`[traccar-capture] nomes dos headers recebidos: ${headerNames ?? "(nenhum)"}`);

  const fixture = await step("forma {position, device} e device.uniqueId = trcdemo01", async () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new Error("o corpo encaminhado não é JSON");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("o corpo não é objeto");
    const keys = Object.keys(body).sort();
    if (!body.position || !body.device) {
      throw new Error(`PARADA (§8.5 passo 3): o corpo não é {position, device}; chaves = ${JSON.stringify(keys)}`);
    }
    if (typeof body.device.uniqueId !== "string") {
      throw new Error("PARADA (§8.5 passo 3): device.uniqueId ausente");
    }
    if (body.device.uniqueId !== DEVICE_ID) {
      throw new Error("RECUSADO (N2-05): device.uniqueId diferente de trcdemo01");
    }
    return body;
  });

  await step("valores pessoais trocados por sintéticos e fixture gravada", async () => {
    const originalId = fixture.position.id;
    const delivery =
      originalId === undefined || originalId === null || originalId === 0
        ? `primeira entrega (position.id ${originalId === undefined ? "ausente" : String(originalId)})`
        : "retry (position.id > 0)";
    console.log(`[traccar-capture] corpo capturado: ${delivery}`);
    console.log(`[traccar-capture] chaves de position: ${JSON.stringify(Object.keys(fixture.position).sort())}`);
    console.log(`[traccar-capture] chaves de device: ${JSON.stringify(Object.keys(fixture.device).sort())}`);

    if ("name" in fixture.device) fixture.device.name = "Viatura Sintetica TRC01";
    if ("phone" in fixture.device) fixture.device.phone = "+550000000000";
    if ("contact" in fixture.device) fixture.device.contact = "Contato Sintetico";
    if ("attributes" in fixture.device) fixture.device.attributes = {};
    fixture.position.id = 0;

    mkdirSync(path.dirname(FIXTURE_FILE), { recursive: true });
    writeFileSync(FIXTURE_FILE, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  });

  console.log(`[traccar-capture] fixture em ${path.relative(REPO_ROOT, FIXTURE_FILE)}`);
} catch {
  process.exitCode = 1;
} finally {
  teardown();
}
