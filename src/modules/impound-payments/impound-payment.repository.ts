import { randomUUID } from "node:crypto";

import {
  ImpoundPaymentError,
  LIVE_LINK_STATUSES,
  type ImpoundPaymentIntent,
  type ImpoundPaymentRef,
  type NewIntentInput,
  type PatioOutboxLine,
  type ProcessReleaseState,
  type SettleableDue,
} from "./impound-payment.types.js";

// B-PATIO-REC-01 (v3 §5.2, emenda §10.1 R-ISO) — a porta de persistência da intenção.
// R-ISO: TODA consulta recebe `tenantId` e filtra por ele explicitamente (além da RLS no Prisma); a busca por id de outra
// organização devolve `undefined` (→ 404), nunca a linha. O canário `assertRowsBelongToTenant` mora no serviço.

// O que se faz SOB a trava do processo (FOR UPDATE do processo no Prisma; fila por processo na memória). Tudo no mesmo
// `tx`: a leitura do estado do processo, o devido capado, as irmãs, e as gravações da intenção, da referência e da fila.
export interface IntentWriteScope {
  loadReleaseState(): Promise<ProcessReleaseState | undefined>;
  settleableDue(): Promise<SettleableDue | undefined>;
  listByProcess(): Promise<readonly ImpoundPaymentIntent[]>;
  insertIntent(input: NewIntentInput): Promise<ImpoundPaymentIntent>;
  insertRef(ref: ImpoundPaymentRef): Promise<void>;
  enqueue(line: PatioOutboxLine): Promise<void>;
}

export interface ImpoundPaymentRepository {
  processExists(tenantId: string, processId: string): Promise<boolean>;
  findById(tenantId: string, intentId: string): Promise<ImpoundPaymentIntent | undefined>;
  listByProcess(tenantId: string, processId: string): Promise<readonly ImpoundPaymentIntent[]>;
  findLiveByProcess(tenantId: string, processId: string): Promise<ImpoundPaymentIntent | undefined>;
  // `undefined` = o processo não existe para a organização (→ 404). A trava vem ANTES de qualquer leitura de decisão.
  withProcessLock<T>(tenantId: string, processId: string, work: (scope: IntentWriteScope) => Promise<T>): Promise<T | undefined>;
}

// As leituras de OUTROS donos (processo e liberação: impound/release; devido: charging) que a memória usa.
export type MemoryImpoundPaymentSources = {
  readonly processState: (tenantId: string, processId: string) => Promise<ProcessReleaseState | undefined>;
  readonly settleableDue: (tenantId: string, processId: string) => Promise<SettleableDue | undefined>;
};

const LIVE_LINK = new Set<string>(LIVE_LINK_STATUSES);

export class InMemoryImpoundPaymentRepository implements ImpoundPaymentRepository {
  private readonly intents = new Map<string, ImpoundPaymentIntent>();
  private readonly refs = new Map<string, ImpoundPaymentRef>();
  private readonly outbox: PatioOutboxLine[] = [];
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private sources: MemoryImpoundPaymentSources) {}

  async processExists(tenantId: string, processId: string): Promise<boolean> {
    return (await this.sources.processState(tenantId, processId)) !== undefined;
  }

  async findById(tenantId: string, intentId: string): Promise<ImpoundPaymentIntent | undefined> {
    const intent = this.intents.get(intentId);
    return intent && intent.tenantId === tenantId ? intent : undefined;
  }

  async listByProcess(tenantId: string, processId: string): Promise<readonly ImpoundPaymentIntent[]> {
    return [...this.intents.values()]
      .filter((intent) => intent.tenantId === tenantId && intent.processId === processId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findLiveByProcess(tenantId: string, processId: string): Promise<ImpoundPaymentIntent | undefined> {
    return (await this.listByProcess(tenantId, processId)).find((intent) => LIVE_LINK.has(intent.status));
  }

  async withProcessLock<T>(tenantId: string, processId: string, work: (scope: IntentWriteScope) => Promise<T>): Promise<T | undefined> {
    const key = `${tenantId}:${processId}`;
    const previous = this.locks.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(async () => {
      const state = await this.sources.processState(tenantId, processId);
      if (!state) return undefined;
      return work(this.scopeFor(tenantId, processId));
    });
    this.locks.set(key, run);
    return run;
  }

  // ── só testes ──────────────────────────────────────────────────────────────────────────────────────────────
  setSourcesForTests(sources: MemoryImpoundPaymentSources): void {
    this.sources = sources;
  }

  seedIntentForTests(intent: ImpoundPaymentIntent): void {
    this.intents.set(intent.id, intent);
  }

  allIntentsForTests(): readonly ImpoundPaymentIntent[] {
    return [...this.intents.values()];
  }

  allRefsForTests(): readonly ImpoundPaymentRef[] {
    return [...this.refs.values()];
  }

  outboxForTests(): readonly PatioOutboxLine[] {
    return [...this.outbox];
  }

  reset(): void {
    this.intents.clear();
    this.refs.clear();
    this.outbox.length = 0;
    this.locks.clear();
  }

  private scopeFor(tenantId: string, processId: string): IntentWriteScope {
    return {
      loadReleaseState: () => this.sources.processState(tenantId, processId),
      settleableDue: () => this.sources.settleableDue(tenantId, processId),
      listByProcess: () => this.listByProcess(tenantId, processId),
      insertIntent: async (input) => {
        // Imita a UNIQUE parcial do banco (`impound_payment_intents_live_link_key`): um link aberto por processo.
        const clash = [...this.intents.values()].some(
          (intent) => intent.tenantId === input.tenantId && intent.processId === input.processId && LIVE_LINK.has(intent.status),
        );
        if (clash) {
          throw new ImpoundPaymentError(409, "ONLINE_PAYMENT_CONFLICT", "payment_already_pending", "There is already an open payment link for this process.");
        }
        const intent: ImpoundPaymentIntent = {
          id: randomUUID(),
          tenantId: input.tenantId,
          processId: input.processId,
          status: "pending",
          currency: input.currency,
          amountCents: input.amountCents,
          paidCents: 0,
          appliedCents: 0,
          heldCents: 0,
          refundedCents: 0,
          methods: input.methods,
          payerName: input.payerName,
          payerDocument: input.payerDocument,
          provider: input.provider,
          account: input.account,
          expiresAt: input.expiresAt,
          settledChargeIds: [],
          createdBy: input.actorId,
          updatedBy: input.actorId,
          createdAt: input.occurredAt,
          updatedAt: input.occurredAt,
        };
        this.intents.set(intent.id, intent);
        return intent;
      },
      insertRef: async (ref) => {
        this.refs.set(ref.intentId, ref);
      },
      enqueue: async (line) => {
        this.outbox.push(line);
      },
    };
  }
}
