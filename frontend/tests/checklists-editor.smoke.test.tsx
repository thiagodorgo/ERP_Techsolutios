import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// CHECKLIST P1 PR-02b — smoke do EDITOR de "Modelos de Checklist" (sub-rota
// /administrator/checklists/:checklistId) recriado sobre o bloco scEditor do protótipo do dono:
// header (nome/tipo/situação/dirty), abas Estrutura/Aplicabilidade, paleta em PT-BR, canvas com
// seções, vazio verbatim, esconde-fino do papel somente-leitura, aba Aplicabilidade "Em breve" e
// o ROUND-TRIP da convenção de seções (schema.sections + config.sectionIndex + config.help).

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

/**
 * Texto VISÍVEL (tags fora). §3 fala do que o usuário LÊ: `value="towing_collection"` num
 * <select> é máquina (o backend exige a chave), o rótulo é que precisa ser PT-BR.
 */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

const TENANT_ID = "ten-industrial-01";
const BRANCH_ID = "fil-sp-01";
const CHECKLIST_ID = "chk-editor-01";

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
type AnyCatalogItem = import("../src/modules/checklists/types").TenantChecklistComponentCatalogItem;

// Modelo de exemplo com a convenção da ata JÁ persistida: 2 seções em `schema.sections` e cada
// componente ancorado por `config.sectionIndex` (+ `config.help` no que tem ajuda).
const MODELO: AnyChecklist = {
  id: CHECKLIST_ID,
  tenantId: TENANT_ID,
  name: "Vistoria de coleta — padrão",
  type: "towing_collection",
  status: "published",
  version: 3,
  publishedAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-20T10:00:00.000Z",
  schema: { source: "ckb_editor", sections: ["Dados do veículo", "Avarias"] },
  components: [
    {
      id: "cmp-1",
      componentKey: "vehicle_selector_a1",
      type: "vehicle_selector",
      label: "Tipo de veículo",
      required: true,
      orderIndex: 0,
      config: { sectionIndex: 0 },
      validationRules: {},
      visibilityRules: {},
    },
    {
      id: "cmp-2",
      componentKey: "photo_upload_b2",
      type: "photo_upload",
      label: "Fotos do veículo",
      required: true,
      orderIndex: 1,
      config: { sectionIndex: 1, minPhotos: 4, help: "Frente, traseira e as duas laterais." },
      validationRules: {},
      visibilityRules: {},
    },
  ],
} as unknown as AnyChecklist;

// Catálogo no shape REAL do backend (rótulos SEM acento) — a tela é obrigada a traduzir (§3).
const CATALOGO: readonly AnyCatalogItem[] = [
  {
    type: "vehicle_selector",
    label: "Seletor de veiculo",
    description: "Permite selecionar tipo de veiculo e resolver imagem dinamica para vistoria.",
    defaultConfig: { vehicleTypes: ["car"] },
  },
  {
    type: "single_choice",
    label: "Escolha unica",
    description: "Uma opcao entre varias (radio). Exige a lista de opcoes.",
    defaultConfig: { options: ["Opcao 1"] },
  },
  {
    type: "signature",
    label: "Assinatura",
    description: "Captura a assinatura do responsavel (cliente/condutor) no ato.",
    defaultConfig: { requireName: false },
  },
] as unknown as readonly AnyCatalogItem[];

const WRITE_PERMISSIONS = [
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
] as const;

/** Modelo de 1 campo do tipo pedido — base dos 10 casos do inspector tipado (PR-02c). */
function modeloComCampo(type: string, config: Record<string, unknown> = {}, label = "Campo em teste"): AnyChecklist {
  return {
    ...MODELO,
    schema: { sections: ["Formulário"] },
    components: [
      {
        id: "cmp-tipado",
        componentKey: "campo_tipado",
        type,
        label,
        required: false,
        orderIndex: 0,
        config: { sectionIndex: 0, ...config },
        validationRules: {},
        visibilityRules: {},
      },
    ],
  } as unknown as AnyChecklist;
}

