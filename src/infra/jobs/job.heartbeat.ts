import { randomUUID } from "node:crypto";

import type { RedisClient } from "../redis/redis.client.js";

/**
 * Ω6R-DIN-006 — SINAL DE VIDA do worker de jobs.
 *
 * O QUE ESTE SINAL PROVA: que o laço do worker COMPLETOU um tick recentemente, **incluindo a ida
 * à fila**. O QUE ELE NÃO PROVA: que jobs terminam, nem que um handler travou dentro do tick
 * (Ω6R-PERF-001 → B-O6R-08). Ler "up" aqui é ler "o laço está girando", não "a fila está sã".
 *
 * Duas metades independentes, de propósito:
 *  (1) ESTADO DO PROCESSO — o que o `GET /api/v1/health/worker` responde. Nunca consulta o Redis
 *      (veto secops #3): a resposta é sobre ESTE processo, e um endpoint que perguntasse ao Redis
 *      responderia sobre qualquer processo (ou sobre nenhum, com o Redis fora).
 *  (2) ESCRITA no Redis — chave namespeada com TTL, para que OUTRO processo (B-O6R-08) possa ler.
 *      Neste bloco só existe a ESCRITA; o leitor nasce lá, junto do processo que o torna
 *      verificável. A escrita entregue aqui é o contrato que o 08 consome.
 */

/** Chave namespeada (veto secops #3) — nunca colide com `erp:jobs:{pending,delayed,failed,data}`. */
export const WORKER_HEARTBEAT_KEY = "erp:jobs:worker:heartbeat";

/** TTL da chave. Liveness TEM que expirar sozinha: laço morto para de renovar e a chave some. */
export const WORKER_HEARTBEAT_TTL_SECONDS = 45;

/** Intervalo mínimo entre duas escritas. 15s ⇒ 3 renovações dentro de cada TTL. */
export const WORKER_HEARTBEAT_WRITE_INTERVAL_MS = 15_000;

/** Quantas renovações o TTL tem de comportar. Três ⇒ duas escritas podem falhar sem o sinal sumir. */
export const WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL = 3;

/**
 * INVARIANTE — verificado na carga do módulo, não prometido em comentário.
 *
 * O TTL e o intervalo de escrita são um PAR: o sinal só continua existindo porque é renovado antes
 * de expirar. Com o TTL menor que o intervalo, a chave passa a maior parte do tempo AUSENTE mesmo
 * com o laço perfeitamente vivo — e o leitor do B-O6R-08, que consome esta escrita como contrato,
 * leria "worker morto" num worker sadio. Isto não é hipótese: baixar o TTL de 45 para 5 sobrevivia
 * às 21 asserções da suíte do heartbeat, porque todas elas comparavam contra a PRÓPRIA constante
 * mutada. Aqui a relação entre as duas é que está guardada, e uma não pode mais se mexer sozinha.
 */
if (
  WORKER_HEARTBEAT_TTL_SECONDS * 1_000 <
  WORKER_HEARTBEAT_WRITE_INTERVAL_MS * WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL
) {
  throw new Error(
    `[job.heartbeat] configuração inconsistente: TTL de ${WORKER_HEARTBEAT_TTL_SECONDS}s não cobre ` +
      `${WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL} renovações de ${WORKER_HEARTBEAT_WRITE_INTERVAL_MS}ms. ` +
      `O sinal de vida expiraria entre duas escritas e um worker vivo seria lido como morto.`,
  );
}

/** Idade máxima do último tick RESOLVIDO para o worker ser considerado vivo. */
export const WORKER_TICK_FRESH_MS = 60_000;

/** Carência de boot: antes disso, "ainda não bateu" é `starting`, não `stale`. */
export const WORKER_START_GRACE_MS = 90_000;

/** O que o corpo do endpoint declara estar medindo — some do corpo se alguém trocar a medida. */
export const WORKER_HEALTH_MEASURE = "worker_loop_tick";

