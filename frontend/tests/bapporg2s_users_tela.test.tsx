import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

// B-APP-ORG-2S (S3) · a tela Usuários na web: dar acesso a um login do grupo (W1–W4, plano 1.8 §3.1, 1.8.1 §3 e §7.1,
// 1.7.2 §2.4) e redefinir senha com o diálogo da provisória (W5–W7, plano 1.8.3 §2.3 e §5.1). Mini-DOM do repositório;
// o `fetch` é o único dublê (cada chamada registrada com método, caminho e corpo cru).

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
const { UserFormModal } = await import("../src/modules/users/components/UserFormModal");
const { AccessGrantDialog } = await import("../src/modules/users/components/AccessGrantDialog");
const { ResetPasswordFlow } = await import("../src/modules/users/components/ResetPasswordFlow");
const { TemporaryPasswordDialog } = await import("../src/modules/users/components/TemporaryPasswordDialog");
const adapter = await import("../src/modules/users/users.adapter");

type User = import("../src/modules/users/users.types").User;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

// ---- o servidor de mentira ------------------------------------------------------------------------------------------
type Call = { readonly method: string; readonly url: string; readonly rawBody: string | undefined };
type Reply = { readonly status?: number; readonly body?: unknown; readonly reason?: string; readonly message?: string; readonly hold?: Promise<void> };
type Route = (call: Call) => Reply | undefined;
let calls: Call[] = [];
let routes: Route[] = [];
// Mensagem do servidor que NENHUMA tela pode ecoar (o texto cru poderia citar o outro pátio).
const SERVER_LEAK = "Patio Norte Guinchos (tenant 7f3a)";

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const call: Call = { method: init?.method ?? "GET", url: String(input), rawBody: init?.body === undefined ? undefined : String(init.body) };
  calls.push(call);
  for (const route of routes) {
    const reply = route(call);
    if (reply) {
      if (reply.hold) await reply.hold;
      const status = reply.status ?? 200;
      const body = status >= 400 ? { error: { code: "ERRO", reason: reply.reason ?? "erro", message: reply.message ?? SERVER_LEAK } } : reply.body;
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }
  }
  return new Response(JSON.stringify({ error: { code: "SEM_ROTA", reason: "sem_rota", message: call.url } }), { status: 599, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;

function serve(...list: Route[]) {
  calls = [];
  routes = list;
}
const on = (method: string, pathPart: string, reply: Reply): Route => (call) => (call.method === method && call.url.includes(pathPart) ? reply : undefined);
const writes = () => calls.filter((call) => call.method !== "GET");

let clipboardWrites: string[] = [];
Object.defineProperty(globalThis.navigator, "clipboard", {
  configurable: true,
  value: { writeText: async (value: string) => void clipboardWrites.push(value) },
});

// ---- montagem ---------------------------------------------------------------------------------------------------------
const CONTEXT = { token: "tok-y", tenantId: "ten-y", permissions: ["users.read", "users.manage"] };
const TECH: User = { id: "11111111-1111-4111-8111-111111111111", name: "Carlos Guincheiro", email: "carlos@grupo.example", roles: ["field_technician"], branchIds: [], status: "active", createdAt: "2026-11-01T12:00:00.000Z" };
const PROVISORIA = "Kx7-pQ2m-Zr9w-Lt4v-Hn8b";

type Mounted = { readonly container: MiniDomElement; readonly rerender: (element: unknown) => Promise<void>; readonly unmount: () => Promise<void> };

async function mount(element: unknown): Promise<Mounted> {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(element as Parameters<typeof root.render>[0]);
  });
  await settle();
  return {
    container,
    rerender: async (next) => {
      await act(async () => {
        root.render(next as Parameters<typeof root.render>[0]);
      });
      await settle();
    },
    unmount: async () => {
      await act(async () => root.unmount());
      container.parentNode?.removeChild(container);
    },
  };
}

