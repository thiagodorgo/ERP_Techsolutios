// B-ASS-08 · F1 — outbox + dispatcher (claim–chamada–registro). R-OBX-1..4 (plano §4.8, §3.8).
// Vermelho-controle: o módulo `outbox/**` não existe em origin/main (B-ASS-07 é o head). Tudo em memória, zero rede.
// 2º conserto do #522 (E6′/E7′, F5): a reconsulta por referência vem SEMPRE antes de criar (depois do gate do perfil), e a
// cobrança achada só é ADOTADA com fatos que não se apagam (única intenção do demonstrativo e fechamento vigente com o
// mesmo valor) — também na órfã. T-OBX-17 (braços 1–8 e 11–14), T-OBX-NODEL e o T-OBX-11 com `[STMT, STMT]`.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { InMemoryOutboxRepository, type StatementClaimReader } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { chargeCreateClaimVerdict, runDispatchOutbox, type DispatchAuditEvent, type DispatcherDeps } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { InMemoryChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.repository.js";
import { profileCustomerResolver, requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, type OutboxStatementGuard } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementError, type SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { ProviderRateLimitedError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentMethod,
  PaymentProviderPort,
} from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";

const STMT = "11111111-1111-1111-1111-111111111111";
const STMT_2 = "11111111-1111-1111-1111-222222222222";
const TENANT = "22222222-2222-2222-2222-222222222222";

/** Leitor do demonstrativo para os testes que NÃO medem R-OBX-5: um `closed` sem cobrança viva — stub EXPLÍCITO (o dublê
 * exige o leitor por construção; não há default permissivo). Os T-OBX-13..16 ligam o `StatementService` real. */
const alwaysClosed: StatementClaimReader = async () => ({ status: "closed", reopenedAt: null, hasLiveCharge: false });

/** Resolver de cliente para os testes que NÃO medem R-PRF-1 (o dispatcher o exige por construção — C3-02); os T-PRF-2/3
 * de `ass-08-charges-profile.test.ts` ligam o `profileCustomerResolver` real. */
const okResolver = async () => ({ ok: true as const, customerId: "cus_1" });

/** O leitor de um `closed` COM o total (o V da adoção do 2º conserto): o dublê sem total falha fechado. */
const closedWithTotal = (totalCents: number): StatementClaimReader => async () => ({ status: "closed", reopenedAt: null, hasLiveCharge: false, totalCents });

/** Erro de provedor com o `code` que o adaptador real produz (o dispatcher só lê `code`/`name`). */
function providerError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

/** Porta de pagamento falsa que grava cada chamada (o equivalente ao `recorded[]` do servidor falso, sem rede). Guarda o que
 * EXISTE no provedor (`stored`, na ordem da listagem do Asaas) e aceita roteiros por chamada: `createScript` ("lost" cria e
 * PERDE a resposta com `provider_timeout`; "5xx"/"429" falham sem criar), `lookupScript` e `ensureScript` ("5xx"). */
class RecordingPort implements PaymentProviderPort {
  /** Toda chamada a `createCharge`, inclusive as que falharam. */
  readonly created: CreateChargeInput[] = [];
  readonly lookups: string[] = [];
  readonly ensured: string[] = [];
  readonly stored: Array<{ readonly chargeId: string; readonly ref: string; readonly amountCents: number; readonly status: ChargeResult["status"] }> = [];
  existingByRef: { chargeId: string; status: ChargeResult["status"] } | null = null;
  /** `createCharge` lança SEM criar. */
  nextError: Error | null = null;
  readonly createScript: Array<"ok" | "lost" | "5xx" | "429"> = [];
  readonly lookupScript: Array<"ok" | "5xx"> = [];
  readonly ensureScript: Array<"ok" | "5xx"> = [];

  async ensureCustomer(profile: { readonly document: string }) {
    this.ensured.push(profile.document);
    if (this.ensureScript.shift() === "5xx") throw providerError("provider_unavailable");
    return { customerId: "cus_1" };
  }
  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.created.push(input);
    if (this.nextError) {
      const error = this.nextError;
      throw error;
    }
    const step = this.createScript.shift() ?? "ok";
    if (step === "5xx") throw providerError("provider_unavailable");
    if (step === "429") throw new ProviderRateLimitedError(1000);
    const chargeId = `pay_${this.stored.length + 1}`;
    this.stored.push({ chargeId, ref: input.externalReference, amountCents: input.amountCents, status: "pending" });
    if (step === "lost") throw providerError("provider_timeout");
    return { chargeId, status: "pending", payUrl: "https://pay.example/x" };
  }
  async getCharge() {
    return { status: "pending" as const, raw: {} };
  }
  async findChargeByExternalReference(ref: string) {
    this.lookups.push(ref);
    if (this.lookupScript.shift() === "5xx") throw providerError("provider_unavailable");
    if (this.existingByRef) return this.existingByRef;
    const found = this.stored.find((charge) => charge.ref === ref);
    return found ? { chargeId: found.chargeId, status: found.status } : null;
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
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const first = await enqueueCharge(repo, now);
  const second = await enqueueCharge(repo, now); // mesma idempotency_key
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.row.id, second.row.id);

  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.sent, 1);
  assert.equal(port.created.length, 1); // uma cobrança, não duas
  const row = await repo.findById(TENANT, first.row.id);
  assert.equal(row?.status, "SENT");
  assert.equal(row?.externalId, "pay_1");

  // Rodar de novo não cria 2ª cobrança (linha já SENT não é reclamada).
  await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(port.created.length, 1);
});

