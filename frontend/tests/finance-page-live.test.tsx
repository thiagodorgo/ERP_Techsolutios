import assert from "node:assert/strict";
import test, { after } from "node:test";

// B-SAN3-12b — a página REAL do Financeiro (aparência A) com os hooks REAIS rodando efeitos, no arnês de DOM mínimo
// do repositório (copiado de aparencia-patios-live.test.tsx, que o herdou de work-orders-page-live.test.tsx): ZERO
// dependência nova; DOM instalado ANTES de react-dom/client; clique, tecla, digitação e envio pelo handler em
// `__reactProps$` (prova a fiação da página, não a delegação de eventos do React). A borda de rede (`fetch`) é o único
// dublê e responde com os BYTES do backend 12a (`toFinancialEntryListDto`, `toFinancialAccountListDto`, envelope de erro
// `{ error: { code, reason, message } }`); rota não prevista responde 404 e o caso que dependesse dela falha.
// Todo `assert.ok` leva mensagem: sem ela, o Node relê a linha-fonte para montar a mensagem e, no arquivo transpilado
// pelo tsx numa linha só, isso trava o processo em vez de reprovar (medido na mutação do F9).
// Prende por comportamento executado: F1, F2, F3, F6, F7, F9, F10, F11, F12, F14, F16, F20, F21 e F22 do §8.2 do plano.
process.env.VITE_USE_MOCKS = "false";

// =============================== DOM mínimo (sem dependência) ===============================

const HTML_NS = "http://www.w3.org/1999/xhtml";

type Listener = (event: unknown) => void;

class MiniNode {
  nodeType: number;
  nodeName: string;
  ownerDocument: MiniDocument | null;
  childNodes: MiniNode[] = [];
  parentNode: MiniNode | null = null;
  readonly listeners = new Map<string, Set<Listener>>();

  constructor(nodeType: number, nodeName: string, ownerDocument: MiniDocument | null) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.ownerDocument = ownerDocument;
  }
  get firstChild(): MiniNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): MiniNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): MiniNode | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }
  get previousSibling(): MiniNode | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }
  get parentElement(): MiniNode | null {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }
  appendChild<T extends MiniNode>(child: T): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  insertBefore<T extends MiniNode>(child: T, reference: MiniNode | null): T {
    if (!reference) return this.appendChild(child);
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.childNodes.indexOf(reference);
    this.childNodes.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild<T extends MiniNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  contains(node: MiniNode | null): boolean {
    for (let current = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }
  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }
  set textContent(value: string | null) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    if (value !== "" && value != null) this.appendChild(this.ownerDocument!.createTextNode(String(value)));
  }
  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }
}

class MiniText extends MiniNode {
  data: string;
  constructor(data: unknown, doc: MiniDocument) {
    super(3, "#text", doc);
    this.data = String(data);
  }
  get nodeValue(): string {
    return this.data;
  }
  set nodeValue(value: string) {
    this.data = String(value);
  }
  override get textContent(): string {
    return this.data;
  }
  override set textContent(value: string | null) {
    this.data = String(value);
  }
}

class MiniComment extends MiniNode {
  data: string;
  constructor(data: string, doc: MiniDocument) {
    super(8, "#comment", doc);
    this.data = data;
  }
  override get textContent(): string {
    return "";
  }
  override set textContent(_value: string | null) {
    /* comentário não tem texto visível */
  }
}

type StyleObject = Record<string, string> & { setProperty: (key: string, value: string) => void; removeProperty: (key: string) => void };

function styleObject(): StyleObject {
  const style = {} as StyleObject;
  Object.defineProperty(style, "setProperty", { value: (key: string, value: string) => void (style[key] = value) });
  Object.defineProperty(style, "removeProperty", { value: (key: string) => void delete style[key] });
  return style;
}

class MiniElement extends MiniNode {
  readonly tagName: string;
  readonly localName: string;
  readonly namespaceURI: string;
  readonly attributes = new Map<string, string>();
  readonly style = styleObject();
  private storedValue: string | undefined;
  // Acréscimo deste arquivo ao arnês: o <select> do paginador (TablePager) — o React lê `options` e marca `selected`.
  selected = false;
  defaultSelected = false;
  get options(): MiniElement[] {
    return elements(this, (el) => el.localName === "option");
  }

  constructor(tag: string, doc: MiniDocument, ns = HTML_NS) {
    super(1, ns === HTML_NS ? tag.toUpperCase() : tag, doc);
    this.tagName = this.nodeName;
    this.localName = tag;
    this.namespaceURI = ns;
  }
  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name)! : null;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  setAttributeNS(_ns: string | null, name: string, value: unknown): void {
    this.setAttribute(name, value);
  }
  removeAttributeNS(_ns: string | null, name: string): void {
    this.removeAttribute(name);
  }
  focus(): void {}
  blur(): void {}
  get value(): string {
    return this.storedValue ?? (this.localName === "option" ? (this.getAttribute("value") ?? this.textContent) : "");
  }
  set value(value: unknown) {
    this.storedValue = String(value);
  }
}

type CapturedInterval = { fn: (() => void) | null; ms: number };

class MiniDocument extends MiniNode {
  documentElement!: MiniElement;
  body!: MiniElement;
  activeElement!: MiniElement;
  hidden = false;
  defaultView: unknown = null;
  constructor() {
    super(9, "#document", null);
  }
  createElement(tag: string): MiniElement {
    return new MiniElement(tag, this);
  }
  createElementNS(ns: string, tag: string): MiniElement {
    return new MiniElement(tag, this, ns);
  }
  createTextNode(text: unknown): MiniText {
    return new MiniText(text, this);
  }
  createComment(text: string): MiniComment {
    return new MiniComment(text, this);
  }
}

function installMiniDom() {
  const doc = new MiniDocument();
  doc.documentElement = doc.appendChild(new MiniElement("html", doc));
  doc.body = doc.documentElement.appendChild(new MiniElement("body", doc));
  doc.activeElement = doc.body;
  const storage = new Map<string, string>();
  const intervals: CapturedInterval[] = [];
  const win = {
    document: doc,
    event: undefined as unknown,
    HTMLIFrameElement: class {},
    navigator: { userAgent: "node" },
    location: { href: "http://localhost/", pathname: "/", search: "", hash: "" },
    localStorage: {
      getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
      setItem: (key: string, value: unknown) => void storage.set(key, String(value)),
      removeItem: (key: string) => void storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: (type: string, listener: Listener) => doc.addEventListener(type, listener),
    removeEventListener: (type: string, listener: Listener) => doc.removeEventListener(type, listener),
    dispatchEvent: (event: { type: string }) => {
      for (const listener of doc.listeners.get(event.type) ?? []) listener(event);
      return true;
    },
    setInterval: (fn: () => void, ms: number) => {
      intervals.push({ fn, ms });
      return intervals.length;
    },
    clearInterval: (id: number) => {
      if (intervals[id - 1]) intervals[id - 1].fn = null;
    },
    // listAvailableContexts espera window.setTimeout(resolve, 250): colapsa o atraso para 0 ms.
    setTimeout: (fn: () => void, _ms?: number) => globalThis.setTimeout(fn, 0),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    scrollTo: () => {},
  };
  doc.defaultView = win;
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  if (typeof (globalThis as { navigator?: unknown }).navigator === "undefined") {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: win.navigator });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  return { doc, win, storage, intervals };
}

const VOID = new Set(["input", "img", "br", "hr", "meta", "link"]);

function serialize(node: MiniNode): string {
  if (node instanceof MiniText) return node.data.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  if (node instanceof MiniComment) return "";
  if (!(node instanceof MiniElement)) return node.childNodes.map(serialize).join("");
  const attrs = [...node.attributes].map(([key, value]) => ` ${key}="${value.replace(/"/g, "&quot;")}"`).join("");
  const style = Object.entries(node.style)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  const open = `<${node.localName}${attrs}${style ? ` style="${style}"` : ""}>`;
  return VOID.has(node.localName) ? open : `${open}${node.childNodes.map(serialize).join("")}</${node.localName}>`;
}

function elements(root: MiniNode, match: (el: MiniElement) => boolean, acc: MiniElement[] = []): MiniElement[] {
  for (const child of root.childNodes) {
    if (child instanceof MiniElement) {
      if (match(child)) acc.push(child);
      elements(child, match, acc);
    }
  }
  return acc;
}
const text = (el: MiniNode) => el.textContent;


// =============================== Instalação: DOM primeiro, módulos depois ===============================

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { FinanceiroPage } = await import("../src/modules/finance/pages/FinanceiroPage");
const { useFinancialTitles } = await import("../src/modules/finance/titles/useFinancialTitles");
const { useEntriesAggregate } = await import("../src/modules/finance/entries/useEntriesAggregate");
const { PermissionGuard } = await import("../src/guards/PermissionGuard");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { DEFAULT_AUTO_REFRESH_MS } = await import("../src/hooks/useAutoRefresh");

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

// =============================== Dados (os bytes do backend 12a) ===============================

const TENANT_ID = "org-financeiro";
const FINANCE = [
  "financial_entries:read",
  "financial_entries:create",
  "financial_entries:update",
  "financial_titles:read",
  "financial_titles:create",
  "financial_titles:update",
  "financial_accounts:read",
  "financial_accounts:create",
  "financial_accounts:update",
  "cheques:read",
  "cheques:create",
  "cheques:update",
];
const ADMIN = [...FINANCE, "financial_entries:unreconcile", "cheques:unlink_title", "tenant_settings:update"];
const MANAGER = ["financial_entries:read", "financial_titles:read", "financial_accounts:read", "cheques:read"];

const TODAY = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysFromToday = (n: number) => iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n));

