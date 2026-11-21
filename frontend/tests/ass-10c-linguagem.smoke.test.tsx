import assert from "node:assert/strict";
import test, { after } from "node:test";

import { installMiniDom, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10c-OPERACAO · R-LING nas JANELAS e no PAINEL DO CANAL (conserto da pré-revisão, A-08). O T-LIN-1
// (`ass-10c-tela.smoke.test.tsx`) confere o texto das 3 aparências, mas lá o painel do canal é um marcador e nenhuma janela
// é aberta. Aqui, cada uma das 13 janelas e o painel do canal (os 2 provedores, com credencial, aviso automático e teste)
// são montados de verdade, e nenhum termo técnico, código `snake_case`, rota nem `tenantId` aparece no texto. A palavra
// pode existir no CÓDIGO (nome de prop, valor do protocolo comparado), nunca no que a pessoa lê.

process.env.VITE_USE_MOCKS = "false";
process.env.VITE_API_BASE_URL = "/api/v1";
const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { billingOpsActions } = await import("../src/modules/platform/billing-operations/useBillingOpsActions");
const { BillingOpsDialogs } = await import("../src/modules/platform/billing-operations/components/BillingOpsDialogs");
const { ProviderPanel } = await import("../src/modules/platform/billing-operations/components/ProviderPanel");
const fixture = await import("./helpers/billing-ops.fixture");

type Access = import("../src/modules/platform/billing-operations/billing-ops.access").BillingOpsAccess;
type DialogAction = import("../src/modules/platform/billing-operations/components/BillingOpsDialogs").DialogAction;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};

const FULL: Access = { read: true, readTenants: true, settle: true, manageProviders: true };
const server = fixture.installFakeServer();
const noop = () => undefined;

/** O que a pessoa NUNCA lê na tela (o mesmo detector do T-LIN-1, mais o andaime de desenvolvimento). */
export const FORBIDDEN = /Tenant|tenant|outbox|webhook|NEEDS_REVIEW|FAILED|provider|permission|\/api\/|NAO-MOSTRAR|TODO|WIP|_/;

async function visibleText(node: unknown): Promise<string> {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  try {
    await act(async () => {
      root.render(node as never);
    });
    return text(container as MiniDomElement).replace(/\s+/g, " ");
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
  }
}

const model = fixture.fixtureModel();
const rowOf = (statementId: string) => {
  const row = model.allRows.find((item) => item.statement.id === statementId);
  assert.ok(row, statementId);
  return row;
};
const LIT = rowOf("st-lit-10");
const VALE = rowOf("st-vale-10");
const PATIO = rowOf("st-patio-10");
const payment = { id: "pg-1", source: "manual" as const, amount: "1020.00" as never, reversedAmount: null, reversed: false, paidAt: "2026-11-15", method: "Pix", note: null };
const payProvider = fixture.provider({ credentials: [{ kind: "api_token", last4: "9F2A", createdAt: "2026-11-10T12:00:00.000Z" }, { kind: "webhook_secret", last4: "77AB", createdAt: "2026-11-10T12:05:00.000Z" }] });
const prodProvider = fixture.provider({ environment: "production" });

export const DIALOGS: readonly DialogAction[] = [
  { kind: "charge", row: LIT },
  { kind: "cancel", row: VALE },
  { kind: "cancel-unknown", row: VALE },
  { kind: "payment", row: LIT },
  { kind: "reverse", row: PATIO, payment },
  { kind: "invoice", row: PATIO },
  { kind: "resolve", row: VALE, line: fixture.REVIEW_LINE },
  { kind: "retry", row: LIT, line: fixture.FAILED_LINE },
  { kind: "confirm-cancelled", row: VALE, line: fixture.REVIEW_LINE },
  { kind: "provider-settings", provider: payProvider },
  { kind: "credential", provider: payProvider, webhook: false },
  { kind: "credential", provider: payProvider, webhook: true },
  { kind: "enable", provider: prodProvider },
  { kind: "disable", provider: payProvider },
];

function dialog(action: DialogAction) {
  return React.createElement(BillingOpsDialogs, {
    dialog: action,
    actions: billingOpsActions(FULL),
    today: fixture.TODAY,
    channelOff: true,
    invoiceOff: true,
    serverOff: true,
    onClose: noop,
    onStatementDone: noop,
    onProviderDone: noop,
    onSeeChannel: noop,
    onOpen: noop,
  });
}

test("T-LIN-2 / T-ORG-2 nenhuma janela mostra termo técnico, código, rota nem tenantId (as 13 janelas, aberta)", async () => {
  server.serve();
  const kinds = new Set<string>();
  for (const action of DIALOGS) {
    const shown = await visibleText(dialog(action));
    assert.ok(shown.trim().length > 40, `controle de vacuidade: a janela ${action.kind} desenhou texto`);
    const hit = FORBIDDEN.exec(shown);
    assert.equal(hit, null, `${action.kind}: "${hit?.[0]}" em …${hit ? shown.slice(Math.max(0, hit.index - 60), hit.index + 30) : ""}`);
    kinds.add(action.kind);
  }
  assert.equal(kinds.size, 13, "as 13 janelas do DialogAction");
  assert.equal(server.state.calls.length, 0, "abrir janela não chama o servidor");
});

test("T-LIN-2 o painel do canal (os 2 provedores, com credencial, aviso automático e teste) não mostra termo técnico", async () => {
  server.serve();
  const channel = { ...model.channel, payment: payProvider };
  assert.ok(channel.payment && channel.invoice, "controle: os 2 cartões do canal têm provedor");
  const shown = await visibleText(React.createElement(ProviderPanel, { channel, actions: billingOpsActions(FULL), onDialog: noop, onClose: noop, onReread: noop, onServerOff: noop }));
  assert.match(shown, /Canal de cobrança/);
  assert.match(shown, /Registrado em/, "controle: o aviso automático registrado aparece");
  const hit = FORBIDDEN.exec(shown);
  assert.equal(hit, null, `painel: "${hit?.[0]}" em …${hit ? shown.slice(Math.max(0, hit.index - 60), hit.index + 30) : ""}`);
});

test("T-LIN-2 vermelho-controle: o detector acusa o termo técnico e o andaime no texto", () => {
  for (const sample of ["Segredo do webhook", "fila NEEDS_REVIEW", "provider desligado", "TODO conferir", "WIP"]) assert.notEqual(FORBIDDEN.exec(sample), null, sample);
  assert.equal(FORBIDDEN.exec("Segredo do aviso automático · Em revisão · Com falha"), null);
});
