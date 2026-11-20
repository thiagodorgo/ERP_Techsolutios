import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "../src/modules/users/users.types";
import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement } from "./helpers/mini-dom";

// B-USERS-CONCESSAO-PAINEL (A3) — F-FORM-PRESERVA e F-SERVICO-CONCESSAO provam pelo ENVIO real: o modal real e o
// serviço real chamam um `fetch` dublê, e o teste lê método, caminho e corpo do pedido. O DOM mínimo entra ANTES de
// qualquer import de `react-dom/client` (que é dinâmico, dentro do teste).
process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

type SentRequest = { readonly method: string; readonly url: string; readonly body: unknown };

/** `fetch` dublê: guarda cada pedido (método, caminho, corpo cru) e responde 200 com `responseBody`. */
function captureFetch(responseBody: unknown): SentRequest[] {
  const sent: SentRequest[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ method: init?.method ?? "GET", url: String(input), body: init?.body });
    return new Response(JSON.stringify(responseBody), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return sent;
}

function makeUser(partial: Partial<User> & Pick<User, "id">): User {
  return {
    name: "Fulano",
    email: "fulano@techsolutions.example",
    roles: ["operator"],
    branchIds: [],
    status: "active",
    createdAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

test("users adapter normaliza envelope de lista, papéis e descarta linhas sem id/nome", async () => {
  const { adaptUsersResponse } = await import("../src/modules/users/users.adapter");

  const data = adaptUsersResponse({
    data: {
      items: [
        {
          id: "usr-1",
          name: "Ana Gestora",
          email: "ana@techsolutions.example",
          roles: ["tenant_admin", "manager"],
          branch_ids: ["fil-01"],
          status: "active",
          created_at: "2026-06-11T08:30:00.000Z",
        },
        // Papéis como objetos {key} também são aceitos.
        { id: "usr-2", name: "Bruno Operador", roles: [{ key: "operator" }], status: "inactive", createdAt: "2026-06-12T00:00:00.000Z" },
        { id: "", name: "Sem id" }, // descartada
        { id: "usr-3" }, // sem nome → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 2 },
    },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.source, "api");
  const [first, second] = data.items;
  assert.equal(first.name, "Ana Gestora");
  assert.deepEqual(first.roles, ["tenant_admin", "manager"]);
  assert.deepEqual(first.branchIds, ["fil-01"]);
  assert.equal(first.status, "active");
  assert.deepEqual(second.roles, ["operator"]); // objeto {key} normalizado para string
  assert.equal(second.status, "inactive");
  assert.equal(data.pagination.total, 2);
});

test("users adapter: papéis → rótulos PT-BR (mapa reutilizado do auth.adapter) e opções canônicas", async () => {
  const { formatUserRoles, roleLabel, USER_ROLE_OPTIONS } = await import("../src/modules/users/users.adapter");

  assert.equal(roleLabel("tenant_admin"), "Administrador");
  assert.equal(roleLabel("manager"), "Gestor Operacional");
  assert.equal(roleLabel("finance"), "Financeiro");
  assert.equal(roleLabel("auditor"), "Auditor");
  assert.equal(roleLabel("field_dispatcher"), "Operação de Campo");
  // PR-C TELAS PADRONIZADAS — sobreposição de exibição (§3 + §11.3, PT-BR acentuado):
  // inventory nunca vaza como chave técnica; técnico de campo usa o rótulo canônico.
  assert.equal(roleLabel("inventory"), "Estoque");
  assert.equal(roleLabel("field_technician"), "Técnico de Campo");
  assert.equal(roleLabel("operator"), "Operador Logístico");
  // Papel sem mapeamento não é inventado nem sumido — cai na própria chave.
  assert.equal(roleLabel("papel_desconhecido"), "papel_desconhecido");

  assert.equal(formatUserRoles(["tenant_admin", "manager"]), "Administrador · Gestor Operacional");
  assert.equal(formatUserRoles([]), "—");

  // Opções do multi-select: papéis atribuíveis por organização, rótulos distintos.
  assert.equal(USER_ROLE_OPTIONS.length, 9);
  assert.ok(USER_ROLE_OPTIONS.some((option) => option.value === "tenant_admin" && option.label === "Administrador"));
  assert.ok(USER_ROLE_OPTIONS.every((option) => option.label.trim().length > 0));
});

test("F-ROTULO — a chave técnica nunca vaza para a interface", async () => {
  const { roleLabel } = await import("../src/modules/users/users.adapter");
  assert.equal(roleLabel("organization_view"), "Visão da organização");
});

test("F-PAPEIS-CAMPO — o formulário oferece Técnico de Campo e Estoque", async () => {
  const { USER_ROLE_OPTIONS } = await import("../src/modules/users/users.adapter");
  assert.ok(USER_ROLE_OPTIONS.some((option) => option.value === "field_technician" && option.label === "Técnico de Campo"));
  assert.ok(USER_ROLE_OPTIONS.some((option) => option.value === "inventory" && option.label === "Estoque"));
  assert.equal(USER_ROLE_OPTIONS.some((option) => option.value === "organization_view"), false, "a concessão não aparece como perfil comum");
});

test("F-FORM-PRESERVA — o administrador edita só o nome de quem tem a visão → o PATCH leva roles com organization_view", async () => {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { adaptUserResponse, preserveOrganizationViewRole } = await import("../src/modules/users/users.adapter");
  const { UserFormModal } = await import("../src/modules/users/components/UserFormModal");
  type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
  const act = (React as unknown as { act: ActFn }).act;
  const settle = async () => {
    for (let i = 0; i < 4; i++) await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));
  };

  // Com a visão no original ela vai no PATCH; sem ela, nada é inventado.
  const cases = [
    { roles: ["field_technician", "organization_view"], expected: ["field_technician", "organization_view"] },
    { roles: ["inventory"], expected: ["inventory"] },
  ];
  for (const { roles, expected } of cases) {
    const apiUser = { data: { id: "u1", name: "Ana", email: "ana@techsolutions.example", roles, status: "active" } };
    const user = adaptUserResponse(apiUser);
    assert.ok(user, "o usuário da API foi lido");
    assert.deepEqual(user.roles, roles, "o adaptador não perde o papel ao ler");

    const sent = captureFetch(apiUser);
    const saved: unknown[] = [];
    const container = document.body.appendChild(document.createElement("div"));
    const root = createRoot(container as unknown as Element);
    await act(async () => {
      root.render(
        React.createElement(UserFormModal, { user, context: { tenantId: "org-1" }, onClose: () => {}, onSaved: (value?: User) => void saved.push(value) }),
      );
    });
    try {
      const host = container as unknown as MiniDomElement;
      const optionLabels = elements(host, (el) => el.localName === "label" && elements(el, (child) => child.localName === "input" && propsOf(child).type === "checkbox").length > 0).map((el) => text(el).trim());
      assert.ok(optionLabels.length > 0, "o modal real renderizou as opções de perfil: " + serialize(host).slice(0, 600));
      assert.equal(optionLabels.some((label) => /organization_view|Visão da organização/.test(label)), false, `a concessão não aparece como perfil no formulário: ${optionLabels.join(" | ")}`);

      const nameInput = elements(host, (el) => el.localName === "input" && el.getAttribute("id") === "user-field-name")[0];
      assert.ok(nameInput, "campo Nome");
      await act(async () => {
        (propsOf(nameInput).onChange as (event: unknown) => void)({ target: { value: "Ana Beatriz" } });
      });
      const form = elements(host, (el) => el.localName === "form")[0];
      assert.ok(form, "formulário");
      await act(async () => {
        await (propsOf(form).onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} });
      });
      await settle();

      assert.equal(sent.length, 1, `um pedido só: ${JSON.stringify(sent.map((r) => `${r.method} ${r.url}`))}`);
      assert.equal(sent[0].method, "PATCH");
      assert.match(sent[0].url, /\/users\/u1$/);
      const body = JSON.parse(String(sent[0].body)) as { name: string; roles: string[]; status: string };
      assert.equal(body.name, "Ana Beatriz");
      assert.deepEqual([...body.roles].sort(), [...expected].sort());
      assert.equal(saved.length, 1, "o modal avisou que salvou");
    } finally {
      await act(async () => root.unmount());
      document.body.removeChild(container as unknown as Node);
    }
  }

  // A função pura que o modal usa, nos dois sentidos.
  assert.deepEqual(
    preserveOrganizationViewRole(["field_technician"], ["field_technician", "organization_view"]),
    ["field_technician", "organization_view"],
  );
  assert.deepEqual(preserveOrganizationViewRole(["field_technician"], ["field_technician"]), ["field_technician"]);
});

