import assert from "node:assert/strict";
import test, { after } from "node:test";

// B-USERS-ACESSO-SEG (T1 · Emenda 6, item 2, e 6.1, E6-R01 a E6-R04) — a troca de organização para um destino onde o par
// usuário-organização está MARCADO (senha provisória) leva à troca de senha, de ponta a ponta: o `App` real na seleção de
// organização, o clique real na organização, `POST /auth/active-tenant` dublado pelo contrato do backend (F2 do #527:
// `must_change_password` da organização de DESTINO, `auth.routes.ts:498` em `a5b56555`) e a tela de troca no fim.
// Regra (E6-R01): na resposta da troca, restrita SÓ com `must_change_password === true`; sem o campo ou com `false`, sessão
// normal (a falha fechada `!== false` é só do login, RQ-1). Arnês de DOM mínimo de `context-selection-page-live.test.tsx`
// (o mesmo de `troca-senha-live.test.tsx`).
process.env.VITE_USE_MOCKS = "false";
process.env.VITE_API_BASE_URL = "/api/v1";

process.env.VITE_API_BASE_URL = "/api/v1";

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

// =============================== Instalação: DOM primeiro, módulos depois ===============================

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, useLocation } = await import("react-router-dom");
const { App } = await import("../src/App");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { ChangePasswordView, useChangePasswordForm } = await import("../src/pages/ChangePasswordPage");
const { getStoredAuthSession, setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { appearanceStorageKey, readScreenAppearance } = await import("../src/modules/appearance");
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

// =============================== Dublês pelo contrato ===============================

const EMAIL = "maria.souza@guinchoexemplo.com.br";
const CURRENT = "Provis0ria-teste-T1";
const NEXT = "Nova-senha-teste-T1";
const SERVER_TEXT = "RAW-SERVER-TEXT";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Route = (init?: RequestInit) => Response | Promise<Response>;
let calls: string[] = [];

/** O backend dublado: rota prevista responde pelo contrato; toda outra recusa a sessão restrita, como o portão real. */
function stubFetch(routes: Record<string, Route>) {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^.*\/api\/v1/, "").replace(/\?.*$/, "");
    const key = `${init?.method ?? "GET"} ${path}`;
    calls.push(key);
    const route = routes[key];
    if (route) return route(init);
    return json(403, { error: { code: "FORBIDDEN", reason: "password_change_required", message: `Password change is required. ${SERVER_TEXT}` } });
  }) as typeof fetch;
}

function loginPayload(mustChangePassword: boolean) {
  return {
    data: {
      authenticated: true,
      access_token: "tok-login",
      token_type: "Bearer",
      expires_in: 900,
      refresh_token: "ref-login",
      refresh_expires_at: new Date(Date.now() + 3600e3).toISOString(),
      session_id: "s-login",
      user: { id: "u-maria", tenant_id: "org-um", email: EMAIL, name: "Maria Souza", status: "active" },
      tenant: { id: "org-um", name: "Guincho Exemplo" },
      roles: mustChangePassword ? [] : [{ id: "r1", key: "manager", name: "Gestor" }],
      permissions: mustChangePassword ? [] : ["dashboard:read", "work_orders:read"],
      must_change_password: mustChangePassword,
    },
  };
}

function restrictedSession(overrides: Record<string, unknown> = {}) {
  return {
    ...mockSession,
    provider: "local-jwt" as const,
    accessToken: "tok-restrito",
    refreshToken: "ref-restrito",
    tenant: { id: "org-um", name: "Guincho Exemplo" },
    user: { ...mockSession.user, id: "u-maria", email: EMAIL, name: "Maria Souza", roles: [], backendRoles: [], permissions: [] },
    mustChangePassword: true,
    ...overrides,
  };
}

