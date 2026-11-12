import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-SAN3-15a (P13; plano `plano-B-SAN3-15-v2.md` §3.2, linha P13; A-05 da crítica r1) — A CONTAGEM DO WEB SEM NÚMERO
// INVENTADO. O fechamento que volta 2xx SEM a contagem não pode virar uma contagem "Concluída" vazia com relatório
// zerado (era o literal de `cycle-counts.adapter.ts`, visto pela sonda da C4 do B-SAN3-01 com `status=concluida`):
//   T-W1  `adaptCycleCountCloseResponse` com `{data:{}}`, `{}` e `null` lança `CycleCountResponseError`
//         ("close_without_entity"); o 2xx válido segue igual (regressão).
//   T-W2  a gaveta REAL (`CycleCountSessionDrawer`), com o fechamento 2xx `{data:{}}`, mostra exatamente a frase de
//         erro, nenhum chip "Concluída" e nenhum relatório. Arnês: o DOM mínimo da trilha (`tests/helpers/mini-dom.ts`),
//         a rede (`fetch`) como único dublê, clique pelo handler em `__reactProps$`.
process.env.VITE_USE_MOCKS = "false";

const UNCONFIRMED = "O servidor não confirmou o fechamento da contagem. Recarregue a lista para ver a situação atual.";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const adapter = await import("../src/modules/inventory/cycle-counts.adapter");
const { CycleCountSessionDrawer } = await import("../src/modules/inventory/components/CycleCountSessionDrawer");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const OPEN_SESSION = {
  data: {
    id: "cc-15a",
    abc_class: "A",
    status: "aberta",
    entries: [{ id: "e1", item_id: "i1", system_quantity: 10, counted_quantity: 12 }],
  },
};
const calls: string[] = [];

function installFetch(closeBody: unknown) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);
    if (method === "GET" && url === "/cycle-counts/cc-15a") return json(200, OPEN_SESSION);
    if (method === "POST" && url === "/cycle-counts/cc-15a/close") return json(200, closeBody);
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

const buttonWith = (container: MiniDomNode, label: string) =>
  elements(container, (el) => el.localName === "button" && text(el).trim().endsWith(label))[0];

async function press(el: MiniDomElement | undefined) {
  assert.ok(el, "elemento a acionar não encontrado");
  const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onClick, "function", `onClick ausente em <${el.localName}> "${text(el)}"`);
  await act(async () => {
    onClick!({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });
  });
  await settle();
}

async function mountDrawer(closeBody: unknown) {
  installFetch(closeBody);
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(CycleCountSessionDrawer, {
        cycleCountId: "cc-15a",
        context: { tenantId: "org-15a", permissions: ["cycle_counts:read", "cycle_counts:create"] },
        itemById: new Map([["i1", { id: "i1", sku: "DISJ-20A", name: "Disjuntor 20A", unit: "un" } as never]]),
        canManage: true,
        onClose: () => undefined,
        onChanged: () => undefined,
      }),
    );
  });
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

test("[T-W1] adaptCycleCountCloseResponse: 2xx sem a contagem ({data:{}}, {} e null) lança CycleCountResponseError; o 2xx válido segue igual", () => {
  for (const body of [{ data: {} }, {}, null]) {
    assert.throws(
      () => adapter.adaptCycleCountCloseResponse(body),
      (error: unknown) =>
        error instanceof adapter.CycleCountResponseError &&
        error.reason === "close_without_entity" &&
        error.message === UNCONFIRMED,
      `corpo ${JSON.stringify(body)}`,
    );
  }

  // O ramo explícito da classe na interpretação: a frase em PT-BR, nunca o texto técnico.
  const feedback = adapter.interpretCycleCountError(new adapter.CycleCountResponseError("close_without_entity"));
  assert.deepEqual(feedback, { reason: "close_without_entity", message: UNCONFIRMED });

  // Regressão: o 2xx válido (com a contagem) segue igual a hoje.
  const closed = adapter.adaptCycleCountCloseResponse({
    data: {
      cycleCount: {
        id: "cc-1",
        status: "concluida",
        entries: [
          { id: "e1", item_id: "i1", system_quantity: 10, counted_quantity: 12, variance: 2, adjustment_movement_id: "mv-1" },
          { id: "e2", item_id: "i2", system_quantity: 5, counted_quantity: 5, variance: 0 },
        ],
      },
      adjustmentsGenerated: 1,
    },
  });
  assert.equal(closed.cycleCount.id, "cc-1");
  assert.equal(closed.cycleCount.status, "concluida");
  assert.equal(closed.report.lines.length, 1);
  assert.equal(closed.report.totalVariance, 2);
  assert.equal(closed.report.adjustmentsGenerated, 1);
});

test("[T-W2] a gaveta, com fechamento 2xx {data:{}}, mostra a frase exata; nenhum chip 'Concluída' e nenhum relatório", async () => {
  const { container, unmount } = await mountDrawer({ data: {} });
  try {
    assert.ok(text(container).includes("Aberta"), `a sessão abriu: ${serialize(container).slice(0, 300)}`);
    await press(buttonWith(container, "Fechar contagem"));
    await press(buttonWith(container, "Confirmar fechamento"));

    assert.ok(calls.includes("POST /cycle-counts/cc-15a/close"), JSON.stringify(calls));
    const shown = text(container);
    assert.ok(shown.includes(UNCONFIRMED), `a frase exata na gaveta: ${shown}`);
    assert.equal(shown.includes("Concluída"), false, "nenhum chip 'Concluída'");
    assert.equal(shown.includes("Relatório de variância"), false, "nenhum relatório");
    assert.equal(shown.includes("ajuste(s) gerado(s)"), false, "nenhum número de ajuste");
  } finally {
    await unmount();
  }
});
