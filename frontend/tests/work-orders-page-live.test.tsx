import assert from "node:assert/strict";
import test, { after } from "node:test";

import type { TenantContext } from "../src/modules/context/types";

// B-SAN3-01b (E1) — a PÁGINA REAL com o HOOK REAL rodando EFEITOS: `fetch` (a borda de rede, único dublê) → `apiRequest`
// → `listWorkOrdersFromApi` → `nextListState` → `useWorkOrders` (`useEffect` → `refresh` → `setState`) → `WorkOrdersPage`
// → painel/KPIs/controles. Nenhuma substituição de módulo, nenhuma semente de estado, nenhum SSR com props à mão: é o
// componente que a rota monta, com os provedores reais, a partir dos BYTES do backend (`toWorkOrderListDto`, o 403 de
// `rbac.middleware.ts`, o 500 genérico de `sendRouteError`). Fecha `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`,
// `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO` (os `[W1]`/`[W2]` por COMPORTAMENTO, que antes eram regex sobre o texto dos hooks)
// e prova o gate do botão "Nova OS" papel a papel (`P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`).
//
// Contrato de teste (§4.1 do plano):
//   (a) ZERO dependência nova — o projeto não tem biblioteca de DOM; o DOM mínimo abaixo é escrito aqui mesmo;
//   (b) o DOM mínimo é instalado ANTES de qualquer import de `react-dom/client` (que calcula `canUseDOM` ao carregar):
//       React, roteador, provedores e páginas entram por `await import(...)` depois da instalação;
//   (c) `globalThis.navigator` só é definido se ausente (Node 20 não tem; Node ≥ 21 tem);
//   (d) `window.setInterval` CAPTURA o callback e NUNCA dispara sozinho — o teste aciona o tick do auto-refresh quando quer
//       o 2º plano (é assim que `[W1]`/`[W2]`/`[PV6]` provam o comportamento sem tocar nos hooks);
//   (e) `IS_REACT_ACT_ENVIRONMENT = true`;
//   (f) cada caso desmonta a raiz (`root.unmount()` dentro de `act`) e limpa o `localStorage`.
//   (g) `fire` chama o handler registrado em `__reactProps$…`; prova a fiação da página, não a delegação de eventos do React.
// Toda asserção é de COMPORTAMENTO (data-state, contagens, presença/ausência de controle) — nunca "contém OS-000101".
// Em modo REAL (`VITE_USE_MOCKS` ≠ "true"); rota não prevista no stub de `fetch` LANÇA — nenhum caso passa por acidente.
process.env.VITE_USE_MOCKS = "false";

// =============================== DOM mínimo (sem dependência) ===============================

const HTML_NS = "http://www.w3.org/1999/xhtml";

