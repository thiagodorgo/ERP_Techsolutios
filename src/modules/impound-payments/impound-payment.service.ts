import { env } from "../../config/env.js";
import { assertRowsBelongToTenant } from "../../database/rls.js";
import { ChargeService, getMemoryChargeRepositoryForTests } from "../charging/charge.service.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { getMemoryReleaseRepositoryForTests } from "../release/release.service.js";
import type { TariffResolver } from "../tariffs/tariff-resolution.js";
import {
  InMemoryImpoundPaymentRepository,
  type ImpoundPaymentRepository,
  type MemoryImpoundPaymentSources,
} from "./impound-payment.repository.js";
import {
  HELD_FUNDS_STATUSES,
  ImpoundPaymentError,
  LIVE_INTENT_STATUSES,
  LIVE_LINK_STATUSES,
  PAYMENT_METHODS,
  type ImpoundPaymentActorContext,
  type ImpoundPaymentIntent,
  type OnlinePaymentChannelGate,
  type PaymentConnectionPort,
} from "./impound-payment.types.js";
import { assertIntentAccount, parseCreateIntentBody, parseRequiredUuid } from "./impound-payment.validators.js";

// B-PATIO-REC-01 (plano v3 §5.2; emenda §3.1, §10.1) — a criação da intenção e as leituras. SEM REDE: a cobrança no
// provedor nasce no REC-02a, pelo despachante da fila; aqui só se grava a intenção, a referência e a linha da fila.

// L4/Q7 — validade de 24 h. A vigilância `open` reconsulta a cada 30 min (v3 §4.2).
export const ONLINE_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;
export const OPEN_WATCH_INTERVAL_MS = 30 * 60 * 1000;

const INTENTS_TABLE = "impound_payment_intents";

// Portas com PADRÃO FAIL-CLOSED (v3 §9.1): sem o REC-04, a organização não tem modo → 422 `payment_mode_unset`; sem o
// REC-02a, o canal está desligado → 422 `channel_disabled`. O padrão RECUSA; não é "noop".
export const REFUSING_PAYMENT_CONNECTION_PORT: PaymentConnectionPort = {
  async resolve() {
    return { ok: false, reason: "payment_mode_unset" };
  },
};

export const CLOSED_CHANNEL_GATE: OnlinePaymentChannelGate = {
  async isEnabled() {
    return false;
  },
};

export class ImpoundPaymentService {
  constructor(
    private readonly repository: ImpoundPaymentRepository,
    private readonly connections: PaymentConnectionPort = REFUSING_PAYMENT_CONNECTION_PORT,
    private readonly gate: OnlinePaymentChannelGate = CLOSED_CHANNEL_GATE,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  // POST /impound-processes/:id/online-payment — v3 §5.2, em ordem. (a) e (b) fora da trava; (c) a (g) sob a trava do
  // processo, no mesmo `tx`. A organização vem SÓ do ator autenticado (R-ISO).
  async create(actor: ImpoundPaymentActorContext, processId: string, body: unknown): Promise<ImpoundPaymentIntent> {
    const tenantId = actor.tenantId;
    const normalizedId = parseRequiredUuid(processId, "processId");
    const input = parseCreateIntentBody(body);

    // (a) canal ligado.
    if (!(await this.gate.isEnabled(tenantId))) {
      throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_UNAVAILABLE", "channel_disabled", "Online payment is not enabled.");
    }

    // (b) resolução da conta (fail-closed). A conta tem de ser a da organização ou a do grupo dela; nunca a da plataforma.
    const resolution = await this.connections.resolve(tenantId);
    if (!resolution.ok) {
      throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_UNAVAILABLE", resolution.reason, "Online payment is not available for this organization.");
    }
    const account = resolution.account;
    assertIntentAccount(account);

    const now = this.clock();
    const created = await this.repository.withProcessLock(tenantId, normalizedId, async (scope) => {
      // (c) processo em liberação, com dossiê STANDARD ativo (L1/Q1: a cobrança on-line só nasce depois do Salto A).
      const state = await scope.loadReleaseState();
      if (!state || state.processStatus !== "RELEASE_IN_PROGRESS" || state.activeReleaseKind !== "STANDARD") {
        throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "release_not_started", "The release of this process has not started.");
      }

      // (d) devido CAPADO ao teto (§5.1). Diária acima do teto não reconciliada → um único valor público por débito (L16).
      const due = await scope.settleableDue();
      if (!due) {
        throw notFound();
      }
      if (due.overAccruedUnreconciled) {
        throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "reconciliation_pending", "The stay charges must be reconciled before charging online.");
      }
      if (due.dueCents <= 0) {
        throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "nothing_due", "There is nothing due for this process.");
      }

      // (e) nenhuma intenção viva no processo (§4.2, §4.8). Regra da APLICAÇÃO, sob a trava; a UNIQUE do banco cobre só o
      // link aberto.
      const siblings = await scope.listByProcess();
      assertRowsBelongToTenant(siblings, tenantId, INTENTS_TABLE);
      const live = siblings.filter((intent) => (LIVE_INTENT_STATUSES as readonly string[]).includes(intent.status));
      if (live.some((intent) => (LIVE_LINK_STATUSES as readonly string[]).includes(intent.status))) {
        throw new ImpoundPaymentError(409, "ONLINE_PAYMENT_CONFLICT", "payment_already_pending", "There is already an open payment link for this process.");
      }
      if (live.some((intent) => (HELD_FUNDS_STATUSES as readonly string[]).includes(intent.status))) {
        throw new ImpoundPaymentError(409, "ONLINE_PAYMENT_CONFLICT", "held_funds_pending", "Resolve the held funds of this process before charging again.");
      }

      // (f) a conta resolvida tem os três meios (P-REC-1).
      if (!PAYMENT_METHODS.every((method) => resolution.methods.includes(method))) {
        throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_UNAVAILABLE", "payment_methods_insufficient", "The payment account does not offer Pix, credit and debit.");
      }

      // (g) intenção `pending` + referência global + linha da fila, no mesmo `tx`. Corpo da fila: só ids e a referência
      // tipada; nada de segredo nem de `split` (R-KEEP-5).
      const intent = await scope.insertIntent({
        tenantId,
        processId: normalizedId,
        amountCents: due.dueCents,
        currency: due.currency,
        methods: input.methods,
        payerName: input.payerName,
        payerDocument: input.payerDocument,
        provider: resolution.provider,
        account,
        expiresAt: new Date(now.getTime() + ONLINE_PAYMENT_TTL_MS),
        actorId: actor.userId,
        occurredAt: now,
      });
      await scope.insertRef({
        intentId: intent.id,
        tenantId,
        provider: resolution.provider,
        account,
        watch: "open",
        nextCheckAt: new Date(now.getTime() + OPEN_WATCH_INTERVAL_MS),
      });
      await scope.enqueue({ kind: "patio_charge_create", tenantId, intentId: intent.id, reference: `patio:${intent.id}` });
      return intent;
    });
    if (!created) {
      throw notFound();
    }
    return created;
  }

  // GET /impound-processes/:id/online-payment — a intenção viva (ou nula).
  async getLive(actor: Pick<ImpoundPaymentActorContext, "tenantId">, processId: string): Promise<ImpoundPaymentIntent | null> {
    const intents = await this.list(actor, processId);
    const live = intents.filter((intent) => (LIVE_INTENT_STATUSES as readonly string[]).includes(intent.status));
    return live.at(-1) ?? null;
  }

  // GET /impound-processes/:id/online-payments — o histórico. Processo de outra organização → 404 (R-ISO).
  async list(actor: Pick<ImpoundPaymentActorContext, "tenantId">, processId: string): Promise<readonly ImpoundPaymentIntent[]> {
    const tenantId = actor.tenantId;
    const normalizedId = parseRequiredUuid(processId, "processId");
    if (!(await this.repository.processExists(tenantId, normalizedId))) {
      throw notFound();
    }
    const intents = await this.repository.listByProcess(tenantId, normalizedId);
    assertRowsBelongToTenant(intents, tenantId, INTENTS_TABLE);
    return intents;
  }
}

