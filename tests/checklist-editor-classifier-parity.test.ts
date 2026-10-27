import assert from "node:assert/strict";
import test from "node:test";

// B-SAN3-22, E3-bis E3b-02 — CE-37: paridade entre o payload REAL do editor web e o classificador
// do backend. Molde: `checklist-editor-blockers-parity.test.ts` (liga as duas pontas importando o
// modelo puro do front).
//
// A crítica da E3 (A1) mediu que o salvar do editor era sempre "mudança de campo": o builder tira
// `schema.components` (cópia derivada que só o publicar grava), renumera `orderIndex` e grava
// `config.sectionIndex` em todo campo. Com vistoria em andamento, todo salvar caía em 409; sem
// vistoria, todo salvar de modelo publicado subia a versão. Este teste roda o caminho real:
// modelo do servidor → DTO de detalhe → rascunho do editor → payload do Salvar → validator do
// backend → classificador. Salvar sem mudança tem de ser `none`; só texto, `text`; mudar a forma
// do formulário, `field`.

const TOKEN = "2026-10-26T12:00:00.000Z";
const now = new Date(TOKEN);
const TENANT = "20000000-0000-4000-8000-000000000002";

type Template = import("../src/modules/checklists/checklist.types.js").ChecklistTemplate;
type Component = Template["components"][number];
type Kind = import("../src/modules/checklists/checklist.template-change.js").ChecklistTemplateChangeKind;