async function renderEditor(
  permissions: readonly string[],
  options: {
    readonly checklist?: AnyChecklist;
    readonly catalog?: readonly AnyCatalogItem[];
    readonly tab?: "estrutura" | "aplicabilidade";
    readonly selectedComponentKey?: string;
  } = {},
): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ChecklistEditorPage } = await import("../src/modules/checklists/pages/ChecklistEditorPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={[`/administrator/checklists/${CHECKLIST_ID}`]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route
                path="/administrator/checklists/:checklistId"
                element={
                  // Costura de teste (SSR não roda efeitos): o modelo/catálogo entram prontos e o
                  // markup REAL do editor fica auditável. Produção não passa as props.
                  <ChecklistEditorPage
                    initialChecklist={options.checklist ?? MODELO}
                    initialComponents={options.catalog ?? CATALOGO}
                    initialTab={options.tab}
                    initialSelectedComponentKey={options.selectedComponentKey}
                  />
                }
              />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("editor: header verbatim do protótipo (voltar, nome, tipo, situação, alterações não publicadas) e abas", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS);

  assert.match(html, /Voltar para a lista de modelos/);
  assert.match(html, /aria-label="Nome do modelo"/);
  assert.match(html, /Vistoria de coleta — padrão/);
  // Tipo do modelo com os 4 rótulos PT-BR do protótipo (travessão e acentos).
  assert.match(html, /aria-label="Tipo do modelo"/);
  assert.match(html, /Guincho — Coleta/);
  assert.match(html, /Guincho — Entrega/);
  assert.match(html, /Evidência técnica/);
  assert.match(html, /Personalizado/);
  // Situação + pill de pendência (updatedAt > publishedAt no payload real).
  assert.match(html, /Publicado/);
  assert.match(html, /Alterações não publicadas/);
  // Ações do header — Salvar/Publicar/Pré-visualizar TODAS ligadas (o PR-02d fechou a última).
  assert.match(html, /Salvar/);
  assert.match(html, /Pré-visualizar/);
  assert.match(html, /Publicar/);
  assert.match(html, /title="Publicar e disponibilizar no aplicativo"/);
  // PR-02d: o selo "Em breve" e o `disabled` SAÍRAM do Pré-visualizar (a capacidade existe agora).
  // O selo continua vivo só onde a capacidade REALMENTE falta — a aba Aplicabilidade (PR-04).
  assert.doesNotMatch(html, /title="Pré-visualização chega em breve"/);
  assert.doesNotMatch(html, /ckb-ed-soon-pill/);
  assert.match(html, /title="Ver como o técnico verá no aplicativo"/);
  assert.match(html, /aria-expanded="false"/);
  // PR-02c: o seletor de TIPO ficou LIGADO (o PATCH passou a aceitar `type`) — nada de "Em breve"
  // nele, e o <select> não pode voltar desabilitado.
  assert.doesNotMatch(html, /title="A alteração do tipo chega em breve"/);
  assert.match(html, /<select class="ckb-ed-type" aria-label="Tipo do modelo">/);
  // PR-02c: Inativar reposto no editor (promessa da ata do PR-02a).
  assert.match(html, /aria-label="Inativar modelo"/);
  // Abas + link de execuções (gate próprio checklist_runs:read).
  assert.match(html, /Estrutura do formulário/);
  assert.match(html, /Aplicabilidade/);
  assert.match(html, /Ver execuções deste modelo/);
  // Sem alteração local, nada de indicador de sujo.
  assert.doesNotMatch(html, /Alterações não salvas/);
});

test("editor: paleta em PT-BR do mapa local (nunca o rótulo cru do backend nem a chave técnica)", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS);

  assert.match(html, /Campos disponíveis/);
  assert.match(html, /Clique para adicionar ao formulário/);
  // Rótulos e descrições ACENTUADOS — o catálogo injetado vem sem acento de propósito.
  assert.match(html, /Seletor de veículo/);
  assert.match(html, /Escolha única/);
  assert.match(html, /Uma opção entre várias/);
  assert.doesNotMatch(html, /Seletor de veiculo|Escolha unica|Uma opcao entre varias/);
  // §3/§2.8: o usuário nunca LÊ chave técnica, "tenant" nem id de organização/filial.
  const texto = visibleText(html);
  assert.doesNotMatch(texto, /vehicle_selector|photo_upload|single_choice|towing_collection/);
  assert.doesNotMatch(texto, /\btenant\b/i);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});

test("editor: canvas com SEÇÕES nomeadas, meta do formulário, chips e campo obrigatório", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS);

  assert.match(html, /O formulário/);
  // editorCanvasMeta: 2 campos · 2 seções · versão 3 (versão vem da API, não é reinventada).
  assert.match(html, /2 campos · 2 seções · versão 3/);
  assert.match(html, /SEÇÃO/);
  assert.match(html, /Dados do veículo/);
  assert.match(html, /Avarias/);
  assert.match(html, /1 campo/);
  assert.match(html, /Nova seção/);
  // Card de campo: rótulo, tipo em PT-BR e chip do config real.
  assert.match(html, /Fotos do veículo/);
  assert.match(html, /mín\. 4 fotos/);
  // Grip é decorativo — a reordenação real é ↑/↓.
  assert.match(html, /Arrastar para reordenar/);
  assert.match(html, /Mover para cima/);
  assert.match(html, /Mover para baixo/);
  assert.match(html, /Duplicar campo/);
  assert.match(html, /Remover campo/);
  // Inspector sem seleção — estado vazio verbatim.
  assert.match(html, /Nenhum campo selecionado/);
  assert.match(html, /Clique em um campo do formulário para configurar o texto da pergunta, obrigatoriedade e regras\./);
});

test("editor: modelo SEM campos mostra o vazio verbatim do protótipo (nada fabricado — D-007)", async () => {
  const vazio = { ...MODELO, components: [], schema: { sections: ["Dados do veículo"] } } as unknown as AnyChecklist;
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: vazio });

  assert.match(html, /Nenhum campo ainda/);
  assert.match(
    html,
    /Escolha um campo na coluna da esquerda para começar\. Uma vistoria de coleta costuma ter veículo, mapa de avarias, fotos e assinatura\./,
  );
  // Seção existente, porém vazia — aviso próprio, sem inventar campo nenhum.
  assert.match(html, /Seção vazia — adicione um campo pela coluna da esquerda/);
  assert.match(html, /0 campos · 1 seção · versão 3/);
});

