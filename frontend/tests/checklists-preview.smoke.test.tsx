import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// CHECKLIST P1 PR-02d — smoke da PRÉ-VISUALIZAÇÃO do editor de "Modelos de Checklist"
// (Modelos de Checklist.dc.html, blocos `previewModal` e `previewDock`). O que este arquivo prova:
//  · os 4 números do "Resumo do modelo" saem do RASCUNHO REAL (dois modelos diferentes → números
//    diferentes: constante disfarçada não passa);
//  · cada um dos 10 tipos de campo desenha o SEU bloco no telefone, com as OPÇÕES REAIS;
//  · banner de bloqueio × banner verde, e o Publicar travado dentro do modal;
//  · ZERO dado fabricado no cabeçalho do telefone (nada de "OS-4821 · Transportes Ômega" — D-007);
//  · a11y do dialog (role/aria-modal/aria-labelledby/foco) e o frame como ilustração aria-hidden;
//  · a decisão modal × dock, que é ÚNICA e automática (`resolveChecklistPreviewMode`).

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
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {} }) },
  });
  return { localStorage, clear: () => storage.clear() };
}

const browser = installBrowserTestGlobals();

/** Texto VISÍVEL (tags fora) — o SSR do React separa interpolações com marcadores de comentário. */
function visibleText(html: string): string {
  return html.replace(/<!--[^>]*-->/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function countOccurrences(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

const TENANT_ID = "ten-industrial-01";
const BRANCH_ID = "fil-sp-01";
const ORG_NAME = "Techsolutions Industrial";
const CHECKLIST_ID = "chk-preview-01";

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: ORG_NAME,
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

const CATALOGO: readonly AnyCatalogItem[] = [
  {
    type: "vehicle_selector",
    label: "Seletor de veiculo",
    description: "Permite selecionar tipo de veiculo e resolver imagem dinamica para vistoria.",
    defaultConfig: { vehicleTypes: ["car"] },
  },
  {
    type: "photo_upload",
    label: "Foto",
    description: "Coleta fotos pela camera ou galeria.",
    defaultConfig: { minPhotos: 1, maxPhotos: 4 },
  },
] as unknown as readonly AnyCatalogItem[];

const WRITE_PERMISSIONS = [
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
] as const;

type CampoSpec = {
  readonly type: string;
  readonly label: string;
  readonly required?: boolean;
  readonly config?: Record<string, unknown>;
};

function modelo(input: {
  readonly name?: string;
  readonly sections: readonly string[];
  readonly campos: readonly CampoSpec[];
}): AnyChecklist {
  return {
    id: CHECKLIST_ID,
    tenantId: TENANT_ID,
    name: input.name ?? "Vistoria de coleta — padrão",
    type: "towing_collection",
    status: "draft",
    version: 2,
    publishedAt: null,
    updatedAt: "2026-07-20T10:00:00.000Z",
    schema: { source: "ckb_editor", sections: [...input.sections] },
    components: input.campos.map((campo, index) => ({
      id: `cmp-${index}`,
      componentKey: `${campo.type}_${index}`,
      type: campo.type,
      label: campo.label,
      required: campo.required ?? false,
      orderIndex: index,
      config: { sectionIndex: 0, ...(campo.config ?? {}) },
      validationRules: {},
      visibilityRules: {},
    })),
  } as unknown as AnyChecklist;
}

/** Modelo com os 10 tipos, cada um configurado com valores REAIS e reconhecíveis. */
const MODELO_COMPLETO = modelo({
  name: "Vistoria completa do guincho",
  sections: ["Dados do veículo", "Encerramento"],
  campos: [
    { type: "vehicle_selector", label: "Tipo de veículo", required: true, config: { vehicleTypes: ["truck", "motorcycle"] } },
    { type: "damage_map", label: "Avarias encontradas", config: { markerTypes: ["scratch", "dent"] } },
    { type: "photo_upload", label: "Fotos da coleta", required: true, config: { minPhotos: 4, maxPhotos: 8 } },
    { type: "observation", label: "Observações do técnico", config: { multiline: true, maxLength: 300 } },
    { type: "single_choice", label: "Combustível no tanque", config: { options: ["Reserva", "Meio tanque", "Cheio"] } },
    { type: "multi_choice", label: "Itens conferidos", config: { options: ["Estepe", "Macaco", "Triângulo"] } },
    { type: "signature", label: "Assinatura do responsável", required: true, config: { requireName: true } },
    { type: "acknowledgement", label: "Ciência da responsabilidade", config: {} },
    { type: "before_after", label: "Registro em dois estágios", config: {} },
    { type: "comparison", label: "Comparação com a coleta", config: { compareWith: "related_collection" } },
  ],
});

async function renderEditor(
  permissions: readonly string[],
  options: {
    readonly checklist: AnyChecklist;
    readonly previewOpen?: boolean;
    readonly previewMode?: "modal" | "dock";
    readonly tab?: "estrutura" | "aplicabilidade";
  },
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
                  <ChecklistEditorPage
                    initialChecklist={options.checklist}
                    initialComponents={CATALOGO}
                    initialTab={options.tab}
                    initialPreviewOpen={options.previewOpen ?? true}
                    initialPreviewMode={options.previewMode ?? "modal"}
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

// ── Modal: composição verbatim do protótipo ───────────────────────────────────────────────────

test("preview (modal): kicker, título, subtítulo e as duas saídas do rodapé, verbatim do protótipo", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO });

  assert.match(html, /PRÉ-VISUALIZAÇÃO/);
  assert.match(html, /Como o formulário fica montado/);
  assert.match(
    html,
    /simulação da ordem e do conteúdo dos campos no aplicativo de campo — não uma cópia do visual do aplicativo/,
  );
  assert.match(html, /Resumo do modelo/);
  assert.match(html, /Continuar editando/);
  assert.match(html, /Publicar modelo/);
  assert.match(html, /aria-label="Fechar pré-visualização"/);
  // O botão que abriu fica marcado como expandido (o mesmo controle fecha).
  assert.match(html, /aria-expanded="true"/);
});

test("preview: os 4 números do resumo saem do RASCUNHO REAL (modelos diferentes → números diferentes)", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO });
  const texto = visibleText(html);

  // 10 campos · 3 obrigatórios · 4 fotos mínimas (minPhotos do ÚNICO campo de foto) · 2 seções.
  assert.match(texto, /10 campos no formulário/);
  assert.match(texto, /3 obrigatórios/);
  assert.match(texto, /4 fotos mínimas/);
  assert.match(texto, /2 seções/);

  // Outro modelo, com OUTRA configuração: se os números fossem constantes, este teste passaria
  // igual ao de cima — é exatamente isso que ele existe para impedir.
  const outro = modelo({
    sections: ["Única"],
    campos: [
      { type: "photo_upload", label: "Fotos do chassi", required: true, config: { minPhotos: 6, maxPhotos: 6 } },
      { type: "photo_upload", label: "Fotos do painel", config: { minPhotos: 2, maxPhotos: 4 } },
    ],
  });
  const textoOutro = visibleText(await renderEditor(WRITE_PERMISSIONS, { checklist: outro }));
  assert.match(textoOutro, /2 campos no formulário/);
  assert.match(textoOutro, /1 obrigatório(?!s)/);
  // 6 + 2 = 8 — a soma real do `minPhotos` de cada campo de foto, não um número fixo.
  assert.match(textoOutro, /8 fotos mínimas/);
  assert.match(textoOutro, /1 seção/);
});