type Listener = (event: unknown) => void;
type DownloadClick = { readonly download: string; readonly href: string };
const downloadClicks: DownloadClick[] = [];

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
  get options(): MiniElement[] {
    const out: MiniElement[] = [];
    const walk = (node: MiniNode) => {
      for (const child of node.childNodes) {
        if (child instanceof MiniElement && child.localName === "option") out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  get value(): string {
    return this.storedValue ?? (this.localName === "option" ? (this.getAttribute("value") ?? this.textContent) : "");
  }
  set value(value: unknown) {
    this.storedValue = String(value);
  }
  get download(): string {
    return this.getAttribute("download") ?? "";
  }
  set download(value: string) {
    this.setAttribute("download", value);
  }
  get href(): string {
    return this.getAttribute("href") ?? "";
  }
  set href(value: string) {
    this.setAttribute("href", value);
  }
  click(): void {
    downloadClicks.push({ download: this.download, href: this.href });
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
    // (d) Intervalos CAPTURADOS: nunca disparam sozinhos — o teste aciona o tick quando quer o 2º plano.
    setInterval: (fn: () => void, ms: number) => {
      intervals.push({ fn, ms });
      return intervals.length;
    },
    clearInterval: (id: number) => {
      if (intervals[id - 1]) intervals[id - 1].fn = null;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    scrollTo: () => {},
  };
  doc.defaultView = win;
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  // (c) Node 20 não tem `navigator` global (Node ≥ 21 tem): o react-dom lê `navigator.userAgent` ao carregar.
  if (typeof (globalThis as { navigator?: unknown }).navigator === "undefined") {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: win.navigator });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; // (e)
  return { doc, win, storage, intervals };
}

const VOID = new Set(["input", "img", "br", "hr", "meta", "link"]);

/** HTML estático do subárvore — para mensagens de falha e para a junta comparar cabeçalhos (A11, C3). */
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
const hasClass = (el: MiniElement, cls: string) => (el.getAttribute("class") ?? "").split(/\s+/).includes(cls);
const text = (el: MiniNode) => el.textContent;

// =============================== Instalação: DOM primeiro, módulos depois (b) ===============================

const dom = installMiniDom();

// H3 do plano — aviso do React (ex.: "not wrapped in act", key ausente) vira VERMELHO, não ruído: espião de `console.error`.
const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { WorkOrdersPage } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
const { WorkOrderDetailPage } = await import("../src/modules/work-orders/pages/WorkOrderDetailPage");
const { localDateString } = await import("../src/modules/work-orders/work-orders-list-filters");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
// CE-G2 (§4.3 do plano) — o CATÁLOGO do backend, executado: papel novo entra sozinho; o arquivo não tem import algum.
const { ROLE_PERMISSIONS } = await import("../../src/modules/core-saas/permissions/catalog");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") {
    throw new Error("React.act ausente: o build de produção do React não exporta `act` (NODE_ENV=production?) — o arnês não roda efeitos sem ele");
  }
  return reactAct(callback);
};
const settle = async () => {
  // Uma volta de macrotask dentro de `act` por rodada: resolve o `fetch` dublado, o `response.json()` e o `setState` do hook.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

// =============================== Bytes do backend (§4.2 do plano) ===============================

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Item da lista como `toWorkOrderListDto` o serializa (camelCase; `work-order.dto.ts`). */
const listItem = (id: string, code: string, overrides: Readonly<Record<string, unknown>> = {}) => ({
  id,
  code,
  title: `Atendimento ${code}`,
  status: "open",
  priority: "high",
  customerName: "Cliente de teste",
  serviceAddress: "Rua de teste, 1",
  serviceLatitude: null,
  serviceLongitude: null,
  assignedOperatorId: null,
  assignedUserId: null,
  vehicleId: null,
  scheduledFor: null,
  slaDueAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  ...overrides,
});
const THREE = [listItem("a", "OS-000001"), listItem("b", "OS-000002"), listItem("c", "OS-000003")];
const TWENTY_FIVE = Array.from({ length: 25 }, (_, index) =>
  listItem(`item-${index + 1}`, `OS-${String(index + 1).padStart(6, "0")}`, {
    title: index === 0 ? "Troca; urgente" : `Atendimento ${index + 1}`,
  }),
);
const THREE_WITH_COMPLETED = [
  listItem("open-a", "OS-ABERTA-1"),
  listItem("done", "OS-CONCLUIDA", { status: "completed" }),
  listItem("open-b", "OS-ABERTA-2"),
];
const THREE_PRIORITIES = [
  listItem("urgent", "OS-URGENTE", { priority: "urgent" }),
  listItem("high", "OS-ALTA", { priority: "high" }),
  listItem("low", "OS-BAIXA", { priority: "low" }),
];

const BODIES = {
  // `rbac.middleware.ts` — o 403 do gate `work_orders:read`
  "403": () => json(403, { error: { code: "FORBIDDEN", reason: "permission_required", message: "One of these permissions is required: work_orders:read." } }),
  // `sendRouteError` — o 500 genérico do backend
  "500": () => json(500, { error: { code: "INTERNAL_SERVER_ERROR", reason: "unknown_error", message: "Unexpected error." } }),
  "200vazio": () => json(200, { items: [], pagination: { limit: 20, offset: 0, total: 0 } }),
  "200x3": () => json(200, { items: THREE, pagination: { limit: 20, offset: 0, total: 3 } }),
  "200x25": () => json(200, { items: TWENTY_FIVE, pagination: { limit: 20, offset: 0, total: 25 } }),
  "200concl": () => json(200, { items: THREE_WITH_COMPLETED, pagination: { limit: 20, offset: 0, total: 3 } }),
  "200prio": () => json(200, { items: THREE_PRIORITIES, pagination: { limit: 20, offset: 0, total: 3 } }),
  pendente: () => new Promise<Response>(() => undefined),
} as const;
type Scenario = keyof typeof BODIES;

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type RouteTable = ReadonlyArray<readonly [RegExp, (url: string) => Response | Promise<Response>]>;
const requestedUrls: string[] = [];

/** Stub de `fetch` na borda: rota não prevista LANÇA (padrão `routes()` de `work-orders-honest-errors.test.tsx`). */
function installFetch(table: RouteTable): void {
  const impl: FetchImpl = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    for (const [pattern, respond] of table) if (pattern.test(url)) return respond(url);
    throw new Error(`rota não prevista no stub de fetch: ${url}`);
  };
  globalThis.fetch = impl as typeof fetch;
}

let listScenario: Scenario = "403";
const LIST_ROUTES: RouteTable = [[/\/work-orders(\?|$)/, () => BODIES[listScenario]()]];

// =============================== Montagem da página real ===============================

const CONTEXT_BASE = {
  tenantId: "ten-industrial-01",
  tenantName: "Techsolutions Industrial",
  tenantStatus: "active",
  branchId: "fil-sp-01",
  branchName: "Sao Paulo - Campo",
  enabledModules: ["work-orders"],
  scope: "branch",
} as const;

type Mounted = {
  readonly container: MiniElement;
  readonly html: () => string;
  readonly unmount: () => Promise<void>;
};

async function mount(permissions: readonly string[], role: string, tree: (children: unknown) => unknown, element: unknown): Promise<Mounted> {
  dom.storage.clear();
  dom.intervals.length = 0;
  requestedUrls.length = 0;
  downloadClicks.length = 0;
  // Sessão SEM permissões próprias: as permissões do ator vêm só do contexto ativo (o papel sob teste).
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: [], permissions: [] } });
  const context: TenantContext = { ...CONTEXT_BASE, role: role as TenantContext["role"], permissions: [...permissions] };
  dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify(context));
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(tree(h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, element as never)))) as never);
  });
  await settle();
  let mounted = true;
  return {
    container,
    html: () => serialize(container),
    unmount: async () => {
      if (!mounted) return;
      mounted = false;
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
      dom.storage.clear();
    },
  };
}