test("editor (somente-leitura): banner verbatim, ZERO escrita — sem paleta, sem Salvar, sem ações de campo", async () => {
  const html = await renderEditor(["tenant_checklists:read"]);

  assert.match(html, /Você está no modo somente leitura/);
  assert.match(html, /Seu perfil permite consultar os modelos, mas não criar, editar ou publicar\./);
  // O modelo continua legível…
  assert.match(html, /Vistoria de coleta — padrão/);
  assert.match(html, /Fotos do veículo/);
  // …mas nenhuma superfície de escrita é oferecida.
  assert.doesNotMatch(html, /Campos disponíveis/);
  assert.doesNotMatch(html, /Clique para adicionar ao formulário/);
  assert.doesNotMatch(html, /Salvar/);
  assert.doesNotMatch(html, /Nova seção/);
  assert.doesNotMatch(html, /Mover para cima|Mover para baixo|Duplicar campo|Remover campo/);
  assert.doesNotMatch(html, /Publicar/);
  // PR-02c: a ação de situação (Inativar/Reativar) é escrita — não aparece para quem só lê.
  assert.doesNotMatch(html, /Inativar modelo|Reativar modelo/);
  // O inspector inteiro não monta (consulta pura — mesma decisão da junta do PR-02a para a ponte).
  assert.doesNotMatch(html, /Configurações do campo|Nenhum campo selecionado|ckb-ed-toggle/);
  assert.doesNotMatch(html, /Pergunta exibida ao técnico|Texto de ajuda/);
  // Nome e seções ficam somente-leitura de fato (não é só o botão que some).
  assert.match(html, /class="ckb-ed-name" aria-label="Nome do modelo" readOnly=""/);
  assert.match(html, /aria-label="Nome da seção" readOnly=""/);
  // "Ver execuções" NÃO é escrita: o gate dela é `checklist_runs:read` (que a sessão do papel
  // operacional tem), então continua disponível — leitura não é punida pelo esconde-fino.
  assert.match(html, /Ver execuções deste modelo/);
});

test("esconde-fino do editor: cada gate decide a sua superfície (execuções não herdam escrita)", async () => {
  const { editorActionVisibility } = await import("../src/modules/checklists/pages/ChecklistEditorPage");

  assert.deepEqual(editorActionVisibility({ canUpdate: true, canReadRuns: true }), {
    palette: true,
    save: true,
    addSection: true,
    fieldActions: true,
    inspector: true,
    runsLink: true,
    editingFrozen: false,
  });

  assert.deepEqual(editorActionVisibility({ canUpdate: false, canReadRuns: false }), {
    palette: false,
    save: false,
    addSection: false,
    fieldActions: false,
    inspector: false,
    runsLink: false,
    editingFrozen: false,
  });

  // Junta PR-02b (ALTA): enquanto GRAVA, a superfície de edição congela — sem isso o usuário
  // editava durante o PATCH e o toast verde confirmava um save que não incluiu as edições.
  const gravando = editorActionVisibility({ canUpdate: true, canReadRuns: true, busy: true });
  assert.equal(gravando.editingFrozen, true);
  assert.equal(gravando.palette, false);
  assert.equal(gravando.addSection, false);
  assert.equal(gravando.fieldActions, false);
  // O inspector continua MONTADO (campos em readOnly) para a tela não piscar a cada gravação.
  assert.equal(gravando.inspector, true);
  assert.equal(gravando.save, true);

  // Quem só LÊ execuções alcança a tela de acompanhamento sem ganhar nenhuma escrita.
  const leitor = editorActionVisibility({ canUpdate: false, canReadRuns: true });
  assert.equal(leitor.runsLink, true);
  assert.equal(leitor.save, false);
  assert.equal(leitor.palette, false);
});

test("editor: aba Aplicabilidade é ESTÁTICA e assume 'Em breve' (exemplo ilustrativo, nunca dado real)", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { tab: "aplicabilidade" });

  // Semântica de abas (a11y) — a aba selecionada é anunciada.
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /role="tabpanel"/);

  assert.match(html, /Quando este checklist é enviado ao técnico/);
  assert.match(
    html,
    /As regras abaixo definem em quais serviços o modelo entra automaticamente\. Quem despacha a ordem ainda pode ajustar antes de enviar\./,
  );
  assert.match(html, /Regras de aplicação/);
  assert.match(html, /Uma ordem pode receber mais de um checklist/);
  // O selo "Em breve" é OBRIGATÓRIO na tela (D-007): sem ele, o exemplo passaria por dado real.
  assert.match(html, /Em breve/);
  // Linhas-exemplo INERTES: rotuladas como exemplo e com os controles desabilitados.
  assert.match(html, /Guincho — remoção/);
  assert.match(html, /Seguradora Atlas/);
  assert.match(html, /Exemplo ilustrativo/);
  assert.match(html, /Adicionar regra/);
  assert.match(html, /disabled/);
  // Card "O que acontece ao publicar" verbatim.
  assert.match(html, /O que acontece ao publicar/);
  assert.match(
    html,
    /Publicar congela esta versão do modelo\. Ordens já despachadas continuam com a versão que receberam — nada muda para o técnico que já está em campo\./,
  );
  assert.match(html, /Novas ordens/);
  assert.match(html, /Em andamento/);
  assert.match(html, /Concluídas/);
  // A grade da Estrutura não fica montada por trás da aba estática.
  assert.doesNotMatch(html, /Campos disponíveis/);
});

test("editor: modal 'Sair sem salvar?' com a cópia verbatim e as 3 saídas do protótipo", async () => {
  const { ExitConfirmDialog } = await import("../src/modules/checklists/pages/ChecklistEditorPage");

  const html = renderToString(<ExitConfirmDialog onCancel={() => {}} onSaveAndExit={() => {}} onDiscard={() => {}} />);

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Sair sem salvar\?/);
  assert.match(
    html,
    /Você tem alterações que ainda não foram salvas neste modelo\. Se sair agora, elas serão perdidas\./,
  );
  assert.match(html, /Continuar editando/);
  assert.match(html, /Salvar e sair/);
  assert.match(html, /Descartar/);
  // O foco entra pela opção CONSERVADORA — nunca pelo "Descartar" (Enter distraído não perde o
  // trabalho). Asserção posicional de propósito: o autofocus tem de estar NESSE botão.
  assert.match(html, /autofocus=""[^>]*>Continuar editando</);
});