/**
 * `local` = este processo deveria estar rodando o laço. `none` = ninguém prometeu worker aqui
 * (dev/test com a flag desligada). Em produção o gate G3 torna a flag obrigatória, então `none`
 * não é um estado alcançável lá.
 */
export type WorkerExpectation = "local" | "none";

export type WorkerHealthStatus = "up" | "starting" | "stale" | "not_expected";

export type WorkerHealthReport = {
  readonly status: WorkerHealthStatus;
  readonly expected: WorkerExpectation;
  /** Idade do último tick resolvido, em segundos. `null` quando nunca houve tick. */
  readonly ageSeconds: number | null;
  readonly httpStatus: 200 | 503;
};

export type EvaluateWorkerHealthInput = {
  readonly expected: WorkerExpectation;
  readonly lastSuccessfulTickAt?: Date | undefined;
  /** Quando este processo subiu — a carência de boot é medida daqui. */
  readonly startedAt: Date;
  readonly now: Date;
  readonly freshMs?: number;
  readonly startGraceMs?: number;
};

/**
 * Núcleo PURO — relógio injetado, zero I/O. É aqui que os quatro estados são decididos:
 *
 *   up           tick resolvido há menos de `freshMs`                      200
 *   starting     esperado, sem tick fresco, processo com menos de grace    200
 *   stale        esperado, sem tick fresco, processo além da grace         503
 *   not_expected ninguém prometeu worker neste processo                    200
 */
export function evaluateWorkerHealth(input: EvaluateWorkerHealthInput): WorkerHealthReport {
  const freshMs = input.freshMs ?? WORKER_TICK_FRESH_MS;
  const startGraceMs = input.startGraceMs ?? WORKER_START_GRACE_MS;
  const tickAgeMs = input.lastSuccessfulTickAt
    ? input.now.getTime() - input.lastSuccessfulTickAt.getTime()
    : null;
  const ageSeconds = tickAgeMs === null ? null : Math.max(0, Math.floor(tickAgeMs / 1_000));

  if (input.expected === "none") {
    return { status: "not_expected", expected: "none", ageSeconds, httpStatus: 200 };
  }

  if (tickAgeMs !== null && tickAgeMs < freshMs) {
    return { status: "up", expected: "local", ageSeconds, httpStatus: 200 };
  }

  const uptimeMs = input.now.getTime() - input.startedAt.getTime();

  if (uptimeMs < startGraceMs) {
    return { status: "starting", expected: "local", ageSeconds, httpStatus: 200 };
  }

  return { status: "stale", expected: "local", ageSeconds, httpStatus: 503 };
}

// ---------------------------------------------------------------------------------------------
// (1) Estado do processo — publicado pelo bootstrap, lido pelo /health/worker.
// ---------------------------------------------------------------------------------------------

export type WorkerHealthSource = {
  readonly expected: WorkerExpectation;
  readonly getLastSuccessfulTickAt: () => Date | undefined;
  /** Só os testes passam isto; em produção vale o instante real de boot do processo. */
  readonly startedAt?: Date;
};

/** Instante real em que ESTE processo subiu (não o instante em que este módulo foi importado). */
const PROCESS_STARTED_AT = new Date(Date.now() - Math.round(process.uptime() * 1_000));

let workerHealthSource: WorkerHealthSource | undefined;

export function publishWorkerHealthSource(source: WorkerHealthSource): void {
  workerHealthSource = source;
}

export function resetWorkerHealthSourceForTests(): void {
  workerHealthSource = undefined;
}

/**
 * Sem fonte publicada (todo processo que só importa `app.ts` — CI, testes, portais) o worker
 * NÃO é esperado: `not_expected`/200. O silêncio nunca vira 503 por acidente.
 */
export function getWorkerHealthReport(now = new Date()): WorkerHealthReport {
  if (!workerHealthSource) {
    return { status: "not_expected", expected: "none", ageSeconds: null, httpStatus: 200 };
  }

  return evaluateWorkerHealth({
    expected: workerHealthSource.expected,
    lastSuccessfulTickAt: workerHealthSource.getLastSuccessfulTickAt(),
    startedAt: workerHealthSource.startedAt ?? PROCESS_STARTED_AT,
    now,
  });
}

