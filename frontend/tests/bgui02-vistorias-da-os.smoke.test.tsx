import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

// B-GUI-02 — o operador escolhe, na web, as vistorias da OS (Emendas 1, 1.1 e 2 do plano). Testes do front:
//   W1   só modelos publicados; incluir a coleta manda `{ add: [C/collection] }`;
//   W1b  o corpo de UMA linha (coleta, entrega sem coleta, retirar a coleta com a entrega viva, retirar a geral);
//   W1c  o mesmo par já vivo → recusa local, sem chamada;
//   W-PRES a propriedade de preservação, por enumeração (nenhuma linha não escolhida entra no corpo);
//   W2   a matriz das 4 combinações de permissão (e sem leitura dos modelos, NENHUMA chamada à lista); 403 → só leitura;
//   W3   OS encerrada sem edição; cada `reason` → a frase da tabela; desconhecido → reserva pelo número;
//   W3b  "já foi enviada" pelo congelado ou pelo evento de despacho, e o selo "próximo envio";
//   W-TROCA "Trocar" = 2 chamadas de uma linha, retirar e depois incluir; 1ª recusada → 1 chamada; 2ª recusada → a vaga
//        mostra "falta escolher" e o modelo continua no diálogo;
//   W5a  a raiz `data-aparencia` da aparência escolhida.
// DOM mínimo do repositório (`helpers/mini-dom.ts`): a borda de rede (`fetch`) é o único dublê, com o envelope de erro do
// servidor `{ error: { code, reason, message } }`.

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
const { renderToString } = await import("react-dom/server");
const { MemoryRouter } = await import("react-router-dom");
const { ApiError } = await import("../src/services/api/client");
const model = await import("../src/modules/work-orders/work-order-checklists.model");
const { WorkOrderChecklistsPanel } = await import("../src/modules/work-orders/components/WorkOrderChecklistsPanel");

type TenantChecklist = import("../src/modules/checklists/types").TenantChecklist;
type WorkOrderDetail = import("../src/modules/work-orders/work-orders.types").WorkOrderDetail;
type WorkOrderEvent = import("../src/modules/work-orders/work-orders.types").WorkOrderEvent;
type WorkOrderChecklistLink = import("../src/modules/work-orders/work-orders.types").WorkOrderChecklistLink;
type Appearance = "A" | "B" | "C";

const h = React.createElement;
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

// =============================== dados (os bytes do servidor) ===============================

const C1 = "11111111-1111-4111-8111-00000000c001";
const C2 = "11111111-1111-4111-8111-00000000c002";
const E1 = "11111111-1111-4111-8111-00000000e001";
const G1 = "11111111-1111-4111-8111-00000000a001";

function component(type: string, extra: Record<string, unknown> = {}, required = true) {
  return { id: `${type}-${Math.random().toString(16).slice(2)}`, componentKey: type, label: type, type, required, orderIndex: 0, config: extra, validationRules: {}, visibilityRules: {} };
}

function template(id: string, name: string, type: TenantChecklist["type"], status: TenantChecklist["status"], components: unknown[]): TenantChecklist {
  return { id, tenantId: "t1", name, type, status, version: 3, schema: {}, components: components as TenantChecklist["components"], publishedAt: "2026-10-02T12:00:00.000Z", updatedAt: "2026-10-02T12:00:00.000Z" };
}

const TEMPLATES: TenantChecklist[] = [
  template(C1, "Coleta padrão — reboque", "towing_collection", "published", [component("photo_upload", { minPhotos: 8 }), component("damage_map"), component("signature")]),
  template(C2, "Coleta — moto", "towing_collection", "published", [component("photo_upload", { minPhotos: 4 }), component("signature", {}, false)]),
  template(E1, "Entrega padrão — reboque", "towing_delivery", "published", [component("photo_upload", { minPhotos: 6 }), component("comparison"), component("signature")]),
  template(G1, "Conferência de itens", "custom", "published", [component("single_choice", { options: ["Sim", "Não"] })]),
  template("11111111-1111-4111-8111-00000000d001", "Rascunho de coleta", "towing_collection", "draft", []),
  template("11111111-1111-4111-8111-00000000d002", "Modelo inativo", "towing_collection", "inactive", []),
  template("11111111-1111-4111-8111-00000000d003", "Modelo arquivado", "towing_delivery", "archived", []),
];