test("ROUND-TRIP da convenção de seções: save→load preserva schema.sections, config.sectionIndex e config.help", async () => {
  const {
    buildUpdateInputFromEditorDraft,
    createEditorDraftFromChecklist,
    readSchemaSections,
    componentSectionIndex,
    componentHelpText,
  } = await import("../src/modules/checklists/checklist-editor.model");

  const draft = createEditorDraftFromChecklist(MODELO);
  assert.deepEqual([...draft.sections], ["Dados do veículo", "Avarias"]);

  const input = buildUpdateInputFromEditorDraft(draft, MODELO.schema);

  // 1) As seções viajam no schema (que o validator trata como record livre).
  assert.deepEqual(input.schema!.sections, ["Dados do veículo", "Avarias"]);
  // 2) Chaves que o editor NÃO conhece no schema sobrevivem (não derruba o que não entende).
  assert.equal(input.schema!.source, "ckb_editor");
  // 3) Cada componente leva a âncora de seção e a ajuda DENTRO de config — nunca no topo, que o
  //    `z.object` do validator descartaria.
  const fotos = input.components!.find((component) => component.componentKey === "photo_upload_b2")!;
  assert.equal(fotos.config.sectionIndex, 1);
  assert.equal(fotos.config.help, "Frente, traseira e as duas laterais.");
  assert.equal(fotos.config.minPhotos, 4);
  assert.equal("sectionIndex" in (fotos as unknown as Record<string, unknown>), false);
  assert.equal("help" in (fotos as unknown as Record<string, unknown>), false);

  // 4) LOAD de volta: o backend devolve o template com o mesmo schema/config → o editor relê a
  //    mesma estrutura (mesmas seções, mesma lotação, mesmo texto de ajuda).
  const devolvido = {
    ...MODELO,
    schema: input.schema as Record<string, unknown>,
    components: input.components!.map((component, index) => ({
      ...component,
      // O backend REGENERA o id a cada gravação; o componentKey é que sobrevive.
      id: `srv-${index}`,
    })),
  } as unknown as AnyChecklist;

  const relido = createEditorDraftFromChecklist(devolvido);
  assert.deepEqual(readSchemaSections(devolvido.schema), ["Dados do veículo", "Avarias"]);
  const fotosRelido = relido.components.find((component) => component.componentKey === "photo_upload_b2")!;
  assert.equal(componentSectionIndex(fotosRelido, relido.sections.length), 1);
  assert.equal(componentHelpText(fotosRelido), "Frente, traseira e as duas laterais.");
  assert.equal(fotosRelido.label, "Fotos do veículo");
  assert.equal(fotosRelido.required, true);
});

test("ROUND-TRIP: template SEM a convenção (modelo pré-editor) cai na seção única, sem perder campo", async () => {
  const { createEditorDraftFromChecklist, componentsInSection, editorCanvasMeta } = await import(
    "../src/modules/checklists/checklist-editor.model"
  );

  const legado = {
    ...MODELO,
    schema: { source: "w02a_builder" },
    components: MODELO.components.map((component) => ({ ...component, config: {} })),
  } as unknown as AnyChecklist;

  const draft = createEditorDraftFromChecklist(legado);
  assert.deepEqual([...draft.sections], ["Formulário"]);
  // Nenhum campo se perde no caminho: todos caem na seção única.
  assert.equal(componentsInSection(draft, 0).length, 2);
  assert.equal(editorCanvasMeta(draft, legado.version), "2 campos · 1 seção · versão 3");
});

// ── Junta PR-02b (MÉDIA): o NÚCLEO do editor (mutadores do canvas) não tinha teste algum, mesmo
//    sendo função pura. Sem isto, mover/duplicar/remover só eram exercitados por clique manual.
test("mutadores do canvas: mover respeita a borda e NÃO cruza seção; duplicar preserva a seção", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");

  const draft = {
    name: "Vistoria",
    description: "",
    type: "towing_collection" as const,
    sections: ["Dados do veículo", "Evidências"],
    components: [
      { id: "a", componentKey: "k-a", type: "vehicle_selector" as const, label: "Veículo", required: true, config: { sectionIndex: 0 }, validationRules: {}, visibilityRules: {} },
      { id: "b", componentKey: "k-b", type: "photo_upload" as const, label: "Fotos", required: true, config: { sectionIndex: 0 }, validationRules: {}, visibilityRules: {} },
      { id: "c", componentKey: "k-c", type: "signature" as const, label: "Assinatura", required: false, config: { sectionIndex: 1 }, validationRules: {}, visibilityRules: {} },
    ],
  };

  // Borda: o primeiro da seção não sobe; o último não desce (no-op, sem estourar).
  assert.deepEqual(model.moveEditorComponent(draft, "a", "up").components.map((c) => c.id), ["a", "b", "c"]);
  assert.deepEqual(model.moveEditorComponent(draft, "b", "down").components.map((c) => c.id), ["a", "b", "c"]);
  // "c" é o único da seção 1 — mover não pode puxá-lo para a seção 0.
  const movedC = model.moveEditorComponent(draft, "c", "up");
  assert.equal(model.componentSectionIndex(movedC.components.find((c) => c.id === "c")!, 2), 1);
  // Troca legítima dentro da MESMA seção.
  assert.deepEqual(model.moveEditorComponent(draft, "b", "up").components.map((c) => c.id), ["b", "a", "c"]);

  // Duplicar: mantém a seção, gera componentKey novo e rotula " (cópia)".
  const dup = model.duplicateEditorComponent(draft, "c");
  const copy = dup.draft.components.find((c) => c.id !== "c" && c.label.includes("cópia"));
  assert.ok(copy, "a cópia precisa existir");
  assert.equal(model.componentSectionIndex(copy!, 2), 1);
  assert.notEqual(copy!.componentKey, "k-c");

  // Remover não afeta as outras seções.
  const removed = model.removeEditorComponent(draft, "a");
  assert.deepEqual(removed.components.map((c) => c.id), ["b", "c"]);
});

