import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-MARCA-LOGIN-SIDEBAR (fatia L) — o login novo montado DE VERDADE: o `App` real (rotas, provedores e portões) num
// MemoryRouter, com o DOM mínimo do repositório (`tests/helpers/mini-dom.ts`) e o backend dublado pelo CONTRATO do
// login (molde: `troca-senha-live.test.tsx`). A lógica da tela (linhas 14 a 64 de hoje) não muda; estes testes provam isso.
//   T-L4  o olho: "Mostrar senha" troca o campo para texto e vira "Ocultar senha";
//   T-L6  aviso de senha alterada: role="status" e data-aviso="senha-alterada";
//   T-L7  aviso de sessão expirada: role="alert" e data-aviso="sessao-expirada";
//   T-L8  erro: quando o signIn falha, a mensagem aparece com role="alert", e os avisos somem;
//   T-L9  fluxo: 1 chamada com organização, e-mail e senha; provisória → /change-password; plataforma → /platform/tenants;
//         os demais → /select-context;
//   T-L10 carregando: botão desabilitado, "Entrando…" e aria-busy;
//   T-L11 "Esqueci minha senha" é botão; abre o recado com role="status"; não navega e não chama o login.
process.env.VITE_USE_MOCKS = "false";
process.env.VITE_API_BASE_URL = "/api/v1";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, useLocation } = await import("react-router-dom");
const { App } = await import("../src/App");
const { getStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { PASSWORD_CHANGED_NOTICE, PASSWORD_CHANGE_MESSAGES } = await import("../src/modules/auth/auth.adapter");

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
      await new Promise((done) => setTimeout(done, 0));
    });
  }
};

// =============================== O backend dublado pelo contrato ===============================

const EMAIL = "operacao@exemplo.com.br";
const PASSWORD = "Senha-de-teste-L";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Call = { readonly key: string; readonly body: unknown };
let calls: Call[] = [];

function stubFetch(routes: Record<string, () => Response | Promise<Response>>) {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^.*\/api\/v1/, "").replace(/\?.*$/, "");
    const key = `${init?.method ?? "GET"} ${path}`;
    calls.push({ key, body: typeof init?.body === "string" ? JSON.parse(init.body) : null });
    const route = routes[key];
    if (route) return route();
    return json(200, { data: [] });
  }) as typeof fetch;
}

function loginPayload(kind: "provisoria" | "plataforma" | "organizacao") {
  return {
    data: {
      authenticated: true,
      access_token: "tok-login",
      token_type: "Bearer",
      expires_in: 900,
      refresh_token: "ref-login",
      refresh_expires_at: new Date(Date.now() + 3600e3).toISOString(),
      session_id: "s-login",
      user: { id: "u-login", tenant_id: "org-um", email: EMAIL, name: "Pessoa de Teste", status: "active" },
      tenant: { id: "org-um", name: "Organização de Teste" },
      roles: kind === "provisoria" ? [] : [{ id: "r1", key: kind === "plataforma" ? "platform_admin" : "manager", name: "Papel" }],
      permissions: kind === "provisoria" ? [] : kind === "plataforma" ? ["platform:tenants:read"] : ["dashboard:read", "work_orders:read"],
      must_change_password: kind === "provisoria",
    },
  };
}

// =============================== Arnês ===============================

/** Os caminhos que chegaram à tela (efeito = render confirmado), na ordem, para provar o destino DIRETO do login. */
let committedPaths: string[] = [];

function LocationProbe() {
  const location = useLocation();
  React.useEffect(() => {
    if (committedPaths[committedPaths.length - 1] !== location.pathname) committedPaths.push(location.pathname);
  }, [location.pathname]);
  return h("span", { "data-probe": "", "data-path": location.pathname });
}

type Mounted = { readonly container: MiniDomElement; readonly path: () => string | null };
type Entry = string | { readonly pathname: string; readonly state: unknown };

async function withLogin(entry: Entry, run: (mounted: Mounted) => Promise<void>) {
  consoleErrors.length = 0;
  committedPaths = [];
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  try {
    await act(async () => {
      root.render(h(MemoryRouter, { initialEntries: [entry as never] }, h(App), h(LocationProbe)) as never);
    });
    await settle();
    await run({
      container,
      path: () => elements(container, (el) => el.hasAttribute("data-probe"))[0]?.getAttribute("data-path") ?? null,
    });
    assert.deepEqual(consoleErrors.splice(0), [], "nenhum console.error do React durante o caso");
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
    dom.storage.clear();
  }
}

/** Atributo ou propriedade (o React 19 põe `type` e `name` do <input> como propriedade). */
function read(el: MiniDomElement, key: string): string | null {
  for (const [name, value] of el.attributes) if (name.toLowerCase() === key.toLowerCase()) return value;
  const property = (el as unknown as Record<string, unknown>)[key];
  return typeof property === "string" ? property : null;
}

