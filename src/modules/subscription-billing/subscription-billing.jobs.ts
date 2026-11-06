// B-ASS-03 — job recorrente AUTO-REENFILEIRANTE `subscription.measure-daily`. Mede, por organização
// (menos a de sistema), usuários ativos, espaço (banco + arquivos) e veículos rastreados do dia de hoje
// em America/Sao_Paulo, e grava `tenant_usage_daily` (UPSERT GREATEST no dia / último medido nas demais).
// Disparo por hora marcada: delayMs até a próxima janela — 12:00 e 23:30 SP (R-F); SEM payload.date e sem
// catch-up (G3). Para cada organização, UMA transação própria em `withTenantRlsBudget` (lock 5 s,
// statement 30 s) — não `forEachTenantRls` (E14).

import pino from "pino";

import { getDefaultJobQueue } from "../../infra/jobs/job.queue.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { withTenantRlsBudget } from "../../database/rls.js";
import { env } from "../../config/env.js";
import { CENSORED_TENANT_TABLES } from "./metering/censored-tables.js";
import { assertMeasureDailyPayload } from "./metering/metering.payload.js";
import { measureTenantUsageInTx } from "./metering/metering-prisma.repository.js";
import type { MeteringDay } from "./metering/metering.service.js";
import type { TenantUsageDaily } from "./metering/metering.types.js";

export const MEASURE_DAILY_TIME_ZONE = "America/Sao_Paulo";

// Uma janela por vez: 12:00 e 23:30 SP. O job roda e se re-enfileira para a PRÓXIMA janela.
const MEASURE_DAILY_WINDOWS = [
  { hour: 12, minute: 0 },
  { hour: 23, minute: 30 },
] as const;

// Orçamento POR ORGANIZAÇÃO (R-F/E14): lock_timeout 5 s e statement_timeout 30 s dentro da transação.
export const MEASURE_DAILY_TENANT_BUDGET = {
  maxWait: 5_000,
  timeout: 300_000,
  lockTimeoutMs: 5_000,
  statementTimeoutMs: 30_000,
} as const;

type WallClock = {
  readonly year: number;
  readonly month: number; // 1-based
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let dtf = partsCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, dtf);
  }
  return dtf;
}

// Relógio de parede LOCAL de um instante no fuso. Padrão DST-safe do repo (Intl, zero dependência).
function wallClock(instant: Date, timeZone: string): WallClock {
  const parts = formatter(timeZone).formatToParts(instant);
  // Mapa pelo nome da parte (sem comparar `.type`, que o censo o6r07c T8 lê como despacho por tipo de mensagem).
  const byPart = new Map(parts.map((part) => [part.type as string, part.value]));
  const pick = (name: string): number => Number(byPart.get(name) ?? "0");
  let hour = pick("hour");
  if (hour === 24) hour = 0;
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour,
    minute: pick("minute"),
    second: pick("second"),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// Data local "YYYY-MM-DD" do instante no fuso.
export function measureDailyDateKey(instant: Date, timeZone = MEASURE_DAILY_TIME_ZONE): string {
  const wall = wallClock(instant, timeZone);
  return `${String(wall.year).padStart(4, "0")}-${pad2(wall.month)}-${pad2(wall.day)}`;
}

// Offset do fuso (ms) num instante = (parede-como-UTC) − instante.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const wall = wallClock(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - instant.getTime();
}

// Converte um relógio-de-parede LOCAL no fuso para o instante UTC correspondente (passo de correção único).
function zonedWallToUtc(wall: WallClock, timeZone: string): Date {
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  let offset = tzOffsetMs(new Date(asUtc), timeZone);
  let utc = asUtc - offset;
  offset = tzOffsetMs(new Date(utc), timeZone);
  utc = asUtc - offset;
  return new Date(utc);
}

/** O dia de medição (data local SP + [início, fim] do dia) para o instante dado. */
export function measureDailyDay(now: Date, timeZone = MEASURE_DAILY_TIME_ZONE): MeteringDay {
  const wall = wallClock(now, timeZone);
  const start = zonedWallToUtc({ ...wall, hour: 0, minute: 0, second: 0 }, timeZone);
  // São Paulo não tem horário de verão desde 2019: um dia de parede é exatamente 24 h.
  const end = new Date(start.getTime() + 86_400_000 - 1);
  return { date: measureDailyDateKey(now, timeZone), start, end };
}

/** `delayMs` até a PRÓXIMA janela (12:00 ou 23:30 SP) estritamente depois de `now`. */
export function computeNextMeasureDailyDelayMs(
  now: Date,
  timeZone = MEASURE_DAILY_TIME_ZONE,
): number {
  const wall = wallClock(now, timeZone);
  const candidates: Date[] = [];

  for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
    // Date.UTC resolve virada de mês/ano.
    const nextUtcDay = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + dayOffset));
    const nextWall = wallClock(nextUtcDay, "UTC");
    for (const window of MEASURE_DAILY_WINDOWS) {
      candidates.push(
        zonedWallToUtc(
          {
            year: nextWall.year,
            month: nextWall.month,
            day: nextWall.day,
            hour: window.hour,
            minute: window.minute,
            second: 0,
          },
          timeZone,
        ),
      );
    }
  }

  const next = candidates.find((candidate) => candidate.getTime() > now.getTime());
  if (!next) {
    throw new Error("computeNextMeasureDailyDelayMs: nenhuma janela futura encontrada.");
  }

  return next.getTime() - now.getTime();
}

