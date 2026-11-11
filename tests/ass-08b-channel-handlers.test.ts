// B-ASS-08b · (c) — os HANDLERS dos 4 jobs do canal, registrados no worker. Sem Redis e sem Postgres: a flag, o canal e a fila
// são injetados. Provam: com o canal DESLIGADO nada roda e nada re-enfileira (a cadeia para) e o bootstrap não enfileira
// nenhum tick; ligado, roda e re-enfileira UMA vez; a falha da rodada vai ao log só pelo código e não multiplica a cadeia
// (M-1); payload inválido do reconcile é descartado sem abrir o canal. Vermelho-controle: os handlers não existem na parte 1.

import assert from "node:assert/strict";
import test from "node:test";

import { JOB_NAMES } from "../src/infra/jobs/job.types.js";
import { getDefaultJobRegistry, resetDefaultJobRegistryForTests } from "../src/infra/jobs/job.registry.js";
import {
  BILLING_DISPATCH_INTERVAL_MS,
  BILLING_POLL_PENDING_INTERVAL_MS,
  computeNextBillingPollSettledDelayMs,
  createBillingDispatchOutboxJobHandler,
  createBillingPollPendingJobHandler,
  createBillingPollSettledJobHandler,
  createBillingReconcileWebhookJobHandler,
  enqueueInitialBillingChannelJobs,
} from "../src/modules/subscription-billing/subscription-billing.jobs.js";

const CHANNEL_JOBS = ["billing.dispatch-outbox", "billing.reconcile-webhook", "billing.poll-pending", "billing.poll-settled"] as const;

type Recorded = { loads: number; runs: string[]; enqueued: Array<[string, number]> };

function fakeChannel(recorded: Recorded, options: { fail?: boolean } = {}) {
  const run = (name: string) => async () => {
    recorded.runs.push(name);
    if (options.fail) throw Object.assign(new Error("rede caiu: segredo-que-nao-pode-vazar"), { code: "ECONNRESET" });
    return { processed: 0 };
  };
  return async () => {
    recorded.loads += 1;
    return {
      deps: {} as never,
      jobs: {
        runBillingDispatch: run("dispatch"),
        runBillingPollPending: run("poll-pending"),
        runBillingPollSettled: run("poll-settled"),
        runBillingReconcileEvent: async (_deps: unknown, input: { provider: string; externalEventId: string }) => {
          recorded.runs.push(`reconcile:${input.provider}:${input.externalEventId}`);
          if (options.fail) throw Object.assign(new Error("rede caiu"), { code: "ECONNRESET" });
          return "processed";
        },
      } as never,
    };
  };
}

function recorder(): Recorded {
  return { loads: 0, runs: [], enqueued: [] };
}

test("os 4 jobs do canal estão em JOB_NAMES e registrados no worker", () => {
  resetDefaultJobRegistryForTests();
  const registry = getDefaultJobRegistry();
  for (const name of CHANNEL_JOBS) {
    assert.ok(JOB_NAMES.includes(name), `${name} em JOB_NAMES`);
    assert.equal(typeof registry.get(name), "function", `${name} registrado`);
  }
  resetDefaultJobRegistryForTests();
});

test("canal DESLIGADO: os 3 recorrentes não abrem o canal, não rodam e NÃO re-enfileiram (a cadeia para)", async () => {
  const recorded = recorder();
  const options = {
    enabled: () => false,
    load: fakeChannel(recorded),
    enqueue: async (name: string, delayMs: number) => void recorded.enqueued.push([name, delayMs]),
  };
  for (const handler of [createBillingDispatchOutboxJobHandler(options), createBillingPollPendingJobHandler(options), createBillingPollSettledJobHandler(options)]) {
    await handler({}, {} as never);
  }
  assert.deepEqual(recorded, recorder(), "zero carga, zero rodada, zero re-enfileiramento");
});

test("canal DESLIGADO: o reconcile não abre o canal; e o bootstrap não enfileira tick nenhum", async () => {
  const recorded = recorder();
  await createBillingReconcileWebhookJobHandler({ enabled: () => false, load: fakeChannel(recorded) })({ provider: "asaas", externalEventId: "evt_1" }, {} as never);
  await enqueueInitialBillingChannelJobs({ enabled: () => false, enqueue: async (name, delayMs) => void recorded.enqueued.push([name, delayMs]) });
  assert.deepEqual(recorded, recorder());
});

