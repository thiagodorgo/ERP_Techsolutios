// Ω-INFRA-3 — smoke HTTP pós-deploy de PRODUÇÃO. Falhou = exit 1 = deploy inválido.
// Diferente do staging (que tem seed demo), produção NÃO tem credencial demo. Prova:
//   (1) readiness profunda (Postgres+Redis up);
//   (2) CORS RESTRITIVO — uma origem proibida NÃO é refletida (prova viva de que NODE_ENV=production
//       está efetivo; fecha o ponto único de falha silenciosa se o env subir sem NODE_ENV=production);
//   (3) OPCIONAL — login com usuário de smoke REAL (PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD) + rota
//       autenticada; se os secrets não existirem, o passo é PULADO com aviso (não falha).
// NUNCA imprime token/senha — só status e latência.

const BASE = requiredEnv("PROD_API_URL").replace(/\/+$/, "");
const SMOKE_EMAIL = process.env.PROD_SMOKE_EMAIL?.trim();
const SMOKE_PASSWORD = process.env.PROD_SMOKE_PASSWORD?.trim();
const FORBIDDEN_ORIGIN = "https://smoke-forbidden.invalid";

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

async function fetchRaw(path, options = {}) {
  return fetch(`${BASE}${path}`, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  });
}

async function fetchJson(path, options = {}) {
  const response = await fetchRaw(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // corpo não-JSON: segue com null (o status decide)
  }
  return { status: response.status, body };
}

await step("GET /api/v1/health/ready (readiness profunda)", async () => {
  const { status, body } = await fetchJson("/api/v1/health/ready");
  if (status !== 200) throw new Error(`esperado 200, veio ${status} (${body?.status ?? "sem corpo"})`);
  if (body?.status !== "ready") throw new Error(`esperado status=ready, veio ${body?.status}`);
});

await step("CORS restritivo (origem proibida NÃO é refletida)", async () => {
  const response = await fetchRaw("/api/v1/health", {
    method: "OPTIONS",
    headers: {
      origin: FORBIDDEN_ORIGIN,
      "access-control-request-method": "GET",
    },
  });
  const allowOrigin = response.headers.get("access-control-allow-origin");
  // Em produção o CORS é allowlist: para uma origem proibida o cabeçalho deve estar AUSENTE. Se vier
  // "*" ou a própria origem proibida, o CORS está aberto (NODE_ENV=production não está efetivo).
  if (allowOrigin === "*" || allowOrigin === FORBIDDEN_ORIGIN) {
    throw new Error(`CORS aberto: access-control-allow-origin='${allowOrigin}' para origem proibida (prod deve rejeitar)`);
  }
});

if (SMOKE_EMAIL && SMOKE_PASSWORD) {
  let accessToken = "";
  await step("POST /api/v1/auth/login (usuário de smoke real)", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }),
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
} else {
  console.log("[smoke] SKIP login — PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD ausentes (sem usuário de smoke real ainda; readiness+CORS provados).");
}

console.log("[smoke] produção VERDE — readiness + CORS restritivo" + (SMOKE_EMAIL && SMOKE_PASSWORD ? " + login real." : " (login pulado)."));
