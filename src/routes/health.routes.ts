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
  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const checks = { postgres, redis };
  const ready = postgres.status === "up" && redis.status === "up";

  response.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    service: SERVICE_NAME,
    ...buildInfo(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

type CheckResult = { readonly status: "up" | "down"; readonly latencyMs: number };

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
