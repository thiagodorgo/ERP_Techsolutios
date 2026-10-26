import type { ChecklistTemplate } from "./checklist.types.js";
import type { UpdateChecklistTemplateInput } from "./checklist.validator.js";

export type ChecklistTemplateChangeKind = "none" | "text" | "field";

const TEXT_PATHS = [
  /^name$/,
  /^description$/,
  /^components\.[^.]+\.label$/,
  /^components\.[^.]+\.config\.help$/,
  /^schema\.sections(?:\..*)?$/,
  /^schema\.source$/,
];

export function classifyTemplateChange(
  existing: ChecklistTemplate,
  input: UpdateChecklistTemplateInput,
): ChecklistTemplateChangeKind {
  const paths = diffTemplateChange(existing, input);
  if (paths.length === 0) return "none";
  return paths.every((path) => TEXT_PATHS.some((pattern) => pattern.test(path))) ? "text" : "field";
}

export function diffTemplateChange(
  existing: ChecklistTemplate,
  input: UpdateChecklistTemplateInput,
): string[] {
  const changed: string[] = [];

  if (input.name !== undefined && input.name !== existing.name) changed.push("name");
  if (input.description !== undefined && normalizeDescription(input.description) !== normalizeDescription(existing.description)) {
    changed.push("description");
  }
  if (input.type !== undefined && input.type !== existing.type) changed.push("type");
  // E3b-01(a): `schema.components` é cópia DERIVADA da tabela de componentes, gravada só pelo
  // publicar e lida por ninguém (render, snapshot do despacho e esta classificação lêem a TABELA —
  // plano B-SAN3-22, M-39). O editor não a reenvia (junta PR-02b). Ignorada nos dois lados.
  if (input.schema !== undefined) diffValue(withoutDerivedComponents(existing.schema), withoutDerivedComponents(input.schema), "schema", changed);

  if (input.components !== undefined) {
    const current = new Map(existing.components.map((component) => [component.componentKey, component]));
    const desired = new Map(input.components.map((component) => [component.componentKey!, component]));

    for (const key of current.keys()) if (!desired.has(key)) changed.push(`components.-${key}`);
    for (const key of desired.keys()) if (!current.has(key)) changed.push(`components.+${key}`);

    // E3b-01(b): a ORDEM relativa das chaves que sobrevivem é o que o formulário mostra; o número
    // em `orderIndex` é representação (o editor renumera 0..n-1 a cada salvar). Renumerar sem
    // reordenar não é mudança; reordenar é mudança de campo.
    const survivors = (key: string) => current.has(key) && desired.has(key);
    const existingOrder = orderedKeys(existing.components.map((item) => ({ key: item.componentKey, orderIndex: item.orderIndex })))
      .filter(survivors);
    const desiredOrder = orderedKeys(input.components.map((item) => ({
      key: item.componentKey!,
      orderIndex: item.orderIndex ?? current.get(item.componentKey!)?.orderIndex ?? Number.MAX_SAFE_INTEGER,
    }))).filter(survivors);
    if (JSON.stringify(existingOrder) !== JSON.stringify(desiredOrder)) changed.push("components.order");

    for (const [key, next] of desired) {
      const previous = current.get(key);
      if (!previous) continue;
      if (next.label !== previous.label) changed.push(`components.${key}.label`);
      if (next.type !== previous.type) changed.push(`components.${key}.type`);
      if (next.required !== previous.required) changed.push(`components.${key}.required`);
      diffValue(normalizeConfig(previous.config), normalizeConfig(next.config), `components.${key}.config`, changed);
      diffValue(previous.validationRules, next.validationRules, `components.${key}.validationRules`, changed);
      diffValue(previous.visibilityRules, next.visibilityRules, `components.${key}.visibilityRules`, changed);
    }
  }

  return [...new Set(changed)].sort();
}

function normalizeDescription(value: string | null | undefined): string {
  return value ?? "";
}

function withoutDerivedComponents(schema: Record<string, unknown>): Record<string, unknown> {
  const { components: _derived, ...rest } = schema;
  return rest;
}

/** Chaves na ordem de exibição (empate por `orderIndex` mantém a ordem do array, como o `sort` estável do editor). */
function orderedKeys(items: readonly { readonly key: string; readonly orderIndex: number }[]): string[] {
  return items
    .map((item, position) => ({ ...item, position }))
    .sort((left, right) => left.orderIndex - right.orderIndex || left.position - right.position)
    .map((item) => item.key);
}

/**
 * E3b-01(c)(d): `config.sectionIndex` ausente/inválido ≡ 0 (a leitura do editor, `componentSectionIndex`,
 * que põe o campo órfão na 1ª seção) e `config.help` ausente ≡ "" (o editor só grava ajuda não vazia).
 * Mover de seção (0 → 1) continua mudança de campo; trocar a ajuda continua texto.
 */
function normalizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const raw = config.sectionIndex;
  const sectionIndex = typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : 0;
  const help = typeof config.help === "string" ? config.help : config.help === undefined ? "" : config.help;
  return { ...config, sectionIndex, help };
}

function diffValue(previous: unknown, next: unknown, path: string, changed: string[]): void {
  if (Object.is(previous, next)) return;
  if (Array.isArray(previous) || Array.isArray(next)) {
    if (JSON.stringify(previous) !== JSON.stringify(next)) changed.push(path);
    return;
  }
  if (isRecord(previous) && isRecord(next)) {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    for (const key of keys) diffValue(previous[key], next[key], `${path}.${key}`, changed);
    return;
  }
  changed.push(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