test("F-SERVICO-CONCESSAO — cliente usa PUT para conceder e DELETE para retirar, sem corpo", async () => {
  const { setOrganizationView } = await import("../src/modules/users/users.service");
  for (const [granted, method] of [
    [true, "PUT"],
    [false, "DELETE"],
  ] as const) {
    const sent = captureFetch({ data: { id: "u1", name: "Ana", roles: ["field_technician"], status: "active" } });
    const user = await setOrganizationView({ tenantId: "org-1" }, "u1", granted);
    assert.equal(sent.length, 1, `um pedido só (${method})`);
    assert.equal(sent[0].method, method);
    assert.match(sent[0].url, /\/users\/u1\/organization-view$/);
    assert.equal(sent[0].body, undefined, `o ${method} vai sem corpo`);
    assert.equal(user?.id, "u1", "a resposta é lida como usuário");
  }
});

test("users adapter: rótulo/tom do Chip de situação (Ativo/Inativo/Convite pendente)", async () => {
  const { getUserStatusLabel, getUserStatusTone } = await import("../src/modules/users/users.adapter");

  assert.equal(getUserStatusLabel("active"), "Ativo");
  assert.equal(getUserStatusTone("active"), "success");
  assert.equal(getUserStatusLabel("inactive"), "Inativo");
  assert.equal(getUserStatusTone("inactive"), "default");
  // PR-C TELAS PADRONIZADAS: rótulo do design para o status defensivo invited.
  assert.equal(getUserStatusLabel("invited"), "Convite pendente");
  assert.equal(getUserStatusTone("invited"), "warning");
});

