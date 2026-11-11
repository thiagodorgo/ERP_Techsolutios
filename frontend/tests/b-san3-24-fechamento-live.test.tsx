import assert from "node:assert/strict";
import test, { after } from "node:test";

import { toFinancialPeriodCloseDto, toFinancialPeriodStatusDto } from "../../src/modules/financial-period-closes/financial-period-close.dto";
import type { FinancialPeriodClose, SnapshotBody } from "../../src/modules/financial-period-closes/financial-period-close.types";
import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-SAN3-24 (24b, B4 e B5) — a tela de Fechamento do mês REAL (`FechamentoPage`) com os provedores e os hooks reais, no
// DOM mínimo da trilha. A rede é o único dublê e responde com os BYTES do servidor (`toFinancialPeriodStatusDto`,
// `toFinancialPeriodCloseDto`). O teste lê o CORPO que a tela mandou. Prende:
//   B4 (i)   "Fechar" abre a confirmação com o texto da trava, e só o 2º clique envia UM `POST …/close`, com corpo `{}`;
//      (ii)  com contestação, o 1º passo mostra a contagem e o 2º é "Fechar mesmo assim"; desabilitado com motivo vazio
//            ou só de espaços; o corpo é `{ force: true, reason: "<aparado>" }`;
//      (iii) nenhum `POST` sai com `force: true` antes do 2º passo;
//      (iv)  422 `pending_items_block_close` no `POST` sem `force` ⇒ 1 `GET /financial-periods/2026-07` a mais e a
//            contagem nova na tela;
//   B5 "fechando" ⇒ "Fechamento em andamento", sem ações; 409 ⇒ releitura; estados §7 (erro, 403, vazio).
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
const { FechamentoPage } = await import("../src/modules/finance/period-closes/FechamentoPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

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

const TENANT_ID = "org-fechamento";
const FINANCE = ["financial_period:read", "financial_period:close", "financial_entries:read"];
const at = new Date("2026-08-02T12:00:00.000Z");

function snapshot(over: Partial<SnapshotBody> = {}): SnapshotBody {
  const agg = { count: 0, sumAmount: 0 };
  return {
    period: "2026-07",
    computedAt: at.toISOString(),
    closedBy: null,
    forced: false,
    forcedReason: null,
    material: { titles: { receivable: agg, payable: agg }, entries: { in: agg, out: agg, net: 0 } },
    titles: { receivable: { ...agg, sumPaid: 0 }, payable: { ...agg, sumPaid: 0 }, byStatus: { open: 0, scheduled: 0, partiallyPaid: 0, paid: 0, inDispute: 0, cancelled: 0 } },
    entries: { in: { count: 3, sumAmount: 1500 }, out: { count: 1, sumAmount: 400 }, net: 1100 },
    balance: { receivableOpen: 0, payableOpen: 0 },
    pending: { blocking: { inDisputeTitles: 0 }, informational: { unpaidTitles: 0, unreconciledEntries: 0 } },
    ...over,
  };
}

function record(period: string, status: string, over: Partial<FinancialPeriodClose> = {}): FinancialPeriodClose {
  return { id: `fpc-${period}`, tenantId: TENANT_ID, period, status, createdAt: at, updatedAt: at, ...over };
}

type State = { status: string; disputes: number };
const states = new Map<string, State>();
type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Override = (call: Call) => Response | Promise<Response> | null;
const calls: Call[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function statusDto(period: string) {
  const state = states.get(period) ?? { status: "open", disputes: 0 };
  const rec = state.status === "open" ? undefined : record(period, state.status, state.status === "closed" || state.status === "reopened" ? { closedAt: at, snapshot: { latest: snapshot({ period }), history: [snapshot({ period })] } } : {});
  return toFinancialPeriodStatusDto(period, rec, { blocking: { inDisputeTitles: state.disputes, inDisputeTitleIds: [] }, informational: { unpaidTitles: 2, unreconciledEntries: 5 } });
}

function installFetch(override?: Override) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);
    const custom = await override?.(call);
    if (custom) return custom;
    const path = new URL(`http://x${url}`).pathname;
    if (call.method === "GET" && path === "/financial-periods") {
      const items = [...states.entries()].filter(([, s]) => s.status !== "open").map(([period, s]) => record(period, s.status, { closedAt: at }));
      return json(200, { items: items.map((r) => ({ period: r.period, status: r.status, closedAt: r.closedAt?.toISOString() ?? null, closedBy: null, reopenedAt: null, reopenedBy: null, createdAt: r.createdAt.toISOString() })), pagination: { limit: 100, offset: 0, total: items.length } });
    }
    const one = /^\/financial-periods\/(\d{4}-\d{2})$/.exec(path);
    if (call.method === "GET" && one) return json(200, { data: statusDto(one[1]) });
    const close = /^\/financial-periods\/(\d{4}-\d{2})\/close$/.exec(path);
    if (call.method === "POST" && close) {
      const body = call.body as { force?: boolean; reason?: string };
      states.set(close[1], { status: "closed", disputes: states.get(close[1])?.disputes ?? 0 });
      const forced = body.force === true;
      return json(200, { data: toFinancialPeriodCloseDto(record(close[1], "closed", { closedAt: at, snapshot: { latest: snapshot({ period: close[1], forced, forcedReason: forced ? (body.reason ?? null) : null }), history: [] } })) });
    }
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

async function mount(options: { override?: Override; july?: State } = {}) {
  states.clear();
  states.set("2026-07", options.july ?? { status: "reopened", disputes: 0 });
  seed(FINANCE);
  installFetch(options.override);
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(h(MemoryRouter, { initialEntries: ["/finance/fechamento"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(FechamentoPage))))));
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

const row = (container: MiniDomNode, id: string) => elements(container, (el) => el.localName === "tr" && el.getAttribute("data-row-key") === id)[0];
const button = (container: MiniDomNode, label: string) => elements(container, (el) => el.localName === "button" && text(el).trim() === label)[0];
const dialog = (container: MiniDomNode) => elements(container, (el) => el.getAttribute("role") === "dialog")[0];
const posts = () => calls.filter((c) => c.method === "POST");
const julyGets = () => calls.filter((c) => c.method === "GET" && c.url === "/financial-periods/2026-07").length;
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

async function type(container: MiniDomNode, value: string) {
  const area = elements(container, (el) => el.localName === "textarea")[0];
  assert.ok(area, "campo de motivo");
  const onChange = propsOf(area).onChange as (ev: unknown) => void;
  await act(async () => {
    onChange({ currentTarget: { value }, target: { value } });
  });
  await settle();
}

async function openJulyClose(container: MiniDomNode) {
  await press(row(container, "2026-07"));
  assert.equal(posts().length, 0);
  await press(button(container, "Fechar julho/2026"));
  assert.ok(dialog(container), `a confirmação abriu: ${serialize(container).slice(0, 300)}`);
}

test("B4 (i) 'Fechar' abre a confirmação com a trava; só o 2º clique envia UM POST …/close, com corpo {}", async () => {
  const { container, unmount } = await mount();
  try {
    await openJulyClose(container);
    assert.match(text(dialog(container)!), /Depois de fechado, nada mais é lançado em 07\/2026; só um administrador reabre\./);
    assert.equal(posts().length, 0, "o 1º clique só abre a confirmação");
    await press(button(container, "Fechar 07/2026"));
    assert.deepEqual(posts().map((c) => [c.url, c.body]), [["/financial-periods/2026-07/close", {}]]);
    assert.match(text(container), /Julho\/2026 fechado\./);
  } finally {
    await unmount();
  }
});

test("B4 (ii)(iii) com contestação: 1º passo com a contagem, 2º 'Fechar mesmo assim' com motivo obrigatório e aparado", async () => {
  const { container, unmount } = await mount({ july: { status: "reopened", disputes: 1 } });
  try {
    await openJulyClose(container);
    assert.match(text(dialog(container)!), /Há 1 título em contestação em Julho\/2026/);
    assert.equal(button(container, "Fechar 07/2026"), undefined, "sem o caminho comum quando há contestação");
    await press(button(container, "Fechar mesmo assim…"));
    assert.equal(posts().length, 0, "nenhum POST antes do 2º passo (iii)");
    const forceButton = () => button(container, "Fechar mesmo assim")!;
    assert.equal(forceButton().hasAttribute("disabled"), true, "motivo vazio");
    await type(container, "    ");
    assert.equal(forceButton().hasAttribute("disabled"), true, "motivo só de espaços");
    await type(container, "  Cliente confirmou o acerto por telefone  ");
    assert.equal(forceButton().hasAttribute("disabled"), false);
    await press(forceButton());
    assert.deepEqual(posts().map((c) => [c.url, c.body]), [["/financial-periods/2026-07/close", { force: true, reason: "Cliente confirmou o acerto por telefone" }]]);
  } finally {
    await unmount();
  }
});

test("B4 (iv) 422 pending_items_block_close no POST sem force ⇒ relê a competência e mostra a contagem nova", async () => {
  let blocked = false;
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "POST" && call.url.endsWith("/close") && !(call.body as { force?: boolean }).force) {
        blocked = true;
        states.set("2026-07", { status: "reopened", disputes: 1 });
        return json(422, { error: { code: "FINANCIAL_PERIOD_UNPROCESSABLE", reason: "pending_items_block_close", message: "x" } });
      }
      return null;
    },
  });
  try {
    await openJulyClose(container);
    const before = julyGets();
    await press(button(container, "Fechar 07/2026"));
    assert.ok(blocked);
    assert.equal(julyGets(), before + 1, "1 GET /financial-periods/2026-07 a mais");
    assert.match(text(dialog(container)!), /Há 1 título em contestação/);
    assert.ok(button(container, "Fechar mesmo assim…"), "a confirmação passou ao caminho forçado");
  } finally {
    await unmount();
  }
});

