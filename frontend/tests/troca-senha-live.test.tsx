import assert from "node:assert/strict";
import test, { after } from "node:test";

// B-USERS-ACESSO-SEG (T1) — a troca de senha da sessão restrita montada DE VERDADE: o `App` real (rotas, provedores e os
// 4 portões de tela) dentro de um MemoryRouter, com o arnês de DOM mínimo de `context-selection-page-live.test.tsx`
// (zero dependência nova; DOM antes de react-dom; `window.setTimeout` colapsado; IS_REACT_ACT_ENVIRONMENT; cada caso
// desmonta e limpa o armazenamento; handlers reais chamados pelo `__reactProps$`). O backend é dublado pelo CONTRATO
// (Emenda 5): resposta do login com `must_change_password` e `user.email`, e `POST /auth/password` com o mapa de T.1.
//   W3   — sessão restrita guardada: abrir `/`, `/select-context` e `/dashboard` termina em `/change-password`.
//   W4   — o login com a provisória termina em `/change-password`.
//   W5   — o 200 apaga a sessão local e volta ao login com o aviso; 401 `invalid_credentials` mostra o texto fixo e mantém a tela.
//   W6   — as 3 aparências montam (`data-aparencia` A, B e C) com os mesmos campos e estados.
//   E4.5 — a linha "Entrando como" mostra o e-mail da sessão e nenhum outro texto.
//   E4.3 — a sessão restrita abre na A mesmo com organização velha e preferência "C" guardadas.
//   + sessão vencida, "Sair", acesso não permitido, validação local e os desvios da rota (sem sessão, sessão inteira).
process.env.VITE_USE_MOCKS = "false";
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

const banner = (root: MiniNode) => elements(root, (el) => el.getAttribute("role") === "alert")[0];

// =============================== W3 — nenhuma outra tela abre ===============================

test("[W3] sessão restrita guardada: abrir `/`, `/select-context` e `/dashboard` termina em /change-password", async () => {
  for (const start of ["/", "/select-context", "/dashboard"]) {
    stubFetch({});
    setStoredAuthSession(restrictedSession());
    await withApp(start, async (app) => {
      assert.equal(app.path(), "/change-password", `abrindo ${start}`);
      assert.match(app.html(), /data-aparencia="A"/);
      assert.match(app.html(), />Crie sua nova senha</);
      assert.doesNotMatch(serialize(byAttr(app.container, "data-aparencia")), /change-password/, "o caminho da rota não aparece na tela (§11.2)");
    });
  }
});

// =============================== W4 — o desvio do login ===============================

test("[W4] o login com a provisória termina em /change-password, sem chamar outra rota com o token restrito", async () => {
  stubFetch({ "POST /auth/login": () => json(200, loginPayload(true)) });
  await withApp("/login", async (app) => {
    await typeInto(byAttr(app.container, "type", "email"), EMAIL);
    await typeInto(byAttr(app.container, "type", "password"), CURRENT);
    await submit(app.container);
    assert.equal(app.path(), "/change-password");
    assert.equal(getStoredAuthSession()?.mustChangePassword, true);
    assert.deepEqual(calls, ["POST /auth/login"]);
  });
});

test("[W4] o login com a senha de sempre segue para a seleção de organização (regressão)", async () => {
  stubFetch({ "POST /auth/login": () => json(200, loginPayload(false)), "GET /me/tenants": () => json(200, { data: [] }) });
  await withApp("/login", async (app) => {
    await typeInto(byAttr(app.container, "type", "email"), EMAIL);
    await typeInto(byAttr(app.container, "type", "password"), CURRENT);
    await submit(app.container);
    assert.equal(app.path(), "/select-context");
    assert.equal(getStoredAuthSession()?.mustChangePassword, false);
  });
});

// =============================== W5 — o fim da troca ===============================