/**
 * Isolamento por caso: monta, roda o corpo e SEMPRE desmonta (também quando uma asserção falha — senão a raiz viva do caso
 * vermelho contamina os seguintes: intervalo capturado a mais, `fetch` resolvendo fora de `act`, `console.error` herdado).
 * Só com o corpo verde é que o caso assere "zero console.error" (um caso vermelho não ganha um 2º erro que esconda o 1º).
 */
async function withPage<T>(mountPage: () => Promise<Mounted>, body: (page: Mounted) => Promise<T>): Promise<T> {
  consoleErrors.length = 0;
  const page = await mountPage();
  let ok = false;
  try {
    const result = await body(page);
    ok = true;
    return result;
  } finally {
    await page.unmount();
    if (ok) {
      const errors = consoleErrors.splice(0);
      assert.deepEqual(errors, [], "nenhum console.error do React/da página durante o caso");
    } else {
      consoleErrors.length = 0;
    }
  }
}

const listTree = (children: unknown) => h(MemoryRouter, { initialEntries: ["/work-orders"] }, children as never);
const mountList = (permissions: readonly string[], role = "Operador") => mount(permissions, role, listTree, h(WorkOrdersPage));

/** Leitura de COMPORTAMENTO da página montada. */
function read(container: MiniElement) {
  const all = elements(container, () => true);
  return {
    dataStates: all.filter((el) => el.hasAttribute("data-state")).map((el) => el.getAttribute("data-state")!),
    kpiValues: all.filter((el) => hasClass(el, "pat-kpi__value")).map(text),
    kpiSkeletonCards: all.filter((el) => hasClass(el, "pat-kpi") && el.getAttribute("aria-hidden") === "true").length,
    // `ClickableKpiCard` (role="button" + aria-haspopup="dialog"): só com dado E `kpiDetails` — em falha o KPI não abre pop-up sobre "—".
    kpiClickable: all.filter((el) => el.getAttribute("role") === "button" && el.getAttribute("aria-haspopup") === "dialog").length,
    rows: all.filter((el) => hasClass(el, "pat-os-row")).length,
    rowSkeletons: all.filter((el) => hasClass(el, "pat-os-grid") && !hasClass(el, "pat-os-grid--head") && el.getAttribute("aria-hidden") === "true").length,
    alerts: all.filter((el) => el.getAttribute("role") === "alert").length,
    novaOs: all.filter((el) => el.localName === "button" && text(el).trim() === "Nova OS").length,
    headerNovaOs: all
      .filter((el) => el.localName === "header" && hasClass(el, "pat-page-header"))
      .flatMap((header) => elements(header, (el) => el.localName === "button" && text(el).trim() === "Nova OS")).length,
    atribuir: all.filter((el) => el.localName === "button" && (el.getAttribute("aria-label") ?? "").startsWith("Atribuir técnico")).length,
    retry: all.filter((el) => el.localName === "button" && text(el).trim() === "Tentar novamente").length,
    count: all.filter((el) => hasClass(el, "pat-os-count")).map(text),
    pagerRange: all.filter((el) => hasClass(el, "pat-pager__range")).map(text),
    search: all.filter((el) => el.localName === "input" && el.getAttribute("aria-label") === "Buscar por código, cliente ou endereço").length,
    stale: all.filter((el) => el.getAttribute("data-state") === "stale").map(text),
    panelDetail: all
      .filter((el) => el.hasAttribute("data-state") && el.getAttribute("data-state") !== "stale")
      .map((panel) => elements(panel, (el) => el.localName === "div").map(text)),
    demo: /Dados demonstrativos/.test(serialize(container)),
  };
}

const noDigit = (values: string[]) => values.every((value) => !/\d/.test(value));
const SERVICE_ERROR_TEXT = "A consulta às ordens de serviço falhou. Tente novamente em instantes.";