const line = (checklistId: string, role: WorkOrderChecklistLink["role"], orderIndex: number, source: WorkOrderChecklistLink["source"] = "manual"): WorkOrderChecklistLink => ({
  checklistId,
  role,
  source,
  ruleId: source === "resolved" ? "rule-1" : null,
  orderIndex,
});

function workOrder(checklists: WorkOrderChecklistLink[], extra: Partial<WorkOrderDetail> = {}): WorkOrderDetail {
  return {
    id: "22222222-2222-4222-8222-000000000418",
    code: "OS-2026-0418",
    title: "Reboque leve",
    status: "open",
    priority: "high",
    customerName: "Transportes Exemplo",
    createdAt: "2026-11-17T09:05:00.000Z",
    links: null,
    checklistId: checklists.find((item) => item.role === "collection")?.checklistId ?? checklists[0]?.checklistId ?? null,
    checklistSnapshot: null,
    checklists,
    ...extra,
  } as WorkOrderDetail;
}

const ALL = ["work_orders:read", "field_dispatch:create", "tenant_checklists:read"];

// =============================== a borda de rede ===============================

type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Reply = { readonly status?: number; readonly data?: unknown; readonly reason?: string };
let calls: Call[] = [];
let patchReplies: Reply[] = [];
let templatesReply: Reply = { data: TEMPLATES };

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const call: Call = { method: init?.method ?? "GET", url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined };
  calls.push(call);
  let reply: Reply = { status: 404, reason: "not_found" };
  if (call.method === "GET" && /\/tenant\/checklists$/.test(call.url)) reply = templatesReply;
  else if (call.method === "PATCH" && /\/work-orders\/[^/]+\/checklists$/.test(call.url)) reply = patchReplies.shift() ?? { status: 500, reason: "sem_resposta_preparada" };
  const status = reply.status ?? 200;
  const body = status >= 400 ? { error: { code: "ERRO", reason: reply.reason ?? "erro", message: "falha" } } : { data: reply.data };
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;

const listCalls = () => calls.filter((call) => call.method === "GET" && /\/tenant\/checklists$/.test(call.url));
const patchCalls = () => calls.filter((call) => call.method === "PATCH");

// =============================== render ===============================

type Mounted = { readonly container: MiniDomElement; readonly unmount: () => Promise<void> };

async function mount(props: { workOrder: WorkOrderDetail; timeline?: WorkOrderEvent[]; permissions?: string[]; appearance?: Appearance }): Promise<Mounted> {
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(
        MemoryRouter,
        null,
        h(WorkOrderChecklistsPanel, {
          workOrder: props.workOrder,
          timeline: props.timeline ?? [],
          context: { tenantId: "t1", role: "manager", permissions: props.permissions ?? ALL },
          permissions: props.permissions ?? ALL,
          appearance: props.appearance ?? "A",
          lastUpdatedAt: "2026-11-17T12:41:00.000Z",
          onChanged: () => undefined,
        }),
      ),
    );
  });
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      container.parentNode?.removeChild(container);
    },
  };
}

function reset() {
  calls = [];
  patchReplies = [];
  templatesReply = { data: TEMPLATES };
}

const buttons = (root: MiniDomElement, label: string | RegExp) =>
  elements(root, (el) => el.localName === "button" && (typeof label === "string" ? text(el).trim() === label : label.test(text(el))));

async function click(el: MiniDomElement) {
  await act(async () => {
    (propsOf(el).onClick as (event: unknown) => void)({ preventDefault() {}, stopPropagation() {} });
  });
  await settle();
}

async function openRow(root: MiniDomElement, templateName: string) {
  const row = elements(root, (el) => el.localName === "tr" && (el.getAttribute("class") ?? "").includes("pat-ab-row") && text(el).includes(templateName))[0];
  assert.ok(row, `linha do modelo ${templateName}`);
  await click(row);
}