const buttons = (root: MiniDomElement) => elements(root, (el) => el.localName === "button");
function button(root: MiniDomElement, label: RegExp): MiniDomElement {
  const byText = buttons(root).filter((el) => label.test(text(el)));
  const found = byText.length > 0 ? byText : buttons(root).filter((el) => label.test(el.getAttribute("aria-label") ?? ""));
  assert.equal(found.length, 1, `exatamente 1 botão ${label} (achei ${found.length}): ${text(root)}`);
  return found[0];
}
const hasButton = (root: MiniDomElement, label: RegExp) => buttons(root).some((el) => label.test(text(el)));
const input = (root: MiniDomElement, id: string) => {
  const found = elements(root, (el) => el.localName === "input" && el.getAttribute("id") === id);
  assert.equal(found.length, 1, `input #${id}`);
  return found[0];
};
// Como no navegador: clicar num botão sem tratador não faz nada (e o teste diz o que esperava ver).
async function click(el: MiniDomElement) {
  const handler = propsOf(el).onClick;
  if (typeof handler === "function") await act(async () => (handler as () => void)());
  await settle();
}
async function type(el: MiniDomElement, value: string) {
  await act(async () => (propsOf(el).onChange as (event: unknown) => void)({ currentTarget: { value }, target: { value } }));
}
async function submit(root: MiniDomElement) {
  const form = elements(root, (el) => el.localName === "form")[0];
  assert.ok(form, "formulário");
  await act(async () => (propsOf(form).onSubmit as (event: unknown) => void)({ preventDefault() {} }));
  await settle();
}
const roleCheckbox = (root: MiniDomElement) => elements(root, (el) => el.localName === "input" && propsOf(el).type === "checkbox")[0];

async function fillCreateForm(root: MiniDomElement, name: string, email: string) {
  await type(input(root, "user-field-name"), name);
  await type(input(root, "user-field-email"), email);
  await act(async () => (propsOf(roleCheckbox(root)).onChange as () => void)());
}

// =====================================================================================================================
// W1 — a recusa da criação e o botão "Dar acesso a este login neste pátio"
// =====================================================================================================================
test("W1: 409 email_in_group na criação mostra a frase fixa e o botão de dar acesso, sem revelar o outro pátio", async () => {
  serve(on("POST", "/api/v1/users", { status: 409, reason: "email_in_group" }));
  const requested: { email: string; name: string }[] = [];
  const view = await mount(
    React.createElement(UserFormModal, { user: null, context: CONTEXT, onClose: () => {}, onSaved: () => assert.fail("não salvou"), onRequestAccessGrant: (draft: { email: string; name: string }) => void requested.push({ ...draft }) }),
  );
  await fillCreateForm(view.container, "Carlos Guincheiro", "carlos@grupo.example");
  await submit(view.container);

  const shown = text(view.container);
  assert.match(shown, /Este e-mail já tem acesso no grupo\./, "W1-frase");
  assert.doesNotMatch(shown, /Patio Norte|tenant 7f3a/, "W1-sem-vazamento: a mensagem do servidor não aparece");
  await click(button(view.container, /^Dar acesso a este login neste pátio$/));
  assert.deepEqual(requested, [{ email: "carlos@grupo.example", name: "Carlos Guincheiro" }], "W1-oferta leva o e-mail e o nome da tentativa");
  await view.unmount();
});

test("W1: outros 409 da criação NÃO oferecem dar acesso; mudar o e-mail desarma a oferta", async () => {
  serve(on("POST", "/api/v1/users", { status: 409, reason: "user_email_conflict" }));
  const view = await mount(React.createElement(UserFormModal, { user: null, context: CONTEXT, onClose: () => {}, onSaved: () => {}, onRequestAccessGrant: () => {} }));
  await fillCreateForm(view.container, "Ana", "ana@grupo.example");
  await submit(view.container);
  assert.match(text(view.container), /Este e-mail já tem usuário neste pátio\./);
  assert.equal(hasButton(view.container, /Dar acesso/), false, "W1-só-email_in_group");

  serve(on("POST", "/api/v1/users", { status: 409, reason: "email_in_group" }));
  await submit(view.container);
  assert.equal(hasButton(view.container, /Dar acesso a este login neste pátio/), true);
  await type(input(view.container, "user-field-email"), "outra@grupo.example");
  await settle();
  assert.equal(hasButton(view.container, /Dar acesso/), false, "W1-desarma: a oferta vale só para o e-mail recusado");
  await view.unmount();
});

