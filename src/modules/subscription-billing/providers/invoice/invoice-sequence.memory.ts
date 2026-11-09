// B-ASS-07 · F6 — dublê transacional em memória. A implementação durável, com SELECT FOR UPDATE,
// nasce no B-ASS-08 junto de billing_invoice_sequences e subscription_statement_invoices.

import { InvoiceProviderError } from "./invoice-errors.js";

export type SequencedInvoiceStatus = "processing" | "authorized" | "rejected" | "cancelled";

export type InvoiceReservation = {
  readonly statementId: string;
  readonly seq: number;
  readonly externalRef: string;
  readonly dpsNumber: number;
  readonly serie: number;
};

type Attempt = InvoiceReservation & { status: SequencedInvoiceStatus };

function cloneAttempts(source: ReadonlyMap<string, readonly Attempt[]>): Map<string, Attempt[]> {
  return new Map([...source].map(([key, value]) => [key, value.map((attempt) => ({ ...attempt }))]));
}

export class InMemoryInvoiceSequence {
  #nextByKey = new Map<string, number>();
  #attempts = new Map<string, Attempt[]>();
  #tail: Promise<void> = Promise.resolve();

  async transaction<T>(work: (sequence: InMemoryInvoiceSequence) => Promise<T> | T): Promise<T> {
    let release!: () => void;
    const previous = this.#tail;
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const nextSnapshot = new Map(this.#nextByKey);
    const attemptsSnapshot = cloneAttempts(this.#attempts);
    try {
      return await work(this);
    } catch (error) {
      this.#nextByKey = nextSnapshot;
      this.#attempts = attemptsSnapshot;
      throw error;
    } finally {
      release();
    }
  }

  reserve(input: { readonly provider: string; readonly environment: string; readonly serie: number; readonly statementId: string }): InvoiceReservation {
    const history = this.#attempts.get(input.statementId) ?? [];
    const latest = history.at(-1);
    if (latest && (latest.status === "processing" || latest.status === "authorized")) {
      throw new InvoiceProviderError("invoice_already_live", "The statement already has a live invoice.", { existingId: latest.externalRef });
    }
    const seq = (latest?.seq ?? 0) + 1;
    const sequenceKey = `${input.provider}:${input.environment}:${input.serie}`;
    const dpsNumber = this.#nextByKey.get(sequenceKey) ?? 1;
    this.#nextByKey.set(sequenceKey, dpsNumber + 1);
    const reservation: InvoiceReservation = {
      statementId: input.statementId,
      seq,
      externalRef: `${input.statementId}:${seq}`,
      dpsNumber,
      serie: input.serie,
    };
    this.#attempts.set(input.statementId, [...history, { ...reservation, status: "processing" }]);
    return reservation;
  }

  mark(statementId: string, seq: number, status: SequencedInvoiceStatus): void {
    const history = this.#attempts.get(statementId) ?? [];
    const attempt = history.find((candidate) => candidate.seq === seq);
    if (!attempt) throw new Error("invoice_attempt_not_found");
    attempt.status = status;
  }

  attempts(statementId: string): readonly Readonly<Attempt>[] {
    return (this.#attempts.get(statementId) ?? []).map((attempt) => ({ ...attempt }));
  }
}
