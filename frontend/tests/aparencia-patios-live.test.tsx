import assert from "node:assert/strict";
import test, { after } from "node:test";

// B-APARENCIA-USUARIO — Pátios REAL montada com o menu de aparência REAL, no arnês de DOM mínimo do repositório
// (copiado de context-selection-page-live.test.tsx, que o herdou de work-orders-page-live.test.tsx):
// ZERO dependência nova; DOM instalado ANTES de react-dom/client; clique real pelo handler em __reactProps$.
// Prende por comportamento executado:
//   (1) sem nada guardado, Pátios abre na B (D-APARENCIA-RESPOSTAS (b));
//   (2) a escolha no menu troca a aparência da página aberta e fica guardada na chave da organização e do usuário;
//   (3) "um fetch só": o cadastro e o resumo são pedidos UMA vez cada, e trocar de aparência não pede de novo;
//   (4) B: o KPI clicável filtra a lista, o filtro aparece e sai com um clique; a linha abre o detalhe embaixo, um
//       por vez (D-PADRAO-BLOCOS-CLICAVEIS); o detalhe busca as vagas só daquele pátio;
//   (5) C: o bloco clicável filtra; o quadro de vagas mostra o pátio escolhido.
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
const { PatiosPage } = await import("../src/modules/patios/yards/pages/PatiosPage");
const { AppearanceChoices } = await import("../src/modules/appearance");
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
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

// =============================== Dados (contrato real de /yards e /patios/dashboard/summary) ===============================

const TENANT_ID = "org-aparencia";
const PERMISSIONS = ["yard:read", "yard:create", "yard:update", "impound:read"];

const YARDS = [
  { id: "yard-centro", name: "Pátio Centro", address: "Rua A, 10", capacityHint: 100, timezone: "America/Sao_Paulo", active: true },
  { id: "yard-norte", name: "Pátio Norte", address: "Rua B, 20", capacityHint: 50, timezone: "America/Sao_Paulo", active: true },
  { id: "yard-sul", name: "Pátio Sul", address: "Rua C, 30", capacityHint: 40, timezone: "America/Sao_Paulo", active: true },
  { id: "yard-velho", name: "Pátio Velho", address: "Rua D, 40", capacityHint: null, timezone: "America/Sao_Paulo", active: false },
];