test("[W5] o 200 apaga a sessão local e volta ao login com o aviso de senha alterada", async () => {
  stubFetch({ "POST /auth/password": () => json(200, { data: { changed: true, revoked_sessions: 2, unlinked: false } }) });
  setStoredAuthSession(restrictedSession());
  await withApp("/change-password", async (app) => {
    await fillAndSubmit(app.container, "A", { current: CURRENT, next: NEXT, confirm: NEXT });
    assert.equal(app.path(), "/login");
    assert.equal(getStoredAuthSession(), null, "a sessão local some (o backend revogou todas as do par)");
    const notice = byAttr(app.container, "data-aviso", "senha-alterada");
    assert.ok(notice, `aviso ausente: ${app.html()}`);
    assert.equal(notice.getAttribute("role"), "status");
    assert.equal(text(notice), "Senha alterada. Entre com a nova senha.");
    assert.deepEqual(calls, ["POST /auth/password"]);
  });
});

test("[W5] 401 invalid_credentials mostra o texto fixo, mantém a tela e marca a provisória vazia", async () => {
  stubFetch({ "POST /auth/password": passwordError(401, "UNAUTHORIZED", "invalid_credentials") });
  setStoredAuthSession(restrictedSession());
  await withApp("/change-password", async (app) => {
    await fillAndSubmit(app.container, "A", { current: CURRENT, next: NEXT, confirm: NEXT });
    assert.equal(app.path(), "/change-password");
    assert.equal(text(banner(app.container)), "A senha provisória não confere.");
    assert.equal(byName(app.container, "current").value, "", "a provisória fica vazia");
    assert.equal(byName(app.container, "current").getAttribute("aria-invalid"), "true", "e marcada");
    assert.equal(byName(app.container, "next").value, NEXT, "a nova senha digitada fica");
    assert.equal(getStoredAuthSession()?.accessToken, "tok-restrito", "a sessão continua");
    assert.doesNotMatch(app.html(), new RegExp(SERVER_TEXT), "a mensagem do servidor nunca aparece");
    assert.deepEqual(calls, ["POST /auth/password"], "uma tentativa = uma requisição (RQ-6)");

    await typeInto(byName(app.container, "current"), "x");
    assert.equal(byName(app.container, "current").getAttribute("aria-invalid"), null, "digitar tira a marca");
  });
});

test("[T.1] sessão vencida (401 sem invalid_credentials) volta ao login com o aviso, encerra a sessão e não tenta refresh", async () => {
  for (const respond of [passwordError(401, "INVALID_TOKEN"), passwordError(401, "UNAUTHORIZED", "jwt_required")]) {
    stubFetch({ "POST /auth/password": respond, "POST /auth/logout": () => json(200, { data: { ok: true } }) });
    setStoredAuthSession(restrictedSession());
    await withApp("/change-password", async (app) => {
      await fillAndSubmit(app.container, "A", { current: CURRENT, next: NEXT, confirm: NEXT });
      assert.equal(app.path(), "/login");
      assert.equal(getStoredAuthSession(), null);
      const notice = byAttr(app.container, "data-aviso", "sessao-expirada");
      assert.ok(notice, `aviso ausente: ${app.html()}`);
      assert.equal(notice.getAttribute("role"), "alert");
      assert.equal(text(notice), "Sua sessão expirou. Entre de novo com a senha provisória.");
      assert.deepEqual(calls, ["POST /auth/password", "POST /auth/logout"], "sem /auth/refresh (RQ-6)");
    });
  }
});

test("[T.1] \"Sair\" encerra a sessão e volta ao login, sem aviso", async () => {
  stubFetch({ "POST /auth/logout": () => json(200, { data: { ok: true } }) });
  setStoredAuthSession(restrictedSession());
  await withApp("/change-password", async (app) => {
    await click(buttonLabeled(app.container, "Sair"));
    assert.equal(app.path(), "/login");
    assert.equal(getStoredAuthSession(), null);
    assert.equal(byAttr(app.container, "data-aviso"), undefined);
    assert.deepEqual(calls, ["POST /auth/logout"]);
  });
});

