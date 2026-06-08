import { listMockTenantChecklists } from "./checklist.mock";
import type {
  ChecklistAcknowledgement,
  ChecklistApiContext,
  ChecklistAvailableItem,
  ChecklistDivergence,
  ChecklistMarker,
  ChecklistRenderSchema,
  ChecklistRun,
  ChecklistRunComparison,
  ChecklistRunDetails,
  CreateChecklistAcknowledgementInput,
  CreateChecklistMarkerInput,
  CreateChecklistRunInput,
  TenantChecklist,
  UpdateChecklistRunInput,
} from "./types";

const runs = new Map<string, ChecklistRunDetails>();

export async function listMockAvailableChecklists(): Promise<ChecklistAvailableItem[]> {
  await wait();
  return (await listMockTenantChecklists()).filter((checklist) => checklist.status === "published");
}

export async function renderMockChecklist(checklistId: string): Promise<ChecklistRenderSchema> {
  await wait();
  const checklist = await findPublishedChecklist(checklistId);

  return {
    id: checklist.id,
    name: checklist.name,
    description: checklist.description,
    type: checklist.type,
    version: checklist.version,
    schema: checklist.schema,
    components: checklist.components,
  };
}

export async function createMockChecklistRun(context: ChecklistApiContext, input: CreateChecklistRunInput): Promise<ChecklistRun> {
  await wait();
  const checklist = await findPublishedChecklist(input.checklistId);
  const now = new Date().toISOString();
  const run: ChecklistRun = {
    id: `run_${Date.now()}`,
    tenantId: context.tenantId,
    templateId: checklist.id,
    templateVersion: checklist.version,
    checklistId: checklist.id,
    checklistVersion: checklist.version,
    type: checklist.type,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    status: "in_progress",
    startedBy: "mock-user",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    answers: input.answers ?? [],
    attachments: [],
    markers: [],
    acknowledgements: [],
  };
  runs.set(run.id, {
    run,
    answers: input.answers ?? [],
    attachments: [],
    markers: [],
    acknowledgements: [],
  });

  return run;
}

export async function updateMockChecklistRun(runId: string, input: UpdateChecklistRunInput): Promise<ChecklistRunDetails> {
  await wait();
  const details = findRun(runId);
  const run = {
    ...details.run,
    status: input.status ?? details.run.status,
    updatedAt: new Date().toISOString(),
  };
  const next = {
    ...details,
    run,
    answers: input.answers,
  };
  runs.set(runId, next);

  return next;
}

export async function completeMockChecklistRun(runId: string): Promise<ChecklistRunDetails> {
  await wait();
  const details = findRun(runId);
  const now = new Date().toISOString();
  const next = {
    ...details,
    run: {
      ...details.run,
      status: "completed" as const,
      completedAt: now,
      updatedAt: now,
    },
  };
  runs.set(runId, next);

  return next;
}

export async function addMockChecklistMarker(runId: string, input: CreateChecklistMarkerInput): Promise<ChecklistMarker> {
  await wait();
  const details = findRun(runId);
  const marker: ChecklistMarker = {
    id: `marker_${Date.now()}`,
    tenantId: details.run.tenantId,
    runId,
    componentId: input.componentId,
    x: input.x,
    y: input.y,
    markerType: input.markerType,
    description: input.description,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...details,
    markers: [...details.markers, marker],
  };
  runs.set(runId, next);

  return marker;
}

export async function reportMockChecklistDivergence(runId: string, input: ChecklistDivergence): Promise<ChecklistRunDetails> {
  await wait();
  const details = findRun(runId);
  const next = {
    ...details,
    run: {
      ...details.run,
      status: "pending_acknowledgement" as const,
      updatedAt: new Date().toISOString(),
    },
    answers: [
      ...details.answers,
      {
        componentId: input.componentId,
        value: {
          observation: input.observation,
          fileUrl: input.fileUrl,
        },
        metadata: {
          divergence: true,
        },
      },
    ],
  };
  runs.set(runId, next);

  return next;
}

export async function acknowledgeMockChecklistRun(
  runId: string,
  input: CreateChecklistAcknowledgementInput,
): Promise<{ acknowledgement: ChecklistAcknowledgement; run: ChecklistRunDetails }> {
  await wait();
  const details = findRun(runId);
  const acknowledgement: ChecklistAcknowledgement = {
    id: `ack_${Date.now()}`,
    tenantId: details.run.tenantId,
    runId,
    acknowledgedBy: "mock-user",
    message: input.message,
    observation: input.observation,
    acknowledgedAt: new Date().toISOString(),
    metadata: input.metadata,
  };
  const next = {
    ...details,
    run: {
      ...details.run,
      status: "completed_with_divergence" as const,
      completedAt: new Date().toISOString(),
    },
    acknowledgements: [...details.acknowledgements, acknowledgement],
  };
  runs.set(runId, next);

  return {
    acknowledgement,
    run: next,
  };
}

export async function getMockChecklistRunComparison(runId: string): Promise<ChecklistRunComparison> {
  await wait();
  const details = findRun(runId);

  return {
    run: details.run,
    answers: details.answers,
    attachments: details.attachments,
    markers: details.markers,
    comparison: {
      status: details.run.status,
      divergence: details.run.status === "pending_acknowledgement" || details.run.status === "completed_with_divergence",
    },
  };
}

function findRun(runId: string): ChecklistRunDetails {
  const run = runs.get(runId);
  if (!run) throw new Error("Execucao de checklist nao encontrada.");
  return run;
}

async function findPublishedChecklist(checklistId: string): Promise<TenantChecklist> {
  const checklist = (await listMockAvailableChecklists()).find((item) => item.id === checklistId);
  if (!checklist) throw new Error("Checklist publicado nao encontrado.");
  return checklist;
}

async function wait() {
  await new Promise((resolve) => window.setTimeout(resolve, 180));
}
