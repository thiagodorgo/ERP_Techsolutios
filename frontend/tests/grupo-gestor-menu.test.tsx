import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { installMiniDom } from "./helpers/mini-dom";

// B-GRUPO-GESTOR-1b, Emenda 1b §2.5 — o item "Painel do grupo" no menu lateral:
//   GM-MENU-1 admin, gestor e finance têm o item em VISÃO GERAL, logo depois do Dashboard; os outros perfis não têm;
//   GM-MENU-2 aparece com 2 ou mais pátios no /group-panel/scope;
//   GM-MENU-3 some com 1 pátio, sem grupo, sem resposta e na paleta de comandos (fail-closed);
//   GM-MENU-4 o hook do AppShell: 403, 500 e resposta inválida viram "sem número" (o item some);
//   GM-MENU-5 uma leitura por organização ativa, nunca por render, e nenhuma outra rota;
//   GM-MENU-6 o esconde fino do menu do servidor continua valendo, e as duas condições são exigidas juntas;
//   GM-MENU-7 a fiação no AppShell.tsx (forma; a propriedade fica com o GM-MENU-5 e as capturas);
//   GM-MENU-8 a linha da tela em docs/navigation-matrix.md.
// O hook roda no mini-DOM do repositório, com o `fetch` como único dublê (molde de ass-10b-acoes.smoke.test.tsx).

process.env.VITE_USE_MOCKS = "false";
process.env.VITE_API_BASE_URL = "/api/v1";
installMiniDom();

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
const nav = await import("../src/layouts/appSidebarNav");
const { buildCommandDestinations } = await import("../src/components/command-palette/logic");
const { useGroupPanelMenuScope } = await import("../src/modules/group-panel/useGroupPanelMenuScope");

type ApiContext = import("../src/modules/group-panel/group-panel.types").GroupPanelApiContext;
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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(HERE, "..");
const REPO_DIR = path.resolve(FRONTEND_DIR, "..");
const GROUP = "/group";
const LABEL = "Painel do grupo";
const WITH_ITEM = ["admin", "gestor", "finance"] as const;
const WITHOUT_ITEM = ["dispatcher", "inventory", "support"] as const;
const ROLES_WITH_ITEM: readonly (readonly string[])[] = [["Administrador"], ["Gestor Operacional"], ["Financeiro"]];

const paths = (groups: readonly { readonly items: readonly { readonly path: string }[] }[]) => groups.flatMap((group) => group.items.map((item) => item.path));
const countGroup = (groups: Parameters<typeof paths>[0]) => paths(groups).filter((p) => p === GROUP).length;

// ---- o servidor de mentira: responde por método e caminho, registra tudo -------------------------------------------
type Call = { readonly method: string; readonly url: string };
type Reply = { readonly status: number; readonly body: unknown };
let calls: Call[] = [];
let reply: Reply = { status: 599, body: {} };

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls.push({ method: init?.method ?? "GET", url: String(input) });
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;

function scopeWith(count: number): Reply {
  const organizations = Array.from({ length: count }, (_, index) => ({ id: `org-${index}`, name: `Pátio ${index}`, finance: true, operations: true, staff: true }));
  return { status: 200, body: { data: { inGroup: count > 0, overLimit: false, omittedCount: 0, organizations } } };
}
const forbidden: Reply = { status: 403, body: { error: { code: "FORBIDDEN", reason: "not_group_manager", message: "sem a marca" } } };
const serverError: Reply = { status: 500, body: { error: { code: "INTERNAL", reason: "erro", message: "falha" } } };
const invalid: Reply = { status: 200, body: { data: { inGroup: true, organizations: [{ id: "a" }, { id: "b" }] } } };

// O hook montado num componente de sonda: o valor devolvido vai para `seen` a cada render. O disjuntor de 200 renders
// transforma um laço de render sem fim (efeito sem dependências) em falha do teste, em vez de travar a suíte.
const MAX_RENDERS = 200;
let seen: (number | null)[] = [];
function Probe(props: { readonly context: ApiContext | null; readonly tick: number }) {
  const value = useGroupPanelMenuScope(props.context);
  seen.push(value);
  if (seen.length > MAX_RENDERS) throw new Error(`render sem fim: mais de ${MAX_RENDERS} renders`);
  return React.createElement("span", { "data-tick": props.tick }, String(value));
}
const ctx = (tenantId: string): ApiContext => ({ token: "tok", tenantId, role: "tenant_admin", permissions: ["financial_entries:read"] });