test("users adapter: KPIs reais da janela (ativos/inativos/convidados/papéis distintos)", async () => {
  const { computeUserTotals } = await import("../src/modules/users/users.adapter");

  const items = [
    makeUser({ id: "1", status: "active", roles: ["tenant_admin"] }),
    makeUser({ id: "2", status: "active", roles: ["manager", "finance"] }),
    makeUser({ id: "3", status: "inactive", roles: ["operator"] }),
    makeUser({ id: "4", status: "invited", roles: ["manager"] }),
  ];

  const totals = computeUserTotals(items);
  assert.equal(totals.total, 4);
  assert.equal(totals.ativos, 2);
  assert.equal(totals.inativos, 1);
  assert.equal(totals.convidados, 1);
  // Papéis distintos: tenant_admin, manager, finance, operator = 4.
  assert.equal(totals.papeis, 4);

  // Janela vazia → todos zero (renderiza sem números fixos).
  assert.deepEqual(computeUserTotals([]), { total: 0, ativos: 0, inativos: 0, convidados: 0, papeis: 0 });
});

test("users adapter: lista vazia e fonte fallback preservadas (D-007)", async () => {
  const { adaptUsersResponse } = await import("../src/modules/users/users.adapter");

  const data = adaptUsersResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Resposta nula/sem itens degrada para lista vazia sem lançar.
  const bare = adaptUsersResponse(null);
  assert.equal(bare.items.length, 0);
  assert.equal(bare.pagination.total, 0);
});

