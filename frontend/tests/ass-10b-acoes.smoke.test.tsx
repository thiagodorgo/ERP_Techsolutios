import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10b (T5) · as escritas da tela (plano v2 §6.4, §6.4.1, §6.4.2, §6.4.3; Emenda 1, A1-r2) e o rateio em
// processamento. A F1 trouxe o T-ACT-3 (a leitura dos 4 estados do rateio); a F7 acrescenta T-ACT-1, T-ACT-2, T-FX-2, a
// parte de tela do T-FX-3, T-GRP-3, T-GRP-4 e T-GRP-5 — as janelas montadas no mini-DOM do repositório, com o `fetch`
// como único dublê (cada chamada registrada com método, caminho e corpo).

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
const { mapAllocationRun } = await import("../src/modules/platform/cloud-billing/cloud-billing.adapter");
const { cloudBillingActions } = await import("../src/modules/platform/cloud-billing/useCloudBillingActions");
const { NO_WRITE_ACCESS } = await import("../src/modules/platform/cloud-billing/cloud-billing.access");
const { CloudBillingDialogs } = await import("../src/modules/platform/cloud-billing/components/CloudBillingDialogs");
const { CloudBillingViewA } = await import("../src/modules/platform/cloud-billing/views/CloudBillingViewA");
const state = await import("../src/modules/platform/cloud-billing/cloud-billing.state");
const fixture = await import("./helpers/cloud-billing.fixture");

type Access = import("../src/modules/platform/cloud-billing/cloud-billing.access").CloudBillingAccess;
type DialogAction = import("../src/modules/platform/cloud-billing/components/CloudBillingDialogs").DialogAction;
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