test("[T.1] acesso não permitido (403) trava o formulário e deixa só \"Sair\"", async () => {
  for (const [reason, message] of [
    ["user_inactive", "Seu acesso está desativado. Fale com o administrador da sua organização."],
    ["credential_unavailable", "Não foi possível trocar a senha por aqui. Fale com o administrador da sua organização."],
  ] as const) {
    stubFetch({ "POST /auth/password": passwordError(403, "FORBIDDEN", reason) });
    setStoredAuthSession(restrictedSession());
    await withApp("/change-password", async (app) => {
      await fillAndSubmit(app.container, "A", { current: CURRENT, next: NEXT, confirm: NEXT });
      assert.equal(text(banner(app.container)), message);
      for (const name of ["current", "next", "confirm"]) assert.equal(byName(app.container, name).hasAttribute("disabled"), true, `${name} travado`);
      assert.equal(buttonLabeled(app.container, "Salvar nova senha").hasAttribute("disabled"), true);
      assert.equal(buttonLabeled(app.container, "Sair").hasAttribute("disabled"), false, "\"Sair\" continua");
      await submit(app.container);
      assert.deepEqual(calls, ["POST /auth/password"], "travado não reenvia");
    });
  }
});

test("[T.1] a validação local espelha a regra e não chama o servidor", async () => {
  const cases = [
    { values: { current: CURRENT, next: "", confirm: "" }, text: "Preencha todos os campos." },
    { values: { current: CURRENT, next: "curta1", confirm: "curta1" }, text: "A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória." },
    { values: { current: CURRENT, next: ` ${EMAIL.toUpperCase()}`, confirm: ` ${EMAIL.toUpperCase()}` }, text: "A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória." },
    { values: { current: CURRENT, next: CURRENT, confirm: CURRENT }, text: "A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória." },
    { values: { current: CURRENT, next: NEXT, confirm: `${NEXT}x` }, text: "A confirmação não é igual à nova senha." },
  ];
  for (const scenario of cases) {
    stubFetch({});
    setStoredAuthSession(restrictedSession());
    await withApp("/change-password", async (app) => {
      await fillAndSubmit(app.container, "A", scenario.values);
      assert.equal(text(banner(app.container)), scenario.text, JSON.stringify(scenario.values.next));
      assert.deepEqual(calls, [], "nada vai ao servidor");
    });
  }
});

test("[T.2] a rota da troca sem sessão vai ao login; com sessão inteira, ao início", async () => {
  stubFetch({ "GET /me/tenants": () => json(200, { data: [] }) });
  await withApp("/change-password", async (app) => {
    assert.equal(app.path(), "/login");
  });
  stubFetch({ "GET /me/tenants": () => json(200, { data: [] }) });
  const { mustChangePassword: _omit, ...full } = restrictedSession();
  void _omit;
  setStoredAuthSession(full);
  await withApp("/change-password", async (app) => {
    assert.equal(app.path(), "/select-context", "sessão guardada sem o campo é inteira (RQ-1)");
  });
});

// =============================== Emenda 4 ===============================

test("[E4.5] a linha \"Entrando como\" mostra o e-mail da sessão e nenhum outro texto", async () => {
  stubFetch({});
  setStoredAuthSession(restrictedSession());
  await withApp("/change-password", async (app) => {
    const line = byAttr(app.container, "data-conta");
    assert.ok(line, "linha ausente");
    assert.equal(line.localName, "p", "texto simples, não campo nem link");
    assert.equal(text(line), `Entrando como ${EMAIL}`);
    const bold = elements(line, (el) => el.localName === "b")[0];
    assert.equal(text(bold), EMAIL);
    assert.equal(byName(app.container, "username").value, EMAIL, "o campo oculto do gerenciador de senhas leva o mesmo e-mail");
  });
});