const SUMMARY = {
  receivable: { openAmount: 1800, openCount: 2, overdueAmount: 1000, overdueCount: 1, inDisputeCount: 0 },
  payable: { openAmount: 450, openCount: 1, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  settledThisMonth: { competencia: "2026-10", inflow: 2300.5, outflow: 640 },
  cash: { totalBalance: 12850.75, accountCount: 2, currency: "BRL" },
  cheques: { pendingReceivedCount: 1, pendingReceivedAmount: 1000, pendingIssuedCount: 0, pendingIssuedAmount: 0, linkedPendingCount: 1, linkedPendingAmount: 1000 },
  cashFlow: [
    { competencia: "2026-05", inflow: 900, outflow: 300 },
    { competencia: "2026-06", inflow: 1100, outflow: 500 },
    { competencia: "2026-07", inflow: 1500, outflow: 700 },
    { competencia: "2026-08", inflow: 1300, outflow: 650 },
    { competencia: "2026-09", inflow: 1700, outflow: 800 },
    { competencia: "2026-10", inflow: 2300.5, outflow: 640 },
  ],
  recentTitles: [],
};

const ACCOUNTS = {
  items: [
    { id: "acc-banco", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 1000, bankName: "BB", status: "active", isActive: true, createdAt: "2026-01-01T12:00:00.000Z" },
    { id: "acc-caixa", name: "Caixa da loja", kind: "cash", currency: "BRL", openingBalance: 0, bankName: null, status: "active", isActive: true, createdAt: "2026-01-01T12:00:00.000Z" },
  ],
  pagination: { limit: 100, offset: 0, total: 2 },
};
const BALANCES: Record<string, unknown> = {
  "acc-banco": { accountId: "acc-banco", currency: "BRL", openingBalance: 1000, in: 11000, out: 300, balance: 11700 },
  "acc-caixa": { accountId: "acc-caixa", currency: "BRL", openingBalance: 0, in: 1500.75, out: 350, balance: 1150.75 },
};

const title = (over: Record<string, unknown>) => ({
  id: "t-x",
  direction: "receivable",
  partyType: "customer",
  partyName: "Cliente",
  document: null,
  category: null,
  amount: 100,
  currency: "BRL",
  dueDate: daysFromToday(10),
  paidAmount: 0,
  status: "open",
  competencia: "2026-10",
  accountId: null,
  workOrderId: null,
  overdue: false,
  active: true,
  createdAt: "2026-10-01T12:00:00.000Z",
  ...over,
});
const RECEIVABLES = [
  title({ id: "t-vencido", partyName: "Transportes Alfa", document: "NF 1001", amount: 1000, dueDate: daysFromToday(-5), overdue: true, workOrderId: "wo-1" }),
  title({ id: "t-parcial", partyName: "Oficina Beta", document: "NF 1002", amount: 1300, paidAmount: 500, status: "partially_paid", dueDate: daysFromToday(3) }),
  title({ id: "t-pago", partyName: "Cliente Quitado", document: "NF 0999", amount: 50, paidAmount: 50, status: "paid" }),
];
const PAYABLES = [title({ id: "t-fornecedor", direction: "payable", partyType: "supplier", partyName: "Posto Gama", document: "Boleto 55", amount: 450, dueDate: daysFromToday(0) })];
const RECEIVABLES_130 = Array.from({ length: 130 }, (_, index) =>
  title({
    id: `t-lote-${String(index + 1).padStart(3, "0")}`,
    partyName: `Cliente ${String(index + 1).padStart(3, "0")}`,
    document: `NF ${String(index + 1).padStart(4, "0")}`,
    description: index === 5 ? "Contrato guincho especial" : index === 120 ? "Descrição fora da página carregada" : null,
    // 17 vencidos, 7 deles DEPOIS da 1ª página: só o resumo do servidor sabe o total.
    dueDate: index < 10 || index >= 123 ? daysFromToday(-5) : index === 10 ? daysFromToday(0) : daysFromToday(10),
    overdue: index < 10 || index >= 123,
  }),
);

const entry = (over: Record<string, unknown>) => ({
  id: "e-x",
  accountId: "acc-banco",
  titleId: null,
  direction: "in",
  amount: 10,
  currency: "BRL",
  paymentMethod: "pix",
  category: null,
  occurredAt: "2026-10-20T13:00:00.000Z",
  competencia: "2026-10",
  description: "Lançamento",
  reversalOf: null,
  reconciled: false,
  divergenceType: null,
  reconciliationRef: null,
  reconciledAt: null,
  reconciledBy: null,
  active: true,
  createdAt: "2026-10-20T13:00:00.000Z",
  updatedAt: "2026-10-20T13:00:00.000Z",
  ...over,
});
const STAMP = "2026-10-21T10:00:00.123Z";
const ENTRIES = [
  entry({ id: "e-aberto", description: "Recebimento NF 0900", amount: 200 }),
  entry({ id: "e-conciliado", description: "Recebimento NF 0901", amount: 350, reconciled: true, reconciledAt: STAMP, reconciledBy: "u-1", reconciliationRef: "DOC 9" }),
  entry({ id: "e-caixa", accountId: "acc-caixa", direction: "out", description: "Compra de material", amount: 80, paymentMethod: "cash" }),
];

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const apiError = (status: number, reason: string) => json(status, { error: { code: "FINANCIAL_ENTRY_UNPROCESSABLE", reason, message: reason } });

type Call = { readonly method: string; readonly url: string; readonly body: Record<string, unknown> | null };
const calls: Call[] = [];
type Override = (call: Call) => Response | Promise<Response> | undefined;

/** O dublê faz o papel do SERVIDOR no agregado (é ele quem soma); o front só exibe o que vem. */
function aggregateFor(url: URL) {
  const reconciled = url.searchParams.get("reconciled");
  const divergence = url.searchParams.get("divergence_type");
  const account = url.searchParams.get("account_id");
  const rows = ENTRIES.filter(
    (e) =>
      (reconciled === null || String(e.reconciled) === reconciled) &&
      (divergence === null || e.divergenceType === divergence) &&
      (account === null || e.accountId === account),
  );
  const total = (direction: string) => rows.filter((e) => e.direction === direction).map((e) => Number(e.amount)).reduce((a, b) => a + b, 0);
  return { groupBy: "none", currency: "BRL", timezone: "America/Sao_Paulo", items: [{ bucket: null, count: rows.length, inflow: total("in"), outflow: total("out"), net: total("in") - total("out") }] };
}

function installFetch(override?: Override) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null };
    calls.push(call);
    const custom = override?.(call);
    if (custom) return custom;
    const parsed = new URL(`http://x${url}`);
    const path = parsed.pathname;
    if (call.method === "GET" && path === "/financial-summary") return json(200, { data: SUMMARY });
    if (call.method === "GET" && path === "/financial-accounts") return json(200, ACCOUNTS);
    const balance = /^\/financial-accounts\/([^/]+)\/balance$/.exec(path);
    if (call.method === "GET" && balance) return json(200, { data: BALANCES[balance[1]] });
    if (call.method === "GET" && path === "/financial-titles") {
      const items = parsed.searchParams.get("direction") === "payable" ? PAYABLES : RECEIVABLES;
      return json(200, { items, pagination: { limit: 100, offset: 0, total: items.length } });
    }
    const titleId = /^\/financial-titles\/([^/]+)$/.exec(path);
    if (call.method === "GET" && titleId) return json(200, { data: [...RECEIVABLES, ...PAYABLES].find((t) => t.id === titleId[1]) });
    if (call.method === "GET" && path === "/financial-entries/reconciliation-policy") return json(200, { data: { canUnreconcile: false, delegatedToFinance: false } });
    if (call.method === "GET" && path === "/financial-entries/aggregate") return json(200, { data: aggregateFor(parsed) });
    if (call.method === "GET" && path === "/financial-entries") {
      const account = parsed.searchParams.get("account_id");
      const reconciled = parsed.searchParams.get("reconciled");
      const items = ENTRIES.filter((e) => (account === null || e.accountId === account) && (reconciled === null || String(e.reconciled) === reconciled));
      return json(200, { items, pagination: { limit: 100, offset: 0, total: items.length } });
    }
    const entryId = /^\/financial-entries\/([^/]+)$/.exec(path);
    if (call.method === "GET" && entryId) return json(200, { data: ENTRIES.find((e) => e.id === entryId[1]) });
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seed(permissions: readonly string[], role = "Financeiro") {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: [role as never], permissions: [...permissions] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Organização de Teste",
      tenantStatus: "active",
      branchId: "fil-1",
      branchName: "Matriz",
      role,
      permissions,
      enabledModules: ["dashboard", "finance"],
      scope: "tenant",
    }),
  );
}

function propsOf(el: MiniElement): Record<string, unknown> {
  const key = Object.keys(el).find((name) => name.startsWith("__reactProps$"));
  assert.ok(key, `__reactProps$ ausente em <${el.localName}>`);
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

async function press(el: MiniElement | undefined) {
  assert.ok(el, "elemento para clicar não encontrado");
  const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onClick, "function", `onClick ausente em <${el.localName}> "${text(el)}"`);
  await act(async () => {
    onClick!({ preventDefault() {}, stopPropagation() {} });
  });
  await settle();
}

async function pressKey(el: MiniElement, key: string) {
  const onKeyDown = propsOf(el).onKeyDown as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onKeyDown, "function", `onKeyDown ausente em <${el.localName}>`);
  await act(async () => {
    onKeyDown!({ key, preventDefault() {}, stopPropagation() {} });
  });
  await settle();
}

async function type(el: MiniElement | undefined, value: string) {
  assert.ok(el, "campo não encontrado");
  const onChange = propsOf(el).onChange as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onChange, "function", `onChange ausente em <${el.localName}>`);
  await act(async () => {
    el.value = value;
    onChange!({ target: el, currentTarget: el });
  });
  await settle();
}

async function submit(form: MiniElement | undefined) {
  assert.ok(form, "formulário não encontrado");
  const onSubmit = propsOf(form).onSubmit as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onSubmit, "function", "onSubmit ausente no formulário");
  await act(async () => {
    onSubmit!({ preventDefault() {}, stopPropagation() {} });
  });
  await settle();
}

