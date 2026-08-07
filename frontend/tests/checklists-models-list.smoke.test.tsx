import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// CHECKLIST P1 PR-02a — smoke da LISTA de "Modelos de Checklist" recriada sobre o protótipo do dono
// (Modelos de Checklist.dc.html): header com kicker/subtítulo, filtro de situação, KPIs contados do
// payload REAL (zeros honestos — D-007), vazio verbatim, banner somente-leitura e linguagem §3/§2.8.
//
// CHECKLIST P1 PR-02b — a ponte do builder abaixo da lista MORREU: abrir um modelo agora NAVEGA
// para a sub-rota do editor (`/administrator/checklists/:checklistId`). Os asserts abaixo passam a
// provar a ausência da ponte e o deep-link montado pelo modelo puro (checklistEditorPath).

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });
  return { localStorage, clear: () => storage.clear() };
}

const browser = installBrowserTestGlobals();

const TENANT_ID = "ten-industrial-01";
const BRANCH_ID = "fil-sp-01";

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: BRANCH_ID,
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "tenant_checklist"],
      scope: "branch",
    }),
  );
}

type AnyChecklist = import("../src/modules/checklists/types").TenantChecklist;

async function renderModelos(permissions: readonly string[], initialChecklists?: readonly AnyChecklist[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { TenantChecklistsPage } = await import("../src/modules/checklists/pages/TenantChecklistsPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/administrator/checklists"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <TenantChecklistsPage initialChecklists={initialChecklists} />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// Modelos de exemplo para provar o markup REAL das linhas (a costura injeta; nada de mock global).
const MODELO_BASE = {
  tenantId: "t",
  schema: {},
  version: 2,
  updatedAt: "2026-07-20T10:00:00.000Z",
} as const;

const MODELOS: readonly AnyChecklist[] = [
  {
    ...MODELO_BASE,
    id: "m1",
    name: "Vistoria de coleta",
    type: "towing_collection",
    status: "published",
    publishedAt: "2026-07-10T10:00:00.000Z",
    components: [
      { id: "c1", type: "vehicle_selector", label: "Ve\u00edculo", required: true, orderIndex: 0, config: {} },
      { id: "c2", type: "photo_upload", label: "Fotos", required: true, orderIndex: 1, config: {} },
    ],
  } as unknown as AnyChecklist,
  {
    ...MODELO_BASE,
    id: "m2",
    name: "Modelo de bancada",
    type: "technical_evidence",
    status: "inactive",
    components: [{ id: "c3", type: "observation", label: "Observa\u00e7\u00f5es", required: false, orderIndex: 0, config: {} }],
  } as unknown as AnyChecklist,
];

const WRITE_PERMISSIONS = [
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
] as const;

test("lista de modelos: header do protótipo (kicker/título/subtítulo), busca, filtro e vazio honesto (D-007)", async () => {
  const html = await renderModelos(WRITE_PERMISSIONS, []);

  // Page header verbatim do protótipo.
  assert.match(html, /ADMINISTRAÇÃO/);
  assert.match(html, /Modelos de Checklist/);
  assert.match(html, /Configure os checklists que a equipe de campo preenche no aplicativo/);
  assert.match(html, /Buscar modelo…/);
  // Filtro de situação com as 5 opções do protótipo.
  assert.match(html, /Todas as situações/);
  assert.match(html, /Publicados/);
  assert.match(html, /Rascunhos/);
  assert.match(html, /Com alterações não publicadas/);
  assert.match(html, /Inativos/);
  assert.match(html, /Novo modelo/);
  // Estado carregado-VAZIO legítimo (payload real []): vazio honesto verbatim, nada fabricado.
  assert.match(html, /Nenhum modelo ainda — crie o primeiro/);
  assert.match(html, /leva menos de 5 minutos/);
  assert.match(html, /Criar primeiro modelo/);
  assert.doesNotMatch(html, /Coleta de veículo rebocado/);
  // Com escrita não há banner somente-leitura.
  assert.doesNotMatch(html, /Você está no modo somente leitura/);
});

test("lista de modelos (somente-leitura): banner verbatim presente e ZERO botão de escrita", async () => {
  const html = await renderModelos(["tenant_checklists:read"], MODELOS);

  assert.match(html, /Você está no modo somente leitura/);
  assert.match(html, /Seu perfil permite consultar os modelos, mas não criar, editar ou publicar\./);
  assert.doesNotMatch(html, /Novo modelo/);
  assert.doesNotMatch(html, /Criar primeiro modelo/);
  // Junta PR-02a: com LINHAS REAIS na tela, nenhuma ação de escrita aparece — nem inativar,
  // nem duplicar; o ícone de abrir é "Ver modelo". E a ponte do builder não monta sem clique.
  assert.match(html, /Vistoria de coleta/);
  assert.match(html, /Ver modelo/);
  assert.doesNotMatch(html, /Editar modelo/);
  assert.doesNotMatch(html, /Inativar modelo|Reativar modelo/);
  assert.doesNotMatch(html, /Duplicar modelo/);
  // PR-02b: a ponte do builder antigo não existe mais em NENHUM papel.
  assert.doesNotMatch(html, /Builder visual|Pré-visualização do checklist|Salvar builder/);
});

test("linhas reais: resumo em PT-BR do mapa local (nunca a chave técnica), pills e ações de escrita", async () => {
  const html = await renderModelos(WRITE_PERMISSIONS, MODELOS);

  assert.match(html, /Vistoria de coleta/);
  // Resumo da célula MODELO usa os rótulos acentuados do mapa local…
  assert.match(html, /Seletor de veículo · Foto/);
  // …nunca a chave técnica crua (§3).
  assert.doesNotMatch(html, /vehicle_selector|photo_upload|towing_collection/);
  assert.match(html, /Publicado/);
  assert.match(html, /Inativo/);
  // Com escrita, as ações de linha aparecem — inclusive o caminho de tirar de circulação
  // (achado da junta: sem ele, modelo criado por engano virava lixo irremovível pela UI).
  assert.match(html, /Editar modelo/);
  assert.match(html, /Inativar modelo/);
  assert.match(html, /Reativar modelo/);
  assert.match(html, /Duplicar modelo/);
  // PR-02b: a ponte do builder abaixo da lista MORREU — abrir um modelo navega para o editor.
  assert.doesNotMatch(html, /Builder visual/);
  assert.doesNotMatch(html, /Salvar builder|Publicar checklist|Pré-visualização do checklist/);
});

test("abrir modelo = deep-link do editor: checklistEditorPath monta a sub-rota (e escapa o id)", async () => {
  const { checklistEditorPath } = await import("../src/modules/checklists/checklist-editor.model");

  assert.equal(checklistEditorPath("m1"), "/administrator/checklists/m1");
  // Id com caractere especial não pode quebrar a rota (nem vazar como caminho solto).
  assert.equal(checklistEditorPath("chk 42/x"), "/administrator/checklists/chk%2042%2Fx");
});

test("primeiro paint SEM costura: skeleton — nunca o vazio-hero antes de perguntar ao servidor", async () => {
  const html = await renderModelos(WRITE_PERMISSIONS);

  assert.match(html, /ckb-skl/);
  assert.doesNotMatch(html, /Nenhum modelo ainda — crie o primeiro/);
});

// Junta PR-02a (ALTA/esconde-fino): os asserts SSR acima NÃO provam as ações de LINHA — sem efeitos
// a lista nunca carrega e o `doesNotMatch` passa vazio. A decisão virou função pura, auditável aqui.
test("esconde-fino das ações de LINHA: cada gate decide a sua ação (leitura de execuções não herda escrita)", async () => {
  const { rowActionVisibility } = await import("../src/modules/checklists/pages/TenantChecklistsPage");

  // Papel completo: edita, inativa, duplica e alcança as execuções.
  assert.deepEqual(rowActionVisibility({ canUpdate: true, canWrite: true, canReadRuns: true }), {
    open: "edit",
    toggleStatus: true,
    duplicate: true,
    runs: true,
  });

  // Somente-leitura de modelos: o ícone vira "ver", ZERO ação de escrita — nem inativar, nem duplicar.
  assert.deepEqual(rowActionVisibility({ canUpdate: false, canWrite: false, canReadRuns: false }), {
    open: "view",
    toggleStatus: false,
    duplicate: false,
    runs: false,
  });

  // Quem só LÊ execuções alcança a tela de acompanhamento sem ganhar nenhuma escrita.
  assert.deepEqual(rowActionVisibility({ canUpdate: false, canWrite: false, canReadRuns: true }), {
    open: "view",
    toggleStatus: false,
    duplicate: false,
    runs: true,
  });

  // Quem cria mas não atualiza: duplica (escrita), mas NÃO inativa nem edita.
  const criador = rowActionVisibility({ canUpdate: false, canWrite: true, canReadRuns: false });
  assert.equal(criador.open, "view");
  assert.equal(criador.toggleStatus, false);
  assert.equal(criador.duplicate, true);
});

test("lista de modelos: linguagem §3 e allowlist §2.8 — nunca 'tenant', chave técnica ou id cru", async () => {
  const html = await renderModelos(WRITE_PERMISSIONS, MODELOS);

  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /photo_upload|towing_collection|single_choice/);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});

test("computeChecklistKpis conta SÓ o payload real: zeros honestos no vazio; pendente = publicado com draft mais novo", async () => {
  const { computeChecklistKpis } = await import("../src/modules/checklists/pages/TenantChecklistsPage");

  // Payload vazio → zeros honestos, nunca fabricação (D-007).
  assert.deepEqual(computeChecklistKpis([]), {
    publicados: 0,
    rascunhos: 0,
    alteracoesNaoPublicadas: 0,
    inativos: 0,
  });

  const base = {
    tenantId: "t",
    name: "Modelo",
    type: "towing_collection" as const,
    schema: {},
    components: [],
    version: 1,
  };
  const kpis = computeChecklistKpis([
    // Publicado com alterações não publicadas (updatedAt > publishedAt) → conta nos DOIS.
    { ...base, id: "a", status: "published", publishedAt: "2026-07-01T10:00:00.000Z", updatedAt: "2026-07-10T10:00:00.000Z" },
    { ...base, id: "b", status: "published", publishedAt: "2026-07-02T10:00:00.000Z", updatedAt: "2026-07-02T10:00:00.000Z" },
    { ...base, id: "c", status: "draft", updatedAt: "2026-07-03T10:00:00.000Z" },
    { ...base, id: "d", status: "inactive", updatedAt: "2026-07-04T10:00:00.000Z" },
  ]);
  assert.equal(kpis.publicados, 2);
  assert.equal(kpis.rascunhos, 1);
  assert.equal(kpis.alteracoesNaoPublicadas, 1);
  assert.equal(kpis.inativos, 1);
});

test("formatChecklistUpdatedAt: 'hoje' para o dia corrente; dd/mm/aaaa nos demais; '—' para data inválida", async () => {
  const { formatChecklistUpdatedAt } = await import("../src/modules/checklists/pages/TenantChecklistsPage");

  assert.equal(formatChecklistUpdatedAt(new Date().toISOString()), "hoje");

  const past = formatChecklistUpdatedAt("2026-07-13T12:00:00.000Z", new Date("2026-08-05T12:00:00.000Z"));
  assert.notEqual(past, "hoje");
  assert.match(past, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.match(past, /2026/);

  assert.equal(formatChecklistUpdatedAt("data-invalida"), "—");
});

test("summarizeChecklistComponents: rótulos PT-BR acentuados do mapa local, ' · +N' e fallback honesto", async () => {
  const { summarizeChecklistComponents } = await import("../src/modules/checklists/pages/TenantChecklistsPage");

  // Nunca a chave técnica crua do backend — sempre o rótulo local acentuado.
  assert.equal(
    summarizeChecklistComponents([
      { type: "vehicle_selector", label: "Seletor de veiculo" },
      { type: "damage_map", label: "Mapa de avarias" },
      { type: "photo_upload", label: "Foto" },
      { type: "observation", label: "Observacao" },
    ]),
    "Seletor de veículo · Mapa de avarias · Foto · +1",
  );

  // Tipo desconhecido → usa o rótulo enviado pelo backend (fallback honesto, nunca a chave).
  assert.equal(
    summarizeChecklistComponents([{ type: "campo_misterioso", label: "Campo especial" }]),
    "Campo especial",
  );

  assert.equal(summarizeChecklistComponents([]), "");
});

test("ChecklistToast: região aria-live polite, mensagem do protótipo; sem toast não renderiza card", async () => {
  const { ChecklistToast } = await import("../src/modules/checklists/components/ChecklistToast");

  const html = renderToString(
    <ChecklistToast toast={{ message: "Duplicar modelo estará disponível em breve.", kind: "info" }} />,
  );
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Duplicar modelo estará disponível em breve\./);
  assert.match(html, /ckb-toast/);

  const emptyHtml = renderToString(<ChecklistToast toast={null} />);
  assert.doesNotMatch(emptyHtml, /ckb-toast/);
});