test("B5 'fechando' ⇒ 'Fechamento em andamento', sem ações; 409 ⇒ aviso e releitura", async () => {
  const closing = await mount({ july: { status: "closing", disputes: 0 } });
  try {
    await press(row(closing.container, "2026-07"));
    assert.match(text(closing.container), /Fechamento em andamento/);
    assert.equal(button(closing.container, "Fechar julho/2026"), undefined);
  } finally {
    await closing.unmount();
  }
  const conflict = await mount({
    override: (call) => (call.method === "POST" ? json(409, { error: { code: "FINANCIAL_PERIOD_CONFLICT", reason: "period_already_closed", message: "x" } }) : null),
  });
  try {
    await openJulyClose(conflict.container);
    const listBefore = calls.filter((c) => c.method === "GET" && c.url.startsWith("/financial-periods?")).length;
    await press(button(conflict.container, "Fechar 07/2026"));
    assert.match(text(conflict.container), /07\/2026 já foi fechado por outra pessoa; relendo\./);
    assert.equal(dialog(conflict.container), undefined);
    assert.ok(calls.filter((c) => c.method === "GET" && c.url.startsWith("/financial-periods?")).length > listBefore, "a lista é relida");
  } finally {
    await conflict.unmount();
  }
});

test("estados §7: erro, acesso não permitido e nenhum mês fechado", async () => {
  const failing = await mount({ override: (call) => (call.method === "GET" && call.url.startsWith("/financial-periods?") ? json(500, { error: { code: "X", reason: "x", message: "x" } }) : null) });
  try {
    assert.match(text(failing.container), /Não foi possível carregar as competências/);
  } finally {
    await failing.unmount();
  }
  const forbidden = await mount({ override: (call) => (call.method === "GET" && call.url.startsWith("/financial-periods?") ? json(403, { error: { code: "FORBIDDEN", reason: "forbidden", message: "x" } }) : null) });
  try {
    assert.match(text(forbidden.container), /Acesso não permitido/);
  } finally {
    await forbidden.unmount();
  }
  const empty = await mount({ july: { status: "open", disputes: 0 } });
  try {
    assert.match(text(empty.container), /nenhum mês fechado ainda/);
  } finally {
    await empty.unmount();
  }
});
