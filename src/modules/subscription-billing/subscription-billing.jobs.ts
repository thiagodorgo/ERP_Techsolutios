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
  return computeNextWindowDelayMs(now, MEASURE_DAILY_WINDOWS, timeZone);
}

function computeNextWindowDelayMs(
  now: Date,
  windows: readonly { readonly hour: number; readonly minute: number }[],
  timeZone: string,
): number {
  const wall = wallClock(now, timeZone);
  const candidates: Date[] = [];

  for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
    // Date.UTC resolve virada de mês/ano.
    const nextUtcDay = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + dayOffset));
    const nextWall = wallClock(nextUtcDay, "UTC");
    for (const window of windows) {
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
    throw new Error("computeNextWindowDelayMs: nenhuma janela futura encontrada.");
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

// ------------------------------------------------------------------------------------------------------------------
// B-ASS-04 · F10 — job recorrente AUTO-REENFILEIRANTE `subscription.close-statements`. Fecha o mês ANTERIOR (data
// local SP) de cada organização (menos a de sistema). Hora marcada: 02:00 SP — a primeira janela do dia 1 vem depois
// da medição das 23:30 do último dia (G3) — e de novo a cada 6 h (08:00, 14:00, 20:00), para pegar a organização
// que falhou na janela anterior. Idempotente pelo serviço: demonstrativo `closed`/`paid`/`cancelled` volta como
// `already_closed` sem tocar a linha; `reopened` é PULADO (só o fechamento manual refecha — G4, T-ST-45).
// Leitura do dev, declarada: uma linha `open` do mês anterior (nasce quando um crédito é aplicado no mês) É fechada
// pelo job — deixá-la de fora deixaria o mês sem cobrança até alguém fechar à mão.

const CLOSE_STATEMENTS_WINDOWS = [
  { hour: 2, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 20, minute: 0 },
] as const;

/** `delayMs` até a PRÓXIMA janela de fechamento (02:00, 08:00, 14:00 ou 20:00 SP) estritamente depois de `now`. */
export function computeNextCloseStatementsDelayMs(now: Date, timeZone = MEASURE_DAILY_TIME_ZONE): number {
  return computeNextWindowDelayMs(now, CLOSE_STATEMENTS_WINDOWS, timeZone);
}

/** O período (`YYYY-MM`) que o job fecha: o mês anterior ao da data local SP de `now`. */
export function closeStatementsPeriod(now: Date, timeZone = MEASURE_DAILY_TIME_ZONE): string {
  const wall = wallClock(now, timeZone);
  return wall.month === 1 ? `${wall.year - 1}-12` : `${wall.year}-${pad2(wall.month - 1)}`;
}

export type CloseStatementsOutcome = "closed" | "already_closed" | "skipped";
export type CloseStatementsResult = {
  readonly counts: Readonly<Record<CloseStatementsOutcome, number>>;
  readonly failures: MeasureDailyFailure[];
};

/**
 * O laço do fechamento, puro (testável sem banco): pula a organização de sistema e isola a falha de cada uma — uma
 * organização com problema não impede o fechamento das outras (mesma regra do G-1 do #505).
 */
export async function closeTenantsSequentially(
  tenants: readonly { readonly id: string; readonly slug: string | null }[],
  period: string,
  closeOne: (tenantId: string) => Promise<CloseStatementsOutcome>,
): Promise<CloseStatementsResult> {
  const counts: Record<CloseStatementsOutcome, number> = { closed: 0, already_closed: 0, skipped: 0 };
  const failures: MeasureDailyFailure[] = [];
  for (const tenant of tenants) {
    if ((tenant.slug ?? "").toLowerCase() === "platform") continue;
    try {
      counts[await closeOne(tenant.id)] += 1;
    } catch (error) {
      const code = failureCode(error);
      failures.push({ tenantId: tenant.id, code });
      logger.warn(
        { tenantId: tenant.id, period, code },
        "subscription.close-statements: fechamento da organização falhou; a volta segue e a próxima janela tenta de novo",
      );
    }
  }
  return { counts, failures };
}

export async function runSubscriptionCloseStatements(
  now: Date,
  options: { readonly tenantIds?: readonly string[] } = {},
): Promise<CloseStatementsResult> {
  const empty: CloseStatementsResult = { counts: { closed: 0, already_closed: 0, skipped: 0 }, failures: [] };
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") return empty;

  const [{ prisma }, { createDefaultStatementRuntime }] = await Promise.all([
    import("../../database/prisma.js"),
    import("./statements/statement.factory.js"),
  ]);
  const { service } = await createDefaultStatementRuntime();
  const period = closeStatementsPeriod(now);
  const tenants = await prisma.tenant.findMany({
    where: options.tenantIds ? { id: { in: [...options.tenantIds] } } : undefined,
    select: { id: true, slug: true },
    orderBy: { created_at: "asc" },
  });

  return closeTenantsSequentially(tenants, period, async (tenantId) => {
    const outcome = await service.close({ tenantId, period, now, actorId: null, source: "job" });
    return outcome.kind;
  });
}

export function createSubscriptionCloseStatementsJobHandler(): JobHandler {
  return async (payload) => {
    assertMeasureDailyPayload(payload);
    try {
      const result = await runSubscriptionCloseStatements(new Date());
      logger.info({ ...result.counts, failures: result.failures.length }, "subscription.close-statements: volta concluída");
    } catch (error) {
      // Falha GERAL: registra e NÃO relança (a retentativa somada ao re-enfileiramento multiplicaria a cadeia — M-1).
      logger.error({ code: failureCode(error) }, "subscription.close-statements: a volta falhou antes de fechar");
    }
    await getDefaultJobQueue().enqueue("subscription.close-statements", {}, {
      delayMs: computeNextCloseStatementsDelayMs(new Date()),
    });
  };
}

export async function enqueueInitialSubscriptionCloseStatements(): Promise<void> {
  await getDefaultJobQueue().enqueue("subscription.close-statements", {}, {
    delayMs: computeNextCloseStatementsDelayMs(new Date()),
  });
}

// ------------------------------------------------------------------------------------------------------------------
// B-ASS-08b · (c) — os 4 jobs do CANAL de cobrança (plano §3.8). SÓ rodam com BILLING_PROVIDERS_ENABLED=true: com o canal
// desligado o handler não faz nada e NÃO re-enfileira (a cadeia para; o bootstrap nem a começa). As portas são só as dos
// provedores LIGADOS (channel.runtime.ts), e o `fetch` nunca acontece em transação (R-OBX-1).

export const BILLING_DISPATCH_INTERVAL_MS = 60_000;
export const BILLING_POLL_PENDING_INTERVAL_MS = 15 * 60_000;
const BILLING_POLL_SETTLED_WINDOWS = [{ hour: 3, minute: 0 }] as const;

/** `delayMs` até as próximas 03:00 em São Paulo (o poll-settled é diário — G9). */
export function computeNextBillingPollSettledDelayMs(now: Date, timeZone = MEASURE_DAILY_TIME_ZONE): number {
  return computeNextWindowDelayMs(now, BILLING_POLL_SETTLED_WINDOWS, timeZone);
}

type BillingChannelJobs = typeof import("./outbox/channel.jobs.js");
type LoadedBillingChannel = { readonly deps: import("./outbox/channel.jobs.js").ChannelDeps; readonly jobs: BillingChannelJobs };
type RecurringBillingJobName = "billing.dispatch-outbox" | "billing.poll-pending" | "billing.poll-settled";

/** Peças injetáveis SÓ para teste: em produção, a flag do env, o canal de verdade e a fila padrão. */
export type BillingChannelHandlerOptions = {
  readonly enabled?: () => boolean;
  readonly load?: () => Promise<LoadedBillingChannel>;
  readonly enqueue?: (name: RecurringBillingJobName, delayMs: number) => Promise<unknown>;
};

async function loadChannel(): Promise<LoadedBillingChannel> {
  const [{ createChannelRuntime }, jobs] = await Promise.all([
    import("./outbox/channel.runtime.js"),
    import("./outbox/channel.jobs.js"),
  ]);
  return { deps: await createChannelRuntime(), jobs };
}

function channelEnabled(): boolean {
  return env.BILLING_PROVIDERS_ENABLED;
}

async function enqueueBillingTick(name: RecurringBillingJobName, delayMs: number): Promise<unknown> {
  return getDefaultJobQueue().enqueue(name, {}, { delayMs });
}

/** Recorrente: isola a falha (só o código vai ao log) e re-enfileira UMA vez, mantendo a cadeia viva com o canal ligado. */
function recurringBillingHandler(
  name: RecurringBillingJobName,
  run: (channel: LoadedBillingChannel) => Promise<unknown>,
  nextDelayMs: () => number,
  options: BillingChannelHandlerOptions,
): JobHandler {
  const enabled = options.enabled ?? channelEnabled;
  const load = options.load ?? loadChannel;
  const enqueue = options.enqueue ?? enqueueBillingTick;
  return async () => {
    if (!enabled()) return; // canal desligado: nada roda, e a cadeia não continua
    try {
      await run(await load());
    } catch (error) {
      // Falha GERAL: registra e NÃO relança (a retentativa somada ao re-enfileiramento multiplicaria a cadeia — M-1).
      logger.error({ code: failureCode(error) }, `${name}: a rodada falhou; a próxima tenta de novo`);
    }
    await enqueue(name, nextDelayMs());
  };
}

export function createBillingDispatchOutboxJobHandler(options: BillingChannelHandlerOptions = {}): JobHandler {
  return recurringBillingHandler("billing.dispatch-outbox", ({ deps, jobs }) => jobs.runBillingDispatch(deps), () => BILLING_DISPATCH_INTERVAL_MS, options);
}

export function createBillingPollPendingJobHandler(options: BillingChannelHandlerOptions = {}): JobHandler {
  return recurringBillingHandler("billing.poll-pending", ({ deps, jobs }) => jobs.runBillingPollPending(deps), () => BILLING_POLL_PENDING_INTERVAL_MS, options);
}

export function createBillingPollSettledJobHandler(options: BillingChannelHandlerOptions = {}): JobHandler {
  return recurringBillingHandler(
    "billing.poll-settled",
    ({ deps, jobs }) => jobs.runBillingPollSettled(deps),
    () => computeNextBillingPollSettledDelayMs(new Date()),
    options,
  );
}

/** Um por evento aceito pelo webhook. Payload inválido não re-tenta (é descartado com o código no log); falha de rede ou de
 * banco relança para a fila re-tentar — e o que se perder o poll-pending retoma (R-WH-8). */
export function createBillingReconcileWebhookJobHandler(options: Omit<BillingChannelHandlerOptions, "enqueue"> = {}): JobHandler {
  const enabled = options.enabled ?? channelEnabled;
  const load = options.load ?? loadChannel;
  return async (payload) => {
    if (!enabled()) return;
    const provider = payload.provider;
    const externalEventId = payload.externalEventId;
    if (typeof provider !== "string" || !provider || typeof externalEventId !== "string" || !externalEventId) {
      logger.warn({ code: "invalid_reconcile_payload" }, "billing.reconcile-webhook: payload inválido descartado");
      return;
    }
    const { deps, jobs } = await load();
    await jobs.runBillingReconcileEvent(deps, { provider, externalEventId });
  };
}

/** Enfileira os 1ºs ticks dos jobs recorrentes do canal — SÓ com o canal ligado. Chamado pelo bootstrap do worker. */
export async function enqueueInitialBillingChannelJobs(options: Omit<BillingChannelHandlerOptions, "load"> = {}): Promise<void> {
  const enabled = options.enabled ?? channelEnabled;
  const enqueue = options.enqueue ?? enqueueBillingTick;
  if (!enabled()) return;
  await enqueue("billing.dispatch-outbox", BILLING_DISPATCH_INTERVAL_MS);
  await enqueue("billing.poll-pending", BILLING_POLL_PENDING_INTERVAL_MS);
  await enqueue("billing.poll-settled", computeNextBillingPollSettledDelayMs(new Date()));
}
