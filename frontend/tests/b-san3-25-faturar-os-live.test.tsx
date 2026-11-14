import assert from "node:assert/strict";
import test, { after } from "node:test";

// B-SAN3-25 (item 50 do portão) — a aba Financeiro REAL da OS, com os efeitos rodando, no arnês de DOM mínimo do repositório
// (copiado, sem mudança, de `finance-page-live.test.tsx:16-287`): ZERO dependência nova; DOM instalado ANTES de
// react-dom/client; clique, digitação e envio pelo handler em `__reactProps$`. A borda de rede (`fetch`) é o único dublê e
// responde com os BYTES do servidor: o item de `toWorkOrderFinancialItemDto` e a lista de `toWorkOrderFinancialListDto`
// (`src/modules/work-order-financials/work-order-financial.dto.ts`), o título de `toFinancialTitleDto`
// (`src/modules/financial-titles/financial-title.dto.ts`), o 201 do faturamento do controller
// (`work-order-financial.controller.ts:41-49`) e o envelope de erro `{ error: { code, reason, message } }`. Rota não
// prevista responde 404 e entra em `unexpected`, que todo caso confere vazio.
// Prende por comportamento executado: L1–L11 do §4.3 do plano v2 e da §E1.5-bis da Emenda 1.
// Todo `assert.ok` leva mensagem (o Node trava relendo a linha-fonte no arquivo transpilado, medido no 12b).
// Roda com cwd `frontend` (R-FORMA, §2.6).
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
  // Acréscimo deste arquivo ao arnês: a aparência C leva o foco ao formulário; o mini-DOM não faz foco (a prova é a sonda no navegador).
  querySelector(): null {
    return null;
  }
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
const { FinancialTab } = await import("../src/modules/work-orders/components/tabs/FinancialTab");
const { formatMoney } = await import("../src/modules/work-orders/financials.service");
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

// =============================== Dados (os bytes do servidor) ===============================

const WO = "wo-1";
// Contexto ESTÁVEL (a página passa o mesmo objeto entre renders; a aba relê a lista quando ele muda).
const CTX = { tenantId: "org-faturamento", token: "tok-faturamento" };
const FINANCE = [
  "work_orders:read",
  "work_order_financials:read",
  "work_order_financials:create",
  "work_order_financials:update",
  "financial_titles:read",
  "financial_titles:create",
];
// O gerente: lê e lança item, mas não fatura (crítica r1, CE-G2: tem work_order_financials:create e não financial_titles:create).
const MANAGER = ["work_orders:read", "work_order_financials:read", "work_order_financials:create", "work_order_financials:update", "financial_titles:read"];
const NO_TITLES_READ = FINANCE.filter((permission) => permission !== "financial_titles:read");

const STAMP = "2026-11-01T12:00:00.000Z";
const INVOICED_AT = "2026-11-02T12:00:00.000Z";
// toWorkOrderFinancialItemDto (work-order-financial.dto.ts:6-27): os mesmos campos, na mesma ordem.
const itemDto = (over: Record<string, unknown>) => ({
  id: "it-x",
  workOrderId: WO,
  tariffId: null,
  priceTableId: null,
  description: "Item",
  quantity: 1,
  unitAmount: 10,
  totalAmount: 10,
  currency: "BRL",
  source: "manual",
  notes: null,
  invoiced: false,
  invoicedAt: null,
  titleId: null,
  createdBy: "u-1",
  updatedBy: "u-1",
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
});
const invoicedDto = (over: Record<string, unknown>) => itemDto({ invoiced: true, invoicedAt: INVOICED_AT, titleId: "t-1", ...over });
// toWorkOrderFinancialListDto (work-order-financial.dto.ts:33-39): o total vem SOMADO do servidor.
const listDto = (items: readonly unknown[], totalAmount: number) => ({ items, totalAmount, currency: "BRL" });
// toFinancialTitleDto (financial-title.dto.ts:7-40).
const titleDto = (over: Record<string, unknown>) => ({
  id: "t-1",
  direction: "receivable",
  partyType: "customer",
  partyId: null,
  partyName: "Cliente Alfa",
  document: null,
  category: null,
  description: null,
  amount: 100,
  currency: "BRL",
  issueDate: INVOICED_AT,
  dueDate: "2026-12-02T12:00:00.000Z",
  paidAmount: 0,
  status: "open",
  competencia: "2026-11",
  accountId: null,
  workOrderId: WO,
  serviceQuoteId: null,
  sourceType: null,
  sourceId: null,
  parentTitleId: null,
  overdue: false,
  active: true,
  createdBy: "u-1",
  updatedBy: "u-1",
  createdAt: INVOICED_AT,
  updatedAt: INVOICED_AT,
  ...over,
});