async function mount(context: ApiContext | null) {
  const container = document.createElement("div");
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(React.createElement(Probe, { context, tick: 0 }));
  });
  await settle();
  return {
    rerender: async (next: ApiContext | null, tick: number) => {
      await act(async () => {
        root.render(React.createElement(Probe, { context: next, tick }));
      });
      await settle();
    },
    unmount: async () => {
      await act(async () => root.unmount());
    },
  };
}

test("GM-MENU-1 admin, gestor e finance têm \"Painel do grupo\" em VISÃO GERAL logo depois do Dashboard; os outros perfis não", () => {
  for (const kind of WITH_ITEM) {
    const visao = nav.NAV_BY_ROLE[kind].filter((group) => group.label === "VISÃO GERAL");
    assert.equal(visao.length, 1, `${kind}: grupos VISÃO GERAL`);
    assert.equal(visao[0].items[0]?.path, "/dashboard", `${kind}: o 1º item de VISÃO GERAL é o Dashboard`);
    assert.equal(visao[0].items[1]?.path, GROUP, `${kind}: o 2º item de VISÃO GERAL é o Painel do grupo`);
    assert.equal(visao[0].items[1]?.label, LABEL);
    assert.equal(countGroup(nav.NAV_BY_ROLE[kind]), 1, `${kind}: o item aparece uma vez só`);
  }
  for (const kind of WITHOUT_ITEM) assert.equal(countGroup(nav.NAV_BY_ROLE[kind]), 0, `${kind} não pode ter o item`);
  assert.equal(nav.MVP_NAV_PATHS.has(GROUP), true, "MVP_NAV_PATHS tem /group");
  assert.equal(nav.GROUP_PANEL_PATH, GROUP);
  assert.doesNotMatch(LABEL, /tenant|scope|group|manager/i, "o rótulo não tem termo técnico");
});

test("GM-MENU-2 com 2, 3 e 30 pátios o item aparece uma vez, para Administrador, Gestor Operacional e Financeiro", () => {
  for (const roles of ROLES_WITH_ITEM) {
    for (const count of [2, 3, 30]) {
      assert.equal(countGroup(nav.buildSidebarNav(roles, new Set(), count)), 1, `${roles[0]} com ${count} pátios`);
    }
  }
  assert.equal(nav.groupPanelNavVisible(2), true);
});

test("GM-MENU-3 com 1 pátio, sem grupo, sem resposta ou sem o 3º argumento o item some; a paleta nunca o mostra", () => {
  for (const roles of ROLES_WITH_ITEM) {
    for (const count of [1, 0, null]) {
      assert.equal(countGroup(nav.buildSidebarNav(roles, new Set(), count)), 0, `${roles[0]} com ${String(count)}`);
    }
    assert.equal(countGroup(nav.buildSidebarNav(roles)), 0, `${roles[0]} sem o 3º argumento`);
    assert.equal(countGroup(nav.buildSidebarNav(roles, new Set())), 0, `${roles[0]} sem o 3º argumento, com o 2º`);
    const destinations = buildCommandDestinations(roles, () => true);
    assert.equal(destinations.some((destination) => destination.path === GROUP), false, `${roles[0]}: a paleta não tem /group`);
  }
  for (const count of [1, 0, null]) assert.equal(nav.groupPanelNavVisible(count), false, `groupPanelNavVisible(${String(count)})`);
});

test("GM-MENU-4 o hook: 403 not_group_manager, 500 e resposta inválida dão null; 1 pátio dá 1; 2 dão 2", async () => {
  const cases: readonly { readonly name: string; readonly reply: Reply; readonly expected: number | null; readonly shows: boolean }[] = [
    { name: "403 not_group_manager", reply: forbidden, expected: null, shows: false },
    { name: "500", reply: serverError, expected: null, shows: false },
    { name: "resposta inválida", reply: invalid, expected: null, shows: false },
    { name: "1 pátio", reply: scopeWith(1), expected: 1, shows: false },
    { name: "2 pátios", reply: scopeWith(2), expected: 2, shows: true },
  ];
  for (const item of cases) {
    calls = [];
    seen = [];
    reply = item.reply;
    const probe = await mount(ctx("tenant-a"));
    const value = seen[seen.length - 1];
    assert.equal(value, item.expected, `${item.name}: valor do hook`);
    assert.equal(seen[0], null, `${item.name}: antes da resposta o valor é null`);
    assert.equal(calls.length, 1, `${item.name}: uma leitura`);
    for (const roles of ROLES_WITH_ITEM) {
      assert.equal(countGroup(nav.buildSidebarNav(roles, new Set(), value ?? null)) === 1, item.shows, `${item.name}: ${roles[0]}`);
    }
    await probe.unmount();
  }
});

