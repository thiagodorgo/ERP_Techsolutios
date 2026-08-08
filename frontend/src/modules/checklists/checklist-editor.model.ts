import type {
  ChecklistJsonRecord,
  TenantChecklist,
  TenantChecklistComponentCatalogItem,
  TenantChecklistComponentType,
  TenantChecklistType,
  UpdateTenantChecklistInput,
} from "./types";

// CHECKLIST P1 PR-02b — modelo PURO do editor de "Modelos de Checklist" (funções sem React,
// auditáveis por teste de unidade). Convenção de persistência das SEÇÕES fixada na ata
// (docs/juntas/J-CHECKLIST-P1.md, "PR-02 — replanejado"): `schema.sections: string[]` no template
// + `config.sectionIndex` por componente (e `config.help` para o texto de ajuda). `schema` e
// `config` passam pelo validator backend como `z.record(z.unknown())` — chaves extras SOBREVIVEM
// ao PATCH (verificado em checklist.validator.ts + repositories; o round-trip é provado em
// tests/checklists-editor.smoke.test.tsx). ATENÇÃO: chave extra no TOPO do componente seria
// derrubada pelo z.object do validator — por isso a convenção vive DENTRO de `config`.

export type ChecklistEditorComponent = {
  readonly id: string;
  readonly componentKey: string;
  readonly type: TenantChecklistComponentType;
  readonly label: string;
  readonly required: boolean;
  readonly config: ChecklistJsonRecord;
  readonly validationRules: ChecklistJsonRecord;
  readonly visibilityRules: ChecklistJsonRecord;
};

export type ChecklistEditorDraft = {
  readonly name: string;
  readonly description: string;
  readonly type: TenantChecklistType;
  readonly sections: readonly string[];
  readonly components: readonly ChecklistEditorComponent[];
};

/** Deep-link do editor (rota registrada em App.tsx sob o MESMO guard da lista). */
export function checklistEditorPath(checklistId: string): string {
  return `/administrator/checklists/${encodeURIComponent(checklistId)}`;
}

/** Título da seção única quando o template ainda não tem seções salvas (modelos pré-editor). */
export const CHECKLIST_EDITOR_FALLBACK_SECTION = "Formulário";

/** Seed do protótipo para o "Novo modelo" instantâneo (nt.sections no dc.html). */
export const CHECKLIST_EDITOR_NEW_MODEL_SECTION = "Dados do veículo";

function editorUid(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Lê `schema.sections` com honestidade: só lista não-vazia de textos vale; senão, fallback. */
export function readSchemaSections(schema: Record<string, unknown>): string[] {
  const raw = schema.sections;
  if (Array.isArray(raw) && raw.length > 0 && raw.every((item) => typeof item === "string")) {
    return raw.map((item) => item as string);
  }
  return [CHECKLIST_EDITOR_FALLBACK_SECTION];
}

/** `config.sectionIndex` clampado ao intervalo real de seções (componente órfão cai na 1ª). */
export function componentSectionIndex(component: { readonly config: ChecklistJsonRecord }, sectionCount: number): number {
  const raw = component.config.sectionIndex;
  const index = typeof raw === "number" && Number.isInteger(raw) ? raw : 0;
  return Math.min(Math.max(index, 0), Math.max(sectionCount - 1, 0));
}

/** `config.help` como texto (ausente/inválido → vazio). */
export function componentHelpText(component: { readonly config: ChecklistJsonRecord }): string {
  const raw = component.config.help;
  return typeof raw === "string" ? raw : "";
}

export function createEditorDraftFromChecklist(checklist: TenantChecklist): ChecklistEditorDraft {
  return {
    name: checklist.name,
    description: checklist.description ?? "",
    type: checklist.type,
    sections: readSchemaSections(checklist.schema),
    components: checklist.components
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((component) => ({
        id: component.id,
        componentKey: component.componentKey,
        type: component.type,
        label: component.label,
        required: component.required,
        // config verbatim — sectionIndex/help e QUALQUER outra chave sobrevivem ao round-trip.
        config: component.config,
        validationRules: component.validationRules,
        visibilityRules: component.visibilityRules,
      })),
  };
}

/** Componentes de uma seção, na ordem do array (o render agrupa por seção como o protótipo). */
export function componentsInSection(draft: ChecklistEditorDraft, sectionIndex: number): readonly ChecklistEditorComponent[] {
  return draft.components.filter((component) => componentSectionIndex(component, draft.sections.length) === sectionIndex);
}

/**
 * PATCH do editor: achata as seções em `orderIndex` sequencial (seção 0 primeiro, na ordem do
 * canvas) e grava a convenção da ata. `baseSchema` preserva chaves extras que o template já
 * tivesse no schema (o editor não pode derrubar o que não conhece — a mesma exigência que se
 * faz ao backend).
 */
export function buildUpdateInputFromEditorDraft(
  draft: ChecklistEditorDraft,
  baseSchema: Record<string, unknown>,
): UpdateTenantChecklistInput {
  const ordered = draft.sections.flatMap((_, sectionIndex) => componentsInSection(draft, sectionIndex));
  // Junta PR-02b (BAIXA): o `components` do schema anterior é reescrito pelo backend a cada PATCH
  // — reenviá-lo só inflava o blob com uma cópia obsoleta. Removido do que sobe.
  const { components: _obsoleteComponents, ...schemaWithoutComponents } = baseSchema;

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    type: draft.type,
    schema: {
      ...schemaWithoutComponents,
      source: "ckb_editor",
      sections: [...draft.sections],
    },
    components: ordered.map((component, index) => ({
      componentKey: component.componentKey,
      type: component.type,
      label: component.label,
      required: component.required,
      orderIndex: index,
      config: {
        ...component.config,
        sectionIndex: componentSectionIndex(component, draft.sections.length),
        ...(componentHelpText(component).trim().length > 0 ? { help: componentHelpText(component) } : {}),
      },
      validationRules: component.validationRules,
      visibilityRules: component.visibilityRules,
    })),
  };
}