test("users adapter: interpreta erros de submissão (400 invalid_role no campo Papéis, 404 not_found)", async () => {
  const { interpretUserSubmitError } = await import("../src/modules/users/users.adapter");

  const invalidRole = interpretUserSubmitError({ status: 400, error: { reason: "invalid_role" } }, "create");
  assert.equal(invalidRole.reason, "invalid_role");
  assert.equal(invalidRole.field, "roles");

  const roleRequired = interpretUserSubmitError({ reason: "user_role_required" }, "create");
  assert.equal(roleRequired.field, "roles");

  const notFound = interpretUserSubmitError({ status: 404 }, "update");
  assert.equal(notFound.reason, "user_not_found");
  assert.equal(notFound.field, undefined); // só Alerta

  // 400 sem motivo é ambíguo (papel × nome × e-mail) → Alerta genérico, sem campo.
  assert.equal(interpretUserSubmitError({ status: 400 }, "create").field, undefined);

  // Erro genérico preserva a mensagem.
  const generic = interpretUserSubmitError(new Error("Falha genérica"), "create");
  assert.equal(generic.field, undefined);
  assert.equal(generic.message, "Falha genérica");
});

test("users adapter: validação de campos (nome/e-mail/papéis; e-mail imutável na edição)", async () => {
  const { validateUser } = await import("../src/modules/users/users.adapter");

  const createErrors = validateUser({ name: "", email: "", roles: [] });
  const createFields = createErrors.map((error) => error.field);
  assert.ok(createFields.includes("name"));
  assert.ok(createFields.includes("email"));
  assert.ok(createFields.includes("roles"));

  // E-mail inválido é rejeitado na criação.
  assert.ok(validateUser({ name: "Ana", email: "sem-arroba", roles: ["manager"] }).some((error) => error.field === "email"));

  // Edição não valida e-mail (imutável) mas exige papel.
  assert.equal(validateUser({ name: "Ana", roles: ["manager"] }, { isEdit: true }).length, 0);
  assert.ok(validateUser({ name: "Ana", roles: [] }, { isEdit: true }).some((error) => error.field === "roles"));

  // Rascunho completo e válido não gera erros.
  assert.equal(validateUser({ name: "Ana", email: "ana@techsolutions.example", roles: ["manager"] }).length, 0);
});

