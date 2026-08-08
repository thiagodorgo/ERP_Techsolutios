import assert from "node:assert/strict";
import test from "node:test";

// CHECKLIST P1 PR-02c (achado ALTA do critico-adversarial): as travas da tela diziam "espelhar o
// validator", mas seis payloads passavam na UI e batiam em 400 no servidor — o validator usa
// `every` (TODA opção precisa ser texto não-vazio) e exige `label` não-vazio, condições que a tela
// não tinha. Este teste liga as duas pontas: para cada payload, ou AMBOS aceitam, ou AMBOS recusam.
//
// Vale como contrato: se alguém afrouxar a UI ou apertar o backend sem espelhar, isto quebra.

type Caso = {
  readonly nome: string;
  readonly componentes: ReadonlyArray<Record<string, unknown>>;
  readonly nomeModelo?: string;
};

const CASOS: readonly Caso[] = [
  {
    nome: "escolha com TODAS as opções válidas",
    componentes: [{ type: "single_choice", label: "Pneu", required: true, config: { options: ["Bom", "Ruim"] } }],
  },
  {
    nome: "escolha SEM opções",
    componentes: [{ type: "single_choice", label: "Pneu", required: true, config: { options: [] } }],
  },
  {
    nome: "escolha com UMA opção em branco no meio",
    componentes: [{ type: "multi_choice", label: "Avarias", required: true, config: { options: ["Risco", "   ", "Amassado"] } }],
  },
  {
    nome: "escolha com opção só de espaços",
    componentes: [{ type: "single_choice", label: "Pneu", required: true, config: { options: ["   "] } }],
  },
  {
    nome: "campo com rótulo vazio",
    componentes: [{ type: "observation", label: "   ", required: false, config: {} }],
  },
  {
    nome: "formulário sem nenhum campo",
    componentes: [],
  },
  {
    nome: "campo simples válido",
    componentes: [{ type: "photo_upload", label: "Fotos", required: true, config: {} }],
  },
];

test("travas da tela × validator do backend: mesma decisão para cada payload", async () => {
  const { parseUpdateChecklistTemplateDto } = await import("../src/modules/checklists/checklist.validator.js");
  const { checklistSaveBlockers } = await import(
    "../frontend/src/modules/checklists/checklist-editor.model.js"
  );

  for (const caso of CASOS) {
    // Backend: aceita ou rejeita?
    let backendAceita = true;
    try {
      parseUpdateChecklistTemplateDto({
        name: caso.nomeModelo ?? "Modelo",
        components: caso.componentes.map((component, index) => ({
          componentKey: `k_${index}`,
          orderIndex: index,
          validationRules: {},
          visibilityRules: {},
          ...component,
        })),
      });
    } catch {
      backendAceita = false;
    }

    // Tela: há bloqueio?
    const draft = {
      name: caso.nomeModelo ?? "Modelo",
      description: "",
      type: "custom" as const,
      sections: ["Formulário"],
      components: caso.componentes.map((component, index) => ({
        id: `id_${index}`,
        componentKey: `k_${index}`,
        type: component.type as never,
        label: component.label as string,
        required: Boolean(component.required),
        config: (component.config ?? {}) as Record<string, unknown>,
        validationRules: {},
        visibilityRules: {},
      })),
    };
    const telaAceita = checklistSaveBlockers(draft).length === 0;

    assert.equal(
      telaAceita,
      backendAceita,
      `DIVERGÊNCIA em "${caso.nome}": a tela ${telaAceita ? "deixa passar" : "bloqueia"} e o backend ${backendAceita ? "aceita" : "rejeita"} — o usuário ${telaAceita ? "levaria um 400 cru" : "seria impedido sem motivo real"}.`,
    );
  }
});
