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
  if (input.schema !== undefined) diffValue(existing.schema, input.schema, "schema", changed);

  if (input.components !== undefined) {
    const current = new Map(existing.components.map((component) => [component.componentKey, component]));
    const desired = new Map(input.components.map((component) => [component.componentKey!, component]));

    for (const key of current.keys()) if (!desired.has(key)) changed.push(`components.-${key}`);
    for (const key of desired.keys()) if (!current.has(key)) changed.push(`components.+${key}`);

    for (const [key, next] of desired) {
      const previous = current.get(key);
      if (!previous) continue;
      if (next.label !== previous.label) changed.push(`components.${key}.label`);
      if (next.type !== previous.type) changed.push(`components.${key}.type`);
      if (next.required !== previous.required) changed.push(`components.${key}.required`);
      if ((next.orderIndex ?? previous.orderIndex) !== previous.orderIndex) changed.push(`components.${key}.orderIndex`);
      diffValue(previous.config, next.config, `components.${key}.config`, changed);
      diffValue(previous.validationRules, next.validationRules, `components.${key}.validationRules`, changed);
      diffValue(previous.visibilityRules, next.visibilityRules, `components.${key}.visibilityRules`, changed);
    }
  }

  return [...new Set(changed)].sort();
}

function normalizeDescription(value: string | null | undefined): string {
  return value ?? "";
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