test("R-OBX-1 crash entre chamada e registro: linha PROCESSING órfã reconsulta ANTES de repetir (T-OBX-11)", async () => {
  const start = new Date("2026-12-01T12:00:00Z");
  // 2º conserto (E7′): a órfã só adota com o fechamento vigente — o leitor traz o total igual ao payload (19990).
  const repo = new InMemoryOutboxRepository({ readStatement: closedWithTotal(19990), clock: () => start });
  const { row } = await enqueueCharge(repo, start);

  // Simula o crash: a 1ª chamada ao provedor foi feita, a cobrança nasceu no provedor, mas o registro não gravou.
  const port = new RecordingPort();
  port.nextError = new Error("socket hangup"); // a chamada "cai" depois de criar no provedor
  await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => start });
  // 1ª passada: erro transitório → reschedule PENDING (attempts 1).
  let current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "PENDING");

  // Força o estado de órfã: a linha estava PROCESSING quando o processo morreu.
  // Reproduzimos reclamando e NÃO registrando: deixa PROCESSING com attemptStartedAt antigo.
  port.nextError = null;
  const later = new Date(start.getTime() + OUTBOX_ORPHAN_MS + 60_000);
  // claim fresco (reschedule pôs nextAttemptAt futuro? reschedule usa backoff; vamos reconsultar com relógio adiante)
  // A cobrança JÁ existe no provedor: findChargeByExternalReference a encontra.
  port.existingByRef = { chargeId: "pay_crashed", status: "pending" };
  // Marca a linha como PROCESSING órfã manualmente via um claim seguido de nada.
  const claimed = await repo.claimNext({ enabledProviders: ["asaas"], now: new Date(start.getTime() + 60_000), claimedBy: "t", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict });
  assert.ok(claimed);
  assert.equal(claimed.kind, "claimed");
  assert.equal(claimed.row.status, "PROCESSING");

  const before = port.created.length;
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => later, orphanMs: OUTBOX_ORPHAN_MS });
  assert.equal(result.outcomes.recovered, 1);
  assert.equal(port.created.length, before, "reconsulta não cria 2ª cobrança");
  // E6: a 1ª reconsulta é a de ANTES de criar (1ª rodada); a 2ª, a da órfã.
  assert.deepEqual(port.lookups, [STMT, STMT]);
  current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "SENT");
  assert.equal(current?.externalId, "pay_crashed");
});

test("R-OBX-1 crash + reconsulta vazia → NEEDS_REVIEW (nunca repete às cegas)", async () => {
  const start = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => start });
  const { row } = await enqueueCharge(repo, start);
  const port = new RecordingPort();
  port.existingByRef = null; // reconsulta não acha
  await repo.claimNext({ enabledProviders: ["asaas"], now: start, claimedBy: "t", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict });
  const later = new Date(start.getTime() + OUTBOX_ORPHAN_MS + 60_000);
  const audits: DispatchAuditEvent[] = [];
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => later, onAudit: async (e) => void audits.push(e) });
  assert.equal(result.outcomes.needs_review, 1);
  assert.equal(port.created.length, 0);
  const current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "NEEDS_REVIEW");
  assert.equal(audits[0]?.action, "billing_outbox.needs_review");
});

test("R-OBX-2 backoff e FAILED na 8ª falha + trilha (T-OBX-7..8)", async () => {
  let clock = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => clock });
  const { row } = await enqueueCharge(repo, clock);
  const port = new RecordingPort();
  port.nextError = new Error("boom");
  const audits: DispatchAuditEvent[] = [];

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => clock, onAudit: async (e) => void audits.push(e) });
    const current = await repo.findById(TENANT, row.id);
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
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row } = await enqueueCharge(repo, now);
  await repo.markFailed(TENANT, row.id, "boom", now);
  const reopened = await repo.retry(TENANT, row.id, now);
  assert.equal(reopened?.status, "PENDING");
  assert.equal(reopened?.attempts, 0);
  // 2º conserto (E9): o retry MANTÉM `last_error` — é a evidência de que a linha já foi tentada, que a reconsulta usa para
  // adotar a PRÓPRIA cobrança em vez de mandá-la a revisão.
  assert.equal(reopened?.lastError, "boom", "E9: o retry mantém last_error");
  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.sent, 1);
});

test("E9: retry com outra charge_create VIVA no demonstrativo → 422 charge_already_exists, e a FAILED continua FAILED (T-OBX-9b)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row: failed } = await enqueueCharge(repo, now, 1);
  await repo.markFailed(TENANT, failed.id, "boom", now);
  await enqueueCharge(repo, now, 2); // a 2ª intenção, PENDING: viva no D1
  await assert.rejects(
    repo.retry(TENANT, failed.id, now),
    (error: unknown) => error instanceof StatementError && error.statusCode === 422 && error.reason === "charge_already_exists",
    "reabrir a FAILED daria duas vivas do mesmo demonstrativo",
  );
  assert.equal((await repo.findById(TENANT, failed.id))?.status, "FAILED", "nada reaberto");
});

test("R-OBX-3 canal desligado: dispatcher não roda, linha segue PENDING (T-OBX-10)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row } = await enqueueCharge(repo, now);
  // Nenhum provedor ligado → ports vazio.
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: {}, now: () => now });
  assert.equal(result.processed, 0);
  const current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "PENDING");
});