const all = (root: MiniNode, match: (el: MiniElement) => boolean) => elements(root, match);
const byLabel = (root: MiniNode, prefix: string) => all(root, (el) => (el.getAttribute("aria-label") ?? "").startsWith(prefix))[0];
const buttonByText = (root: MiniNode, needle: string) => all(root, (el) => el.localName === "button" && text(el).trim() === needle)[0];
// O React 19 grava `name`/`value` de <input>/<textarea> como PROPRIEDADE do nó (não atributo): lê os dois.
const nameOf = (el: MiniElement) => el.getAttribute("name") ?? ((el as unknown as { name?: unknown }).name as string | undefined) ?? null;
const byName = (root: MiniNode, name: string) => all(root, (el) => nameOf(el) === name)[0];
const tab = (root: MiniNode, label: string) => all(root, (el) => el.getAttribute("role") === "tab" && text(el).startsWith(label))[0];
const rows = (root: MiniNode) => all(root, (el) => el.localName === "tr" && el.getAttribute("class") === "pat-ab-row");
const detailRows = (root: MiniNode) => all(root, (el) => el.localName === "tr" && el.getAttribute("class") === "pat-ab-detail-row");
const rowFor = (root: MiniNode, needle: string) => rows(root).find((row) => text(row).includes(needle));
const dialog = (root: MiniNode) => all(root, (el) => el.getAttribute("role") === "dialog")[0];
const formsIn = (root: MiniNode) => all(root, (el) => el.localName === "form");
const submitButtons = (root: MiniNode) => all(root, (el) => el.localName === "button" && el.getAttribute("type") === "submit");
const countCalls = (method: string, pattern: RegExp) => calls.filter((c) => c.method === method && pattern.test(c.url)).length;
const pageRoot = (root: MiniNode) => all(root, (el) => el.hasAttribute("data-aparencia"))[0];
const appearanceKey = () => `techsol.aparencia.${TENANT_ID}.${mockSession.user.id}`;

async function mount(options: { permissions?: readonly string[]; role?: string; url?: string; override?: Override; guard?: boolean } = {}) {
  seed(options.permissions ?? FINANCE, options.role);
  installFetch(options.override);
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  const page = options.guard ? h(PermissionGuard, { permissions: ["financial_entries:read", "finance:read"] }, h(FinanceiroPage)) : h(FinanceiroPage);
  await act(async () => {
    root.render(h(MemoryRouter, { initialEntries: [options.url ?? "/finance"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, page)))));
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

type TitlesHookSnapshot = ReturnType<typeof useFinancialTitles>;
type AggregateHookSnapshot = ReturnType<typeof useEntriesAggregate>;

async function mountTitlesHook(override: Override) {
  seed(FINANCE);
  installFetch(override);
  let snapshot: TitlesHookSnapshot | null = null;
  function Probe() {
    const value = useFinancialTitles("receivable");
    snapshot = value;
    return h("button", { type: "button", onClick: () => void value.loadMore() }, "Carregar página seguinte");
  }
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(h(AuthProvider, null, h(TenantProvider, null, h(Probe))));
  });
  await settle();
  return {
    container,
    snapshot: () => snapshot,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

async function mountAggregateHook(override: Override) {
  seed(FINANCE);
  installFetch(override);
  let snapshot: AggregateHookSnapshot | null = null;
  function Probe() {
    const [accountId, setAccountId] = React.useState("acc-banco");
    const name = `conta:${accountId}`;
    const value = useEntriesAggregate({ [name]: { groupBy: "none", accountId, reconciled: false } }, { enabled: true });
    snapshot = value;
    const count = value.data[name]?.items[0]?.count;
    return h(
      "div",
      null,
      h("output", { "aria-label": "Contagem do agregado" }, count === undefined ? "indisponível" : String(count)),
      h("button", { type: "button", onClick: () => void value.refresh() }, "Atualizar agregado"),
      h("button", { type: "button", onClick: () => setAccountId("acc-caixa") }, "Trocar conta"),
    );
  }
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(h(AuthProvider, null, h(TenantProvider, null, h(Probe))));
  });
  return {
    container,
    snapshot: () => snapshot,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

// =============================== F14 · carga e aparência ===============================

test("R-P3: resposta antiga da mesma consulta não substitui a nova e outra conta não herda o agregado", async () => {
  type Pending = { resolve: (response: Response) => void; promise: Promise<Response>; url: string };
  const pending: Pending[] = [];
  const aggregate = (count: number) =>
    json(200, { data: { groupBy: "none", currency: "BRL", timezone: "America/Sao_Paulo", items: [{ bucket: null, count, inflow: count, outflow: 0, net: count }] } });
  const probe = await mountAggregateHook((call) => {
    if (call.method !== "GET" || !call.url.startsWith("/financial-entries/aggregate?")) return undefined;
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>((done) => {
      resolve = done;
    });
    pending.push({ resolve, promise, url: call.url });
    return promise;
  });
  try {
    assert.equal(pending.length, 1, "primeira rodada controlada");
    let secondDone!: Promise<void>;
    await act(async () => {
      secondDone = probe.snapshot()!.refresh();
      await Promise.resolve();
    });
    assert.equal(pending.length, 2, "segunda rodada da mesma chave");
    pending[1].resolve(aggregate(222));
    await act(async () => secondDone);
    await settle();
    assert.equal(probe.snapshot()?.data["conta:acc-banco"]?.items[0]?.count, 222);
    assert.equal(text(byLabel(probe.container, "Contagem do agregado")!), "222");

    pending[0].resolve(aggregate(111));
    await settle();
    assert.equal(probe.snapshot()?.data["conta:acc-banco"]?.items[0]?.count, 222, "a resposta antiga é descartada");

    await act(async () => {
      const button = buttonByText(probe.container, "Trocar conta");
      (propsOf(button!).onClick as () => void)();
      await Promise.resolve();
    });
    assert.equal(pending.length, 3, "a conta nova inicia consulta própria");
    assert.match(pending[2].url, /account_id=acc-caixa/);
    assert.equal(probe.snapshot()?.data["conta:acc-caixa"], undefined, "a conta nova não recebe o valor da anterior");
    assert.equal(text(byLabel(probe.container, "Contagem do agregado")!), "indisponível");
    pending[2].resolve(aggregate(333));
    await settle();
    assert.equal(probe.snapshot()?.data["conta:acc-caixa"]?.items[0]?.count, 333);
  } finally {
    for (const item of pending) item.resolve(aggregate(0));
    await settle();
    await probe.unmount();
  }
});

test("F14: a página pede cada rota e cada URL de agregado UMA vez por carga, sem perder as contagens por conta", async () => {
  let releaseAccounts!: (response: Response) => void;
  const delayedAccounts = new Promise<Response>((resolve) => {
    releaseAccounts = resolve;
  });
  let accountsReleased = false;
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "GET" && /^\/financial-accounts\?/.test(call.url)) return delayedAccounts;
      if (!accountsReleased && call.method === "GET" && /^\/financial-entries\/aggregate\?/.test(call.url)) {
        accountsReleased = true;
        releaseAccounts(json(200, ACCOUNTS));
      }
      return undefined;
    },
  });
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A");
    assert.equal(countCalls("GET", /^\/financial-summary$/), 1, calls.map((c) => c.url).join(" | "));
    assert.equal(countCalls("GET", /^\/financial-accounts\?/), 1);
    assert.equal(countCalls("GET", /^\/financial-titles\?direction=receivable/), 1);
    assert.equal(countCalls("GET", /^\/financial-titles\?direction=payable/), 1);
    assert.equal(countCalls("GET", /^\/financial-entries\?/), 1);
    assert.equal(countCalls("GET", /^\/financial-entries\/reconciliation-policy$/), 1);
    assert.equal(countCalls("GET", /^\/financial-accounts\/acc-banco\/balance$/), 1);
    const aggregateUrls = calls.filter((call) => call.method === "GET" && /^\/financial-entries\/aggregate\?/.test(call.url)).map((call) => call.url);
    assert.equal(aggregateUrls.length, 6, aggregateUrls.join(" | "));
    assert.equal(new Set(aggregateUrls).size, 6, aggregateUrls.join(" | "));
    for (const url of aggregateUrls) assert.equal(countCalls("GET", new RegExp(`^${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)), 1, url);
    assert.equal(dom.storage.has(appearanceKey()), false, "abrir a página não grava aparência");
    for (const label of ["Saldo em caixa", "Entradas em outubro", "Saídas em outubro", "A receber vencido", "A pagar vencido", "A conciliar"]) {
      const kpi = byLabel(container, `${label}:`);
      assert.ok(kpi && kpi.localName === "button", `indicador "${label}"`);
      assert.ok(kpi.hasAttribute("aria-pressed"), `"${label}" publica aria-pressed`);
    }
    assert.match(text(byLabel(container, "Saldo em caixa:")!), /R\$\s12\.850,75/, "saldo em caixa do /financial-summary");
    assert.match(byLabel(container, "A conciliar:")!.getAttribute("aria-label")!, /^A conciliar: 2 lançamentos/, "contagem do servidor (/aggregate)");
    assert.ok(byLabel(container, "Banco do Brasil: 1 a conciliar"), "a contagem por conta continua presente depois da rodada situacional");
    assert.ok(byLabel(container, "Caixa da loja: 1 a conciliar"), "a segunda contagem por conta continua presente depois da rodada situacional");
    // P-SAN3-20-RESUMO-CHEQUE-VINCULADO — o rótulo do valor já coberto por cheque a compensar (`cheques.linkedPending*`).
    assert.match(text(container).replace(/\u00a0/g, " "), /R\$ 1\.000,00 em 1 cheque vinculado a títulos aguardam compensação/);
  } finally {
    await unmount();
  }
});

test("R3(a): o hook carrega 100, busca offset 100, deduplica e relê todas as páginas alcançadas", async () => {
  const titlePage: Override = (call) => {
    if (call.method !== "GET" || !call.url.startsWith("/financial-titles?")) return undefined;
    const url = new URL(`http://x${call.url}`);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    return json(200, {
      items: RECEIVABLES_130.slice(offset, offset + 100),
      pagination: { limit: 100, offset, total: RECEIVABLES_130.length },
    });
  };
  const probe = await mountTitlesHook(titlePage);
  try {
    assert.equal(probe.snapshot()?.items.length, 100);
    assert.equal(probe.snapshot()?.total, 130);
    assert.equal(probe.snapshot()?.hasMore, true);
    await press(buttonByText(probe.container, "Carregar página seguinte"));
    assert.equal(probe.snapshot()?.items.length, 130);
    assert.equal(new Set(probe.snapshot()?.items.map((item) => item.id)).size, 130);
    assert.equal(probe.snapshot()?.hasMore, false);
    assert.ok(calls.some((call) => /(?:^|[?&])offset=100(?:&|$)/.test(call.url)), "a segunda página usa offset=100");

    const beforeRefresh = calls.length;
    await act(async () => {
      await probe.snapshot()?.refresh(true);
    });
    await settle();
    assert.equal(probe.snapshot()?.items.length, 130, "a releitura das páginas alcançadas não encolhe para 100");
    const refreshUrls = calls.slice(beforeRefresh).map((call) => call.url);
    assert.ok(refreshUrls.some((url) => /(?:^|[?&])offset=0(?:&|$)/.test(url)), refreshUrls.join(" | "));
    assert.ok(refreshUrls.some((url) => /(?:^|[?&])offset=100(?:&|$)/.test(url)), refreshUrls.join(" | "));
  } finally {
    await probe.unmount();
  }
});

