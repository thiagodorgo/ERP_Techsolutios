import pino from "pino";

import { env } from "../../../config/env.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§3.8 do plano) — sonda de prontidão do LOGIN SEM ORGANIZAÇÃO. A luz é PROVA, não
// derruba o boot e NÃO entra no veredito 200/503 do readiness:
//   - best-effort: disparada de createApp (assíncrona, não aguardada, timeout curto, captura
//     TOTAL — inclusive falha de conexão). src/server.ts fica INTOCADO: o boot não depende dela.
//   - REPORTADO, NUNCA CONTADO: `login_without_org` vai no topo do corpo de /health/ready, FORA
//     de `checks`, e não muda o 200/503 (503 tira a máquina do balanceamento —
//     fly.production.toml — e este bloco cria de propósito uma janela longa de "inactive" entre
//     o migrate e o GRANT humano).
//   - a sonda PARTILHA a única entrada cross-tenant (listLoginCandidatesViaFunction) com o
//     call-site do login (especialista 5) — o SQLSTATE sobrevive até aqui; quem converte para
//     401 uniforme é a rota.
//
// Desfechos (exaustivos):
//   active                — sonda devolveu (zero linhas, e-mail-sentinela) SEM exceção **E** o
//                           DONO da função tem rolsuper/rolbypassrls (conjunção — a sonda é cega
//                           à dimensão RLS: dono sem BYPASSRLS devolve zero com o caminho morto).
//   inert_owner_privilege — sonda limpa, mas o dono NÃO enxerga as fontes (RLS filtra tudo).
//   inert_no_execute      — 42501: a role corrente não tem EXECUTE (função inerte até o GRANT).
//   absent                — 42883: função não existe (migração não aplicada).
//   not_applicable        — a persistência que SERVE não é prisma (CORE_SAAS_PERSISTENCE=memory):
//                           o caminho anônimo vive no adaptador de memória e FUNCIONA — a sonda
//                           SQL mentiria na direção oposta (crítico 3). Booleano = "active".
//   unreachable           — falha de conexão/timeout (máquina subiu antes do banco).
//   unknown               — a sonda não completou por causa não classificada.
//
// Booleano público: active | not_applicable → "active"; todo o resto → "inactive" (fail-closed
// na LUZ, fail-open no BOOT). Desfechos definitivos são instantâneo de boot (mudança pós-boot
// exige restart — runbook); desfechos TRANSITÓRIOS (unreachable/unknown) têm reavaliação
// preguiçosa: a leitura de /health/ready re-dispara a sonda com intervalo mínimo (≥60s) até um
// desfecho definitivo — um blip de banco no arranque não trava a luz em "inactive" para sempre.
// A CAUSA nunca vai em corpo público: só neste log estruturado (nível error).
// -----------------------------------------------------------------------------------------------

export type LoginReadinessOutcome =
  | "active"
  | "inert_owner_privilege"
  | "inert_no_execute"
  | "absent"
  | "not_applicable"
  | "unreachable"
  | "unknown";

export type LoginWithoutOrgStatus = "active" | "inactive";

// §12.10 — parâmetro da reavaliação preguiçosa (intervalo mínimo entre re-sondas de desfecho
// transitório).
export const LOGIN_READINESS_REPROBE_MIN_INTERVAL_MS = 60_000;

const PROBE_TIMEOUT_MS = 3_000;

// E-mail-sentinela: NUNCA '' (NULL/vazio curto-circuitam sem tocar as fontes — §3.2.4); um
// endereço impossível de colidir com credencial real.
const PROBE_SENTINEL_EMAIL = "sonda-login-sem-org@sentinela.invalid";

const TRANSIENT_OUTCOMES: ReadonlySet<LoginReadinessOutcome> = new Set(["unreachable", "unknown"]);

const logger = pino({ level: env.LOG_LEVEL });

type LoginReadinessState = {
  outcome: LoginReadinessOutcome;
  lastProbeStartedAt: number;
  probing: boolean;
};

const state: LoginReadinessState = {
  outcome: "unknown",
  lastProbeStartedAt: 0,
  probing: false,
};

export function getLoginWithoutOrgStatus(): LoginWithoutOrgStatus {
  // Reavaliação preguiçosa: só desfechos transitórios re-sondam, e nunca antes do intervalo
  // mínimo. Os definitivos são instantâneo de boot (restart para reavaliar).
  if (
    TRANSIENT_OUTCOMES.has(state.outcome) &&
    !state.probing &&
    Date.now() - state.lastProbeStartedAt >= LOGIN_READINESS_REPROBE_MIN_INTERVAL_MS
  ) {
    triggerLoginReadinessProbe();
  }

  return toStatus(state.outcome);
}