test("preview: cada um dos 10 tipos desenha o SEU bloco no telefone, com as opções REAIS", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO });
  const texto = visibleText(html);

  // Cabeçalho do telefone: nome REAL do modelo + seções REAIS do rascunho.
  assert.match(html, /Vistoria completa do guincho/);
  assert.match(html, /ckb-pv-sec-title[^>]*>Dados do veículo</);
  assert.match(html, /ckb-pv-sec-title[^>]*>Encerramento</);

  // vehicle_selector — chips dos tipos ACEITOS (o 1º aparece escolhido, como no protótipo).
  assert.match(html, /ckb-pv-chip ckb-pv-chip--on">Caminhão</);
  assert.match(html, /ckb-pv-chip">Moto</);
  // Tipo NÃO marcado no config não pode aparecer como aceito.
  assert.doesNotMatch(html, /ckb-pv-chip[^>]*>Utilitário</);

  // damage_map — silhueta + pinos + tipos de avaria REAIS.
  assert.match(html, /ckb-pv-damage/);
  assert.match(html, /ckb-pv-pin ckb-pv-pin--a/);
  assert.match(html, /ckb-pv-pin ckb-pv-pin--b/);
  assert.match(html, /ckb-pv-mark">Risco</);
  assert.match(html, /ckb-pv-mark">Amassado</);

  // photo_upload — 4 espaços (minPhotos real) e a dica com os DOIS números do config.
  assert.equal(countOccurrences(html, 'class="ckb-pv-slot"'), 4);
  assert.match(texto, /Mínimo 4 · máximo 8/);

  // observation — textarea falso com o placeholder do protótipo.
  assert.match(html, /Digite aqui…/);
  assert.match(html, /ckb-pv-textarea/);

  // single_choice — radios com as opções REAIS (nunca a semente "Opção 1"/"Opção 2").
  assert.match(html, /ckb-pv-radio/);
  assert.match(html, /Reserva/);
  assert.match(html, /Meio tanque/);
  assert.match(html, /Cheio/);
  // multi_choice — caixas com as opções REAIS.
  assert.match(html, /ckb-pv-check/);
  assert.match(html, /Estepe/);
  assert.match(html, /Macaco/);
  assert.match(html, /Triângulo/);
  assert.doesNotMatch(texto, /Opção 1|Opção 2/);

  // signature — campo de nome (porque `requireName` é true) + pad.
  assert.match(html, /Nome de quem assina/);
  assert.match(html, /Assine no espaço acima/);

  // acknowledgement — a frase de ciência do protótipo.
  assert.match(html, /Declaro ciência da responsabilidade sobre o veículo/);

  // before_after e comparison — as duas colunas de cada um.
  assert.match(html, /ckb-pv-duo-slot[^>]*>.*?Antes/s);
  assert.match(html, /Depois/);
  assert.match(html, /ckb-pv-cmp">Coleta</);
  assert.match(html, /ckb-pv-cmp ckb-pv-cmp--now">Agora</);

  // Obrigatório marcado com asterisco vermelho; CTA final do protótipo.
  assert.match(html, /ckb-pv-req/);
  assert.match(html, /Concluir checklist/);

  // §3/§2.8 — nada de chave técnica nem de identificador cru no que o usuário lê.
  assert.doesNotMatch(texto, /vehicle_selector|damage_map|photo_upload|single_choice|multi_choice|before_after|comparison/);
  assert.doesNotMatch(texto, /related_collection|markerTypes|vehicleTypes|minPhotos/);
  assert.doesNotMatch(texto, /\btenant\b/i);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
  assert.doesNotMatch(html, new RegExp(CHECKLIST_ID));
});

test("preview: campo sem nome de assinante NÃO desenha a linha de nome (o config manda de verdade)", async () => {
  const semNome = modelo({
    sections: ["Encerramento"],
    campos: [{ type: "signature", label: "Assinatura do cliente", config: { requireName: false } }],
  });
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: semNome });

  assert.match(html, /Assine no espaço acima/);
  assert.doesNotMatch(html, /Nome de quem assina/);
});

test("preview: observação de UMA linha usa a variante curta (o config muda o desenho)", async () => {
  const curta = modelo({
    sections: ["Notas"],
    campos: [{ type: "observation", label: "Placa lida no local", config: { multiline: false } }],
  });
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: curta });

  assert.match(html, /ckb-pv-textarea ckb-pv-textarea--single/);
});