test("R3(b-c): abas e Vencidos usam o resumo; blocos locais omitem a contagem enquanto faltam páginas", async () => {
  const summary130 = {
    ...SUMMARY,
    receivable: { ...SUMMARY.receivable, openCount: 130, overdueCount: 17 },
  };
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "GET" && call.url === "/financial-summary") return json(200, { data: summary130 });
      if (call.method === "GET" && call.url.startsWith("/financial-titles?direction=receivable")) {
        const url = new URL(`http://x${call.url}`);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        return json(200, {
          items: RECEIVABLES_130.slice(offset, offset + 100),
          pagination: { limit: 100, offset, total: RECEIVABLES_130.length },
        });
      }
      return undefined;
    },
  });
  try {
    assert.match(text(tab(container, "A receber")!), /A receber\s*130/);
    assert.match(byLabel(container, "Vencidos:")!.getAttribute("aria-label")!, /^Vencidos: 17 —/);
    assert.equal(text(byLabel(container, "Vencidos:")!), "Vencidos17");
    for (const label of ["Vencem hoje", "Próximos 7 dias", "Recebidos em parte"]) {
      const block = byLabel(container, `${label}:`);
      assert.ok(block, `bloco ${label}`);
      assert.equal(text(block!), label, `${label} não publica contagem parcial`);
      assert.equal(
        block!.getAttribute("aria-label"),
        `${label}: contagem disponível depois de carregar todos os títulos — filtrar a lista`,
      );
    }
  } finally {
    await unmount();
  }
});

test("R3(d-e-f): contador honesto, TablePager da biblioteca e 'Carregar mais títulos' até todos os títulos", async () => {
  const summary130 = {
    ...SUMMARY,
    receivable: { ...SUMMARY.receivable, openCount: 130, overdueCount: 17 },
  };
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "GET" && call.url === "/financial-summary") return json(200, { data: summary130 });
      if (call.method === "GET" && call.url.startsWith("/financial-titles?direction=receivable")) {
        const url = new URL(`http://x${call.url}`);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        return json(200, {
          items: RECEIVABLES_130.slice(offset, offset + 100),
          pagination: { limit: 100, offset, total: RECEIVABLES_130.length },
        });
      }
      return undefined;
    },
  });
  const counter = () => text(all(container, (el) => el.getAttribute("class") === "pat-table__count")[0]!);
  const pager = () => all(container, (el) => el.localName === "nav" && el.getAttribute("aria-label") === "Paginação da lista")[0];
  const range = () => text(all(container, (el) => el.getAttribute("class") === "pat-pager__range")[0]!);
  const loadMoreButton = () => all(container, (el) => el.localName === "button" && text(el).startsWith("Carregar mais títulos"))[0];
  try {
    assert.match(text(tab(container, "A receber")!), /A receber\s*130/, "aba com a contagem do servidor");
    assert.equal(counter(), "100 resultados entre 100 títulos carregados · 130 títulos no servidor", "contador separa resultado e universo");
    assert.ok(pager(), "o TablePager da biblioteca está no rodapé da tabela");
    assert.equal(range(), "1–20 de 100 resultados carregados · 130 títulos no servidor");
    assert.equal(rows(container).length, 20, "página de 20 linhas");
    assert.equal(text(byLabel(container, "Vencidos:")!), "Vencidos17", "Vencidos vem do resumo");
    assert.equal(text(byLabel(container, "Vencem hoje:")!), "Vencem hoje", "sem número com a carga incompleta");
    assert.equal(text(loadMoreButton()!).trim(), "Carregar mais títulos (30 restantes)");

    await press(loadMoreButton());
    const more = calls.filter((call) => call.method === "GET" && call.url.startsWith("/financial-titles?direction=receivable"));
    assert.ok(
      more.some((call) => /(?:^|[?&])limit=100(?:&|$)/.test(call.url) && /(?:^|[?&])offset=100(?:&|$)/.test(call.url)),
      more.map((call) => call.url).join(" | "),
    );
    assert.equal(counter(), "130 resultados", "contador da carga completa");
    assert.equal(range(), "1–20 de 130 resultados carregados");
    assert.equal(text(byLabel(container, "Vencem hoje:")!), "Vencem hoje1", "com a carga completa o bloco local conta");
    assert.equal(loadMoreButton(), undefined, "o botão some quando não falta título");

    await press(buttonByText(container, "Próxima"));
    assert.equal(range(), "21–40 de 130 resultados carregados");
    const page2 = rows(container);
    assert.equal(page2.length, 20);
    // Ordem por vencimento: 17 vencidos, 1 que vence hoje (Cliente 011), depois os demais; a linha 21 é o Cliente 014.
    assert.ok(text(page2[0]).includes("Cliente 014"), text(page2[0]));
    assert.ok(text(page2[19]).includes("Cliente 033"), text(page2[19]));

    // A página volta à primeira a cada go() (aqui, o bloco "Vencidos").
    await press(byLabel(container, "Vencidos:"));
    assert.equal(range(), "1–17 de 17 resultados carregados");
    assert.equal(counter(), "17 resultados");
  } finally {
    await unmount();
  }
});

test("R-P1/R-P6: busca documento, parte e descrição só nos títulos carregados, com pager e universo separados", async () => {
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "GET" && call.url.startsWith("/financial-titles?direction=receivable")) {
        const url = new URL(`http://x${call.url}`);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        return json(200, { items: RECEIVABLES_130.slice(offset, offset + 100), pagination: { limit: 100, offset, total: 130 } });
      }
      return undefined;
    },
  });
  const counter = () => text(all(container, (el) => el.getAttribute("class") === "pat-table__count")[0]!);
  const range = () => text(all(container, (el) => el.getAttribute("class") === "pat-pager__range")[0]!);
  try {
    await type(byName(container, "busca-titulos"), "contrato guincho");
    assert.equal(rows(container).length, 1, "descrição participa da busca");
    assert.match(text(rows(container)[0]), /Cliente 006/);
    assert.equal(counter(), "1 resultados entre 100 títulos carregados · 130 títulos no servidor (sem este filtro)");
    assert.equal(range(), "1–1 de 1 resultados carregados · 130 títulos no servidor (sem este filtro)");
    assert.match(text(container), /Filtro: Busca: contrato guincho/);

    await type(byName(container, "busca-titulos"), "NF 0099");
    assert.equal(rows(container).length, 1, "documento participa da busca");
    assert.match(text(rows(container)[0]), /Cliente 099/);

    await type(byName(container, "busca-titulos"), "Cliente 042");
    assert.equal(rows(container).length, 1, "cliente participa da busca");

    await type(byName(container, "busca-titulos"), "fora da página carregada");
    assert.equal(rows(container).length, 0, "resultado fora da carga atual não é inventado");
    assert.match(counter(), /^0 resultados entre 100 títulos carregados/);
    await press(all(container, (el) => el.localName === "button" && text(el).startsWith("Carregar mais títulos"))[0]);
    assert.equal(rows(container).length, 1, "o resultado aparece depois de carregar a página que o contém");
    assert.match(text(rows(container)[0]), /Cliente 121/);

    await press(byLabel(container, "Limpar a busca de títulos"));
    assert.equal(rows(container).length, 20, "limpar restaura a lista carregada");
    assert.equal(byName(container, "busca-titulos")?.value, "");
  } finally {
    await unmount();
  }
});

// =============================== F11 · indicador que filtra ===============================

test("F11: o indicador 'A receber vencido' leva à aba filtrada; o filtro aparece e sai com um clique", async () => {
  const { container, unmount } = await mount({ url: "/finance?aba=ext" });
  try {
    await press(byLabel(container, "A receber vencido:"));
    assert.equal(tab(container, "A receber")?.getAttribute("aria-selected"), "true");
    assert.equal(byLabel(container, "A receber vencido:")?.getAttribute("aria-pressed"), "true");
    assert.match(text(container), /Filtro: Vencidos/);
    assert.deepEqual(rows(container).map((r) => text(r).includes("Transportes Alfa")), [true], "só o título vencido");
    await press(byLabel(container, "Remover o filtro"));
    assert.doesNotMatch(text(container), /Filtro: /);
    assert.equal(rows(container).length, 2, "os dois títulos em aberto (o quitado não entra)");
    assert.equal(byLabel(container, "A receber vencido:")?.getAttribute("aria-pressed"), "false");
  } finally {
    await unmount();
  }
});

test("F11: 'A conciliar' leva à aba Conciliação filtrada no servidor (reconciled=false)", async () => {
  const { container, unmount } = await mount();
  try {
    await press(byLabel(container, "A conciliar:"));
    assert.equal(tab(container, "Conciliação")?.getAttribute("aria-selected"), "true");
    assert.ok(calls.some((c) => c.method === "GET" && /^\/financial-entries\?.*reconciled=false/.test(c.url)), "o filtro vai ao servidor");
    assert.equal(rows(container).length, 2);
    for (const row of rows(container)) assert.doesNotMatch(text(row), /Conciliado/);
  } finally {
    await unmount();
  }
});

