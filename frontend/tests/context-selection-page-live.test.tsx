import assert from "node:assert/strict";
import test, { after } from "node:test";

// B-DASH-PERFIL (ciclo 3) — ContextSelectionPage REAL montada com o arnês de DOM mínimo do repositório
// (mesmo padrão de work-orders-page-live.test.tsx, do commit 35107f60 / B-SAN3-01b):
//   (a) ZERO dependência nova — DOM mínimo embutido no próprio arquivo;
//   (b) DOM mínimo instalado ANTES de qualquer import de react-dom/client;
//   (c) globalThis.navigator só definido se ausente;
//   (d) window.setTimeout colapsado para 0 ms para não esperar os 250 ms de listAvailableContexts;
//   (e) IS_REACT_ACT_ENVIRONMENT = true;
//   (f) cada caso desmonta a raiz (root.unmount() dentro de act) e limpa o localStorage;
//   (g) clique real no botão <button> da organização via handler registrado em __reactProps$...
// Prende por comportamento executado a navegação pós-troca (M3b), a gravação de permissions no activeContext (M3c),
// o bloqueio quando landing === null (M3e) e a troca de sessão (M1a).
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

// =============================== Instalação: DOM primeiro, módulos depois (b) ===============================

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route, useLocation } = await import("react-router-dom");
const { ContextSelectionPage } = await import("../src/pages/ContextSelectionPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { getStoredAuthSession, setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") {
    throw new Error("React.act ausente: o build de produção do React não exporta `act`");
  }
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

// =============================== Arnês da ContextSelectionPage ===============================

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function LocationProbe() {
  const loc = useLocation();
  return h("span", { "data-path": loc.pathname, "data-probe": "" });
}

type ScenarioConfig = {
  readonly sessionPermissions?: readonly string[];
  readonly activeTenantPermissions?: readonly string[];
  readonly activeTenantRole?: string;
  readonly targetButtonText: string;
};

type ScenarioResult = {
  readonly path: string | null;
  readonly calls: readonly string[];
  readonly html: string;
  readonly storedSession: ReturnType<typeof getStoredAuthSession>;
  readonly activeContext: { readonly tenantId?: string; readonly permissions?: readonly string[] } | null;
};

