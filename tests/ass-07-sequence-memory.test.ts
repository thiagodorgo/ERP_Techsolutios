import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { ProviderValidationError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { InMemoryInvoiceSequence } from "../src/modules/subscription-billing/providers/invoice/invoice-sequence.memory.js";
import type { InvoiceReservation, SequencedInvoiceStatus } from "../src/modules/subscription-billing/providers/invoice/invoice-sequence.memory.js";
import type { IssueInvoiceInput } from "../src/modules/subscription-billing/providers/invoice/invoice-provider.port.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

function baseInput(reservation: InvoiceReservation): IssueInvoiceInput {
  return {
    externalRef: reservation.externalRef,
    dpsNumber: reservation.dpsNumber,
    emitter: { cnpj: "DOCUMENTO-EMISSOR" },
    borrower: { document: "DOCUMENTO-TOMADOR", name: "Organização tomadora" },
    serviceDescription: "Descrição de serviço",
    amountCents: 10000,
    competenceDate: "2026-11-30",
    taxProfile: {
      regimeTributario: "lucro_presumido",
      codigoOpcaoSimplesNacional: "CAMPO-OPCAO-SIMPLES",
      regimeEspecialTributacao: "CAMPO-REGIME-ESPECIAL",
      tributacaoIss: "CAMPO-TRIBUTACAO-ISS",
      municipioIbge: "CAMPO-MUNICIPIO",
      cTribNac: "CAMPO-TRIB-NACIONAL",
      serieDps: reservation.serie,
    },
  };
}

function focus(baseUrl: string) {
  return new FocusNfeInvoiceAdapter(
    new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${baseUrl}/v2` }),
    async (kind) => (kind === "api_token" ? "token-falso" : null),
  );
}

async function proveReissueAfter(status: SequencedInvoiceStatus): Promise<void> {
  const fake = await startFocusNfeFake();
  try {
    const sequence = new InMemoryInvoiceSequence();
    const adapter = focus(fake.baseUrl);
    const first = await sequence.transaction((tx) => tx.reserve({ provider: "focusnfe", environment: "sandbox", serie: 7, statementId: "statement-reissue" }));
    await adapter.issue(baseInput(first));
    sequence.mark(first.statementId, first.seq, status);
    const second = await sequence.transaction((tx) => tx.reserve({ provider: "focusnfe", environment: "sandbox", serie: 7, statementId: first.statementId }));
    assert.equal(second.seq, 2);
    assert.equal(second.externalRef, "statement-reissue:2");
    assert.equal(second.dpsNumber, first.dpsNumber + 1);
    assert.deepEqual(await adapter.issue(baseInput(second)), { providerInvoiceId: "nfse_2", status: "processing" });
  } finally {
    await fake.close();
  }
}

test("T-NF-38 · rejeitada reemite com seq + 1, nova ref e novo numero_dps", async () => {
  await proveReissueAfter("rejected");
});

test("T-NF-39 · cancelada reemite com seq + 1", async () => {
  await proveReissueAfter("cancelled");
});

test("T-NF-40 · falso Focus recusa numero_dps repetido na mesma série", async () => {
  const fake = await startFocusNfeFake();
  try {
    const adapter = focus(fake.baseUrl);
    const first = { statementId: "statement-a", seq: 1, externalRef: "statement-a:1", dpsNumber: 1, serie: 7 };
    const repeated = { statementId: "statement-b", seq: 1, externalRef: "statement-b:1", dpsNumber: 1, serie: 7 };
    await adapter.issue(baseInput(first));
    await assert.rejects(() => adapter.issue(baseInput(repeated)), (error: unknown) => error instanceof ProviderValidationError && /numero_dps/.test(error.message));
  } finally {
    await fake.close();
  }
});

test("T-NF-40b · reservas concorrentes são distintas e consecutivas", async () => {
  const sequence = new InMemoryInvoiceSequence();
  const [left, right] = await Promise.all([
    sequence.transaction((tx) => tx.reserve({ provider: "focusnfe", environment: "sandbox", serie: 3, statementId: "statement-left" })),
    sequence.transaction((tx) => tx.reserve({ provider: "focusnfe", environment: "sandbox", serie: 3, statementId: "statement-right" })),
  ]);
  assert.deepEqual([left.dpsNumber, right.dpsNumber], [1, 2]);
});

test("T-NF-40c · rollback do dublê não consome número", async () => {
  const sequence = new InMemoryInvoiceSequence();
  await assert.rejects(
    sequence.transaction((tx) => {
      tx.reserve({ provider: "focusnfe", environment: "sandbox", serie: 4, statementId: "statement-rollback" });
      throw new Error("rollback-controlado");
    }),
    /rollback-controlado/,
  );
  const next = await sequence.transaction((tx) => tx.reserve({ provider: "focusnfe", environment: "sandbox", serie: 4, statementId: "statement-after" }));
  assert.equal(next.dpsNumber, 1);
});