async function typeReason(root: MiniDomElement, value: string) {
  const area = elements(root, (el) => el.localName === "textarea")[0];
  assert.ok(area, "o diálogo tem o campo de motivo");
  await act(async () => {
    (propsOf(area).onChange as (event: unknown) => void)({ target: { value } });
  });
}

const rowNames = (root: MiniDomElement) =>
  elements(root, (el) => el.localName === "tr" && (el.getAttribute("class") ?? "").includes("pat-ab-row")).map((row) => text(row));

// =============================== W1 ===============================

test("W1 · só publicados: rascunho, inativo e arquivado ficam fora (função e tela)", async () => {
  reset();
  assert.deepEqual(
    model.publishedTemplates(TEMPLATES).map((item) => item.id),
    [C1, C2, E1, G1],
  );
  const view = await mount({ workOrder: workOrder([]) });
  const names = rowNames(view.container);
  assert.equal(names.length, 4, `linhas: ${JSON.stringify(names)}`);
  for (const out of ["Rascunho de coleta", "Modelo inativo", "Modelo arquivado"]) {
    assert.equal(names.some((name) => name.includes(out)), false, `${out} não pode ser oferecido`);
  }
  await view.unmount();
});

test("W1 · salvar a Coleta numa OS sem linhas chama o PATCH com { add: [{ checklistId, role: collection }] }, sem remove", async () => {
  reset();
  patchReplies = [{ data: workOrder([line(C1, "collection", 0)]) }];
  const view = await mount({ workOrder: workOrder([]) });
  await openRow(view.container, "Coleta padrão — reboque");
  const usar = buttons(view.container, "Usar na coleta");
  assert.equal(usar.length, 1, "o botão Usar na coleta");
  await click(usar[0]);
  assert.equal(patchCalls().length, 1);
  assert.deepEqual(patchCalls()[0].body, { add: [{ checklistId: C1, role: "collection" }] });
  assert.match(text(view.container), /Vistoria de coleta definida: Coleta padrão — reboque\./);
  await view.unmount();
});

// =============================== W1b / W1c ===============================

test("W1b · o corpo de uma linha, pelo construtor", () => {
  const bodyOf = (live: WorkOrderChecklistLink[], change: Parameters<typeof model.buildChecklistAdjustmentBody>[1]) => {
    const result = model.buildChecklistAdjustmentBody(live, change);
    assert.equal(result.kind, "body", JSON.stringify(result));
    return result.kind === "body" ? result.body : null;
  };
  assert.deepEqual(bodyOf([], { kind: "include", checklistId: C1, role: "collection" }), { add: [{ checklistId: C1, role: "collection" }] });
  // Entrega sem coleta: sem recusa (a ordem é do servidor, Emenda 2).
  assert.deepEqual(bodyOf([], { kind: "include", checklistId: E1, role: "delivery" }), { add: [{ checklistId: E1, role: "delivery" }] });
  const live = [line(C1, "collection", 0), line(E1, "delivery", 1)];
  assert.deepEqual(bodyOf(live, { kind: "retire", line: { checklistId: C1, role: "collection", orderIndex: 0 }, reason: "o cliente pediu outro" }), {
    remove: [{ checklistId: C1, role: "collection", reason: "o cliente pediu outro" }],
  });
  const withGeneric = [line(G1, "generic", 0), line(C1, "collection", 1)];
  assert.deepEqual(bodyOf(withGeneric, { kind: "retire", line: { checklistId: G1, role: "generic", orderIndex: 0 }, reason: "não se aplica" }), {
    remove: [{ checklistId: G1, role: "generic", reason: "não se aplica" }],
  });
});

test("W1c · o mesmo par já vivo → duplicate_phase local, sem chamada (função e tela)", async () => {
  const live = [line(C1, "collection", 0)];
  assert.deepEqual(model.buildChecklistAdjustmentBody(live, { kind: "include", checklistId: C1, role: "collection" }), { kind: "refused", reason: "duplicate_phase" });
  // O mesmo modelo noutra etapa é outro par: passa.
  assert.equal(model.buildChecklistAdjustmentBody(live, { kind: "include", checklistId: C1, role: "delivery" }).kind, "body");
  // Na tela, o par vivo nem oferece "Usar na coleta".
  reset();
  const view = await mount({ workOrder: workOrder(live) });
  await openRow(view.container, "Coleta padrão — reboque");
  assert.equal(buttons(view.container, "Usar na coleta").length, 0);
  assert.equal(buttons(view.container, /Trocar a coleta/).length, 0);
  assert.equal(patchCalls().length, 0);
  await view.unmount();
});