const ITEM_A = { id: "it-a", description: "Guincho leve", unitAmount: 60, totalAmount: 60 };
const ITEM_B = { id: "it-b", description: "Pedágio", unitAmount: 40, totalAmount: 40 };
const ITEM_C = { id: "it-c", description: "Diária de pátio", unitAmount: 35, totalAmount: 35 };
const ITEM_D = { id: "it-d", description: "Hora parada", unitAmount: 30, totalAmount: 30 };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const apiError = (status: number, code: string, reason: string) => json(status, { error: { code, reason, message: reason } });
// O 201 do faturamento (work-order-financial.controller.ts:41-49).
const invoiced201 = (title: unknown, invoicedTotal: number, invoicedItemCount: number) => json(201, { data: title, invoicedTotal, currency: "BRL", invoicedItemCount });

type Call = { readonly method: string; readonly url: string; readonly body: Record<string, unknown> | null };
type Handler = (call: Call) => Response | Promise<Response>;
type Server = { list: unknown; titles: Record<string, unknown>; invoice?: Handler; refresh?: Handler };

const calls: Call[] = [];
const unexpected: string[] = [];
let server: Server = { list: listDto([], 0), titles: {} };

function installFetch() {
  calls.length = 0;
  unexpected.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null };
    calls.push(call);
    if (call.method === "GET" && url === `/work-orders/${WO}/financial-items`) return json(200, server.list);
    if (call.method === "POST" && url === `/work-orders/${WO}/invoice` && server.invoice) return server.invoice(call);
    const titleId = /^\/financial-titles\/([^/?]+)$/.exec(url);
    if (call.method === "GET" && titleId) {
      const found = server.titles[titleId[1]];
      return found ? json(200, { data: found }) : apiError(404, "FINANCIAL_TITLE_NOT_FOUND", "title_not_found");
    }
    if (call.method === "POST" && url === "/auth/refresh" && server.refresh) return server.refresh(call);
    unexpected.push(`${call.method} ${url}`);
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
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

const SUBMIT_EVENT = { preventDefault() {}, stopPropagation() {} };
function onSubmitOf(form: MiniElement | undefined): (ev: unknown) => unknown {
  assert.ok(form, "formulário não encontrado");
  const onSubmit = propsOf(form).onSubmit as ((ev: unknown) => unknown) | undefined;
  assert.equal(typeof onSubmit, "function", "onSubmit ausente no formulário");
  return onSubmit!;
}
async function submit(form: MiniElement | undefined) {
  const onSubmit = onSubmitOf(form);
  await act(async () => {
    onSubmit(SUBMIT_EVENT);
  });
  await settle();
}

const all = (root: MiniNode, match: (el: MiniElement) => boolean) => elements(root, match);
const buttonByText = (root: MiniNode, needle: string) => all(root, (el) => el.localName === "button" && text(el).trim() === needle)[0];
const dialog = (root: MiniNode) => all(root, (el) => el.getAttribute("role") === "dialog")[0];
const formIn = (root: MiniNode | undefined) => (root ? all(root, (el) => el.localName === "form")[0] : undefined);
const submitButton = (root: MiniNode) => all(root, (el) => el.localName === "button" && el.getAttribute("type") === "submit")[0];
const idOf = (el: MiniElement) => el.getAttribute("id") ?? ((el as unknown as { id?: unknown }).id as string | undefined) ?? null;
const dueDateInput = (root: MiniNode) => all(root, (el) => el.localName === "input" && idOf(el) === "invoice-due-date")[0];
const statusText = (root: MiniNode) => all(root, (el) => el.getAttribute("role") === "status").map(text).join(" | ");
const alertTexts = (root: MiniNode) => all(root, (el) => el.getAttribute("role") === "alert").map(text);
const invoicedChips = (root: MiniNode) => all(root, (el) => el.localName === "span" && text(el).trim() === "Faturado").length;
const countCalls = (method: string, pattern: RegExp) => calls.filter((c) => c.method === method && pattern.test(c.url)).length;
const invoicePosts = () => calls.filter((c) => c.method === "POST" && c.url === `/work-orders/${WO}/invoice`);
const listReads = () => countCalls("GET", /^\/work-orders\/wo-1\/financial-items$/);
const titleReads = () => countCalls("GET", /^\/financial-titles\//);

const DIVERGENCE = "O valor faturado ficou diferente do mostrado na confirmação, porque os itens mudaram antes do faturamento. Confira a lista abaixo.";
const GENERIC = "Não foi possível confirmar o faturamento. Confira a lista abaixo antes de tentar de novo.";

async function mount(options: { permissions?: readonly string[]; status?: string } = {}) {
  const permissions = options.permissions ?? FINANCE;
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, permissions: [...permissions] } });
  installFetch();
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, null, h(FinancialTab, { workOrderId: WO, workOrderStatus: (options.status ?? "completed") as never, context: CTX, permissions: [...permissions] })),
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

