import { ApiError } from "../../services/api/client";
import { countMockLiveRunsForChecklist } from "./checklist-runtime.mock";
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

/** B-SAN3-22 (E3b-06) — modelo publicado de demonstração que nasce com 2 vistorias em andamento (estado "travado"). */
export const MOCK_CHECKLIST_IN_USE_ID = "chk_vistoria_em_uso";

/** Vistorias em andamento semeadas por modelo (as do runtime simulado somam-se a estas). */
const SEEDED_LIVE_RUNS: Readonly<Record<string, number>> = Object.freeze({ [MOCK_CHECKLIST_IN_USE_ID]: 2 });

let checklists: TenantChecklist[] = [
  {
    id: MOCK_CHECKLIST_IN_USE_ID,
    tenantId: "ten-industrial-01",
    name: "Vistoria de coleta — Guincho",
    description: "Vistoria do veículo na coleta, com avarias, fotos e ciência do responsável.",
    type: "towing_collection",
    status: "published",
    version: 4,
    schema: { source: "ckb_editor", sections: ["Veículo", "Avarias e fotos", "Entrega ao responsável"] },
    publishedAt: "2026-10-12T13:00:00.000Z",
    createdAt: "2026-09-02T13:00:00.000Z",
    updatedAt: "2026-10-12T13:00:00.000Z",
    components: [
      sectioned(component("vehicle_selector", "Tipo do veículo", true, 0), 0, { vehicleTypes: ["car", "motorcycle", "van"] }),
      sectioned(component("single_choice", "Estado geral", true, 1), 0, { options: ["Bom", "Regular", "Ruim", "Sem condições de rodar"] }),
      sectioned(component("damage_map", "Avarias encontradas", true, 2), 1, { markerTypes: ["scratch", "dent", "broken"], requireDescription: true }),
      sectioned(component("photo_upload", "Fotos das 4 laterais", true, 3), 1, {
        minPhotos: 4,
        maxPhotos: 8,
        help: "Frente, traseira e as duas laterais, com a placa visível",
      }),
      sectioned(component("observation", "Observações do técnico", false, 4), 1, { multiline: true, maxLength: 500 }),
      sectioned(component("acknowledgement", "Ciência do responsável", true, 5), 2, { requireObservation: false }),
      sectioned(component("signature", "Assinatura do responsável", true, 6), 2, { requireName: true }),
    ],
  },
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

export async function getMockTenantChecklist(checklistId: string): Promise<TenantChecklist> {
  await wait();
  return withActiveRuns(findChecklist(checklistId));
}

/** B-SAN3-22 — mesma régua do servidor: vistorias em andamento ou aguardando ciência deste modelo. */
export function countMockActiveRuns(checklistId: string): number {
  return (SEEDED_LIVE_RUNS[checklistId] ?? 0) + countMockLiveRunsForChecklist(checklistId);
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

/**
 * B-SAN3-22 — paridade com o servidor (CE-31): token defasado → 409 `template_changed_since_read`; `published` e
 * `archived` pelo salvar → portas próprias; com vistoria em andamento, voltar a rascunho ou mudar campo → 409
 * `template_has_active_runs`. Nada muda quando recusa.
 */
export async function updateMockTenantChecklist(checklistId: string, input: UpdateTenantChecklistInput): Promise<TenantChecklist> {
  await wait();
  const current = findChecklist(checklistId);
  assertFreshToken(current, input.expectedUpdatedAt);
  if (input.status === "published") throw mockConflict("CHECKLIST_STATUS_REQUIRES_PUBLISH", "status_requires_publish_endpoint");
  if (input.status === "archived") throw mockConflict("CHECKLIST_STATUS_REQUIRES_DELETE", "status_requires_delete_endpoint");

  const { expectedUpdatedAt: _token, ...changes } = input;
  const activeRuns = countMockActiveRuns(checklistId);
  if (activeRuns > 0 && (changes.status === "draft" || changesFormShape(current, changes))) {
    throw mockConflict("CHECKLIST_TEMPLATE_IN_USE", "template_has_active_runs");
  }

  const updated: TenantChecklist = {
    ...current,
    ...changes,
    components: changes.components ? changes.components.map(componentFromInput) : current.components,
    updatedAt: nextUpdatedAt(current.updatedAt),
  };
  checklists = checklists.map((checklist) => (checklist.id === checklistId ? updated : checklist));
  return withActiveRuns(updated);
}

export async function publishMockTenantChecklist(checklistId: string, expectedUpdatedAt: string): Promise<TenantChecklist> {
  await wait();
  const current = findChecklist(checklistId);
  assertFreshToken(current, expectedUpdatedAt);
  const published: TenantChecklist = {
    ...current,
    status: "published",
    version: current.status === "published" ? current.version : current.version + 1,
    publishedAt: new Date().toISOString(),
    updatedAt: nextUpdatedAt(current.updatedAt),
  };
  checklists = checklists.map((checklist) => (checklist.id === checklistId ? published : checklist));
  return withActiveRuns(published);
}

function withActiveRuns(checklist: TenantChecklist): TenantChecklist {
  return { ...checklist, activeRuns: countMockActiveRuns(checklist.id) };
}

function assertFreshToken(current: TenantChecklist, expectedUpdatedAt: string | undefined) {
  if (!expectedUpdatedAt || expectedUpdatedAt !== current.updatedAt) {
    throw mockConflict("CHECKLIST_TEMPLATE_STALE", "template_changed_since_read");
  }
}

function mockConflict(code: string, reason: string): ApiError {
  return new ApiError(409, "Conflito de dados. Recarregue e tente novamente.", code, reason);
}

/** O relógio do mock nunca repete o `updatedAt` (duas gravações no mesmo milissegundo seriam indistinguíveis). */
function nextUpdatedAt(previous: string): string {
  const now = Date.now();
  const before = Date.parse(previous);
  return new Date(Number.isFinite(before) && now <= before ? before + 1 : now).toISOString();
}

/**
 * Régua simplificada do servidor (o classificador real é `checklist.template-change.ts`, no backend): com vistoria
 * em andamento só os textos mudam. Tipo do modelo, campo acrescentado ou removido, ordem, tipo do campo, obrigatório
 * e qualquer chave de `config` além de `help` (com `sectionIndex` ausente ≡ 0) contam como mudança de campo.
 */
function changesFormShape(current: TenantChecklist, changes: Omit<UpdateTenantChecklistInput, "expectedUpdatedAt">): boolean {
  if (changes.type !== undefined && changes.type !== current.type) return true;
  if (!changes.components) return false;
  const before = current.components.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const after = changes.components.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  if (before.map((item) => item.componentKey).join("|") !== after.map((item) => item.componentKey).join("|")) return true;
  return after.some((next, index) => {
    const previous = before[index];
    return (
      next.type !== previous.type ||
      next.required !== previous.required ||
      JSON.stringify(shapeOf(next.config)) !== JSON.stringify(shapeOf(previous.config))
    );
  });
}

function shapeOf(config: Record<string, unknown>): Record<string, unknown> {
  const { help: _help, sectionIndex, ...rest } = config;
  const section = typeof sectionIndex === "number" && Number.isInteger(sectionIndex) && sectionIndex > 0 ? sectionIndex : 0;
  return Object.fromEntries(Object.entries({ ...rest, sectionIndex: section }).sort(([a], [b]) => a.localeCompare(b)));
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

function sectioned(
  base: TenantChecklistComponent,
  sectionIndex: number,
  config: TenantChecklistComponent["config"],
): TenantChecklistComponent {
  return { ...base, id: `cmp_em_uso_${base.orderIndex}`, componentKey: `${base.type}_em_uso`, config: { ...config, sectionIndex } };
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