const FULL: Access = { importCosts: true, readImports: true, runAllocation: true, manageBilling: true };
const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---- o servidor de mentira: responde por método e caminho, registra tudo -------------------------------------------
type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Reply = { readonly status?: number; readonly data?: unknown; readonly reason?: string };
type Route = (call: Call) => Reply | undefined;
let calls: Call[] = [];
let routes: Route[] = [];

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const call: Call = { method: init?.method ?? "GET", url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined };
  calls.push(call);
  for (const route of routes) {
    const reply = route(call);
    if (reply) {
      const status = reply.status ?? 200;
      const body = status >= 400 ? { error: { code: "ERRO", reason: reply.reason ?? "erro", message: "falha" } } : { data: reply.data };
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }
  }
  return new Response(JSON.stringify({ error: { code: "SEM_ROTA", reason: "sem_rota", message: call.url } }), { status: 599, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;

function serve(...list: Route[]) {
  calls = [];
  routes = list;
}
const writes = () => calls.filter((call) => call.method !== "GET");
const on = (method: string, pathPart: string, reply: Reply | ((call: Call) => Reply)): Route => (call) => (call.method === method && call.url.includes(pathPart) ? (typeof reply === "function" ? reply(call) : reply) : undefined);

const member = (tenantId: string, tenantName: string, validFrom: string, validTo: string | null = null, scheduled = false) => ({ tenantId, tenantName, validFrom, validTo, scheduled });
const groupDetail = (members: unknown[]) => ({ id: "g1", name: "Grupo Vale", notes: null, memberCount: 2, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", members });
const G1_MEMBERS = [member("t2", "Frota Vale Transportes", "2026-06-01"), member("t9", "Reboque Rápido Norte", "2026-12-01", null, true)];
const tenantOverviewRoute = on("GET", "/platform/billing/overview", { data: fixture.tenantPayload(fixture.CURRENT_MONTH) });

// ---- montagem das janelas -------------------------------------------------------------------------------------------
type Model = ReturnType<typeof fixture.fixtureModel>;
type Mounted = { readonly container: MiniDomElement; readonly done: string[]; readonly months: string[]; readonly model: Model; readonly rerender: (next: Model) => Promise<void>; readonly unmount: () => Promise<void> };

async function openDialog(dialog: DialogAction, access: Access = FULL, ui = state.INITIAL_UI): Promise<Mounted> {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  const done: string[] = [];
  const months: string[] = [];
  const model = fixture.fixtureModel(ui);
  const render = (current: Model) =>
    root.render(React.createElement(CloudBillingDialogs, { dialog, model: current, access, actions: cloudBillingActions(access), onClose: () => done.push("fechou"), onDone: () => done.push("releu"), onMonth: (month: string) => months.push(month) }));
  await act(async () => {
    render(model);
  });
  await settle();
  return {
    container,
    done,
    months,
    model,
    rerender: async (next: Model) => {
      await act(async () => {
        render(next);
      });
      await settle();
    },
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

const button = (container: MiniDomElement, label: RegExp) => elements(container, (el) => el.localName === "button" && label.test(text(el)))[0];
async function click(el: MiniDomElement | undefined) {
  assert.ok(el, "botão ausente");
  await act(async () => (propsOf(el).onClick as () => void)());
  await settle();
}
async function type(el: MiniDomElement | undefined, value: string) {
  assert.ok(el, "campo ausente");
  await act(async () => (propsOf(el).onChange as (event: unknown) => void)({ currentTarget: { value }, target: { value } }));
}
async function check(el: MiniDomElement | undefined, checked: boolean) {
  assert.ok(el, "caixa ausente");
  await act(async () => (propsOf(el).onChange as (event: unknown) => void)({ currentTarget: { checked }, target: { checked } }));
}
const byData = (container: MiniDomElement, attribute: string, value = "") => elements(container, (el) => el.getAttribute(attribute) === value)[0];
const notice = (container: MiniDomElement) => elements(container, (el) => el.hasAttribute("data-aviso")).map((el) => text(el)).join(" | ");

// ---------------------------------------------------------------------------------------------------------------------
const RUN = {
  id: "run-1",
  provider: "aws",
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T00:00:00.000Z",
  startedAt: "2026-11-04T12:13:00.000Z",
  createdAt: "2026-11-04T12:13:00.000Z",
  metadata: { importResolution: "latest_completed" },
};

test("T-ACT-3 o rateio pending e processing é lido como tal (nunca como concluído nem como falha)", () => {
  for (const status of ["pending", "processing", "completed", "failed"] as const) {
    assert.equal(mapAllocationRun({ ...RUN, status }).status, status, status);
  }
  const unknown = mapAllocationRun({ ...RUN, status: "running" });
  assert.notEqual(unknown.status, "completed", "estado desconhecido nunca vira concluído");
  assert.equal(mapAllocationRun({ ...RUN, status: "processing" }).startedAt, "2026-11-04T12:13:00.000Z");
  assert.equal(mapAllocationRun({ ...RUN, status: "completed" }).periodMonth, "2026-10");
});

test("T-ACT-3 (tela) o rateio pending ou processing aparece como 'em processamento desde…', sem tempo calculado", () => {
  for (const status of ["pending", "processing"]) {
    const model = fixture.fixtureModel(state.INITIAL_UI, { runs: [{ ...RUN, status }] });
    assert.equal(model.pendingRun?.status, status);
    const html = renderToString(React.createElement(CloudBillingViewA, { model, access: FULL, onTarget: () => undefined, onToggleRow: () => undefined, onClearTarget: () => undefined, onMode: () => undefined, onSearch: () => undefined, onMonth: () => undefined, onAction: () => undefined, onRetrySeries: () => undefined }));
    assert.match(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), /em processamento desde \d{2}\/\d{2} \d{2}:\d{2}/, status);
  }
});

function sourcesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? sourcesUnder(target) : /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}

test("T-ACT-1 sai o corpo fixo do rateio; o rateio usa o mês da tela, inclusive fevereiro bissexto", async () => {
  const offenders = sourcesUnder(path.join(HERE, "../src")).filter((file) => /defaultPeriodBody|manual-ui/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
  serve(on("POST", "/platform/cloud-cost-allocations/runs", { status: 201, data: { ...RUN, id: "run-2", status: "completed" } }));
  const result = await cloudBillingActions(FULL).runAllocation("2028-02");
  assert.equal(result.ok, true);
  assert.deepEqual(writes().map((call) => [call.method, call.body]), [["POST", { periodStart: "2028-02-01", periodEnd: "2028-02-29" }]]);
});

test("T-ACT-1 (A5) sem a permissão de cada botão, o botão não está no HTML e a ação chamada direto faz zero requisição", async () => {
  const render = (access: Access, ui = state.INITIAL_UI) =>
    renderToString(React.createElement(CloudBillingViewA, { model: fixture.fixtureModel(ui), access, onTarget: () => undefined, onToggleRow: () => undefined, onClearTarget: () => undefined, onMode: () => undefined, onSearch: () => undefined, onMonth: () => undefined, onAction: () => undefined, onRetrySeries: () => undefined })).replace(/<[^>]+>/g, " ");
  const tenantOpen = { ...state.INITIAL_UI, aberta: "t:t2" };
  const groupOpen = { ...state.INITIAL_UI, modo: "group" as const, aberta: "g:g1" };
  // controle: com tudo, os botões aparecem
  assert.match(render(FULL), /Importar arquivo de custo/);
  assert.match(render(FULL), /Rodar rateio do mês/);
  assert.match(render(FULL, tenantOpen), /Mudar de grupo/);
  for (const label of [/Editar membros/, /Renomear/, /Excluir grupo/, /Novo grupo/]) assert.match(render(FULL, groupOpen), label);
  // cada grupo de botões com a própria permissão
  assert.doesNotMatch(render({ ...FULL, importCosts: false }), /Importar arquivo de custo/);
  assert.doesNotMatch(render({ ...FULL, runAllocation: false }), /Rodar rateio do mês/);
  assert.doesNotMatch(render({ ...FULL, manageBilling: false }, tenantOpen), /Mudar de grupo/);
  for (const label of [/Editar membros/, /Renomear/, /Excluir grupo/, /Novo grupo/]) assert.doesNotMatch(render({ ...FULL, manageBilling: false }, groupOpen), label);
  assert.match(render(NO_WRITE_ACCESS), /Dólar do mês/, "o dólar continua visível para quem lê");
  // defesa em profundidade: a ação chamada direto, sem a permissão, não chama o servidor
  serve(() => ({ status: 200, data: {} }));
  const actions = cloudBillingActions(NO_WRITE_ACCESS);
  const results = [
    await actions.importCsv("a,b\n1,2"),
    await actions.runAllocation("2026-10"),
    await actions.saveFxRate("2026-10", "5.41"),
    await actions.createGroup("Grupo X", null),
    await actions.renameGroup("g1", "Grupo Y", null),
    await actions.deleteGroup("g1"),
    await actions.putMembers("g1", { tenantIds: ["t1"], validFrom: "2026-11-14" }),
  ];
  assert.equal(calls.length, 0, "nenhuma requisição sem permissão");
  for (const result of results) assert.deepEqual(result, { ok: false, reason: "sem_permissao" });
});

test("T-ACT-1 (A5) sem billing:manage, a janela do dólar abre só o histórico: sem campo e sem Salvar", async () => {
  serve();
  const view = await openDialog({ kind: "fx" }, { ...FULL, manageBilling: false });
  try {
    assert.equal(byData(view.container, "data-taxa"), undefined, "sem campo");
    assert.equal(button(view.container, /Salvar/), undefined, "sem Salvar");
    assert.match(text(view.container), /Seu perfil só consulta o dólar/);
    assert.match(text(view.container), /Histórico de outubro de 2026/);
    assert.equal(calls.length, 0);
  } finally {
    await view.unmount();
  }
});

test("T-FX-2 pela janela: digitar 5,41 mostra o eco e salvar envia {currencyFrom: USD, rate: 5.41}; entrada inválida faz zero chamada", async () => {
  serve(on("PUT", "/platform/billing/fx-rates/2026-10", (call) => ({ data: { current: { month: "2026-10", currencyFrom: "USD", currencyTo: "BRL", rate: `${(call.body as { rate: string }).rate}0000`.slice(0, 8), version: 3, createdAt: "2026-11-14T12:00:00.000Z" }, history: [] } })));
  const view = await openDialog({ kind: "fx" });
  try {
    const input = byData(view.container, "data-taxa");
    await type(input, "5,4,1");
    assert.equal(byData(view.container, "data-eco"), undefined, "entrada inválida não tem eco");
    await click(button(view.container, /Salvar nova versão/));
    assert.equal(calls.length, 0, "entrada inválida: zero chamada");
    assert.match(text(view.container), /Digite um número maior que zero/);
    await type(byData(view.container, "data-taxa"), "5,41");
    assert.match(text(byData(view.container, "data-eco")!).replace(/\s/g, " "), /1 dólar = R\$ 5,410000/);
    await click(button(view.container, /Salvar nova versão/));
    assert.deepEqual(writes().map((call) => [call.method, call.body]), [["PUT", { currencyFrom: "USD", rate: "5.41" }]]);
    assert.match(notice(view.container), /salvo/);
    assert.deepEqual(view.done, ["releu"]);
  } finally {
    await view.unmount();
  }
});

test("T-FX-3 (tela) a resposta com uma taxa diferente da enviada vira erro na janela, que não fecha e relê o mês", async () => {
  serve(on("PUT", "/platform/billing/fx-rates/2026-10", { data: { current: { month: "2026-10", currencyFrom: "USD", currencyTo: "BRL", rate: "541.000000", version: 3, createdAt: "2026-11-14T12:00:00.000Z" }, history: [] } }));
  const view = await openDialog({ kind: "fx" });
  try {
    await type(byData(view.container, "data-taxa"), "5,41");
    await click(button(view.container, /Salvar nova versão/));
    assert.match(notice(view.container), /gravou um dólar diferente do enviado/);
    assert.ok(button(view.container, /Salvar nova versão/), "a janela continua aberta no formulário");
    assert.deepEqual(view.done, ["releu"], "relê o mês, sem fechar");
  } finally {
    await view.unmount();
  }
});

test("T-ACT-2 cada resposta do servidor vira a mensagem certa, e nenhum valor muda sem releitura", async () => {
  const cases: { readonly dialog: DialogAction; readonly route: Route[]; readonly act: (container: MiniDomElement) => Promise<void>; readonly expect: RegExp; readonly reread: boolean }[] = [
    { dialog: { kind: "run" }, route: [on("POST", "/runs", { status: 422, reason: "import_not_completed" })], act: async (c) => click(button(c, /Rodar rateio de/)), expect: /ainda não terminou de importar/, reread: false },
    { dialog: { kind: "run" }, route: [on("POST", "/runs", { status: 500 })], act: async (c) => click(button(c, /Rodar rateio de/)), expect: /O rateio falhou/, reread: false },
    { dialog: { kind: "run" }, route: [on("POST", "/runs", { status: 201, data: { ...RUN, id: "run-9", status: "completed" } })], act: async (c) => click(button(c, /Rodar rateio de/)), expect: /concluído/, reread: true },
    { dialog: { kind: "fx" }, route: [on("PUT", "/fx-rates/", { status: 422, reason: "rate_invalid" })], act: async (c) => { await type(byData(c, "data-taxa"), "5,41"); await click(button(c, /Salvar nova versão/)); }, expect: /recusou a taxa/, reread: false },
    { dialog: { kind: "fx" }, route: [on("PUT", "/fx-rates/", { status: 422, reason: "fx_month_in_future" })], act: async (c) => { await type(byData(c, "data-taxa"), "5,41"); await click(button(c, /Salvar nova versão/)); }, expect: /ainda não começou/, reread: false },
    { dialog: { kind: "group-new" }, route: [on("POST", "/economic-groups", { status: 409, reason: "group_name_exists" })], act: async (c) => { await type(byData(c, "data-nome"), "Grupo Vale"); await click(button(c, /Criar grupo/)); }, expect: /Já existe um grupo com esse nome/, reread: false },
    { dialog: { kind: "group-rename", groupId: "g1" }, route: [on("PATCH", "/economic-groups/g1", { data: { id: "g1", name: "Grupo Vale Novo", notes: null, memberCount: 2 } })], act: async (c) => { await type(byData(c, "data-nome"), "Grupo Vale Novo"); await click(button(c, /Salvar nome/)); }, expect: /Nome salvo/, reread: true },
    { dialog: { kind: "group-delete", groupId: "g2" }, route: [on("GET", "/economic-groups/g2", { data: { ...groupDetail([]), id: "g2", name: "Grupo Vazio" } }), on("DELETE", "/economic-groups/g2", { status: 422, reason: "group_has_members" })], act: async (c) => click(button(c, /^Excluir grupo$/)), expect: /Este grupo tem organizações/, reread: false },
    { dialog: { kind: "group-members", groupId: "g1" }, route: [on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), tenantOverviewRoute, on("PUT", "/members", { status: 422, reason: "tenant_in_another_group" })], act: async (c) => { await check(byData(c, "data-membro", "t1"), true); await click(button(c, /^Salvar$/)); }, expect: /já está em outro grupo/, reread: false },
    { dialog: { kind: "group-members", groupId: "g1" }, route: [on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), tenantOverviewRoute, on("PUT", "/members", { status: 409, reason: "membership_conflict" })], act: async (c) => { await check(byData(c, "data-membro", "t1"), true); await click(button(c, /^Salvar$/)); }, expect: /Outra pessoa mudou este grupo agora/, reread: false },
  ];
  for (const item of cases) {
    serve(...item.route);
    const view = await openDialog(item.dialog);
    try {
      await item.act(view.container);
      assert.match(notice(view.container) + text(view.container), item.expect, `${item.dialog.kind}: ${item.expect}`);
      assert.deepEqual(view.done, item.reread ? ["releu"] : [], `${item.dialog.kind}: releitura só depois do sucesso`);
    } finally {
      await view.unmount();
    }
  }
});

test("T-ACT-2 a importação: 1.000.001 caracteres não são enviados; 413, 400 e falha viram mensagem; arquivo de outro mês avisa com atalho", async () => {
  const file = (content: string, name = "custo.csv") => ({ name, size: content.length, text: async () => content });
  const choose = async (container: MiniDomElement, content: string) => {
    const input = byData(container, "data-arquivo");
    assert.ok(input);
    await act(async () => {
      await (propsOf(input).onChange as (event: unknown) => Promise<void>)({ currentTarget: { files: [file(content)] }, target: { files: [file(content)] } });
    });
    await settle();
  };
  // texto acima do limite: a janela bloqueia e não envia
  serve(on("POST", "/manual-csv", { status: 201, data: fixture.IMPORTS_PAYLOAD[0] }));
  let view = await openDialog({ kind: "import" });
  try {
    await choose(view.container, "x".repeat(1_000_001));
    await click(button(view.container, /Importar arquivo/));
    assert.equal(writes().length, 0, "acima de 1 MB: zero envio");
    assert.match(notice(view.container), /passa de 1 MB/);
  } finally {
    await view.unmount();
  }
  for (const [reply, expected] of [
    [{ status: 413, reason: "csv_too_large" }, /passa de 1 MB/],
    [{ status: 400, reason: "csv_required" }, /está vazio/],
    [{ status: 500 }, /A importação falhou/],
  ] as const) {
    serve(on("POST", "/manual-csv", reply));
    view = await openDialog({ kind: "import" });
    try {
      await choose(view.container, "a,b\n1,2");
      await click(button(view.container, /Importar arquivo/));
      assert.equal(writes().length, 1);
      assert.match(notice(view.container), expected);
      assert.deepEqual(view.done, []);
    } finally {
      await view.unmount();
    }
  }
  serve(on("POST", "/manual-csv", { status: 201, data: { ...fixture.IMPORTS_PAYLOAD[0], periodStart: "2026-09-01T00:00:00.000Z", metadata: { duplicateRowsSkipped: 2 } } }));
  view = await openDialog({ kind: "import" });
  try {
    await choose(view.container, "a,b\n1,2");
    await click(button(view.container, /Importar arquivo/));
    assert.deepEqual(writes().map((call) => [call.method, call.body]), [["POST", { csv: "a,b\n1,2", metadata: { source: "platform-cloud-billing" } }]]);
    assert.match(notice(view.container), /O arquivo é de setembro de 2026/);
    assert.match(notice(view.container), /2 linhas repetidas foram ignoradas/);
    assert.deepEqual(view.done, ["releu"]);
    await click(button(view.container, /Ver setembro de 2026/));
    assert.deepEqual(view.months, ["2026-09"]);
  } finally {
    await view.unmount();
  }
});

test("T-GRP-3 cada confirmação de janela de grupo faz no máximo 1 chamada que não é GET; 'Mudar de grupo' de quem tem grupo só oferece 'Sem grupo'", async () => {
  const flows: { readonly dialog: DialogAction; readonly route: Route[]; readonly act: (container: MiniDomElement) => Promise<void> }[] = [
    { dialog: { kind: "group-new" }, route: [on("POST", "/economic-groups", { status: 201, data: { id: "g3", name: "Grupo Novo", notes: null, memberCount: 0 } })], act: async (c) => { await type(byData(c, "data-nome"), "Grupo Novo"); await click(button(c, /Criar grupo/)); } },
    { dialog: { kind: "group-rename", groupId: "g1" }, route: [on("PATCH", "/economic-groups/g1", { data: { id: "g1", name: "Outro", notes: null, memberCount: 2 } })], act: async (c) => { await type(byData(c, "data-nome"), "Outro"); await click(button(c, /Salvar nome/)); } },
    { dialog: { kind: "group-delete", groupId: "g2" }, route: [on("GET", "/economic-groups/g2", { data: { ...groupDetail([]), id: "g2", name: "Grupo Vazio" } }), on("DELETE", "/economic-groups/g2", { data: { id: "g2", name: "Grupo Vazio", notes: null, memberCount: 0 } })], act: async (c) => click(button(c, /^Excluir grupo$/)) },
    { dialog: { kind: "group-members", groupId: "g1" }, route: [on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), tenantOverviewRoute, on("PUT", "/members", (call) => ({ data: groupDetail((call.body as { tenantIds: string[] }).tenantIds.map((id) => member(id, id, "2026-11-14"))) }))], act: async (c) => { await check(byData(c, "data-membro", "t1"), true); await click(button(c, /^Salvar$/)); } },
    // organização SEM grupo (t1) → escolhe o grupo: 1 PUT no grupo de destino
    { dialog: { kind: "move", tenantId: "t1" }, route: [on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), on("PUT", "/members", (call) => ({ data: groupDetail((call.body as { tenantIds: string[] }).tenantIds.map((id) => member(id, id, "2026-11-14"))) }))], act: async (c) => { await type(byData(c, "data-grupo-sel"), "g1"); await settle(); await click(button(c, /^Salvar$/)); } },
    // organização EM um grupo (t2) → "Sem grupo": 1 PUT no grupo atual
    { dialog: { kind: "move", tenantId: "t2" }, route: [on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), on("PUT", "/members", (call) => ({ data: groupDetail((call.body as { tenantIds: string[] }).tenantIds.map((id) => member(id, id, "2026-11-14"))) }))], act: async (c) => click(button(c, /^Salvar$/)) },
  ];
  for (const flow of flows) {
    serve(...flow.route);
    const view = await openDialog(flow.dialog);
    try {
      await flow.act(view.container);
      assert.equal(writes().length, 1, `${flow.dialog.kind}: uma escrita só (${JSON.stringify(writes().map((call) => `${call.method} ${call.url}`))})`);
      assert.deepEqual(view.done, ["releu"], `${flow.dialog.kind}: sucesso`);
    } finally {
      await view.unmount();
    }
  }
  // o conteúdo das duas escritas de "Mudar de grupo"
  serve(on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), on("PUT", "/members", (call) => ({ data: groupDetail((call.body as { tenantIds: string[] }).tenantIds.map((id) => member(id, id, "2026-11-14"))) })));
  let view = await openDialog({ kind: "move", tenantId: "t2" });
  try {
    const select = byData(view.container, "data-grupo-sel");
    assert.deepEqual(elements(select!, (el) => el.localName === "option").map((el) => text(el)), ["Sem grupo"], "quem tem grupo só vê 'Sem grupo'");
    assert.match(text(byData(view.container, "data-explica")!), /Para passar a outro grupo, tire-a do grupo atual/);
    await click(button(view.container, /^Salvar$/));
    assert.deepEqual(writes().map((call) => [call.method, call.url.replace(/^.*\/platform/, "/platform"), call.body]), [["PUT", "/platform/billing/economic-groups/g1/members", { tenantIds: ["t9"], validFrom: fixture.TODAY }]]);
  } finally {
    await view.unmount();
  }
  serve(on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), on("PUT", "/members", (call) => ({ data: groupDetail((call.body as { tenantIds: string[] }).tenantIds.map((id) => member(id, id, "2026-11-14"))) })));
  view = await openDialog({ kind: "move", tenantId: "t1" });
  try {
    await type(byData(view.container, "data-grupo-sel"), "g1");
    await settle();
    await click(button(view.container, /^Salvar$/));
    assert.deepEqual(writes().map((call) => call.body), [{ tenantIds: ["t1", "t2", "t9"], validFrom: fixture.TODAY }]);
  } finally {
    await view.unmount();
  }
});