async function fire(element: MiniElement, prop: "onClick" | "onChange", value?: string): Promise<void> {
  const propsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
  if (!propsKey) throw new Error(`propriedades internas do React ausentes em <${element.localName}>`);
  const props = (element as unknown as Record<string, unknown>)[propsKey] as Record<string, unknown>;
  const handler = props[prop];
  if (typeof handler !== "function") throw new Error(`${prop} ausente em <${element.localName}>`);
  if (value !== undefined) element.value = value;
  await act(async () => {
    handler({
      target: element,
      currentTarget: element,
      preventDefault() {},
      stopPropagation() {},
    });
  });
  await settle();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function buttonNamed(container: MiniElement, label: string): MiniElement {
  const button = elements(
    container,
    (element) => element.localName === "button" && text(element).trim().startsWith(label),
  )[0];
  if (!button) throw new Error(`botão "${label}" ausente: ${serialize(container)}`);
  return button;
}

function elementById(container: MiniElement, id: string): MiniElement {
  const element = elements(container, (candidate) => candidate.getAttribute("id") === id)[0];
  if (!element) throw new Error(`#${id} ausente: ${serialize(container)}`);
  return element;
}

function queryParam(url: string, key: string): string | null {
  return new URL(url, "http://t").searchParams.get(key);
}

async function captureDownloads(run: () => Promise<void>): Promise<readonly Blob[]> {
  const blobs: Blob[] = [];
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  URL.createObjectURL = (blob: Blob) => {
    blobs.push(blob);
    return `blob:osfe-${blobs.length}`;
  };
  URL.revokeObjectURL = () => undefined;
  try {
    await run();
    return blobs;
  } finally {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
}

/** O tick do auto-refresh capturado (um só intervalo vivo) — dispara o 2º plano sob controle do teste. */
async function backgroundTick() {
  const live = dom.intervals.filter((interval) => interval.fn !== null);
  assert.equal(live.length, 1, `exatamente 1 intervalo de auto-refresh capturado (vivos: ${live.length}, total: ${dom.intervals.length})`);
  await act(async () => {
    live[0].fn!();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await settle();
}

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo (H3: aviso do React é vermelho, não ruído)");
});

// =============================== MD. O arnês se prova (A13) ===============================

test("[MD0] arnês: React.act existe; efeito com setState muda o DOM; intervalo é capturado e NÃO dispara sozinho", async () => {
  assert.equal(typeof reactAct, "function", "React.act ausente: o build de produção do React não exporta `act` (NODE_ENV=production?)");
  assert.equal(dom.doc.hidden, false, "document.hidden é false (o tick do auto-refresh não pausa)");
  let fired = 0;
  function Probe() {
    const [n, setN] = React.useState(0);
    React.useEffect(() => {
      setN(1);
      const id = window.setInterval(() => void (fired += 1), 10);
      return () => window.clearInterval(id);
    }, []);
    return h("span", { "data-n": n, "data-probe": "" });
  }
  consoleErrors.length = 0;
  dom.intervals.length = 0;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  try {
    await act(async () => root.render(h(Probe)));
    const probe = elements(container, (el) => el.hasAttribute("data-probe"));
    assert.equal(probe.length, 1);
    assert.equal(probe[0].getAttribute("data-n"), "1", "o efeito rodou e o setState chegou ao DOM");
    assert.equal(dom.intervals.filter((interval) => interval.fn !== null).length, 1, "o setInterval foi capturado");
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(fired, 0, "o intervalo capturado NÃO disparou sozinho (40 ms > 10 ms de cadência)");
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
  }
  assert.equal(dom.intervals.filter((interval) => interval.fn !== null).length, 0, "clearInterval no desmonte");
  assert.deepEqual(consoleErrors.splice(0), []);
});

// =============================== PV. Página viva × estado do backend (A1–A3) ===============================

const READ_CREATE = ["work_orders:read", "work_orders:create"];

test("[PV1] 403 do backend → um único data-state, 'forbidden'; 4 KPIs sem dígito; 0 linhas; sem alerta, sem contagem, sem paginador", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "403";
  await withPage(() => mountList(READ_CREATE), async (page) => {
    const r = read(page.container);
    assert.deepEqual(r.dataStates, ["forbidden"], page.html());
    assert.equal(r.kpiValues.length, 4);
    assert.ok(noDigit(r.kpiValues), `KPIs sem dígito: ${JSON.stringify(r.kpiValues)}`);
    assert.equal(r.kpiClickable, 0, "KPI degradado não abre pop-up sobre \"—\"");
    assert.equal(r.rows, 0);
    assert.equal(r.alerts, 0, "sem permissão não é falha de sistema: sem role=alert");
    assert.deepEqual(r.count, [], "sem contagem de ordens");
    assert.deepEqual(r.pagerRange, [], "sem paginador");
    assert.equal(r.retry, 0, "sem 'Tentar novamente'");
  });
});

test("[PV2] 500 do backend → 'error' com role=alert, 1 'Tentar novamente', KPIs sem dígito e o TEXTO que o service devolveu no painel", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "500";
  await withPage(() => mountList(READ_CREATE), async (page) => {
    const r = read(page.container);
    assert.deepEqual(r.dataStates, ["error"], page.html());
    assert.equal(r.alerts, 1);
    assert.equal(r.retry, 1);
    assert.equal(r.kpiValues.length, 4);
    assert.ok(noDigit(r.kpiValues), `KPIs sem dígito: ${JSON.stringify(r.kpiValues)}`);
    assert.equal(r.kpiClickable, 0, "KPI degradado não abre pop-up sobre \"—\"");
    assert.equal(r.rows, 0);
    assert.ok(r.panelDetail.flat().includes(SERVICE_ERROR_TEXT), `o painel mostra a razão do service: ${JSON.stringify(r.panelDetail)}`);
  });
});

