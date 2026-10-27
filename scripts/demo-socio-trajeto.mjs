// DEMO-A · AC-04 do plano DEMO-SOCIO — o rastreador SIMULADO do "Guincho 01" andando pela Av. Paulista (plano §1.4).
// ZERO dependência nova. Manda N posições OsmAnd (como o aplicativo OsmAnd mandaria) com `TRC_SIM_ID=guincho01`, uma
// por `docker run --rm` na rede interna `demo-socio_traccar_devices` — NUNCA `docker compose`: o compose exige o
// segredo do forward, que scripts/traccar-dev-demo.mjs sorteia e não imprime, e um `up` recriaria api e Traccar.
//
//   node scripts/demo-socio-trajeto.mjs                          # 12 pontos, um a cada 5 s, Av. Paulista
//   node scripts/demo-socio-trajeto.mjs --pontos=16 --cadencia=4 # N pontos e a cadência pedida (segundos)
//   node scripts/demo-socio-trajeto.mjs --de=-23.5614,-46.6559 --ate=-23.5690,-46.6494
//
// Cada ponto imprime `osmand_status=200` e o tempo do envio. No fim: a cadência MEDIDA (média, mínimo e máximo
// entre envios) — cada envio sobe um contêiner, e no Windows isso leva alguns segundos. Se o envio demorar mais que a
// cadência pedida, o ponto seguinte sai logo (a cadência real fica maior que a pedida, e o resumo diz isso).
// O horário de cada ponto é o de AGORA, sempre crescente: o Traccar e a ingestão descartam ponto antigo.
// Trava: a mesma do seed (projeto demo-socio, API 127.0.0.1:3102, nada de base viva nem erp-*), mais a rede.
// Saída: índice, status e tempo — nunca coordenada, token ou segredo.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_ROUTE,
  DEMO_DEVICE_ID,
  DEMO_DEVICES_NETWORK,
  DEMO_PROJECT,
  buildTrajectory,
  demoTargetRefusals,
  measureCadence,
  nextOsmandTimestamp,
  readFlag,
  simDockerRunArgs,
} from "./demo-socio-lib.mjs";


/** A imagem do simulador é a MESMA do overlay (`traccar-sim`), fixada por digest — lida do arquivo, não repetida. */
export function simImageFromCompose(raw) {
  const text = String(raw).replace(/\r\n/g, "\n"); // o checkout no Windows pode trazer CRLF (core.autocrlf)
  const block = /\n {2}traccar-sim:\n([\s\S]*?)\n {2}[a-z][\w-]*:\n/.exec(text)?.[1] ?? "";
  const image = /\n? {4}image: (\S+)/.exec(block)?.[1];
  if (!image || !/@sha256:[0-9a-f]{64}$/.test(image)) throw new Error("imagem do traccar-sim não encontrada (ou sem digest) no docker-compose.traccar.yml");
  return image;
}

/** O mesmo programa do `traccar-sim` do overlay: 1 GET OsmAnd na 5055, retenta só erro de conexão, imprime o status. */
export const SIM_SCRIPT = [
  "const params = new URLSearchParams({ id: process.env.TRC_SIM_ID || '', lat: process.env.TRC_SIM_LAT || '', lon: process.env.TRC_SIM_LON || '', timestamp: process.env.TRC_SIM_TIMESTAMP || '', speed: process.env.TRC_SIM_SPEED || '0' });",
  "const url = 'http://traccar:5055/?' + params.toString();",
  "const deadline = Date.now() + 90000;",
  "const retriable = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'EHOSTUNREACH']);",
  "(async () => { for (;;) { try { const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) }); console.log('osmand_status=' + r.status); process.exit(r.ok ? 0 : 1); } catch (e) { const code = e && e.cause && e.cause.code; if (!retriable.has(code) || Date.now() > deadline) { console.log('osmand_error=' + (code || 'unknown')); process.exit(2); } await new Promise((res) => setTimeout(res, 1000)); } } })();",
].join("\n");

/** Lê "lat,lon" de uma flag. */
export function parseLatLon(value, fallback) {
  if (value === undefined) return fallback;
  const [lat, lon] = String(value).split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error(`coordenada inválida: ${value} (use lat,lon)`);
  return { lat, lon };
}