// ── Anti-mock (D-007) ─────────────────────────────────────────────────────────────────────────

test("preview: o cabeçalho do telefone usa a organização REAL — nunca a OS fictícia do protótipo", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO });
  const texto = visibleText(html);

  // O protótipo escrevia "OS-4821 · Transportes Ômega". Dado inventado com cara de real: fora.
  assert.doesNotMatch(html, /OS-4821/);
  assert.doesNotMatch(html, /Transportes Ômega/);
  // No lugar: nome REAL da organização ativa + rótulo que diz o que a tela é.
  assert.match(texto, new RegExp(`${ORG_NAME} · Pré-visualização · sem ordem vinculada`));
});

test("preview: modelo SEM campos mostra a mensagem honesta no telefone (e nenhum botão de concluir)", async () => {
  const vazio = modelo({ sections: ["Dados do veículo"], campos: [] });
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: vazio });
  const texto = visibleText(html);

  assert.match(html, /ckb-pv-phone-empty/);
  assert.match(html, /Nenhum campo ainda/);
  assert.match(
    texto,
    /Adicione campos ao formulário para ver aqui, exatamente, o que o técnico vai preencher em campo\./,
  );
  // Um "Concluir checklist" sobre um formulário vazio seria uma promessa falsa.
  assert.doesNotMatch(html, /Concluir checklist/);
  // O resumo continua REAL: zero campos, zero obrigatórios, zero fotos, 1 seção.
  assert.match(texto, /0 campos no formulário/);
  assert.match(texto, /1 seção/);
});