// =====================================================================================================================
// W2 — o diálogo de dar acesso e a chamada
// =====================================================================================================================
test("W2: o diálogo envia só { email, name } para /users/access-grants e mostra o carregando", async () => {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  serve(on("POST", "/api/v1/users/access-grants", { status: 201, body: { data: { id: "u-y", name: "Carlos (Pátio Y)", email: "carlos@grupo.example", roles: ["field_technician"], status: "active", createdAt: "2026-11-21T12:00:00.000Z" } }, hold }));
  const granted: (User | null)[] = [];
  const view = await mount(React.createElement(AccessGrantDialog, { email: "carlos@grupo.example", initialName: "Carlos", context: CONTEXT, onClose: () => {}, onGranted: (user: User | null) => void granted.push(user) }));

  assert.match(text(view.container), /Dar acesso a este login neste pátio/, "W2-título");
  assert.equal(input(view.container, "access-grant-email").getAttribute("value") ?? propsOf(input(view.container, "access-grant-email")).value, "carlos@grupo.example");
  assert.equal(propsOf(input(view.container, "access-grant-email")).readOnly, true, "W2: o e-mail é o da tentativa, só leitura");
  await type(input(view.container, "access-grant-name"), "Carlos (Pátio Y)");
  let submitting: Promise<void> = Promise.resolve();
  await act(async () => {
    submitting = (propsOf(elements(view.container, (el) => el.localName === "form")[0]).onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} });
  });
  await settle();
  assert.equal(hasButton(view.container, /Dando acesso…/), true, "W2-carregando");
  assert.equal(propsOf(button(view.container, /Dando acesso…/)).disabled, true);
  release();
  await settle();
  await submitting;

  assert.equal(writes().length, 1);
  assert.equal(writes()[0].url, "/api/v1/users/access-grants");
  assert.deepEqual(JSON.parse(writes()[0].rawBody ?? "null"), { email: "carlos@grupo.example", name: "Carlos (Pátio Y)" }, "W2-corpo: sem perfil, sem organização, sem senha");
  assert.equal(granted.length, 1);
  assert.equal(granted[0]?.name, "Carlos (Pátio Y)");
  await view.unmount();
});

// =====================================================================================================================
// W3 — as recusas da concessão, em PT-BR, sem termo técnico e sem o outro pátio
// =====================================================================================================================
test("W3: cada recusa da concessão tem a frase fixa; nome vazio não chama o servidor", async () => {
  const cases: [Reply, RegExp][] = [
    [{ status: 404, reason: "login_not_found_in_group" }, /^Não há login com este e-mail no grupo\.$/],
    [{ status: 409, reason: "login_ambiguous_in_group" }, /^Há mais de um login com este e-mail no grupo\. Fale com o gestor do grupo\.$/],
    [{ status: 409, reason: "user_email_conflict" }, /^Este e-mail já tem usuário neste pátio\.$/],
    [{ status: 403, reason: "forbidden" }, /^Você não tem permissão para dar acesso a usuários neste pátio\.$/],
    [{ status: 503, reason: "grant_unavailable" }, /^Não foi possível dar acesso agora\. Nada foi criado\. Tente novamente\.$/],
  ];
  for (const [reply, phrase] of cases) {
    serve(on("POST", "/api/v1/users/access-grants", reply));
    const view = await mount(React.createElement(AccessGrantDialog, { email: "carlos@grupo.example", initialName: "Carlos", context: CONTEXT, onClose: () => {}, onGranted: () => assert.fail("não concedeu") }));
    await submit(view.container);
    const alert = elements(view.container, (el) => el.getAttribute("role") === "alert")[0];
    assert.ok(alert, `W3-erro ${reply.reason}`);
    const message = elements(alert, (el) => el.localName === "p")[0];
    assert.match(text(message), phrase, `W3 ${reply.reason}`);
    assert.doesNotMatch(text(view.container), /Patio Norte|tenant 7f3a|login_|forbidden|_in_group/, `W3-sem termo técnico nem vazamento (${reply.reason})`);
    await view.unmount();
  }

  serve();
  const view = await mount(React.createElement(AccessGrantDialog, { email: "carlos@grupo.example", initialName: "", context: CONTEXT, onClose: () => {}, onGranted: () => assert.fail("não concedeu") }));
  await submit(view.container);
  assert.match(text(view.container), /Nome é obrigatório\./);
  assert.equal(writes().length, 0, "W3: sem nome, nada sai");
  await view.unmount();
});