test("users adapter: filtro por situação lógica e busca (nome/e-mail/papel)", async () => {
  const { filterUsers } = await import("../src/modules/users/users.adapter");

  const items = [
    makeUser({ id: "1", name: "Ana Gestora", email: "ana@ex.com", roles: ["manager"], status: "active" }),
    makeUser({ id: "2", name: "Bruno Financeiro", email: "bruno@ex.com", roles: ["finance"], status: "inactive" }),
    makeUser({ id: "3", name: "Carla Admin", email: "carla@ex.com", roles: ["tenant_admin"], status: "active" }),
  ];

  assert.deepEqual(filterUsers(items, { search: "", isActive: "active" }).map((u) => u.id), ["1", "3"]);
  assert.deepEqual(filterUsers(items, { search: "", isActive: "inactive" }).map((u) => u.id), ["2"]);
  // Busca por nome.
  assert.deepEqual(filterUsers(items, { search: "carla", isActive: "all" }).map((u) => u.id), ["3"]);
  // Busca pelo rótulo PT-BR do papel.
  assert.deepEqual(filterUsers(items, { search: "financeiro", isActive: "all" }).map((u) => u.id), ["2"]);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// B-USERS-CONCESSAO-PAINEL (F5b) — a tela REAL de Usuários (providers e hooks reais, `fetch` dublê) com o controle
// "Visão da organização" da opção A aprovada (`telas-3opcoes/users-concede-3opcoes.reference.html`): F-GESTOR-VE-CONTROLE,
// F-SEM-CHAVE, F-LIGA-DESLIGA e F-SELO do §7.4 do plano, mais o texto da Emenda 1 (técnico) e da Q1 = (a) (não precisa
// entrar de novo). O clique é o handler real (`__reactProps$`), como nos outros testes "live" do repositório.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type ApiUser = { id: string; name: string; email: string; roles: string[]; status: "active" | "inactive"; created_at: string };
type PageCall = { readonly method: string; readonly url: string; readonly body: unknown };
type ViewReply = (call: PageCall, user: ApiUser) => Response | Promise<Response>;
type PageActFn = (callback: () => Promise<void> | void) => Promise<void>;

const ORG = "org-usuarios";
const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const apiUser = (id: string, name: string, roles: string[]): ApiUser => ({
  id,
  name,
  email: `${id}@techsolutions.example`,
  roles,
  status: "active",
  created_at: "2026-06-01T10:00:00.000Z",
});

/** A rede da tela: GET /users devolve `people`; PUT/DELETE da visão acrescentam/retiram o papel, ou o `reply` decide. */
function installUsersFetch(people: ApiUser[], reply?: ViewReply): PageCall[] {
  const calls: PageCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: PageCall = { method: init?.method ?? "GET", url: String(input), body: init?.body };
    calls.push(call);
    if (call.method === "GET" && /\/api\/v1\/users(\?|$)/.test(call.url)) {
      return jsonResponse(200, { data: { items: people, pagination: { limit: 200, offset: 0, total: people.length } } });
    }
    const match = /\/api\/v1\/users\/([^/]+)\/organization-view$/.exec(call.url);
    if (match && (call.method === "PUT" || call.method === "DELETE")) {
      const person = people.find((candidate) => candidate.id === match[1]);
      if (!person) return jsonResponse(404, { error: { code: "NOT_FOUND", reason: "user_not_found", message: "x" } });
      if (reply) return reply(call, person);
      person.roles =
        call.method === "PUT"
          ? [...person.roles.filter((role) => role !== "organization_view"), "organization_view"]
          : person.roles.filter((role) => role !== "organization_view");
      return jsonResponse(200, { data: person });
    }
    return jsonResponse(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
  return calls;
}

async function pageAct(): Promise<PageActFn> {
  const React = await import("react");
  return (React as unknown as { act: PageActFn }).act;
}

async function mountUsersPage(permissions: readonly string[], people: ApiUser[], reply?: ViewReply) {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { UsersPage } = await import("../src/modules/users/pages/UsersPage");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { mockSession } = await import("../src/mocks/auth/context");
  const act = await pageAct();
  const settle = async () => {
    for (let i = 0; i < 6; i++) await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));
  };

  dom.storage.clear();
  setStoredAuthSession({
    ...mockSession,
    tenant: { id: ORG, name: "Guincho Exemplo" },
    user: { ...mockSession.user, roles: ["Gestor" as never], permissions: [...permissions] },
  });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: ORG,
      tenantName: "Guincho Exemplo",
      tenantStatus: "active",
      branchId: "fil-1",
      branchName: "Matriz",
      role: "Gestor",
      permissions,
      enabledModules: ["dashboard"],
      scope: "tenant",
    }),
  );
  const calls = installUsersFetch(people, reply);
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container as unknown as Element);
  const h = React.createElement;
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: ["/users"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(UsersPage))))),
    );
  });
  await settle();
  const host = container as unknown as MiniDomElement;
  const press = async (el: MiniDomElement | undefined, label: string) => {
    assert.ok(el, `não achei: ${label} — ${serialize(host).slice(0, 400)}`);
    const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
    assert.equal(typeof onClick, "function", `onClick ausente em ${label}`);
    await act(async () => {
      onClick!({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });
    });
    await settle();
  };
  return {
    host,
    calls,
    selfId: mockSession.user.id,
    press,
    settle,
    unmount: async () => {
      await act(async () => root.unmount());
      document.body.removeChild(container as unknown as Node);
    },
  };
}

const byLabel = (host: MiniDomElement, label: string) => elements(host, (el) => el.getAttribute("aria-label") === label)[0];
const theSwitch = (host: MiniDomElement) => elements(host, (el) => el.getAttribute("role") === "switch")[0];
const dialogOf = (host: MiniDomElement) => elements(host, (el) => el.getAttribute("role") === "dialog")[0];
const squash = (el: MiniDomElement | undefined) => (el ? text(el).replace(/\s+/g, " ") : "");
const badges = (host: MiniDomElement) => elements(host, (el) => el.getAttribute("data-selo") === "visao-da-organizacao");
const GESTOR = ["users.read", "users:grant_organization_view"];

