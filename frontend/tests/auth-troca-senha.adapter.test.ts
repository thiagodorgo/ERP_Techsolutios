import assert from "node:assert/strict";
import test from "node:test";

// B-USERS-ACESSO-SEG (T1) — o contrato da troca de senha da sessão restrita, do lado da web, com dublês da resposta
// (Emenda 5: o backend da F2 ainda não está no ramo; a conferência roda isto contra o backend real depois).
//   W1    — a resposta do login com `must_change_password` (RQ-1): `true` → restrita; ausente → restrita (a falha fechada
//           mora só no mapeamento do login); `false` → inteira; sessão GUARDADA sem o campo → inteira; o refresh mantém o campo.
//   W2    — cada linha do mapa de T.1 vira o texto fixo; nenhum texto tem termo técnico nem a mensagem do servidor.
//   RQ-6  — uma tentativa é UMA requisição: 401 `invalid_credentials` → 1 chamada a /auth/password e 0 a /auth/refresh
//           (com VITE_USE_MOCKS=false e sessão guardada COM refreshToken, para a mutação do cliente padrão morrer).
// Nenhuma senha de teste vai para o armazenamento: conferido no fim de cada caso que a usa.
process.env.VITE_USE_MOCKS = "false";
process.env.VITE_API_BASE_URL = "/api/v1";

type Listener = (event: Event) => void;

const store = new Map<string, string>();
const listeners = new Map<string, Set<Listener>>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: unknown) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
    addEventListener: (type: string, listener: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, listener: Listener) => void listeners.get(type)?.delete(listener),
    dispatchEvent: (event: Event) => {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  },
});

const React = await import("react");
const { renderToString } = await import("react-dom/server");
const adapter = await import("../src/modules/auth/auth.adapter");
const service = await import("../src/modules/auth/auth.service");
const authStorage = await import("../src/modules/auth/auth.storage");
const { AuthProvider, useAuth } = await import("../src/providers/AuthProvider");
const { mockSession } = await import("../src/mocks/auth/context");

const EMAIL = "maria.souza@guinchoexemplo.com.br";
const CURRENT = "Provis0ria-teste-T1";
const NEXT = "Nova-senha-teste-T1";

type Call = { readonly method: string; readonly path: string; readonly authorization: string | null; readonly body: unknown };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Dublê do `fetch`: registra cada chamada e responde pelo caminho. */
function stubFetch(routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^.*\/api\/v1/, "");
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    calls.push({
      method: init?.method ?? "GET",
      path,
      authorization: headers.get("Authorization"),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    });
    const route = routes[`${init?.method ?? "GET"} ${path}`];
    if (!route) return json(404, { error: { code: "NOT_FOUND", message: `no stub for ${path}` } });
    return route(init);
  }) as typeof fetch;
  return calls;
}

function loginPayload(extra: Record<string, unknown> = {}) {
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
      roles: [],
      permissions: [],
      ...extra,
    },
  };
}

async function loginWith(extra: Record<string, unknown> | null) {
  stubFetch({ "POST /auth/login": () => json(200, extra === null ? loginPayload() : loginPayload(extra)) });
  return adapter.loginWithJwt({ tenantId: "", email: EMAIL, password: CURRENT });
}