test("[PV3] 200 vazio → 'empty' EMBUTIDO (busca presente), KPIs 0, '0 ordens', CTA + botão = 2 'Nova OS' com create, sem paginador", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200vazio";
  await withPage(() => mountList(READ_CREATE), async (page) => {
    const r = read(page.container);
    assert.deepEqual(r.dataStates, ["empty"], page.html());
    assert.equal(r.search, 1, "o vazio fica dentro do card: a busca continua na tela");
    assert.deepEqual(r.kpiValues, ["0", "0", "0", "0"]);
    assert.equal(r.kpiClickable, 4, "com dado (vazio legítimo) os 4 KPIs abrem o pop-up de participação");
    assert.deepEqual(r.count, ["0 ordens"]);
    assert.equal(r.novaOs, 2, "cabeçalho + CTA do vazio");
    assert.equal(r.rows, 0);
    assert.equal(r.alerts, 0);
    assert.deepEqual(r.pagerRange, []);
  });
});

test("[PV4] 200 com 3 → 3 linhas, KPIs das linhas, paginador '1–3 de 3', '3 ordens', nenhum painel de estado", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(READ_CREATE), async (page) => {
    const r = read(page.container);
    assert.deepEqual(r.dataStates, [], page.html());
    assert.equal(r.rows, 3);
    assert.deepEqual(r.kpiValues, ["3", "0", "0", "0"], "abertas · em andamento · atrasadas · concluídas, derivadas das 3 linhas");
    assert.equal(r.kpiClickable, 4, "com dado os 4 KPIs abrem o pop-up de participação");
    assert.deepEqual(r.pagerRange, ["1–3 de 3"]);
    assert.deepEqual(r.count, ["3 ordens"]);
    assert.equal(r.alerts, 0);
    assert.equal(r.novaOs, 1, "só o botão do cabeçalho (sem CTA do vazio)");
  });
});

test("[PV5] fetch pendente → esqueletos (4 KPI + 4 linhas), sem data-state, sem valor de KPI", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "pendente";
  await withPage(() => mountList(READ_CREATE), async (page) => {
    const r = read(page.container);
    assert.deepEqual(r.dataStates, [], page.html());
    assert.equal(r.kpiSkeletonCards, 4);
    assert.equal(r.rowSkeletons, 4);
    assert.deepEqual(r.kpiValues, [], "nenhum valor de KPI enquanto carrega");
    assert.equal(r.rows, 0);
    assert.equal(r.alerts, 0);
  });
});

test("[PV6] 3 OS na tela e 403 em 2º PLANO → 'forbidden', 0 linhas, KPIs sem dígito e SEM faixa de desatualizado (F1b, agora vivo)", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(READ_CREATE), async (page) => {
    assert.equal(read(page.container).rows, 3, "pré-condição: 3 linhas na tela");
    listScenario = "403";
    await backgroundTick();
    const r = read(page.container);
    assert.deepEqual(r.dataStates, ["forbidden"], page.html());
    assert.equal(r.rows, 0, "permissão revogada em sessão: a lista SAI (fail-closed)");
    assert.ok(noDigit(r.kpiValues) && r.kpiValues.length === 4, `KPIs sem dígito: ${JSON.stringify(r.kpiValues)}`);
    assert.deepEqual(r.stale, [], "não fica 'desatualizada' — não há dado legítimo a manter");
  });
});

test("[PV7] em modo REAL nenhum cenário mostra 'Dados demonstrativos'", async () => {
  installFetch(LIST_ROUTES);
  for (const scenario of ["403", "500", "200vazio", "200x3"] as const) {
    listScenario = scenario;
    await withPage(
      () => mountList(READ_CREATE),
      async (page) => assert.equal(read(page.container).demo, false, `cenário ${scenario}: ${page.html()}`),
    );
  }
});

// =============================== FE. Filtrar e Exportar ligados à página real ===============================

test("[FE1] cabeçalho ordena Filtrar, Exportar e Nova OS conforme o gate de criação", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(READ_CREATE), async ({ container }) => {
    const header = elements(container, (element) => element.localName === "header" && hasClass(element, "pat-page-header"))[0];
    const buttons = elements(header, (element) => element.localName === "button");
    assert.deepEqual(buttons.map((button) => text(button).trim()), ["Filtrar", "Exportar", "Nova OS"]);
    assert.equal(buttons[0].getAttribute("class"), "pat-btn");
    assert.equal(buttons[1].getAttribute("class"), "pat-btn");
    assert.equal(buttons[0].getAttribute("aria-expanded"), "false");
    for (const button of buttons.slice(0, 2)) {
      assert.equal(elements(button, (element) => element.localName === "svg" && element.getAttribute("aria-hidden") === "true").length, 1);
    }
    assert.equal(elements(container, (element) => element.getAttribute("id") === "os-filtros").length, 0);
  });

  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    const header = elements(container, (element) => element.localName === "header" && hasClass(element, "pat-page-header"))[0];
    assert.deepEqual(elements(header, (element) => element.localName === "button").map((button) => text(button).trim()), ["Filtrar", "Exportar"]);
  });
});

test("[FE2] Exportar reflete carregando, erro, vazio, pronto e 403", async () => {
  installFetch(LIST_ROUTES);

  listScenario = "403";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    assert.equal(elements(container, (element) => element.localName === "button" && /^(Filtrar|Exportar)$/.test(text(element).trim())).length, 0);
    assert.equal(elements(container, (element) => hasClass(element, "pat-page-header__actions")).length, 0);
  });

  const cases = [
    ["500", "Nada para exportar: a lista não carregou.", true],
    ["200vazio", "Nenhuma ordem na lista para exportar.", true],
    ["pendente", "Aguarde: a lista ainda está carregando.", true],
    ["200x3", "Baixar as 3 ordens da lista em planilha (CSV).", false],
  ] as const;
  for (const [scenario, title, disabled] of cases) {
    listScenario = scenario;
    await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
      const button = buttonNamed(container, "Exportar");
      assert.equal(button.hasAttribute("disabled"), disabled, scenario);
      assert.equal(button.getAttribute("title"), title, scenario);
    });
  }
});

