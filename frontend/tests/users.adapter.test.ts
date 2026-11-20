import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "../src/modules/users/users.types";
import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement } from "./helpers/mini-dom";

// B-USERS-CONCESSAO-PAINEL (A3) — F-FORM-PRESERVA e F-SERVICO-CONCESSAO provam pelo ENVIO real: o modal real e o
// serviço real chamam um `fetch` dublê, e o teste lê método, caminho e corpo do pedido. O DOM mínimo entra ANTES de
// qualquer import de `react-dom/client` (que é dinâmico, dentro do teste).
process.env.VITE_USE_MOCKS = "false";
installMiniDom();

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
