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

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CHECKLIST P1 PR-02c — CONFIGURAÇÕES TIPADAS do campo (protótipo, bloco "config tipada").
// Leitura e escrita de `config` como funções PURAS: o inspector só renderiza e despacha.
// Os defaults replicam o protótipo (`cfg.x || fallback`), inclusive as duas flags que nascem
// LIGADAS (`multiline` e `requireBothStages` são "on" a menos que o config diga `false`).
// ══════════════════════════════════════════════════════════════════════════════════════════════

type ConfigHolder = { readonly config: ChecklistJsonRecord };

/** `config.options` como lista de textos (qualquer outra coisa vira lista vazia — nada de lixo na tela). */
export function componentOptions(component: ConfigHolder): readonly string[] {
  const raw = component.config.options;
  if (!Array.isArray(raw)) return [];
  return raw.filter((option): option is string => typeof option === "string");
}

/** Número do config com piso — ausente/NaN/texto cai no fallback (nunca grava NaN, que viraria `null` no JSON). */
export function componentNumberConfig(component: ConfigHolder, key: string, fallback: number, min: number): number {
  const raw = component.config[key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.trunc(raw));
}

/**
 * Flag do config com o default do protótipo. `defaultOn` reproduz `cfg.multiline !== false`
 * (nasce ligada) vs `!!cfg.requireDescription` (nasce desligada).
 */
export function componentFlagConfig(component: ConfigHolder, key: string, defaultOn: boolean): boolean {
  const raw = component.config[key];
  if (typeof raw === "boolean") return raw;
  return defaultOn;
}