const SUMMARY = {
  occupancy: [
    { yardId: "yard-centro", yardName: "Pátio Centro", totalSpots: 100, occupiedSpots: 92, freeSpots: 6, blockedSpots: 2 },
    { yardId: "yard-norte", yardName: "Pátio Norte", totalSpots: 50, occupiedSpots: 35, freeSpots: 15, blockedSpots: 0 },
    { yardId: "yard-sul", yardName: "Pátio Sul", totalSpots: 40, occupiedSpots: 8, freeSpots: 30, blockedSpots: 2 },
  ],
  totalProcesses: 140,
  processesByPhase: { RECEPTION: 5, CUSTODY: 120, RELEASE: 9, AUCTION: 4, CLOSED: 2 },
  overdueNotifications: 0,
  releaseQueueDepth: 9,
  openLots: 0,
  auctionRevenue: { currentMonthTotal: "0.00", grandTotal: "0.00", byBeneficiary: [] },
  deadlineAlerts: [],
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const calls: string[] = [];

function installFetch() {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (/^\/yards(\?|$)/.test(url)) return json(200, { data: YARDS, pagination: { limit: 100, offset: 0, total: YARDS.length } });
    if (/^\/patios\/dashboard\/summary/.test(url)) return json(200, { data: SUMMARY });
    if (/^\/yards\/[^/]+\/areas/.test(url)) return json(200, { data: { items: [{ id: "area-1", yardId: "yard-centro", parentId: null, kind: "BLOCK", kindLabel: "Quadra", name: "Quadra A", covered: false, vehicleClass: "ANY", vehicleClassLabel: "Qualquer" }] } });
    if (/^\/yards\/[^/]+\/occupancy/.test(url)) {
      return json(200, {
        data: {
          summary: { total: 2, free: 1, occupied: 1, blocked: 0 },
          items: [
            { id: "spot-1", areaId: "area-1", code: "A-01", covered: false, vehicleClass: "ANY", vehicleClassLabel: "Qualquer", status: "OCCUPIED", statusLabel: "Ocupada", currentProcessId: "proc-1" },
            { id: "spot-2", areaId: "area-1", code: "A-02", covered: false, vehicleClass: "ANY", vehicleClassLabel: "Qualquer", status: "FREE", statusLabel: "Livre", currentProcessId: null },
          ],
        },
      });
    }
    if (/^\/impound-processes/.test(url)) return json(200, { data: [], pagination: { limit: 200, offset: 0, total: 0 } });
    return json(404, { error: { message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seedSessionAndContext() {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, permissions: [...PERMISSIONS] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Organização de Teste",
      tenantStatus: "active",
      branchId: "fil-1",
      branchName: "Matriz",
      role: "Gestor Operacional",
      permissions: PERMISSIONS,
      enabledModules: ["dashboard"],
      scope: "tenant",
    }),
  );
}

const appearanceKey = () => `techsol.aparencia.${TENANT_ID}.${mockSession.user.id}`;

function propsOf(el: MiniElement): Record<string, unknown> {
  const key = Object.keys(el).find((name) => name.startsWith("__reactProps$"));
  assert.ok(key, `__reactProps$ ausente em <${el.localName}>`);
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

async function press(el: MiniElement) {
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

const byText = (root: MiniNode, tag: string, needle: string) => elements(root, (el) => el.localName === tag && text(el).includes(needle));
const pageRoot = (container: MiniNode) => elements(container, (el) => el.hasAttribute("data-aparencia"))[0];
const rows = (container: MiniNode) => elements(container, (el) => el.localName === "tr" && el.getAttribute("class") === "pat-ab-row" && el.getAttribute("aria-hidden") !== "true");
const detailRows = (container: MiniNode) => elements(container, (el) => el.localName === "tr" && el.getAttribute("class") === "pat-ab-detail-row");
const countCalls = (pattern: RegExp) => calls.filter((call) => pattern.test(call)).length;

async function mount() {
  seedSessionAndContext();
  installFetch();
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: ["/patios/patios"] },
        h(AuthProvider, null,
          h(TenantProvider, null,
            h(PermissionProvider, null, h("div", { "data-menu": "" }, h(AppearanceChoices, { onChosen: () => undefined })), h(PatiosPage))))),
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

const menuItem = (container: MiniNode, label: string) =>
  elements(container, (el) => el.getAttribute("role") === "menuitemradio" && text(el).includes(label))[0];

test("Pátios abre na B sem nada guardado; o menu marca a B como escolhida e como padrão", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "B", serialize(container).slice(0, 400));
    assert.equal(menuItem(container, "B · Analítica")?.getAttribute("aria-checked"), "true");
    assert.equal(menuItem(container, "A · Padrão")?.getAttribute("aria-checked"), "false");
    assert.match(text(menuItem(container, "B · Analítica")), /padrão/);
    assert.equal(dom.storage.has(appearanceKey()), false, "abrir não grava nada");
  } finally {
    await unmount();
  }
});