test("T-GRP-4 membros diferentes entre abrir e gravar: zero PUT e a mensagem; resposta sem um id enviado: aviso e releitura", async () => {
  let reads = 0;
  serve(on("GET", "/economic-groups/g1", () => ({ data: groupDetail(++reads === 1 ? G1_MEMBERS : [...G1_MEMBERS, member("t4", "Pátio Central Logística", "2026-11-14")]) })), tenantOverviewRoute, on("PUT", "/members", { data: groupDetail(G1_MEMBERS) }));
  let view = await openDialog({ kind: "group-members", groupId: "g1" });
  try {
    await check(byData(view.container, "data-membro", "t1"), true);
    await click(button(view.container, /^Salvar$/));
    assert.equal(writes().length, 0, "edição simultânea: zero PUT");
    assert.match(notice(view.container), /Outra pessoa mudou este grupo agora/);
    assert.deepEqual(view.done, []);
  } finally {
    await view.unmount();
  }
  serve(on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), tenantOverviewRoute, on("PUT", "/members", { data: groupDetail(G1_MEMBERS) }));
  view = await openDialog({ kind: "group-members", groupId: "g1" });
  try {
    await check(byData(view.container, "data-membro", "t1"), true);
    await click(button(view.container, /^Salvar$/));
    assert.equal(writes().length, 1);
    assert.match(notice(view.container), /não confirmou todos os vínculos/);
    assert.deepEqual(view.done, ["releu"]);
  } finally {
    await view.unmount();
  }
});