test("R-P4: indicador global não fica pressionado com conta em foco e limpa a conta ao ser acionado", async () => {
  const { container, unmount } = await mount({ url: "/finance?aba=conc&conta=acc-banco&filtro=conc:pendente" });
  try {
    assert.equal(byLabel(container, "A conciliar:")?.getAttribute("aria-pressed"), "false");
    assert.match(text(container), /Filtro: Conta: Banco do Brasil/);
    await press(byLabel(container, "A conciliar:"));
    assert.equal(byLabel(container, "A conciliar:")?.getAttribute("aria-pressed"), "true");
    assert.doesNotMatch(text(container), /Filtro: Conta:/);
  } finally {
    await unmount();
  }
});

test("R2: 'Conciliação por conta' separa nome e contagem com flex e distância mínima", async () => {
  const { container, unmount } = await mount();
  try {
    const accountButton = byLabel(container, "Banco do Brasil: 1 a conciliar");
    assert.ok(accountButton, "faixa da conta Banco do Brasil presente");
    assert.equal(accountButton.style.display, "flex");
    assert.equal(accountButton.style.alignItems, "center");
    assert.equal(accountButton.style.justifyContent, "space-between");
    assert.equal(accountButton.style.width, "100%");
    assert.equal(accountButton.style.textAlign, "left");
    const children = accountButton.childNodes.filter((node): node is MiniElement => node instanceof MiniElement);
    assert.deepEqual(children.map((child) => child.localName), ["span", "b"]);
    assert.equal(children[0].getAttribute("title"), "Banco do Brasil");
    assert.equal(children[1].style.whiteSpace, "nowrap");
    assert.equal(children[1].style.marginLeft, "8px");
  } finally {
    await unmount();
  }
});

test("R1: filtro de conta convive com o alvo e sai com um clique sem manter account_id", async () => {
  const { container, unmount } = await mount();
  try {
    await press(byLabel(container, "Banco do Brasil: 1 a conciliar"));
    assert.equal(tab(container, "Conciliação")?.getAttribute("aria-selected"), "true");
    assert.match(text(container), /Filtro: Conta: Banco do Brasil/);

    const pressedSituation = all(
      container,
      (el) =>
        el.localName === "button" &&
        (el.getAttribute("aria-label") ?? "").startsWith("A conciliar:") &&
        (el.getAttribute("aria-label") ?? "").includes("filtrar a lista") &&
        el.getAttribute("aria-pressed") === "true",
    )[0];
    await press(pressedSituation);
    assert.match(text(container), /Filtro: Conta: Banco do Brasil/, "tirar o alvo preserva o chip da conta");

    await press(byLabel(container, "Remover o filtro de conta"));
    assert.doesNotMatch(text(container), /Filtro: Conta:/);
    assert.equal(rows(container).length, 3, "a lista volta aos três lançamentos da organização");
    const lastEntriesCall = calls.filter((call) => call.method === "GET" && call.url.startsWith("/financial-entries?")).at(-1);
    assert.ok(lastEntriesCall, "pedido do extrato após remover a conta");
    assert.doesNotMatch(lastEntriesCall.url, /(?:^|[?&])account_id=/);
  } finally {
    await unmount();
  }
});

test("R1: indicador da organização limpa a conta selecionada antes de abrir 'A conciliar'", async () => {
  const { container, unmount } = await mount({ url: "/finance?aba=ext" });
  try {
    await press(byLabel(container, "Caixa da loja: saldo"));
    assert.match(text(container), /Filtro: Conta: Caixa da loja/);
    await press(byLabel(container, "A conciliar:"));
    assert.equal(tab(container, "Conciliação")?.getAttribute("aria-selected"), "true");
    assert.doesNotMatch(text(container), /Filtro: Conta:/);
    assert.equal(rows(container).length, 2, "o indicador mostra os dois lançamentos pendentes da organização");
    const lastEntriesCall = calls.filter((call) => call.method === "GET" && call.url.startsWith("/financial-entries?")).at(-1);
    assert.ok(lastEntriesCall, "pedido da conciliação após clicar o indicador");
    assert.match(lastEntriesCall.url, /(?:^|[?&])reconciled=false(?:&|$)/);
    assert.doesNotMatch(lastEntriesCall.url, /(?:^|[?&])account_id=/);
  } finally {
    await unmount();
  }
});

// =============================== F12 · linha e detalhe ===============================

test("F12: linha de uma altura, sem botão; o detalhe abre logo abaixo, um por vez; Enter/Espaço abrem, Escape fecha", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(rows(container).length, 2);
    for (const row of rows(container)) {
      assert.equal(all(row, (el) => el.localName === "button").length, 0, "nenhum botão na linha");
      assert.equal(row.getAttribute("tabindex"), "0");
    }
    await press(rowFor(container, "Transportes Alfa"));
    assert.equal(detailRows(container).length, 1);
    assert.match(text(detailRows(container)[0]), /Registrar recebimento/);
    const parcial = rowFor(container, "Oficina Beta")!;
    await pressKey(parcial, "Enter");
    assert.equal(detailRows(container).length, 1, "um detalhe por vez");
    assert.equal(rowFor(container, "Oficina Beta")!.getAttribute("aria-expanded"), "true");
    assert.equal(rowFor(container, "Transportes Alfa")!.getAttribute("aria-expanded"), "false");
    await pressKey(rowFor(container, "Oficina Beta")!, "Escape");
    assert.equal(detailRows(container).length, 0);
    await pressKey(rowFor(container, "Oficina Beta")!, " ");
    assert.equal(detailRows(container).length, 1);
  } finally {
    await unmount();
  }
});

// =============================== F1 · F2 · F3 · a baixa ===============================

async function openBaixa(container: MiniNode, party: string) {
  await press(rowFor(container, party));
  await press(buttonByText(detailRows(container)[0]!, "Registrar recebimento"));
  const modal = dialog(container);
  assert.ok(modal, "a baixa abre em janela");
  return modal;
}

test("F1/F2/F3: rede caiu → relê o título antes de falar e trava o reenvio até a releitura voltar; o reenvio usa o MESMO id; formulário novo → id novo", async () => {
  let payAttempts = 0;
  let releaseReread!: () => void;
  const rereadGate = new Promise<void>((resolve) => (releaseReread = resolve));
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "POST" && call.url === "/financial-titles/t-vencido/pay") {
        payAttempts += 1;
        if (payAttempts === 1) return Promise.reject(new TypeError("Failed to fetch"));
        return Promise.resolve(json(201, { data: { ...RECEIVABLES[0], paidAmount: 1000, status: "paid" } }));
      }
      if (call.method === "GET" && call.url === "/financial-titles/t-vencido" && payAttempts === 1) {
        return rereadGate.then(() => json(200, { data: RECEIVABLES[0] }));
      }
      return undefined;
    },
  });
  try {
    const modal = await openBaixa(container, "Transportes Alfa");
    await type(byName(modal, "conta"), "acc-banco");
    await submit(formsIn(modal)[0]);
    assert.equal(countCalls("GET", /^\/financial-titles\/t-vencido$/), 1, "relê o título depois da falha");
    assert.ok(submitButtons(dialog(container)!)[0]!.hasAttribute("disabled"), "reenvio travado enquanto a releitura não volta");
    assert.match(text(dialog(container)!), /Conferindo/);

    releaseReread();
    await settle();
    assert.match(text(dialog(container)!), /conexão/i, "fala depois de reler");
    assert.equal(submitButtons(dialog(container)!)[0]!.hasAttribute("disabled"), false, "a releitura voltou: pode tentar de novo");
    await submit(formsIn(dialog(container)!)[0]);

    const pays = calls.filter((c) => c.method === "POST" && c.url === "/financial-titles/t-vencido/pay");
    assert.equal(pays.length, 2);
    for (const body of pays.map((c) => c.body!)) {
      assert.deepEqual(Object.keys(body).sort(), ["account_id", "amount", "client_action_id", "occurred_at", "payment_method"]);
      assert.equal(body.account_id, "acc-banco");
      assert.equal(body.amount, 1000);
      assert.equal(body.payment_method, "pix");
      assert.equal(body.occurred_at, iso(TODAY));
    }
    assert.equal(pays[0].body!.client_action_id, pays[1].body!.client_action_id, "F2: o reenvio usa o MESMO client_action_id");
    assert.equal(calls.some((c) => c.method === "PATCH" && /\/status$/.test(c.url)), false, "F1: a baixa nunca passa pela troca de status");
    assert.match(text(dialog(container)!), /Recebimento registrado/);

    await press(buttonByText(dialog(container)!, "Fechar"));
    assert.equal(dialog(container), undefined);
    const second = await openBaixa(container, "Oficina Beta");
    await type(byName(second, "conta"), "acc-banco");
    await submit(formsIn(second)[0]);
    const parcial = calls.filter((c) => c.method === "POST" && c.url === "/financial-titles/t-parcial/pay");
    assert.equal(parcial.length, 1);
    assert.notEqual(parcial[0].body!.client_action_id, pays[0].body!.client_action_id, "F2: formulário novo → id novo");
    assert.equal(parcial[0].body!.amount, 800, "padrão = o saldo em aberto do título (valor − já recebido)");
  } finally {
    await unmount();
  }
});

test("F3: 409 duplicate_payment também relê antes de falar; se a releitura mostra o título quitado, a tela diz que a baixa já está registrada", async () => {
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "POST" && call.url === "/financial-titles/t-vencido/pay") return apiError(409, "duplicate_payment");
      if (call.method === "GET" && call.url === "/financial-titles/t-vencido") return json(200, { data: { ...RECEIVABLES[0], paidAmount: 1000, status: "paid" } });
      return undefined;
    },
  });
  try {
    const modal = await openBaixa(container, "Transportes Alfa");
    await type(byName(modal, "conta"), "acc-banco");
    await submit(formsIn(modal)[0]);
    assert.equal(countCalls("GET", /^\/financial-titles\/t-vencido$/), 1);
    assert.match(text(dialog(container)!), /já está registrada/);
    assert.equal(submitButtons(dialog(container)!).length, 0, "nada para reenviar");
  } finally {
    await unmount();
  }
});

// =============================== R6 · recusa definitiva nunca vira "já registrada" ===============================

