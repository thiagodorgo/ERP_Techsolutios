import assert from "node:assert/strict";
import test from "node:test";

import { classifyTemplateChange } from "../src/modules/checklists/checklist.template-change.js";
import type { ChecklistTemplate } from "../src/modules/checklists/checklist.types.js";
import type { UpdateChecklistTemplateInput } from "../src/modules/checklists/checklist.validator.js";

const now = new Date("2026-10-25T12:00:00.000Z");
const base: ChecklistTemplate = {
  id: "10000000-0000-4000-8000-000000000001",
  tenantId: "10000000-0000-4000-8000-000000000002",
  name: "Vistoria",
  description: "Descrição",
  type: "custom",
  status: "published",
  version: 2,
  schema: { source: "manual", sections: [{ name: "Veículo" }], vehicleImage: "car" },
  createdAt: now,
  updatedAt: now,
  components: [{
    id: "10000000-0000-4000-8000-000000000003",
    tenantId: "10000000-0000-4000-8000-000000000002",
    templateId: "10000000-0000-4000-8000-000000000001",
    componentKey: "fotos",
    type: "photo_upload",
    label: "Fotos",
    required: true,
    orderIndex: 0,
    config: { minPhotos: 1, help: "Ajuda" },
    validationRules: {},
    visibilityRules: {},
    createdAt: now,
    updatedAt: now,
  }],
};

function input(componentPatch: Record<string, unknown>): UpdateChecklistTemplateInput {
  return {
    expectedUpdatedAt: now,
    components: [{ ...base.components[0], ...componentPatch }],
  } as UpdateChecklistTemplateInput;
}

for (const key of [
  "compareWith", "markerTypes", "maxLength", "maxPhotos", "minPhotos", "minSelected",
  "multiline", "requireBothStages", "requireDescription", "requireName", "requireObservation", "vehicleTypes",
  "options", "requireMarker", "requireAcknowledgement", "sectionIndex", "futuraChave",
]) {
  test(`CE-18: config.${key} é mudança de campo`, () => {
    // `sectionIndex` inválido ≡ 0 (E3b-01(c)); a mudança real dele é MOVER de seção (0 → 1).
    const value = key === "sectionIndex" ? 1 : "novo";
    assert.equal(classifyTemplateChange(base, input({ config: { ...base.components[0]!.config, [key]: value } })), "field");
  });
}

for (const [name, patch] of [
  ["required false", { required: false }],
  ["type", { type: "observation" }],
  ["validationRules", { validationRules: { min: 1 } }],
  ["visibilityRules", { visibilityRules: { when: true } }],
] as const) {
  test(`CE-18: ${name} é mudança de campo`, () => {
    assert.equal(classifyTemplateChange(base, input(patch)), "field");
  });
}

// Retomada `dev-san322-opus` — CE-18b/18c pedem os dois sentidos de `required` e reordenar `options`.
test("CE-18: required false→true e reordenar config.options são mudança de campo", () => {
  const optional: ChecklistTemplate = { ...base, components: [{ ...base.components[0]!, required: false, config: { options: ["a", "b"] } }] };
  const withComponent = (patch: Record<string, unknown>) => ({
    expectedUpdatedAt: now,
    components: [{ ...optional.components[0], ...patch }],
  }) as UpdateChecklistTemplateInput;
  assert.equal(classifyTemplateChange(optional, withComponent({ required: true })), "field");
  assert.equal(classifyTemplateChange(optional, withComponent({ config: { options: ["b", "a"] } })), "field");
});

test("CE-18: adicionar e remover componente são mudança de campo", () => {
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, components: [] } as unknown as UpdateChecklistTemplateInput), "field");
  assert.equal(classifyTemplateChange(base, {
    expectedUpdatedAt: now,
    components: [...base.components, { ...base.components[0]!, componentKey: "novo" }],
  } as UpdateChecklistTemplateInput), "field");
});