test("seções: remover só a VAZIA, nunca a última, e reindexa os campos seguintes", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");

  const draft = {
    name: "Vistoria",
    description: "",
    type: "towing_collection" as const,
    sections: ["Cheia", "Vazia", "Final"],
    components: [
      { id: "a", componentKey: "k-a", type: "photo_upload" as const, label: "Fotos", required: true, config: { sectionIndex: 0 }, validationRules: {}, visibilityRules: {} },
      { id: "b", componentKey: "k-b", type: "signature" as const, label: "Assinatura", required: false, config: { sectionIndex: 2 }, validationRules: {}, visibilityRules: {} },
    ],
  };

  assert.equal(model.canRemoveEditorSection(draft, 0), false, "seção COM campos não é removível");
  assert.equal(model.canRemoveEditorSection(draft, 1), true);

  const next = model.removeEditorSection(draft, 1);
  assert.deepEqual([...next.sections], ["Cheia", "Final"]);
  // O campo que estava na seção 2 desce para a 1 — nunca vira órfão.
  assert.equal(model.componentSectionIndex(next.components.find((c) => c.id === "b")!, 2), 1);
  // Última seção restante nunca é removível.
  const single = { ...draft, sections: ["Única"], components: [] };
  assert.equal(model.canRemoveEditorSection(single, 0), false);
});

