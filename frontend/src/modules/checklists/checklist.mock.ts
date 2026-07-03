import type {
  CreateTenantChecklistInput,
  TenantChecklist,
  TenantChecklistComponent,
  TenantChecklistComponentCatalogItem,
  TenantChecklistComponentInput,
  UpdateTenantChecklistInput,
} from "./types";

export const mockChecklistComponents: TenantChecklistComponentCatalogItem[] = [
  {
    type: "vehicle_selector",
    label: "Seletor de veículo",
    description: "Seleciona o tipo de veículo e resolve a imagem dinâmica para vistoria.",
    defaultConfig: {
      imageStrategy: "by_vehicle_type",
    },
  },
  {
    type: "damage_map",
    label: "Mapa de avarias",
    description: "Permite marcar avarias ou pontos de atenção sobre a imagem.",
    defaultConfig: {
      requireMarker: true,
    },
  },
  {
    type: "photo_upload",
    label: "Foto",
    description: "Coleta fotos obrigatórias ou opcionais conforme o modelo.",
    defaultConfig: {
      minPhotos: 1,
    },
  },
  {
    type: "observation",
    label: "Observação",
    description: "Coleta observações textuais, inclusive em divergências.",
    defaultConfig: {
      multiline: true,
    },
  },
  {
    type: "comparison",
    label: "Comparação",
    description: "Compara a entrega com a coleta ou execuções relacionadas.",
    defaultConfig: {
      compareWith: "related_collection",
    },
  },
  {
    type: "acknowledgement",
    label: "Ciência",
    description: "Registra ciência de responsabilidade.",
    defaultConfig: {
      requireAcknowledgement: true,
    },
  },
  {
    type: "before_after",
    label: "Antes e depois",
    description: "Coleta evidência técnica antes/depois para serviços.",
    defaultConfig: {
      requireBothStages: true,
    },
  },
];

let checklists: TenantChecklist[] = [
  {
    id: "chk_towing_collection",
    tenantId: "ten-industrial-01",
    name: "Coleta de veículo rebocado",
    description: "Seleciona o tipo de veículo, registra avarias e fotos na coleta.",
    type: "towing_collection",
    status: "published",
    version: 3,
    schema: { source: "mock" },
    publishedAt: "2026-06-05T13:00:00.000Z",
    createdAt: "2026-06-04T13:00:00.000Z",
    updatedAt: "2026-06-05T13:00:00.000Z",
    components: [
      component("vehicle_selector", "Tipo de veículo", true, 0),
      component("damage_map", "Marcação de avarias", true, 1),
      component("photo_upload", "Fotos da coleta", true, 2),
    ],
  },
  {
    id: "chk_towing_delivery",
    tenantId: "ten-industrial-01",
    name: "Entrega de veículo rebocado",
    description: "Nova vistoria, comparação com a coleta e ciência quando houver divergência.",
    type: "towing_delivery",
    status: "published",
    version: 2,
    schema: { source: "mock" },
    publishedAt: "2026-06-06T18:00:00.000Z",
    createdAt: "2026-06-06T17:30:00.000Z",
    updatedAt: "2026-06-06T17:30:00.000Z",
    components: [
      component("damage_map", "Nova vistoria", true, 0),
      component("comparison", "Comparação com a coleta", true, 1),
      component("observation", "Observação de divergência", true, 2),
      {
        ...component("acknowledgement", "Ciência de responsabilidade", true, 3),
        config: {
          message: "Declaro ciência da divergência registrada na entrega e da responsabilidade indicada pela organização.",
          requireObservation: true,
        },
      },
    ],
  },
  {
    id: "chk_technical_before_after",
    tenantId: "ten-industrial-01",
    name: "Evidência técnica antes/depois",
    description: "Reparo, construção, manutenção ou serviço interno/externo.",
    type: "technical_evidence",
    status: "published",
    version: 1,
    schema: { source: "mock" },
    publishedAt: "2026-06-04T10:00:00.000Z",
    createdAt: "2026-06-03T10:00:00.000Z",
    updatedAt: "2026-06-04T10:00:00.000Z",
    components: [
      {
        ...component("before_after", "Foto antes/depois", true, 0),
        config: {
          requireBothStages: true,
        },
      },
      component("observation", "Laudo técnico", false, 1),
    ],
  },
];

export async function listMockTenantChecklists(): Promise<TenantChecklist[]> {
  await wait();
  return checklists.filter((checklist) => checklist.status !== "archived");
}

export async function listMockTenantChecklistComponents(): Promise<TenantChecklistComponentCatalogItem[]> {
  await wait();
  return mockChecklistComponents;
}

export async function createMockTenantChecklist(input: CreateTenantChecklistInput): Promise<TenantChecklist> {
  await wait();
  const now = new Date().toISOString();
  const checklist: TenantChecklist = {
    id: `chk_${Date.now()}`,
    tenantId: "ten-industrial-01",
    name: input.name,
    description: input.description,
    type: input.type,
    status: "draft",
    version: 1,
    schema: input.schema,
    components: input.components.map(componentFromInput),
    createdAt: now,
    updatedAt: now,
  };
  checklists = [checklist, ...checklists];
  return checklist;
}

export async function updateMockTenantChecklist(checklistId: string, input: UpdateTenantChecklistInput): Promise<TenantChecklist> {
  await wait();
  checklists = checklists.map((checklist) => {
    if (checklist.id !== checklistId) return checklist;
    return {
      ...checklist,
      ...input,
      components: input.components ? input.components.map(componentFromInput) : checklist.components,
      updatedAt: new Date().toISOString(),
    };
  });
  return findChecklist(checklistId);
}

export async function publishMockTenantChecklist(checklistId: string): Promise<TenantChecklist> {
  await wait();
  checklists = checklists.map((checklist) =>
    checklist.id === checklistId
      ? {
          ...checklist,
          status: "published",
          version: checklist.status === "published" ? checklist.version : checklist.version + 1,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : checklist,
  );
  return findChecklist(checklistId);
}

function component(
  type: TenantChecklistComponent["type"],
  label: string,
  required: boolean,
  orderIndex: number,
): TenantChecklistComponent {
  return {
    id: `cmp_${type}_${orderIndex}`,
    componentKey: type,
    label,
    type,
    required,
    orderIndex,
    config: {},
    validationRules: {},
    visibilityRules: {},
  };
}

function componentFromInput(input: TenantChecklistComponentInput): TenantChecklistComponent {
  return {
    id: `cmp_${input.type}_${input.orderIndex}`,
    componentKey: input.componentKey,
    label: input.label,
    type: input.type,
    required: input.required,
    orderIndex: input.orderIndex,
    config: input.config,
    validationRules: input.validationRules,
    visibilityRules: input.visibilityRules,
  };
}

function findChecklist(checklistId: string): TenantChecklist {
  const checklist = checklists.find((item) => item.id === checklistId);
  if (!checklist) throw new Error("Checklist não encontrado.");
  return checklist;
}

async function wait() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
}