test("T-GRP-5 (F11) depois de salvar, a caixa mostra o grupo que o servidor devolveu: quem entrou está no grupo", async () => {
  serve(on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), tenantOverviewRoute, on("PUT", "/members", { data: groupDetail([member("t1", "Guincho Exemplo Ltda", fixture.TODAY), member("t2", "Frota Vale Transportes", "2026-06-01"), member("t9", "Reboque Rápido Norte", "2026-12-01", null, true)]) }));
  const view = await openDialog({ kind: "group-members", groupId: "g1" });
  try {
    const added = () => byData(view.container, "data-membro", "t1")!;
    assert.match(text(added().parentNode as MiniDomElement), /sem grupo/, "antes: sem grupo");
    await check(added(), true);
    await click(button(view.container, /^Salvar$/));
    assert.match(notice(view.container), /Vínculos salvos/);
    assert.match(text(added().parentNode as MiniDomElement), /no grupo/, "depois: no grupo, pela resposta");
    assert.doesNotMatch(text(added().parentNode as MiniDomElement), /sem grupo/);
    assert.equal(propsOf(added()).checked, true);
    assert.match(text(byData(view.container, "data-membro", "t9")!.parentNode as MiniDomElement), /entra em 01\/12\/2026/, "o agendado continua agendado");
  } finally {
    await view.unmount();
  }
});