test("preview: campo de escolha sem opções diz isso no telefone em vez de fingir um card completo", async () => {
  const semOpcoes = modelo({
    sections: ["Formulário"],
    campos: [{ type: "single_choice", label: "Cor do veículo", config: { options: [] } }],
  });
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: semOpcoes });

  assert.match(html, /Nenhuma opção configurada — o técnico não teria o que responder\./);
  assert.doesNotMatch(html, /ckb-pv-radio/);
});

// ── Bloqueio × pronto para publicar ───────────────────────────────────────────────────────────

test("preview: banner de bloqueio + Publicar TRAVADO no modal quando o modelo não pode ser publicado", async () => {
  const semOpcoes = modelo({
    sections: ["Formulário"],
    campos: [{ type: "single_choice", label: "Cor do veículo", config: { options: [] } }],
  });
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: semOpcoes });

  assert.match(html, /ckb-pv-banner ckb-pv-banner--block/);
  assert.match(html, /O campo “Cor do veículo” está sem opções — adicione ao menos 1 para publicar\./);
  assert.doesNotMatch(html, /Modelo pronto para publicar/);
  // Travado é CINZA e clicável (o clique explica o bloqueio) — nunca `disabled`, que não dá retorno.
  assert.match(html, /ckb-pv-btn ckb-pv-btn--publish ckb-pv-btn--locked/);
  assert.match(html, /aria-disabled="true"/);
  assert.doesNotMatch(html, /ckb-pv-btn--locked[^>]*disabled=""/);
  assert.match(html, /title="O campo “Cor do veículo” está sem opções — adicione ao menos 1 para publicar\."/);
});

test("preview: TODOS os bloqueios aparecem no modal (é o momento de conferir antes de publicar)", async () => {
  const doisProblemas = modelo({
    sections: ["Formulário"],
    campos: [
      { type: "single_choice", label: "Cor", config: { options: [] } },
      { type: "multi_choice", label: "Itens", config: { options: ["Estepe"] } },
      { type: "observation", label: "   ", config: {} },
    ],
  });
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: doisProblemas });

  assert.match(html, /O campo “Cor” está sem opções — adicione ao menos 1 para publicar\./);
  assert.match(html, /Um campo está sem a pergunta exibida ao técnico — preencha para publicar\./);
  assert.equal(countOccurrences(html, "ckb-pv-banner-line"), 2);
});

test("preview: modelo válido mostra o banner verde e o Publicar livre", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO });

  assert.match(html, /ckb-pv-banner ckb-pv-banner--ok/);
  assert.match(html, /Modelo pronto para publicar/);
  assert.doesNotMatch(html, /ckb-pv-btn--locked/);
  assert.match(html, /title="Publicar e disponibilizar no aplicativo"/);
});

test("preview: quem não pode publicar não vê o botão de publicar dentro do modal (esconde-fino)", async () => {
  const html = await renderEditor(["tenant_checklists:read", "tenant_checklists:update"], {
    checklist: MODELO_COMPLETO,
  });

  // A conferência continua disponível (ler o modelo não é escrever)…
  assert.match(html, /Como o formulário fica montado/);
  assert.match(html, /Continuar editando/);
  // …mas a ação que ele não tem não é oferecida. O backend segue sendo a autoridade (§2.4).
  assert.doesNotMatch(html, /Publicar modelo/);
});