const byId = (root: MiniDomNode, id: string) => elements(root, (el) => el.getAttribute("id") === id)[0];
const byAttr = (root: MiniDomNode, name: string, value: string) => elements(root, (el) => el.getAttribute(name) === value)[0];
const buttonNamed = (root: MiniDomNode, name: string) =>
  elements(root, (el) => el.localName === "button" && (text(el).trim() === name || el.getAttribute("aria-label") === name))[0];

async function typeInto(input: MiniDomElement | undefined, value: string) {
  assert.ok(input, "campo ausente");
  await act(async () => {
    (propsOf(input).onChange as (event: unknown) => void)({ target: { value }, currentTarget: { value } });
  });
}

async function submit(root: MiniDomNode) {
  const form = elements(root, (el) => el.localName === "form")[0];
  assert.ok(form, "formulário ausente");
  await act(async () => {
    (propsOf(form).onSubmit as (event: unknown) => void)({ preventDefault() {} });
  });
}

async function click(button: MiniDomElement | undefined) {
  assert.ok(button, "botão ausente");
  await act(async () => {
    (propsOf(button).onClick as (event: unknown) => void)({ preventDefault() {}, stopPropagation() {} });
  });
}

const classes = (el: MiniDomElement) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).sort();

/**
 * O campo pelo rótulo EXATO, como a pessoa e o e2e (`getByLabel(…, { exact: true })`) o acham: o <label> com esse texto,
 * pelo `for` ou pelo campo dentro dele (o `PasswordInput` da biblioteca envolve o campo no rótulo).
 */
function fieldLabeled(root: MiniDomNode, name: string): MiniDomElement | undefined {
  const labels = elements(root, (el) => el.localName === "label" && text(el).trim() === name);
  assert.equal(labels.length, 1, `um rótulo "${name}"`);
  const target = labels[0].getAttribute("for");
  return target ? byId(root, target) : elements(labels[0], (el) => el.localName === "input")[0];
}

async function fillAndSubmit(root: MiniDomNode) {
  const email = fieldLabeled(root, "E-mail");
  const password = fieldLabeled(root, "Senha");
  assert.equal(email?.getAttribute("id"), "login-email", "o rótulo \"E-mail\" leva ao campo login-email");
  assert.equal(password?.getAttribute("id"), "login-password", "o rótulo \"Senha\" leva ao campo login-password");
  await typeInto(email, EMAIL);
  await typeInto(password, PASSWORD);
  await submit(root);
}

// =============================== Os casos ===============================

test("T-L4 o olho: \"Mostrar senha\" troca o campo para texto e vira \"Ocultar senha\"", async () => {
  stubFetch({});
  await withLogin("/login", async (app) => {
    const password = byId(app.container, "login-password");
    assert.ok(password, "o campo de senha existe");
    assert.equal(read(password, "type"), "password");
    await click(buttonNamed(app.container, "Mostrar senha"));
    assert.equal(read(byId(app.container, "login-password"), "type"), "text", "a senha fica visível");
    assert.ok(buttonNamed(app.container, "Ocultar senha"), "o botão vira \"Ocultar senha\"");
    assert.equal(buttonNamed(app.container, "Mostrar senha"), undefined);
    await click(buttonNamed(app.container, "Ocultar senha"));
    assert.equal(read(byId(app.container, "login-password"), "type"), "password", "e volta a esconder");
  });
});

test("T-L6 o aviso de senha alterada: role=\"status\" e data-aviso=\"senha-alterada\"", async () => {
  stubFetch({});
  await withLogin({ pathname: "/login", state: { aviso: "senha-alterada" } }, async (app) => {
    const notice = byAttr(app.container, "data-aviso", "senha-alterada");
    assert.ok(notice, `aviso ausente: ${serialize(app.container).slice(0, 400)}`);
    assert.equal(notice.getAttribute("role"), "status");
    assert.equal(text(notice), PASSWORD_CHANGED_NOTICE);
    assert.deepEqual(classes(notice), ["ps-login__faixa", "ps-login__faixa--ok"], "na faixa da marca, a de \"tudo certo\"");
    assert.equal(byAttr(app.container, "data-aviso", "sessao-expirada"), undefined);
  });
});

test("T-L7 o aviso de sessão expirada: role=\"alert\" e data-aviso=\"sessao-expirada\"", async () => {
  stubFetch({});
  await withLogin({ pathname: "/login", state: { aviso: "sessao-expirada" } }, async (app) => {
    const notice = byAttr(app.container, "data-aviso", "sessao-expirada");
    assert.ok(notice, "aviso ausente");
    assert.equal(notice.getAttribute("role"), "alert");
    assert.equal(text(notice), PASSWORD_CHANGE_MESSAGES.session_expired);
    assert.deepEqual(classes(notice), ["ps-login__faixa"], "na faixa de perigo da marca");
  });
});