// =====================================================================================================================
// W4 — desativar técnico de dois pátios não mostra recusa (a guarda saiu com a D1, plano 1.8.1 §2)
// =====================================================================================================================
test("W4: o módulo Usuários não tem recusa de desativação de técnico de dois pátios", () => {
  const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/modules/users");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name)) files.push(full);
    }
  };
  walk(moduleDir);
  assert.ok(files.length >= 8, `arquivos do módulo: ${files.length}`);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /deactivation_needs_group_manager|Peça ao gestor do grupo|atende mais de um pátio/, `W4 em ${path.basename(file)}`);
  }
  // E a desativação de hoje segue igual: 409 qualquer cai no aviso genérico do adapter, nunca numa recusa de grupo.
  const feedback = adapter.interpretUserSubmitError(Object.assign(new Error("Conflito de dados. Recarregue e tente novamente."), { status: 409, reason: "deactivation_needs_group_manager" }), "update");
  assert.doesNotMatch(feedback.message, /grupo/);
});

// =====================================================================================================================
// W5 — "Redefinir senha": a provisória aparece UMA vez, com copiar, e some ao fechar
// =====================================================================================================================
test("W5: redefinir chama a rota com corpo vazio, mostra a provisória uma vez, copia, e o valor some ao fechar", async () => {
  serve(on("POST", `/api/v1/auth/users/${TECH.id}/reset-password`, { body: { data: { user_id: TECH.id, temporary_password: PROVISORIA, must_change_password: true, revoked_sessions: 2, affected_patios: 1 } } }));
  clipboardWrites = [];
  const closed: string[] = [];
  const element = () => React.createElement(ResetPasswordFlow, { user: TECH, context: CONTEXT, onClose: () => void closed.push("fechou") });
  const view = await mount(element());

  assert.match(text(view.container), /Redefinir a senha de Carlos Guincheiro\?/, "W5-confirmação antes");
  assert.doesNotMatch(text(view.container), new RegExp(PROVISORIA), "W5: nada de provisória antes da confirmação");
  assert.equal(calls.length, 0, "W5: abrir não chama o servidor");
  await click(button(view.container, /^Redefinir senha$/));

  assert.equal(writes().length, 1);
  assert.equal(writes()[0].url, `/api/v1/auth/users/${TECH.id}/reset-password`);
  assert.equal(writes()[0].rawBody, undefined, "W5-corpo-vazio: o cliente não manda senha");
  const shown = text(view.container);
  assert.equal(shown.split(PROVISORIA).length - 1, 1, "W5-uma-vez: a provisória aparece exatamente 1 vez");
  assert.match(shown, /Ela aparece só agora/);

  await click(button(view.container, /Copiar/));
  assert.deepEqual(clipboardWrites, [PROVISORIA], "W5-copiar");
  assert.match(text(view.container), /Senha copiada\./);

  await click(button(view.container, /^Fechar$/));
  assert.deepEqual(closed, ["fechou"]);
  assert.doesNotMatch(text(view.container), new RegExp(PROVISORIA), "W5-some: fechou, o valor saiu da tela");
  // O mesmo fluxo, ainda montado, volta ao começo (confirmação) — o estado `revealed` foi descartado.
  await view.rerender(element());
  assert.doesNotMatch(text(view.container), new RegExp(PROVISORIA), "W5-some-da-memória: remontar não traz o valor de volta");
  assert.match(text(view.container), /Redefinir a senha de Carlos Guincheiro\?/);
  await view.unmount();
});