async function runActivationScenario(config: ScenarioConfig): Promise<ScenarioResult> {
  consoleErrors.length = 0;
  dom.storage.clear();
  dom.intervals.length = 0;
  const calls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url.replace(/^.*\/api\/v1/, "")}`);
    if (/\/me\/tenants(\?|$)/.test(url)) {
      return json(200, {
        data: [
          { tenant: { id: "org-um", name: "Org Um", status: "active" }, user: { id: "u1", roles: ["manager"], status: "active" } },
          { tenant: { id: "org-dois", name: "Org Dois", status: "active" }, user: { id: "u1", roles: [config.activeTenantRole ?? "finance"], status: "active" } },
        ],
      });
    }
    if (/\/auth\/active-tenant$/.test(url)) {
      return json(200, {
        data: {
          accessToken: "tok-B",
          tokenType: "Bearer",
          expiresIn: 900,
          refreshToken: "r-B",
          refreshExpiresAt: new Date(Date.now() + 3600e3).toISOString(),
          sessionId: "s-B",
          tenant: { id: "org-dois", name: "Org Dois" },
          user: { id: "u1", name: "Fulana", email: "f@x.example" },
          roles: [config.activeTenantRole ?? "finance"],
          permissions: [...(config.activeTenantPermissions ?? [])],
        },
      });
    }
    throw new Error(`rota não prevista no stub de fetch: ${url}`);
  }) as typeof fetch;

  setStoredAuthSession({
    ...mockSession,
    accessToken: "tok-0",
    tenant: { id: "org-um", name: "Org Um" },
    user: {
      ...mockSession.user,
      roles: [],
      permissions: [...(config.sessionPermissions ?? ["dashboard:read", "work_orders:create"])],
    },
  });

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  let ok = false;
  try {
    await act(async () => {
      root.render(
        h(
          MemoryRouter,
          { initialEntries: ["/select-context"] },
          h(
            AuthProvider,
            null,
            h(
              TenantProvider,
              null,
              h(
                PermissionProvider,
                null,
                h(
                  Routes,
                  null,
                  h(Route, { path: "/select-context", element: h("div", null, h(ContextSelectionPage), h(LocationProbe)) }),
                  h(Route, { path: "*", element: h(LocationProbe) }),
                ),
              ),
            ),
          ),
        ),
      );
    });
    await settle();

    const btn = elements(container, (el) => el.localName === "button" && text(el).includes(config.targetButtonText))[0];
    assert.ok(btn, `botão "${config.targetButtonText}" ausente: ${serialize(container)}`);
    const propsKey = Object.keys(btn).find((key) => key.startsWith("__reactProps$"));
    assert.ok(propsKey, `__reactProps$ ausente no botão "${config.targetButtonText}"`);
    const onClick = ((btn as unknown as Record<string, unknown>)[propsKey] as { onClick?: (ev: unknown) => void }).onClick;
    assert.equal(typeof onClick, "function", "onClick real presente no botão");

    await act(async () => {
      onClick!({ preventDefault() {}, stopPropagation() {} });
    });
    await settle();

    const probe = elements(container, (el) => el.hasAttribute("data-probe"))[0];
    const path = probe ? probe.getAttribute("data-path") : null;
    const html = serialize(container);
    const storedSession = getStoredAuthSession();
    const activeContext = JSON.parse(dom.win.localStorage.getItem("erp-techsolutions.active-context") ?? "null") as {
      readonly tenantId?: string;
      readonly permissions?: readonly string[];
    } | null;

    ok = true;
    return { path, calls, html, storedSession, activeContext };
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
    dom.storage.clear();
    if (ok) {
      const errors = consoleErrors.splice(0);
      assert.deepEqual(errors, [], "nenhum console.error do React/da página durante o caso");
    } else {
      consoleErrors.length = 0;
    }
  }
}

// =============================== Casos K1–K4 (§2.5 A) ===============================

test("[K1] troca por clique para organização com perfil Financeiro navega para /finance e grava permissões sem dashboard:read", async () => {
  const res = await runActivationScenario({
    activeTenantRole: "finance",
    activeTenantPermissions: ["financial_entries:read"],
    targetButtonText: "Org Dois",
  });

  assert.equal(res.calls.includes("POST /auth/active-tenant"), true, "chama POST /auth/active-tenant ao trocar de organização");
  assert.equal(res.path, "/finance", "deve navegar para /finance (primeira rota permitida para financial_entries:read)");
  assert.ok(res.storedSession, "sessão gravada no storage");
  assert.equal(res.storedSession.user.permissions.includes("dashboard:read"), false, "sessão nova não herda dashboard:read da anterior");
  assert.equal(res.storedSession.user.permissions.includes("financial_entries:read"), true, "sessão nova contém financial_entries:read");
  assert.ok(res.activeContext, "activeContext gravado no localStorage");
  assert.equal(res.activeContext.tenantId, "org-dois");
  assert.deepEqual(res.activeContext.permissions, res.storedSession.user.permissions, "activeContext.permissions igual às permissões da sessao nova");
});

test("[K2] troca por clique para organização com perfil Estoque navega para /inventory", async () => {
  const res = await runActivationScenario({
    activeTenantRole: "inventory",
    activeTenantPermissions: ["inventory_items:read"],
    targetButtonText: "Org Dois",
  });

  assert.equal(res.calls.includes("POST /auth/active-tenant"), true, "chama POST /auth/active-tenant ao trocar de organização");
  assert.equal(res.path, "/inventory", "deve navegar para /inventory (primeira rota permitida para inventory_items:read)");
  assert.ok(res.storedSession, "sessão gravada no storage");
  assert.equal(res.storedSession.user.permissions.includes("dashboard:read"), false, "sessão nova não herda dashboard:read da anterior");
  assert.deepEqual(res.activeContext?.permissions, res.storedSession.user.permissions, "activeContext.permissions igual às permissões da sessão nova");
});

test("[K3] troca por clique para organização cujo perfil só tem os.read permanece em /select-context e exibe erro de perfil sem telas", async () => {
  const res = await runActivationScenario({
    activeTenantRole: "custom",
    activeTenantPermissions: ["os.read"],
    targetButtonText: "Org Dois",
  });

  assert.equal(res.calls.includes("POST /auth/active-tenant"), true, "chama POST /auth/active-tenant ao tentar ativar outra organização");
  assert.equal(res.path, "/select-context", "quando resolveContextLandingRoute devolve null, permanece em /select-context");
  assert.match(res.html, /Seu perfil não possui telas associadas\./, "exibe a mensagem de erro na seleção de contexto");
  assert.equal(res.activeContext, null, "não grava activeContext quando o perfil não possui telas associadas");
});

test("[K4] ativar a própria organização da sessão navega para a primeira rota permitida sem chamar POST /auth/active-tenant", async () => {
  const res = await runActivationScenario({
    sessionPermissions: ["work_orders:read"],
    targetButtonText: "Org Um",
  });

  assert.equal(res.calls.includes("POST /auth/active-tenant"), false, "não chama POST /auth/active-tenant quando context.tenantId === session.tenant.id");
  assert.deepEqual(res.calls, ["GET /me/tenants"]);
  assert.equal(res.path, "/work-orders", "navega para /work-orders a partir das permissões da sessão atual");
  assert.ok(res.activeContext, "activeContext gravado no localStorage");
  assert.equal(res.activeContext.tenantId, "org-um");
  assert.deepEqual(res.activeContext.permissions, ["work_orders:read"], "activeContext.permissions recebe as permissões da sessão atual");
});