test("R-OBX-4 provedor desligado NÃO é alcançado (T-OBX-12): 0 chamada ao Asaas, linha PENDING com skip_reason", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row: asaasRow } = await enqueueCharge(repo, now, 1, "asaas"); // Asaas DESLIGADO
  // 2º conserto (E4): a linha do Mercado Pago vai para OUTRO demonstrativo — duas `charge_create` vivas do MESMO
  // demonstrativo violam o D1 e iriam as duas a revisão; o teste mede R-OBX-4, não o par proibido.
  const { row: focusRow } = await repo.enqueue(
    { tenantId: TENANT, statementId: STMT_2, kind: "charge_create", provider: "mercadopago", seq: 2, payload: { customerId: "c", amountCents: 100, dueDate: "2026-12-10", method: "pix" } },
    now,
  );
  const mp = new RecordingPort();
  // ports só tem mercadopago ligado; Asaas nem existe no mapa → impossível alcançá-lo.
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { mercadopago: mp }, now: () => now });
  assert.equal(result.outcomes.sent, 1); // só o ligado

  const asaas = await repo.findById(TENANT, asaasRow.id);
  assert.equal(asaas?.status, "PENDING");
  assert.equal(asaas?.skipReason, "provider_disabled");
  const focus = await repo.findById(TENANT, focusRow.id);
  assert.equal(focus?.status, "SENT");
});

test("E4 (critério 2): duas charge_create PENDING do MESMO demonstrativo → as DUAS vão a NEEDS_REVIEW charge_already_exists, com attempts 0, e 0 createCharge (T-OBX-18)", async () => {
  // O par proibido do D1. Antes do 2º conserto a irmã viva era só SENT/PROCESSING: a 1ª linha saía (a irmã PENDING não
  // contava) e a 2ª ia a revisão só DEPOIS da 1ª cobrança — no Postgres, dois workers davam 2 `createCharge`.
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row: first } = await enqueueCharge(repo, now, 1);
  const { row: second } = await enqueueCharge(repo, now, 2);
  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver, ports: { asaas: port }, now: () => now });
  assert.equal(port.created.length, 0, "duas vivas do mesmo demonstrativo: NENHUMA cobrança sai");
  assert.equal(result.outcomes.needs_review, 2);
  for (const id of [first.id, second.id]) {
    const row = await repo.findById(TENANT, id);
    assert.deepEqual([row?.status, row?.lastError, row?.attempts], ["NEEDS_REVIEW", "charge_already_exists", 0], `linha ${id}`);
  }
});

test("429 → reschedule com next_attempt_at = now + retryAfter, sem FAILED", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row } = await enqueueCharge(repo, now);
  const port = new RecordingPort();
  port.nextError = new ProviderRateLimitedError(2000);
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.rate_limited, 1);
  const current = await repo.findById(TENANT, row.id);
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

// ---------------------------------------------------------------------------------------------------------------------
// R-OBX-5 (D2) — conserto J-522 (achado C2-01): cobrança parada NUNCA sai de demonstrativo que mudou. Forma comum dos
// quatro: demonstrativo `closed` R$ 100 com `chargeStatus: "none"` (ao fechar, a cobrança ainda não existe); outbox ligada
// ao demonstrativo REAL (`findStatement`) e à tabela de cobranças (`findLive`); `enqueue charge_create seq 1`; o
// demonstrativo MUDA pelo `StatementService` real; o dispatcher roda com a porta que grava chamadas.
// Vermelho-controle: no objeto `92d644db` (claim sem releitura) os quatro cobram — `createCharge` 1× e linha SENT.
// Mutação literal do plano: `chargeCreateClaimVerdict` devolvendo `eligible` sempre → 13, 14, 15 e a metade "cobrança
// viva" do 16 vermelhos; `reopen()` sem o guard → 16 vermelho; sem a linha `reopenedAt > occurredAt` → o braço
// "refechado" do 15 vermelho.
// ---------------------------------------------------------------------------------------------------------------------

const ACTOR = "33333333-3333-3333-3333-333333333333";
const inputsStub = { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) };

type Obx5Harness = {
  readonly statements: InMemoryStatementRepository;
  readonly charges: InMemoryStatementChargeRepository;
  readonly service: StatementService;
  readonly outbox: InMemoryOutboxRepository;
  readonly statementId: string;
  readonly rowId: string;
  readonly port: RecordingPort;
  readonly audits: DispatchAuditEvent[];
};

/** Demonstrativo `closed` R$ 100 + linha `charge_create` PENDING enfileirada em `t0`, tudo ligado ao serviço REAL. */
async function obx5Harness(t0: Date): Promise<Obx5Harness> {
  const statements = new InMemoryStatementRepository(() => t0);
  const charges = new InMemoryStatementChargeRepository();
  const outbox = new InMemoryOutboxRepository({
    readStatement: async (tenantId, statementId) => {
      const current = await statements.findStatement(tenantId, statementId);
      return current && { status: current.status, reopenedAt: current.reopenedAt, hasLiveCharge: (await charges.findLive(tenantId, statementId)) !== undefined };
    },
    clock: () => t0,
  });
  // D2 (iv): o guard que `reopen()` consulta — adaptador trivial sobre `listByStatement` (em produção, a 08b liga o Prisma).
  const guard: OutboxStatementGuard = {
    hasNeedsReview: async (tenantId, statementId) => (await outbox.listByStatement(tenantId, statementId)).some((row) => row.status === "NEEDS_REVIEW"),
  };
  const service = new StatementService(statements, inputsStub, { record: async () => {} }, guard);
  const statement = await statements.transaction(TENANT, async (tx) => {
    const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
    return tx.saveStatement({ ...fresh, status: "closed", chargeStatus: "none", totalCents: 10000, dueDate: "2026-12-10", closedAt: t0 });
  });
  const { row } = await outbox.enqueue(
    { tenantId: TENANT, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: { customerId: "cus_1", amountCents: 10000, dueDate: "2026-12-10", method: "pix" } },
    t0,
  );
  return { statements, charges, service, outbox, statementId: statement.id, rowId: row.id, port: new RecordingPort(), audits: [] };
}