function notFound(): ImpoundPaymentError {
  return new ImpoundPaymentError(404, "ONLINE_PAYMENT_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
}

// ── runtime (env-gate memory × prisma), espelha charging/release ─────────────────────────────────────────────

// O devido nunca resolve tarifa (getSettleableDueCents só lê o ledger). Se algo resolvesse, este resolvedor falha fechado:
// sem tarifa, o motor não cria diária de valor 0 (charge.service.ts, F7). H5 da v3.
const NO_TARIFF: TariffResolver = async () => undefined;

export type ImpoundPaymentPorts = {
  readonly connections?: PaymentConnectionPort;
  readonly gate?: OnlinePaymentChannelGate;
  readonly clock?: () => Date;
};

function memorySources(): MemoryImpoundPaymentSources {
  const charges = new ChargeService(getMemoryChargeRepositoryForTests(), NO_TARIFF);
  return {
    processState: async (tenantId, processId) => {
      const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, processId);
      if (!process) return undefined;
      const view = await getMemoryReleaseRepositoryForTests().getActiveReleaseView(tenantId, processId);
      return { processStatus: process.status, activeReleaseKind: view?.release.kind };
    },
    settleableDue: (tenantId, processId) => charges.getSettleableDueCents(tenantId, processId),
  };
}

const memoryRepository = new InMemoryImpoundPaymentRepository(memorySources());
let defaultServicePromise: Promise<ImpoundPaymentService> | undefined;

export function createMemoryImpoundPaymentService(ports: ImpoundPaymentPorts = {}): ImpoundPaymentService {
  return new ImpoundPaymentService(memoryRepository, ports.connections, ports.gate, ports.clock);
}

export function getMemoryImpoundPaymentRepositoryForTests(): InMemoryImpoundPaymentRepository {
  return memoryRepository;
}

export function resetImpoundPaymentRuntimeForTests(): void {
  memoryRepository.reset();
  memoryRepository.setSourcesForTests(memorySources());
  defaultServicePromise = undefined;
}

// Sem o REC-04 e o REC-02a, as portas são as de PADRÃO FAIL-CLOSED: nenhuma cobrança nasce em produção.
export async function createDefaultImpoundPaymentService(): Promise<ImpoundPaymentService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryImpoundPaymentService();
  }
  defaultServicePromise ??= createPrismaImpoundPaymentService();
  return defaultServicePromise;
}

async function createPrismaImpoundPaymentService(): Promise<ImpoundPaymentService> {
  throw new ImpoundPaymentError(503, "ONLINE_PAYMENT_UNAVAILABLE", "repository_unavailable", "Online payment storage is not available.");
}
