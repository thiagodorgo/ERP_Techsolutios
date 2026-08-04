import type { ChecklistComponentType } from "./checklist.types.js";

export type ChecklistComponentCatalogItem = {
  readonly type: ChecklistComponentType;
  readonly label: string;
  readonly description: string;
  readonly defaultConfig: Record<string, unknown>;
};

export const CHECKLIST_COMPONENT_CATALOG: readonly ChecklistComponentCatalogItem[] = [
  {
    type: "vehicle_selector",
    label: "Seletor de veiculo",
    description: "Permite selecionar tipo de veiculo e resolver imagem dinamica para vistoria.",
    defaultConfig: {
      vehicleTypes: ["car", "motorcycle", "truck", "van"],
      imageStrategy: "by_vehicle_type",
    },
  },
  {
    type: "damage_map",
    label: "Mapa de avarias",
    description: "Permite marcar avarias ou pontos de atencao sobre a imagem do veiculo.",
    defaultConfig: {
      markerTypes: ["scratch", "dent", "broken", "missing", "other"],
      requireDescription: false,
    },
  },
  {
    type: "photo_upload",
    label: "Foto",
    description: "Coleta fotos obrigatorias ou opcionais conforme template publicado.",
    defaultConfig: {
      minPhotos: 1,
      maxPhotos: 10,
      accept: ["image/jpeg", "image/png", "image/webp"],
    },
  },
  {
    type: "observation",
    label: "Observacao",
    description: "Coleta observacoes textuais, inclusive obrigatorias em divergencias.",
    defaultConfig: {
      multiline: true,
      maxLength: 1000,
    },
  },
  {
    type: "comparison",
    label: "Comparacao",
    description: "Compara entrega com coleta ou execucoes relacionadas.",
    defaultConfig: {
      compareWith: "related_collection",
    },
  },
  {
    type: "acknowledgement",
    label: "Ciencia",
    description: "Registra ciencia de responsabilidade do operador ou responsavel.",
    defaultConfig: {
      requireObservation: false,
    },
  },
  {
    type: "before_after",
    label: "Antes e depois",
    description: "Coleta evidencia tecnica antes/depois para servicos, manutencoes e reparos.",
    defaultConfig: {
      stages: ["before", "after"],
      requireBothStages: true,
    },
  },
  // CHECKLIST P1 PR-01 — tipos que o mobile ja renderiza (singleChoice/multiChoice/signature). defaultConfig traz
  // um esqueleto autoravel; o editor tipado (opcoes, etc.) vem na PR-02. A validacao (choice exige options nao-vazio)
  // esta no validator.
  {
    type: "single_choice",
    label: "Escolha unica",
    description: "Uma opcao entre varias (radio). Exige a lista de opcoes.",
    defaultConfig: {
      options: ["Opcao 1", "Opcao 2"],
    },
  },
  {
    type: "multi_choice",
    label: "Multipla escolha",
    description: "Uma ou mais opcoes (checkbox). Exige a lista de opcoes.",
    defaultConfig: {
      options: ["Opcao 1", "Opcao 2"],
      minSelected: 0,
    },
  },
  {
    type: "signature",
    label: "Assinatura",
    description: "Captura a assinatura do responsavel (cliente/condutor) no ato.",
    defaultConfig: {
      requireName: false,
    },
  },
];