function dispatch(h: Obx5Harness, now: Date) {
  return runDispatchOutbox({ repo: h.outbox, ports: { asaas: h.port }, resolveCustomer: okResolver, now: () => now, onAudit: async (event) => void h.audits.push(event) });
}

test("R-OBX-5 baixa manual TOTAL depois de enfileirada → SKIPPED statement_paid, 0 chamadas; o retry revalida igual (T-OBX-13)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const h = await obx5Harness(t0);
  const { statement } = await h.service.recordManualPayment({ tenantId: TENANT, statementId: h.statementId, amountCents: 10000, method: "pix", note: null, actorId: ACTOR, now: t1 });
  assert.equal(statement.status, "paid");

  const result = await dispatch(h, t1);
  assert.equal(h.port.created.length, 0, "demonstrativo pago: NENHUMA cobrança sai para o provedor");
  assert.equal(result.outcomes.skipped, 1);
  assert.equal(result.outcomes.sent, 0);
  const row = await h.outbox.findById(TENANT, h.rowId);
  assert.equal(row?.status, "SKIPPED");
  assert.equal(row?.skipReason, "statement_paid");
  assert.equal(row?.attempts, 0, "pulada pela política: não conta tentativa");
  assert.equal(row?.claimedAt, null, "pulada pela política: nunca foi reclamada");

  // Braço do retry — D2 (ii): "o retry revalida como o claim". FAILED → retry → PENDING em demonstrativo pago → não sai.
  const r = await obx5Harness(t0);
  await r.outbox.markFailed(TENANT, r.rowId, "boom", t0);
  await r.service.recordManualPayment({ tenantId: TENANT, statementId: r.statementId, amountCents: 10000, method: "pix", note: null, actorId: ACTOR, now: t1 });
  assert.equal((await r.outbox.retry(TENANT, r.rowId, t1))?.status, "PENDING");
  const retried = await dispatch(r, t1);
  assert.equal(r.port.created.length, 0, "retry em demonstrativo pago: 0 chamadas");
  assert.equal(retried.outcomes.skipped, 1);
  assert.equal((await r.outbox.findById(TENANT, r.rowId))?.skipReason, "statement_paid");
});

test("R-OBX-5 cancelamento depois de enfileirada → SKIPPED statement_cancelled, 0 chamadas (T-OBX-14)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const h = await obx5Harness(t0);
  const cancelled = await h.service.cancel({ tenantId: TENANT, statementId: h.statementId, reason: "cliente encerrou o contrato", actorId: ACTOR, now: t1 });
  assert.equal(cancelled.status, "cancelled");

  const result = await dispatch(h, t1);
  assert.equal(h.port.created.length, 0, "demonstrativo cancelado: NENHUMA cobrança sai");
  assert.equal(result.outcomes.skipped, 1);
  const row = await h.outbox.findById(TENANT, h.rowId);
  assert.equal(row?.status, "SKIPPED");
  assert.equal(row?.skipReason, "statement_cancelled");
});

test("R-OBX-5 reabertura depois de enfileirada → SKIPPED statement_reopened; REFECHADO com total novo → ainda não sai (T-OBX-15)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const t2 = new Date(t0.getTime() + 120_000);
  const h = await obx5Harness(t0);
  const reopened = await h.service.reopen({ tenantId: TENANT, statementId: h.statementId, reason: "recalcular o uso do mês", actorId: ACTOR, now: t1 });
  assert.equal(reopened.status, "reopened");

  const result = await dispatch(h, t1);
  assert.equal(h.port.created.length, 0, "demonstrativo reaberto: NENHUMA cobrança sai");
  assert.equal(result.outcomes.skipped, 1);
  const row = await h.outbox.findById(TENANT, h.rowId);
  assert.equal(row?.status, "SKIPPED");
  assert.equal(row?.skipReason, "statement_reopened");

  // Braço do refechamento: reopen (t1) → refechado `closed` com total NOVO (t2); `reopenedAt` é preservado pelo fechamento.
  // A linha antiga carrega o `amountCents` do fechamento desfeito: `reopened_at > occurred_at` → não sai (payload velho).
  const r = await obx5Harness(t0);
  await r.service.reopen({ tenantId: TENANT, statementId: r.statementId, reason: "recalcular o uso do mês", actorId: ACTOR, now: t1 });
  const reclosed = await r.statements.transaction(TENANT, async (tx) => {
    const current = (await tx.lockById(r.statementId))!;
    return tx.saveStatement({ ...current, status: "closed", totalCents: 8000, closedAt: t2 });
  });
  assert.equal(reclosed.status, "closed");
  assert.equal(reclosed.reopenedAt?.getTime(), t1.getTime(), "o fechamento preserva reopened_at");
  const reclosedRun = await dispatch(r, t2);
  assert.equal(r.port.created.length, 0, "refechado com total novo: a linha VELHA (R$ 100) nunca sai");
  assert.equal(reclosedRun.outcomes.skipped, 1);
  assert.equal((await r.outbox.findById(TENANT, r.rowId))?.skipReason, "statement_reopened");
});