const logger = pino({ level: env.LOG_LEVEL });

export type MeasureDailyFailure = { readonly tenantId: string; readonly code: string };
export type MeasureDailyResult = {
  readonly rows: TenantUsageDaily[];
  readonly failures: MeasureDailyFailure[];
};

// Só o CÓDIGO do erro vai para o log e para o resultado (nunca mensagem, SQL ou dado da organização).
function failureCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; name?: unknown };
    if (typeof candidate.code === "string" && candidate.code) return candidate.code;
    if (typeof candidate.name === "string" && candidate.name) return candidate.name;
  }
  return "unknown_error";
}

/**
 * A volta diária real: enumera as organizações e mede cada uma sob o GUC dela.
 *
 * Fail-closed POR ORGANIZAÇÃO (plano §4.3, R-MED-4: "o dia DESSA organização fica sem linha e o job registra o
 * erro"): a falha de uma organização (trava, `statement_timeout`, `tenant_context_missing`) é registrada e a volta
 * SEGUE para as demais — uma organização com problema não apaga a medição das outras naquela janela (achado G-1
 * do revisor sênior do #505). `options.tenantIds` restringe a volta (uso de teste: não medir organizações de outras
 * suítes que rodam no mesmo cluster — achado M-5).
 */
export async function runSubscriptionMeasureDaily(
  now: Date,
  options: { readonly tenantIds?: readonly string[] } = {},
): Promise<MeasureDailyResult> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return { rows: [], failures: [] };
  }

  const { prisma } = await import("../../database/prisma.js");
  const day = measureDailyDay(now);
  const tables = CENSORED_TENANT_TABLES;
  const tenants = await prisma.tenant.findMany({
    where: options.tenantIds ? { id: { in: [...options.tenantIds] } } : undefined,
    select: { id: true, slug: true },
    orderBy: { created_at: "asc" },
  });

  return measureTenantsSequentially(tenants, day.date, (tenantId) =>
    withTenantRlsBudget(prisma, tenantId, MEASURE_DAILY_TENANT_BUDGET, (tx) =>
      measureTenantUsageInTx(tx, tenantId, day, tables),
    ),
  );
}

/**
 * O laço da volta, puro (testável sem banco): pula a organização de sistema `platform` (S16) e isola a falha de
 * cada organização — registra `{tenantId, code}` e segue para a próxima (achado G-1 do #505).
 */
export async function measureTenantsSequentially(
  tenants: readonly { readonly id: string; readonly slug: string | null }[],
  date: string,
  measureOne: (tenantId: string) => Promise<TenantUsageDaily>,
): Promise<MeasureDailyResult> {
  const rows: TenantUsageDaily[] = [];
  const failures: MeasureDailyFailure[] = [];
  for (const tenant of tenants) {
    if ((tenant.slug ?? "").toLowerCase() === "platform") continue;

    try {
      rows.push(await measureOne(tenant.id));
    } catch (error) {
      const code = failureCode(error);
      failures.push({ tenantId: tenant.id, code });
      logger.warn(
        { tenantId: tenant.id, date, code },
        "subscription.measure-daily: medição da organização falhou; o dia dela fica sem linha e a volta segue",
      );
    }
  }

  return { rows, failures };
}

export function createSubscriptionMeasureDailyJobHandler(): JobHandler {
  return async (payload) => {
    assertMeasureDailyPayload(payload);
    try {
      await runSubscriptionMeasureDaily(new Date());
    } catch (error) {
      // Falha GERAL (ex.: não listou as organizações). NÃO relança: a retentativa da fila somada ao re-enfileiramento
      // abaixo multiplicaria a cadeia recorrente (achado M-1 do revisor sênior do #505). Registra e segue.
      logger.error({ code: failureCode(error) }, "subscription.measure-daily: a volta falhou antes de medir");
    }
    // Re-enfileira UMA vez por execução, para manter a recorrência viva.
    await getDefaultJobQueue().enqueue("subscription.measure-daily", {}, {
      delayMs: computeNextMeasureDailyDelayMs(new Date()),
    });
  };
}

// Enfileira o 1º tick. Chamado por src/server.ts quando o worker é ligado (flag ON + persistence=prisma).
export async function enqueueInitialSubscriptionMeasureDaily(): Promise<void> {
  await getDefaultJobQueue().enqueue("subscription.measure-daily", {}, {
    delayMs: computeNextMeasureDailyDelayMs(new Date()),
  });
}