// =============================== W-PRES ===============================

test("W-PRES · preservação por enumeração: toda ação válida gera UM corpo de uma linha, e nenhuma linha não escolhida sai", () => {
  const ids = [C1, E1];
  const roles: WorkOrderChecklistLink["role"][] = ["collection", "delivery", "generic", null];
  const sources: WorkOrderChecklistLink["source"][] = ["manual", "resolved", null];
  const pairs = ids.flatMap((checklistId) => roles.map((role) => ({ checklistId, role })));
  const sets: WorkOrderChecklistLink[][] = [];
  const build = (start: number, current: WorkOrderChecklistLink[]) => {
    sets.push(current);
    if (current.length === 3) return;
    for (let index = start; index < pairs.length; index++) {
      for (const source of sources) build(index + 1, [...current, { ...pairs[index], source, ruleId: source === "resolved" ? "rule-1" : null, orderIndex: current.length }]);
    }
  };
  build(0, []);
  let cases = 0;
  let unknownPhaseRefusals = 0;
  for (const live of sets) {
    const key = (item: { checklistId: string; role: unknown }) => `${item.checklistId}:${String(item.role)}`;
    const liveKeys = new Set(live.map(key));
    for (const checklistId of ids) {
      for (const role of ["collection", "delivery"] as const) {
        if (liveKeys.has(`${checklistId}:${role}`)) continue;
        const result = model.buildChecklistAdjustmentBody(live, { kind: "include", checklistId, role });
        assert.equal(result.kind, "body");
        if (result.kind !== "body") continue;
        const add = result.body.add ?? [];
        const remove = result.body.remove ?? [];
        assert.equal(add.length + remove.length, 1, "(i) exatamente 1 linha");
        assert.deepEqual(remove, [], "(ii) incluir não retira nada");
        assert.deepEqual(add, [{ checklistId, role }], "(ii) incluir manda só o par pedido");
        cases++;
      }
    }
    for (const chosen of live) {
      const change = { kind: "retire" as const, line: { checklistId: chosen.checklistId, role: chosen.role as never, orderIndex: chosen.orderIndex }, reason: "motivo do operador" };
      const result = model.buildChecklistAdjustmentBody(live, change);
      if (chosen.role === null) {
        assert.deepEqual(result, { kind: "refused", reason: "unknown_phase" });
        unknownPhaseRefusals++;
        continue;
      }
      assert.equal(result.kind, "body");
      if (result.kind !== "body") continue;
      const add = result.body.add ?? [];
      const remove = result.body.remove ?? [];
      assert.equal(add.length + remove.length, 1, "(i) exatamente 1 linha");
      assert.deepEqual(add, [], "(iii) retirar não inclui nada");
      assert.deepEqual(remove, [{ checklistId: chosen.checklistId, role: chosen.role, reason: "motivo do operador" }], "(iii) só a linha escolhida sai");
      for (const other of live) if (other !== chosen) assert.equal(remove.some((item) => key(item) === key(other)), false, "linha não escolhida entrou na retirada");
      cases++;
    }
  }
  // Denominador gerado, não escrito à mão.
  assert.equal(sets.length, 1789, `conjuntos gerados: ${sets.length}`);
  assert.ok(cases > 5000, `pares (S, a) exercitados: ${cases}`);
  assert.ok(unknownPhaseRefusals > 0, `retiradas de etapa desconhecida recusadas: ${unknownPhaseRefusals}`);
});

// =============================== W2 ===============================