test("R-OBX-5 linha NEEDS_REVIEW → reopen recusa 422 outbox_needs_review; cobrança VIVA → NEEDS_REVIEW charge_already_exists, 0 chamadas (T-OBX-16)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);

  // D2 (iv): a linha está em revisão → reabrir é recusado; o demonstrativo continua `closed`.
  const h = await obx5Harness(t0);
  await h.outbox.markNeedsReview(TENANT, h.rowId, "orphan_recovery_not_found", t0);
  await assert.rejects(
    h.service.reopen({ tenantId: TENANT, statementId: h.statementId, reason: "recalcular o uso do mês", actorId: ACTOR, now: t1 }),
    (error: unknown) => error instanceof StatementError && error.statusCode === 422 && error.reason === "outbox_needs_review",
  );
  assert.equal((await h.statements.findStatement(TENANT, h.statementId))?.status, "closed");

  // Cobrança viva já existente (E3): não é SKIPPED (a M5 não tem motivo para isso) — vai a NEEDS_REVIEW com last_error, sem rede.
  const c = await obx5Harness(t0);
  await c.charges.insert({ tenantId: TENANT, statementId: c.statementId, provider: "asaas", externalChargeId: "pay_live", status: "pending", payUrl: "https://pay.example/live", dueDate: "2026-12-10" }, t0);
  const result = await dispatch(c, t1);
  assert.equal(c.port.created.length, 0, "cobrança viva: NENHUMA segunda cobrança sai");
  assert.equal(result.outcomes.needs_review, 1);
  assert.equal(result.outcomes.sent, 0);
  const row = await c.outbox.findById(TENANT, c.rowId);
  assert.equal(row?.status, "NEEDS_REVIEW");
  assert.equal(row?.lastError, "charge_already_exists");
  assert.equal(row?.skipReason, null, "sem skip_reason novo: a lista da M5 é fechada");
  assert.deepEqual(c.audits.map((event) => [event.action, event.code]), [["billing_outbox.needs_review", "charge_already_exists"]]);
});

// ---------------------------------------------------------------------------------------------------------------------
// T-OBX-17 — E6′/E7′ (2º conserto do #522, plano §3 critério 3 + §13.1): nenhuma cobrança criada nem adotada às cegas.
// A reconsulta vem SEMPRE antes de criar (depois do gate do perfil); a cobrança achada só é ADOTADA com U (a linha é a
// única `charge_create` que o demonstrativo já teve, em qualquer status) e V (fechamento vigente, com o total igual ao
// valor da linha), e na retentativa só se a própria linha já foi tentada. A órfã aplica a mesma régua.
// Vermelho-controle: no objeto `807deb7e` não há reconsulta antes de criar (o braço 1 dá 2 `createCharge`) e a órfã adota
// a fantasma do fechamento desfeito (ATK-8).
// Mutações literais: M3a (sem a reconsulta antes de criar) → braço 1; M3d′ (a órfã adota sem `adoptionDecision`) →
// braços 7, 12 e 13; M3e (reconsulta antes do gate do perfil) → braço 6; M3f (U trocado pela régua anterior, irmã
// "tentada") → braços 11 e 12.
// ---------------------------------------------------------------------------------------------------------------------

const COMPLETE_PROFILE = {
  legalName: "Org X",
  document: "11222333000181",
  email: "f@x.com",
  address: { postalCode: "01001000", street: "R", number: "1", district: "C", city: "SP", cityIbge: "3550308", state: "SP" },
  paymentMethod: "pix" as const,
};

type ChargeArm = {
  readonly statements: InMemoryStatementRepository;
  readonly outbox: InMemoryOutboxRepository;
  readonly intents: InMemoryChargeIntentRepository;
  readonly statementId: string;
  readonly port: RecordingPort;
  readonly audits: DispatchAuditEvent[];
};

/** Demonstrativo `closed` com o leitor REAL (status, reabertura e total — o V da adoção). */
async function chargeArm(t0: Date, options: { readonly totalCents?: number; readonly readerWithTotal?: boolean } = {}): Promise<ChargeArm> {
  const statements = new InMemoryStatementRepository(() => t0);
  const charges = new InMemoryStatementChargeRepository();
  const refs = new InMemoryStatementRefRepository();
  const outbox = new InMemoryOutboxRepository({
    readStatement: async (tenantId, statementId) => {
      const current = await statements.findStatement(tenantId, statementId);
      if (!current) return undefined;
      const base = { status: current.status, reopenedAt: current.reopenedAt, hasLiveCharge: (await charges.findLive(tenantId, statementId)) !== undefined };
      return options.readerWithTotal === false ? base : { ...base, totalCents: current.totalCents };
    },
    clock: () => t0,
  });
  const statement = await statements.transaction(TENANT, async (tx) => {
    const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
    return tx.saveStatement({ ...fresh, status: "closed", chargeStatus: "none", totalCents: options.totalCents ?? 10000, dueDate: "2026-12-10", closedAt: t0 });
  });
  const intents = new InMemoryChargeIntentRepository({ statements, charges, outbox, refs });
  return { statements, outbox, intents, statementId: statement.id, port: new RecordingPort(), audits: [] };
}

function requestIntent(arm: ChargeArm, now: Date, amountCents: number) {
  return requestChargeCreate({ intents: arm.intents }, { tenantId: TENANT, statementId: arm.statementId, provider: "asaas", payload: { amountCents, dueDate: "2026-12-10", method: "pix" }, now });
}

