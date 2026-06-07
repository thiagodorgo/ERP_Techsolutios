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
    label: "Seletor de veiculo",
    description: "Seleciona tipo de veiculo e resolve imagem dinamica para vistoria.",
    defaultConfig: {
      imageStrategy: "by_vehicle_type",
    },
  },
  {
    type: "damage_map",
    label: "Mapa de avarias",
    description: "Permite marcar avarias ou pontos de atencao sobre a imagem.",
    defaultConfig: {
      requireMarker: true,
    },
  },
  {
    type: "photo_upload",
    label: "Foto",
    description: "Coleta fotos obrigatorias ou opcionais conforme template.",
    defaultConfig: {
      minPhotos: 1,
    },
  },
  {
    type: "observation",
    label: "Observacao",
    description: "Coleta observacoes textuais, inclusive em divergencias.",
    defaultConfig: {
      multiline: true,
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
    description: "Registra ciencia de responsabilidade.",
    defaultConfig: {
      requireAcknowledgement: true,
    },
  },
  {
    type: "before_after",
    label: "Antes e depois",
    description: "Coleta evidencia tecnica antes/depois para servicos.",
    defaultConfig: {
      requireBothStages: true,
    },
  },
];

let checklists: TenantChecklist[] = [
  {
    id: "chk_towing_collection",
    tenantId: "ten-industrial-01",
    name: "Coleta de veiculo rebocado",
    description: "Seleciona tipo de veiculo, registra avarias e fotos na coleta.",
    type: "towing_collection",
    status: "published",
    version: 3,
    schema: { source: "mock" },
    publishedAt: "2026-06-05T13:00:00.000Z",
    createdAt: "2026-06-04T13:00:00.000Z",
    updatedAt: "2026-06-05T13:00:00.000Z",
    components: [
      component("vehicle_selector", "Tipo de veiculo", true, 0),
      component("damage_map", "Marcacao de avarias", true, 1),
      component("photo_upload", "Fotos da coleta", true, 2),
    ],
  },
  {
    id: "chk_towing_delivery",
    tenantId: "ten-industrial-01",
    name: "Entrega de veiculo rebocado",
    description: "Nova vistoria, comparacao com coleta e ciencia quando houver divergencia.",
    type: "towing_delivery",
    status: "draft",
    version: 2,
    schema: { source: "mock" },
    createdAt: "2026-06-06T17:30:00.000Z",
    updatedAt: "2026-06-06T17:30:00.000Z",
    components: [
      component("damage_map", "Nova vistoria", true, 0),
      component("comparison", "Comparacao com coleta", true, 1),
      component("observation", "Observacao de divergencia", true, 2),
      component("acknowledgement", "Ciencia de responsabilidade", true, 3),
    ],
  },
  {
    id: "chk_technical_before_after",
    tenantId: "ten-industrial-01",
    name: "Evidencia tecnica antes/depois",
    description: "Reparo, construcao, manutencao ou servico interno/externo.",
    type: "technical_evidence",
    status: "published",
    version: 1,
    schema: { source: "mock" },
    publishedAt: "2026-06-04T10:00:00.000Z",
    createdAt: "2026-06-03T10:00:00.000Z",
    updatedAt: "2026-06-04T10:00:00.000Z",
    components: [
      component("before_after", "Foto antes/depois", true, 0),
      component("observation", "Laudo tecnico", false, 1),
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
  if (!checklist) throw new Error("Checklist nao encontrado.");
  return checklist;
}

async function wait() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
}