function docker(args, timeout = 180_000) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw new Error(`docker ${args[0]}: ${result.error.message}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function guard() {
  const requested = process.env.TRC_DEMO_PROJECT?.trim() || DEMO_PROJECT;
  const ps = docker(["ps", "--format", "{{json .}}"], 30_000);
  if (ps.status !== 0) throw new Error("docker ps falhou");
  const containers = ps.stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const refusals = demoTargetRefusals({ project: requested, containers });
  const traccar = containers.find((row) => row.Labels?.includes(`com.docker.compose.project=${DEMO_PROJECT}`) && row.Labels?.includes("com.docker.compose.service=traccar"));
  if (!traccar) refusals.push(`nenhum traccar de pé no projeto ${DEMO_PROJECT}`);
  const network = docker(["network", "inspect", DEMO_DEVICES_NETWORK, "--format", '{{index .Labels "com.docker.compose.project"}} {{.Internal}}'], 30_000);
  const [project, internal] = network.stdout.trim().split(/\s+/);
  if (network.status !== 0) refusals.push(`a rede ${DEMO_DEVICES_NETWORK} não existe`);
  else if (project !== DEMO_PROJECT || internal !== "true") refusals.push(`a rede ${DEMO_DEVICES_NETWORK} não é a rede interna do projeto ${DEMO_PROJECT}`);
  if (refusals.length > 0) throw new Error(`RECUSADO: ${refusals.join("; ")}`);
}

async function main() {
  const points = Number(readFlag(process.argv, "pontos") ?? 12);
  const cadenceSeconds = Number(readFlag(process.argv, "cadencia") ?? 5);
  if (!Number.isInteger(points) || points < 2 || points > 60) throw new Error("--pontos deve ser inteiro entre 2 e 60");
  if (!Number.isFinite(cadenceSeconds) || cadenceSeconds < 0 || cadenceSeconds > 120) throw new Error("--cadencia deve estar entre 0 e 120 s");
  const from = parseLatLon(readFlag(process.argv, "de"), DEFAULT_ROUTE.from);
  const to = parseLatLon(readFlag(process.argv, "ate"), DEFAULT_ROUTE.to);

  guard();
  console.log(`[demo-trajeto] OK   trava: projeto ${DEMO_PROJECT}, rede interna ${DEMO_DEVICES_NETWORK}, traccar de pé`);
  const image = simImageFromCompose(readFileSync(new URL("../docker-compose.traccar.yml", import.meta.url), "utf8"));

  // O plano fixa as coordenadas e a ordem; o horário de cada ponto é o do envio (agora, crescente).
  const plan = buildTrajectory({ from, to, points, startEpochSeconds: Math.floor(Date.now() / 1000), stepSeconds: Math.max(1, Math.round(cadenceSeconds)) });
  const sentAt = [];
  let lastTimestamp;
  let failures = 0;
  console.log(`[demo-trajeto] enviando ${points} pontos do ${DEMO_DEVICE_ID}, cadência pedida ${cadenceSeconds} s`);
  for (const point of plan) {
    const startedAt = Date.now();
    lastTimestamp = nextOsmandTimestamp(startedAt, lastTimestamp);
    const result = docker(simDockerRunArgs({ image, point: { ...point, timestamp: lastTimestamp }, script: SIM_SCRIPT }));
    const status = /osmand_status=(\d+)/.exec(result.stdout)?.[1];
    const elapsed = Date.now() - startedAt;
    sentAt.push(startedAt);
    if (status === "200") {
      console.log(`[demo-trajeto] ponto ${point.index + 1}/${points} osmand_status=200 (envio ${elapsed} ms)`);
    } else {
      failures += 1;
      const detail = /osmand_error=(\w+)/.exec(result.stdout)?.[1] ?? `saída ${result.status}`;
      console.log(`[demo-trajeto] ponto ${point.index + 1}/${points} FALHOU (${status ? `osmand_status=${status}` : detail}, ${elapsed} ms)`);
    }
    if (point.index < points - 1) await sleep(Math.max(0, cadenceSeconds * 1000 - elapsed));
  }
  const cadence = measureCadence(sentAt);
  console.log(
    `[demo-trajeto] cadência medida: média ${(cadence.meanMs / 1000).toFixed(1)} s (mín ${(cadence.minMs / 1000).toFixed(1)} s, máx ${(cadence.maxMs / 1000).toFixed(1)} s) em ${cadence.intervals} intervalos; pedida ${cadenceSeconds} s`,
  );
  if (failures > 0) {
    console.log(`[demo-trajeto] FALHA: ${failures} de ${points} pontos sem osmand_status=200`);
    process.exitCode = 1;
  } else {
    console.log(`[demo-trajeto] VERDE: ${points}/${points} pontos com osmand_status=200`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await main();
  } catch (error) {
    console.error(`[demo-trajeto] ${error.message}`);
    process.exitCode = 1;
  }
}
