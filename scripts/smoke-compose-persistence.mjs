// B-O6R-05 §9 — SMOKE DE CONTÊINER: write → restart → read. ZERO dependência nova.
//
// O QUE ESTE SCRIPT PROVA, e por que ele existe
// ---------------------------------------------
// Um crítico da junta registrou que a ÚNICA linha que liga o worker de jobs ao boot não tinha
// cobertura nenhuma, e que a promessa "o smoke exercita o boot real" não podia ser assumida
// enquanto ninguém rodasse a imagem de verdade. Este arquivo é uma das duas provas dessa linha —
// e a única que sobe o artefato de produção inteiro (imagem + Postgres + Redis + migrations).
//
// A sequência (o log numera cada passo executado), e o defeito que cada um mata:
//   1. sobe o `docker-compose.prod.yml`                     — Ω6R: o arquivo NÃO subia (5 PORTAL_* faltando)
//   2. /health/ready 200 COM o bloco `checks.worker` no corpo — mata: remover `checks.worker` do readiness
//   3. /health/worker com `status:"up"` LIDO NO CORPO        — mata: worker desligado / asserir só o HTTP
//   4. grava uma ORGANIZAÇÃO pelo agregado core-saas         — o agregado que o Ω6R-DAT-001 perdia
//   5. reinicia o serviço `api` (PROCESSO NOVO, provado)     — mata: pular o restart
//   6. relê a organização por HTTP e ela AINDA EXISTE        — mata: CORE_SAAS_PERSISTENCE=memory
//   7. /health/worker volta a `up` no processo novo          — mata: worker que só sobe "na primeira vez"
//   8. `down -v` sempre, inclusive em falha                  — §C5
//
// SE ESTE SMOKE PASSAR COM O WORKER DESLIGADO, ELE NÃO SERVE. O passo 3 só aceita `up` lido no
// corpo: `starting`, `stale` e `not_expected` NÃO são aceitos — e `not_expected` responde HTTP 200,
// exatamente o caso que um smoke preguiçoso (que olha só o status) deixaria passar.
//
// TRAVA DE SEGURANÇA (veto secops #7, §11 do plano)
// ------------------------------------------------
// Este script assina um token com o JWT_SECRET do compose e RECUSA EXECUTAR se esse segredo não for
// o placeholder rotulado de validação local (`local-prod-validation-…-not-a-secret`). O alvo HTTP é
// SEMPRE loopback e nunca vem de variável. As duas coisas juntas tornam o script inutilizável contra
// um ambiente real POR CONSTRUÇÃO, não por disciplina de quem chama. O token nunca é impresso; toda
// saída de subprocesso passa por redação de URLs com credencial antes de chegar ao log.
//
// USO
//   node scripts/smoke-compose-persistence.mjs
//   API_PORT=3111 node scripts/smoke-compose-persistence.mjs     # porta do host (default 3101)
//   API_IMAGE=erp-api:ci SMOKE_COMPOSE_BUILD=0 node scripts/…    # reusa uma imagem já buildada (CI)
//   SMOKE_COMPOSE_EXTRA_FILE=<arquivo> node scripts/…            # 2º `-f` (usado na PROVA NEGATIVA)
//
// PROVA NEGATIVA (é assim que se verifica que este smoke não é teatro): com um override que ponha
// `JOBS_WORKER_ENABLED: "false"` no serviço `api`, este script fica VERMELHO — em produção o gate G3
// recusa o boot e a readiness nunca chega. E, num alvo que suba saudável SEM worker, é o passo do
// `/health/worker` que reprova, porque ele lê o corpo (`not_expected` responde HTTP 200).
//
// O projeto compose é FIXO (`erp-o6r-smoke`): o stack do smoke nunca colide com o `docker compose`
// local-prod que o dono possa ter de pé, e o volume criado aqui morre no `down -v` daqui.

import { spawnSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const COMPOSE_FILE = "docker-compose.prod.yml";
const COMPOSE_PROJECT_NAME = "erp-o6r-smoke";
const SERVICE = "api";

// Loopback CRAVADO: não existe variável que aponte este script para outro host (veto secops #7).
const HOST = "127.0.0.1";
const PORT = readPort();
const BASE = `http://${HOST}:${PORT}`;

// O único segredo aceito. Qualquer outro valor aborta antes de subir qualquer coisa.
const PLACEHOLDER_SECRET_PATTERN = /^local-prod-validation-[a-z0-9-]*not-a-secret$/;

const READY_TIMEOUT_MS = numberEnv("SMOKE_READY_TIMEOUT_MS", 240_000);
const WORKER_TIMEOUT_MS = numberEnv("SMOKE_WORKER_TIMEOUT_MS", 120_000);
const POLL_INTERVAL_MS = numberEnv("SMOKE_POLL_INTERVAL_MS", 3_000);

// Marcador da organização de validação. Sem dado real: nome sintético + uuid da rodada.
const ORG_NAME = `Validacao Local-Prod O6R ${randomUUID()}`;

// §2.8 — o que NUNCA pode aparecer no corpo de um endpoint público de saúde.
const FORBIDDEN_IN_HEALTH_BODY = [
  "instanceId",
  "erp:jobs",
  "DATABASE_URL",
  "REDIS_URL",
  "postgresql://",
  "postgres://",
  "redis://",
  "password",
  "secret",
];

let stepIndex = 0;

async function step(name, fn) {
  stepIndex += 1;
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`[smoke-compose] OK   ${stepIndex}. ${name} (${Date.now() - start}ms)`);
    return result;
  } catch (error) {
    console.error(`[smoke-compose] FAIL ${stepIndex}. ${name} (${Date.now() - start}ms)`);
    console.error(`[smoke-compose]      ${redact(error.message)}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------------------------

function readPort() {
  const raw = (process.env.API_PORT ?? "3101").trim();
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 65_535) {
    console.error(`[smoke-compose] API_PORT inválida: "${raw}"`);
    process.exit(1);
  }
  return value;
}

function numberEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Remove de qualquer texto o que puder carregar credencial/host antes de ele virar log.
 * Um erro do Prisma, por exemplo, cita a connection string inteira — inclusive usuário e senha.
 */
function redact(text) {
  return String(text ?? "")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`]+/gi, "<uri-redigida>")
    .replace(/local-prod-validation-[a-z0-9-]*not-a-secret/gi, "<placeholder-redigido>");
}

function composeEnv() {
  return {
    ...process.env,
    COMPOSE_PROJECT_NAME,
    API_PORT: String(PORT),
    // Sem TTY o compose não tenta desenhar barra de progresso (log ilegível em CI).
    COMPOSE_PROGRESS: process.env.COMPOSE_PROGRESS ?? "plain",
  };
}

/** `docker` com a saída HERDADA (build/up/down: log longo e útil, sem valor de env). */
function dockerInherit(args) {
  const result = spawnSync("docker", args, {
    cwd: REPO_ROOT,
    env: composeEnv(),
    stdio: "inherit",
  });
  if (result.error) throw new Error(`falha ao invocar o docker: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`\`docker ${args.slice(0, 4).join(" ")}…\` saiu com código ${result.status}`);
  }
}