test("a escolha no menu troca a aparência da página aberta, guarda na chave da organização e do usuário, e não refaz as requisições da lista", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(countCalls(/^GET \/yards(\?|$)/), 1, `cadastro pedido uma vez: ${calls.join(" | ")}`);
    assert.equal(countCalls(/^GET \/patios\/dashboard\/summary/), 1, `resumo pedido uma vez: ${calls.join(" | ")}`);

    await press(menuItem(container, "A · Padrão"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A");
    assert.deepEqual(JSON.parse(dom.storage.get(appearanceKey()) ?? "null"), { patios: "A" });
    assert.match(text(container), /OCUPAÇÃO/);

    await press(menuItem(container, "C · Mesa de pátio"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "C");
    assert.deepEqual(JSON.parse(dom.storage.get(appearanceKey()) ?? "null"), { patios: "C" });

    await press(menuItem(container, "B · Analítica"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "B");

    assert.equal(countCalls(/^GET \/yards(\?|$)/), 1, "trocar de aparência NÃO pede o cadastro de novo");
    assert.equal(countCalls(/^GET \/patios\/dashboard\/summary/), 1, "trocar de aparência NÃO pede o resumo de novo");
  } finally {
    await unmount();
  }
});

test("B: o KPI 'Pátios em nível crítico' filtra a lista, o filtro aparece e sai com um clique", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(rows(container).length, 4, "4 pátios na lista");
    const kpi = elements(container, (el) => el.localName === "button" && (el.getAttribute("aria-label") ?? "").startsWith("Pátios em nível crítico"))[0];
    assert.ok(kpi, "KPI de crítico é um botão");
    await press(kpi);
    assert.deepEqual(rows(container).map((row) => text(row).includes("Pátio Centro")), [true], "só o Pátio Centro (92%) é crítico");
    assert.match(text(container), /Filtro: Ocupação crítica/);
    await press(elements(container, (el) => el.getAttribute("aria-label") === "Limpar filtro")[0]);
    assert.equal(rows(container).length, 4);
    assert.doesNotMatch(text(container), /Filtro: /);
  } finally {
    await unmount();
  }
});

test("B: a linha abre o detalhe embaixo dela, um por vez, e só então busca as vagas daquele pátio", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(countCalls(/\/occupancy/), 0, "a lista não busca vagas");
    const centro = rows(container).find((row) => text(row).includes("Pátio Centro"))!;
    await press(centro);
    assert.equal(detailRows(container).length, 1);
    assert.equal(centro.getAttribute("aria-expanded"), "true");
    assert.match(text(detailRows(container)[0]), /Abrir vagas/);
    assert.equal(countCalls(/^GET \/yards\/yard-centro\/occupancy/), 1, "o detalhe busca as vagas do pátio aberto");
    const dossie = elements(container, (el) => el.localName === "a" && (el.getAttribute("href") ?? "").includes("dossie=proc-1"));
    assert.equal(dossie.length, 1, "a vaga ocupada leva ao dossiê do veículo");

    const norte = rows(container).find((row) => text(row).includes("Pátio Norte"))!;
    await pressKey(norte, "Enter");
    assert.equal(detailRows(container).length, 1, "um detalhe aberto por vez");
    assert.equal(norte.getAttribute("aria-expanded"), "true");
    assert.equal(rows(container).find((row) => text(row).includes("Pátio Centro"))!.getAttribute("aria-expanded"), "false");

    await pressKey(norte, " ");
    assert.equal(detailRows(container).length, 0, "Espaço fecha o detalhe aberto");
  } finally {
    await unmount();
  }
});

test("C: o bloco 'Com vagas bloqueadas' filtra a lista e o quadro mostra as vagas do pátio escolhido", async () => {
  const { container, unmount } = await mount();
  try {
    await press(menuItem(container, "C · Mesa de pátio"));
    const bloco = elements(container, (el) => el.localName === "button" && (el.getAttribute("aria-label") ?? "").startsWith("Com vagas bloqueadas"))[0];
    assert.ok(bloco);
    await press(bloco);
    assert.equal(bloco.getAttribute("aria-pressed"), "true");
    assert.deepEqual(
      rows(container).map((row) => text(row).replace(/\s+/g, " ").split("Pátio ")[1]?.split(/[0-9]/)[0]?.trim()),
      ["Centro", "Sul"],
      "só os pátios com vaga bloqueada",
    );
    const sul = rows(container).find((row) => text(row).includes("Pátio Sul"))!;
    await press(sul);
    assert.equal(sul.getAttribute("aria-current"), "true");
    assert.match(text(container), /Vagas · Pátio Sul/);
    assert.equal(countCalls(/^GET \/yards\/yard-sul\/occupancy/), 1);
  } finally {
    await unmount();
  }
});