test("T-GRP-3 (F11) 'Mudar de grupo': depois de salvar e a tela reler, a janela continua a mostrar a operação feita", async () => {
  serve(on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), on("PUT", "/members", { data: groupDetail([member("t1", "Guincho Exemplo Ltda", fixture.TODAY), ...G1_MEMBERS]) }));
  const view = await openDialog({ kind: "move", tenantId: "t1" });
  try {
    await type(byData(view.container, "data-grupo-sel"), "g1");
    await settle();
    await click(button(view.container, /^Salvar$/));
    assert.deepEqual(view.done, ["releu"]);
    // a tela releu: hoje t1 está no g1
    await view.rerender({ ...view.model, currentGroupByTenant: { ...view.model.currentGroupByTenant, t1: { groupId: "g1", groupName: "Grupo Vale" } } });
    const options = elements(byData(view.container, "data-grupo-sel")!, (el) => el.localName === "option").map((el) => text(el));
    assert.ok(options.includes("Grupo Vale"), `o destino escolhido continua na janela (${options.join(" | ")})`);
    assert.doesNotMatch(text(view.container), /Hoje em Grupo Vale/, "a janela não vira a operação oposta");
    assert.equal(writes().length, 1, "uma escrita só");
  } finally {
    await view.unmount();
  }
});