test("F-GESTOR-VE-CONTROLE — users.read + a chave de conceder, sem users.manage: o controle aparece, o formulário não", async () => {
  const page = await mountUsersPage(GESTOR, [apiUser("u-lucas", "Lucas Ferreira", ["field_technician"])]);
  try {
    assert.equal(byLabel(page.host, "Editar Lucas Ferreira"), undefined, "sem users.manage não há Editar");
    assert.equal(byLabel(page.host, "Desativar Lucas Ferreira"), undefined, "sem users.manage não há Desativar");
    assert.doesNotMatch(squash(page.host), /Novo usuário/, "sem users.manage não há Novo usuário");
    await page.press(byLabel(page.host, "Visão da organização de Lucas Ferreira"), "botão da visão");
    const modal = dialogOf(page.host);
    assert.ok(modal, "a janela da visão abriu");
    assert.equal(modal.getAttribute("aria-label"), "Visão da organização");
    const control = theSwitch(modal);
    assert.ok(control, "o interruptor está na janela");
    assert.equal(control.getAttribute("aria-checked"), "false");
    const describedBy = control.getAttribute("aria-describedby");
    assert.ok(describedBy, "o interruptor tem descrição ligada");
    const description = elements(modal, (el) => el.getAttribute("id") === describedBy)[0];
    assert.equal(
      squash(description).trim(),
      "Mostra da organização inteira o que o perfil da pessoa já mostra só das ordens de serviço dela. Não dá permissão nova e não muda o que ela pode alterar.",
    );
    // A descrição não promete módulo nenhum (o papel não tem chave): a lista exata vem do efeito por perfil.
    assert.doesNotMatch(squash(description), /despachos|aprovações|vistorias|painel/);
    assert.match(
      squash(modal),
      /Hoje vê só as ordens de serviço em que está escalado\. Com a visão, passa a ver da organização inteira as ordens de serviço, as aprovações, as vistorias, os despachos e o painel, sem poder alterá-las\./,
    );
    assert.match(squash(modal), /Vale a partir do próximo clique; a pessoa não precisa entrar de novo\./, "Q1 = (a)");
    assert.equal(elements(page.host, (el) => el.getAttribute("id") === "user-field-name").length, 0, "o formulário de edição não aparece");
    assert.equal(page.calls.filter((call) => call.method !== "GET").length, 0, "abrir a janela não grava nada");
  } finally {
    await page.unmount();
  }
});

test("F-SEM-CHAVE — só users.read: nem o controle da visão nem o formulário", async () => {
  const page = await mountUsersPage(["users.read"], [apiUser("u-lucas", "Lucas Ferreira", ["field_technician", "organization_view"])]);
  try {
    assert.match(squash(page.host), /Lucas Ferreira/, "a linha carregou");
    assert.equal(byLabel(page.host, "Visão da organização de Lucas Ferreira"), undefined, "sem a chave não há botão da visão");
    assert.equal(theSwitch(page.host), undefined, "sem a chave não há interruptor");
    assert.equal(byLabel(page.host, "Editar Lucas Ferreira"), undefined, "sem users.manage não há Editar");
    // Quem só lê vê o estado (o selo), sem poder mudar.
    assert.equal(badges(page.host).length, 1, "o selo continua visível");
  } finally {
    await page.unmount();
  }
});