/** Lista de chaves marcadas (tipos de veículo / tipos de avaria) — só textos. */
export function componentListConfig(component: ConfigHolder, key: string): readonly string[] {
  const raw = component.config[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

/** Texto de um select do config (valor fora da lista permitida cai no fallback). */
export function componentChoiceConfig(
  component: ConfigHolder,
  key: string,
  allowed: readonly string[],
  fallback: string,
): string {
  const raw = component.config[key];
  return typeof raw === "string" && allowed.includes(raw) ? raw : fallback;
}

/** Texto do botão "Adicionar opção" do protótipo (a opção nasce com este rótulo, acentuado). */
export const CHECKLIST_NEW_OPTION_LABEL = "Nova opção";

/**
 * Toda escrita no `config` passa por um ÚNICO ponto tipado — o inspector não conhece a forma do
 * `config`, só despacha a intenção. Facilita o teste (uma função pura por caso) e impede que a
 * tela invente chave nova sem passar por aqui.
 */
export type ChecklistConfigChange =
  | { readonly kind: "option_add" }
  | { readonly kind: "option_rename"; readonly index: number; readonly text: string }
  | { readonly kind: "option_move"; readonly index: number; readonly direction: "up" | "down" }
  | { readonly kind: "option_remove"; readonly index: number }
  | { readonly kind: "flag"; readonly key: string; readonly defaultOn: boolean }
  | { readonly kind: "number"; readonly key: string; readonly raw: string; readonly min: number }
  | { readonly kind: "list_toggle"; readonly key: string; readonly value: string }
  | { readonly kind: "select"; readonly key: string; readonly value: string };

export function applyChecklistConfigChange(
  draft: ChecklistEditorDraft,
  componentId: string,
  change: ChecklistConfigChange,
): ChecklistEditorDraft {
  const component = draft.components.find((item) => item.id === componentId);
  if (!component) return draft;

  const config = nextConfigFor(component, change);
  return {
    ...draft,
    components: draft.components.map((item) => (item.id === componentId ? { ...item, config } : item)),
  };
}

function nextConfigFor(component: ChecklistEditorComponent, change: ChecklistConfigChange): ChecklistJsonRecord {
  const config = component.config;

  switch (change.kind) {
    case "option_add":
      return { ...config, options: [...componentOptions(component), CHECKLIST_NEW_OPTION_LABEL] };
    case "option_rename": {
      const options = [...componentOptions(component)];
      if (change.index < 0 || change.index >= options.length) return config;
      options[change.index] = change.text;
      return { ...config, options };
    }
    case "option_move": {
      const options = [...componentOptions(component)];
      const target = change.direction === "up" ? change.index - 1 : change.index + 1;
      if (change.index < 0 || change.index >= options.length || target < 0 || target >= options.length) return config;
      const moved = options[change.index];
      options[change.index] = options[target];
      options[target] = moved;
      return { ...config, options };
    }
    case "option_remove": {
      const options = componentOptions(component).filter((_, index) => index !== change.index);
      return { ...config, options };
    }
    case "flag":
      return { ...config, [change.key]: !componentFlagConfig(component, change.key, change.defaultOn) };
    case "number": {
      // Campo numérico vazio ou com texto não vira NaN: cai no piso (o protótipo faz o mesmo com `|| '0'`).
      const parsed = Number.parseInt(change.raw, 10);
      const value = Number.isFinite(parsed) ? Math.max(change.min, parsed) : change.min;
      return { ...config, [change.key]: value };
    }
    case "list_toggle": {
      const current = componentListConfig(component, change.key);
      const next = current.includes(change.value)
        ? current.filter((item) => item !== change.value)
        : [...current, change.value];
      return { ...config, [change.key]: next };
    }
    case "select":
      return { ...config, [change.key]: change.value };
    default:
      return config;
  }
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// GUARD-RAILS DE PUBLICAÇÃO (protótipo, `blockers()`) — espelhando o validator do BACKEND.
//
// FATO medido em `src/modules/checklists/checklist.validator.ts` (não inferido):
//  · `components: z.array(componentSchema).min(1)` → PATCH com 0 campos é REJEITADO (400);
//  · `superRefine` por tipo → `single_choice`/`multi_choice` exigem `config.options` como lista
//    NÃO-VAZIA de textos não-vazios; senão o PATCH inteiro é REJEITADO (400).
//
// DIVERGÊNCIA CONSCIENTE (registrada na ata): o protótipo trata as duas condições como bloqueio
// só de PUBLICAÇÃO ("sem opções este campo impede a publicação"), sugerindo que o rascunho seria
// salvável. O backend é mais estrito e rejeita já no SALVAR. Como §A1 põe regra de negócio acima
// do pixel e o guard existe para o campo não ficar irrenderizável no aplicativo, a tela espelha o
// backend: mesma condição, cópia própria para cada momento — em vez de deixar o usuário bater
// num 400 cru depois de configurar o formulário inteiro.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Junta PR-02c (ALTA): a condição anterior era "NENHUMA opção preenchida", mas o validator do
 * backend usa `every` — UMA opção em branco no meio da lista já derruba o PATCH inteiro com 400.
 * Seis payloads passavam na tela e batiam no servidor. A condição agora é a MESMA do validator.
 */
function choiceComponentsWithoutOptions(draft: ChecklistEditorDraft): readonly ChecklistEditorComponent[] {
  return draft.components.filter((component) => {
    if (component.type !== "single_choice" && component.type !== "multi_choice") return false;
    const options = componentOptions(component);
    return options.length === 0 || options.some((option) => option.trim().length === 0);
  });
}

/** `label: z.string().trim().min(1)` no validator — rótulo vazio é 400, não "campo sem nome". */
function componentsWithoutLabel(draft: ChecklistEditorDraft): readonly ChecklistEditorComponent[] {
  return draft.components.filter((component) => component.label.trim().length === 0);
}

/** Bloqueios de PUBLICAÇÃO — cópia verbatim do protótipo (banner âmbar + title do Publicar + toast). */
export function checklistPublishBlockers(draft: ChecklistEditorDraft): readonly string[] {
  const blockers: string[] = [];

  if (draft.components.length === 0) {
    blockers.push("Adicione ao menos 1 campo ao formulário para publicar.");
  }

  const withoutOptions = choiceComponentsWithoutOptions(draft);
  if (withoutOptions.length === 1) {
    blockers.push(`O campo “${withoutOptions[0].label || "sem nome"}” está sem opções — adicione ao menos 1 para publicar.`);
  } else if (withoutOptions.length > 1) {
    blockers.push(`${withoutOptions.length} campos de escolha estão sem opções — adicione ao menos 1 opção em cada.`);
  }

  // Junta PR-02c: o validator exige rótulo não-vazio; sem este bloqueio o usuário só descobria no 400.
  const withoutLabel = componentsWithoutLabel(draft);
  if (withoutLabel.length === 1) {
    blockers.push("Um campo está sem a pergunta exibida ao técnico — preencha para publicar.");
  } else if (withoutLabel.length > 1) {
    blockers.push(`${withoutLabel.length} campos estão sem a pergunta exibida ao técnico — preencha cada um para publicar.`);
  }

  return blockers;
}

/**
 * Bloqueios de GRAVAÇÃO — as MESMAS condições que o `parseUpdateChecklistTemplateDto` rejeita com
 * 400. Existe separado porque a cópia muda de momento ("para salvar" ≠ "para publicar"): sem isto
 * o usuário perdia o clique num erro de validação cru vindo do servidor.
 */
export function checklistSaveBlockers(draft: ChecklistEditorDraft): readonly string[] {
  const blockers: string[] = [];

  if (draft.components.length === 0) {
    blockers.push("Adicione ao menos 1 campo ao formulário para salvar — o modelo não pode ficar vazio.");
  }

  const withoutOptions = choiceComponentsWithoutOptions(draft);
  if (withoutOptions.length === 1) {
    blockers.push(`O campo “${withoutOptions[0].label || "sem nome"}” está sem opções — adicione ao menos 1 para salvar.`);
  } else if (withoutOptions.length > 1) {
    blockers.push(`${withoutOptions.length} campos de escolha estão sem opções — adicione ao menos 1 opção em cada para salvar.`);
  }

  const withoutLabel = componentsWithoutLabel(draft);
  if (withoutLabel.length === 1) {
    blockers.push("Um campo está sem a pergunta exibida ao técnico — preencha para salvar.");
  } else if (withoutLabel.length > 1) {
    blockers.push(`${withoutLabel.length} campos estão sem a pergunta exibida ao técnico — preencha cada um para salvar.`);
  }

  if (draft.name.trim().length === 0) {
    blockers.push("Dê um nome ao modelo para salvar.");
  }

  return blockers;
}

/** Estado do botão Publicar (protótipo: travado é CINZA e clicável — o clique explica o porquê). */
export function publishButtonState(blockers: readonly string[]): {
  readonly locked: boolean;
  readonly title: string;
  readonly message: string | null;
} {
  const first = blockers[0] ?? null;
  return {
    locked: first !== null,
    title: first ?? "Publicar e disponibilizar no aplicativo",
    message: first,
  };
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
    // PR-02c: a contagem do chip usa a MESMA leitura dos blockers (só textos não-vazios) — senão o
    // card diria "2 opções" enquanto o banner de publicação diria "sem opções" para o mesmo campo.
    const count = componentOptions(component).filter((option) => option.trim().length > 0).length;
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