test("T-GRP-5 (A1-r2) grupo com 1 vigente e 1 agendado: marcar uma 3ª e salvar envia as 3; a caixa do agendado vem marcada e desabilitada", async () => {
  serve(on("GET", "/economic-groups/g1", { data: groupDetail(G1_MEMBERS) }), tenantOverviewRoute, on("PUT", "/members", (call) => ({ data: groupDetail((call.body as { tenantIds: string[] }).tenantIds.map((id) => member(id, id, "2026-11-14"))) })));
  const view = await openDialog({ kind: "group-members", groupId: "g1" });
  try {
    const scheduled = byData(view.container, "data-membro", "t9");
    assert.ok(scheduled, "o agendado aparece na caixa");
    assert.equal(propsOf(scheduled).checked, true, "o agendado vem marcado (A1-r2 (i))");
    assert.equal(propsOf(scheduled).disabled, true, "o agendado não pode ser desmarcado (A1-r2 (iii))");
    assert.match(text(scheduled.parentNode as MiniDomElement), /entra em 01\/12\/2026/);
    assert.equal(propsOf(byData(view.container, "data-membro", "t2")!).checked, true, "o vigente vem marcado");
    await check(byData(view.container, "data-membro", "t1"), true);
    await click(button(view.container, /^Salvar$/));
    assert.deepEqual(writes().map((call) => call.body), [{ tenantIds: ["t1", "t2", "t9"], validFrom: fixture.TODAY }]);
    assert.match(notice(view.container), /Vínculos salvos/);
  } finally {
    await view.unmount();
  }
});