test("W2 · a matriz das 4 combinações (função pura)", () => {
  const edita = model.checklistPanelAccess(["field_dispatch:create", "tenant_checklists:read"], "open");
  assert.equal(edita.canEdit, true);
  const despachante = model.checklistPanelAccess(["field_dispatch:create"], "open");
  assert.deepEqual([despachante.canEdit, despachante.canReadTemplates, despachante.readOnlyReason], [false, false, "dispatcher_without_templates"]);
  const leitor = model.checklistPanelAccess(["tenant_checklists:read"], "open");
  assert.deepEqual([leitor.canEdit, leitor.canReadTemplates, leitor.readOnlyReason], [false, true, "read_only_profile"]);
  const nenhuma = model.checklistPanelAccess([], "open");
  assert.deepEqual([nenhuma.canEdit, nenhuma.canReadTemplates, nenhuma.readOnlyReason], [false, false, "read_only_profile"]);
});

// J-596 (C2-N1) — W2 e W-A2 montados nas 3 aparências: uma regressão que atinja só a B ou a C fica vermelha aqui.
const APPEARANCES = ["A", "B", "C"] as const;
const rootAppearance = (root: MiniDomElement) =>
  elements(root, (el) => el.hasAttribute("data-aparencia")).map((el) => el.getAttribute("data-aparencia")).join();

for (const appearance of APPEARANCES) {
  test(`W2 · [${appearance}] na tela: só o despachante sem leitura → frase dele e NENHUMA chamada à lista de modelos`, async () => {
    const live = [line(C1, "collection", 0)];
    const timeline: WorkOrderEvent[] = [
      { id: "ev1", eventType: "work_order_checklist_added", message: "Vistoria incluída", metadata: { checklistId: C1, checklistLabel: "Coleta padrão — reboque", role: "collection" }, createdAt: "2026-11-17T09:12:00.000Z" },
    ];
    const cases: Array<{ permissions: string[]; reads: number; phrase: RegExp | null; edits: boolean }> = [
      { permissions: ["work_orders:read", "field_dispatch:create", "tenant_checklists:read"], reads: 1, phrase: null, edits: true },
      { permissions: ["work_orders:read", "field_dispatch:create"], reads: 0, phrase: /Seu perfil envia a OS ao guincheiro, mas ainda não vê os modelos de vistoria\. Para escolher a vistoria desta OS, peça a um gestor\./, edits: false },
      { permissions: ["work_orders:read", "tenant_checklists:read"], reads: 1, phrase: /Seu perfil vê as vistorias desta OS, mas não pode alterá-las\./, edits: false },
      { permissions: ["work_orders:read"], reads: 0, phrase: /Seu perfil vê as vistorias desta OS, mas não pode alterá-las\./, edits: false },
    ];
    for (const item of cases) {
      reset();
      const view = await mount({ workOrder: workOrder(live), timeline, permissions: item.permissions, appearance });
      assert.equal(rootAppearance(view.container), appearance, "a aparência montada");
      assert.equal(listCalls().length, item.reads, `chamadas à lista com ${JSON.stringify(item.permissions)}`);
      const page = text(view.container);
      if (item.phrase) assert.match(page, item.phrase);
      // O que está ligado aparece com o nome registrado na inclusão, mesmo sem a lista.
      assert.match(page, /Coleta padrão — reboque/);
      // "Gerenciar modelos" é o atalho da aparência A (a B e a C não o desenham): na A, 1 com edição; na B e na C, 0 sempre.
      assert.equal(buttons(view.container, "Gerenciar modelos").length, item.edits && appearance === "A" ? 1 : 0, `edição com ${JSON.stringify(item.permissions)}`);
      // Em toda aparência: sem edição, nenhum controle de edição na página.
      if (!item.edits) assert.equal(buttons(view.container, /Usar na|Trocar a|Retirar da/).length, 0, `controle de edição com ${JSON.stringify(item.permissions)}`);
      if (item.reads > 0) {
        await openRow(view.container, "Entrega padrão — reboque");
        assert.equal(buttons(view.container, "Usar na entrega").length, item.edits ? 1 : 0);
      }
      await view.unmount();
    }
  });

  test(`W2 · [${appearance}] o 403 ao salvar leva o painel a só leitura`, async () => {
    reset();
    patchReplies = [{ status: 403, reason: "permission_required" }];
    const view = await mount({ workOrder: workOrder([]), appearance });
    assert.equal(rootAppearance(view.container), appearance, "a aparência montada");
    await openRow(view.container, "Coleta padrão — reboque");
    await click(buttons(view.container, "Usar na coleta")[0]);
    assert.match(text(view.container), /Seu perfil não pode alterar as vistorias desta OS\./);
    assert.equal(buttons(view.container, "Usar na coleta").length, 0, "depois do 403 não há mais controle de edição");
    assert.equal(buttons(view.container, "Gerenciar modelos").length, 0);
    await view.unmount();
  });
}

