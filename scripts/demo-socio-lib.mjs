// DEMO-A (demonstração ao sócio, plano DEMO-SOCIO §1.1–1.4, AC-03/AC-04/AC-05) — funções PURAS e a trava de terreno
// compartilhadas por `demo-socio-seed.mjs` e `demo-socio-trajeto.mjs`. Nada aqui fala com rede, Docker ou banco:
// os scripts leem o mundo e passam os fatos para cá, e os testes (`tests/demo-socio-scripts.test.ts`) exercitam
// estas funções sem pilha de pé.

/** O ÚNICO projeto onde estes scripts rodam. Não há variável que aponte para outro. */
export const DEMO_PROJECT = "demo-socio";
export const DEMO_API_HOST = "127.0.0.1";
export const DEMO_API_PORT = 3102;
export const DEMO_WEB_PORT = 18080;
/** Rede interna do simulador: só alcança o Traccar (overlay docker-compose.traccar.yml, `traccar_devices`). */
export const DEMO_DEVICES_NETWORK = `${DEMO_PROJECT}_traccar_devices`;
/** Chave NOVA do rastreador da demo (plano §1.3: `trcdemo01` já está ativo noutra organização). */
export const DEMO_DEVICE_ID = "guincho01";
export const DEMO_INSTANCE_KEY = "erp-dev";
const COMPOSE_PROJECT_LABEL = "com.docker.compose.project";
const COMPOSE_SERVICE_LABEL = "com.docker.compose.service";

/** Portas da base viva e do ambiente de dev do dono: nunca alvo (mandato DEMO-A, "Terreno"). */
export const FORBIDDEN_PORTS = Object.freeze([5432, 6379, 3000, 5173, 5050, 8899]);

/**
 * Lê os rótulos do `docker ps --format '{{json .}}'` (campo `Labels`, "k=v,k=v").
 * @param {string | undefined} labels
 * @returns {Record<string, string>}
 */
export function parseDockerLabels(labels) {
  const out = {};
  for (const pair of String(labels ?? "").split(",")) {
    const cut = pair.indexOf("=");
    if (cut <= 0) continue;
    out[pair.slice(0, cut).trim()] = pair.slice(cut + 1).trim();
  }
  return out;
}

/**
 * A trava de terreno, como função pura. Recebe o projeto pedido, o endereço da API e as linhas do `docker ps`
 * (todas, sem filtro) e devolve a lista de motivos para RECUSAR. Lista vazia = pode seguir.
 *
 * Recusa quando:
 *  - o projeto pedido não é `demo-socio` (inclusive qualquer `erp-*`);
 *  - a API não é 127.0.0.1:3102, ou a porta é de uma base viva / dev do dono;
 *  - não há contêiner `api` com o rótulo do compose `demo-socio` de pé;
 *  - quem publica a 3102 no host não é a `api` do `demo-socio` (outra pilha ocupando a porta);
 *  - algum contêiner do projeto se chama `erp-*` (rótulo forjado ou projeto errado).
 *
 * @param {{ project?: string, apiHost?: string, apiPort?: number, containers: Array<{ Names?: string, Labels?: string, Ports?: string, State?: string }> }} input
 * @returns {string[]}
 */
export function demoTargetRefusals({ project, apiHost = DEMO_API_HOST, apiPort = DEMO_API_PORT, containers }) {
  const refusals = [];
  if (project !== DEMO_PROJECT) refusals.push(`projeto "${project ?? ""}" não é "${DEMO_PROJECT}"`);
  if (/^erp-/i.test(String(project ?? ""))) refusals.push("projeto erp-* é proibido (base viva ou pilha de dev)");
  if (apiHost !== DEMO_API_HOST) refusals.push(`host da API ${apiHost} não é ${DEMO_API_HOST}`);
  if (FORBIDDEN_PORTS.includes(Number(apiPort))) refusals.push(`porta ${apiPort} é da base viva ou do dev do dono`);
  if (Number(apiPort) !== DEMO_API_PORT) refusals.push(`porta da API ${apiPort} não é ${DEMO_API_PORT}`);

  const rows = Array.isArray(containers) ? containers : [];
  const ofProject = rows.filter((row) => parseDockerLabels(row.Labels)[COMPOSE_PROJECT_LABEL] === DEMO_PROJECT);
  for (const row of ofProject) {
    if (/^erp-/i.test(String(row.Names ?? ""))) refusals.push(`contêiner ${row.Names} tem nome erp-* dentro do projeto ${DEMO_PROJECT}`);
    for (const port of FORBIDDEN_PORTS) {
      // Publicação no HOST ("ip:porta->…"): o banco e o Redis da demo só existem dentro da rede do projeto.
      if (new RegExp(`:${port}->`).test(String(row.Ports ?? ""))) refusals.push(`contêiner ${row.Names} publica a porta ${port} no host`);
    }
  }
  const api = ofProject.find((row) => parseDockerLabels(row.Labels)[COMPOSE_SERVICE_LABEL] === "api" && (row.State ?? "running") === "running");
  if (!api) refusals.push(`nenhuma api de pé com o rótulo ${COMPOSE_PROJECT_LABEL}=${DEMO_PROJECT}`);

  const publishes = (row) => new RegExp(`(^|[\\s,])${DEMO_API_HOST.replace(/\./g, "\\.")}:${Number(apiPort)}->3000/tcp`).test(String(row.Ports ?? ""));
  const publishers = rows.filter(publishes);
  if (api && !publishes(api)) refusals.push(`a api do ${DEMO_PROJECT} não publica ${DEMO_API_HOST}:${apiPort}`);
  for (const row of publishers) {
    if (parseDockerLabels(row.Labels)[COMPOSE_PROJECT_LABEL] !== DEMO_PROJECT) {
      refusals.push(`a porta ${apiPort} é publicada por ${row.Names}, fora do projeto ${DEMO_PROJECT}`);
    }
  }
  return refusals;
}