test("W5: clique duplo gera UMA redefinição; resposta que chega depois de fechar não reabre a provisória", async () => {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  serve(on("POST", "/reset-password", { body: { data: { user_id: TECH.id, temporary_password: PROVISORIA, must_change_password: true, revoked_sessions: 0, affected_patios: 1 } }, hold }));
  const view = await mount(React.createElement(ResetPasswordFlow, { user: TECH, context: CONTEXT, onClose: () => {} }));
  const go = button(view.container, /^Redefinir senha$/);
  await act(async () => {
    (propsOf(go).onClick as () => void)();
    (propsOf(go).onClick as () => void)();
  });
  await settle();
  assert.equal(hasButton(view.container, /Redefinindo…/), true, "W5-carregando");
  assert.equal(propsOf(button(view.container, /Redefinindo…/)).disabled, true);
  assert.equal(writes().length, 1, "W5-um-pedido");
  await click(button(view.container, /^Fechar$/)); // o X do modal fecha mesmo em voo
  release();
  await settle();
  assert.doesNotMatch(text(view.container), new RegExp(PROVISORIA), "W5-pedido-velho: a resposta tardia não aparece");
  await view.unmount();
});

// =====================================================================================================================
// W6 — os avisos do diálogo
// =====================================================================================================================
test("W6: o aviso das 24 h sempre; o aviso do grupo só quando affected_patios > 1", async () => {
  for (const [affected, group] of [[3, true], [2, true], [1, false]] as const) {
    serve(on("POST", "/reset-password", { body: { data: { user_id: TECH.id, temporary_password: PROVISORIA, must_change_password: true, revoked_sessions: 0, affected_patios: affected } } }));
    const view = await mount(React.createElement(ResetPasswordFlow, { user: TECH, context: CONTEXT, onClose: () => {} }));
    await click(button(view.container, /^Redefinir senha$/));
    const shown = text(view.container);
    assert.match(shown, /Vale por 24 horas e só serve para o técnico criar a própria senha\./, `W6-24h (${affected})`);
    assert.equal(/Esta senha vale em todos os pátios do grupo em que o técnico tem acesso\./.test(shown), group, `W6-grupo (${affected})`);
    await view.unmount();
  }
  // `affected_patios` ausente (servidor antigo): nunca afirma o grupo.
  assert.deepEqual(adapter.adaptPasswordResetResponse({ data: { temporary_password: PROVISORIA } }), { temporaryPassword: PROVISORIA, affectedPatios: 1 });
});

test("W6: a criação mostra a provisória no MESMO diálogo, sem o aviso do grupo", async () => {
  serve(on("POST", "/api/v1/users", { status: 201, body: { data: { id: "u-new", name: "Ana Nova", email: "ana@x.example", roles: ["field_technician"], status: "active", createdAt: "2026-11-21T12:00:00.000Z", temporaryPassword: PROVISORIA } } }));
  const saved: [string | undefined, string | undefined][] = [];
  const form = await mount(React.createElement(UserFormModal, { user: null, context: CONTEXT, onClose: () => {}, onSaved: (user?: User, temporaryPassword?: string) => void saved.push([user?.name, temporaryPassword]) }));
  await fillCreateForm(form.container, "Ana Nova", "ana@x.example");
  await submit(form.container);
  assert.deepEqual(saved, [["Ana Nova", PROVISORIA]], "W6-criação: a provisória chega a quem abriu o formulário");
  await form.unmount();

  // A UsersPage entrega esse valor ao TemporaryPasswordDialog (o mesmo da redefinição): provado nos testes "página:".

  const dialog = await mount(React.createElement(TemporaryPasswordDialog, { userName: "Ana Nova", temporaryPassword: PROVISORIA, onClose: () => {} }));
  assert.match(text(dialog.container), /Vale por 24 horas/);
  assert.doesNotMatch(text(dialog.container), /todos os pátios do grupo/);
  await dialog.unmount();
});

