import { checklistDamageMarkerLabel, checklistVehicleTypeLabel } from "./checklist.constants";
import {
  componentFlagConfig,
  componentHelpText,
  componentListConfig,
  componentNumberConfig,
  componentOptions,
  componentsInSection,
} from "./checklist-editor.model";
import type { ChecklistEditorComponent, ChecklistEditorDraft } from "./checklist-editor.model";

// CHECKLIST P1 PR-02d — modelo PURO da PRÉ-VISUALIZAÇÃO (protótipo do dono, blocos `previewModal`
// e `previewDock` de Modelos de Checklist.dc.html). Tudo aqui é função sem React: o que o telefone
// mostra e os 4 números do "Resumo do modelo" saem do RASCUNHO REAL, lidos pelas MESMAS funções de
// config que o inspector usa (`componentOptions`, `componentNumberConfig`, `componentFlagConfig`,
// `componentListConfig`) — nenhuma regra de leitura de `config` é reescrita aqui.

/** Modo da pré-visualização: coluna ao lado do formulário (dock) ou modal sobre a tela. */
export type ChecklistPreviewMode = "dock" | "modal";

/**
 * DECISÃO (registrada na ata): o protótipo expõe a prop `previewLado` e deixa a escolha para quem
 * monta a tela. Aqui ela é AUTOMÁTICA pela largura da janela, com o MESMO botão "Pré-visualizar" —
 * sem um segundo controle para o usuário administrar.
 *
 * Por que 1600px (medido, não chutado): no modo dock a grade da aba Estrutura vira
 * `76 + 340 + 300 + 392` mais 3 gaps de 14 e 48 de padding = **1198px** de conteúdo; somando a
 * barra lateral de 236px do shell dá **1434px** de janela só para caber no mínimo. Abaixo de 1600
 * o canvas ficaria no piso (340px) e o editor viraria uma fileira de tiras — então a
 * pré-visualização vira MODAL, que não disputa largura com o formulário.
 */
export const CHECKLIST_PREVIEW_DOCK_MIN_WIDTH = 1600;

export function resolveChecklistPreviewMode(input: {
  /** `null` quando a largura ainda não é conhecida (render de servidor) — cai no modal. */
  readonly viewportWidth: number | null;
  /** O dock é uma COLUNA da grade da aba Estrutura; fora dela, só o modal existe. */
  readonly onStructureTab: boolean;
}): ChecklistPreviewMode {
  if (!input.onStructureTab) return "modal";
  if (input.viewportWidth === null || !Number.isFinite(input.viewportWidth)) return "modal";
  return input.viewportWidth >= CHECKLIST_PREVIEW_DOCK_MIN_WIDTH ? "dock" : "modal";
}

// ── Resumo do modelo (4 estatísticas do protótipo, todas derivadas do rascunho) ────────────────

export type ChecklistPreviewStat = {
  readonly key: string;
  readonly value: number;
  readonly label: string;
  readonly color: string;
};

/**
 * `prevStats` do protótipo — campos · obrigatórios · fotos mínimas · seções. As "fotos mínimas"
 * somam o `minPhotos` REAL de cada campo de foto (pela mesma leitura tipada do inspector), não um
 * número fixo.
 */
export function checklistPreviewStats(draft: ChecklistEditorDraft): readonly ChecklistPreviewStat[] {
  const required = draft.components.filter((component) => component.required).length;
  const minimumPhotos = draft.components
    .filter((component) => component.type === "photo_upload")
    .reduce((total, component) => total + componentNumberConfig(component, "minPhotos", 0, 0), 0);

  // Junta PR-02d (BAIXA): "1 campos no formulário" e "1 seções" apareciam sem concordância — a
  // mesma flexão que o resumo acessível já fazia agora vale para os 4 cartões.
  const flex = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);

  return [
    { key: "fields", value: draft.components.length, label: flex(draft.components.length, "campo no formulário", "campos no formulário"), color: "#2563EB" },
    { key: "required", value: required, label: flex(required, "obrigatório", "obrigatórios"), color: "#DC2626" },
    { key: "photos", value: minimumPhotos, label: flex(minimumPhotos, "foto mínima", "fotos mínimas"), color: "#15803D" },
    { key: "sections", value: draft.sections.length, label: flex(draft.sections.length, "seção", "seções"), color: "#7E22CE" },
  ];
}

// ── Conteúdo do telefone ───────────────────────────────────────────────────────────────────────

export type ChecklistPreviewChip = {
  readonly label: string;
  /** O primeiro tipo de veículo aparece "escolhido" (é assim que o app abre a pergunta). */
  readonly selected: boolean;
};

export type ChecklistPreviewItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly required: boolean;
  readonly help: string;
  readonly options: readonly string[];
  readonly vehicleChips: readonly ChecklistPreviewChip[];
  readonly markerChips: readonly string[];
  readonly photoSlots: number;
  readonly photoHint: string;
  readonly requireName: boolean;
  readonly multiline: boolean;
};

export type ChecklistPreviewSection = {
  readonly title: string;
  readonly items: readonly ChecklistPreviewItem[];
};

/** Rótulo vazio no rascunho não vira card mudo no telefone (o blocker já cobra o preenchimento). */
export const CHECKLIST_PREVIEW_UNNAMED_FIELD = "Campo sem pergunta";