test("canal LIGADO: cada recorrente roda UMA vez e re-enfileira UMA vez, com o próprio intervalo", async () => {
  const recorded = recorder();
  const options = {
    enabled: () => true,
    load: fakeChannel(recorded),
    enqueue: async (name: string, delayMs: number) => void recorded.enqueued.push([name, delayMs]),
  };
  await createBillingDispatchOutboxJobHandler(options)({}, {} as never);
  await createBillingPollPendingJobHandler(options)({}, {} as never);
  await createBillingPollSettledJobHandler(options)({}, {} as never);
  assert.deepEqual(recorded.runs, ["dispatch", "poll-pending", "poll-settled"]);
  assert.equal(recorded.loads, 3);
  assert.deepEqual(recorded.enqueued.map(([name]) => name), ["billing.dispatch-outbox", "billing.poll-pending", "billing.poll-settled"]);
  assert.equal(recorded.enqueued[0]![1], BILLING_DISPATCH_INTERVAL_MS);
  assert.equal(recorded.enqueued[1]![1], BILLING_POLL_PENDING_INTERVAL_MS);
  assert.ok(recorded.enqueued[2]![1] > 0 && recorded.enqueued[2]![1] <= 24 * 3_600_000, "poll-settled: até as próximas 03:00");
});

test("M-1: a rodada que falha não relança (não soma retentativa ao re-enfileiramento) e re-enfileira UMA vez", async () => {
  const recorded = recorder();
  const handler = createBillingDispatchOutboxJobHandler({
    enabled: () => true,
    load: fakeChannel(recorded, { fail: true }),
    enqueue: async (name, delayMs) => void recorded.enqueued.push([name, delayMs]),
  });
  await assert.doesNotReject(async () => handler({}, {} as never));
  assert.deepEqual(recorded.enqueued, [["billing.dispatch-outbox", BILLING_DISPATCH_INTERVAL_MS]]);
});

test("reconcile LIGADO: payload válido roda; payload inválido é descartado sem abrir o canal; falha RELANÇA (a fila re-tenta)", async () => {
  const ok = recorder();
  await createBillingReconcileWebhookJobHandler({ enabled: () => true, load: fakeChannel(ok) })({ provider: "asaas", externalEventId: "evt_9" }, {} as never);
  assert.deepEqual(ok.runs, ["reconcile:asaas:evt_9"]);

  const invalid = recorder();
  const handler = createBillingReconcileWebhookJobHandler({ enabled: () => true, load: fakeChannel(invalid) });
  for (const payload of [{}, { provider: "asaas" }, { provider: "", externalEventId: "x" }, { provider: 1, externalEventId: "x" }]) {
    await handler(payload as never, {} as never);
  }
  assert.equal(invalid.loads, 0, "payload inválido não abre o canal");

  const failing = recorder();
  await assert.rejects(
    async () => createBillingReconcileWebhookJobHandler({ enabled: () => true, load: fakeChannel(failing, { fail: true }) })({ provider: "asaas", externalEventId: "evt_x" }, {} as never),
    /rede caiu/,
  );
});

test("bootstrap LIGADO: enfileira os 3 primeiros ticks (o reconcile nasce do webhook, não do bootstrap)", async () => {
  const enqueued: Array<[string, number]> = [];
  await enqueueInitialBillingChannelJobs({ enabled: () => true, enqueue: async (name, delayMs) => void enqueued.push([name, delayMs]) });
  assert.deepEqual(enqueued.map(([name]) => name), ["billing.dispatch-outbox", "billing.poll-pending", "billing.poll-settled"]);
});

test("poll-settled diário: 03:00 em São Paulo, estritamente depois", () => {
  const sp = (iso: string) => new Date(`${iso}-03:00`);
  assert.equal(computeNextBillingPollSettledDelayMs(sp("2026-12-01T02:00:00")), 3_600_000);
  assert.equal(computeNextBillingPollSettledDelayMs(sp("2026-12-01T03:00:00")), 24 * 3_600_000);
  assert.equal(computeNextBillingPollSettledDelayMs(sp("2026-12-31T23:00:00")), 4 * 3_600_000, "virada de ano");
});