// =============================== W3 ===============================

test("W3 · OS concluída, cancelada ou recusada: sem controle de edição", async () => {
  for (const status of ["completed", "cancelled", "rejected"] as const) {
    assert.equal(model.checklistPanelAccess(ALL, status).canEdit, false, status);
    assert.equal(model.checklistPanelAccess(ALL, status).terminal, true, status);
    reset();
    const view = await mount({ workOrder: workOrder([line(C1, "collection", 0)], { status }) });
    await openRow(view.container, "Entrega padrão — reboque");
    assert.equal(buttons(view.container, /Usar na|Trocar a|Retirar da/).length, 0, status);
    assert.match(text(view.container), /Esta OS foi encerrada\. As vistorias ficam como registro e não podem mais ser ajustadas\./);
    await view.unmount();
  }
});

test("W3 · cada reason do servidor vira a frase da tabela; desconhecido cai na reserva pelo número", () => {
  const table: Array<[number, string, string]> = [
    [400, "checklist_not_published", "Este modelo não está mais publicado. Atualizamos a lista; escolha outro."],
    [409, "duplicate_checklist_phase", "Este modelo já está nesta etapa da OS."],
    [409, "checklist_already_dispatched", "Esta vistoria já foi enviada ao guincheiro e não pode ser retirada. Para corrigir, use a reabertura da vistoria."],
    [409, "work_order_terminal", "Esta OS foi encerrada. As vistorias não podem mais ser ajustadas."],
    [409, "collection_after_dispatch", "Esta OS já foi enviada sem vistoria de coleta. A coleta não pode entrar depois do envio."],
    [409, "checklist_customer_scoped_confirmation_required", "Esta vistoria foi exigida pelo contrato do cliente e não pode ser retirada por aqui."],
    [404, "checklist_link_not_found", "Esta vistoria já não está nesta OS. Atualizamos a tela."],
    [404, "not_found", "Esta OS não foi encontrada nesta organização."],
    [403, "permission_required", "Seu perfil não pode alterar as vistorias desta OS."],
    [400, "checklist_removal_reason_required", "Informe o motivo para retirar a vistoria."],
    [422, "checklist_removal_reason_too_long", "O motivo pode ter no máximo 500 caracteres."],
  ];
  for (const reason of ["invalid_uuid", "invalid_checklist_role", "invalid_checklist_adjustment", "checklist_adjustment_empty", "checklist_role_required", "checklist_removal_actor_required"]) {
    table.push([400, reason, "Não foi possível salvar as vistorias. Atualize a página e tente de novo."]);
  }
  for (const [status, reason, phrase] of table) {
    const error = new ApiError(status, "falha", "ERRO", reason);
    assert.equal(model.checklistAdjustMessage(error.status, error.reason), phrase, reason);
    assert.equal(model.checklistAdjustMessage(error.status, error.reason).includes(reason), false, "o reason nunca aparece na tela");
  }
  assert.equal(model.checklistAdjustMessage(500, "coisa_nova"), "Não foi possível salvar agora.");
  assert.equal(model.checklistAdjustMessage(403, "coisa_nova"), "Seu perfil não pode alterar as vistorias desta OS.");
  assert.equal(model.checklistAdjustMessage(undefined, undefined), "Não foi possível salvar agora.");
  // O 409 de OS encerrada não é confundido com a vistoria já enviada.
  assert.doesNotMatch(model.checklistAdjustMessage(409, "work_order_terminal"), /já foi enviada/);
});