// =====================================================================================================================
// W7 — as recusas da redefinição
// =====================================================================================================================
test("W7: religação, inativo, permissão, falha e resposta sem provisória: frase fixa e nenhum diálogo de senha", async () => {
  const cases: [Reply, RegExp][] = [
    [{ status: 409, reason: "identity_linked_elsewhere" }, /^Este técnico tem conta ligada a outra organização\. Só ele pode trocar a senha\.$/],
    [{ status: 409, reason: "user_inactive" }, /^Este usuário está inativo neste pátio\. Reative o acesso antes de redefinir a senha\.$/],
    [{ status: 403, reason: "forbidden" }, /^Você não tem permissão para redefinir senhas neste pátio\.$/],
    [{ status: 403, reason: "target_not_manageable" }, /^A senha deste usuário não pode ser redefinida por este pátio\.$/],
    [{ status: 503, reason: "reset_unavailable" }, /^Não foi possível redefinir a senha agora\. Nada foi alterado\. Tente novamente\.$/],
    [{ status: 200, body: { data: { user_id: TECH.id, must_change_password: true } } }, /^Não foi possível redefinir a senha agora\. Nada foi alterado\. Tente novamente\.$/],
  ];
  for (const [reply, phrase] of cases) {
    serve(on("POST", "/reset-password", reply));
    const view = await mount(React.createElement(ResetPasswordFlow, { user: TECH, context: CONTEXT, onClose: () => {} }));
    await click(button(view.container, /^Redefinir senha$/));
    const alert = elements(view.container, (el) => el.getAttribute("role") === "alert")[0];
    assert.ok(alert, `W7-erro ${reply.reason ?? "sem provisória"}`);
    assert.match(text(elements(alert, (el) => el.localName === "p")[0]), phrase, `W7 ${reply.reason ?? "sem provisória"}`);
    assert.doesNotMatch(text(view.container), /Senha provisória|Patio Norte|tenant 7f3a|identity_|_inactive|reset_/, `W7-sem diálogo, sem termo técnico (${reply.reason})`);
    assert.equal(hasButton(view.container, /^Redefinir senha$/), true, "W7: dá para tentar de novo");
    await view.unmount();
  }
});

// =====================================================================================================================
// W-BTN — o gatilho (Emenda 1.8.3.4): "Redefinir senha" no diálogo "Editar usuário", nunca no "Novo usuário"
// =====================================================================================================================
test("W-BTN: no modo de edição o botão aparece e abre o fluxo; no modo de criação ele não aparece", async () => {
  serve(on("POST", `/api/v1/auth/users/${TECH.id}/reset-password`, { body: { data: { user_id: TECH.id, temporary_password: PROVISORIA, must_change_password: true, revoked_sessions: 1, affected_patios: 2 } } }));
  const create = await mount(React.createElement(UserFormModal, { user: null, context: CONTEXT, onClose: () => {}, onSaved: () => {} }));
  assert.equal(hasButton(create.container, /Redefinir senha/), false, "W-BTN-criação: sem o botão");
  await create.unmount();

  const edit = await mount(React.createElement(UserFormModal, { user: TECH, context: CONTEXT, onClose: () => assert.fail("o formulário não fecha"), onSaved: () => assert.fail("não salvou") }));
  const trigger = button(edit.container, /^Redefinir senha$/);
  assert.equal(trigger.getAttribute("aria-label"), "Redefinir a senha de Carlos Guincheiro", "W-BTN-rótulo");
  assert.equal((propsOf(trigger).style as { minHeight?: number }).minHeight, 38, "W-BTN-alvo de 38 px");
  assert.equal(calls.length, 0, "W-BTN: mostrar o botão não chama o servidor");
  await click(trigger);
  assert.match(text(edit.container), /Redefinir a senha de Carlos Guincheiro\?/, "W-BTN-abre: o clique abre o fluxo (a confirmação)");
  assert.equal(writes().length, 0, "W-BTN: abrir o fluxo ainda não redefine");
  await click(button(edit.container, /^Redefinir senha$/));
  assert.equal(writes().length, 1);
  assert.equal(text(edit.container).split(PROVISORIA).length - 1, 1, "W-BTN-provisória uma vez");
  assert.match(text(edit.container), /Esta senha vale em todos os pátios do grupo em que o técnico tem acesso\./);
  await click(button(edit.container, /^Fechar$/));
  assert.doesNotMatch(text(edit.container), new RegExp(PROVISORIA), "W-BTN: fechar descarta a provisória");
  assert.match(text(edit.container), /Editar usuário/, "W-BTN: fechar o fluxo volta ao formulário");
  await edit.unmount();
});

