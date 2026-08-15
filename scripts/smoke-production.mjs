// Ω-INFRA-3 — smoke HTTP pós-deploy de PRODUÇÃO. Falhou = exit 1 = deploy inválido.
// Diferente do staging (que tem seed demo), produção NÃO tem credencial demo. Prova:
//   (1) readiness profunda (Postgres+Redis up);
//   (2) B-O6R-05 (Ω6R-DIN-006) — o WORKER DE JOBS está girando o laço, por POLLING de
//       `/health/worker` até o CORPO dizer `status:"up"`;
//   (3) CORS RESTRITIVO — uma origem proibida NÃO é refletida (allowlist ativa). NB: isto prova o CORS
//       restritivo, NÃO diretamente NODE_ENV=production (uma allowlist não-vazia fora de prod também
//       restringe); a garantia de prod vem do gate fail-closed do env.ts (boot falha sem allowlist);
//   (4) OPCIONAL — login com usuário de smoke REAL (PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD) + rota
//       autenticada; se os secrets não existirem, o passo é PULADO com aviso (não falha).
// NUNCA imprime token/senha — só status e latência.

const BASE = requiredEnv("PROD_API_URL").replace(/\/+$/, "");
const SMOKE_EMAIL = process.env.PROD_SMOKE_EMAIL?.trim();
const SMOKE_PASSWORD = process.env.PROD_SMOKE_PASSWORD?.trim();
const FORBIDDEN_ORIGIN = "https://smoke-forbidden.invalid";
// B-O6R-05 — janela do polling do worker. Um processo recém-subido responde `starting` (200) até o
// primeiro tick resolvido; a janela cobre esse intervalo sem jamais aceitar `starting` como saudável.
const WORKER_POLL_INTERVAL_MS = 5_000;
const WORKER_POLL_TIMEOUT_MS = 120_000;

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

// B-O6R-05 (Ω6R-DIN-006) — POR QUE POLLING, E POR QUE LENDO O CORPO.
//
// `/health/worker` responde do estado do PROCESSO. Logo depois de um deploy o processo legitimamente
// ainda não completou o primeiro tick e responde `starting` — daí o polling: a janela existe para o
// worker PROVAR que subiu, não para o smoke desistir de perguntar.
//
// E a leitura é do CORPO, nunca do status HTTP: `starting` e `not_expected` respondem **200**.
// `not_expected` é exatamente o processo que subiu SEM worker — o defeito Ω6R-DIN-006. Um smoke que
// aceitasse "HTTP 200" daria verde no deploy que este passo existe para reprovar.
async function pollWorkerUp() {
  const deadline = Date.now() + WORKER_POLL_TIMEOUT_MS;
  let lastSeen = "sem resposta";

  while (Date.now() < deadline) {
    try {
      const { status, body } = await fetchJson("/api/v1/health/worker");
      if (body?.status === "up" && status === 200) return;
      lastSeen = `status="${body?.status ?? "?"}" (HTTP ${status})`;
    } catch (error) {
      lastSeen = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, WORKER_POLL_INTERVAL_MS));
  }

  throw new Error(
    `o worker de jobs não declarou "up" em ${Math.round(WORKER_POLL_TIMEOUT_MS / 1_000)}s ` +
      `(último: ${lastSeen}). Sem o laço girando, diária de pátio, reconciliação de custódia e ` +
      `notificação legal não são materializadas — deploy inválido.`,
  );
}

await step("GET /api/v1/health/ready (readiness profunda)", async () => {
  const { status, body } = await fetchJson("/api/v1/health/ready");
  if (status !== 200) throw new Error(`esperado 200, veio ${status} (${body?.status ?? "sem corpo"})`);
  if (body?.status !== "ready") throw new Error(`esperado status=ready, veio ${body?.status}`);
});

await step("GET /api/v1/health/worker (polling até o CORPO dizer up)", pollWorkerUp);

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

console.log("[smoke] produção VERDE — readiness + worker up + CORS restritivo" + (SMOKE_EMAIL && SMOKE_PASSWORD ? " + login real." : " (login pulado)."));