function restrictedStoredSession(overrides: Record<string, unknown> = {}) {
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

/** Lê o que o AuthProvider expõe para a sessão guardada (renderização no servidor, sem DOM). */
function authFlagsForStored(): { isAuthenticated: boolean; passwordChangeRequired: boolean } {
  let flags = { isAuthenticated: false, passwordChangeRequired: false };
  function Probe() {
    const auth = useAuth();
    flags = { isAuthenticated: auth.isAuthenticated, passwordChangeRequired: auth.passwordChangeRequired };
    return null;
  }
  renderToString(React.createElement(AuthProvider, null, React.createElement(Probe)));
  return flags;
}

function assertNoSecretInStorage() {
  const everything = [...store.values()].join("\n");
  assert.equal(everything.includes(CURRENT), false, "a senha provisória de teste não pode ir para o armazenamento");
  assert.equal(everything.includes(NEXT), false, "a senha nova de teste não pode ir para o armazenamento");
}

// =============================== W1 — RQ-1 ===============================

test("[W1·iii] resposta do login com must_change_password:true → sessão restrita", async () => {
  const session = await loginWith({ must_change_password: true });
  assert.equal(session.mustChangePassword, true);
  assert.equal(session.user.email, EMAIL, "o e-mail da sessão restrita fica (linha 'Entrando como', Emenda 4)");
});

test("[W1·i] resposta do login SEM o campo → sessão restrita (falha fechada só no mapeamento do login)", async () => {
  const session = await loginWith(null);
  assert.equal(session.mustChangePassword, true);
});

test("[W1] must_change_password:false → sessão inteira; qualquer outro valor → restrita", async () => {
  assert.equal((await loginWith({ must_change_password: false })).mustChangePassword, false);
  for (const value of [null, "false", 0, "true", {}]) {
    assert.equal((await loginWith({ must_change_password: value })).mustChangePassword, true, `valor ${JSON.stringify(value)}`);
  }
});

test("[W1·ii] sessão GUARDADA sem o campo é inteira; com true é restrita; com false é inteira", () => {
  store.clear();
  const { mustChangePassword: _omit, ...withoutField } = restrictedStoredSession();
  void _omit;
  authStorage.setStoredAuthSession(withoutField);
  assert.deepEqual(authFlagsForStored(), { isAuthenticated: true, passwordChangeRequired: false }, "sem o campo = inteira (RQ-1)");

  authStorage.setStoredAuthSession(restrictedStoredSession());
  assert.deepEqual(authFlagsForStored(), { isAuthenticated: false, passwordChangeRequired: true }, "true = restrita");

  authStorage.setStoredAuthSession(restrictedStoredSession({ mustChangePassword: false }));
  assert.deepEqual(authFlagsForStored(), { isAuthenticated: true, passwordChangeRequired: false }, "false = inteira");

  authStorage.setStoredAuthSession(mockSession);
  assert.deepEqual(authFlagsForStored(), { isAuthenticated: true, passwordChangeRequired: false }, "a sessão simulada segue inteira");
  store.clear();
});

test("[W1·iv] o refresh da web só troca os tokens e mantém o campo da sessão guardada (RQ-1)", async () => {
  store.clear();
  authStorage.setStoredAuthSession(restrictedStoredSession());
  stubFetch({
    "POST /auth/refresh": () =>
      json(200, { data: { access_token: "tok-renovado", token_type: "Bearer", expires_in: 900, refresh_token: "ref-renovado", session_id: "s-r" } }),
  });
  const renewed = await service.refreshSession();
  assert.equal(renewed.accessToken, "tok-renovado");
  assert.equal(authStorage.getStoredAuthSession()?.mustChangePassword, true);
  store.clear();
});

// =============================== W2 — mapa fixo de T.1 ===============================

const SERVER_MESSAGE = "Invalid credentials. Bearer token jwt_required tenant RAW-SERVER-TEXT";

const MAP: readonly { status: number; body: Record<string, string>; failure: string; text: string }[] = [
  { status: 400, body: { code: "BAD_REQUEST", reason: "invalid_payload" }, failure: "invalid_payload", text: "Preencha todos os campos." },
  {
    status: 400,
    body: { code: "BAD_REQUEST", reason: "invalid_new_password" },
    failure: "invalid_new_password",
    text: "A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória.",
  },
  { status: 401, body: { code: "UNAUTHORIZED", reason: "invalid_credentials" }, failure: "invalid_credentials", text: "A senha provisória não confere." },
  { status: 401, body: { code: "UNAUTHORIZED", reason: "jwt_required" }, failure: "session_expired", text: "Sua sessão expirou. Entre de novo com a senha provisória." },
  { status: 401, body: { code: "INVALID_TOKEN" }, failure: "session_expired", text: "Sua sessão expirou. Entre de novo com a senha provisória." },
  {
    status: 403,
    body: { code: "FORBIDDEN", reason: "user_inactive" },
    failure: "user_inactive",
    text: "Seu acesso está desativado. Fale com o administrador da sua organização.",
  },
  {
    status: 403,
    body: { code: "FORBIDDEN", reason: "credential_unavailable" },
    failure: "credential_unavailable",
    text: "Não foi possível trocar a senha por aqui. Fale com o administrador da sua organização.",
  },
  {
    status: 423,
    body: { code: "LOCKED", reason: "account_locked" },
    failure: "account_locked",
    text: "Conta bloqueada por tentativas. Fale com o administrador da sua organização.",
  },
  { status: 500, body: { code: "INTERNAL_SERVER_ERROR" }, failure: "unavailable", text: "Não foi possível trocar a senha agora. Tente de novo." },
  { status: 503, body: { code: "SERVICE_UNAVAILABLE" }, failure: "unavailable", text: "Não foi possível trocar a senha agora. Tente de novo." },
  { status: 403, body: { code: "FORBIDDEN", reason: "forbidden" }, failure: "unavailable", text: "Não foi possível trocar a senha agora. Tente de novo." },
  { status: 429, body: { code: "RATE_LIMITED" }, failure: "unavailable", text: "Não foi possível trocar a senha agora. Tente de novo." },
];

test("[W2] cada linha do mapa vira o texto fixo, por status e motivo, sem a mensagem do servidor", async () => {
  for (const row of MAP) {
    const body = { ...row.body, message: SERVER_MESSAGE };
    assert.equal(adapter.readPasswordChangeErrorMessage(row.status, body), row.text, `${row.status} ${JSON.stringify(row.body)}`);

    stubFetch({ "POST /auth/password": () => json(row.status, { error: body }) });
    await assert.rejects(adapter.changePasswordWithJwt("tok-restrito", { currentPassword: CURRENT, newPassword: NEXT }), (error: unknown) => {
      assert.ok(error instanceof adapter.PasswordChangeError, "erro tipado");
      assert.equal(error.failure, row.failure, `classificação de ${row.status} ${JSON.stringify(row.body)}`);
      assert.equal(error.message, row.text, `texto de ${row.status} ${JSON.stringify(row.body)}`);
      assert.equal(error.message.includes("RAW-SERVER-TEXT"), false, "a mensagem do servidor nunca vai à tela");
      return true;
    });
  }
});

test("[W2] rede caída, corpo que não é JSON e tempo esgotado viram o texto genérico", async () => {
  const generic = "Não foi possível trocar a senha agora. Tente de novo.";
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  await assert.rejects(adapter.changePasswordWithJwt("tok", { currentPassword: CURRENT, newPassword: NEXT }), { failure: "unavailable", message: generic });

  stubFetch({ "POST /auth/password": () => new Response("<html>gateway</html>", { status: 502 }) });
  await assert.rejects(adapter.changePasswordWithJwt("tok", { currentPassword: CURRENT, newPassword: NEXT }), { failure: "unavailable", message: generic });

  // Prazo: o fetch só termina pelo sinal de cancelamento.
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch;
  await assert.rejects(
    adapter.changePasswordWithJwt("tok", { currentPassword: CURRENT, newPassword: NEXT }, { timeoutMs: 5 }),
    { failure: "unavailable", message: generic },
  );
  assert.equal(adapter.PASSWORD_CHANGE_TIMEOUT_MS, 30_000, "o prazo de produção");
});

test("[W2] nenhum texto da troca tem termo técnico (§3) nem vem do servidor", () => {
  const texts = [...Object.values(adapter.PASSWORD_CHANGE_MESSAGES), adapter.PASSWORD_CONFIRMATION_MISMATCH_MESSAGE, adapter.PASSWORD_CHANGED_NOTICE];
  assert.equal(texts.length, 10);
  for (const text of texts) {
    assert.doesNotMatch(text, /tenant|token|jwt|bearer|scope|payload|credential|password|invalid|session|status|\b[0-9]{3}\b/i, text);
  }
});

test("[W2] a regra local espelha o servidor: 8 caracteres, diferente do e-mail (sem maiúsculas) e da atual (exata)", () => {
  assert.deepEqual(adapter.newPasswordRuleChecks("1234567", "x", EMAIL), { longEnough: false, differsFromEmail: true, differsFromCurrent: true });
  assert.equal(adapter.newPasswordRuleChecks(`  ${EMAIL.toUpperCase()} `, "x", EMAIL).differsFromEmail, false);
  assert.equal(adapter.newPasswordRuleChecks(CURRENT, CURRENT, EMAIL).differsFromCurrent, false);
  assert.equal(adapter.newPasswordRuleChecks(CURRENT.toLowerCase(), CURRENT, EMAIL).differsFromCurrent, true, "a comparação com a atual é exata");
  assert.deepEqual(adapter.newPasswordRuleChecks(NEXT, CURRENT, EMAIL), { longEnough: true, differsFromEmail: true, differsFromCurrent: true });
});

// =============================== RQ-6 — uma tentativa = uma requisição ===============================

test("[RQ-6] 401 invalid_credentials gera exatamente 1 chamada a /auth/password e 0 a /auth/refresh", async () => {
  process.env.VITE_USE_MOCKS = "false";
  store.clear();
  authStorage.setStoredAuthSession(restrictedStoredSession());
  assert.equal(authStorage.getStoredRefreshToken(), "ref-restrito", "a sessão guardada TEM refreshToken (senão a mutação não morreria)");
  const calls = stubFetch({
    "POST /auth/password": () => json(401, { error: { code: "UNAUTHORIZED", reason: "invalid_credentials", message: "Invalid credentials." } }),
    "POST /auth/refresh": () =>
      json(200, { data: { access_token: "tok-renovado", token_type: "Bearer", expires_in: 900, refresh_token: "ref-renovado", session_id: "s-r" } }),
  });

  await assert.rejects(service.changeOwnPassword({ currentPassword: CURRENT, newPassword: NEXT }), {
    name: "PasswordChangeError",
    failure: "invalid_credentials",
    message: "A senha provisória não confere.",
  });

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.path}`),
    ["POST /auth/password"],
    "uma tentativa é uma requisição, sem refresh",
  );
  assert.equal(calls[0].authorization, "Bearer tok-restrito", "o Authorization é o da sessão guardada");
  assert.deepEqual(calls[0].body, { currentPassword: CURRENT, newPassword: NEXT }, "corpo do contrato");
  assert.equal(authStorage.getStoredAuthSession()?.accessToken, "tok-restrito", "a sessão fica: a tela continua aberta");
  assertNoSecretInStorage();
  store.clear();
});

test("[RQ-6/W5] o 200 apaga a sessão local; sem sessão guardada a troca nem sai (sessão vencida)", async () => {
  store.clear();
  authStorage.setStoredAuthSession(restrictedStoredSession());
  const calls = stubFetch({ "POST /auth/password": () => json(200, { data: { changed: true, revoked_sessions: 1, unlinked: false } }) });
  await service.changeOwnPassword({ currentPassword: CURRENT, newPassword: NEXT });
  assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), ["POST /auth/password"]);
  assert.equal(authStorage.getStoredAuthSession(), null, "o backend revogou todas as sessões do par: a local some");
  assertNoSecretInStorage();

  const none = stubFetch({});
  await assert.rejects(service.changeOwnPassword({ currentPassword: CURRENT, newPassword: NEXT }), { failure: "session_expired" });
  assert.equal(none.length, 0, "sem token não há requisição");
});