test("criação pela paleta usa o rótulo PT-BR do mapa local (nunca a chave crua do backend)", async () => {
  const model = await import("../src/modules/checklists/checklist-editor.model");
  const { resolveChecklistComponentTypeLabel } = await import("../src/modules/checklists/checklist.constants");

  const draft = { name: "M", description: "", type: "towing_collection" as const, sections: ["S"], components: [] };
  // O catálogo do backend devolve SEM acento — é exatamente esse o rótulo que não pode vazar.
  const cru = { type: "observation" as const, label: "Observacao", description: "Texto livre", defaultConfig: {} };
  const resolvido = { ...cru, label: resolveChecklistComponentTypeLabel(cru.type, cru.label) };

  const created = model.addEditorComponent(draft, resolvido as never, 0);
  const field = created.draft.components[0]!;
  assert.equal(field.label, "Observação");
  assert.doesNotMatch(field.label, /Observacao/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CHECKLIST P1 PR-02c — inspector TIPADO (10 casos), guard-rails de publicação, tipo ligado,
// guarda de concorrência e Inativar/Reativar no editor.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Um caso por TIPO de campo: o inspector precisa montar o formulário CERTO — e só ele. Cada caso
 * declara o que TEM de aparecer e o que NÃO pode aparecer (senão "renderiza tudo sempre" passaria).
 */
const CASOS_INSPECTOR: readonly {
  readonly tipo: string;
  readonly config?: Record<string, unknown>;
  readonly presentes: readonly RegExp[];
  readonly ausentes?: readonly RegExp[];
  /** Frases com interpolação (o SSR do React separa `{valor}` com `<!-- -->`): conferidas no TEXTO. */
  readonly visiveis?: readonly RegExp[];
}[] = [
  {
    tipo: "single_choice",
    config: { options: ["Sim", "Não"] },
    presentes: [
      /Adicionar opção/,
      /Deixe as respostas mais comuns no topo — em campo, com luva, cada toque conta\./,
      /aria-label="Texto da opção 1"/,
      /aria-label="Subir a opção 2"/,
      /aria-label="Remover a opção 1"/,
    ],
    // "Mínimo de seleções" é exclusivo da múltipla escolha.
    ausentes: [/Mínimo de seleções/, /Mínimo de fotos/],
  },
  {
    tipo: "multi_choice",
    config: { options: ["Estepe"], minSelected: 2 },
    presentes: [/Adicionar opção/, /Mínimo de seleções/, /id="ckb-insp-minsel"/, /value="2"/],
    ausentes: [/Máximo de fotos/],
  },
  {
    // Escolha SEM opções: o aviso âmbar do protótipo, verbatim.
    tipo: "single_choice",
    config: { options: [] },
    presentes: [
      /Adicione ao menos 1 opção — sem opções este campo impede a publicação do modelo\./,
      /ckb-ed-insp-warn/,
    ],
  },
  {
    tipo: "photo_upload",
    config: { minPhotos: 4, maxPhotos: 8 },
    presentes: [/Mínimo de fotos/, /Máximo de fotos/],
    visiveis: [/O aplicativo mostra 4 espaços de foto e só libera a conclusão quando todos estiverem preenchidos\./],
    ausentes: [/Adicionar opção/, /Tipos de avaria/],
  },
  {
    tipo: "vehicle_selector",
    config: { vehicleTypes: ["car", "truck"] },
    presentes: [
      /Tipos de veículo aceitos/,
      /Carro/,
      /Moto/,
      /Caminhão/,
      /Utilitário/,
      /Imagem de referência da vistoria/,
      /Silhueta padrão por tipo de veículo/,
      /Enviar imagem própria — em breve/,
    ],
    ausentes: [/Tipos de avaria que o técnico pode marcar/],
  },
  {
    tipo: "damage_map",
    config: { markerTypes: ["scratch"], requireDescription: true },
    presentes: [
      /Tipos de avaria que o técnico pode marcar/,
      /Risco/,
      /Amassado/,
      /Quebrado/,
      /Faltante/,
      /Outro/,
      /Exigir descrição em cada avaria/,
      /Protege a organização em disputas sobre o estado do veículo/,
    ],
    ausentes: [/Tipos de veículo aceitos/],
  },
  {
    tipo: "observation",
    config: { multiline: true, maxLength: 300 },
    presentes: [/Texto longo/, /Campo com várias linhas em vez de uma só/, /Limite de caracteres/, /id="ckb-insp-maxlen"/],
    ausentes: [/Adicionar opção/],
  },
  {
    tipo: "signature",
    config: { requireName: true },
    presentes: [/Exigir nome de quem assina/, /Nome completo registrado junto da assinatura/],
    ausentes: [/Exigir observação na ciência/],
  },
  {
    tipo: "acknowledgement",
    config: {},
    presentes: [/Exigir observação na ciência/, /Quem dá ciência precisa justificar por escrito/],
    ausentes: [/Exigir nome de quem assina/],
  },
  {
    tipo: "before_after",
    config: {},
    presentes: [/Exigir os dois estágios/, /Antes e depois precisam ser registrados/],
    ausentes: [/Comparar com/],
  },
  {
    tipo: "comparison",
    config: { compareWith: "related_delivery" },
    presentes: [
      /Comparar com/,
      /Vistoria de coleta relacionada/,
      /Vistoria de entrega relacionada/,
      /O aplicativo mostra lado a lado as fotos e avarias da vistoria escolhida\./,
    ],
    ausentes: [/Exigir os dois estágios/],
  },
];

for (const caso of CASOS_INSPECTOR) {
  const rotuloDoCaso =
    caso.tipo === "single_choice" && (caso.config?.options as unknown[] | undefined)?.length === 0
      ? "escolha SEM opções (aviso âmbar)"
      : caso.tipo;

  test(`inspector tipado: ${rotuloDoCaso} monta o formulário certo — e só ele`, async () => {
    const html = await renderEditor(WRITE_PERMISSIONS, {
      checklist: modeloComCampo(caso.tipo, caso.config),
      selectedComponentKey: "campo_tipado",
    });

    // Cabeçalho da seção tipada + o básico continuam presentes em todos os casos.
    assert.match(html, /ckb-ed-insp-section/);
    assert.match(html, /Pergunta exibida ao técnico/);
    assert.match(html, /Resposta obrigatória/);

    for (const presente of caso.presentes) assert.match(html, presente);
    for (const ausente of caso.ausentes ?? []) assert.doesNotMatch(html, ausente);

    // §3 — nenhuma chave técnica de tipo/opção chega ao texto que o usuário lê.
    const texto = visibleText(html).replace(/\s+/g, " ");
    for (const visivel of caso.visiveis ?? []) assert.match(texto, visivel);
    assert.doesNotMatch(texto, /single_choice|multi_choice|photo_upload|vehicle_selector|damage_map|before_after/);
    assert.doesNotMatch(texto, /related_collection|related_delivery|markerTypes|minPhotos/);
  });
}

test("blockers de publicação: 0 campos · 1 escolha vazia · N escolhas vazias · rascunho válido", async () => {
  const { checklistPublishBlockers, checklistSaveBlockers, publishButtonState } = await import(
    "../src/modules/checklists/checklist-editor.model"
  );

  const base = { name: "M", description: "", type: "towing_collection" as const, sections: ["S"] };
  const escolha = (id: string, label: string, options: string[]) => ({
    id,
    componentKey: `k-${id}`,
    type: "single_choice" as const,
    label,
    required: false,
    config: { sectionIndex: 0, options },
    validationRules: {},
    visibilityRules: {},
  });

  // (a) 0 campos
  const vazio = { ...base, components: [] };
  assert.deepEqual([...checklistPublishBlockers(vazio)], ["Adicione ao menos 1 campo ao formulário para publicar."]);

  // (b) 1 campo de escolha sem opções — com o RÓTULO do campo entre aspas curvas.
  const umaVazia = { ...base, components: [escolha("a", "Cor do veículo", [])] };
  assert.deepEqual(
    [...checklistPublishBlockers(umaVazia)],
    ["O campo “Cor do veículo” está sem opções — adicione ao menos 1 para publicar."],
  );

  // (c) N campos de escolha sem opções
  const duasVazias = { ...base, components: [escolha("a", "Cor", []), escolha("b", "Combustível", [])] };
  assert.deepEqual(
    [...checklistPublishBlockers(duasVazias)],
    ["2 campos de escolha estão sem opções — adicione ao menos 1 opção em cada."],
  );

  // Opção só com espaços NÃO conta (o backend exige texto não-vazio).
  const soEspaco = { ...base, components: [escolha("a", "Cor", ["   "])] };
  assert.equal(checklistPublishBlockers(soEspaco).length, 1);

  // (d) rascunho válido — nenhum bloqueio, e o botão fica livre com o title do protótipo.
  const valido = { ...base, components: [escolha("a", "Cor", ["Preto", "Prata"])] };
  assert.deepEqual([...checklistPublishBlockers(valido)], []);
  assert.deepEqual(publishButtonState(checklistPublishBlockers(valido)), {
    locked: false,
    title: "Publicar e disponibilizar no aplicativo",
    message: null,
  });
  const travado = publishButtonState(checklistPublishBlockers(umaVazia));
  assert.equal(travado.locked, true);
  assert.equal(travado.title, "O campo “Cor do veículo” está sem opções — adicione ao menos 1 para publicar.");

  // Espelho do BACKEND: as MESMAS condições são 400 no PATCH (`components.min(1)` e o superRefine
  // de `config.options`), por isso existem bloqueios de GRAVAÇÃO — com cópia do próprio momento.
  assert.equal(checklistSaveBlockers(vazio).length, 1);
  assert.match(checklistSaveBlockers(vazio)[0], /para salvar/);
  assert.match(checklistSaveBlockers(umaVazia)[0], /está sem opções — adicione ao menos 1 para salvar\./);
  assert.deepEqual([...checklistSaveBlockers(valido)], []);
});

test("editor: Publicar TRAVADO mostra a faixa âmbar e carrega a mensagem no title (nunca `disabled`)", async () => {
  const semOpcoes = modeloComCampo("single_choice", { options: [] }, "Cor do veículo");
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: semOpcoes });

  // Faixa de bloqueio (protótipo) + a MESMA mensagem no title do botão.
  assert.match(html, /ckb-ed-blockbar/);
  assert.match(html, /O campo “Cor do veículo” está sem opções — adicione ao menos 1 para publicar\./);
  assert.match(html, /class="ckb-ed-btn ckb-ed-btn--publish ckb-ed-btn--publish-locked"/);
  assert.match(html, /title="O campo “Cor do veículo” está sem opções — adicione ao menos 1 para publicar\."/);
  assert.match(html, /aria-disabled="true"/);
  // O botão continua clicável de propósito: o clique explica o bloqueio (botão `disabled` não
  // recebe foco nem dá retorno nenhum ao leitor de tela).
  assert.doesNotMatch(html, /ckb-ed-btn--publish-locked[^>]*disabled=""/);

  // Rascunho válido: nada de faixa e o title volta ao do protótipo.
  const valido = modeloComCampo("single_choice", { options: ["Preto", "Prata"] }, "Cor do veículo");
  const htmlValido = await renderEditor(WRITE_PERMISSIONS, { checklist: valido });
  assert.doesNotMatch(htmlValido, /ckb-ed-blockbar/);
  assert.match(htmlValido, /title="Publicar e disponibilizar no aplicativo"/);
  assert.doesNotMatch(htmlValido, /ckb-ed-btn--publish-locked/);
});

test("escritas no config são puras e clampadas (opções, flags com default, números e chips)", async () => {
  const { applyChecklistConfigChange, componentFlagConfig, componentListConfig, componentNumberConfig, componentOptions } =
    await import("../src/modules/checklists/checklist-editor.model");

  const draft = {
    name: "M",
    description: "",
    type: "custom" as const,
    sections: ["S"],
    components: [
      {
        id: "x",
        componentKey: "k-x",
        type: "multi_choice" as const,
        label: "Itens",
        required: false,
        config: { sectionIndex: 0, options: ["A", "B"] },
        validationRules: {},
        visibilityRules: {},
      },
    ],
  };
  const config = (next: typeof draft) => next.components[0]!;

  // Opções: adicionar entra com o rótulo acentuado do protótipo.
  assert.deepEqual([...componentOptions(config(applyChecklistConfigChange(draft, "x", { kind: "option_add" })))], [
    "A",
    "B",
    "Nova opção",
  ]);
  // Renomear/mover/remover, sem mutar o rascunho original (pureza).
  assert.deepEqual(
    [...componentOptions(config(applyChecklistConfigChange(draft, "x", { kind: "option_rename", index: 0, text: "Estepe" })))],
    ["Estepe", "B"],
  );
  assert.deepEqual(
    [...componentOptions(config(applyChecklistConfigChange(draft, "x", { kind: "option_move", index: 1, direction: "up" })))],
    ["B", "A"],
  );
  // Na borda, mover é no-op (não estoura nem duplica).
  assert.deepEqual(
    [...componentOptions(config(applyChecklistConfigChange(draft, "x", { kind: "option_move", index: 0, direction: "up" })))],
    ["A", "B"],
  );
  assert.deepEqual(
    [...componentOptions(config(applyChecklistConfigChange(draft, "x", { kind: "option_remove", index: 0 })))],
    ["B"],
  );
  assert.deepEqual([...componentOptions(draft.components[0])], ["A", "B"], "o rascunho de entrada não pode ser mutado");

  // Números: piso respeitado e texto/vazio NUNCA viram NaN (que persistiria como null no JSON).
  const comFoto = { ...draft, components: [{ ...draft.components[0], type: "photo_upload" as const }] };
  assert.equal(
    componentNumberConfig(config(applyChecklistConfigChange(comFoto, "x", { kind: "number", key: "maxPhotos", raw: "0", min: 1 })), "maxPhotos", 1, 1),
    1,
  );
  assert.equal(
    componentNumberConfig(config(applyChecklistConfigChange(comFoto, "x", { kind: "number", key: "minPhotos", raw: "", min: 0 })), "minPhotos", 9, 0),
    0,
  );
  assert.equal(
    componentNumberConfig(config(applyChecklistConfigChange(comFoto, "x", { kind: "number", key: "minPhotos", raw: "abc", min: 0 })), "minPhotos", 9, 0),
    0,
  );

  // Flags: `multiline`/`requireBothStages` nascem LIGADAS; as demais, desligadas (protótipo).
  const obs = { ...draft, components: [{ ...draft.components[0], type: "observation" as const, config: { sectionIndex: 0 } }] };
  assert.equal(componentFlagConfig(obs.components[0], "multiline", true), true);
  assert.equal(
    componentFlagConfig(config(applyChecklistConfigChange(obs, "x", { kind: "flag", key: "multiline", defaultOn: true })), "multiline", true),
    false,
  );
  assert.equal(componentFlagConfig(obs.components[0], "requireName", false), false);
  assert.equal(
    componentFlagConfig(config(applyChecklistConfigChange(obs, "x", { kind: "flag", key: "requireName", defaultOn: false })), "requireName", false),
    true,
  );

  // Chips: alternam a chave dentro da lista (nunca duplicam nem perdem as outras).
  const veic = {
    ...draft,
    components: [{ ...draft.components[0], type: "vehicle_selector" as const, config: { sectionIndex: 0, vehicleTypes: ["car"] } }],
  };
  const comMoto = applyChecklistConfigChange(veic, "x", { kind: "list_toggle", key: "vehicleTypes", value: "motorcycle" });
  assert.deepEqual([...componentListConfig(config(comMoto), "vehicleTypes")], ["car", "motorcycle"]);
  const semCarro = applyChecklistConfigChange(comMoto, "x", { kind: "list_toggle", key: "vehicleTypes", value: "car" });
  assert.deepEqual([...componentListConfig(config(semCarro), "vehicleTypes")], ["motorcycle"]);

  // Select: grava a CHAVE (é ela que o aplicativo lê), não o rótulo.
  const comp = { ...draft, components: [{ ...draft.components[0], type: "comparison" as const, config: { sectionIndex: 0 } }] };
  const trocado = applyChecklistConfigChange(comp, "x", { kind: "select", key: "compareWith", value: "related_delivery" });
  assert.equal(config(trocado).config.compareWith, "related_delivery");

  // Campo inexistente: no-op (nunca cria componente fantasma).
  assert.equal(applyChecklistConfigChange(draft, "nao-existe", { kind: "option_add" }), draft);
});

test("o config tipado sobrevive ao PATCH (round-trip pelo payload real do editor)", async () => {
  const { applyChecklistConfigChange, buildUpdateInputFromEditorDraft, createEditorDraftFromChecklist } = await import(
    "../src/modules/checklists/checklist-editor.model"
  );

  const modelo = modeloComCampo("multi_choice", { options: ["A"], minSelected: 1 }, "Itens do veículo");
  let draft = createEditorDraftFromChecklist(modelo);
  const id = draft.components[0]!.id;

  draft = applyChecklistConfigChange(draft, id, { kind: "option_add" });
  draft = applyChecklistConfigChange(draft, id, { kind: "number", key: "minSelected", raw: "2", min: 0 });

  const input = buildUpdateInputFromEditorDraft(draft, modelo.schema);
  const enviado = input.components![0]!;
  assert.deepEqual(enviado.config.options, ["A", "Nova opção"]);
  assert.equal(enviado.config.minSelected, 2);
  // A âncora de seção continua junto — o config tipado não atropela a convenção do PR-02b.
  assert.equal(enviado.config.sectionIndex, 0);
});

test("opções semeadas pela paleta são PT-BR (o catálogo do backend manda 'Opcao 1' sem acento)", async () => {
  const { resolveChecklistComponentDefaultConfig } = await import("../src/modules/checklists/checklist.constants");

  // Semente crua do backend → substituída (essas strings são as RESPOSTAS que o técnico lê no app).
  assert.deepEqual(resolveChecklistComponentDefaultConfig("single_choice", { options: ["Opcao 1", "Opcao 2"] }), {
    options: ["Opção 1", "Opção 2"],
  });
  assert.deepEqual(resolveChecklistComponentDefaultConfig("multi_choice", { options: [], minSelected: 0 }), {
    options: ["Opção 1", "Opção 2"],
    minSelected: 0,
  });
  // Opções já escritas pela organização passam VERBATIM (o editor não reescreve conteúdo do cliente).
  assert.deepEqual(resolveChecklistComponentDefaultConfig("single_choice", { options: ["Sim", "Não"] }), {
    options: ["Sim", "Não"],
  });
  // Tipo sem opções não é tocado.
  assert.deepEqual(resolveChecklistComponentDefaultConfig("photo_upload", { minPhotos: 1 }), { minPhotos: 1 });
});

test("guarda de edição concorrente: cópia e as 2 saídas (P-CHK-PATCH-SEM-LOCK)", async () => {
  const { ConcurrentEditDialog } = await import("../src/modules/checklists/pages/ChecklistEditorPage");

  const html = renderToString(<ConcurrentEditDialog onReload={() => {}} onOverwrite={() => {}} />);

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Outra pessoa alterou este modelo/);
  assert.match(
    html,
    /Este modelo foi alterado por outra pessoa depois que você o abriu\. Recarregar traz a versão mais recente e descarta as suas alterações não salvas; sobrescrever mantém as suas e substitui as dela\./,
  );
  assert.match(html, /Recarregar o modelo/);
  assert.match(html, /Sobrescrever mesmo assim/);
  // O foco entra pela saída CONSERVADORA (recarregar não destrói o trabalho de quem já salvou).
  assert.match(html, /autofocus=""[^>]*>Recarregar o modelo</);
  // Sobrescrever é a ação destrutiva — vestida como tal.
  assert.match(html, /ckb-ed-modal-btn--danger[^>]*>Sobrescrever mesmo assim</);
});

test("editor: Reativar aparece no lugar de Inativar quando o modelo está inativo", async () => {
  const inativo = { ...MODELO, status: "inactive" } as unknown as AnyChecklist;
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: inativo });

  assert.match(html, /aria-label="Reativar modelo"/);
  assert.doesNotMatch(html, /aria-label="Inativar modelo"/);
  assert.match(html, /Inativo/);
});
