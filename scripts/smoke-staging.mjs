// Ω-INFRA-2 — smoke HTTP pós-deploy do staging. Falhou = exit 1 = job vermelho (pré-condição de voto).
// Prova: (1) readiness profunda (Postgres+Redis up), (2) login demo real, (3) 1 rota autenticada.
// NUNCA imprime token/senha — só status e latência.

const BASE = requiredEnv("STAGING_API_URL").replace(/\/+$/, "");
const EMAIL = requiredEnv("SMOKE_EMAIL");
const PASSWORD = requiredEnv("SMOKE_PASSWORD");

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[smoke] env obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

async function step(name, fn) {
  const start = Date.now();
  try {
    await fn();
    console.log(`[smoke] OK   ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    console.error(`[smoke] FAIL ${name} (${Date.now() - start}ms): ${error.message}`);
    process.exit(1);
  }
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // corpo não-JSON: segue com null (o status decide)
  }
  return { status: response.status, body };
}

let accessToken = "";

await step("GET /api/v1/health/ready (readiness profunda)", async () => {
  const { status, body } = await fetchJson("/api/v1/health/ready");
  if (status !== 200) throw new Error(`esperado 200, veio ${status} (${body?.status ?? "sem corpo"})`);
  if (body?.status !== "ready") throw new Error(`esperado status=ready, veio ${body?.status}`);
});

await step("POST /api/v1/auth/login (login demo)", async () => {
  const { status, body } = await fetchJson("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (status !== 200) throw new Error(`esperado 200, veio ${status}`);
  accessToken = body?.data?.access_token ?? body?.data?.accessToken ?? "";
  if (!accessToken) throw new Error("resposta sem access_token");
});

await step("GET /api/v1/me (rota autenticada)", async () => {
  const { status, body } = await fetchJson("/api/v1/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (status !== 200) throw new Error(`esperado 200, veio ${status}`);
  if (!body?.data?.user?.id) throw new Error("resposta sem data.user.id");
});

console.log("[smoke] staging VERDE — readiness + login + rota autenticada.");
