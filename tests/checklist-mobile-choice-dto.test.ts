import assert from "node:assert/strict";
import test from "node:test";

import { buildChecklistSnapshot, toChecklistTemplateComponentDto, toMobileChecklistTemplateDto } from "../src/modules/checklists/checklist.dto.js";
import type { ChecklistTemplate, ChecklistTemplateComponent } from "../src/modules/checklists/checklist.types.js";

// CHECKLIST P1 PR-01 (achado ALTA da junta) — as opções de escolha (config.options: string[] no backend) precisam
// chegar ao app no TOPO do item, na forma [{value,label}] (o parser mobile lê `j['options']` → {value,label}).
// Sem isso, single_choice/multi_choice authorados na web caem em "Componente não suportado" no guincheiro.
// Este teste trava o contrato no DTO que serve o `available` E o snapshot congelado no despacho (a fonte real do app).

function component(overrides: Partial<ChecklistTemplateComponent>): ChecklistTemplateComponent {
  return {
    id: overrides.id ?? "c1",
    tenantId: "t1",
    templateId: "tpl1",
    componentKey: overrides.componentKey ?? "k1",
    type: overrides.type ?? "observation",
    label: overrides.label ?? "L",
    required: overrides.required ?? false,
    orderIndex: overrides.orderIndex ?? 0,
    config: overrides.config ?? {},
    validationRules: {},
    visibilityRules: {},
    createdAt: new Date("2026-08-03T10:00:00.000Z"),
    updatedAt: new Date("2026-08-03T10:00:00.000Z"),
  };
}

function template(components: ChecklistTemplateComponent[]): ChecklistTemplate {
  return {
    id: "tpl1",
    tenantId: "t1",
    name: "Checklist",
    type: "custom",
    status: "published",
    version: 1,
    schema: {},
    components,
    createdAt: new Date("2026-08-03T10:00:00.000Z"),
    updatedAt: new Date("2026-08-03T10:00:00.000Z"),
  };
}

test("mobile DTO: single_choice/multi_choice emitem options no TOPO como [{value,label}]", () => {
  const dto = toMobileChecklistTemplateDto(
    template([
      component({ id: "cor", type: "single_choice", label: "Cor", orderIndex: 0, config: { options: ["Preto", "Prata"] } }),
      component({ id: "itens", type: "multi_choice", label: "Itens", orderIndex: 1, config: { options: ["Estepe", "Macaco"] } }),
    ]),
  );
  const [single, multi] = dto.items as Array<Record<string, unknown>>;
  assert.deepEqual(single.options, [
    { value: "Preto", label: "Preto" },
    { value: "Prata", label: "Prata" },
  ]);
  assert.deepEqual(multi.options, [
    { value: "Estepe", label: "Estepe" },
    { value: "Macaco", label: "Macaco" },
  ]);
});

test("mobile DTO: tipos sem opções (observation/signature) NÃO ganham options no item", () => {
  const dto = toMobileChecklistTemplateDto(
    template([
      component({ id: "obs", type: "observation", orderIndex: 0 }),
      component({ id: "assin", type: "signature", orderIndex: 1, config: { requireName: true } }),
    ]),
  );
  for (const item of dto.items as Array<Record<string, unknown>>) {
    assert.equal("options" in item, false, `${item.type as string} não deve ter options`);
  }
});

test("toChecklistTemplateComponentDto (fonte do /render, que o run screen LÊ) emite options no topo [{value,label}]", () => {
  const dto = toChecklistTemplateComponentDto(
    component({ id: "cor", type: "single_choice", label: "Cor", config: { options: ["Preto", "Prata"] } }),
  ) as Record<string, unknown>;
  assert.deepEqual(dto.options, [
    { value: "Preto", label: "Preto" },
    { value: "Prata", label: "Prata" },
  ]);
  // o config cru continua presente (retrocompat); observation não ganha options
  assert.ok(dto.config);
  const obs = toChecklistTemplateComponentDto(component({ id: "obs", type: "observation" })) as Record<string, unknown>;
  assert.equal("options" in obs, false);
});

test("snapshot congelado (despacho) carrega as options de escolha (mesma fonte do run screen)", () => {
  const snapshot = buildChecklistSnapshot(
    template([component({ id: "cor", type: "single_choice", label: "Cor", config: { options: ["A", "B"] } })]),
  );
  const body = snapshot.template as { items: Array<Record<string, unknown>> };
  assert.deepEqual(body.items[0].options, [
    { value: "A", label: "A" },
    { value: "B", label: "B" },
  ]);
  // §2.8 allowlist — o snapshot nunca leva tenant_id
  assert.equal("tenant_id" in body, false);
});