function component(id: number, partial: Partial<Component> & Pick<Component, "componentKey" | "type" | "label" | "orderIndex" | "config">): Component {
  return {
    id: `20000000-0000-4000-8000-0000000001${String(id).padStart(2, "0")}`,
    tenantId: TENANT,
    templateId: "20000000-0000-4000-8000-000000000001",
    required: true,
    validationRules: {},
    visibilityRules: {},
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function template(partial: Partial<Template> & Pick<Template, "schema" | "components">): Template {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    tenantId: TENANT,
    name: "Vistoria de coleta",
    description: "Coleta do veículo no local",
    type: "towing_collection",
    status: "published",
    version: 3,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** Cópia que o `publishTemplate` grava em `schema.components` (prisma l.418-438; memória `buildSchema`). */
function publishedSchemaCopy(components: readonly Component[]) {
  return components.map((item) => ({
    id: item.id,
    componentKey: item.componentKey,
    type: item.type,
    label: item.label,
    required: item.required,
    orderIndex: item.orderIndex,
    config: item.config,
    validationRules: item.validationRules,
    visibilityRules: item.visibilityRules,
  }));
}

// Modelo PUBLICADO pelo editor: 3 seções (a do meio vazia), `schema.components` como o publicar grava.
const publishedComponents = [
  component(1, { componentKey: "fotos", type: "photo_upload", label: "Fotos das laterais", orderIndex: 0, config: { minPhotos: 4, maxPhotos: 8, sectionIndex: 0, help: "Frente e traseira" } }),
  component(2, { componentKey: "estado", type: "single_choice", label: "Estado geral", orderIndex: 1, config: { options: ["Bom", "Ruim"], sectionIndex: 0 } }),
  component(3, { componentKey: "obs", type: "observation", label: "Observações", required: false, orderIndex: 2, config: { maxLength: 500, sectionIndex: 2 } }),
];
const PUBLISHED = template({
  schema: { source: "ckb_editor", sections: ["Veículo", "Conferência", "Entrega"], components: publishedSchemaCopy(publishedComponents) },
  components: publishedComponents,
});

// Modelo LEGADO (criado por API/seed): sem `sectionIndex`, `orderIndex` 10/20/30, sem `schema.source`.
const LEGACY = template({
  name: "Vistoria antiga",
  schema: {},
  components: [
    component(11, { componentKey: "placa", type: "observation", label: "Placa", orderIndex: 10, config: { maxLength: 20 } }),
    component(12, { componentKey: "fotos", type: "photo_upload", label: "Fotos", orderIndex: 20, config: { minPhotos: 1, maxPhotos: 10 } }),
    component(13, { componentKey: "assinatura", type: "signature", label: "Assinatura", orderIndex: 30, config: { requireName: true } }),
  ],
});

// Modelo SALVO pelo editor e ainda em rascunho (sem `schema.components`, nunca publicado).
const EDITOR_DRAFT = template({
  status: "draft",
  version: 1,
  publishedAt: undefined,
  schema: { source: "ckb_editor", sections: ["Formulário"] },
  components: [
    component(21, { componentKey: "obs_a", type: "observation", label: "Primeira", orderIndex: 0, config: { maxLength: 500, sectionIndex: 0 } }),
    component(22, { componentKey: "obs_b", type: "observation", label: "Segunda", orderIndex: 1, config: { maxLength: 500, sectionIndex: 0, help: "" } }),
  ],
});

type Draft = import("../frontend/src/modules/checklists/checklist-editor.model.js").ChecklistEditorDraft;

async function harness() {
  const { classifyTemplateChange, diffTemplateChange } = await import("../src/modules/checklists/checklist.template-change.js");
  const { parseUpdateChecklistTemplateDto } = await import("../src/modules/checklists/checklist.validator.js");
  const { toChecklistTemplateDetailDto } = await import("../src/modules/checklists/checklist.dto.js");
  const model = await import("../frontend/src/modules/checklists/checklist-editor.model.js");

  /** O que o GET de detalhe entrega ao front (DTO serializado como na rota). */
  function asFront(existing: Template) {
    return JSON.parse(JSON.stringify(toChecklistTemplateDetailDto(existing, 0)));
  }

  /** Payload do Salvar do editor, passado pelo validator do backend (o caminho do controller). */
  function save(existing: Template, edit: (draft: Draft) => Draft = (draft) => draft) {
    const front = asFront(existing);
    const draft = edit(model.createEditorDraftFromChecklist(front));
    const built = model.buildUpdateInputFromEditorDraft(draft, front.schema, TOKEN) as unknown as Record<string, unknown>;
    // O payload vai ao validator EXATAMENTE como o editor o monta — inclusive o token (E3-04).
    assert.equal(built.expectedUpdatedAt, TOKEN, "o builder emite o token recebido");
    const input = parseUpdateChecklistTemplateDto(built);
    return { kind: classifyTemplateChange(existing, input) as Kind, paths: diffTemplateChange(existing, input) };
  }

  return { model, save };
}

/**
 * O editor grava a sua convenção de SEÇÕES no primeiro salvar (`schema.source = "ckb_editor"`,
 * `schema.sections`), e as duas são TEXTO na `TEXT_PATHS`. Num modelo que já nasceu no editor isso
 * não muda nada (`none`); num modelo LEGADO (sem a convenção) o primeiro salvar é `text`, sem
 * subir versão e sem 409 com vistoria em andamento. A E3b-02 escreveu `none` para o legado, mas a
 * E3b.4 limita o classificador às 4 normalizações (a `TEXT_PATHS` não muda) — divergência D-W1 do
 * relatório do dev, declarada; o efeito que a E3b-02 protege (nunca `field`, nunca versão espúria) vale.
 */
const LEGACY_FIRST_SAVE_PATHS = ["schema.sections", "schema.source"];

function assertIdempotent(existing: Template, result: { kind: Kind; paths: string[] }) {
  if (existing === LEGACY) {
    assert.equal(result.kind, "text", `caminhos acusados: ${JSON.stringify(result.paths)}`);
    assert.deepEqual(result.paths, LEGACY_FIRST_SAVE_PATHS);
    return;
  }
  assert.equal(result.kind, "none", `caminhos acusados: ${JSON.stringify(result.paths)}`);
}

for (const [name, existing] of [["publicado", PUBLISHED], ["legado", LEGACY], ["do editor", EDITOR_DRAFT]] as const) {
  test(`CE-37: salvar SEM alteração um modelo ${name} é idempotente (nunca mudança de campo)`, async () => {
    const { save } = await harness();
    assertIdempotent(existing, save(existing));
  });

  test(`CE-37: salvar só o rótulo de um campo do modelo ${name} é texto`, async () => {
    const { model, save } = await harness();
    const result = save(existing, (draft) => model.updateEditorComponent(draft, draft.components[0]!.id, { label: "Pergunta reescrita" }));
    assert.equal(result.kind, "text", `caminhos acusados: ${JSON.stringify(result.paths)}`);
  });

  test(`CE-37: renomear o modelo e acrescentar seção no modelo ${name} é texto`, async () => {
    const { model, save } = await harness();
    const result = save(existing, (draft) => model.addEditorSection({ ...draft, name: "Nome novo" }));
    assert.equal(result.kind, "text", `caminhos acusados: ${JSON.stringify(result.paths)}`);
  });

  test(`CE-37: reordenar campos no modelo ${name} é mudança de campo`, async () => {
    const { model, save } = await harness();
    const result = save(existing, (draft) => model.moveEditorComponent(draft, draft.components[0]!.id, "down"));
    assert.equal(result.kind, "field", `caminhos acusados: ${JSON.stringify(result.paths)}`);
  });

  test(`CE-37: mover um campo de seção no modelo ${name} é mudança de campo`, async () => {
    const { model, save } = await harness();
    const result = save(existing, (draft) => {
      const withTwo = draft.sections.length > 1 ? draft : model.addEditorSection(draft);
      const moved = withTwo.components[0]!;
      const target = model.componentSectionIndex(moved, withTwo.sections.length) === 0 ? 1 : 0;
      return {
        ...withTwo,
        components: withTwo.components.map((item) => (item.id === moved.id ? { ...item, config: { ...item.config, sectionIndex: target } } : item)),
      };
    });
    assert.equal(result.kind, "field", `caminhos acusados: ${JSON.stringify(result.paths)}`);
  });
}

test("CE-37: remover a seção vazia do meio, com campos depois dela, é mudança de campo (reindexa sectionIndex)", async () => {
  const { model, save } = await harness();
  const result = save(PUBLISHED, (draft) => {
    assert.equal(model.canRemoveEditorSection(draft, 1), true, "a seção do meio está vazia");
    return model.removeEditorSection(draft, 1);
  });
  assert.equal(result.kind, "field", `caminhos acusados: ${JSON.stringify(result.paths)}`);
  assert.ok(result.paths.includes("components.obs.config.sectionIndex"), JSON.stringify(result.paths));
});

test("CE-37: ajuda digitada e apagada (ausente × vazia) não é mudança", async () => {
  const { model, save } = await harness();
  const result = save(LEGACY, (draft) => model.updateEditorComponent(draft, draft.components[0]!.id, { help: "" }));
  assertIdempotent(LEGACY, result);
});

test("CE-37: obrigatório desligado pelo editor é mudança de campo (a régua da Q1 segue)", async () => {
  const { model, save } = await harness();
  const result = save(PUBLISHED, (draft) => model.updateEditorComponent(draft, draft.components[0]!.id, { required: false }));
  assert.equal(result.kind, "field", `caminhos acusados: ${JSON.stringify(result.paths)}`);
});
