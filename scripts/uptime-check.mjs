// Ω-INFRA-4 — uptime probe (liveness). GET no /health; status != 200 / timeout / conn-refused = down →
// exit 1 → job vermelho → notificação nativa do GitHub. NÃO é monitor sintético multi-PoP nem sub-minuto
// (limitações do cron do Actions documentadas no runbook); é a peça grátis do MVP. Nunca imprime segredo.
//
// Uso: HEALTH_URL=https://<app>/api/v1/health node scripts/uptime-check.mjs

const HEALTH_URL = requiredEnv("HEALTH_URL");
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

let lastError;
for (let attempt = 1; attempt <= RETRIES + 1; attempt += 1) {
  try {
    const ms = await probe();
    console.log(`[uptime] OK ${hostOnly(HEALTH_URL)} 200 (${ms}ms, tentativa ${attempt})`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`[uptime] tentativa ${attempt} falhou: ${error.message}`);
    if (attempt <= RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}

console.error(`[uptime] DOWN ${hostOnly(HEALTH_URL)}: ${lastError?.message ?? "sem resposta"}`);
process.exit(1);