// =====================================================================================================================
// A página: a criação abre o diálogo da provisória e a recusa leva ao "Dar acesso" (montagem real da UsersPage)
// =====================================================================================================================
async function mountUsersPage(): Promise<Mounted> {
  // Os provedores sobem com a sessão de demonstração (como em `users.smoke.test.tsx`); a lista em modo de demonstração
  // vem vazia (D-007) e as escritas vão ao `fetch` de mentira.
  process.env.VITE_USE_MOCKS = "true";
  dom.storage.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredSessionPermissions } = await import("./helpers/session-permissions");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { UsersPage } = await import("../src/modules/users/pages/UsersPage");
  const { MemoryRouter } = await import("react-router-dom");
  const permissions = ["users.read", "users.manage"];
  setStoredSessionPermissions(mockSessionForEmail("gestor.web@techsolutions.example"), permissions);
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: "ten-y", tenantName: "Pátio Y", tenantStatus: "active", branchId: "fil-y", branchName: "Campo", role: "Administrador", permissions, enabledModules: ["dashboard"], scope: "tenant" }),
  );
  return mount(
    React.createElement(MemoryRouter, { initialEntries: ["/users"] },
      React.createElement(AuthProvider, null, React.createElement(TenantProvider, null, React.createElement(PermissionProvider, null, React.createElement(UsersPage))))),
  );
}

test("página: criar usuário mostra a provisória no diálogo e fechar tira o valor da tela", async (t) => {
  t.after(() => void (process.env.VITE_USE_MOCKS = "false"));
  serve(on("POST", "/api/v1/users", { status: 201, body: { data: { id: "u-new", name: "Ana Nova", email: "ana@x.example", roles: ["field_technician"], status: "active", createdAt: "2026-11-21T12:00:00.000Z", temporaryPassword: PROVISORIA } } }));
  const view = await mountUsersPage();
  await click(button(view.container, /^Novo usuário$/));
  await fillCreateForm(view.container, "Ana Nova", "ana@x.example");
  await submit(view.container);

  const shown = text(view.container);
  assert.equal(shown.split(PROVISORIA).length - 1, 1, "página-criação: a provisória aparece 1 vez");
  assert.match(shown, /Senha provisória/);
  assert.match(shown, /Vale por 24 horas e só serve para o técnico criar a própria senha\./);
  assert.doesNotMatch(shown, /todos os pátios do grupo/, "página-criação: sem o aviso do grupo");
  await click(button(view.container, /^Fechar$/));
  assert.doesNotMatch(text(view.container), new RegExp(PROVISORIA), "página-criação: fechou, sumiu");
  await view.unmount();
});

test("página: a recusa email_in_group leva ao diálogo de dar acesso, que chama a concessão e avisa", async (t) => {
  t.after(() => void (process.env.VITE_USE_MOCKS = "false"));
  serve(
    on("POST", "/api/v1/users/access-grants", { status: 201, body: { data: { id: "u-y", name: "Carlos Guincheiro", email: "carlos@grupo.example", roles: ["field_technician"], status: "active", createdAt: "2026-11-21T12:00:00.000Z" } } }),
    on("POST", "/api/v1/users", { status: 409, reason: "email_in_group" }),
  );
  const view = await mountUsersPage();
  await click(button(view.container, /^Novo usuário$/));
  await fillCreateForm(view.container, "Carlos Guincheiro", "carlos@grupo.example");
  await submit(view.container);
  await click(button(view.container, /^Dar acesso a este login neste pátio$/));
  assert.match(text(view.container), /O login que já existe no grupo passa a ter acesso a este pátio/);
  await submit(view.container);

  const posted = writes().map((call) => call.url);
  assert.deepEqual(posted, ["/api/v1/users", "/api/v1/users/access-grants"]);
  assert.match(text(view.container), /Carlos Guincheiro agora tem acesso a este pátio, com a senha que já usa\./);
  assert.doesNotMatch(text(view.container), /Senha provisória/, "página-concessão: dar acesso não gera nem mostra senha");
  await view.unmount();
});