function dispatchArm(arm: ChargeArm, now: Date, resolveCustomer: DispatcherDeps["resolveCustomer"] = okResolver) {
  return runDispatchOutbox({ repo: arm.outbox, ports: { asaas: arm.port }, resolveCustomer, now: () => now, onAudit: async (event) => void arm.audits.push(event) });
}

/** Muda o demonstrativo direto no dublê (reabrir/refechar; o serviço não é o objeto deste teste). */
async function setStatement(arm: ChargeArm, patch: Partial<Pick<SubscriptionStatement, "status" | "reopenedAt" | "totalCents" | "closedAt">>) {
  await arm.statements.transaction(TENANT, async (tx) => {
    const current = (await tx.lockById(arm.statementId))!;
    return tx.saveStatement({ ...current, ...patch });
  });
}

/** O worker que morre DEPOIS do claim: a linha fica PROCESSING com `attemptStartedAt = at`. */
async function claimAndDie(arm: ChargeArm, at: Date) {
  const claimed = await arm.outbox.claimNext({ enabledProviders: ["asaas"], now: at, claimedBy: "dead-worker", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict });
  assert.equal(claimed?.kind, "claimed", "o worker reclamou a linha antes de morrer");
  return claimed!.row;
}

const minutes = (base: Date, n: number) => new Date(base.getTime() + n * 60_000);
const afterOrphan = (base: Date) => new Date(base.getTime() + OUTBOX_ORPHAN_MS + 60_000);

/** Braços 4–7: R0 cria e PERDE a resposta (a cobrança-fantasma de R$ 100 fica no provedor), o demonstrativo é reaberto
 * (R0 vai a SKIPPED statement_reopened pelo claim) e refechado com R$ 150; nasce R1. */
async function phantomOfUndoneClosing(t0: Date) {
  const arm = await chargeArm(t0);
  const r0 = await requestIntent(arm, t0, 10000);
  arm.port.createScript.push("lost");
  await dispatchArm(arm, t0);
  assert.equal(arm.port.stored.length, 1, "a fantasma existe no provedor");
  await setStatement(arm, { status: "reopened", reopenedAt: minutes(t0, 2) });
  await dispatchArm(arm, minutes(t0, 3)); // R0 relida no claim: reaberto → SKIPPED
  assert.equal((await arm.outbox.findById(TENANT, r0.id))?.status, "SKIPPED");
  await setStatement(arm, { status: "closed", totalCents: 15000, closedAt: minutes(t0, 4) });
  const r1 = await requestIntent(arm, minutes(t0, 5), 15000);
  assert.ok(r1.idempotencyKey.endsWith(":2"), "R1 é a 2ª intenção do demonstrativo");
  return { arm, r1, t1: minutes(t0, 5) };
}