/**
 * Idempotência: dado o que JÁ existe e o que se deseja, devolve só o que falta criar (pela chave natural).
 * Rodar duas vezes: a segunda devolve lista vazia.
 * @template T, D
 * @param {readonly T[]} existing
 * @param {readonly D[]} desired
 * @param {(item: T) => string} existingKey
 * @param {(item: D) => string} desiredKey
 * @returns {{ toCreate: D[], present: Array<{ desired: D, existing: T }> }}
 */
export function planEnsure(existing, desired, existingKey, desiredKey) {
  const index = new Map();
  for (const item of existing) {
    const key = normalizeKey(existingKey(item));
    if (key && !index.has(key)) index.set(key, item);
  }
  const toCreate = [];
  const present = [];
  const seen = new Set();
  for (const item of desired) {
    const key = normalizeKey(desiredKey(item));
    if (seen.has(key)) throw new Error(`chave desejada repetida: ${key}`);
    seen.add(key);
    const found = index.get(key);
    if (found) present.push({ desired: item, existing: found });
    else toCreate.push(item);
  }
  return { toCreate, present };
}

/** Chave natural: sem espaço nas pontas, caixa baixa e sem acento (o banco guarda o que a API normalizou). */
export function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Espelho de `WORK_ORDER_STATUS_TRANSITIONS` (src/modules/work-orders/work-order.validators.ts:21-31). */
export const WORK_ORDER_TRANSITIONS = Object.freeze({
  open: ["assigned", "cancelled"],
  assigned: ["accepted", "cancelled", "rejected"],
  accepted: ["on_route", "cancelled"],
  on_route: ["on_site", "cancelled"],
  on_site: ["in_progress", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress"],
  completed: [],
  cancelled: [],
  rejected: [],
});

/**
 * O caminho mais curto de status (sem o próprio `from`) até `to`. `[]` quando já está lá; `null` quando não há
 * caminho (ex.: OS já concluída e o alvo é outro). Usado para levar as OS de fundo ao status desejado e, na
 * segunda rodada, não andar nada.
 * @param {string} from
 * @param {string} to
 * @returns {string[] | null}
 */
export function statusPath(from, to, transitions = WORK_ORDER_TRANSITIONS) {
  if (from === to) return [];
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of transitions[current] ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === to) {
        const path = [next];
        let back = current;
        while (back !== from) {
          path.unshift(back);
          back = previous.get(back);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/** Trajeto padrão (plano §1.4): região da Av. Paulista, São Paulo. Coordenadas SINTÉTICAS. */
export const DEFAULT_ROUTE = Object.freeze({
  from: Object.freeze({ lat: -23.5614, lon: -46.6559 }),
  to: Object.freeze({ lat: -23.569, lon: -46.6494 }),
});

/**
 * Os N pontos do trajeto, em linha reta de `from` a `to`, com horário OsmAnd (segundos) estritamente crescente.
 * @param {{ from?: {lat:number, lon:number}, to?: {lat:number, lon:number}, points?: number, startEpochSeconds: number, stepSeconds?: number, speedKnots?: number }} input
 * @returns {Array<{ index: number, lat: number, lon: number, timestamp: number, speed: number }>}
 */
export function buildTrajectory({ from = DEFAULT_ROUTE.from, to = DEFAULT_ROUTE.to, points = 12, startEpochSeconds, stepSeconds = 5, speedKnots = 15 }) {
  if (!Number.isInteger(points) || points < 2 || points > 200) throw new Error("points deve ser inteiro entre 2 e 200");
  if (!Number.isInteger(startEpochSeconds) || startEpochSeconds <= 0) throw new Error("startEpochSeconds deve ser inteiro positivo");
  if (!Number.isInteger(stepSeconds) || stepSeconds < 1) throw new Error("stepSeconds deve ser inteiro ≥ 1");
  for (const [name, value] of [["from.lat", from.lat], ["to.lat", to.lat]]) {
    if (!Number.isFinite(value) || value < -90 || value > 90) throw new Error(`${name} fora de [-90, 90]`);
  }
  for (const [name, value] of [["from.lon", from.lon], ["to.lon", to.lon]]) {
    if (!Number.isFinite(value) || value < -180 || value > 180) throw new Error(`${name} fora de [-180, 180]`);
  }
  const out = [];
  for (let index = 0; index < points; index += 1) {
    const t = index / (points - 1);
    out.push({
      index,
      lat: round6(from.lat + (to.lat - from.lat) * t),
      lon: round6(from.lon + (to.lon - from.lon) * t),
      timestamp: startEpochSeconds + index * stepSeconds,
      speed: index === points - 1 ? 0 : speedKnots,
    });
  }
  return out;
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

/** O horário OsmAnd de envio: o de agora, mas nunca igual ou anterior ao último enviado (crescente). */
export function nextOsmandTimestamp(nowMs, lastTimestamp) {
  const now = Math.floor(nowMs / 1000);
  return lastTimestamp === undefined || now > lastTimestamp ? now : lastTimestamp + 1;
}

/** A query OsmAnd (o que o aplicativo OsmAnd mandaria à 5055 do Traccar). */
export function buildOsmandQuery({ id, lat, lon, timestamp, speed = 0 }) {
  return new URLSearchParams({ id, lat: String(lat), lon: String(lon), timestamp: String(timestamp), speed: String(speed) }).toString();
}

/**
 * Os argumentos do `docker run` de UM ponto — nunca `docker compose` (o compose exige o segredo do forward,
 * que o script da pilha sorteia e não imprime). `--rm` e só a rede `traccar_devices` do projeto.
 * @param {{ image: string, point: {lat:number, lon:number, timestamp:number, speed:number}, deviceId?: string, script: string }} input
 */
export function simDockerRunArgs({ image, point, deviceId = DEMO_DEVICE_ID, script }) {
  return [
    "run",
    "--rm",
    "--name",
    `${DEMO_PROJECT}-trajeto-${deviceId}-${point.timestamp}`,
    "--network",
    DEMO_DEVICES_NETWORK,
    "--label",
    "demo-socio.role=trajeto",
    "-e",
    `TRC_SIM_ID=${deviceId}`,
    "-e",
    `TRC_SIM_LAT=${point.lat}`,
    "-e",
    `TRC_SIM_LON=${point.lon}`,
    "-e",
    `TRC_SIM_TIMESTAMP=${point.timestamp}`,
    "-e",
    `TRC_SIM_SPEED=${point.speed}`,
    image,
    "node",
    "-e",
    script,
  ];
}

/** Cadência medida: média e extremos dos intervalos entre envios (ms). */
export function measureCadence(sentAtMs) {
  if (sentAtMs.length < 2) return { intervals: 0, meanMs: 0, minMs: 0, maxMs: 0 };
  const gaps = [];
  for (let index = 1; index < sentAtMs.length; index += 1) gaps.push(sentAtMs[index] - sentAtMs[index - 1]);
  return {
    intervals: gaps.length,
    meanMs: Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length),
    minMs: Math.min(...gaps),
    maxMs: Math.max(...gaps),
  };
}

/** Lê `--chave=valor` do argv. */
export function readFlag(argv, name) {
  const prefix = `--${name}=`;
  const hit = argv.find((arg) => arg.startsWith(prefix));
  return hit === undefined ? undefined : hit.slice(prefix.length);
}

/** Variáveis de senha que o seed exige, por modo. Nunca há valor padrão. */
export const PASSWORD_ENV = Object.freeze({
  manager: "DEMO_MANAGER_PASSWORD",
  admin: "DEMO_ADMIN_PASSWORD",
  tech: "DEMO_TECH_PASSWORD",
  dispatcher: "DEMO_DISPATCHER_PASSWORD",
});

/** As variáveis de senha ausentes (ou curtas demais) para o modo pedido. */
export function missingPasswords(env, mode) {
  const keys = mode === "posicao" ? [PASSWORD_ENV.tech] : Object.values(PASSWORD_ENV);
  return keys.filter((key) => typeof env[key] !== "string" || env[key].length < 8);
}

/** Tira de um texto qualquer valor de senha conhecido (defesa extra: nada de senha em log). */
export function redactSecrets(text, secrets) {
  let out = String(text ?? "");
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 4) out = out.split(secret).join("<redigido>");
  }
  return out;
}
