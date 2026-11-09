// B-ASS-08 · F1 — outbox + dispatcher (claim–chamada–registro). R-OBX-1..4 (plano §4.8, §3.8).
// Vermelho-controle: o módulo `outbox/**` não existe em origin/main (B-ASS-07 é o head). Tudo em memória, zero rede.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { runDispatchOutbox, type DispatchAuditEvent } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { ProviderRateLimitedError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentMethod,
  PaymentProviderPort,
} from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";

const STMT = "11111111-1111-1111-1111-111111111111";
const TENANT = "22222222-2222-2222-2222-222222222222";

/** Porta de pagamento falsa que grava cada chamada (o equivalente ao `recorded[]` do servidor falso, sem rede). */
class RecordingPort implements PaymentProviderPort {
  readonly created: CreateChargeInput[] = [];
  readonly lookups: string[] = [];
  existingByRef: { chargeId: string; status: ChargeResult["status"] } | null = null;
  nextError: Error | null = null;

  async ensureCustomer() {
    return { customerId: "cus_1" };
  }
  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.created.push(input);
    if (this.nextError) {
      const error = this.nextError;
      throw error;
    }
    return { chargeId: `pay_${this.created.length}`, status: "pending", payUrl: "https://pay.example/x" };
  }
  async getCharge() {
    return { status: "pending" as const, raw: {} };
  }
  async findChargeByExternalReference(ref: string) {
    this.lookups.push(ref);
    return this.existingByRef;
  }
  async cancelCharge(chargeId: string) {
    return { chargeId, status: "cancelled" as const };
  }
  async refund(chargeId: string) {
    return { chargeId, status: "refunded" as const };
  }
  async registerWebhook() {
    return { externalId: "hook_1" };
  }
  async verifyWebhook() {
    return { ok: false };
  }
  supportedMethods(): readonly PaymentMethod[] {
    return ["pix", "credit_card", "debit_card"];
  }
  describe() {
    return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const };
  }
}

function enqueueCharge(repo: InMemoryOutboxRepository, now: Date, seq = 1, provider = "asaas") {
  return repo.enqueue(
    {
      tenantId: TENANT,
      statementId: STMT,
      kind: "charge_create",
      provider,
      seq,
      payload: { customerId: "cus_1", amountCents: 19990, dueDate: "2026-12-10", method: "pix" },
    },
    now,
  );
}

test("R-OBX-1 durável e idempotente: enqueue repetido = 1 linha; dispatch cria a cobrança 1×", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => now);
  const first = await enqueueCharge(repo, now);
  const second = await enqueueCharge(repo, now); // mesma idempotency_key
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.row.id, second.row.id);

  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.sent, 1);
  assert.equal(port.created.length, 1); // uma cobrança, não duas
  const row = await repo.findById(first.row.id);
  assert.equal(row?.status, "SENT");
  assert.equal(row?.externalId, "pay_1");

  // Rodar de novo não cria 2ª cobrança (linha já SENT não é reclamada).
  await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => now });
  assert.equal(port.created.length, 1);
});

test("R-OBX-1 crash entre chamada e registro: linha PROCESSING órfã reconsulta ANTES de repetir (T-OBX-11)", async () => {
  const start = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => start);
  const { row } = await enqueueCharge(repo, start);

  // Simula o crash: a 1ª chamada ao provedor foi feita, a cobrança nasceu no provedor, mas o registro não gravou.
  const port = new RecordingPort();
  port.nextError = new Error("socket hangup"); // a chamada "cai" depois de criar no provedor
  await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => start });
  // 1ª passada: erro transitório → reschedule PENDING (attempts 1).
  let current = await repo.findById(row.id);
  assert.equal(current?.status, "PENDING");

  // Força o estado de órfã: a linha estava PROCESSING quando o processo morreu.
  // Reproduzimos reclamando e NÃO registrando: deixa PROCESSING com attemptStartedAt antigo.
  port.nextError = null;
  const later = new Date(start.getTime() + OUTBOX_ORPHAN_MS + 60_000);
  // claim fresco (reschedule pôs nextAttemptAt futuro? reschedule usa backoff; vamos reconsultar com relógio adiante)
  // A cobrança JÁ existe no provedor: findChargeByExternalReference a encontra.
  port.existingByRef = { chargeId: "pay_crashed", status: "pending" };
  // Marca a linha como PROCESSING órfã manualmente via um claim seguido de nada.
  const claimed = await repo.claimNext({ enabledProviders: ["asaas"], now: new Date(start.getTime() + 60_000), claimedBy: "t", orphanMs: OUTBOX_ORPHAN_MS });
  assert.ok(claimed);
  assert.equal(claimed.row.status, "PROCESSING");

  const before = port.created.length;
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => later, orphanMs: OUTBOX_ORPHAN_MS });
  assert.equal(result.outcomes.recovered, 1);
  assert.equal(port.created.length, before, "reconsulta não cria 2ª cobrança");
  assert.deepEqual(port.lookups, [STMT]);
  current = await repo.findById(row.id);
  assert.equal(current?.status, "SENT");
  assert.equal(current?.externalId, "pay_crashed");
});