async function openDialog(container: MiniNode) {
  await press(buttonByText(container, "Faturar OS"));
  const opened = dialog(container);
  assert.ok(opened, "o diálogo de faturamento abriu");
  return opened;
}

// =============================== L0 · o arnês ===============================

test("[L0] arnês: rota não prevista responde 404 e fica registrada (o caso que dependesse dela falha)", async () => {
  server = { list: listDto([], 0), titles: {} };
  const view = await mount();
  try {
    assert.deepEqual(unexpected, [], "a aba só leu a lista");
    const response = await fetch("/api/v1/rota-nao-prevista");
    assert.equal(response.status, 404, "rota não prevista → 404");
    assert.deepEqual(unexpected, ["GET /rota-nao-prevista"], "rota não prevista registrada");
  } finally {
    await view.unmount();
  }
});

// =============================== L1 · o caminho feliz ===============================

test("[L1] finance: 2 pendentes → Faturar OS → confirmar → exatamente 1 POST com {} → 201 → aviso com o valor do servidor e '2 itens' → lista relida, chips, botão ausente", async () => {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: { "t-1": titleDto({ amount: 100 }) },
    invoice: () => {
      server.list = listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B)], 100);
      return invoiced201(titleDto({ amount: 100 }), 100, 2);
    },
  };
  const view = await mount();
  try {
    assert.equal(listReads(), 1, "a aba leu a lista ao abrir");
    assert.equal(invoicedChips(view.container), 0, "nada faturado ainda");
    const opened = await openDialog(view.container);
    assert.ok(text(opened).includes("Valor do título"), "1º faturamento mostra o valor do título");
    assert.ok(text(opened).includes(formatMoney(100, "BRL")), "o valor mostrado é o totalAmount do servidor");
    assert.ok(text(opened).includes("Guincho leve") && text(opened).includes("Pedágio"), "os 2 pendentes na confirmação");
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "exatamente 1 POST de faturamento");
    assert.deepEqual(invoicePosts()[0].body, {}, "vencimento vazio manda {} (o servidor põe hoje + 30 dias)");
    assert.equal(dialog(view.container), undefined, "o diálogo fecha no sucesso");
    assert.ok(statusText(view.container).includes(`Título a receber criado: ${formatMoney(100, "BRL")}, 2 itens faturados.`), `aviso: ${statusText(view.container)}`);
    assert.ok(!statusText(view.container).includes(DIVERGENCE), "valores iguais: sem divergência");
    assert.deepEqual(alertTexts(view.container), [], "nenhum alerta de erro");
    assert.equal(listReads(), 2, "a lista foi relida depois do faturamento");
    assert.equal(invoicedChips(view.container), 2, "os 2 itens com o chip Faturado");
    assert.equal(buttonByText(view.container, "Faturar OS"), undefined, "nada pendente: o botão some");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

test("[L1b] com Vencimento preenchido, o corpo é { due_date: \"2026-12-31\" }", async () => {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: { "t-1": titleDto({ amount: 100, dueDate: "2026-12-31T00:00:00.000Z" }) },
    invoice: () => {
      server.list = listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B)], 100);
      return invoiced201(titleDto({ amount: 100, dueDate: "2026-12-31T00:00:00.000Z" }), 100, 2);
    },
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    await type(dueDateInput(opened), "2026-12-31");
    await submit(formIn(dialog(view.container)));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.deepEqual(invoicePosts()[0].body, { due_date: "2026-12-31" }, "o corpo leva o campo que o servidor lê primeiro (service.ts:441)");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L2 · quem não fatura ===============================