/** `docker` com a saída CAPTURADA e REDIGIDA (exec: roda código nosso, pode citar a DATABASE_URL). */
function dockerCapture(args, { allowFailure = false } = {}) {
  const result = spawnSync("docker", args, {
    cwd: REPO_ROOT,
    env: composeEnv(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new Error(`falha ao invocar o docker: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    const detail = redact(`${result.stderr ?? ""}`.trim().split("\n").slice(0, 5).join(" | "));
    throw new Error(`\`docker ${args.slice(0, 4).join(" ")}…\` saiu com código ${result.status}: ${detail}`);
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * `SMOKE_COMPOSE_EXTRA_FILE` empilha um segundo `-f` DEPOIS do compose de produção. Existe para a
 * PROVA NEGATIVA — "este smoke falha mesmo com o worker desligado?" só é uma afirmação verificável se
 * alguém conseguir desligar o worker e rodá-lo. Ele não afrouxa trava nenhuma: a trava de segurança
 * roda sobre a configuração RESOLVIDA (`docker compose config`), então o alvo continua tendo de
 * declarar `NODE_ENV=production` e o `JWT_SECRET` placeholder de validação local, e o destino HTTP
 * continua cravado em loopback.
 */
function compose(...args) {
  const extra = process.env.SMOKE_COMPOSE_EXTRA_FILE?.trim();

  return [
    "compose",
    "-f",
    path.join(REPO_ROOT, COMPOSE_FILE),
    ...(extra ? ["-f", extra] : []),
    ...args,
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * O timeout usa `AbortController` + `setTimeout` REFERENCIADO, e não `AbortSignal.timeout()`.
 * Motivo medido nesta máquina: com o timer não-referenciado, uma requisição feita nos primeiros
 * instantes após o `up` (enquanto o proxy de porta do Docker Desktop ainda estava se ligando) deixou
 * o laço de eventos sem nada referenciado, e o Node encerrou com **código 13**
 * (`ERR_UNFINISHED_TOP_LEVEL_AWAIT`): sem veredito, sem `finally`, e o stack de pé. Um timer
 * referenciado torna esse estado inalcançável — enquanto houver requisição pendente, há trabalho.
 */
async function fetchJson(pathname, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${BASE}${pathname}`, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      // corpo não-JSON: `body` fica null e o texto cru continua disponível para a asserção
    }
    return { status: response.status, body, text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Repete `probe` até ela retornar sem lançar. `probe` DEVE lançar enquanto a condição não valer —
 * é isso que impede um smoke de aceitar "respondeu alguma coisa" como sucesso.
 */
async function pollUntil(description, probe, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastReason = "sem tentativa";
  let attempts = 0;

  while (Date.now() < deadline) {
    attempts += 1;
    try {
      return await probe();
    } catch (error) {
      lastReason = error.message;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `${description}: expirou após ${Math.round(timeoutMs / 1_000)}s e ${attempts} tentativa(s). ` +
      `Último motivo: ${lastReason}`,
  );
}

function assertNoSecretsInBody(label, text) {
  const hit = FORBIDDEN_IN_HEALTH_BODY.find((needle) =>
    text.toLowerCase().includes(needle.toLowerCase()),
  );
  if (hit) {
    throw new Error(`§2.8: o corpo de ${label} contém o termo proibido "${hit}"`);
  }
}

// ---------------------------------------------------------------------------------------------
// Token — assinado com o PLACEHOLDER do compose (jamais impresso)
// ---------------------------------------------------------------------------------------------

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

/**
 * Access token no MESMO formato de `src/modules/auth/services/jwt.service.ts` (HS256, issuer
 * `erp-techsolutions`, audience `erp-techsolutions-api`). Escrito à mão com `node:crypto` porque
 * este script não pode importar `jose` (é .mjs solto, sem build) nem ganhar dependência (§C7).
 */
function signAccessToken(secret) {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      // Organização nula: o token é de PLATAFORMA, não fala por nenhuma organização real (§2.8).
      tenant_id: "00000000-0000-0000-0000-000000000000",
      email: "smoke@local-prod-validation.invalid",
      roles: ["platform_admin"],
      type: "access",
      sub: randomUUID(),
      iat: issuedAt,
      exp: issuedAt + 600,
      iss: "erp-techsolutions",
      aud: "erp-techsolutions-api",
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");

  return `${signingInput}.${signature}`;
}

// ---------------------------------------------------------------------------------------------
// A escrita da organização
// ---------------------------------------------------------------------------------------------

// Roda DENTRO do contêiner da api, com o mesmo NODE_ENV/env do processo servidor, pelo MESMO
// agregado que o gate G1 governa (`createCoreSaasService`). Hoje não existe rota HTTP que crie
// organização — dizer que "o smoke grava por HTTP" seria falso, então ele grava por onde a
// aplicação de fato grava. A LEITURA, essa sim, é HTTP contra o processo servidor reiniciado.
const WRITE_SCRIPT = [
  "const { pathToFileURL } = await import('node:url');",
  "const target = pathToFileURL(process.cwd() + '/dist/modules/core-saas/core-saas-runtime.js').href;",
  "try {",
  "  const runtime = await import(target);",
  "  const service = await runtime.createCoreSaasService();",
  "  const tenant = await service.createTenant({ name: process.env.SMOKE_ORG_NAME });",
  "  await new Promise((resolve) => process.stdout.write('SMOKE_ORG_ID=' + tenant.id + '\\n', resolve));",
  "  process.exit(0);",
  "} catch (error) {",
  // Só o NOME do erro: a mensagem do Prisma cita a connection string inteira.
  "  await new Promise((resolve) => process.stdout.write('SMOKE_WRITE_FAILED=' + (error && error.name || 'Error') + '\\n', resolve));",
  "  process.exit(1);",
  "}",
].join("\n");

// ---------------------------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------------------------

let broughtUp = false;
let teardownDone = false;

/**
 * §C5 — derruba o stack SEMPRE, inclusive em falha, e SEMPRE com `-v`: o volume do Postgres do smoke
 * não pode sobreviver à rodada (disco escasso, e um banco sujo envenenaria a próxima).
 *
 * Roda também num handler de `exit` — e é por isso que todo comando aqui é `spawnSync`. Um teardown
 * assíncrono só funcionaria no caminho feliz; este funciona mesmo quando o processo morre por um
 * caminho que não passa pelo `finally` (foi o que aconteceu com o exit 13 descrito em `fetchJson`).
 * Deixar contêiner de pé numa máquina com disco escasso é um estrago que o script não pode causar.
 */
function teardown() {
  if (!broughtUp || teardownDone) return;
  teardownDone = true;

  try {
    dockerInherit(compose("down", "-v", "--remove-orphans"));
  } catch (error) {
    console.error(`[smoke-compose] AVISO — falha ao derrubar o stack: ${redact(error.message)}`);
    process.exitCode = 1;
  }
}

process.on("exit", teardown);

try {
  const jwtSecret = await step(
    "trava de segurança — o alvo é o compose de VALIDAÇÃO LOCAL (veto secops #7)",
    async () => {
      // Quem parseia o YAML é o próprio compose: nada de leitor caseiro divergindo do que sobe.
      const { stdout } = dockerCapture(compose("config", "--format", "json"));
      let config;
      try {
        config = JSON.parse(stdout);
      } catch {
        throw new Error("não consegui ler `docker compose config --format json` — tratando como falha");
      }

      const environment = config?.services?.[SERVICE]?.environment ?? {};
      const secret = String(environment.JWT_SECRET ?? "");

      if (!PLACEHOLDER_SECRET_PATTERN.test(secret)) {
        // O valor NÃO é impresso — nem quando é rejeitado.
        throw new Error(
          "o JWT_SECRET do alvo não é o placeholder rotulado de validação local " +
            "(local-prod-validation-…-not-a-secret). Este script assina token e RECUSA rodar contra " +
            "qualquer coisa que não seja o stack local descartável.",
        );
      }
      if (String(environment.NODE_ENV ?? "") !== "production") {
        throw new Error("o serviço alvo não declara NODE_ENV=production — não é o compose de produção");
      }

      return secret;
    },
  );

  const token = signAccessToken(jwtSecret);

  await step(`sobe o stack (${COMPOSE_FILE}, projeto ${COMPOSE_PROJECT_NAME}, porta ${PORT})`, async () => {
    const shouldBuild = (process.env.SMOKE_COMPOSE_BUILD ?? (process.env.API_IMAGE ? "0" : "1")) === "1";
    // Marcado ANTES de subir, e não depois: um `up` que falha no meio (migrate quebrado, porta ocupada)
    // já deixou rede, volume e contêineres criados. Marcar só no sucesso deixaria esse lixo para trás
    // exatamente no caminho de erro — que é quando o teardown mais importa.
    broughtUp = true;
    // `up ... api` sobe api + postgres + redis + migrate (depends_on) e NÃO sobe o `web`: o smoke é
    // do backend, e buildar o frontend aqui custaria minutos sem provar nada deste bloco.
    dockerInherit(compose("up", "-d", ...(shouldBuild ? ["--build"] : []), SERVICE));
  });

  await step("readiness responde 200 E traz o bloco do worker no corpo", async () =>
    pollUntil(
      "readiness",
      async () => {
        const { status, body, text } = await fetchJson("/api/v1/health/ready");
        if (status !== 200) throw new Error(`esperado 200, veio ${status}`);
        if (body?.status !== "ready") throw new Error(`esperado status=ready, veio ${body?.status}`);
        // Q2: o worker é REPORTADO no readiness. Sem este bloco, a falha de jobs ficaria invisível
        // para quem só olha a readiness — e a asserção de status=ready passaria sozinha.
        const worker = body?.checks?.worker;
        if (!worker || typeof worker.status !== "string") {
          throw new Error("readiness sem `checks.worker.status` no corpo");
        }
        if (!("ageSeconds" in worker)) {
          throw new Error("readiness sem `checks.worker.ageSeconds` no corpo");
        }
        assertNoSecretsInBody("/health/ready", text);
        return worker;
      },
      READY_TIMEOUT_MS,
    ),
  );

  await step("worker do processo: /health/worker diz `up` NO CORPO", async () =>
    assertWorkerUp("boot"),
  );

  const containerBefore = await step("identidade do contêiner ANTES do restart", () => inspectContainer());

  const organizationId = await step("grava uma organização pelo agregado core-saas", async () => {
    // `allowFailure`: a escrita reporta o motivo pelo STDOUT (só o nome do erro), e é esse motivo que
    // queremos no log — não o código de saída seco do `docker exec`.
    const { stdout } = dockerCapture(
      compose(
        "exec",
        "-T",
        "-e",
        `SMOKE_ORG_NAME=${ORG_NAME}`,
        SERVICE,
        "node",
        "--input-type=module",
        "-e",
        WRITE_SCRIPT,
      ),
      { allowFailure: true },
    );
    const failure = /SMOKE_WRITE_FAILED=(\w+)/.exec(stdout);
    if (failure) {
      throw new Error(`a escrita da organização falhou dentro do contêiner (${failure[1]})`);
    }

    const match = /SMOKE_ORG_ID=([0-9a-fA-F-]{36})/.exec(stdout);
    if (!match) {
      throw new Error(`a escrita não devolveu o id da organização: ${redact(stdout).slice(0, 200)}`);
    }
    // O id NÃO é impresso (§2.8: identificador de organização não vai para log).
    return match[1];
  });

  await step("a organização é legível ANTES do restart (o caminho de leitura funciona)", async () => {
    const detail = await readOrganization(organizationId, token);
    if (detail.name !== ORG_NAME) {
      throw new Error(`nome divergente na leitura pré-restart`);
    }
  });

  await step("reinicia o serviço da api", async () => {
    dockerInherit(compose("restart", SERVICE));
  });

  await step("o processo é OUTRO (o restart aconteceu de verdade)", async () => {
    const containerAfter = await pollUntil(
      "identidade do contêiner",
      () => {
        const current = inspectContainer();
        if (current.startedAt === containerBefore.startedAt) {
          throw new Error("o contêiner ainda declara o mesmo instante de início");
        }
        return current;
      },
      60_000,
    );
    if (!containerAfter.startedAt) {
      throw new Error("não consegui ler o instante de início do contêiner — tratando como falha");
    }
  });

  await step("readiness volta a 200 depois do restart", async () =>
    pollUntil(
      "readiness pós-restart",
      async () => {
        const { status, body } = await fetchJson("/api/v1/health/ready");
        if (status !== 200) throw new Error(`esperado 200, veio ${status}`);
        if (body?.status !== "ready") throw new Error(`esperado status=ready, veio ${body?.status}`);
        return body;
      },
      READY_TIMEOUT_MS,
    ),
  );

  // A prova da linha que liga o worker ao boot: ela roda no boot, TODA vez — não só na primeira.
  await step("o worker sobe de novo no processo NOVO (a linha do boot é exercitada)", async () =>
    assertWorkerUp("restart"),
  );

  await step("a organização SOBREVIVEU ao restart (Ω6R-DAT-001)", async () => {
    const detail = await readOrganization(organizationId, token);
    if (detail.name !== ORG_NAME) {
      throw new Error("a organização lida depois do restart tem outro nome");
    }
    if (detail.id !== organizationId) {
      throw new Error("a organização lida depois do restart tem outro id");
    }
  });

  console.log("[smoke-compose] VERDE — worker de pé no boot e no restart; organização gravada sobreviveu.");
  process.exitCode = 0;
} catch (error) {
  console.error(`[smoke-compose] VERMELHO — ${redact(error.message)}`);
  process.exitCode = 1;
} finally {
  teardown();
}

// ---------------------------------------------------------------------------------------------
// Asserções compostas
// ---------------------------------------------------------------------------------------------

/**
 * SÓ `up` é aceito, e `up` é lido NO CORPO (veto ci-doutor #2). `not_expected` — o estado de um
 * processo que subiu sem worker — responde HTTP 200: um smoke que olhasse só o status HTTP daria
 * verde exatamente no defeito Ω6R-DIN-006 que este bloco existe para fechar.
 */
async function assertWorkerUp(momento) {
  return pollUntil(
    `/health/worker (${momento})`,
    async () => {
      const { status, body, text } = await fetchJson("/api/v1/health/worker");
      if (body?.status !== "up") {
        throw new Error(`corpo diz status="${body?.status ?? "?"}" (HTTP ${status}) — só "up" é aceito`);
      }
      if (status !== 200) throw new Error(`corpo diz "up" mas o HTTP veio ${status}`);
      if (body?.expected !== "local") throw new Error(`esperado expected="local", veio "${body?.expected}"`);
      if (body?.measures !== "worker_loop_tick") {
        throw new Error(`o corpo não declara mais o que mede (measures="${body?.measures}")`);
      }
      if (typeof body?.ageSeconds !== "number") {
        throw new Error("corpo `up` sem `ageSeconds` numérico");
      }
      assertNoSecretsInBody("/health/worker", text);
      return body;
    },
    WORKER_TIMEOUT_MS,
  );
}

async function readOrganization(organizationId, token) {
  const { status, body } = await fetchJson(`/api/v1/platform/tenants/${organizationId}/detail`, {
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });

  if (status === 404) {
    throw new Error(
      "a organização NÃO existe mais: o agregado core-saas não está em Postgres — é exatamente o " +
        "dano do Ω6R-DAT-001 (identidade, organizações e autorização perdidas no restart)",
    );
  }
  if (status !== 200) throw new Error(`esperado 200, veio ${status}`);
  if (!body?.data?.id) throw new Error("resposta sem data.id");

  return body.data;
}

function inspectContainer() {
  const { stdout } = dockerCapture(compose("ps", "-q", SERVICE));
  const containerId = stdout.trim().split(/\s+/)[0];
  if (!containerId) throw new Error("o serviço da api não tem contêiner de pé");

  const inspected = dockerCapture(["inspect", "-f", "{{.State.StartedAt}}", containerId]);
  const startedAt = inspected.stdout.trim();
  if (!startedAt) throw new Error("não consegui ler o instante de início do contêiner");

  return { containerId, startedAt };
}