test("R-OBX-1 crash + reconsulta vazia → NEEDS_REVIEW (nunca repete às cegas)", async () => {
  const start = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => start);
  const { row } = await enqueueCharge(repo, start);
  const port = new RecordingPort();
  port.existingByRef = null; // reconsulta não acha
  await repo.claimNext({ enabledProviders: ["asaas"], now: start, claimedBy: "t", orphanMs: OUTBOX_ORPHAN_MS });
  const later = new Date(start.getTime() + OUTBOX_ORPHAN_MS + 60_000);
  const audits: DispatchAuditEvent[] = [];
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => later, onAudit: async (e) => void audits.push(e) });
  assert.equal(result.outcomes.needs_review, 1);
  assert.equal(port.created.length, 0);
  const current = await repo.findById(row.id);
  assert.equal(current?.status, "NEEDS_REVIEW");
  assert.equal(audits[0]?.action, "billing_outbox.needs_review");
});

test("R-OBX-2 backoff e FAILED na 8ª falha + trilha (T-OBX-7..8)", async () => {
  let clock = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => clock);
  const { row } = await enqueueCharge(repo, clock);
  const port = new RecordingPort();
  port.nextError = new Error("boom");
  const audits: DispatchAuditEvent[] = [];

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const result = await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => clock, onAudit: async (e) => void audits.push(e) });
    const current = await repo.findById(row.id);
    if (attempt < 8) {
      assert.equal(current?.status, "PENDING", `tentativa ${attempt} volta a PENDING`);
      assert.ok((current?.nextAttemptAt?.getTime() ?? 0) > clock.getTime(), "nextAttemptAt futuro (backoff)");
      assert.equal(result.outcomes.retry, 1);
      // avança o relógio para além da janela de backoff
      clock = new Date((current?.nextAttemptAt?.getTime() ?? clock.getTime()) + 1000);
    } else {
      assert.equal(result.outcomes.failed, 1);
      assert.equal(current?.status, "FAILED");
    }
  }
  assert.equal(audits.at(-1)?.action, "billing_outbox.failed");
});

test("R-OBX-2 retry reabre FAILED → PENDING e dispatch volta a tentar (T-OBX-9)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => now);
  const { row } = await enqueueCharge(repo, now);
  await repo.markFailed(row.id, "boom", now);
  const reopened = await repo.retry(row.id, now);
  assert.equal(reopened?.status, "PENDING");
  assert.equal(reopened?.attempts, 0);
  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.sent, 1);
});

test("R-OBX-3 canal desligado: dispatcher não roda, linha segue PENDING (T-OBX-10)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => now);
  const { row } = await enqueueCharge(repo, now);
  // Nenhum provedor ligado → ports vazio.
  const result = await runDispatchOutbox({ repo, ports: {}, now: () => now });
  assert.equal(result.processed, 0);
  const current = await repo.findById(row.id);
  assert.equal(current?.status, "PENDING");
});

test("R-OBX-4 provedor desligado NÃO é alcançado (T-OBX-12): 0 chamada ao Asaas, linha PENDING com skip_reason", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => now);
  const { row: asaasRow } = await enqueueCharge(repo, now, 1, "asaas"); // Asaas DESLIGADO
  const { row: focusRow } = await repo.enqueue(
    { tenantId: TENANT, statementId: STMT, kind: "charge_create", provider: "mercadopago", seq: 2, payload: { customerId: "c", amountCents: 100, dueDate: "2026-12-10", method: "pix" } },
    now,
  );
  const mp = new RecordingPort();
  // ports só tem mercadopago ligado; Asaas nem existe no mapa → impossível alcançá-lo.
  const result = await runDispatchOutbox({ repo, ports: { mercadopago: mp }, now: () => now });
  assert.equal(result.outcomes.sent, 1); // só o ligado

  const asaas = await repo.findById(asaasRow.id);
  assert.equal(asaas?.status, "PENDING");
  assert.equal(asaas?.skipReason, "provider_disabled");
  const focus = await repo.findById(focusRow.id);
  assert.equal(focus?.status, "SENT");
});

test("429 → reschedule com next_attempt_at = now + retryAfter, sem FAILED", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository(() => now);
  const { row } = await enqueueCharge(repo, now);
  const port = new RecordingPort();
  port.nextError = new ProviderRateLimitedError(2000);
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.rate_limited, 1);
  const current = await repo.findById(row.id);
  assert.equal(current?.status, "PENDING");
  assert.equal(current?.nextAttemptAt?.getTime(), now.getTime() + 2000);
});

test("R-OBX-1 guard de texto: o dispatcher NÃO abre transação em volta da chamada ao provedor", () => {
  const path = fileURLToPath(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url));
  // Só linhas de código (sem comentários), e a FORMA de chamada: um `fetch` dentro de transação exigiria abrir
  // `withTenantRls(` ou `.$transaction(` neste arquivo — não há (claim e registro são ops atômicas separadas).
  const code = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  assert.ok(!/withTenantRls\s*\(/.test(code), "o fetch nunca roda dentro de withTenantRls(...)");
  assert.ok(!/\$transaction\s*\(/.test(code), "o fetch nunca roda dentro de $transaction(...)");
});