/**
 * Espaços de foto desenhados: o protótipo usa `min(8, max(1, minPhotos || 2))` — campo recém-criado
 * (sem `minPhotos`) mostra 2 espaços, e o teto de 8 impede que uma configuração exagerada estoure a
 * grade de 4 colunas do telefone.
 */
/**
 * Junta PR-02d (MÉDIA): os espaços desenhados contradiziam a própria legenda ao lado — o telefone
 * mostrava 2 quadros enquanto a dica dizia "máximo 1". Os espaços agora respeitam o MESMO teto que
 * a legenda anuncia, e o piso de 2 (quando o mínimo é 0) nunca ultrapassa esse teto.
 */
export function checklistPreviewPhotoSlots(component: ChecklistEditorComponent): number {
  const minimum = componentNumberConfig(component, "minPhotos", 0, 0);
  const maximum = componentNumberConfig(component, "maxPhotos", 1, 1);
  const desired = minimum === 0 ? Math.min(2, maximum) : minimum;
  return Math.min(8, Math.max(1, Math.min(desired, maximum)));
}

/**
 * "Mínimo N · máximo N" com os valores REAIS do config.
 *
 * DIVERGÊNCIA CONSCIENTE do protótipo: lá o máximo cai em `|| 0` e a dica chega a dizer
 * "máximo 0" para um campo que aceita foto. O piso aqui é 1 — o MESMO que o inspector mostra e
 * grava (`componentNumberConfig(..., "maxPhotos", 1, 1)`), para a pré-visualização não contradizer
 * a tela de configuração ao lado.
 */
export function checklistPreviewPhotoHint(component: ChecklistEditorComponent): string {
  const minimum = componentNumberConfig(component, "minPhotos", 0, 0);
  const maximum = componentNumberConfig(component, "maxPhotos", 1, 1);
  return `Mínimo ${minimum} · máximo ${maximum}`;
}

function vehicleChips(component: ChecklistEditorComponent): readonly ChecklistPreviewChip[] {
  return componentListConfig(component, "vehicleTypes").map((key, index) => ({
    label: checklistVehicleTypeLabel[key] ?? key,
    selected: index === 0,
  }));
}

function markerChips(component: ChecklistEditorComponent): readonly string[] {
  return componentListConfig(component, "markerTypes").map((key) => checklistDamageMarkerLabel[key] ?? key);
}

export function checklistPreviewItem(component: ChecklistEditorComponent): ChecklistPreviewItem {
  return {
    id: component.id,
    type: component.type,
    label: component.label.trim().length > 0 ? component.label : CHECKLIST_PREVIEW_UNNAMED_FIELD,
    required: component.required,
    help: componentHelpText(component),
    options: componentOptions(component),
    vehicleChips: component.type === "vehicle_selector" ? vehicleChips(component) : [],
    markerChips: component.type === "damage_map" ? markerChips(component) : [],
    photoSlots: checklistPreviewPhotoSlots(component),
    photoHint: checklistPreviewPhotoHint(component),
    requireName: componentFlagConfig(component, "requireName", false),
    multiline: componentFlagConfig(component, "multiline", true),
  };
}

/** `prevSections` do protótipo: as seções do rascunho, na ordem, com os campos de cada uma. */
export function checklistPreviewSections(draft: ChecklistEditorDraft): readonly ChecklistPreviewSection[] {
  return draft.sections.map((title, sectionIndex) => ({
    title,
    items: componentsInSection(draft, sectionIndex).map(checklistPreviewItem),
  }));
}

/**
 * Linha de contexto do cabeçalho do telefone.
 *
 * DIVERGÊNCIA CONSCIENTE E DELIBERADA (D-007): o protótipo escreve "OS-4821 · Transportes Ômega" —
 * número de ordem e cliente INVENTADOS, com cara de dado real. Numa tela que o gestor abre para
 * conferir o modelo (e da qual tira print), isso é dado fabricado. Aqui entra o nome REAL da
 * organização ativa da sessão, mais um rótulo que diz o que a tela é: uma pré-visualização sem
 * ordem nenhuma vinculada.
 */
export function checklistPreviewContextLine(organizationName: string | null | undefined): string {
  const organization = (organizationName ?? "").trim();
  const suffix = "Pré-visualização · sem ordem vinculada";
  return organization.length > 0 ? `${organization} · ${suffix}` : suffix;
}

/** Nome exibido no telefone quando o rascunho ainda está sem nome (o blocker de salvar já cobra). */
export const CHECKLIST_PREVIEW_UNNAMED_MODEL = "Modelo sem nome";

export function checklistPreviewTitle(draft: ChecklistEditorDraft): string {
  return draft.name.trim().length > 0 ? draft.name : CHECKLIST_PREVIEW_UNNAMED_MODEL;
}

/**
 * Resumo TEXTUAL do telefone para leitor de tela: o frame é ilustração (`aria-hidden`), então o
 * conteúdo precisa existir em palavras em algum lugar — este é o texto que acompanha o frame.
 */
export function checklistPreviewAccessibleSummary(draft: ChecklistEditorDraft): string {
  const fields = draft.components.length;
  const sections = draft.sections.length;
  if (fields === 0) {
    return "Ilustração do aplicativo de campo: este modelo ainda não tem campos para o técnico responder.";
  }
  return `Ilustração do aplicativo de campo com ${fields}${fields === 1 ? " campo" : " campos"} em ${sections}${
    sections === 1 ? " seção" : " seções"
  }. O resumo do modelo, ao lado, traz os mesmos números em texto.`;
}