// ── a11y ───────────────────────────────────────────────────────────────────────────────────────

test("preview: o modal é um dialog de verdade e o telefone é ilustração com resumo textual", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO });

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);

  // aria-labelledby precisa APONTAR para o título que está na tela (não basta existir o atributo).
  // O `aria-labelledby` lido é o DO DIALOG — a página tem outros (o painel de abas, por exemplo).
  const labelledBy = /role="dialog" aria-modal="true" aria-labelledby="([^"]+)"/.exec(html);
  assert.ok(labelledBy, "o dialog precisa declarar aria-labelledby");
  assert.match(html, new RegExp(`id="${labelledBy![1]}"[^>]*>Como o formulário fica montado<`));

  // O frame é decorativo para quem usa leitor de tela; o conteúdo vai em palavras logo antes dele.
  assert.match(html, /class="ckb-pv-phone" aria-hidden="true"/);
  assert.match(
    visibleText(html),
    /Ilustração do aplicativo de campo com 10 campos em 2 seções\. O resumo do modelo, ao lado, traz os mesmos números em texto\./,
  );
});

// ── Modal × dock ───────────────────────────────────────────────────────────────────────────────

test("preview (dock): vira a 4ª coluna da Estrutura e a paleta colapsa para ícones com dica", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO, previewMode: "dock" });

  assert.match(html, /ckb-ed-grid ckb-ed-grid--preview/);
  assert.match(html, /ckb-pv-dock/);
  assert.match(html, /Como o formulário fica montado/);
  assert.match(html, /Aplicativo de campo · 390 × 812/);
  assert.match(html, /ckb-pv-phone ckb-pv-phone--dock/);
  // Paleta COLAPSADA: some o cabeçalho e o texto de cada item, ficam ícone + dica "rótulo — desc"…
  assert.doesNotMatch(html, /Campos disponíveis/);
  assert.doesNotMatch(html, /ckb-ed-pal-label/);
  assert.match(html, /ckb-ed-pal-item ckb-ed-pal-item--compact/);
  assert.match(html, /title="Seletor de veículo — Tipo do veículo e imagem da vistoria"/);
  // …e o botão continua nomeado para quem usa leitor de tela (ícone sozinho não é rótulo).
  assert.match(html, /aria-label="Adicionar campo Seletor de veículo"/);
  // O dock é a MESMA prévia: nada de modal por cima ao mesmo tempo.
  assert.doesNotMatch(html, /ckb-pv-overlay/);
});

test("preview fechada: nem dock nem modal montam, e a grade volta ao desenho de 3 colunas", async () => {
  const html = await renderEditor(WRITE_PERMISSIONS, { checklist: MODELO_COMPLETO, previewOpen: false });

  assert.doesNotMatch(html, /ckb-pv-overlay|ckb-pv-dock|ckb-pv-phone/);
  assert.doesNotMatch(html, /ckb-ed-grid--preview/);
  assert.match(html, /Campos disponíveis/);
  assert.match(html, /aria-expanded="false"/);
});

test("modal × dock é decisão ÚNICA e automática: largura da janela + aba ativa", async () => {
  const { resolveChecklistPreviewMode, CHECKLIST_PREVIEW_DOCK_MIN_WIDTH } = await import(
    "../src/modules/checklists/checklist-preview.model"
  );

  assert.equal(CHECKLIST_PREVIEW_DOCK_MIN_WIDTH, 1600);
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: 1920, onStructureTab: true }), "dock");
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: 1600, onStructureTab: true }), "dock");
  // 1px abaixo do piso medido: o dock espremeria o formulário, então a prévia vira modal.
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: 1599, onStructureTab: true }), "modal");
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: 1280, onStructureTab: true }), "modal");
  // O dock é uma COLUNA da aba Estrutura — fora dela só existe o modal.
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: 1920, onStructureTab: false }), "modal");
  // Largura desconhecida (render de servidor) NÃO vira número inventado: cai no modal.
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: null, onStructureTab: true }), "modal");
  assert.equal(resolveChecklistPreviewMode({ viewportWidth: Number.NaN, onStructureTab: true }), "modal");
});

// ── Modelo puro da prévia ──────────────────────────────────────────────────────────────────────

