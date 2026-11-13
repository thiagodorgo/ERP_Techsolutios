import assert from "node:assert/strict";
import test, { after } from "node:test";

import { toChequeDto, toChequeListDto } from "../../src/modules/cheques/cheque.dto";
import type { Cheque as ServerCheque } from "../../src/modules/cheques/cheque.types";
import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-SAN3-24 (24a, A7) — a tela de Cheques REAL (`ChequesPage`, o contêiner) com os provedores reais e os hooks reais
// (`useCheques` → `listCheques` → `fetch`), no DOM mínimo da trilha. A rede é o único dublê e responde com os BYTES do
// servidor (`toChequeDto`/`toChequeListDto` de `src/modules/cheques/cheque.dto.ts`). Prende por comportamento:
//   (i)   dois cliques em "Confirmar compensação" ⇒ UM `POST …/clear` (um pedido por vez);
//   (ii)  `409 transition_conflict` ⇒ "O cheque mudou; relendo." e a lista é relida;
//   (iii) carregando, vazio, erro, 403 ⇒ "Acesso não permitido", e o dado desatualizado (2º plano que falha);
//   (iv)  `422 period_closed` ⇒ a mensagem do mês fechado com MM/AAAA, e a lista é relida.
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { ChequesPage } = await import("../src/modules/finance/cheques/ChequesPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { DEFAULT_AUTO_REFRESH_MS } = await import("../src/hooks/useAutoRefresh");
const { periodLabel, toPeriodKey } = await import("../src/modules/finance/period-closes/period-keys");

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

const TENANT_ID = "org-cheques";
const FINANCE = ["cheques:read", "cheques:create", "cheques:update", "financial_entries:read", "financial_entries:create", "financial_accounts:read", "financial_titles:read"];

const at = new Date("2026-11-01T12:00:00.000Z");
function serverCheque(over: Partial<ServerCheque>): ServerCheque {
  return { id: "chq-x", tenantId: TENANT_ID, accountId: "acc-bb", direction: "received", chequeNumber: "000100", bank: "Banco do Brasil", amount: 100, currency: "BRL", status: "registered", createdAt: at, updatedAt: at, ...over };
}

const FIXTURE: ServerCheque[] = [
  serverCheque({ id: "chq-dep-in", chequeNumber: "087120", amount: 3400, status: "deposited" }),
  serverCheque({ id: "chq-dep-out", chequeNumber: "000157", amount: 760, status: "deposited", direction: "issued" }),
  serverCheque({ id: "chq-reg", chequeNumber: "010245", amount: 2150, status: "registered", dueDate: new Date("2026-11-09T03:00:00.000Z") }),
];

const SUMMARY = {
  receivable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  payable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  settledThisMonth: { competencia: "2026-11", inflow: 0, outflow: 0 },
  cash: { totalBalance: 0, accountCount: 1, currency: "BRL" },
  cheques: { pendingReceivedCount: 2, pendingReceivedAmount: 5550, pendingIssuedCount: 1, pendingIssuedAmount: 760, linkedPendingCount: 0, linkedPendingAmount: 0 },
  cashFlow: [],
  recentTitles: [],
};
const ACCOUNTS = { items: [{ id: "acc-bb", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 0, bankName: "BB", status: "active", isActive: true, createdAt: "2026-01-01T12:00:00.000Z" }], pagination: { limit: 100, offset: 0, total: 1 } };

type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Override = (call: Call) => Response | Promise<Response> | null;
const calls: Call[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function listResponse(url: URL): Response {
  const status = url.searchParams.get("status");
  const direction = url.searchParams.get("direction");
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const rows = FIXTURE.filter((c) => (!status || c.status === status) && (!direction || c.direction === direction));
  return json(200, toChequeListDto({ items: rows.slice(offset, offset + limit), total: rows.length, limit, offset }));
}

function installFetch(override?: Override) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);
    const custom = await override?.(call);
    if (custom) return custom;
    const parsed = new URL(`http://x${url}`);
    const path = parsed.pathname;
    if (call.method === "GET" && path === "/cheques") return listResponse(parsed);
    const one = /^\/cheques\/([^/]+)$/.exec(path);
    if (call.method === "GET" && one) {
      const found = FIXTURE.find((c) => c.id === one[1]);
      return found ? json(200, { data: toChequeDto(found) }) : json(404, { error: { code: "NOT_FOUND", reason: "cheque_not_found", message: "x" } });
    }
    const clear = /^\/cheques\/([^/]+)\/clear$/.exec(path);
    if (call.method === "POST" && clear) {
      const found = FIXTURE.find((c) => c.id === clear[1])!;
      return json(200, { data: toChequeDto({ ...found, status: "cleared", clearedEntryId: "ent-1" }) });
    }
    if (call.method === "GET" && path === "/financial-summary") return json(200, { data: SUMMARY });
    if (call.method === "GET" && path === "/financial-accounts") return json(200, ACCOUNTS);
    if (call.method === "GET" && /^\/financial-accounts\/[^/]+\/balance$/.test(path)) return json(200, { data: { accountId: "acc-bb", currency: "BRL", openingBalance: 0, in: 0, out: 0, balance: 0 } });
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seed(permissions: readonly string[]) {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Financeiro" as never], permissions: [...permissions] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: TENANT_ID, tenantName: "Organização de Teste", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Financeiro", permissions, enabledModules: ["dashboard", "finance"], scope: "tenant" }),
  );
}

