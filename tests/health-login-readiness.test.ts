import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  getLoginReadinessOutcomeForDiagnostics,
  getLoginWithoutOrgStatus,
  isLoginReadinessProbing,
  resetLoginReadinessForTests,
  triggerLoginReadinessProbe,
} from "../src/modules/auth/services/login-readiness.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§3.8 do plano, grupo C4/dba 1/especialista/devops 2) — a LUZ do login sem
// organização: reportada, nunca contada; sem causa em corpo público; com reavaliação preguiçosa
// (anti-latch) e com o estado da persistência que DE FATO serve (not_applicable sob memory).
// Os dois testes históricos de tests/health-routes.test.ts ficam INTOCADOS — este arquivo só
// acrescenta.
// -----------------------------------------------------------------------------------------------

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);

  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
  }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function waitForOutcome(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("timeout esperando o desfecho da sonda");
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// O boot pode disparar MAIS de uma sonda (import do módulo app + createApp do teste), com os
// imports dinâmicos resolvendo em instantes diferentes. Antes de FORÇAR um estado, espera uma
// janela contínua sem sonda em voo e com desfecho definitivo — senão uma retardatária
// sobrescreveria o estado forçado.
async function settleBootProbes(): Promise<void> {
  await waitForOutcome(
    () => !isLoginReadinessProbing() && getLoginReadinessOutcomeForDiagnostics() !== "unknown",
  );

  let quietSince = Date.now();

  while (Date.now() - quietSince < 300) {
    if (isLoginReadinessProbing()) {
      quietSince = Date.now();
      await waitForOutcome(() => !isLoginReadinessProbing());
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

test("REPORTADO, NUNCA CONTADO: login_without_org fica FORA de checks e não muda o veredito 200/503", async () => {
  // A doutrina do devops 2d/especialista 2c: o veredito com a luz "inactive" é IDÊNTICO ao
  // veredito sem ela. Força o estado inativo e prova que o status HTTP segue só Postgres ∧ Redis.
  await withApi(async (baseUrl) => {
    // A sonda de boot do createApp corre em paralelo: espera-a assentar (sem sonda em voo, com
    // desfecho definitivo) ANTES de forçar o estado, senão ela sobrescreveria o forçado.
    await settleBootProbes();
    resetLoginReadinessForTests("inert_no_execute");

    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    const body = (await response.json()) as {
      status: string;
      login_without_org: string;
      checks: {
        postgres: { status: string };
        redis: { status: string };
        worker: { status: string };
      };
    };

    // O conjunto de checks é EXATO — o booleano novo não entrou nele.
    assert.deepEqual(Object.keys(body.checks).sort(), ["postgres", "redis", "worker"]);
    assert.equal(body.login_without_org, "inactive");

    // O veredito é a fórmula de SEMPRE, com a luz inativa: em ambiente com Postgres+Redis de pé
    // isto É "HTTP 200 E status ready COM login_without_org inactive" (o teste da doutrina).
    const ready = body.checks.postgres.status === "up" && body.checks.redis.status === "up";

    assert.equal(response.status, ready ? 200 : 503);
    assert.equal(body.status, ready ? "ready" : "not_ready");
  });

  resetLoginReadinessForTests();
});

test("persistência memory → o booleano deriva do caminho QUE SERVE: not_applicable interno, 'active' público", async () => {
  // crítico 3: sob CORE_SAAS_PERSISTENCE=memory o login anônimo FUNCIONA pelo adaptador de
  // memória — uma sonda SQL diria "inactive" com o caminho vivo, a luz mentindo ao contrário.
  resetLoginReadinessForTests();
  triggerLoginReadinessProbe();
  await waitForOutcome(() => getLoginReadinessOutcomeForDiagnostics() !== "unknown");

  assert.equal(getLoginReadinessOutcomeForDiagnostics(), "not_applicable");
  assert.equal(getLoginWithoutOrgStatus(), "active");
});

test("anti-latch (devops 2e): desfecho TRANSITÓRIO re-sonda na leitura e alcança desfecho definitivo", async () => {
  // Simula o blip de arranque: o estado ficou 'unreachable' (banco fora no boot). A LEITURA da
  // luz re-dispara a sonda (intervalo mínimo vencido — reset zera o relógio) e, com a
  // persistência viva (memory → not_applicable), a luz NÃO fica presa em inactive para sempre.
  resetLoginReadinessForTests("unreachable");

  const before = getLoginWithoutOrgStatus();

  assert.equal(before, "inactive", "durante o blip a luz é fail-closed");

  await waitForOutcome(() => getLoginReadinessOutcomeForDiagnostics() === "not_applicable");
  assert.equal(getLoginWithoutOrgStatus(), "active");
});

test("desfecho DEFINITIVO é instantâneo de boot: a leitura NÃO re-sonda (mudar exige restart)", async () => {
  resetLoginReadinessForTests("inert_owner_privilege");

  // Se a leitura re-sondasse, sob memory o desfecho viraria not_applicable — a permanência em
  // inert_owner_privilege após leituras + espera é a prova de que definitivo não re-avalia.
  for (let i = 0; i < 5; i += 1) {
    assert.equal(getLoginWithoutOrgStatus(), "inactive");
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(getLoginReadinessOutcomeForDiagnostics(), "inert_owner_privilege");

  resetLoginReadinessForTests();
});

test("corpos públicos SEM CAUSA: /health e /health/ready não carregam o desfecho interno da sonda", async () => {
  await withApi(async (baseUrl) => {
    await settleBootProbes();
    resetLoginReadinessForTests("inert_no_execute");

    const liveness = await fetch(`${baseUrl}/api/v1/health`);
    const livenessBody = (await liveness.json()) as Record<string, unknown>;

    // /health fica INTOCADO: liveness raso, sem a luz e sem causa.
    assert.equal(liveness.status, 200);
    assert.equal("login_without_org" in livenessBody, false);

    const readiness = await fetch(`${baseUrl}/api/v1/health/ready`);
    const raw = JSON.stringify(await readiness.json());

    for (const internal of [
      "inert_no_execute",
      "inert_owner_privilege",
      "absent",
      "unreachable",
      "not_applicable",
      "42501",
      "42883",
      "auth_login_candidates",
    ]) {
      assert.equal(raw.includes(internal), false, `corpo público não pode conter "${internal}"`);
    }
  });

  resetLoginReadinessForTests();
});