test("T-L8 erro: quando o login falha, a mensagem aparece com role=\"alert\", e o aviso que havia some", async () => {
  stubFetch({ "POST /auth/login": () => json(401, { error: { code: "UNAUTHORIZED", reason: "invalid_credentials", message: "x" } }) });
  await withLogin({ pathname: "/login", state: { aviso: "senha-alterada" } }, async (app) => {
    assert.ok(byAttr(app.container, "data-aviso", "senha-alterada"), "controle: o aviso estava na tela");
    await fillAndSubmit(app.container);
    await settle();
    const alerts = elements(app.container, (el) => el.getAttribute("role") === "alert");
    assert.equal(alerts.length, 1, "uma faixa de erro");
    assert.ok(text(alerts[0]).trim().length > 0, "com a mensagem do adaptador");
    assert.equal(byAttr(app.container, "data-aviso", "senha-alterada"), undefined, "o aviso some");
    assert.equal(app.path(), "/login");
    assert.equal(getStoredAuthSession(), null, "nenhuma sessão guardada");
  });
});

test("T-L9 o fluxo: 1 chamada com organização, e-mail e senha; provisória → troca de senha; plataforma → console; os demais → seleção da organização", async () => {
  const cases = [
    { kind: "provisoria", to: "/change-password" },
    { kind: "plataforma", to: "/platform/tenants" },
    { kind: "organizacao", to: "/select-context" },
  ] as const;
  for (const scenario of cases) {
    stubFetch({ "POST /auth/login": () => json(200, loginPayload(scenario.kind)) });
    await withLogin("/login", async (app) => {
      await fillAndSubmit(app.container);
      // A navegação do roteador é uma transição: enquanto a tela de destino (carregada sob demanda) não chega, o React
      // mantém a anterior na tela. Espera o destino com teto de rodadas, em vez de contar com um número fixo.
      for (let round = 0; round < 200 && app.path() !== scenario.to; round++) await settle();
      const logins = calls.filter((call) => call.key === "POST /auth/login");
      assert.equal(logins.length, 1, `${scenario.kind}: uma chamada de login`);
      const body = logins[0].body as Record<string, unknown>;
      assert.deepEqual(Object.keys(body).sort(), ["email", "password", "tenantId"], `${scenario.kind}: organização, e-mail e senha`);
      assert.equal(body.email, EMAIL);
      assert.equal(body.password, PASSWORD);
      assert.equal(app.path(), scenario.to, `${scenario.kind}: o destino`);
      assert.deepEqual(committedPaths, ["/login", scenario.to], `${scenario.kind}: o login leva DIRETO ao destino, sem tela no meio`);
      if (scenario.kind === "provisoria") assert.deepEqual(calls.map((call) => call.key), ["POST /auth/login"], "a sessão provisória não chama outra rota");
    });
  }
});

test("T-L10 carregando: o botão fica desabilitado, diz \"Entrando…\" e tem aria-busy", async () => {
  let release: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((done) => {
    release = done;
  });
  stubFetch({ "POST /auth/login": () => pending });
  await withLogin("/login", async (app) => {
    await fillAndSubmit(app.container);
    const button = elements(app.container, (el) => el.localName === "button" && read(el, "type") === "submit")[0];
    assert.ok(button, "o botão de envio");
    assert.equal(button.hasAttribute("disabled"), true, "desabilitado enquanto entra");
    assert.equal(text(button).trim(), "Entrando…");
    assert.equal(button.getAttribute("aria-busy"), "true");
    release(json(401, { error: { code: "UNAUTHORIZED", reason: "invalid_credentials" } }));
    await settle();
    assert.equal(button.hasAttribute("disabled"), false, "volta a habilitar");
    assert.equal(text(button).trim(), "Entrar");
    assert.equal(button.getAttribute("aria-busy"), null);
  });
});

test("T-L11 \"Esqueci minha senha\" é botão; abre o recado com role=\"status\"; não navega e não chama o login", async () => {
  stubFetch({});
  await withLogin("/login", async (app) => {
    const forgot = buttonNamed(app.container, "Esqueci minha senha");
    assert.ok(forgot, "é um <button>");
    assert.equal(read(forgot, "type"), "button", "não envia o formulário");
    assert.equal(forgot.getAttribute("aria-expanded"), "false");
    const note = byId(app.container, forgot.getAttribute("aria-controls") ?? "");
    assert.ok(note, "o recado existe e o botão aponta para ele");
    assert.equal(note.hasAttribute("hidden"), true, "fechado de início");
    await click(forgot);
    assert.equal(forgot.getAttribute("aria-expanded"), "true");
    assert.equal(note.hasAttribute("hidden"), false, "o recado aparece");
    assert.equal(note.getAttribute("role"), "status");
    assert.match(text(note), /Peça ao administrador da sua organização para redefinir o seu acesso\./);
    assert.equal(app.path(), "/login", "não navega");
    assert.deepEqual(calls.filter((call) => call.key.includes("/auth/")), [], "não chama o servidor");
  });
});
