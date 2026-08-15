// Ω-INFRA-4 — uptime probe (liveness). GET no /health; status != 200 / timeout / conn-refused = down →
// exit 1 → job vermelho → notificação nativa do GitHub. NÃO é monitor sintético multi-PoP nem sub-minuto
// (limitações do cron do Actions documentadas no runbook); é a peça grátis do MVP. Nunca imprime segredo.
//
// Uso: HEALTH_URL=https://<app>/api/v1/health node scripts/uptime-check.mjs
//
// B-O6R-05 (Ω6R-DIN-006) — PROBE OPCIONAL DO WORKER DE JOBS.
// Com `WORKER_HEALTH_URL` ausente o script se comporta EXATAMENTE como antes (mesma saída, mesmo
// código de saída): a peça nova é um no-op enquanto ninguém declarar a variável. Ver `probeWorker`.

const HEALTH_URL = requiredEnv("HEALTH_URL");
// URL do /health/worker. Vem de VARIÁVEL e é JAMAIS impressa — nem ela, nem o host (veto secops #4).
// Sem ela, nada muda: nenhuma requisição extra, nenhuma linha extra de log.
const WORKER_HEALTH_URL = process.env.WORKER_HEALTH_URL?.trim();
const RETRIES = Number(process.env.UPTIME_RETRIES ?? "2");
const RETRY_DELAY_MS = Number(process.env.UPTIME_RETRY_DELAY_MS ?? "5000");

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[uptime] env obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function hostOnly(url) {
  try {
    return new URL(url).host; // loga só o host (sem querystring/credenciais)
  } catch {
    return "<url inválida>";
  }
}

async function probe() {
  const start = Date.now();
  const response = await fetch(HEALTH_URL, {
    signal: AbortSignal.timeout(10_000),
    headers: { "user-agent": "erp-uptime-check" },
  });
  const ms = Date.now() - start;
  if (response.status !== 200) {
    throw new Error(`status ${response.status} (${ms}ms)`);
  }
  return ms;
}

/**
 * B-O6R-05 — o laço do worker de jobs está girando?
 *
 * LÊ O CORPO, nunca o status HTTP (veto secops #4 + veto ci-doutor): `starting` e `not_expected`
 * respondem **200**, e `not_expected` é justamente o processo que subiu SEM worker — o defeito
 * Ω6R-DIN-006. Uma probe que olhasse o status daria verde exatamente nele.
 *
 * NADA da URL vai para o log — nem o host: o rótulo é a palavra fixa "worker". O `/health` acima loga
 * host porque já logava (contrato antigo, sem regressão aqui); a peça NOVA nasce sem host nenhum.
 *
 * FALSO POSITIVO CONHECIDO, declarado em vez de escondido: uma probe que caia nos ~90s seguintes a um
 * deploy pode ler `starting` e alertar. A janela é coberta pelo smoke pós-deploy (que faz polling de
 * até 120s antes de validar o deploy) e a execução seguinte do cron, 5 min depois, já lê `up`.
 */
async function probeWorker() {
  const response = await fetch(WORKER_HEALTH_URL, {
    signal: AbortSignal.timeout(10_000),
    headers: { "user-agent": "erp-uptime-check" },
  });
  const body = await response.json().catch(() => null);
  const status = typeof body?.status === "string" ? body.status : "<sem status no corpo>";

  if (status !== "up") {
    throw new Error(`worker status="${status}"`);
  }
}

/**
 * Cinto de segurança do veto #4: nem uma mensagem de erro do runtime pode carregar a URL para o log.
 * O caso concreto é URL malformada — o `fetch` responde "Failed to parse URL from <a url inteira>".
 */
function withoutWorkerUrl(message) {
  const text = String(message ?? "sem resposta");

  return WORKER_HEALTH_URL ? text.split(WORKER_HEALTH_URL).join("<url-redigida>") : text;
}

/** No-op enquanto a variável não existir: mesma saída, mesmo código de saída de antes. */
async function checkWorkerIfConfigured() {
  if (!WORKER_HEALTH_URL) return;

  let workerError;
  for (let attempt = 1; attempt <= RETRIES + 1; attempt += 1) {
    try {
      await probeWorker();
      console.log(`[uptime] OK worker up (tentativa ${attempt})`);
      return;
    } catch (error) {
      workerError = error;
      console.error(`[uptime] worker: tentativa ${attempt} falhou: ${withoutWorkerUrl(error.message)}`);
      if (attempt <= RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  console.error(`[uptime] DOWN worker: ${withoutWorkerUrl(workerError?.message)}`);
  process.exit(1);
}

let lastError;
for (let attempt = 1; attempt <= RETRIES + 1; attempt += 1) {
  try {
    const ms = await probe();
    console.log(`[uptime] OK ${hostOnly(HEALTH_URL)} 200 (${ms}ms, tentativa ${attempt})`);
    await checkWorkerIfConfigured();
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`[uptime] tentativa ${attempt} falhou: ${error.message}`);
    if (attempt <= RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}

console.error(`[uptime] DOWN ${hostOnly(HEALTH_URL)}: ${lastError?.message ?? "sem resposta"}`);
process.exit(1);