test("[L2] gerente (sem financial_titles:create): botão ausente e nenhum POST no registro do fetch", async () => {
  server = { list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100), titles: {} };
  const view = await mount({ permissions: MANAGER });
  try {
    assert.equal(listReads(), 1, "o gerente vê a aba e a lista");
    assert.equal(buttonByText(view.container, "Faturar OS"), undefined, "sem financial_titles:create, sem botão");
    assert.ok(text(view.container).includes("Guincho leve"), "a lista aparece para o gerente");
    assert.equal(calls.filter((c) => c.method === "POST").length, 0, "nenhum POST sai de quem não pode");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L3, L4, L7 · recusas ===============================

test("[L3] 503 invoice_transient_conflict → frase, diálogo aberto, 'Tentar de novo' repete o MESMO corpo → 201", async () => {
  let attempts = 0;
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: { "t-1": titleDto({ amount: 100 }) },
    invoice: () => {
      attempts += 1;
      if (attempts === 1) return apiError(503, "WORK_ORDER_FINANCIAL_UNAVAILABLE", "invoice_transient_conflict");
      server.list = listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B)], 100);
      return invoiced201(titleDto({ amount: 100 }), 100, 2);
    },
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    await type(dueDateInput(opened), "2026-12-31");
    await submit(formIn(dialog(view.container)));
    assert.equal(invoicePosts().length, 1, "1º POST");
    const still = dialog(view.container);
    assert.ok(still, "o diálogo continua aberto (nada foi faturado)");
    assert.ok(alertTexts(still).join(" ").includes("Não deu para faturar agora, e nada foi faturado. Tente de novo."), `a frase do transitório: ${alertTexts(still).join(" | ")}`);
    const retry = submitButton(still);
    assert.ok(retry, "botão de confirmar presente");
    assert.equal(text(retry).trim(), "Tentar de novo", "o confirmar vira 'Tentar de novo'");
    assert.equal(listReads(), 1, "o transitório não relê a lista");
    await submit(formIn(still));
    assert.equal(invoicePosts().length, 2, "o 'Tentar de novo' envia de novo");
    assert.deepEqual(invoicePosts()[1].body, invoicePosts()[0].body, "o mesmo corpo");
    assert.deepEqual(invoicePosts()[1].body, { due_date: "2026-12-31" }, "o corpo do 1º envio");
    assert.equal(dialog(view.container), undefined, "201: o diálogo fecha");
    assert.ok(statusText(view.container).includes(`Título a receber criado: ${formatMoney(100, "BRL")}, 2 itens faturados.`), "aviso de sucesso");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

test("[L4] 409 already_invoiced → o diálogo fecha, a aba diz a frase e relê a lista", async () => {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: { "t-1": titleDto({ amount: 100 }) },
    invoice: () => {
      server.list = listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B)], 100);
      return apiError(409, "WORK_ORDER_FINANCIAL_CONFLICT", "already_invoiced");
    },
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.equal(dialog(view.container), undefined, "o diálogo fecha");
    assert.deepEqual(alertTexts(view.container), ["Esta OS já foi faturada e não há item novo para faturar."], "a frase do 409");
    assert.equal(listReads(), 2, "a lista foi relida");
    assert.equal(invoicedChips(view.container), 2, "a releitura mostra os itens faturados");
    assert.equal(buttonByText(view.container, "Faturar OS"), undefined, "nada pendente: o botão some");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// J-559 (C3-A2) — a OS foi cancelada no servidor depois que a página a leu (a página ainda diz "concluída"). No 422