test("[E4.3] a sessão restrita abre na A mesmo com organização velha e preferência \"C\" guardadas", async () => {
  stubFetch({});
  const staleContext = { tenantId: "org-velha", tenantName: "Org Velha", branchId: "b-1", role: "Gestor Operacional", permissions: [] };
  dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify(staleContext));
  dom.win.localStorage.setItem("techsol.aparencia.org-velha.u-maria", JSON.stringify({ "troca-senha": "C" }));
  setStoredAuthSession(restrictedSession());
  assert.equal(readScreenAppearance(appearanceStorageKey("org-velha", "u-maria"), "troca-senha"), "C", "controle: a preferência guardada é C");
  await withApp("/change-password", async (app) => {
    assert.equal(app.path(), "/change-password");
    assert.match(app.html(), /data-aparencia="A"/);
    assert.doesNotMatch(app.html(), /data-aparencia="[BC]"/);
  });
});

// =============================== W6 — as 3 aparências, mesmos campos e estados ===============================

const FIELDS = [
  { name: "current", label: "Senha provisória", autocomplete: "current-password", show: "Mostrar senha provisória" },
  { name: "next", label: "Nova senha", autocomplete: "new-password", show: "Mostrar nova senha" },
  { name: "confirm", label: "Confirme a nova senha", autocomplete: "new-password", show: "Mostrar confirmação da nova senha" },
] as const;

for (const appearance of ["A", "B", "C"] as const) {
  test(`[W6·${appearance}] a aparência ${appearance} monta com os mesmos campos, a linha do e-mail e "Sair"`, async () => {
    stubFetch({});
    setStoredAuthSession(restrictedSession());
    await withView(appearance, async (view) => {
      const root = byAttr(view.container, "data-aparencia");
      assert.equal(root?.getAttribute("data-aparencia"), appearance);
      assert.match(view.html(), />Crie sua nova senha</);
      assert.equal(text(byAttr(view.container, "data-conta")), `Entrando como ${EMAIL}`);
      for (const field of FIELDS) {
        const input = byName(view.container, field.name);
        assert.ok(input, `${appearance}: campo ${field.name} ausente`);
        assert.equal(read(input, "type"), "password");
        assert.equal(read(input, "autocomplete"), field.autocomplete);
        const label = elements(view.container, (el) => el.localName === "label" && el.getAttribute("for") === input.getAttribute("id"))[0];
        assert.equal(label ? text(label) : null, field.label, `${appearance}: rótulo de ${field.name}`);
        const show = buttonLabeled(view.container, field.show);
        assert.ok(show, `${appearance}: "${field.show}" ausente`);
        assert.equal(show.getAttribute("aria-controls"), input.getAttribute("id"));
        assert.equal(show.getAttribute("aria-pressed"), "false");
      }
      assert.ok(buttonLabeled(view.container, "Sair"));

      const show = buttonLabeled(view.container, "Mostrar senha provisória");
      await click(show);
      assert.equal(read(byName(view.container, "current"), "type"), "text", "mostrar senha");
      assert.equal(buttonLabeled(view.container, "Mostrar senha provisória").getAttribute("aria-pressed"), "true");
    });
  });

  test(`[W6·${appearance}] a aparência ${appearance} tem os mesmos estados: carregando, erro e acesso não permitido`, async () => {
    const pending = deferred<Response>();
    stubFetch({ "POST /auth/password": () => pending.promise });
    setStoredAuthSession(restrictedSession());
    await withView(appearance, async (view) => {
      await fillAndSubmit(view.container, appearance, { current: CURRENT, next: NEXT, confirm: NEXT });
      // carregando
      assert.match(view.html(), /Salvando…/);
      assert.equal(elements(view.container, (el) => el.localName === "form")[0].getAttribute("aria-busy"), "true");
      for (const field of FIELDS) assert.equal(byName(view.container, field.name).hasAttribute("disabled"), true, `${appearance}: ${field.name} travado no envio`);
      assert.equal(buttonLabeled(view.container, "Sair").hasAttribute("disabled"), true, `${appearance}: "Sair" travado no envio`);
      await submit(view.container);
      assert.deepEqual(calls, ["POST /auth/password"], `${appearance}: nada de duplo envio`);

      // erro: a provisória não confere
      pending.resolve(passwordError(401, "UNAUTHORIZED", "invalid_credentials")());
      await settle();
      assert.equal(text(banner(view.container)), "A senha provisória não confere.");
      assert.equal(byName(view.container, "current").value, "");
      assert.equal(byName(view.container, "current").getAttribute("aria-invalid"), "true");
      assert.equal(byName(view.container, "next").value, NEXT);
      if (appearance === "C") {
        assert.equal(byAttr(view.container, "data-etapa", "1").getAttribute("aria-current"), "step", "C: a etapa 1 reabre");
        assert.ok(buttonLabeled(view.container, "Continuar"));
        assert.match(view.html(), />preenchida</, "C: a etapa 2 recolhida diz que a nova senha está preenchida");
      }

      // acesso não permitido
      stubFetch({ "POST /auth/password": passwordError(403, "FORBIDDEN", "user_inactive") });
      await fillAndSubmit(view.container, appearance, { current: CURRENT, next: NEXT, confirm: NEXT });
      assert.equal(text(banner(view.container)), "Seu acesso está desativado. Fale com o administrador da sua organização.");
      for (const field of FIELDS) assert.equal(byName(view.container, field.name).hasAttribute("disabled"), true, `${appearance}: ${field.name} travado`);
      assert.equal(buttonLabeled(view.container, "Sair").hasAttribute("disabled"), false, `${appearance}: só "Sair" fica`);
      assert.doesNotMatch(view.html(), new RegExp(SERVER_TEXT));
    });
  });
}

