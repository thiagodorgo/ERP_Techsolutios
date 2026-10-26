import type {
  ChecklistJsonRecord,
  TenantChecklist,
  TenantChecklistComponentCatalogItem,
  TenantChecklistComponentType,
  TenantChecklistType,
  UpdateTenantChecklistInput,
} from "./types";
import { checklistTypeLabel } from "./checklist.constants";

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
  // B-SAN3-22 (E3-04) — o `updatedAt` do modelo sobre o qual o rascunho foi feito. O servidor só grava se ninguém
  // gravou depois dessa leitura (409 `template_changed_since_read` senão); a releitura antes de salvar saiu.
  expectedUpdatedAt: string,
): UpdateTenantChecklistInput {
  const ordered = draft.sections.flatMap((_, sectionIndex) => componentsInSection(draft, sectionIndex));
  // Junta PR-02b (BAIXA): o `components` do schema anterior é reescrito pelo backend a cada PATCH
  // — reenviá-lo só inflava o blob com uma cópia obsoleta. Removido do que sobe.
  const { components: _obsoleteComponents, ...schemaWithoutComponents } = baseSchema;

  return {
    expectedUpdatedAt,
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

// ══════════════════════════════════════════════════════════════════════════════════════════════
// B-SAN3-22 — TRAVA DO MODELO NO EDITOR (fatia web). Funções PURAS: a página só renderiza e despacha.
//
// O servidor é a autoridade (trava otimista + vistoria em andamento): ele recusa com 409 o que a tela
// não deveria deixar. A tela antecipa a regra para não fazer o usuário perder o clique:
//  · `activeRuns` vem em TODA resposta de modelo único; ausente = NÃO CONFIRMADO → travado (fail-closed);
//  · com vistoria em andamento só os TEXTOS mudam (nome, descrição, nomes de seção, pergunta, ajuda);
//  · 409 `template_changed_since_read` → conflito (recarregar × sobrescrever com o token recém-lido);
//  · 409 `template_has_active_runs` → relê o detalhe e diz quantas vistorias seguram o modelo.
// ══════════════════════════════════════════════════════════════════════════════════════════════

export type ChecklistEditorLock =
  | { readonly kind: "free" }
  | { readonly kind: "locked"; readonly activeRuns: number }
  | { readonly kind: "unknown" };

/** CE-27 — o estado da trava a partir da resposta de modelo único (GET, salvar, publicar, inativar). */
export function nextEditorLock(response: { readonly activeRuns?: unknown } | null | undefined): ChecklistEditorLock {
  const raw = response?.activeRuns;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) return { kind: "unknown" };
  return raw > 0 ? { kind: "locked", activeRuns: raw } : { kind: "free" };
}

export const EDITOR_LOCK_UNKNOWN_MESSAGE =
  "Não foi possível confirmar se há vistorias em andamento — recarregue o modelo para mudar os campos.";

/** "1 vistoria em andamento" · "N vistorias em andamento". */
export function activeRunsPhrase(count: number): string {
  return `${count} ${count === 1 ? "vistoria" : "vistorias"} em andamento`;
}

function untilTheyFinish(count: number): string {
  return count === 1 ? "ela terminar" : "elas terminarem";
}

/** Motivo padrão de todo controle de campo travado (o clique explica — padrão do Publicar travado). */
export function editorLockReason(lock: ChecklistEditorLock): string {
  if (lock.kind === "free") return "";
  if (lock.kind === "unknown") return EDITOR_LOCK_UNKNOWN_MESSAGE;
  return `Há ${activeRunsPhrase(lock.activeRuns)} com este modelo. Agora só os textos podem mudar; para mudar campos, inative o modelo e espere ${untilTheyFinish(lock.activeRuns)}.`;
}

/** Motivo de um controle específico: "<o que muda>: fica travado enquanto houver N vistorias em andamento." */
export function editorLockReasonFor(lock: ChecklistEditorLock, subject: string, verb = "fica travado"): string {
  if (lock.kind === "free") return "";
  if (lock.kind === "unknown") return EDITOR_LOCK_UNKNOWN_MESSAGE;
  return `${subject}: ${verb} enquanto houver ${activeRunsPhrase(lock.activeRuns)}.`;
}

/** Texto da faixa âmbar (A e B) — inativo diz que as novas ordens já não usam o modelo. */
export function editorLockBanner(lock: ChecklistEditorLock, status: TenantChecklist["status"]): string {
  if (lock.kind === "free") return "";
  if (lock.kind === "unknown") return EDITOR_LOCK_UNKNOWN_MESSAGE;
  const runs = activeRunsPhrase(lock.activeRuns);
  if (status === "inactive") {
    return `O modelo está inativo: as novas ordens já não o usam. ${capitalize(runs)} ainda o ${lock.activeRuns === 1 ? "usa" : "usam"}; até ${untilTheyFinish(lock.activeRuns)}, só os textos podem mudar.`;
  }
  return `Há ${runs} com este modelo. Agora só os textos podem mudar: nome, descrição, nomes de seção, pergunta e ajuda. Para mudar campos, inative o modelo e espere as vistorias terminarem.`;
}

/** Reativar volta a rascunho, o que cortaria as vistorias: travado enquanto houver alguma (ou enquanto não confirmado). */
export function reactivateLockReason(lock: ChecklistEditorLock): string {
  if (lock.kind === "free") return "";
  if (lock.kind === "unknown") return EDITOR_LOCK_UNKNOWN_MESSAGE;
  const which = lock.activeRuns === 1 ? "a vistoria em andamento" : `as ${lock.activeRuns} vistorias em andamento`;
  return `Reativar volta o modelo para rascunho, e isso cortaria ${which}. Espere ${untilTheyFinish(lock.activeRuns)}.`;
}

/**
 * E3b-17/CE-29 — o que o botão de situação do editor faz: Inativar SEMPRE pede confirmação (as novas ordens deixam de
 * usar o modelo); Reativar vai direto quando livre e, com a trava, só explica.
 */
export function editorStatusAction(
  status: TenantChecklist["status"],
  lock: ChecklistEditorLock,
): { readonly kind: "confirm_inactivate" } | { readonly kind: "reactivate" } | { readonly kind: "explain"; readonly message: string } {
  if (status !== "inactive") return { kind: "confirm_inactivate" };
  const reason = reactivateLockReason(lock);
  return reason ? { kind: "explain", message: reason } : { kind: "reactivate" };
}

/** Pílula do cabeçalho: A e B dizem o número; C diz a regra. */
export function editorLockPill(lock: ChecklistEditorLock, appearance: "A" | "B" | "C"): string {
  if (lock.kind === "free") return "";
  if (appearance === "C") return "Somente textos";
  if (lock.kind === "unknown") return "Campos travados";
  return `Em uso por ${lock.activeRuns} ${lock.activeRuns === 1 ? "vistoria" : "vistorias"}`;
}

/** Subtítulo do painel "Em uso agora" (C) — sem afirmar versão (E3b-16, D-007). */
export function editorLockPanelSub(lock: ChecklistEditorLock): string {
  if (lock.kind !== "locked") return EDITOR_LOCK_UNKNOWN_MESSAGE;
  return `${activeRunsPhrase(lock.activeRuns)} ${lock.activeRuns === 1 ? "usa" : "usam"} este modelo`;
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

export type ChecklistSaveErrorKind = "conflict" | "in_use" | "other";

/** CE-26b — classifica o erro de gravação (salvar, publicar, inativar) pelo `reason` estável do servidor. */
export function resolveSaveError(error: unknown): { readonly kind: ChecklistSaveErrorKind } {
  if (error && typeof error === "object" && (error as { status?: unknown }).status === 409) {
    const reason = (error as { reason?: unknown }).reason;
    if (reason === "template_changed_since_read") return { kind: "conflict" };
    if (reason === "template_has_active_runs") return { kind: "in_use" };
  }
  return { kind: "other" };
}

export type ChecklistWriteOutcome =
  | { readonly kind: "conflict"; readonly latest: TenantChecklist; readonly lock: ChecklistEditorLock }
  | { readonly kind: "in_use"; readonly latest: TenantChecklist; readonly lock: ChecklistEditorLock; readonly message: string }
  | { readonly kind: "unknown"; readonly message: string }
  | { readonly kind: "other" };

/**
 * CE-26b/CE-28/E3b-19 — o que fazer depois de um erro de gravação. Nos dois 409 da trava a tela RELÊ o detalhe
 * (`readLatest`): no conflito, para apresentar o que a outra pessoa salvou; no "em uso", para dizer N (o cliente não
 * expõe a mensagem do servidor). Se a releitura falhar, o resultado é "não confirmado" — travado, sem comparador
 * inventado (fail-closed).
 */
export async function resolveWriteError(
  error: unknown,
  readLatest: () => Promise<TenantChecklist | null>,
): Promise<ChecklistWriteOutcome> {
  const kind = resolveSaveError(error).kind;
  if (kind === "other") return { kind: "other" };

  let latest: TenantChecklist | null = null;
  try {
    latest = await readLatest();
  } catch {
    latest = null;
  }
  if (!latest) return { kind: "unknown", message: EDITOR_LOCK_UNKNOWN_MESSAGE };

  const lock = nextEditorLock(latest);
  if (kind === "conflict") return { kind: "conflict", latest, lock };
  return {
    kind: "in_use",
    latest,
    lock,
    message: lock.kind === "free" ? "A situação do modelo mudou enquanto você editava. Confira e tente de novo." : editorLockReason(lock),
  };
}

/**
 * CE-26c (E3b-07) — o token do publicar: o `updatedAt` DEVOLVIDO pelo salvar que acabou de acontecer (senão o
 * publicar levaria o token de antes do próprio salvar e o servidor responderia 409 contra a própria gravação).
 */
export function publishTokenAfterSave(saved: { readonly updatedAt: string } | null, current: { readonly updatedAt: string }): string {
  return (saved ?? current).updatedAt;
}

export type ChecklistDraftDifference = {
  readonly label: string;
  readonly saved: string;
  readonly mine: string;
};

/**
 * E3-08/E3b-14 — comparador "Salvo × Seu" (C) e "N diferenças" (B): o modelo que outra pessoa salvou × o rascunho
 * desta tela. Puro e local (o servidor não manda a diferença pronta). Só lista o que difere.
 */
export function diffEditorDraft(server: TenantChecklist, draft: ChecklistEditorDraft): readonly ChecklistDraftDifference[] {
  const saved = createEditorDraftFromChecklist(server);
  const rows: ChecklistDraftDifference[] = [];
  const text = (value: string) => (value.trim().length > 0 ? value : "—");

  if (saved.name !== draft.name) rows.push({ label: "Nome do modelo", saved: text(saved.name), mine: text(draft.name) });
  if (saved.description !== draft.description) {
    rows.push({ label: "Descrição", saved: text(saved.description), mine: text(draft.description) });
  }
  if (saved.type !== draft.type) {
    rows.push({ label: "Tipo do modelo", saved: checklistTypeLabel[saved.type] ?? "—", mine: checklistTypeLabel[draft.type] ?? "—" });
  }

  const sectionCount = Math.max(saved.sections.length, draft.sections.length);
  for (let index = 0; index < sectionCount; index += 1) {
    const before = saved.sections[index];
    const after = draft.sections[index];
    if (before !== after) {
      rows.push({
        label: `Seção ${index + 1}`,
        saved: before === undefined ? "—" : text(before),
        mine: after === undefined ? "—" : text(after),
      });
    }
  }

  const savedByKey = new Map(saved.components.map((item) => [item.componentKey, item]));
  const mineByKey = new Map(draft.components.map((item) => [item.componentKey, item]));
  for (const item of saved.components) {
    if (!mineByKey.has(item.componentKey)) rows.push({ label: `“${item.label}”`, saved: "no formulário", mine: "removido" });
  }
  for (const item of draft.components) {
    const before = savedByKey.get(item.componentKey);
    if (!before) {
      rows.push({ label: `“${item.label}”`, saved: "—", mine: "acrescentado" });
      continue;
    }
    if (before.label !== item.label) rows.push({ label: `“${before.label}” — pergunta`, saved: text(before.label), mine: text(item.label) });
    if (componentHelpText(before) !== componentHelpText(item)) {
      rows.push({ label: `“${before.label}” — ajuda`, saved: text(componentHelpText(before)), mine: text(componentHelpText(item)) });
    }
    if (before.required !== item.required) {
      rows.push({ label: `“${before.label}” — obrigatório`, saved: before.required ? "sim" : "não", mine: item.required ? "sim" : "não" });
    }
    const beforeSection = saved.sections[componentSectionIndex(before, saved.sections.length)] ?? "";
    const afterSection = draft.sections[componentSectionIndex(item, draft.sections.length)] ?? "";
    if (beforeSection !== afterSection) {
      rows.push({ label: `“${before.label}” — seção`, saved: text(beforeSection), mine: text(afterSection) });
    }
    if (before.type !== item.type || JSON.stringify(configShape(before.config)) !== JSON.stringify(configShape(item.config))) {
      rows.push({ label: `“${before.label}” — configuração`, saved: "a salva", mine: "a sua" });
    }
  }

  const savedOrder = saved.components.map((item) => item.componentKey).filter((key) => mineByKey.has(key));
  const mineOrder = draft.components.map((item) => item.componentKey).filter((key) => savedByKey.has(key));
  if (savedOrder.join("|") !== mineOrder.join("|")) rows.push({ label: "Ordem dos campos", saved: "a salva", mine: "a sua" });

  return rows;
}

function configShape(config: ChecklistJsonRecord): Record<string, unknown> {
  const { help: _help, sectionIndex: _section, ...rest } = config;
  return Object.fromEntries(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)));
}

/** "1 diferença" · "N diferenças". */
export function differencesPhrase(count: number): string {
  return `${count} ${count === 1 ? "diferença" : "diferenças"}`;
}

/** Hora HH:MM (pt-BR) de um instante ISO; vazio quando não é data. */
export function editorClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Linha do diálogo de conflito (E3b-14): quando a outra pessoa salvou e quando esta sessão abriu o modelo. */
export function conflictWhenLine(savedAt: string | null | undefined, openedAt: string | null | undefined): string {
  const saved = editorClock(savedAt);
  const opened = editorClock(openedAt);
  if (!saved || !opened) return "";
  return `Salvo por outra pessoa às ${saved} · você abriu às ${opened}`;
}