/** Inserção por CLIQUE (paleta): entra na seção alvo e o chamador seleciona o novo id. */
export function addEditorComponent(
  draft: ChecklistEditorDraft,
  catalogItem: TenantChecklistComponentCatalogItem,
  targetSectionIndex: number,
): { readonly draft: ChecklistEditorDraft; readonly componentId: string } {
  const uid = editorUid();
  const componentId = `local_${catalogItem.type}_${uid}`;
  const sectionIndex = Math.min(Math.max(targetSectionIndex, 0), Math.max(draft.sections.length - 1, 0));
  const component: ChecklistEditorComponent = {
    id: componentId,
    componentKey: `${catalogItem.type}_${uid}`,
    type: catalogItem.type,
    label: catalogItem.label,
    required: false,
    config: { ...catalogItem.defaultConfig, sectionIndex },
    validationRules: {},
    visibilityRules: {},
  };
  return { draft: { ...draft, components: [...draft.components, component] }, componentId };
}

/** Mover ↑/↓ — SÓ dentro da mesma seção (como o protótipo); na borda, no-op. */
export function moveEditorComponent(
  draft: ChecklistEditorDraft,
  componentId: string,
  direction: "up" | "down",
): ChecklistEditorDraft {
  const index = draft.components.findIndex((component) => component.id === componentId);
  if (index < 0) return draft;

  const section = componentSectionIndex(draft.components[index], draft.sections.length);
  const siblings = draft.components
    .map((component, position) => ({ component, position }))
    .filter((entry) => componentSectionIndex(entry.component, draft.sections.length) === section);
  const at = siblings.findIndex((entry) => entry.component.id === componentId);
  const target = siblings[direction === "up" ? at - 1 : at + 1];
  if (!target) return draft;

  const components = [...draft.components];
  components[index] = draft.components[target.position];
  components[target.position] = draft.components[index];
  return { ...draft, components };
}

/** Duplicar: cópia profunda do config, rótulo + " (cópia)", mesma seção, ao final dela. */
export function duplicateEditorComponent(
  draft: ChecklistEditorDraft,
  componentId: string,
): { readonly draft: ChecklistEditorDraft; readonly componentId: string | null } {
  const source = draft.components.find((component) => component.id === componentId);
  if (!source) return { draft, componentId: null };

  const uid = editorUid();
  const copy: ChecklistEditorComponent = {
    ...source,
    id: `local_${source.type}_${uid}`,
    componentKey: `${source.type}_${uid}`,
    label: `${source.label} (cópia)`,
    config: JSON.parse(JSON.stringify(source.config)) as ChecklistJsonRecord,
    validationRules: JSON.parse(JSON.stringify(source.validationRules)) as ChecklistJsonRecord,
    visibilityRules: JSON.parse(JSON.stringify(source.visibilityRules)) as ChecklistJsonRecord,
  };
  return { draft: { ...draft, components: [...draft.components, copy] }, componentId: copy.id };
}

export function removeEditorComponent(draft: ChecklistEditorDraft, componentId: string): ChecklistEditorDraft {
  return { ...draft, components: draft.components.filter((component) => component.id !== componentId) };
}

