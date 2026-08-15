// Ω-INFRA-2 — smoke HTTP pós-deploy do staging. Falhou = exit 1 = job vermelho (pré-condição de voto).
// Prova: (1) readiness profunda (Postgres+Redis up), (2) B-O6R-05 — o WORKER DE JOBS girando o laço
// (polling de `/health/worker` até o CORPO dizer `up`), (3) login demo real, (4) 1 rota autenticada.
// NUNCA imprime token/senha — só status e latência.

const BASE = requiredEnv("STAGING_API_URL").replace(/\/+$/, "");
const EMAIL = requiredEnv("SMOKE_EMAIL");
const PASSWORD = requiredEnv("SMOKE_PASSWORD");
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
      `(último: ${lastSeen}). Sem o laço girando, nenhum job é materializado — deploy inválido.`,
  );
}

let accessToken = "";

await step("GET /api/v1/health/ready (readiness profunda)", async () => {
  const { status, body } = await fetchJson("/api/v1/health/ready");
  if (status !== 200) throw new Error(`esperado 200, veio ${status} (${body?.status ?? "sem corpo"})`);
  if (body?.status !== "ready") throw new Error(`esperado status=ready, veio ${body?.status}`);
});

await step("GET /api/v1/health/worker (polling até o CORPO dizer up)", pollWorkerUp);

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

console.log("[smoke] staging VERDE — readiness + worker up + login + rota autenticada.");