test("E6′/E7′: nenhuma cobrança criada nem adotada às cegas (T-OBX-17, braços 1–8 e 11–14)", async (t) => {
  const t0 = new Date("2026-12-01T12:00:00Z");

  await t.test("braço 1 — a 1ª chamada cria e PERDE a resposta: a 2ª rodada reconsulta, ADOTA a própria e não recria", async () => {
    const arm = await chargeArm(t0);
    const row = await requestIntent(arm, t0, 10000);
    arm.port.createScript.push("lost");
    await dispatchArm(arm, t0);
    assert.equal((await arm.outbox.findById(TENANT, row.id))?.status, "PENDING", "resposta perdida → reagendada");
    const second = await dispatchArm(arm, minutes(t0, 2));
    assert.equal(arm.port.created.length, 1, "1 createCharge no total, nunca 2");
    assert.equal(arm.port.stored.length, 1, "1 cobrança no provedor");
    assert.equal(second.outcomes.recovered, 1);
    const final = await arm.outbox.findById(TENANT, row.id);
    assert.deepEqual([final?.status, final?.externalId], ["SENT", "pay_1"]);
  });

  await t.test("braço 2 — 5xx e 429 que NÃO criaram (e 5xx no ensureCustomer): a rodada seguinte cria uma vez só", async () => {
    for (const failure of ["5xx", "429", "ensure-5xx"] as const) {
      const arm = await chargeArm(t0);
      const row = await requestIntent(arm, t0, 10000);
      if (failure === "ensure-5xx") arm.port.ensureScript.push("5xx");
      else arm.port.createScript.push(failure);
      const resolver = profileCustomerResolver(async () => COMPLETE_PROFILE);
      await dispatchArm(arm, t0, resolver);
      assert.equal(arm.port.stored.length, 0, `${failure}: nada criado no provedor`);
      await dispatchArm(arm, minutes(t0, 2), resolver);
      assert.equal(arm.port.stored.length, 1, `${failure}: 1 cobrança no provedor`);
      assert.equal((await arm.outbox.findById(TENANT, row.id))?.status, "SENT");
    }
  });

  await t.test("braço 3 — caminho comum: 1 reconsulta e 1 createCharge", async () => {
    const arm = await chargeArm(t0);
    await requestIntent(arm, t0, 10000);
    const run = await dispatchArm(arm, t0);
    assert.equal(run.outcomes.sent, 1);
    assert.deepEqual(arm.port.lookups, [arm.statementId], "1 reconsulta antes de criar");
    assert.equal(arm.port.created.length, 1);
  });

  await t.test("braço 4 — irmã: a fantasma do fechamento desfeito NÃO é adotada por R1 (charge_found_for_previous_intent), 1 createCharge no total", async () => {
    const { arm, r1, t1 } = await phantomOfUndoneClosing(t0);
    await dispatchArm(arm, t1);
    const final = await arm.outbox.findById(TENANT, r1.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "charge_found_for_previous_intent", null]);
    assert.equal(arm.port.created.length, 1, "só o POST de R0, nunca um 2º");
    assert.ok(arm.audits.some((event) => event.action === "billing_outbox.needs_review" && event.code === "charge_found_for_previous_intent"));
  });

  await t.test("braço 5 — ATK-2b: o braço 4 com 5xx na 1ª reconsulta de R1 → revisão, nenhuma adoção", async () => {
    const { arm, r1, t1 } = await phantomOfUndoneClosing(t0);
    arm.port.lookupScript.push("5xx");
    await dispatchArm(arm, t1);
    assert.equal((await arm.outbox.findById(TENANT, r1.id))?.status, "PENDING", "5xx na reconsulta → reagendada, sem criar");
    await dispatchArm(arm, minutes(t1, 2));
    const final = await arm.outbox.findById(TENANT, r1.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "charge_found_for_previous_intent", null]);
    assert.equal(arm.port.created.length, 1);
  });

  await t.test("braço 6 — ATK-6: perfil incompleto com irmã tentada → 0 reconsulta, 0 ensureCustomer, 0 createCharge na rodada de R1", async () => {
    const { arm, r1, t1 } = await phantomOfUndoneClosing(t0);
    const before = { lookups: arm.port.lookups.length, ensured: arm.port.ensured.length, created: arm.port.created.length };
    await dispatchArm(arm, t1, profileCustomerResolver(async () => null));
    assert.deepEqual(
      { lookups: arm.port.lookups.length - before.lookups, ensured: arm.port.ensured.length - before.ensured, created: arm.port.created.length - before.created },
      { lookups: 0, ensured: 0, created: 0 },
      "o gate do perfil vem ANTES de qualquer chamada ao provedor (R-PRF-1)",
    );
    assert.match((await arm.outbox.findById(TENANT, r1.id))?.lastError ?? "", /^billing_profile_missing:/);
  });

  await t.test("braço 7 — ATK-8: a ÓRFÃ R1 acha a fantasma do fechamento desfeito → orphan_found_previous_intent, nunca adota", async () => {
    const { arm, r1, t1 } = await phantomOfUndoneClosing(t0);
    await claimAndDie(arm, t1);
    const run = await dispatchArm(arm, afterOrphan(t1));
    assert.equal(run.outcomes.recovered, 0);
    const final = await arm.outbox.findById(TENANT, r1.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "orphan_found_previous_intent", null]);
    assert.equal(arm.port.created.length, 1);
  });

  await t.test("braço 8 — ATK-8b (R-OBX-1): a órfã ÚNICA do fechamento vigente acha a PRÓPRIA cobrança → recovered", async () => {
    const arm = await chargeArm(t0);
    const row = await requestIntent(arm, t0, 10000);
    await claimAndDie(arm, t0);
    arm.port.stored.push({ chargeId: "pay_own", ref: arm.statementId, amountCents: 10000, status: "pending" }); // o POST do worker que morreu
    const run = await dispatchArm(arm, afterOrphan(t0));
    assert.equal(run.outcomes.recovered, 1);
    const final = await arm.outbox.findById(TENANT, row.id);
    assert.deepEqual([final?.status, final?.externalId], ["SENT", "pay_own"]);
    assert.equal(arm.port.created.length, 0);
  });

  /** As fotos com a evidência APAGADA (L1/L2 do crítico): R0 `SKIPPED` com attempts 0 e last_error nulo, a fantasma de
   * R$ 100 no provedor; refechado com R$ 150 → R1. A régua U não depende desses campos. */
  async function erasedEvidence() {
    const arm = await chargeArm(t0);
    const r0 = await requestIntent(arm, t0, 10000);
    await arm.outbox.markSkipped(TENANT, r0.id, "statement_reopened", t0);
    arm.port.stored.push({ chargeId: "pay_phantom", ref: arm.statementId, amountCents: 10000, status: "pending" });
    await setStatement(arm, { status: "closed", reopenedAt: minutes(t0, 1), totalCents: 15000, closedAt: minutes(t0, 2) });
    const r1 = await requestIntent(arm, minutes(t0, 3), 15000);
    return { arm, r1, t1: minutes(t0, 3) };
  }

  await t.test("braço 11 — L1: evidência da irmã apagada + 5xx na 1ª reconsulta → charge_found_for_previous_intent, 0 createCharge", async () => {
    const { arm, r1, t1 } = await erasedEvidence();
    arm.port.lookupScript.push("5xx");
    await dispatchArm(arm, t1);
    await dispatchArm(arm, minutes(t1, 2));
    const final = await arm.outbox.findById(TENANT, r1.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "charge_found_for_previous_intent", null]);
    assert.equal(arm.port.created.length, 0);
  });

  await t.test("braço 12 — L2: a órfã R1 × a mesma fantasma, com a evidência da irmã apagada → orphan_found_previous_intent", async () => {
    const { arm, r1, t1 } = await erasedEvidence();
    await claimAndDie(arm, t1);
    await dispatchArm(arm, afterOrphan(t1));
    const final = await arm.outbox.findById(TENANT, r1.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "orphan_found_previous_intent", null]);
    assert.equal(arm.port.created.length, 0);
  });

  await t.test("braço 13 — L5: órfã de linha ÚNICA, demonstrativo reaberto DEPOIS dela e refechado com R$ 150 sem intenção nova → orphan_found_stale_closing", async () => {
    const arm = await chargeArm(t0);
    const row = await requestIntent(arm, t0, 10000);
    await claimAndDie(arm, t0);
    arm.port.stored.push({ chargeId: "pay_own", ref: arm.statementId, amountCents: 10000, status: "pending" });
    await setStatement(arm, { status: "closed", reopenedAt: minutes(t0, 1), totalCents: 15000, closedAt: minutes(t0, 2) });
    await dispatchArm(arm, afterOrphan(t0));
    const final = await arm.outbox.findById(TENANT, row.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "orphan_found_stale_closing", null]);
  });

  await t.test("braço 14 — leitor SEM totalCents: o dublê falha fechado (*_stale_closing), na órfã e na retentativa", async () => {
    const orphanArm = await chargeArm(t0, { readerWithTotal: false });
    const orphanRow = await requestIntent(orphanArm, t0, 10000);
    await claimAndDie(orphanArm, t0);
    orphanArm.port.stored.push({ chargeId: "pay_own", ref: orphanArm.statementId, amountCents: 10000, status: "pending" });
    await dispatchArm(orphanArm, afterOrphan(t0));
    assert.equal((await orphanArm.outbox.findById(TENANT, orphanRow.id))?.lastError, "orphan_found_stale_closing");

    const retryArm = await chargeArm(t0, { readerWithTotal: false });
    const retryRow = await requestIntent(retryArm, t0, 10000);
    retryArm.port.createScript.push("lost");
    await dispatchArm(retryArm, t0);
    await dispatchArm(retryArm, minutes(t0, 2));
    assert.equal((await retryArm.outbox.findById(TENANT, retryRow.id))?.lastError, "charge_found_stale_closing");
    assert.equal(retryArm.port.created.length, 1, "nunca recria");
  });
});