async function mount(options: { override?: Override; permissions?: readonly string[]; settleAfter?: boolean } = {}) {
  seed(options.permissions ?? FINANCE);
  installFetch(options.override);
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(h(MemoryRouter, { initialEntries: ["/finance/cheques"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(ChequesPage))))));
  });
  if (options.settleAfter !== false) await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

const row = (container: MiniDomNode, id: string) => elements(container, (el) => el.localName === "tr" && el.getAttribute("data-row-key") === id)[0];
const button = (container: MiniDomNode, label: string) => elements(container, (el) => el.localName === "button" && text(el).trim() === label)[0];
const dialog = (container: MiniDomNode) => elements(container, (el) => el.getAttribute("role") === "dialog")[0];
const listCalls = () => calls.filter((c) => c.method === "GET" && /^\/cheques\?limit=20(&|$)/.test(c.url)).length;
const clickProps = (el: MiniDomElement) => ({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });

async function press(el: MiniDomElement | undefined) {
  assert.ok(el, "elemento a acionar não encontrado");
  const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onClick, "function", `onClick ausente em <${el.localName}> "${text(el)}"`);
  await act(async () => {
    onClick!(clickProps(el));
  });
  await settle();
}

async function openClearConfirm(container: MiniDomNode, id: string) {
  await press(row(container, id));
  await press(button(container, "Compensar"));
  assert.ok(dialog(container), `a confirmação abriu: ${serialize(container).slice(0, 400)}`);
}

test("A7 (i) dois cliques em 'Confirmar compensação' ⇒ UM POST …/clear", async () => {
  let release: (() => void) | null = null;
  const { container, unmount } = await mount({
    override: (call) =>
      call.method === "POST" && call.url.endsWith("/clear")
        ? new Promise<Response>((resolve) => {
            release = () => resolve(json(200, { data: toChequeDto({ ...FIXTURE[0], status: "cleared", clearedEntryId: "ent-1" }) }));
          })
        : null,
  });
  try {
    await openClearConfirm(container, "chq-dep-in");
    const confirmButton = button(container, "Confirmar compensação");
    assert.ok(confirmButton);
    const onClick = propsOf(confirmButton).onClick as (ev: unknown) => void;
    await act(async () => {
      onClick(clickProps(confirmButton));
      onClick(clickProps(confirmButton));
    });
    await settle();
    assert.equal(calls.filter((c) => c.method === "POST" && c.url === "/cheques/chq-dep-in/clear").length, 1, JSON.stringify(calls.map((c) => `${c.method} ${c.url}`)));
    await act(async () => release?.());
    await settle();
    assert.match(text(container), /Cheque compensado\./);
    assert.equal(dialog(container), undefined, "a confirmação fecha depois do sucesso");
  } finally {
    await unmount();
  }
});