test("[FE3] Exportar baixa as 25 linhas filtradas, não só a página visível", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x25";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    const blobs = await captureDownloads(async () => {
      await fire(buttonNamed(container, "Exportar"), "onClick");
    });
    assert.deepEqual(downloadClicks, [{ download: "ordens-de-servico.csv", href: "blob:osfe-1" }]);
    assert.equal(blobs.length, 1);
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
    const csv = await blobs[0].text();
    const lines = csv.split("\r\n");
    assert.equal(lines[0], "Código;Prioridade;Cliente;Serviço;Técnico;Agenda;Atrasada;Situação");
    assert.equal(lines.length - 1, 25);
    assert.match(csv, /"Troca; urgente"/);
    assert.deepEqual(read(container).count, ["25 ordens"]);
    assert.equal(read(container).rows, 20);
  });
});

test("[FE4] Filtrar abre cartão acessível, envia prioridade, mostra selo e limpa", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    const filterButton = buttonNamed(container, "Filtrar");
    await fire(filterButton, "onClick");
    assert.equal(filterButton.getAttribute("aria-expanded"), "true");
    assert.equal(filterButton.getAttribute("aria-controls"), "os-filtros");
    const card = elementById(container, "os-filtros");
    assert.equal(card.getAttribute("role"), "group");
    assert.equal(card.getAttribute("aria-label"), "Filtros da lista de ordens de serviço");
    const labels = elements(card, (element) => element.localName === "label");
    assert.deepEqual(labels.map((label) => text(label)), ["Prioridade", "Data de abertura", "De", "Até"]);
    for (const label of labels) assert.equal(elements(card, (element) => element.getAttribute("id") === label.getAttribute("for")).length, 1);
    assert.equal(buttonNamed(card, "Limpar").hasAttribute("disabled"), true);

    await fire(elementById(container, "os-filtro-prioridade"), "onChange", "high");
    assert.equal(queryParam(requestedUrls.at(-1)!, "priority"), "high");
    assert.ok((filterButton.getAttribute("class") ?? "").includes("pat-btn--engaged"));
    assert.equal(elements(filterButton, (element) => hasClass(element, "pat-btn__count") && element.getAttribute("aria-hidden") === "true").map(text).join(""), "1");
    assert.match(elements(filterButton, (element) => hasClass(element, "sr-only")).map(text).join(""), /1 filtro ativo/);

    await fire(buttonNamed(card, "Limpar"), "onClick");
    assert.equal(queryParam(requestedUrls.at(-1)!, "priority"), null);
    assert.equal(elements(filterButton, (element) => hasClass(element, "pat-btn__count")).length, 0);
  });
});

test("[FE5] datas chegam como limites ISO locais e o atalho Hoje preenche o dia", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    await fire(buttonNamed(container, "Filtrar"), "onClick");
    await fire(elementById(container, "os-filtro-de"), "onChange", "2026-10-01");
    await fire(elementById(container, "os-filtro-ate"), "onChange", "2026-10-07");
    assert.equal(queryParam(requestedUrls.at(-1)!, "from"), new Date(2026, 9, 1, 0, 0, 0, 0).toISOString());
    assert.equal(queryParam(requestedUrls.at(-1)!, "to"), new Date(2026, 9, 7, 23, 59, 59, 999).toISOString());
    assert.match(text(buttonNamed(container, "Filtrar")), /1 filtro ativo/);

    const today = localDateString(new Date());
    await fire(elementById(container, "os-filtro-abertura"), "onChange", "today");
    const [year, month, day] = today.split("-").map(Number);
    assert.equal(queryParam(requestedUrls.at(-1)!, "from"), new Date(year, month - 1, day, 0, 0, 0, 0).toISOString());
    assert.equal(queryParam(requestedUrls.at(-1)!, "to"), new Date(year, month - 1, day, 23, 59, 59, 999).toISOString());
  });
});

test("[FE6] vazio por filtro usa cópia filtrada e não duplica Nova OS", async () => {
  installFetch([[/\/work-orders(\?|$)/, (url) => queryParam(url, "priority") === "high" ? BODIES["200vazio"]() : BODIES["200x3"]()]]);
  await withPage(() => mountList(READ_CREATE), async ({ container }) => {
    await fire(buttonNamed(container, "Filtrar"), "onClick");
    await fire(elementById(container, "os-filtro-prioridade"), "onChange", "high");
    assert.deepEqual(read(container).dataStates, ["empty"]);
    assert.match(serialize(container), /Nenhuma OS para os filtros atuais/);
    assert.equal(read(container).novaOs, 1);
    await fire(buttonNamed(elementById(container, "os-filtros"), "Limpar"), "onClick");
    assert.equal(read(container).rows, 3);
  });
});