test("U da adoção: nenhum código de src/ apaga linha de billing_outbox (T-OBX-NODEL)", () => {
  // A régua U (a linha é a ÚNICA `charge_create` do demonstrativo) depende de nenhuma linha da fila ser apagada; a FK é
  // ON DELETE RESTRICT. Mutação literal M3i: um `DELETE FROM billing_outbox` num método de `outbox.prisma.ts` → vermelho.
  const root = fileURLToPath(new URL("../src/", import.meta.url));
  const offenders: string[] = [];
  const pattern = /DELETE\s+FROM\s+"?billing_outbox"?|billingOutbox\s*\.\s*delete(Many)?\s*\(/i;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && pattern.test(readFileSync(full, "utf8"))) offenders.push(path.relative(root, full));
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], "nenhuma linha da fila é apagada");
});

// T-OBX-17, braços 9 e 10 (F6: dependem do retry guardado do E9, que MANTÉM `last_error`). Mutação literal M3b (o retry
// volta a apagar `last_error`) → braço 9 vermelho (a própria cobrança vai a `charge_found_unknown_origin`) e T-OBX-9.
test("E9 × E6′: o retry não apaga a evidência de que a linha já foi tentada (T-OBX-17, braços 9 e 10)", async (t) => {
  const t0 = new Date("2026-12-01T12:00:00Z");

  await t.test("braço 9 — resposta perdida → FAILED → retry → a rodada ADOTA a própria (last_error mantido pelo retry), 1 createCharge", async () => {
    const arm = await chargeArm(t0);
    const row = await requestIntent(arm, t0, 10000);
    arm.port.createScript.push("lost");
    await dispatchArm(arm, t0);
    await arm.outbox.markFailed(TENANT, row.id, "provider_timeout", minutes(t0, 1));
    assert.equal((await arm.outbox.retry(TENANT, row.id, minutes(t0, 2)))?.status, "PENDING");
    const run = await dispatchArm(arm, minutes(t0, 2));
    assert.equal(arm.port.created.length, 1, "nunca recria");
    assert.equal(run.outcomes.recovered, 1);
    const final = await arm.outbox.findById(TENANT, row.id);
    assert.deepEqual([final?.status, final?.externalId], ["SENT", "pay_1"]);
  });

  await t.test("braço 10 — ATK-2d: R0 perdida → FAILED → retry → reaberto e refechado → 5xx na 1ª reconsulta de R1 → revisão, nenhuma adoção", async () => {
    const arm = await chargeArm(t0);
    const r0 = await requestIntent(arm, t0, 10000);
    arm.port.createScript.push("lost");
    await dispatchArm(arm, t0);
    await arm.outbox.markFailed(TENANT, r0.id, "provider_timeout", minutes(t0, 1));
    await arm.outbox.retry(TENANT, r0.id, minutes(t0, 1));
    await setStatement(arm, { status: "reopened", reopenedAt: minutes(t0, 2) });
    await dispatchArm(arm, minutes(t0, 3)); // R0 reaberta pelo retry, relida no claim → SKIPPED
    assert.equal((await arm.outbox.findById(TENANT, r0.id))?.status, "SKIPPED");
    await setStatement(arm, { status: "closed", totalCents: 15000, closedAt: minutes(t0, 4) });
    const r1 = await requestIntent(arm, minutes(t0, 5), 15000);
    arm.port.lookupScript.push("5xx");
    await dispatchArm(arm, minutes(t0, 5));
    await dispatchArm(arm, minutes(t0, 7));
    const final = await arm.outbox.findById(TENANT, r1.id);
    assert.deepEqual([final?.status, final?.lastError, final?.externalId], ["NEEDS_REVIEW", "charge_found_for_previous_intent", null]);
    assert.equal(arm.port.created.length, 1, "só o POST de R0");
  });
});