test("A7 (ii) 409 transition_conflict ⇒ 'O cheque mudou; relendo.' e a lista é relida", async () => {
  const { container, unmount } = await mount({
    override: (call) => (call.method === "POST" && call.url.endsWith("/clear") ? json(409, { error: { code: "CHEQUE_CONFLICT", reason: "transition_conflict", message: "x" } }) : null),
  });
  try {
    await openClearConfirm(container, "chq-dep-in");
    const before = listCalls();
    await press(button(container, "Confirmar compensação"));
    assert.match(text(container), /O cheque mudou; relendo\./);
    assert.equal(listCalls(), before + 1, "1 GET /cheques a mais");
    assert.equal(dialog(container), undefined);
  } finally {
    await unmount();
  }
});

test("A7 (iii) carregando, vazio, erro e acesso não permitido", async () => {
  let unblock: (() => void) | null = null;
  const loading = await mount({
    settleAfter: false,
    override: (call) => (call.method === "GET" && call.url.startsWith("/cheques?limit=20") ? new Promise<Response>((resolve) => (unblock = () => resolve(json(200, toChequeListDto({ items: [], total: 0, limit: 20, offset: 0 }))))) : null),
  });
  try {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(elements(loading.container, (el) => el.getAttribute("aria-busy") === "true").length > 0, "esqueleto de carregamento");
    await act(async () => unblock?.());
    await settle();
    assert.match(text(loading.container), /Nenhum cheque registrado ainda\./, "vazio");
  } finally {
    await loading.unmount();
  }
  const failing = await mount({ override: (call) => (call.method === "GET" && call.url.startsWith("/cheques?limit=20") ? json(500, { error: { code: "X", reason: "x", message: "x" } }) : null) });
  try {
    assert.match(text(failing.container), /Não foi possível carregar os cheques/);
  } finally {
    await failing.unmount();
  }
  const forbidden = await mount({ override: (call) => (call.method === "GET" && call.url.startsWith("/cheques?limit=20") ? json(403, { error: { code: "FORBIDDEN", reason: "forbidden", message: "x" } }) : null) });
  try {
    assert.match(text(forbidden.container), /Acesso não permitido/);
  } finally {
    await forbidden.unmount();
  }
});

test("A7 (iii) dado desatualizado: a atualização em 2º plano falha ⇒ 'Dados desatualizados' e as linhas continuam", async () => {
  let fail = false;
  const { container, unmount } = await mount({ override: (call) => (fail && call.method === "GET" && call.url.startsWith("/cheques?limit=20") ? json(500, { error: { code: "X", reason: "x", message: "x" } }) : null) });
  try {
    assert.ok(row(container, "chq-dep-in"));
    fail = true;
    const ticks = dom.intervals.filter((interval) => interval.fn && interval.ms === DEFAULT_AUTO_REFRESH_MS);
    assert.ok(ticks.length > 0, "a tela se atualiza sozinha");
    await act(async () => ticks[0].fn!());
    await settle();
    assert.match(text(container), /Dados desatualizados/);
    assert.ok(row(container, "chq-dep-in"), "o dado anterior continua na tela");
  } finally {
    await unmount();
  }
});

test("A7 (iv) 422 period_closed ⇒ a mensagem do mês fechado com MM/AAAA, e a lista é relida", async () => {
  const { container, unmount } = await mount({
    override: (call) => (call.method === "POST" && call.url.endsWith("/clear") ? json(422, { error: { code: "FINANCIAL_ENTRY_UNPROCESSABLE", reason: "period_closed", message: "x" } }) : null),
  });
  try {
    await openClearConfirm(container, "chq-dep-in");
    const before = listCalls();
    await press(button(container, "Confirmar compensação"));
    const month = periodLabel(toPeriodKey(new Date()));
    assert.match(text(container), new RegExp(`O mês ${month.replace("/", "\\/")} está fechado\\. Compensar e devolver lançam no mês corrente`));
    assert.equal(listCalls(), before + 1, "a lista é relida");
  } finally {
    await unmount();
  }
});