test("modelo da prévia: estatísticas, espaços de foto, dica e contexto saem do rascunho (funções puras)", async () => {
  const {
    checklistPreviewStats,
    checklistPreviewPhotoSlots,
    checklistPreviewPhotoHint,
    checklistPreviewContextLine,
    checklistPreviewSections,
    checklistPreviewTitle,
    CHECKLIST_PREVIEW_UNNAMED_FIELD,
    CHECKLIST_PREVIEW_UNNAMED_MODEL,
  } = await import("../src/modules/checklists/checklist-preview.model");

  const campo = (type: string, config: Record<string, unknown>, required = false, label = "Campo") => ({
    id: `id-${type}`,
    componentKey: `k-${type}`,
    type: type as never,
    label,
    required,
    config: { sectionIndex: 0, ...config },
    validationRules: {},
    visibilityRules: {},
  });

  const draft = {
    name: "Vistoria",
    description: "",
    type: "towing_collection" as const,
    sections: ["Coleta", "Entrega"],
    components: [
      campo("photo_upload", { minPhotos: 3, maxPhotos: 5 }, true, "Fotos"),
      campo("signature", {}, true, "Assinatura"),
      { ...campo("observation", { sectionIndex: 1 }), config: { sectionIndex: 1 } },
    ],
  };

  assert.deepEqual(
    checklistPreviewStats(draft).map((stat) => [stat.value, stat.label]),
    [
      [3, "campos no formulário"],
      [2, "obrigatórios"],
      [3, "fotos mínimas"],
      [2, "seções"],
    ],
  );

  // Espaços de foto: nunca contradizem a legenda ao lado (junta PR-02d). Campo recém-criado anuncia
  // "máximo 1", então desenha 1 quadro — antes desenhava 2 e a dica dizia 1, na mesma tela.
  assert.equal(checklistPreviewPhotoSlots(campo("photo_upload", {})), 1);
  assert.equal(checklistPreviewPhotoSlots(campo("photo_upload", { maxPhotos: 4 })), 2, "sem mínimo, mostra 2 quando o máximo permite");
  assert.equal(checklistPreviewPhotoSlots(campo("photo_upload", { minPhotos: 3, maxPhotos: 6 })), 3);
  assert.equal(checklistPreviewPhotoSlots(campo("photo_upload", { minPhotos: 40, maxPhotos: 40 })), 8);

  // Dica com os números reais. DIVERGÊNCIA do protótipo: máximo cai em 1 (o mesmo do inspector),
  // nunca em "máximo 0" — a prévia não pode contradizer a tela de configuração ao lado.
  assert.equal(checklistPreviewPhotoHint(campo("photo_upload", { minPhotos: 2, maxPhotos: 6 })), "Mínimo 2 · máximo 6");
  assert.equal(checklistPreviewPhotoHint(campo("photo_upload", {})), "Mínimo 0 · máximo 1");

  // Contexto do cabeçalho: organização real; sem organização, só o rótulo — jamais uma OS fictícia.
  assert.equal(checklistPreviewContextLine("Transportadora Vale"), "Transportadora Vale · Pré-visualização · sem ordem vinculada");
  assert.equal(checklistPreviewContextLine(null), "Pré-visualização · sem ordem vinculada");
  assert.equal(checklistPreviewContextLine("   "), "Pré-visualização · sem ordem vinculada");
  assert.doesNotMatch(checklistPreviewContextLine("Org"), /OS-\d+/);

  // Seções na ordem do rascunho, cada campo na sua.
  const secoes = checklistPreviewSections(draft);
  assert.deepEqual(
    secoes.map((section) => [section.title, section.items.length]),
    [
      ["Coleta", 2],
      ["Entrega", 1],
    ],
  );

  // Rótulos ausentes não viram card mudo nem nome fabricado de modelo.
  const semNome = { ...draft, name: "  ", components: [campo("observation", {}, false, "  ")] };
  assert.equal(checklistPreviewTitle(semNome), CHECKLIST_PREVIEW_UNNAMED_MODEL);
  assert.equal(checklistPreviewSections(semNome)[0].items[0].label, CHECKLIST_PREVIEW_UNNAMED_FIELD);
});