// ---------------------------------------------------------------------------------------------
// (2) Escrita no Redis — o contrato que o B-O6R-08 vai ler.
// ---------------------------------------------------------------------------------------------

/** Só o que o writer usa. Um duble de teste implementa `command` e pronto. */
export type HeartbeatRedis = Pick<RedisClient, "command">;

export type WorkerHeartbeatWriterOptions = {
  readonly redis: HeartbeatRedis;
  readonly getLastSuccessfulTickAt: () => Date | undefined;
  readonly now?: () => Date;
  readonly key?: string;
  readonly instanceId?: string;
  readonly ttlSeconds?: number;
  readonly intervalMs?: number;
  readonly freshMs?: number;
  readonly logger?: Pick<Console, "warn">;
};

export class WorkerHeartbeatWriter {
  readonly key: string;

  private readonly redis: HeartbeatRedis;
  private readonly getLastSuccessfulTickAt: () => Date | undefined;
  private readonly now: () => Date;
  /**
   * Identidade opaca do processo. Serve para o leitor do B-O6R-08 distinguir instâncias SEM
   * receber hostname/IP/região (§2.8). NUNCA sai em resposta HTTP.
   */
  private readonly instanceId: string;
  private readonly ttlSeconds: number;
  private readonly intervalMs: number;
  private readonly freshMs: number;
  private readonly logger: Pick<Console, "warn">;
  private lastWriteAt: Date | undefined;
  private timer: NodeJS.Timeout | undefined;

  constructor(options: WorkerHeartbeatWriterOptions) {
    this.redis = options.redis;
    this.getLastSuccessfulTickAt = options.getLastSuccessfulTickAt;
    this.now = options.now ?? (() => new Date());
    this.key = options.key ?? WORKER_HEARTBEAT_KEY;
    this.instanceId = options.instanceId ?? randomUUID();
    this.ttlSeconds = options.ttlSeconds ?? WORKER_HEARTBEAT_TTL_SECONDS;
    this.intervalMs = options.intervalMs ?? WORKER_HEARTBEAT_WRITE_INTERVAL_MS;
    this.freshMs = options.freshMs ?? WORKER_TICK_FRESH_MS;
    this.logger = options.logger ?? console;
  }

  /**
   * Escreve SE (a) o último tick resolvido está fresco e (b) já passou `intervalMs` da última
   * escrita. Laço morto ⇒ (a) falha ⇒ nada é renovado ⇒ a chave expira sozinha. Retorna se
   * escreveu, para o teste poder afirmar a NÃO-escrita.
   */
  async writeOnce(): Promise<boolean> {
    const now = this.now();
    const lastTick = this.getLastSuccessfulTickAt();

    if (!lastTick || now.getTime() - lastTick.getTime() >= this.freshMs) {
      return false;
    }

    if (this.lastWriteAt && now.getTime() - this.lastWriteAt.getTime() < this.intervalMs) {
      return false;
    }

    const value = JSON.stringify({ at: now.toISOString(), instanceId: this.instanceId });

    try {
      await this.redis.command("SET", this.key, value, "EX", String(this.ttlSeconds));
    } catch (error) {
      // Redis fora não derruba o processo: o sinal apenas envelhece e o /health/worker,
      // que lê o ESTADO DO PROCESSO, continua dizendo a verdade sobre o laço.
      this.logger.warn({ error }, "Falha ao renovar o sinal de vida do worker de jobs.");
      return false;
    }

    this.lastWriteAt = now;

    return true;
  }

  /**
   * Enquete mais frequente que o intervalo de escrita; quem decide se escreve é o throttle do
   * `writeOnce`. Assim a escrita não depende do timer cair no milissegundo exato.
   */
  start(): void {
    if (this.timer) {
      return;
    }

    const pollMs = Math.max(1_000, Math.floor(this.intervalMs / 3));

    this.timer = setInterval(() => {
      void this.writeOnce();
    }, pollMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }
}