test("GM-MENU-5 uma leitura por organização ativa: 5 renders sem troca = 1 GET; troca de organização = 2º; contexto null = 0", async () => {
  calls = [];
  seen = [];
  reply = scopeWith(2);
  const probe = await mount(ctx("tenant-a"));
  for (let tick = 1; tick <= 5; tick++) await probe.rerender(ctx("tenant-a"), tick); // objeto novo a cada render
  assert.equal(calls.length, 1, `5 renders com a mesma organização: ${calls.length} leituras`);
  await probe.rerender(ctx("tenant-b"), 6);
  assert.equal(calls.length, 2, `trocar a organização ativa faz a 2ª leitura: ${calls.length}`);
  assert.equal(seen[seen.length - 1], 2);
  for (const call of calls) {
    assert.equal(call.method, "GET");
    assert.equal(call.url, "/api/v1/group-panel/scope", `nenhuma outra rota: ${call.url}`);
  }
  assert.equal(calls.some((call) => call.url.includes("/group-panel/summary")), false, "o menu nunca lê o /summary");
  await probe.rerender(null, 7);
  assert.equal(seen[seen.length - 1], null, "perder o contexto esconde o item");
  assert.equal(calls.length, 2, "contexto null não lê");
  await probe.unmount();

  calls = [];
  seen = [];
  const none = await mount(null);
  for (let tick = 1; tick <= 3; tick++) await none.rerender(null, tick);
  assert.equal(calls.length, 0, `contexto null: ${calls.length} leituras`);
  assert.deepEqual([...new Set(seen)], [null]);
  await none.unmount();
});

test("GM-MENU-6 o esconde fino continua valendo, e o item exige as duas condições juntas", () => {
  const governed = [GROUP, "/finance"];
  const withoutPath = nav.computeHiddenNavPaths([{ path: "/finance" }, { path: "/dashboard" }], governed);
  const withPath = nav.computeHiddenNavPaths([{ path: GROUP, status: "implemented" }, { path: "/finance" }], governed);
  for (const roles of ROLES_WITH_ITEM) {
    assert.equal(countGroup(nav.buildSidebarNav(roles, withoutPath, 2)), 0, `${roles[0]}: 2 pátios, sem /group no menu do servidor`);
    assert.equal(countGroup(nav.buildSidebarNav(roles, withPath, 1)), 0, `${roles[0]}: /group no menu do servidor, 1 pátio`);
    assert.equal(countGroup(nav.buildSidebarNav(roles, withPath, null)), 0, `${roles[0]}: /group no menu do servidor, sem resposta`);
    assert.equal(countGroup(nav.buildSidebarNav(roles, withPath, 2)), 1, `${roles[0]}: as duas condições`);
  }
});

test("GM-MENU-7 a fiação no AppShell.tsx: 1 hook, 1 buildSidebarNav com o 3º argumento, contexto gated por financial_entries:read", () => {
  const shell = readFileSync(path.join(FRONTEND_DIR, "src/layouts/AppShell.tsx"), "utf8").replace(/\r/g, "");
  assert.equal(shell.split("useGroupPanelMenuScope(").length - 1, 1, "exatamente 1 chamada do hook");
  assert.equal(shell.split("buildSidebarNav(").length - 1, 1, "exatamente 1 buildSidebarNav(");
  assert.match(shell, /buildSidebarNav\(session\?\.user\?\.roles \?\? \[\], hidden, groupPanelOrganizations\)/, "o buildSidebarNav recebe o 3º argumento");
  assert.match(shell, /const groupPanelOrganizations = useGroupPanelMenuScope\(groupPanelContext\);/);
  assert.match(
    shell,
    /const groupPanelContext = useMemo\(\(\) => \{\n\s*if \(!activeContext \|\| !permissions\.includes\("financial_entries:read"\)\) return null;/,
    "o contexto do hook é gated por financial_entries:read",
  );
  assert.match(shell, /\}, \[session\?\.user\?\.roles, menu\.items, menu\.governedPaths, groupPanelOrganizations\]\);/, "o useMemo do menu depende do número de pátios");
});

test("GM-MENU-8 docs/navigation-matrix.md tem UMA linha da tela /group, com financial_entries:read", () => {
  const matrix = readFileSync(path.join(REPO_DIR, "docs/navigation-matrix.md"), "utf8");
  const lines = matrix.split(/\r?\n/).filter((line) => line.startsWith("|") && line.includes("`/group`"));
  assert.equal(lines.length, 1, `linhas da matriz com /group: ${lines.length}`);
  assert.match(lines[0], /`financial_entries:read`/);
  assert.match(lines[0], new RegExp(`^\\| ${LABEL} `));
});