test("F-LIGA-DESLIGA — ligar chama PUT, desligar chama DELETE (sem corpo); 'Salvando…' enquanto salva; a linha atualiza", async () => {
  const gate: { hold: boolean; release: (() => void) | null } = { hold: false, release: null };
  const people = [apiUser("u-lucas", "Lucas Ferreira", ["field_technician"])];
  const page = await mountUsersPage(GESTOR, people, async (call, person) => {
    if (gate.hold) await new Promise<void>((resolve) => (gate.release = resolve));
    person.roles = call.method === "PUT" ? [...person.roles, "organization_view"] : person.roles.filter((role) => role !== "organization_view");
    return jsonResponse(200, { data: person });
  });
  const act = await pageAct();
  try {
    await page.press(byLabel(page.host, "Visão da organização de Lucas Ferreira"), "botão da visão");
    // Enquanto o PUT não volta: desabilitado, aria-busy e "Salvando…".
    gate.hold = true;
    const onClick = propsOf(theSwitch(page.host)).onClick as () => void;
    await act(async () => onClick());
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));
    const busy = theSwitch(page.host);
    assert.equal(propsOf(busy).disabled, true, "desabilitado enquanto salva");
    assert.equal(busy.getAttribute("aria-busy"), "true");
    assert.match(squash(busy), /Salvando…/);
    gate.hold = false;
    assert.ok(gate.release, "o PUT ficou pendente");
    await act(async () => gate.release!());
    await page.settle();

    const writes = page.calls.filter((call) => call.method !== "GET");
    assert.equal(writes.length, 1, "um pedido só");
    assert.equal(writes[0].method, "PUT");
    assert.match(writes[0].url, /\/api\/v1\/users\/u-lucas\/organization-view$/);
    assert.equal(writes[0].body, undefined, "o PUT vai sem corpo");
    assert.equal(theSwitch(page.host).getAttribute("aria-checked"), "true", "ligado depois da resposta");
    assert.match(squash(theSwitch(page.host)), /Ligada/);
    assert.match(squash(page.host), /Visão da organização dada a Lucas Ferreira\. Vale a partir do próximo clique\./);
    assert.equal(badges(page.host).length, 1, "a linha ganhou o selo");

    await page.press(theSwitch(page.host), "interruptor (desligar)");
    const second = page.calls.filter((call) => call.method !== "GET");
    assert.equal(second.length, 2);
    assert.equal(second[1].method, "DELETE");
    assert.match(second[1].url, /\/api\/v1\/users\/u-lucas\/organization-view$/);
    assert.equal(second[1].body, undefined, "o DELETE vai sem corpo");
    assert.equal(theSwitch(page.host).getAttribute("aria-checked"), "false");
    assert.match(squash(page.host), /Visão da organização retirada de Lucas Ferreira\./);
    assert.equal(badges(page.host).length, 0, "a linha perdeu o selo");
  } finally {
    await page.unmount();
  }
});

test("F-LIGA-DESLIGA (erros) — 422, 404, 403 e 503 viram frase PT-BR sem código; 503 oferece 'Tentar de novo', que repete", async () => {
  const cases: Array<[number, string, string, boolean]> = [
    [422, "user_role_required", "A pessoa ficaria sem nenhum perfil.", false],
    [404, "user_not_found", "Usuário não encontrado.", false],
    [403, "permission_required", "Seu perfil não pode dar nem tirar a visão da organização.", false],
    [503, "role_not_provisioned", "Não foi possível salvar agora.", true],
  ];
  for (const [status, reason, message, retryable] of cases) {
    const page = await mountUsersPage(GESTOR, [apiUser("u-so", "Sofia Visão", ["organization_view"])], () =>
      jsonResponse(status, { error: { code: "X", reason, message: "técnico" } }),
    );
    try {
      await page.press(byLabel(page.host, "Visão da organização de Sofia Visão"), "botão da visão");
      await page.press(theSwitch(page.host), `interruptor (${status})`);
      const alert = elements(dialogOf(page.host), (el) => el.getAttribute("role") === "alert")[0];
      assert.ok(alert, `${status}: há alerta`);
      assert.equal(squash(alert).replace("Tentar de novo", "").trim(), message, `${status}: a frase`);
      assert.doesNotMatch(squash(alert), new RegExp(`${status}|${reason}|técnico`), `${status}: sem código técnico`);
      assert.equal(theSwitch(page.host).getAttribute("aria-checked"), "true", `${status}: o estado volta ao do servidor`);
      const retry = elements(alert, (el) => el.localName === "button" && /Tentar de novo/.test(text(el)))[0];
      assert.equal(Boolean(retry), retryable, `${status}: 'Tentar de novo' só no que pode passar depois`);
      if (retry) {
        await page.press(retry, "Tentar de novo");
        const writes = page.calls.filter((call) => call.method !== "GET");
        assert.deepEqual(
          writes.map((call) => call.method),
          ["DELETE", "DELETE"],
          "repetiu o mesmo pedido",
        );
      }
    } finally {
      await page.unmount();
    }
  }
});