test("[FE7] resposta superada não sobrescreve a busca mais nova", async () => {
  const first = deferred<Response>();
  const second = deferred<Response>();
  installFetch([[/\/work-orders(\?|$)/, (url) => queryParam(url, "priority") === "high" ? second.promise : first.promise]]);
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    await fire(buttonNamed(container, "Filtrar"), "onClick");
    await fire(elementById(container, "os-filtro-prioridade"), "onChange", "high");
    second.resolve(json(200, {
      items: [listItem("new-a", "OS-NOVA-A", { priority: "high" }), listItem("new-b", "OS-NOVA-B", { priority: "high" })],
      pagination: { limit: 20, offset: 0, total: 2 },
    }));
    await settle();
    first.resolve(json(200, {
      items: [listItem("old-high", "OS-ANTIGA-A", { priority: "high" }), listItem("old-low", "OS-ANTIGA-B", { priority: "low" })],
      pagination: { limit: 20, offset: 0, total: 2 },
    }));
    await settle();
    assert.equal(read(container).rows, 2);
    assert.deepEqual(read(container).count, ["2 ordens"]);
  });
});

test("[FE8] auto-refresh repete os filtros vigentes e mantém um intervalo", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200prio";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    await fire(buttonNamed(container, "Filtrar"), "onClick");
    await fire(elementById(container, "os-filtro-prioridade"), "onChange", "urgent");
    await backgroundTick();
    assert.equal(queryParam(requestedUrls.at(-1)!, "priority"), "urgent");
    assert.equal(dom.intervals.filter((interval) => interval.fn !== null).length, 1);
  });
});

test("[FE9] Exportar segue a aba e a busca aplicadas no cliente", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200concl";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    const blobs = await captureDownloads(async () => {
      await fire(buttonNamed(container, "Concluídas"), "onClick");
      await fire(buttonNamed(container, "Exportar"), "onClick");
      await fire(buttonNamed(container, "Todas"), "onClick");
      const search = elements(container, (element) => element.localName === "input" && element.getAttribute("aria-label") === "Buscar por código, cliente ou endereço")[0];
      await fire(search, "onChange", "OS-ABERTA-1");
      await fire(buttonNamed(container, "Exportar"), "onClick");
    });
    assert.equal(blobs.length, 2);
    assert.equal((await blobs[0].text()).split("\r\n").length - 1, 1);
    assert.equal((await blobs[1].text()).split("\r\n").length - 1, 1);
  });
});

test("[FE10] 403 em segundo plano fecha cartão e remove Filtrar e Exportar", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(["work_orders:read"]), async ({ container }) => {
    await fire(buttonNamed(container, "Filtrar"), "onClick");
    assert.equal(elements(container, (element) => element.getAttribute("id") === "os-filtros").length, 1);
    listScenario = "403";
    await backgroundTick();
    assert.deepEqual(read(container).dataStates, ["forbidden"]);
    assert.equal(elements(container, (element) => element.getAttribute("id") === "os-filtros").length, 0);
    assert.equal(elements(container, (element) => element.localName === "button" && /^(Filtrar|Exportar)$/.test(text(element).trim())).length, 0);
  });
});

// =============================== W. Fiação dos hooks, por COMPORTAMENTO (A4, A5) ===============================

test("[W1] lista: 3 OS, depois 500 no tick do auto-refresh → data-state 'stale', 3 linhas MANTIDAS, KPIs com dígito, horário na faixa", async () => {
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  await withPage(() => mountList(["work_orders:read"]), async (page) => {
    const before = read(page.container);
    assert.equal(before.rows, 3);
    assert.deepEqual(before.stale, []);
    listScenario = "500";
    await backgroundTick();
    const r = read(page.container);
    assert.deepEqual(r.dataStates, ["stale"], page.html());
    assert.equal(r.rows, 3, "falha em 2º plano MANTÉM as 3 linhas");
    assert.deepEqual(r.kpiValues, ["3", "0", "0", "0"], "KPIs continuam os das linhas");
    assert.equal(r.kpiClickable, 4, "desatualizado NÃO degrada os KPIs");
    assert.equal(r.alerts, 0, "a tela NÃO é trocada pelo erro");
    assert.equal(r.stale.length, 1);
    assert.match(r.stale[0], /Dados desatualizados — última atualização às \d{2}:\d{2}/, "a faixa diz quando foi a última atualização boa");
    assert.equal(r.retry, 1, "'Tentar novamente' da faixa");
  });
});