// `work_order_cancelled` (o envelope de `workOrderCancelledError`, `work-order-financial.types.ts:97-104`), a aba diz a
// frase, relê a lista e o botão "Faturar OS" some (Q1 = A), embora a lista continue com os itens pendentes.
test("[L4c] 422 work_order_cancelled → a frase, a releitura da lista e o botão 'Faturar OS' some, com a página ainda dizendo que a OS não está cancelada", async () => {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: {},
    invoice: () => apiError(422, "WORK_ORDER_FINANCIAL_UNPROCESSABLE", "work_order_cancelled"),
  };
  const view = await mount({ status: "completed" });
  try {
    assert.ok(buttonByText(view.container, "Faturar OS"), "antes do 422, a OS não cancelada mostra o botão");
    const opened = await openDialog(view.container);
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.equal(dialog(view.container), undefined, "o diálogo fecha");
    assert.deepEqual(alertTexts(view.container), ["Esta OS está cancelada e não pode ser faturada."], "a frase do 422");
    assert.equal(listReads(), 2, "a lista foi relida");
    assert.equal(invoicedChips(view.container), 0, "os itens seguem pendentes na lista");
    assert.equal(buttonByText(view.container, "Faturar OS"), undefined, "o servidor disse que a OS está cancelada: o botão some");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

test("[L7] rede (TypeError) → frase genérica, que não afirma que nada foi faturado, e releitura da lista", async () => {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: {},
    invoice: () => {
      throw new TypeError("fetch failed");
    },
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.equal(dialog(view.container), undefined, "o diálogo fecha");
    assert.deepEqual(alertTexts(view.container), [GENERIC], "a frase genérica");
    assert.equal(listReads(), 2, "a lista foi relida para o usuário conferir");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L5 · complementar ===============================

test("[L5] complementar: o diálogo NÃO mostra 'Valor do título'; 201 com data.parentTitleId → '(complementar)'", async () => {
  server = {
    list: listDto([invoicedDto(ITEM_A), itemDto(ITEM_C)], 95),
    titles: { "t-1": titleDto({ amount: 60 }), "t-2": titleDto({ id: "t-2", amount: 35, parentTitleId: "t-1" }) },
    invoice: () => {
      server.list = listDto([invoicedDto(ITEM_A), invoicedDto({ ...ITEM_C, titleId: "t-2" })], 95);
      return invoiced201(titleDto({ id: "t-2", amount: 35, parentTitleId: "t-1" }), 35, 1);
    },
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    assert.ok(!text(opened).includes("Valor do título"), "o complementar não mostra total antes");
    assert.ok(text(opened).includes("O valor do título é a soma destes itens, calculada pelo servidor no faturamento."), "frase do complementar");
    assert.ok(text(opened).includes("Diária de pátio") && !text(opened).includes("Guincho leve"), "só o pendente na confirmação");
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.ok(statusText(view.container).includes(`Título a receber criado: ${formatMoney(35, "BRL")}, 1 item faturado (complementar).`), `aviso: ${statusText(view.container)}`);
    assert.ok(!statusText(view.container).includes(DIVERGENCE), "mesma quantidade: sem divergência");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L6 · títulos desta OS ===============================

test("[L6] quadro 'Títulos desta OS': T1 original (cancelado) e T2 complementar → 2 leituras, rótulos e situação do Financeiro; atalho só com a permissão da rota", async () => {
  server = {
    list: listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B), invoicedDto({ ...ITEM_C, titleId: "t-2" }), itemDto(ITEM_D)], 165),
    titles: { "t-1": titleDto({ amount: 100, status: "cancelled" }), "t-2": titleDto({ id: "t-2", amount: 35, parentTitleId: "t-1", status: "open" }) },
  };
  const view = await mount({ permissions: [...FINANCE, "financial_entries:read"] });
  try {
    assert.equal(titleReads(), 2, "uma leitura por título distinto (t-1 aparece em 2 itens)");
    const page = text(view.container);
    assert.ok(page.includes("Títulos desta OS"), "o quadro aparece");
    assert.ok(page.includes("Original") && page.includes("Complementar"), "original e complementar rotulados");
    assert.ok(page.includes("Cancelado"), "o original cancelado aparece como Cancelado (Q4 = A)");
    assert.ok(page.includes("Em aberto"), "a situação do complementar pelo rótulo do Financeiro");
    assert.ok(page.includes(formatMoney(100, "BRL")) && page.includes(formatMoney(35, "BRL")), "valores dos títulos");
    const link = all(view.container, (el) => el.localName === "a" && text(el).trim() === "Ver no Financeiro")[0];
    assert.ok(link, "atalho para o Financeiro com financial_entries:read");
    assert.equal(link.getAttribute("href"), "/finance?aba=rec", "atalho para A receber");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

test("[L6] título com 404 aparece como 'Título removido'; sem a permissão da rota do Financeiro, sem atalho", async () => {
  server = { list: listDto([invoicedDto({ ...ITEM_A, titleId: "t-3" })], 60), titles: {} };
  const view = await mount();
  try {
    assert.equal(titleReads(), 1, "1 leitura");
    assert.ok(text(view.container).includes("Título removido"), "404 → Título removido");
    assert.equal(all(view.container, (el) => el.localName === "a" && text(el).trim() === "Ver no Financeiro").length, 0, "sem atalho sem a permissão da rota");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// J-559 (C3-A1) — o servidor real devolve o título apagado com 200 e `active: false` (`financial-title.service.ts:257-263`,
// `financial-title.dto.ts:35`), e não com 404. A aba o mostra como "Título removido", e não como um título "Em aberto".
test("[L6c] título apagado (200 com active:false, como o servidor responde) aparece como 'Título removido', e não 'Em aberto'; o título ativo ao lado segue com rótulo, valor e situação", async () => {
  server = {
    list: listDto([invoicedDto(ITEM_A), invoicedDto({ ...ITEM_C, titleId: "t-2" })], 95),
    titles: {
      "t-1": titleDto({ amount: 60, status: "open", active: false }),
      "t-2": titleDto({ id: "t-2", amount: 35, parentTitleId: "t-1", status: "open", active: true }),
    },
  };
  const view = await mount();
  try {
    assert.equal(titleReads(), 2, "uma leitura por título");
    const rows = all(view.container, (el) => el.localName === "tr").map(text);
    assert.equal(rows.filter((row) => row.includes("Título removido")).length, 1, `o apagado vira 'Título removido': ${rows.join(" | ")}`);
    assert.deepEqual(rows.filter((row) => row.startsWith("Original")), [], "o apagado não aparece como título Original a receber");
    const open = rows.filter((row) => row.includes("Em aberto"));
    assert.equal(open.length, 1, `só o título ativo aparece Em aberto: ${open.join(" | ")}`);
    assert.ok(open[0].startsWith("Complementar") && open[0].includes(formatMoney(35, "BRL")), `o ativo segue com rótulo e valor: ${open[0]}`);
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

test("[L6] sem financial_titles:read: 0 leitura de título e o quadro não aparece", async () => {
  server = { list: listDto([invoicedDto(ITEM_A), itemDto(ITEM_B)], 100), titles: { "t-1": titleDto({ amount: 60 }) } };
  const view = await mount({ permissions: NO_TITLES_READ });
  try {
    assert.equal(listReads(), 1, "a lista foi lida");
    assert.equal(titleReads(), 0, "nenhuma leitura de título");
    assert.ok(!text(view.container).includes("Títulos desta OS"), "o quadro não aparece");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L8 · um pedido por clique ===============================

test("[L8] 1º POST preso; 2 envios no mesmo tique e 1 depois do render → exatamente 1 POST; botão disabled e aria-busy; 201 sem alerta de erro", async () => {
  let release: ((response: Response) => void) | null = null;
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: { "t-1": titleDto({ amount: 100 }) },
    invoice: () =>
      new Promise<Response>((resolve) => {
        release = (response) => {
          server.list = listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B)], 100);
          resolve(response);
        };
      }),
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    const firstHandler = onSubmitOf(formIn(opened));
    await act(async () => {
      firstHandler(SUBMIT_EVENT);
      firstHandler(SUBMIT_EVENT);
    });
    await settle();
    const thirdHandler = onSubmitOf(formIn(dialog(view.container)));
    await act(async () => {
      thirdHandler(SUBMIT_EVENT);
    });
    await settle();
    assert.equal(invoicePosts().length, 1, "exatamente 1 POST com o 1º preso");
    const busy = submitButton(dialog(view.container));
    assert.ok(busy, "botão de confirmar presente");
    assert.equal(propsOf(busy).disabled, true, "botão desabilitado com o POST em voo");
    assert.equal(busy.getAttribute("aria-busy"), "true", "aria-busy com o POST em voo");
    assert.ok(release, "o POST está preso");
    await act(async () => {
      release!(invoiced201(titleDto({ amount: 100 }), 100, 2));
    });
    await settle();
    assert.equal(invoicePosts().length, 1, "continua 1 POST");
    assert.ok(statusText(view.container).includes(`Título a receber criado: ${formatMoney(100, "BRL")}, 2 itens faturados.`), "aviso com o valor do servidor");
    assert.deepEqual(alertTexts(view.container), [], "nenhum alerta de erro depois do sucesso");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L9 · aviso de valor defasado ===============================

async function divergenceCase(options: { list: unknown; after: unknown; shownTotal: boolean; result: { total: number; count: number; parent: string | null } }) {
  server = {
    list: options.list,
    titles: { "t-1": titleDto({ amount: options.result.total }), "t-2": titleDto({ id: "t-2", amount: options.result.total, parentTitleId: "t-1" }) },
    invoice: () => {
      server.list = options.after;
      const title = options.result.parent ? titleDto({ id: "t-2", amount: options.result.total, parentTitleId: options.result.parent }) : titleDto({ amount: options.result.total });
      return invoiced201(title, options.result.total, options.result.count);
    },
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    assert.equal(text(opened).includes("Valor do título"), options.shownTotal, "o diálogo mostra o total só no 1º faturamento");
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.equal(listReads(), 2, "a lista foi relida");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
    return statusText(view.container);
  } finally {
    await view.unmount();
  }
}

test("[L9] a lista mostrou 100 em 2 itens; o servidor faturou 130 em 3 → aviso com 130 e a frase de divergência; lista relida", async () => {
  const notice = await divergenceCase({
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    after: listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B), invoicedDto(ITEM_D)], 130),
    shownTotal: true,
    result: { total: 130, count: 3, parent: null },
  });
  assert.ok(notice.includes(`Título a receber criado: ${formatMoney(130, "BRL")}, 3 itens faturados.`), `aviso: ${notice}`);
  assert.ok(notice.includes(DIVERGENCE), "a frase de divergência");
});

test("[L9b] sentido inverso: mostrou 100 em 2; faturou 70 em 1 → divergência", async () => {
  const notice = await divergenceCase({
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    after: listDto([invoicedDto({ ...ITEM_D, totalAmount: 70, unitAmount: 70 })], 70),
    shownTotal: true,
    result: { total: 70, count: 1, parent: null },
  });
  assert.ok(notice.includes(`Título a receber criado: ${formatMoney(70, "BRL")}, 1 item faturado.`), `aviso: ${notice}`);
  assert.ok(notice.includes(DIVERGENCE), "a frase de divergência");
});

test("[L9c] complementar (1 faturado e 1 pendente; o diálogo não mostra total); 201 com 2 itens → divergência", async () => {
  const notice = await divergenceCase({
    list: listDto([invoicedDto(ITEM_A), itemDto(ITEM_C)], 95),
    after: listDto([invoicedDto(ITEM_A), invoicedDto({ ...ITEM_C, titleId: "t-2" }), invoicedDto({ ...ITEM_D, titleId: "t-2" })], 125),
    shownTotal: false,
    result: { total: 65, count: 2, parent: "t-1" },
  });
  assert.ok(notice.includes(`Título a receber criado: ${formatMoney(65, "BRL")}, 2 itens faturados (complementar).`), `aviso: ${notice}`);
  assert.ok(notice.includes(DIVERGENCE), "a frase de divergência");
});

test("[L9d] valores iguais → sem a frase de divergência", async () => {
  const notice = await divergenceCase({
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    after: listDto([invoicedDto(ITEM_A), invoicedDto(ITEM_B)], 100),
    shownTotal: true,
    result: { total: 100, count: 2, parent: null },
  });
  assert.ok(notice.includes(`Título a receber criado: ${formatMoney(100, "BRL")}, 2 itens faturados.`), `aviso: ${notice}`);
  assert.ok(!notice.includes(DIVERGENCE), "sem divergência");
});

// =============================== L10 · o 403 não é sempre "perfil" ===============================

async function refusalCase(status: number, code: string, reason: string) {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: {},
    invoice: () => apiError(status, code, reason),
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "1 POST");
    assert.equal(dialog(view.container), undefined, "o diálogo fecha");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
    return { alerts: alertTexts(view.container), reads: listReads() };
  } finally {
    await view.unmount();
  }
}

test("[L10] 403 module_not_enabled → 'O Financeiro não está habilitado nesta organização.' (e não 'Seu perfil…'); 403 permission_required → 'Seu perfil não permite faturar.'", async () => {
  const moduleOff = await refusalCase(403, "MODULE_NOT_ENABLED", "module_not_enabled");
  assert.deepEqual(moduleOff.alerts, ["O Financeiro não está habilitado nesta organização."], "a frase do módulo");
  assert.ok(!moduleOff.alerts.join(" ").includes("Seu perfil"), "o 403 do módulo não vira 'perfil'");
  assert.equal(moduleOff.reads, 1, "não relê");
  const noPermission = await refusalCase(403, "FORBIDDEN", "permission_required");
  assert.deepEqual(noPermission.alerts, ["Seu perfil não permite faturar."], "a frase da permissão");
});

// =============================== L11 · sessão encerrada antes do router ===============================

test("[L11] 401 session_inactive com o refresh recusado → a frase da sessão; exatamente 1 POST de faturamento; no máximo 1 refresh; nenhuma releitura da lista", async () => {
  server = {
    list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100),
    titles: {},
    invoice: () => apiError(401, "INVALID_TOKEN", "session_inactive"),
    refresh: () => apiError(401, "INVALID_TOKEN", "session_inactive"),
  };
  const view = await mount();
  try {
    const opened = await openDialog(view.container);
    const readsBefore = listReads();
    await submit(formIn(opened));
    assert.equal(invoicePosts().length, 1, "exatamente 1 POST de faturamento");
    assert.ok(countCalls("POST", /^\/auth\/refresh$/) <= 1, `no máximo 1 refresh: ${countCalls("POST", /^\/auth\/refresh$/)}`);
    assert.deepEqual(alertTexts(view.container), ["Sua sessão terminou, e nada foi faturado. Entre de novo para faturar."], "a frase da sessão");
    assert.equal(listReads(), readsBefore, "nenhuma releitura da lista depois do erro (ela também daria 401)");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});

// =============================== L12 · a página monta a aba com a OS (Emenda 2, E2.2) ===============================

test("[L12] a página real (WorkOrderDetailView, aba Financeiro) passa a situação, o código e o título da OS: o diálogo mostra 'OS-77 · Reboque'; OS cancelada não mostra o botão", async () => {
  const { WorkOrderDetailView } = await import("../src/modules/work-orders/pages/WorkOrderDetailPage");
  const renderDetail = async (status: string) => {
    server = { list: listDto([itemDto(ITEM_A), itemDto(ITEM_B)], 100), titles: {} };
    dom.storage.clear();
    setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, permissions: [...FINANCE] } });
    installFetch();
    const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
    const root = createRoot(container as unknown as Element);
    const workOrder = { id: WO, code: "OS-77", title: "Reboque", status, priority: "high", customerName: "Cliente Alfa", createdAt: STAMP, links: null };
    await act(async () => {
      root.render(
        h(
          MemoryRouter,
          null,
          h(WorkOrderDetailView, {
            workOrder: workOrder as never,
            timeline: [],
            loading: false,
            status: "ready",
            error: null,
            stale: false,
            lastUpdatedAt: null,
            timelineUnavailable: false,
            context: CTX,
            permissions: [...FINANCE],
            activeTab: "financeiro",
            onSelectTab: () => undefined,
            onRefresh: () => undefined,
          }),
        ),
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
  };

  const open = await renderDetail("completed");
  try {
    assert.equal(listReads(), 1, "a aba Financeiro da página leu a lista");
    const opened = await openDialog(open.container);
    const subtitle = all(opened, (el) => el.localName === "p" && text(el).startsWith("OS-77"))[0];
    assert.ok(subtitle, "o diálogo tem o subtítulo da OS");
    assert.equal(text(subtitle).trim(), "OS-77 · Reboque", "subtítulo com o código e o título que a página passou");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await open.unmount();
  }

  const cancelled = await renderDetail("cancelled");
  try {
    assert.equal(listReads(), 1, "a lista foi lida");
    assert.equal(buttonByText(cancelled.container, "Faturar OS"), undefined, "OS cancelada: a página passa a situação e o botão some (Q1 = A)");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await cancelled.unmount();
  }
});

// =============================== L13 · pendentes de valor zero (J-559, C1-01) ===============================

// O servidor aceita item de valor 0 (`financial-item.shape.ts:55`) e só fatura com a soma dos pendentes > 0
// (`work-order-financial.service.ts:436` e `:454`). O botão segue o mesmo critério: com todo pendente valendo zero, não
// aparece (antes, aparecia e a recusa voltava a cada clique). Com um pendente de valor > 0 ao lado, aparece, e a
// confirmação lista os dois, porque o servidor fatura os dois.
test("[L13] pendentes que valem zero: sem botão no 1º faturamento nem no complementar; com um pendente de valor > 0 ao lado, o botão aparece e a confirmação lista os dois", async () => {
  const ZERO = { id: "it-z", description: "Cortesia", unitAmount: 0, totalAmount: 0 };

  // (a) a OS só com o item de valor 0: o servidor responderia 422 nothing_to_invoice.
  server = { list: listDto([itemDto(ZERO)], 0), titles: {} };
  let view = await mount();
  try {
    assert.ok(text(view.container).includes("Cortesia"), "o item de valor 0 aparece na lista");
    assert.equal(buttonByText(view.container, "Faturar OS"), undefined, "só pendente de valor 0: sem botão");
    assert.equal(calls.filter((c) => c.method === "POST").length, 0, "nenhum POST");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }

  // (b) o original já faturado e 1 pendente de valor 0: o servidor responderia 409 already_invoiced.
  server = { list: listDto([invoicedDto(ITEM_A), itemDto(ZERO)], 60), titles: { "t-1": titleDto({ amount: 60 }) } };
  view = await mount();
  try {
    assert.equal(invoicedChips(view.container), 1, "o faturado com o chip");
    assert.equal(buttonByText(view.container, "Faturar OS"), undefined, "complementar com pendente de valor 0: sem botão");
    assert.equal(calls.filter((c) => c.method === "POST").length, 0, "nenhum POST");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }

  // (c) controle: um pendente de valor > 0 e um de valor 0 → o botão aparece e a confirmação lista os dois.
  server = { list: listDto([itemDto(ITEM_A), itemDto(ZERO)], 60), titles: {} };
  view = await mount();
  try {
    const opened = await openDialog(view.container);
    assert.ok(text(opened).includes("Guincho leve") && text(opened).includes("Cortesia"), "a confirmação lista os 2 pendentes, o de valor 0 também");
    assert.ok(text(opened).includes(formatMoney(60, "BRL")), "o valor do título é o totalAmount do servidor");
    assert.equal(calls.filter((c) => c.method === "POST").length, 0, "abrir a confirmação não envia");
    assert.deepEqual(unexpected, [], "nenhuma rota fora do contrato");
  } finally {
    await view.unmount();
  }
});
