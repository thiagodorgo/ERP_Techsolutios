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
];