test("[W6·B] os requisitos se marcam ao digitar e, depois de tentar salvar, o pendente vira \"não atendido\"", async () => {
  stubFetch({});
  setStoredAuthSession(restrictedSession());
  await withView("B", async (view) => {
    const status = (key: string) => byAttr(view.container, "data-req", key).getAttribute("data-status");
    assert.deepEqual(["length", "email", "current", "confirm"].map(status), ["pending", "pending", "pending", "pending"]);
    await typeInto(byName(view.container, "current"), CURRENT);
    await typeInto(byName(view.container, "next"), NEXT);
    assert.deepEqual(["length", "email", "current", "confirm"].map(status), ["met", "met", "met", "pending"]);
    await submit(view.container);
    assert.equal(status("confirm"), "unmet", "tentou: o pendente vira não atendido");
    assert.equal(text(banner(view.container)), "Preencha todos os campos.");
    assert.deepEqual(calls, []);
  });
});

test("[W6·C] \"Continuar\" sem a provisória mostra a faixa; com ela, abre a etapa 2; \"Alterar\" volta à 1", async () => {
  stubFetch({});
  setStoredAuthSession(restrictedSession());
  await withView("C", async (view) => {
    assert.equal(byAttr(view.container, "data-etapa", "1").getAttribute("aria-current"), "step", "abre na etapa 1");
    await submit(view.container);
    assert.equal(text(banner(view.container)), "Preencha todos os campos.");
    assert.equal(byName(view.container, "current").getAttribute("aria-invalid"), "true");
    await typeInto(byName(view.container, "current"), CURRENT);
    await submit(view.container);
    assert.equal(byAttr(view.container, "data-etapa", "2").getAttribute("aria-current"), "step");
    assert.equal(banner(view.container), undefined, "a faixa sai ao avançar");
    assert.notEqual(read(byName(view.container, "current"), "readonly"), null, "a etapa 1 vira resumo");
    assert.match(view.html(), />informada</);
    await click(buttonLabeled(view.container, "Alterar a senha provisória"));
    assert.equal(byAttr(view.container, "data-etapa", "1").getAttribute("aria-current"), "step");
    assert.equal(byName(view.container, "current").value, CURRENT, "alterar não apaga a provisória");
    assert.deepEqual(calls, []);
  });
});