export function getLoginReadinessOutcomeForDiagnostics(): LoginReadinessOutcome {
  return state.outcome;
}

// Há uma sonda em voo? (arnês de teste: esperar a sonda de boot assentar antes de forçar estado)
export function isLoginReadinessProbing(): boolean {
  return state.probing;
}

// Disparo best-effort (createApp): não aguardado, captura TOTAL — nenhuma exceção daqui alcança
// quem chamou.
export function triggerLoginReadinessProbe(): void {
  if (state.probing) {
    return;
  }

  state.probing = true;
  state.lastProbeStartedAt = Date.now();

  void probeOnce()
    .then((outcome) => {
      state.outcome = outcome;

      if (outcome !== "active" && outcome !== "not_applicable") {
        logger.error(
          { loginWithoutOrgOutcome: outcome },
          "Login sem organização INATIVO — causa no desfecho da sonda (nunca em corpo público).",
        );
      }
    })
    .catch((error) => {
      // Nunca deveria acontecer (probeOnce captura tudo) — cinto e suspensório.
      state.outcome = "unknown";
      logger.error({ err: error }, "Sonda de login sem organização falhou fora da captura.");
    })
    .finally(() => {
      state.probing = false;
    });
}

// Reset para testes (o estado é singleton de módulo).
export function resetLoginReadinessForTests(outcome: LoginReadinessOutcome = "unknown"): void {
  state.outcome = outcome;
  state.lastProbeStartedAt = 0;
  state.probing = false;
}

async function probeOnce(): Promise<LoginReadinessOutcome> {
  // A persistência QUE SERVE decide (crítico 3): sob memory o caminho anônimo vive no adaptador
  // de memória — a sonda SQL não se aplica.
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return "not_applicable";
  }

  try {
    const { prisma } = await import("../../../database/prisma.js");

    return await classifyLoginReadiness(prisma);
  } catch (error) {
    if (isTimeoutOrConnectionError(error)) {
      return "unreachable";
    }

    return "unknown";
  }
}

// O CLASSIFICADOR da sonda, com o cliente explícito — a sonda de runtime o chama com o cliente
// global; a suíte da função elevada o chama com o cliente da role EFÊMERA (é assim que o
// desfecho 42501/inert_no_execute é exercido de verdade: sob a conexão `postgres` da CI ele
// seria inalcançável).
export async function classifyLoginReadiness(client: {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}): Promise<LoginReadinessOutcome> {
  const { listLoginCandidatesViaFunction, readSqlState } = await import(
    "../repositories/login-candidates.repository.js"
  );

  {
    try {
      await withTimeout(
        listLoginCandidatesViaFunction(
          client as Parameters<typeof listLoginCandidatesViaFunction>[0],
          PROBE_SENTINEL_EMAIL,
        ),
        PROBE_TIMEOUT_MS,
      );
    } catch (error) {
      const sqlState = readSqlState(error);

      if (sqlState === "42501") {
        return "inert_no_execute";
      }

      if (sqlState === "42883") {
        return "absent";
      }

      if (isTimeoutOrConnectionError(error)) {
        return "unreachable";
      }

      logger.error({ err: error }, "Sonda de login sem organização: desfecho não classificado.");

      return "unknown";
    }

    // Conjunção (especialista 3a): a sonda devolve zero linhas POR CONSTRUÇÃO (sentinela) — ela
    // é CEGA à dimensão RLS. O catálogo responde se o DONO enxerga as fontes.
    try {
      const rows = await withTimeout(
        client.$queryRaw<Array<{ can_bypass: boolean }>>`
          SELECT (r.rolsuper OR r.rolbypassrls) AS can_bypass
          FROM pg_proc p
          JOIN pg_roles r ON r.oid = p.proowner
          WHERE p.oid = 'public.auth_login_candidates(text)'::regprocedure
        `,
        PROBE_TIMEOUT_MS,
      );

      if (rows[0]?.can_bypass === true) {
        return "active";
      }

      return "inert_owner_privilege";
    } catch (error) {
      if (isTimeoutOrConnectionError(error)) {
        return "unreachable";
      }

      return "unknown";
    }
  }
}

function toStatus(outcome: LoginReadinessOutcome): LoginWithoutOrgStatus {
  return outcome === "active" || outcome === "not_applicable" ? "active" : "inactive";
}

function isTimeoutOrConnectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("login_readiness_probe_timeout") ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|Connection|connect/i.test(message)
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("login_readiness_probe_timeout")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