test("R6: 422 overpayment com o título já pago em parte → razão da recusa + 'O título mudou…', formulário de volta com o saldo relido, nenhum reenvio", async () => {
  const { container, unmount } = await mount({
    override: (call) => {
      if (call.method === "POST" && call.url === "/financial-titles/t-vencido/pay") return apiError(422, "overpayment");
      if (call.method === "GET" && call.url === "/financial-titles/t-vencido") return json(200, { data: { ...RECEIVABLES[0], paidAmount: 400, status: "partially_paid" } });
      return undefined;
    },
  });
  try {
    const modal = await openBaixa(container, "Transportes Alfa");
    await type(byName(modal, "conta"), "acc-banco");
    await submit(formsIn(modal)[0]);
    const baixa = dialog(container)!;
    const body = text(baixa);
    assert.doesNotMatch(body, /já está registrada/, "o servidor RECUSOU esta baixa: nunca 'já registrada'");
    assert.match(body, /O valor ultrapassa o saldo em aberto do título\./);
    assert.match(body, /O título mudou desde que você abriu: pago R\$\s400,00 de R\$\s1\.000,00\./);
    const valor = byName(baixa, "valor");
    assert.ok(valor, "volta ao formulário");
    assert.equal(String((valor as unknown as { value?: unknown }).value), "600,00", "o valor é refeito para o saldo em aberto relido");
    assert.equal(countCalls("POST", /^\/financial-titles\/t-vencido\/pay$/), 1, "nenhum reenvio automático");
  } finally {
    await unmount();
  }
});

test("R6: rede caiu e a releitura mostra o pagamento → 'já está registrada'; 409 duplicate_payment → 'já está registrada' mesmo sem o título mudar", async () => {
  for (const scenario of ["rede", "duplicate"] as const) {
    const { container, unmount } = await mount({
      override: (call) => {
        if (call.method === "POST" && call.url === "/financial-titles/t-vencido/pay") return scenario === "rede" ? Promise.reject(new TypeError("Failed to fetch")) : apiError(409, "duplicate_payment");
        if (call.method === "GET" && call.url === "/financial-titles/t-vencido") return json(200, { data: scenario === "rede" ? { ...RECEIVABLES[0], paidAmount: 1000, status: "paid" } : RECEIVABLES[0] });
        return undefined;
      },
    });
    try {
      const modal = await openBaixa(container, "Transportes Alfa");
      await type(byName(modal, "conta"), "acc-banco");
      await submit(formsIn(modal)[0]);
      assert.match(text(dialog(container)!), /Esta baixa já está registrada no servidor/, scenario);
      assert.equal(countCalls("GET", /^\/financial-titles\/t-vencido$/), 1, `${scenario}: relê antes de falar`);
    } finally {
      await unmount();
    }
  }
});

// =============================== R9 · gate por permissão, não por papel ===============================

const READS = ["financial_titles:read", "financial_entries:read", "financial_accounts:read"];

test("R9: 'Registrar recebimento' segue financial_entries:create (não financial_titles:update)", async () => {
  const comBaixa = await mount({ permissions: [...READS, "financial_entries:create"], role: "Sintético" });
  try {
    await press(rowFor(comBaixa.container, "Transportes Alfa"));
    assert.ok(buttonByText(detailRows(comBaixa.container)[0]!, "Registrar recebimento"), "com financial_entries:create e sem financial_titles:update: oferece a baixa");
  } finally {
    await comBaixa.unmount();
  }
  const soTitulo = await mount({ permissions: [...READS, "financial_titles:update"], role: "Sintético" });
  try {
    await press(rowFor(soTitulo.container, "Transportes Alfa"));
    const detail = detailRows(soTitulo.container)[0]!;
    assert.equal(buttonByText(detail, "Registrar recebimento"), undefined, "com financial_titles:update e sem financial_entries:create: sem baixa");
    assert.match(text(detail), /Seu perfil só consulta/);
  } finally {
    await soTitulo.unmount();
  }
});

test("R9: 'Conciliar' segue financial_entries:update (não financial_titles:update)", async () => {
  const comConc = await mount({ permissions: [...READS, "financial_entries:update"], role: "Sintético", url: "/finance?aba=conc" });
  try {
    await press(rowFor(comConc.container, "Recebimento NF 0900"));
    assert.ok(buttonByText(detailRows(comConc.container)[0]!, "Conciliar"), "com financial_entries:update: oferece conciliar");
  } finally {
    await comConc.unmount();
  }
  const soTitulo = await mount({ permissions: [...READS, "financial_titles:update"], role: "Sintético", url: "/finance?aba=conc" });
  try {
    await press(rowFor(soTitulo.container, "Recebimento NF 0900"));
    assert.equal(buttonByText(detailRows(soTitulo.container)[0]!, "Conciliar"), undefined, "só com financial_titles:update: sem conciliar");
  } finally {
    await soTitulo.unmount();
  }
});

// =============================== R10 · contas sem leitura ===============================

test("R10: aba 'Contas e extrato' sem financial_accounts:read mostra acesso não permitido, nunca 'Cadastre a primeira conta'", async () => {
  const { container, unmount } = await mount({ permissions: ["financial_entries:read", "financial_titles:read"], role: "Sintético", url: "/finance?aba=ext" });
  try {
    const body = text(pageRoot(container)!);
    assert.match(body, /Acesso não permitido/);
    assert.match(body, /Seu perfil não inclui as contas desta organização\. Para mais acesso, fale com o administrador da organização\./);
    assert.doesNotMatch(body, /Cadastre a primeira conta/);
    assert.equal(all(container, (el) => el.localName === "button" && /Cadastrar a primeira conta|Nova conta/.test(text(el))).length, 0, "nenhum botão de cadastro");
    await press(tab(container, "A receber"));
    assert.ok(rowFor(container, "Transportes Alfa"), "as outras abas não mudam");
  } finally {
    await unmount();
  }
});

// =============================== F6 · F21 · cheque pendente ===============================

const CHEQUE = { id: "ch-1", titleId: "t-vencido", accountId: "acc-banco", direction: "received", chequeNumber: "000123", bank: "Itaú", amount: 1000, currency: "BRL", dueDate: "2026-11-05", status: "registered", active: true, createdAt: "2026-10-20T12:00:00.000Z" };

function pendingChequeOverride(state: { unlinked: boolean }): Override {
  return (call) => {
    if (call.method === "POST" && call.url === "/financial-titles/t-vencido/pay") return state.unlinked ? json(201, { data: { ...RECEIVABLES[0], paidAmount: 1000, status: "paid" } }) : apiError(422, "title_has_pending_cheque");
    if (call.method === "GET" && /^\/cheques\?/.test(call.url)) return json(200, { items: state.unlinked ? [] : [CHEQUE], pagination: { limit: 20, offset: 0, total: state.unlinked ? 0 : 1 } });
    if (call.method === "POST" && call.url === "/cheques/ch-1/unlink-title") {
      state.unlinked = true;
      return json(200, { data: { ...CHEQUE, titleId: null } });
    }
    return undefined;
  };
}

test("F6/F21: 422 title_has_pending_cheque → bloco do cheque (valor e nº), sem campo de valor; sem o privilégio, o pedido pronto ao administrador e nenhum botão de desvincular", async () => {
  const { container, unmount } = await mount({ override: pendingChequeOverride({ unlinked: false }) });
  try {
    const modal = await openBaixa(container, "Transportes Alfa");
    await type(byName(modal, "conta"), "acc-banco");
    await submit(formsIn(modal)[0]);
    assert.ok(calls.some((c) => c.method === "GET" && c.url === "/cheques?title_id=t-vencido"), "busca os cheques do título");
    const body = text(dialog(container)!);
    assert.match(body, /Há um cheque vinculado aguardando compensação/);
    assert.match(body, /000123/);
    assert.match(body, /R\$\s1\.000,00/);
    assert.equal(byName(dialog(container)!, "valor"), undefined, "F21: nenhum campo de valor (nem parcial)");
    assert.doesNotMatch(body, /restante|parcial/i, "F21: nada de 'pagar o restante'");
    assert.equal(buttonByText(dialog(container)!, "Desvincular o cheque"), undefined, "F6: sem cheques:unlink_title não há botão");
    const pedido = byName(dialog(container)!, "pedido");
    assert.ok(pedido && pedido.localName === "textarea", "pedido pronto para copiar");
    const pedidoTexto = pedido.value || String((pedido as unknown as { defaultValue?: unknown }).defaultValue ?? "") || text(pedido);
    assert.match(pedidoTexto, /000123/);
    assert.match(pedidoTexto, /NF 1001/);
    assert.equal(calls.filter((c) => c.method === "POST" && /unlink-title/.test(c.url)).length, 0);
  } finally {
    await unmount();
  }
});

test("F6: com cheques:unlink_title → 'Desvincular o cheque' abre a justificativa, POST /unlink-title, e a baixa reabre", async () => {
  const state = { unlinked: false };
  const { container, unmount } = await mount({ permissions: ADMIN, role: "Administrador", override: pendingChequeOverride(state) });
  try {
    const modal = await openBaixa(container, "Transportes Alfa");
    await type(byName(modal, "conta"), "acc-banco");
    await submit(formsIn(modal)[0]);
    await press(buttonByText(dialog(container)!, "Desvincular o cheque"));
    await type(byName(container, "justificativa"), "O cliente pagou por Pix; o cheque será devolvido.");
    await submit(all(container, (el) => el.localName === "form" && el.getAttribute("aria-label") === "Desvincular o cheque")[0]);
    const unlink = calls.filter((c) => c.method === "POST" && c.url === "/cheques/ch-1/unlink-title");
    assert.equal(unlink.length, 1);
    assert.deepEqual(unlink[0].body, { justification: "O cliente pagou por Pix; o cheque será devolvido." });
    const baixa = dialog(container)!;
    assert.ok(byName(baixa, "valor"), "a baixa reabre com o formulário");
    assert.match(text(baixa), /Cheque nº 000123 desvinculado/);
    await type(byName(baixa, "conta"), "acc-banco");
    await submit(formsIn(baixa).find((f) => f.getAttribute("aria-label") !== "Desvincular o cheque"));
    assert.match(text(dialog(container)!), /Recebimento registrado/);
  } finally {
    await unmount();
  }
});

// =============================== R5 · cancelar o cheque depois de desvincular ===============================

