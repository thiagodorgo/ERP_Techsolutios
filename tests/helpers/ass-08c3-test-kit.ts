import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { InMemoryOutboxRepository } from "../../src/modules/subscription-billing/outbox/outbox.repository.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const NOW = new Date("2026-11-19T15:00:00.000Z");
export const TENANT_A = "00000000-0000-4000-8000-0000000000a1";
export const TENANT_B = "00000000-0000-4000-8000-0000000000b2";

export function source(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

export function memoryOutbox() {
  return new InMemoryOutboxRepository({
    readStatement: async () => ({
      status: "closed",
      reopenedAt: null,
      totalCents: 10_000,
      paidCents: 0,
      providerPayments: [],
    }),
    clock: () => NOW,
  });
}

export async function enqueue(
  repo: InMemoryOutboxRepository,
  input: {
    tenantId?: string;
    statementId?: string;
    kind?: "charge_create" | "charge_cancel" | "invoice_issue" | "invoice_cancel";
    provider?: string;
    seq?: number;
    payload?: Record<string, unknown>;
  } = {},
) {
  return (
    await repo.enqueue(
      {
        tenantId: input.tenantId ?? TENANT_A,
        statementId: input.statementId ?? "10000000-0000-4000-8000-000000000001",
        kind: input.kind ?? "charge_create",
        provider: input.provider ?? "asaas",
        seq: input.seq ?? 1,
        payload: input.payload ?? {
          amountCents: 10_000,
          dueDate: "2099-12-31",
          method: "pix",
        },
      },
      NOW,
    )
  ).row;
}

export function paymentPort(overrides: Record<string, unknown> = {}) {
  const calls = { list: 0, get: 0, create: 0, cancel: 0 };
  const port = {
    async listChargesByExternalReference() {
      calls.list += 1;
      return [];
    },
    async getCharge() {
      calls.get += 1;
      return { status: "pending", amountCents: 10_000 };
    },
    async createCharge() {
      calls.create += 1;
      return { chargeId: `pay_${calls.create}`, status: "pending" };
    },
    async cancelCharge() {
      calls.cancel += 1;
      return { status: "cancelled" };
    },
    ...overrides,
  };
  return { port: port as never, calls };
}