test("F-SELO — com o papel: o selo 'Visão da organização' na linha, nunca um chip de perfil nem uma opção do filtro", async () => {
  const page = await mountUsersPage(GESTOR, [
    apiUser("u-lucas", "Lucas Ferreira", ["field_technician", "organization_view"]),
    apiUser("u-ana", "Ana Gestora", ["manager"]),
  ]);
  try {
    const found = badges(page.host);
    assert.equal(found.length, 1, "só quem tem a visão leva o selo");
    assert.equal(squash(found[0]).trim(), "Visão da organização");
    const chips = elements(page.host, (el) => (el.getAttribute("class") ?? "").split(/\s+/).includes("pat-role-chip")).map((el) => squash(el).trim());
    assert.ok(chips.includes("Técnico de Campo"), `chips: ${chips.join(" | ")}`);
    assert.equal(chips.some((chip) => /Visão da organização|organization_view/i.test(chip)), false, `a visão não é chip: ${chips.join(" | ")}`);
    const options = elements(page.host, (el) => el.localName === "option").map((el) => squash(el).trim());
    assert.equal(options.some((option) => /Visão da organização|organization_view/i.test(option)), false, `a visão não é perfil do filtro: ${options.join(" | ")}`);
    assert.doesNotMatch(squash(page.host), /organization_view/, "nenhuma chave técnica na tela");
  } finally {
    await page.unmount();
  }
});

test("F-TEXTOS — o efeito por perfil (Emenda 1: o técnico vê OS, vistorias e painel, não despachos) e a Q1 para si mesmo", async () => {
  const { organizationViewEffect, organizationViewSessionNote } = await import("../src/modules/users/users.adapter");
  // Medido no catálogo (Emenda 1 + conferência de 20/11): o technician tem work_orders:read (OS e aprovações),
  // checklist_runs:read e dashboard:read, e NÃO tem field_dispatch:read.
  assert.equal(
    organizationViewEffect(["technician"], true),
    "Vê da organização inteira as ordens de serviço, as aprovações, as vistorias e o painel. Os despachos, não: o perfil não os mostra. Continua alterando só as ordens de serviço em que está escalado.",
  );
  assert.equal(
    organizationViewEffect(["technician"], false),
    "Hoje vê só as ordens de serviço em que está escalado. Com a visão, passa a ver da organização inteira as ordens de serviço, as aprovações, as vistorias e o painel, sem poder alterá-las. Os despachos, não: o perfil não os mostra.",
  );
  assert.equal(
    organizationViewEffect(["field_technician"], true),
    "Vê da organização inteira as ordens de serviço, as aprovações, as vistorias, os despachos e o painel. Continua alterando só as ordens de serviço em que está escalado.",
  );
  assert.equal(organizationViewEffect(["manager"], false), "Para este perfil nada muda: ele já vê a organização.");
  assert.equal(organizationViewEffect(["support"], true), "Para este perfil nada muda: ele já vê a organização.");
  assert.equal(organizationViewEffect(["tenant_admin", "field_technician"], true), "Para este perfil nada muda: ele já vê a organização.");
  assert.match(organizationViewEffect(["field_dispatcher", "field_technician"], false), /as vistorias só das suas. Com a visão, passa a ver também as vistorias da organização inteira/);
  assert.equal(organizationViewSessionNote(true), "Vale a partir do próximo clique; você não precisa entrar de novo.");

  const { mockSession } = await import("../src/mocks/auth/context");
  const mine = await mountUsersPage(GESTOR, [apiUser(mockSession.user.id, "Eu Mesmo", ["manager"])]);
  try {
    await mine.press(byLabel(mine.host, "Visão da organização de Eu Mesmo"), "botão da visão (si)");
    assert.match(squash(dialogOf(mine.host)), /Vale a partir do próximo clique; você não precisa entrar de novo\./);
    assert.match(squash(dialogOf(mine.host)), /Para este perfil nada muda: ele já vê a organização\./);
  } finally {
    await mine.unmount();
  }
});