/** Cheque pendente + desvínculo + cancelamento; `cancelReplies` responde os POST /cheques/ch-1/cancel em ordem. */
function unlinkThenCancelOverride(options: { status: "registered" | "deposited"; cancelReplies?: Response[] }): Override {
  const state = { unlinked: false };
  const cheque = { ...CHEQUE, status: options.status };
  const replies = [...(options.cancelReplies ?? [])];
  return (call) => {
    if (call.method === "POST" && call.url === "/financial-titles/t-vencido/pay") return state.unlinked ? json(201, { data: { ...RECEIVABLES[0], paidAmount: 1000, status: "paid" } }) : apiError(422, "title_has_pending_cheque");
    if (call.method === "GET" && /^\/cheques\?/.test(call.url)) return json(200, { items: state.unlinked ? [] : [cheque], pagination: { limit: 20, offset: 0, total: state.unlinked ? 0 : 1 } });
    if (call.method === "POST" && call.url === "/cheques/ch-1/unlink-title") {
      state.unlinked = true;
      return new Response(JSON.stringify({ data: { ...cheque, titleId: null }, ...(options.status === "deposited" ? { warning: "cheque_still_depositable" } : {}) }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (call.method === "POST" && call.url === "/cheques/ch-1/cancel") return replies.shift() ?? json(200, { data: { ...cheque, titleId: null, status: "cancelled" } });
    return undefined;
  };
}

async function unlinkFromBaixa(container: MiniNode) {
  const modal = await openBaixa(container, "Transportes Alfa");
  await type(byName(modal, "conta"), "acc-banco");
  await submit(formsIn(modal)[0]);
  await press(buttonByText(dialog(container)!, "Desvincular o cheque"));
  await type(byName(container, "justificativa"), "O cliente pagou por Pix; o cheque será devolvido.");
  await submit(all(container, (el) => el.localName === "form" && el.getAttribute("aria-label") === "Desvincular o cheque")[0]);
  assert.equal(calls.filter((c) => c.method === "POST" && c.url === "/cheques/ch-1/unlink-title").length, 1);
}

/** Toda escrita no cheque ch-1 que não seja o desvínculo (o cancelamento, por qualquer rota que a tela usar). */
const cancelCalls = () => calls.filter((c) => c.method !== "GET" && c.url.startsWith("/cheques/ch-1") && c.url !== "/cheques/ch-1/unlink-title");

test("R5(a): com cheques:update, depois de desvincular um cheque registrado a baixa oferece 'Cancelar o cheque' em dois passos; POST /cancel sem corpo; recusa mantém o botão", async () => {
  const { container, unmount } = await mount({
    permissions: ADMIN,
    role: "Administrador",
    override: unlinkThenCancelOverride({ status: "registered", cancelReplies: [apiError(422, "cheque_linked_unlink_first")] }),
  });
  try {
    await unlinkFromBaixa(container);
    const baixa = () => dialog(container)!;
    assert.match(text(baixa()), /Cheque nº 000123 desvinculado deste título\. Se ele não vai mais ser usado, cancele-o agora: assim o dinheiro não entra duas vezes\./);
    assert.doesNotMatch(text(baixa()), /cancele-o lá|Confira em Cheques/);
    assert.equal(buttonByText(baixa(), "Confirmar o cancelamento"), undefined, "o primeiro clique só pede confirmação");
    await press(buttonByText(baixa(), "Cancelar o cheque nº 000123"));
    assert.equal(cancelCalls().length, 0, "nada sai antes da confirmação");
    assert.ok(buttonByText(baixa(), "Manter o cheque"), "segundo passo oferece manter");
    await press(buttonByText(baixa(), "Confirmar o cancelamento"));
    assert.equal(cancelCalls().length, 1);
    assert.equal(cancelCalls()[0].url, "/cheques/ch-1/cancel");
    assert.equal(cancelCalls()[0].body, null, "POST /cheques/:id/cancel vai SEM corpo");
    assert.match(text(baixa()), /Desvincule o cheque do título antes de cancelar ou excluir\./, "422 cheque_linked_unlink_first traduzido");
    assert.ok(buttonByText(baixa(), "Cancelar o cheque nº 000123"), "a recusa mantém o botão");

    await press(buttonByText(baixa(), "Cancelar o cheque nº 000123"));
    await press(buttonByText(baixa(), "Confirmar o cancelamento"));
    assert.equal(cancelCalls().length, 2);
    assert.equal(cancelCalls()[1].body, null);
    assert.match(text(baixa()), /Cheque nº 000123 cancelado\. Ele não entra mais no caixa\./);
    assert.equal(buttonByText(baixa(), "Cancelar o cheque nº 000123"), undefined, "cancelado: o botão some");
    assert.ok(byName(baixa(), "valor"), "a baixa continua aberta para receber por outro meio");
  } finally {
    await unmount();
  }
});

test("R5(c): ator que desvincula mas não tem cheques:update não vê 'Cancelar o cheque' e o aviso pede a quem administra os cheques", async () => {
  const soUnlink = [...FINANCE.filter((p) => p !== "cheques:update"), "cheques:unlink_title"];
  const { container, unmount } = await mount({ permissions: soUnlink, role: "Financeiro", override: unlinkThenCancelOverride({ status: "registered" }) });
  try {
    await unlinkFromBaixa(container);
    const body = text(dialog(container)!);
    assert.match(body, /Cheque nº 000123 desvinculado deste título\./);
    assert.match(body, /Peça a quem administra os cheques para cancelar o cheque nº 000123\./);
    assert.equal(
      all(dialog(container)!, (el) => el.localName === "button" && text(el).startsWith("Cancelar o cheque")).length,
      0,
      "sem cheques:update não há botão de cancelar o cheque",
    );
    assert.equal(cancelCalls().length, 0);
  } finally {
    await unmount();
  }
});

test("R5(b): cheque já depositado (warning cheque_still_depositable) — sem botão de cancelar e com o aviso de que ainda pode compensar", async () => {
  const { container, unmount } = await mount({ permissions: ADMIN, role: "Administrador", override: unlinkThenCancelOverride({ status: "deposited" }) });
  try {
    await unlinkFromBaixa(container);
    const body = text(dialog(container)!);
    assert.match(body, /Cheque nº 000123 desvinculado deste título\. Atenção: ele já estava depositado e ainda pode compensar — confira com o banco antes de receber por outro meio\./);
    assert.doesNotMatch(body, /cancele-o agora/);
    assert.equal(
      all(dialog(container)!, (el) => el.localName === "button" && text(el).startsWith("Cancelar o cheque")).length,
      0,
      "depositado: nada de cancelar",
    );
    assert.equal(cancelCalls().length, 0);
  } finally {
    await unmount();
  }
});

// =============================== F10 · F22 · conciliação ===============================

test("F10/F22: conciliar manda o estado lido; 409 reconciliation_stale → relê o lançamento, repinta a linha e só então decide se dá para tentar de novo", async () => {
  const fresh = { ...ENTRIES[0], reconciled: true, reconciledAt: STAMP, reconciledBy: "u-9" };
  const { container, unmount } = await mount({
    url: "/finance?aba=conc",
    override: (call) => {
      if (call.method === "PATCH" && call.url === "/financial-entries/e-aberto/reconcile") return apiError(409, "reconciliation_stale");
      if (call.method === "GET" && call.url === "/financial-entries/e-aberto") return json(200, { data: fresh });
      return undefined;
    },
  });
  try {
    await press(rowFor(container, "Recebimento NF 0900"));
    await press(buttonByText(detailRows(container)[0]!, "Conciliar"));
    await submit(formsIn(dialog(container)!)[0]);
    const patch = calls.filter((c) => c.method === "PATCH");
    assert.equal(patch.length, 1);
    assert.deepEqual(patch[0].body, { reconciled: true, expected_reconciled: false, expected_reconciled_at: null });
    assert.equal(countCalls("GET", /^\/financial-entries\/e-aberto$/), 1, "relê o lançamento");
    assert.match(text(dialog(container)!), /Este lançamento mudou/);
    assert.match(text(dialog(container)!), /já conciliou/);
    assert.match(text(rowFor(container, "Recebimento NF 0900")!), /Conciliado/, "a linha foi repintada com o estado novo");
    assert.equal(submitButtons(dialog(container)!).filter((b) => !b.hasAttribute("disabled")).length, 0, "já conciliado por outra pessoa: nada para reenviar");
  } finally {
    await unmount();
  }
});

test("F10: desfazer (com o privilégio) manda reconciled=false e o carimbo lido, em ms; F20: sem privilégio não oferece desfazer", async () => {
  const admin = await mount({
    permissions: ADMIN,
    role: "Administrador",
    url: "/finance?aba=conc",
    override: (call) => {
      if (call.method === "GET" && call.url === "/financial-entries/reconciliation-policy") return json(200, { data: { canUnreconcile: true, delegatedToFinance: false } });
      if (call.method === "PATCH") return json(200, { data: { ...ENTRIES[1], reconciled: false, reconciledAt: null, reconciledBy: null } });
      return undefined;
    },
  });
  try {
    await press(rowFor(admin.container, "Recebimento NF 0901"));
    await press(buttonByText(detailRows(admin.container)[0]!, "Desfazer conciliação"));
    const patch = calls.filter((c) => c.method === "PATCH" && c.url === "/financial-entries/e-conciliado/reconcile");
    assert.equal(patch.length, 1);
    assert.deepEqual(patch[0].body, { reconciled: false, expected_reconciled: true, expected_reconciled_at: STAMP });
  } finally {
    await admin.unmount();
  }

  const fin = await mount({ url: "/finance?aba=conc" });
  try {
    await press(rowFor(fin.container, "Recebimento NF 0901"));
    assert.match(text(detailRows(fin.container)[0]!), /Este lançamento está conciliado\. Para estornar ou excluir/);
    assert.equal(buttonByText(detailRows(fin.container)[0]!, "Desfazer conciliação"), undefined);
  } finally {
    await fin.unmount();
  }
});

test("desfazer recusado pelo servidor (403 unreconcile_forbidden, tela defasada) vira mensagem honesta no detalhe", async () => {
  const { container, unmount } = await mount({
    permissions: ADMIN,
    role: "Administrador",
    url: "/finance?aba=conc",
    override: (call) => {
      if (call.method === "GET" && call.url === "/financial-entries/reconciliation-policy") return json(200, { data: { canUnreconcile: true, delegatedToFinance: true } });
      if (call.method === "PATCH") return json(403, { error: { code: "FINANCIAL_ENTRY_FORBIDDEN", reason: "unreconcile_forbidden", message: "x" } });
      return undefined;
    },
  });
  try {
    await press(rowFor(container, "Recebimento NF 0901"));
    await press(buttonByText(detailRows(container)[0]!, "Desfazer conciliação"));
    assert.match(text(detailRows(container)[0]!), /Seu perfil não pode desfazer; peça ao administrador/);
  } finally {
    await unmount();
  }
});

// =============================== F7 · perfis ===============================

test("F7: o Gestor só consulta — sem 'Nova conta', sem baixa, sem conciliar; o detalhe diz por quê", async () => {
  const { container, unmount } = await mount({ permissions: MANAGER, role: "Gestor Operacional" });
  try {
    assert.equal(buttonByText(container, "Nova conta"), undefined);
    await press(rowFor(container, "Transportes Alfa"));
    assert.doesNotMatch(text(detailRows(container)[0]!), /Registrar recebimento/);
    assert.match(text(detailRows(container)[0]!), /Seu perfil só consulta/);
    await press(tab(container, "Conciliação"));
    await press(rowFor(container, "Recebimento NF 0900"));
    assert.equal(buttonByText(detailRows(container)[0]!, "Conciliar"), undefined);
  } finally {
    await unmount();
  }
});

test("F7: o Financeiro vê 'Nova conta' e o cadastro chama POST /financial-accounts", async () => {
  const { container, unmount } = await mount({
    override: (call) => (call.method === "POST" && call.url === "/financial-accounts" ? json(201, { data: { ...ACCOUNTS.items[0], id: "acc-nova", name: "Carteira digital", kind: "wallet" } }) : undefined),
  });
  try {
    await press(buttonByText(container, "Nova conta"));
    const modal = dialog(container)!;
    await type(byName(modal, "nome"), "Carteira digital");
    await type(byName(modal, "tipo"), "wallet");
    await submit(formsIn(modal)[0]);
    const post = calls.filter((c) => c.method === "POST" && c.url === "/financial-accounts");
    assert.equal(post.length, 1);
    assert.deepEqual(post[0].body, { name: "Carteira digital", kind: "wallet" });
    assert.equal(dialog(container), undefined, "a janela fecha depois do cadastro");
  } finally {
    await unmount();
  }
});

// =============================== F9 · F16 · estados ===============================

test("F16 carregando: esqueleto (aria-busy) enquanto o servidor não responde", async () => {
  const { container, unmount } = await mount({ override: (call) => (call.url === "/financial-summary" ? new Promise<Response>(() => undefined) : undefined) });
  try {
    assert.ok(all(container, (el) => el.getAttribute("aria-busy") === "true").length > 0, "esqueleto com aria-busy");
  } finally {
    await unmount();
  }
});

test("F16 erro: resumo e contas fora do ar → painel de erro com 'Tentar novamente', nunca listas vazias", async () => {
  const { container, unmount } = await mount({
    override: (call) => (call.url === "/financial-summary" || /^\/financial-accounts/.test(call.url) ? json(500, { error: { code: "INTERNAL", message: "x" } }) : undefined),
  });
  try {
    const panel = all(container, (el) => el.getAttribute("data-state") === "error")[0];
    assert.ok(panel, "painel de erro");
    assert.ok(buttonByText(panel, "Tentar novamente"), "botão Tentar novamente no painel de erro");
    assert.equal(rows(container).length, 0);
  } finally {
    await unmount();
  }
});

test("R-P2: resumo 200 incompleto fica indisponível e não publica R$ 0,00", async () => {
  const { totalBalance: _missing, ...cash } = SUMMARY.cash;
  const { container, unmount } = await mount({
    override: (call) => (call.url === "/financial-summary" ? json(200, { data: { ...SUMMARY, cash } }) : undefined),
  });
  try {
    const panel = all(container, (el) => el.getAttribute("data-state") === "error")[0];
    assert.ok(panel, "resumo incompleto produz painel indisponível");
    assert.match(text(panel), /Não foi possível carregar/);
    assert.equal(byLabel(container, "Saldo em caixa:"), undefined, "nenhum indicador monetário falso");
    assert.doesNotMatch(text(container), /R\$\s*0,00/);
  } finally {
    await unmount();
  }
});

test("R-P2: refresh com resumo incompleto conserva o último resumo válido e marca stale", async () => {
  let incomplete = false;
  const { totalBalance: _missing, ...cash } = SUMMARY.cash;
  const { container, unmount } = await mount({
    override: (call) => (call.url === "/financial-summary" && incomplete ? json(200, { data: { ...SUMMARY, cash } }) : undefined),
  });
  try {
    assert.match(text(byLabel(container, "Saldo em caixa:")!), /R\$\s12\.850,75/);
    incomplete = true;
    const ticks = dom.intervals.filter((interval) => interval.fn && interval.ms === DEFAULT_AUTO_REFRESH_MS);
    assert.equal(ticks.length, 1);
    await act(async () => ticks[0].fn!());
    await settle();
    assert.ok(all(container, (el) => el.getAttribute("data-state") === "stale")[0]);
    assert.match(text(byLabel(container, "Saldo em caixa:")!), /R\$\s12\.850,75/);
    assert.equal(all(container, (el) => el.getAttribute("data-state") === "error").length, 0);
  } finally {
    await unmount();
  }
});

test("F9: títulos fora do ar (fallback) → painel de erro na aba, nunca 'nenhum título'", async () => {
  const { container, unmount } = await mount({ override: (call) => (/^\/financial-titles\?/.test(call.url) ? json(500, { error: { code: "INTERNAL", message: "x" } }) : undefined) });
  try {
    assert.ok(all(container, (el) => el.getAttribute("data-state") === "error").length > 0, "painel de erro na aba de títulos");
    assert.doesNotMatch(text(container), /Nenhum título em aberto|Tudo baixado/);
    assert.equal(rows(container).length, 0);
  } finally {
    await unmount();
  }
});

test("F16 vazio: sem contas → 'Cadastre a primeira conta' (botão só para quem pode cadastrar)", async () => {
  const empty: Override = (call) => (call.method === "GET" && /^\/financial-accounts\?/.test(call.url) ? json(200, { items: [], pagination: { limit: 100, offset: 0, total: 0 } }) : undefined);
  const fin = await mount({ url: "/finance?aba=ext", override: empty });
  try {
    assert.match(text(fin.container), /Cadastre a primeira conta/);
    assert.ok(buttonByText(fin.container, "Cadastrar a primeira conta"), "botão de cadastrar a primeira conta");
  } finally {
    await fin.unmount();
  }
  const gestor = await mount({ url: "/finance?aba=ext", permissions: MANAGER, role: "Gestor Operacional", override: empty });
  try {
    assert.match(text(gestor.container), /Cadastre a primeira conta/);
    assert.equal(buttonByText(gestor.container, "Cadastrar a primeira conta"), undefined);
    assert.match(text(gestor.container), /Peça ao Financeiro para cadastrar/);
  } finally {
    await gestor.unmount();
  }
});

test("F16 acesso não permitido: Técnico de Campo cai no guarda da rota; sem leitura de títulos, a aba mostra o painel de acesso", async () => {
  const tecnico = await mount({ permissions: ["work_orders:read"], role: "Técnico de Campo", guard: true });
  try {
    assert.match(text(tecnico.container), /Acesso nao autorizado/);
    assert.equal(calls.filter((c) => /financial/.test(c.url)).length, 0, "nada do Financeiro é pedido");
  } finally {
    await tecnico.unmount();
  }
  const semTitulos = await mount({ permissions: ["financial_entries:read", "financial_accounts:read"], role: "Auditor" });
  try {
    const panel = all(semTitulos.container, (el) => el.getAttribute("data-state") === "forbidden")[0];
    assert.ok(panel, "painel de acesso não permitido na aba de títulos");
    assert.match(text(panel), /Seu perfil não inclui/);
    assert.equal(rows(semTitulos.container).length, 0);
  } finally {
    await semTitulos.unmount();
  }
});

test("R-P5: sem leitura de lançamentos, extrato e conciliação mostram acesso não permitido e não consultam essas rotas", async () => {
  const permissions = ["finance:read", "financial_titles:read", "financial_accounts:read"];
  const probe = await mount({ permissions, role: "Auditor", url: "/finance?aba=conc" });
  try {
    const panel = all(probe.container, (el) => el.getAttribute("data-state") === "forbidden")[0];
    assert.ok(panel, "painel proibido para lançamentos");
    assert.match(text(panel), /Seu perfil não inclui os lançamentos/);
    assert.equal(calls.filter((call) => /^\/financial-entries(?:\?|\/aggregate|\/reconciliation-policy)/.test(call.url)).length, 0, calls.map((call) => call.url).join(" | "));
  } finally {
    await probe.unmount();
  }
});

test("F16 desatualizado: a atualização em 2º plano falha → faixa 'Dados desatualizados' e o dado anterior continua na tela", async () => {
  let down = false;
  const { container, unmount } = await mount({ override: () => (down ? json(503, { error: { code: "UNAVAILABLE", message: "x" } }) : undefined) });
  try {
    assert.equal(rows(container).length, 2);
    assert.equal(all(container, (el) => el.getAttribute("data-state") === "stale").length, 0);
    down = true;
    const ticks = dom.intervals.filter((interval) => interval.fn && interval.ms === DEFAULT_AUTO_REFRESH_MS);
    assert.equal(ticks.length, 1, "a página registra UMA auto-atualização");
    await act(async () => ticks[0].fn!());
    await settle();
    assert.ok(all(container, (el) => el.getAttribute("data-state") === "stale")[0], "faixa de dados desatualizados");
    assert.equal(rows(container).length, 2, "o dado anterior continua");
    assert.match(text(byLabel(container, "Saldo em caixa:")!), /R\$\s12\.850,75/);
    assert.equal(all(container, (el) => el.getAttribute("data-state") === "error").length, 0, "não troca a tela pelo erro");
  } finally {
    await unmount();
  }
});