test("W3 · na tela, o 409 collection_after_dispatch mostra a frase no detalhe da linha", async () => {
  reset();
  patchReplies = [{ status: 409, reason: "collection_after_dispatch" }];
  const view = await mount({ workOrder: workOrder([line(E1, "delivery", 0)], { checklistSnapshot: { template_id: E1 } }) });
  await openRow(view.container, "Coleta padrão — reboque");
  await click(buttons(view.container, "Usar na coleta")[0]);
  assert.match(text(view.container), /Esta OS já foi enviada sem vistoria de coleta\. A coleta não pode entrar depois do envio\./);
  await view.unmount();
});

// =============================== W3b ===============================

test("W3b · 'já foi enviada' pelo congelado ou pelo evento de despacho; a linha nova ganha 'próximo envio'", async () => {
  const dispatchedEvent: WorkOrderEvent = { id: "d1", eventType: "field_dispatch_created", message: "Despacho", createdAt: "2026-11-17T10:00:00.000Z" };
  const laterInclusion: WorkOrderEvent = {
    id: "i2",
    eventType: "work_order_checklist_added",
    message: "Vistoria incluída",
    metadata: { checklistId: E1, checklistLabel: "Entrega padrão — reboque", role: "delivery" },
    createdAt: "2026-11-17T10:30:00.000Z",
  };
  assert.equal(model.workOrderAlreadyDispatched({ checklistSnapshot: { template_id: C1 } }, []), true);
  assert.equal(model.workOrderAlreadyDispatched({ checklistSnapshot: null }, [dispatchedEvent]), true);
  assert.equal(model.workOrderAlreadyDispatched({ checklistSnapshot: null }, []), false);

  reset();
  const sent = await mount({ workOrder: workOrder([line(C1, "collection", 0), line(E1, "delivery", 1)]), timeline: [dispatchedEvent, laterInclusion] });
  assert.match(text(sent.container), /Esta OS já foi enviada ao guincheiro\. Uma vistoria incluída agora só chega ao app num novo envio\./);
  assert.match(text(sent.container), /próximo envio/);
  await sent.unmount();

  reset();
  const fresh = await mount({ workOrder: workOrder([line(C1, "collection", 0)]) });
  assert.doesNotMatch(text(fresh.container), /já foi enviada ao guincheiro/);
  assert.doesNotMatch(text(fresh.container), /próximo envio/);
  await fresh.unmount();
});

// =============================== W-TROCA ===============================

async function startSwap(appearance: Appearance) {
  const view = await mount({ workOrder: workOrder([line(C1, "collection", 0), line(E1, "delivery", 1)]), appearance });
  await openRow(view.container, "Coleta — moto");
  const trocar = buttons(view.container, "Trocar a coleta por este");
  assert.equal(trocar.length, 1, "o botão Trocar a coleta por este");
  await click(trocar[0]);
  await typeReason(view.container, "o cliente pediu outro modelo");
  const confirmar = elements(view.container, (el) => el.localName === "button" && el.hasAttribute("data-confirmar"))[0];
  assert.ok(confirmar, "o botão de confirmar do diálogo");
  await click(confirmar);
  return view;
}

test("W-TROCA · trocar a coleta = 2 chamadas de uma linha, a 1ª retira a antiga e a 2ª inclui a nova, nessa ordem", async () => {
  reset();
  patchReplies = [{ data: workOrder([line(E1, "delivery", 1)]) }, { data: workOrder([line(E1, "delivery", 1), line(C2, "collection", 2)]) }];
  const view = await startSwap("A");
  const patches = patchCalls();
  assert.equal(patches.length, 2);
  assert.deepEqual(patches[0].body, { remove: [{ checklistId: C1, role: "collection", reason: "o cliente pediu outro modelo" }] });
  assert.deepEqual(patches[1].body, { add: [{ checklistId: C2, role: "collection" }] });
  assert.match(text(view.container), /Vistoria de coleta trocada por Coleta — moto\./);
  await view.unmount();
});

test("W-TROCA · com a 1ª recusada (vistoria já enviada), há 1 chamada só e nada muda", async () => {
  reset();
  patchReplies = [{ status: 409, reason: "checklist_already_dispatched" }];
  const view = await startSwap("A");
  assert.equal(patchCalls().length, 1, "a 2ª chamada não pode sair depois da 1ª recusada");
  assert.match(text(view.container), /Esta vistoria já foi enviada ao guincheiro e não pode ser retirada/);
  await view.unmount();
});