const passwordError = (status: number, code: string, reason?: string) => () =>
  json(status, { error: { code, ...(reason ? { reason } : {}), message: `Server says no. ${SERVER_TEXT}` } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// =============================== Arnês ===============================

function LocationProbe() {
  const loc = useLocation();
  return h("span", { "data-path": loc.pathname, "data-probe": "" });
}

type Mounted = {
  readonly container: MiniElement;
  readonly path: () => string | null;
  readonly html: () => string;
};

async function withRoot(tree: unknown, run: (mounted: Mounted) => Promise<void>) {
  consoleErrors.length = 0;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  let ok = false;
  try {
    await act(async () => {
      root.render(tree as Parameters<typeof root.render>[0]);
    });
    await settle();
    await run({
      container,
      path: () => elements(container, (el) => el.hasAttribute("data-probe"))[0]?.getAttribute("data-path") ?? null,
      html: () => serialize(container),
    });
    ok = true;
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
    const stored = [...dom.storage.values()].join("\n");
    dom.storage.clear();
    if (ok) {
      assert.equal(stored.includes(CURRENT) || stored.includes(NEXT), false, "nenhuma senha de teste no armazenamento do navegador");
      const errors = consoleErrors.splice(0);
      assert.deepEqual(errors, [], "nenhum console.error do React/da página durante o caso");
    } else {
      consoleErrors.length = 0;
    }
  }
}

const withApp = (initialPath: string, run: (mounted: Mounted) => Promise<void>) =>
  withRoot(h(MemoryRouter, { initialEntries: [initialPath] }, h(App), h(LocationProbe)), run);

type Appearance = "A" | "B" | "C";

function Harness({ appearance }: { readonly appearance: Appearance }) {
  const model = useChangePasswordForm(EMAIL, appearance);
  return h(ChangePasswordView, { appearance, model });
}

const withView = (appearance: Appearance, run: (mounted: Mounted) => Promise<void>) =>
  withRoot(h(MemoryRouter, { initialEntries: ["/change-password"] }, h(AuthProvider, null, h(Harness, { appearance })), h(LocationProbe)), run);

function propsOf(el: MiniElement): Record<string, unknown> {
  const key = Object.keys(el).find((candidate) => candidate.startsWith("__reactProps$"));
  assert.ok(key, `__reactProps$ ausente em <${el.localName}>`);
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

/**
 * Atributo ou propriedade: no `<input>` o React 19 põe `name` e `type` como PROPRIEDADE do elemento, e grava alguns
 * atributos com a grafia do JSX (`autoComplete`, `readOnly`); o HTML não diferencia maiúsculas, então a leitura também não.
 */
function read(el: MiniElement, key: string): string | null {
  for (const [name, value] of el.attributes) if (name.toLowerCase() === key.toLowerCase()) return value;
  const property = (el as unknown as Record<string, unknown>)[key];
  return typeof property === "string" ? property : null;
}

const byName = (root: MiniNode, name: string) => elements(root, (el) => el.localName === "input" && read(el, "name") === name)[0];
const byAttr = (root: MiniNode, attr: string, value?: string) =>
  elements(root, (el) => read(el, attr) !== null && (value === undefined || read(el, attr) === value))[0];
const buttonLabeled = (root: MiniNode, label: string) =>
  elements(root, (el) => el.localName === "button" && (text(el).trim() === label || el.getAttribute("aria-label") === label))[0];

async function typeInto(input: MiniElement | undefined, value: string) {
  assert.ok(input, "campo ausente");
  await act(async () => {
    (propsOf(input).onChange as (event: unknown) => void)({ target: { value }, currentTarget: { value } });
  });
}

async function submit(root: MiniNode) {
  const form = elements(root, (el) => el.localName === "form")[0];
  assert.ok(form, "formulário ausente");
  await act(async () => {
    (propsOf(form).onSubmit as (event: unknown) => void)({ preventDefault() {} });
  });
  await settle();
}

async function click(button: MiniElement | undefined) {
  assert.ok(button, "botão ausente");
  await act(async () => {
    (propsOf(button).onClick as (event: unknown) => void)({ preventDefault() {}, stopPropagation() {} });
  });
  await settle();
}

/** Preenche e envia; na C, passa antes pela etapa 1 ("Continuar"). */
async function fillAndSubmit(root: MiniNode, appearance: Appearance, values: { current: string; next: string; confirm: string }) {
  await typeInto(byName(root, "current"), values.current);
  if (appearance === "C") await submit(root);
  await typeInto(byName(root, "next"), values.next);
  await typeInto(byName(root, "confirm"), values.confirm);
  await submit(root);
}

/** O rótulo (`label.ui-field`) e o botão "Mostrar senha" do `PasswordInput` em volta do campo. */
function fieldOf(input: MiniElement): { readonly label: MiniElement | undefined; readonly toggle: MiniElement | undefined } {
  const wrapper = input.parentNode as MiniElement | null;
  const label = wrapper?.parentNode as MiniElement | null;
  const toggle = wrapper ? elements(wrapper, (el) => el.localName === "button")[0] : undefined;
  return { label: label ?? undefined, toggle };
}

const banner = (root: MiniNode) => elements(root, (el) => el.getAttribute("role") === "alert")[0];

// =============================== Troca de organização (Emenda 6, item 2) ===============================

function fullSessionInOrgOne() {
  const { mustChangePassword: _omit, ...full } = restrictedSession({
    accessToken: "tok-org-um",
    refreshToken: "ref-org-um",
    user: { ...mockSession.user, id: "u-maria", email: EMAIL, name: "Maria Souza", roles: [], backendRoles: ["manager"], permissions: ["dashboard:read", "work_orders:read"] },
  });
  void _omit;
  return full;
}

function activeTenantPayload(mark: boolean | undefined) {
  return {
    data: {
      access_token: "tok-org-dois",
      token_type: "Bearer",
      expires_in: 900,
      refresh_token: "ref-org-dois",
      refresh_expires_at: new Date(Date.now() + 3600e3).toISOString(),
      session_id: "s-org-dois",
      tenant: { id: "org-dois", name: "Org Dois" },
      user: { id: "u-maria-2", name: "Maria Souza", email: EMAIL },
      ...(mark === undefined ? {} : { must_change_password: mark }),
      roles: mark === true ? [] : ["finance"],
      permissions: mark === true ? [] : ["financial_entries:read"],
    },
  };
}

function switchRoutes(mark: boolean | undefined): Record<string, Route> {
  return {
    "GET /me/tenants": () =>
      json(200, {
        data: [
          { tenant: { id: "org-um", name: "Org Um", status: "active" }, user: { id: "u-maria", roles: ["manager"], status: "active" } },
          { tenant: { id: "org-dois", name: "Org Dois", status: "active" }, user: { id: "u-maria-2", roles: ["finance"], status: "active" } },
        ],
      }),
    "POST /auth/active-tenant": () => json(200, activeTenantPayload(mark)),
  };
}

async function switchToOrgTwo(app: Mounted) {
  const orgTwo = elements(app.container, (el) => el.localName === "button" && text(el).includes("Org Dois"))[0];
  assert.ok(orgTwo, `botão da Org Dois ausente: ${app.html()}`);
  await click(orgTwo);
}

/**
 * A navegação do roteador é uma transição: enquanto a tela de destino (carregada sob demanda, `lazy`) não chega, a seleção
 * continua na tela ("Acessando…"). Espera o caminho mudar, com teto.
 */
async function waitForPathChange(app: Mounted, from: string, limitMs = 15_000) {
  const started = Date.now();
  while (app.path() === from && Date.now() - started < limitMs) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  }
}

test("[E6·2] trocar para a organização onde o par está marcado leva à troca de senha", async () => {
  stubFetch(switchRoutes(true));
  setStoredAuthSession(fullSessionInOrgOne());
  await withApp("/select-context", async (app) => {
    assert.equal(app.path(), "/select-context", "a seleção abre com a sessão inteira");
    await switchToOrgTwo(app);
    assert.equal(app.path(), "/change-password", `a troca para o destino marcado termina na troca de senha: ${app.html()}`);
    const stored = getStoredAuthSession();
    assert.equal(stored?.mustChangePassword, true, "a sessão do destino marcado é restrita");
    assert.equal(stored?.tenant?.id, "org-dois");
    assert.equal(stored?.accessToken, "tok-org-dois");
    assert.match(app.html(), /data-aparencia="A"/, "a troca de senha abre na A");
    assert.match(app.html(), />Crie sua nova senha</);
    assert.equal(text(byAttr(app.container, "data-conta")), `Entrando como ${EMAIL}`);
    // Com o token restrito só sai, além da troca, a lista de organizações que a seleção pede de novo quando a sessão muda
    // (efeito da `ContextSelectionPage`, fora do PERMITIDO; o backend a recusa com 403). Nenhuma outra rota.
    assert.deepEqual([...new Set(calls)], ["GET /me/tenants", "POST /auth/active-tenant"], "nada além da troca e da lista de organizações");
    assert.equal(dom.win.localStorage.getItem("erp-techsolutions.active-context"), null, "a organização marcada não vira contexto ativo");
  });
});

for (const [name, mark] of [
  ["sem o campo", undefined],
  ["com false", false],
] as const) {
  test(`[E6·2] regressão (E6-R02): troca ${name} dá sessão normal e segue para a primeira tela do perfil`, async () => {
    stubFetch(switchRoutes(mark));
    setStoredAuthSession(fullSessionInOrgOne());
    await withApp("/select-context", async (app) => {
      await switchToOrgTwo(app);
      await waitForPathChange(app, "/select-context");
      const stored = getStoredAuthSession();
      assert.notEqual(stored?.mustChangePassword, true, "sessão normal: não é restrita");
      assert.equal(stored?.mustChangePassword, false, "o campo da sessão nova é `false`, não herdado da anterior");
      assert.equal(stored?.tenant?.id, "org-dois");
      assert.equal(app.path(), "/finance", "segue para a primeira tela do perfil (financial_entries:read)");
      assert.deepEqual(JSON.parse(dom.win.localStorage.getItem("erp-techsolutions.active-context") ?? "null")?.tenantId, "org-dois");
    });
  });
}