const DETAIL_DTO = {
  id: "wo-1",
  code: "OS-000901",
  title: "Atendimento OS-000901",
  description: null,
  customerName: "Cliente de teste",
  customerDocument: null,
  customerPhone: null,
  serviceAddress: "Rua de teste, 1",
  serviceCity: "São Paulo",
  serviceState: "SP",
  serviceZipCode: null,
  serviceLatitude: null,
  serviceLongitude: null,
  destinationAddress: null,
  serviceDetails: null,
  priority: "high",
  status: "assigned",
  assignedOperatorId: null,
  assignedUserId: null,
  checklistId: null,
  checklistSnapshot: null,
  customerId: null,
  vehicleId: null,
  teamId: null,
  serviceCatalogId: null,
  scheduledFor: null,
  slaDueAt: null,
  startedAt: null,
  arrivedAt: null,
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  financialCancellationDecision: null,
  mileageStart: null,
  mileageEnd: null,
  mileageSource: null,
  mileageCorrectedAt: null,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

test("[W2] detalhe: OS na tela, depois 500 em 2º plano → 'stale' e o código da OS continua no DOM", async () => {
  let detailMode: "ok" | "500" = "ok";
  installFetch([
    [/\/work-orders\/wo-1\/timeline(\?|$)/, () => (detailMode === "ok" ? json(200, { data: [] }) : BODIES["500"]())],
    [/\/work-orders\/wo-1(\?|$)/, () => (detailMode === "ok" ? json(200, { data: DETAIL_DTO }) : BODIES["500"]())],
    // `GeneralInfoTab` consulta a fila de aprovações da OS (`approvalController.listPending` → `{ data: [] }`).
    [/\/approvals\/pending(\?|$)/, () => json(200, { data: [] })],
  ]);
  const mountDetail = () =>
    mount(
      ["work_orders:read"],
      "Operador",
      (children) => h(MemoryRouter, { initialEntries: ["/work-orders/wo-1"] }, children as never),
      h(Routes, null, h(Route, { path: "/work-orders/:workOrderId", element: h(WorkOrderDetailPage) })),
    );
  await withPage(mountDetail, async (page) => {
    const before = read(page.container);
    assert.deepEqual(before.dataStates, [], page.html());
    assert.match(page.html(), /OS-000901/, "a OS está na tela");
    detailMode = "500";
    await backgroundTick();
    const r = read(page.container);
    assert.deepEqual(r.dataStates, ["stale"], page.html());
    assert.match(page.html(), /OS-000901/, "falha em 2º plano MANTÉM a OS");
    assert.equal(r.alerts, 0, "a tela NÃO é trocada pelo erro");
  });
});

// =============================== GB. Gate do botão × os 13 papéis do catálogo EXECUTADO (A11, A12) ===============================

const roles = Object.entries(ROLE_PERMISSIONS as Record<string, readonly string[]>);

function assertCatalogSeen() {
  // Denominador: o catálogo foi executado e tem papéis dos DOIS lados do gate — um laço vazio passaria sem olhar nada.
  assert.ok(roles.length >= 9, `papéis no catálogo: ${roles.length}`);
  assert.ok(roles.some(([, perms]) => perms.includes("work_orders:create")), "há papel COM work_orders:create");
  assert.ok(roles.some(([, perms]) => !perms.includes("work_orders:create")), "há papel SEM work_orders:create");
}

test("[GB1] 'Nova OS' do cabeçalho presente SSE o papel tem work_orders:create — para CADA papel de ROLE_PERMISSIONS (lista com 3 OS)", async () => {
  assertCatalogSeen();
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  const wrong: string[] = [];
  for (const [role, perms] of roles) {
    await withPage(
      () => mountList(perms, role),
      async (page) => {
        const r = read(page.container);
        const expected = perms.includes("work_orders:create") ? 1 : 0;
        if (r.headerNovaOs !== expected || r.novaOs !== expected) wrong.push(`${role}: create=${expected ? "sim" : "não"} 'Nova OS' cabeçalho=${r.headerNovaOs} total=${r.novaOs}`);
      },
    );
  }
  assert.deepEqual(wrong, [], `papéis cujo cabeçalho diverge da régua da rota POST /work-orders (work_orders:create, includes estrito):\n${wrong.join("\n")}`);
});

test("[GB2] no VAZIO, total de 'Nova OS' (cabeçalho + CTA) = 2 com work_orders:create e 0 sem — para CADA papel do catálogo", async () => {
  assertCatalogSeen();
  installFetch(LIST_ROUTES);
  listScenario = "200vazio";
  const wrong: string[] = [];
  for (const [role, perms] of roles) {
    await withPage(
      () => mountList(perms, role),
      async (page) => {
        const r = read(page.container);
        const expected = perms.includes("work_orders:create") ? 2 : 0;
        if (r.novaOs !== expected) wrong.push(`${role}: create=${expected ? "sim" : "não"} 'Nova OS'=${r.novaOs} (esperado ${expected})`);
      },
    );
  }
  assert.deepEqual(wrong, [], `papéis divergentes no vazio:\n${wrong.join("\n")}`);
});

test("[GB3] 'Atribuir técnico' (gate field_dispatch:create) continua certo papel a papel: 3 botões com a permissão, 0 sem", async () => {
  assertCatalogSeen();
  installFetch(LIST_ROUTES);
  listScenario = "200x3";
  const wrong: string[] = [];
  for (const [role, perms] of roles) {
    await withPage(
      () => mountList(perms, role),
      async (page) => {
        const r = read(page.container);
        const expected = perms.includes("field_dispatch:create") ? 3 : 0;
        if (r.atribuir !== expected) wrong.push(`${role}: dispatch=${expected ? "sim" : "não"} 'Atribuir'=${r.atribuir}`);
      },
    );
  }
  assert.deepEqual(wrong, [], `papéis divergentes no 'Atribuir':\n${wrong.join("\n")}`);
});