test("W-TROCA · com a 2ª recusada, a vaga mostra 'falta escolher' e o modelo continua no diálogo, com 'Tentar novamente'", async () => {
  reset();
  patchReplies = [{ data: workOrder([line(E1, "delivery", 1)]) }, { status: 500, reason: "falha_interna" }];
  const view = await startSwap("B");
  assert.equal(patchCalls().length, 2);
  const vaga = elements(view.container, (el) => el.getAttribute("data-vaga") === "collection")[0];
  assert.ok(vaga, "a vaga da coleta");
  assert.match(text(vaga), /falta escolher/);
  const dialogo = elements(view.container, (el) => el.hasAttribute("data-dialogo"))[0];
  assert.ok(dialogo, "o diálogo continua aberto");
  assert.match(text(dialogo), /Coleta — moto/);
  assert.equal(buttons(dialogo, "Tentar novamente").length, 1);
  // Tentar de novo repete SÓ a inclusão (a retirada já voltou 200).
  patchReplies = [{ data: workOrder([line(E1, "delivery", 1), line(C2, "collection", 2)]) }];
  await click(buttons(dialogo, "Tentar novamente")[0]);
  assert.equal(patchCalls().length, 3);
  assert.deepEqual(patchCalls()[2].body, { add: [{ checklistId: C2, role: "collection" }] });
  await view.unmount();
});

// =============================== W-A2 (Emenda 2.1) ===============================

for (const appearance of APPEARANCES) {
  test(`W-A2 · [${appearance}] OS já enviada: a coleta fica sem 'Trocar' e sem 'Retirar', com a frase; a entrega segue as regras`, async () => {
    reset();
    const view = await mount({ workOrder: workOrder([line(C1, "collection", 0), line(E1, "delivery", 1)], { checklistSnapshot: { template_id: C1 } }), appearance });
    assert.equal(rootAppearance(view.container), appearance, "a aparência montada");
    const phrase = /Esta OS já foi enviada: a vistoria de coleta não pode mais ser trocada\./;
    // Outro modelo de coleta: não oferece trocar a coleta.
    await openRow(view.container, "Coleta — moto");
    assert.equal(buttons(view.container, "Trocar a coleta por este").length, 0, "trocar a coleta na OS enviada");
    assert.match(text(view.container), phrase);
    // A coleta escolhida: não oferece retirar.
    await openRow(view.container, "Coleta padrão — reboque");
    assert.equal(buttons(view.container, "Retirar da coleta").length, 0, "retirar a coleta na OS enviada");
    assert.match(text(view.container), phrase);
    // A entrega: segue as regras da Emenda 2 (retirar e trocar continuam).
    await openRow(view.container, "Entrega padrão — reboque");
    assert.equal(buttons(view.container, "Retirar da entrega").length, 1, "a entrega continua retirável");
    await openRow(view.container, "Conferência de itens");
    assert.equal(buttons(view.container, "Trocar a entrega por este").length, 1, "a entrega continua trocável");
    assert.equal(patchCalls().length, 0);
    await view.unmount();

    // Sem envio, a coleta continua trocável e retirável (o caso de controle).
    reset();
    const fresh = await mount({ workOrder: workOrder([line(C1, "collection", 0), line(E1, "delivery", 1)]), appearance });
    await openRow(fresh.container, "Coleta padrão — reboque");
    assert.equal(buttons(fresh.container, "Retirar da coleta").length, 1);
    assert.doesNotMatch(text(fresh.container), phrase);
    await fresh.unmount();
  });
}

// =============================== W5a ===============================

test("W5a · o painel renderiza a raiz data-aparencia da aparência escolhida", () => {
  for (const appearance of ["A", "B", "C"] as const) {
    const html = renderToString(
      h(
        MemoryRouter,
        null,
        h(WorkOrderChecklistsPanel, { workOrder: workOrder([]), timeline: [], context: { tenantId: "t1" }, permissions: ALL, appearance }),
      ),
    );
    const roots = [...html.matchAll(/data-aparencia="([ABC])"/g)].map((match) => match[1]);
    assert.deepEqual(roots, [appearance], `aparência ${appearance}`);
  }
});