export function updateEditorComponent(
  draft: ChecklistEditorDraft,
  componentId: string,
  patch: { readonly label?: string; readonly required?: boolean; readonly help?: string },
): ChecklistEditorDraft {
  return {
    ...draft,
    components: draft.components.map((component) => {
      if (component.id !== componentId) return component;
      return {
        ...component,
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.required !== undefined ? { required: patch.required } : {}),
        ...(patch.help !== undefined ? { config: { ...component.config, help: patch.help } } : {}),
      };
    }),
  };
}

export function renameEditorSection(draft: ChecklistEditorDraft, sectionIndex: number, title: string): ChecklistEditorDraft {
  return { ...draft, sections: draft.sections.map((section, index) => (index === sectionIndex ? title : section)) };
}

/** "Nova seção" do protótipo (título seed idêntico). */
export function addEditorSection(draft: ChecklistEditorDraft): ChecklistEditorDraft {
  return { ...draft, sections: [...draft.sections, "Nova seção"] };
}

/**
 * Junta PR-02b (MÉDIA): "Nova seção" sem remoção deixava a tela sabendo só CRIAR lixo estrutural,
 * persistido em `schema.sections`. Só remove seção VAZIA (campo nenhum se perde) e nunca a última
 * seção restante; os `sectionIndex` seguintes são reindexados para não virarem órfãos.
 */
export function canRemoveEditorSection(draft: ChecklistEditorDraft, sectionIndex: number): boolean {
  if (draft.sections.length <= 1) return false;
  if (sectionIndex < 0 || sectionIndex >= draft.sections.length) return false;
  return componentsInSection(draft, sectionIndex).length === 0;
}

export function removeEditorSection(draft: ChecklistEditorDraft, sectionIndex: number): ChecklistEditorDraft {
  if (!canRemoveEditorSection(draft, sectionIndex)) return draft;
  return {
    ...draft,
    sections: draft.sections.filter((_, index) => index !== sectionIndex),
    components: draft.components.map((component) => {
      const current = componentSectionIndex(component, draft.sections.length);
      if (current <= sectionIndex) return component;
      return { ...component, config: { ...component.config, sectionIndex: current - 1 } };
    }),
  };
}

/** Meta do canvas — singular/plural exatos do protótipo. */
export function editorCanvasMeta(draft: ChecklistEditorDraft, version: number): string {
  const fields = draft.components.length;
  const sections = draft.sections.length;
  return `${fields}${fields === 1 ? " campo" : " campos"} · ${sections}${sections === 1 ? " seção" : " seções"} · versão ${version}`;
}

/** Contagem por seção — "1 campo" ou "N campos" (protótipo sec.count). */
export function editorSectionCount(itemCount: number): string {
  return `${itemCount}${itemCount === 1 ? " campo" : " campos"}`;
}

/** Chips do card de campo — port fiel do chipsFor do protótipo (mesmos textos e tons). */
export function editorFieldChips(component: {
  readonly type: string;
  readonly config: ChecklistJsonRecord;
}): readonly { readonly text: string; readonly bg: string; readonly fg: string }[] {
  const chips: { text: string; bg: string; fg: string }[] = [];
  const config = component.config;

  if (component.type === "photo_upload") {
    const min = typeof config.minPhotos === "number" ? config.minPhotos : 0;
    chips.push({ text: `mín. ${min} fotos`, bg: "#F0FDF4", fg: "#15803D" });
  }
  if (component.type === "single_choice" || component.type === "multi_choice") {
    const count = Array.isArray(config.options) ? config.options.length : 0;
    chips.push(
      count > 0
        ? { text: `${count} opções`, bg: "#F0F9FF", fg: "#0369A1" }
        : { text: "sem opções", bg: "#FEF3C7", fg: "#B45309" },
    );
  }
  if (component.type === "damage_map" && config.requireDescription === true) {
    chips.push({ text: "descrição obrigatória", bg: "#FEF2F2", fg: "#DC2626" });
  }
  if (component.type === "signature" && config.requireName === true) {
    chips.push({ text: "exige nome", bg: "#FAF5FF", fg: "#7E22CE" });
  }
  if (component.type === "observation") {
    const max = typeof config.maxLength === "number" ? config.maxLength : 500;
    chips.push({ text: `até ${max} caracteres`, bg: "#F1F5F9", fg: "#475569" });
  }
  if (component.type === "before_after" && config.requireBothStages !== false) {
    chips.push({ text: "dois estágios", bg: "#FFFBEB", fg: "#B45309" });
  }
  return chips;
}
