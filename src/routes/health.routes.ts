import { Router } from "express";

import { getRedisClient } from "../infra/redis/redis.client.js";

export const healthRouter = Router();

const SERVICE_NAME = "erp-techsolutions-api";

// Metadados de build injetados pelo Dockerfile (ARG/ENV). Sem segredo. Fallback p/ dev.
function buildInfo() {
  return {
    version: process.env.APP_VERSION?.trim() || "0.0.0-dev",
    commit: process.env.GIT_COMMIT?.trim() || "unknown",
  };
}

// Liveness — o processo está de pé e servindo. NÃO faz I/O de dependência (rápido, estável).
// É o probe de liveness do orquestrador e mantém o contrato HTTP histórico (status "ok").
healthRouter.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: SERVICE_NAME,
    ...buildInfo(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness — checagem PROFUNDA real: faz ping em Postgres e Redis. 200 se todos "up";
// 503 se qualquer dependência estiver "down". Usada pelo smoke pós-deploy e pelo uptime check.
// Nunca expõe dado sensível (sem URL/credencial/host — só up/down + latência).
healthRouter.get("/health/ready", async (_request, response) => {
  const [postgres, redis, worker] = await Promise.all([checkPostgres(), checkRedis(), checkWorker()]);
  const checks = { postgres, redis, worker };
  // Ω6R-DIN-006 (Q2) — o worker é REPORTADO, nunca CONTADO. O veredito 200/503 continua sendo só
  // Postgres ∧ Redis. Motivo concreto: `fly.production.toml:55-61` tira do balanceamento quem
  // responde 503, e `:40-45` roda com `min_machines_running=1` — somar o worker aqui converteria
  // "os jobs pararam" em "a API caiu inteira". A falha do worker aparece no smoke de deploy, no
  // cron de uptime e em `GET /health/worker` sob demanda.
  const ready = postgres.status === "up" && redis.status === "up";

  response.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    service: SERVICE_NAME,
    ...buildInfo(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Ω6R-DIN-006 — saúde do LAÇO do worker de jobs, respondida a partir do ESTADO DESTE PROCESSO e
// nunca do Redis (veto secops #3): a pergunta é "este processo está girando o laço?", e consultar
// o Redis responderia sobre qualquer processo — ou sobre nenhum, com o Redis fora.
//
// O que este endpoint prova: o laço completou um tick recentemente, INCLUINDO a ida à fila.
// O que ele NÃO prova: que os jobs terminam, nem que um handler travou (Ω6R-PERF-001 → B-O6R-08).
//
// Corpo MÍNIMO de propósito (§2.8): sem version/commit, sem instante do último sinal, sem
// identidade de instância, sem host, sem profundidade de fila, sem nome de job.
healthRouter.get("/health/worker", async (_request, response) => {
  const { getWorkerHealthReport, WORKER_HEALTH_MEASURE } = await import("../infra/jobs/job.heartbeat.js");
  const report = getWorkerHealthReport();

  response.status(report.httpStatus).json({
    status: report.status,
    expected: report.expected,
    service: SERVICE_NAME,
    ageSeconds: report.ageSeconds,
    measures: WORKER_HEALTH_MEASURE,
    timestamp: new Date().toISOString(),
  });
});

type CheckResult = { readonly status: "up" | "down"; readonly latencyMs: number };

type WorkerCheckResult = { readonly status: string; readonly ageSeconds: number | null };

async function withTiming(probe: () => Promise<void>): Promise<CheckResult> {
  const start = process.hrtime.bigint();
  try {
    await probe();
    return { status: "up", latencyMs: elapsedMs(start) };
  } catch {
    // Motivo do erro NÃO é exposto (evita vazar host/credencial). Só up/down.
    return { status: "down", latencyMs: elapsedMs(start) };
  }
}

function elapsedMs(start: bigint): number {
  return Number((process.hrtime.bigint() - start) / 1_000_000n);
}

async function checkPostgres(): Promise<CheckResult> {
  return withTiming(async () => {
    const { prisma } = await import("../database/prisma.js");
    await withTimeout(prisma.$queryRawUnsafe("SELECT 1"), 3_000);
  });
}

// Leitura do estado do processo — sem I/O, sem Redis. Nunca lança: readiness não pode cair porque
// a leitura do worker falhou.
async function checkWorker(): Promise<WorkerCheckResult> {
  try {
    const { getWorkerHealthReport } = await import("../infra/jobs/job.heartbeat.js");
    const report = getWorkerHealthReport();

    return { status: report.status, ageSeconds: report.ageSeconds };
  } catch {
    return { status: "unknown", ageSeconds: null };
  }
}

async function checkRedis(): Promise<CheckResult> {
  return withTiming(async () => {
    const ok = await withTimeout(getRedisClient().ping(), 3_000);
    if (!ok) throw new Error("redis_ping_failed");
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("health_check_timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