test("CE-18: type do modelo e schema estrutural são mudança de campo", () => {
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, type: "technical_evidence" }), "field");
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, schema: { ...base.schema, vehicleImage: "truck" } }), "field");
});

test("CE-18: allowlist fechada aceita somente textos", () => {
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, name: "Nova" }), "text");
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, description: null }), "text");
  assert.equal(classifyTemplateChange(base, input({ label: "Novas fotos", config: { ...base.components[0]!.config, help: "Nova ajuda" } })), "text");
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, schema: { ...base.schema, source: "importado", sections: [{ name: "Dados" }] } }), "text");
});

test("CE-18: payload idêntico/token/status não entram na classificação", () => {
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now }), "none");
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, status: "inactive" }), "none");
});

// B-SAN3-22, E3-bis (E3b-01/E3b-03) — o classificador normaliza o que é DERIVAÇÃO ou REPRESENTAÇÃO
// antes de comparar: `schema.components` (cópia que só o publicar grava; ninguém a lê), a numeração
// de `orderIndex` (vale a ORDEM relativa), `config.sectionIndex` ausente/inválido ≡ 0 (o clamp do
// editor) e `config.help` ausente ≡ "". O resto segue mudança de campo por construção.
const two: ChecklistTemplate = {
  ...base,
  schema: { ...base.schema, sections: ["Veículo", "Fotos"] },
  components: [
    { ...base.components[0]!, componentKey: "fotos", orderIndex: 0 },
    { ...base.components[0]!, id: "10000000-0000-4000-8000-000000000004", componentKey: "obs", type: "observation", label: "Obs", orderIndex: 1, config: {} },
  ],
};
const withComponents = (components: readonly Record<string, unknown>[]) =>
  ({ expectedUpdatedAt: now, components }) as unknown as UpdateChecklistTemplateInput;

test("CE-18c: renumerar orderIndex sem trocar a ordem não é mudança (none)", () => {
  assert.equal(classifyTemplateChange(base, input({ orderIndex: 1 })), "none");
  assert.equal(classifyTemplateChange(two, withComponents([
    { ...two.components[0]!, orderIndex: 10 },
    { ...two.components[1]!, orderIndex: 20 },
  ])), "none");
});

test("CE-18c: reordenar campos é mudança de campo", () => {
  assert.equal(classifyTemplateChange(two, withComponents([
    { ...two.components[0]!, orderIndex: 1 },
    { ...two.components[1]!, orderIndex: 0 },
  ])), "field");
});

test("E3b-01(a): schema.components diferente nos dois lados não é mudança", () => {
  const published: ChecklistTemplate = { ...base, schema: { ...base.schema, components: [{ componentKey: "fotos", label: "cópia antiga" }] } };
  assert.equal(classifyTemplateChange(published, { expectedUpdatedAt: now, schema: { source: "manual", sections: [{ name: "Veículo" }], vehicleImage: "car" } }), "none");
  assert.equal(classifyTemplateChange(base, { expectedUpdatedAt: now, schema: { ...base.schema, components: [{ qualquer: true }] } }), "none");
});

test("E3b-01(c): sectionIndex ausente × 0 não é mudança; 0 × 1 é mudança de campo", () => {
  assert.equal(classifyTemplateChange(two, withComponents([
    { ...two.components[0]!, config: { ...two.components[0]!.config, sectionIndex: 0 } },
    two.components[1]!,
  ])), "none");
  assert.equal(classifyTemplateChange(two, withComponents([
    { ...two.components[0]!, config: { ...two.components[0]!.config, sectionIndex: 1 } },
    two.components[1]!,
  ])), "field");
});

test("E3b-01(d): config.help ausente × vazio não é mudança", () => {
  assert.equal(classifyTemplateChange(two, withComponents([
    two.components[0]!,
    { ...two.components[1]!, config: { help: "" } },
  ])), "none");
});
