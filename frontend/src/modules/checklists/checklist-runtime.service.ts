import { isMockMode } from "../../config/env";
import {
  acknowledgeChecklistRunFromApi,
  addChecklistMarkerFromApi,
  completeChecklistRunFromApi,
  createChecklistRunFromApi,
  getChecklistRunComparisonFromApi,
  listAvailableChecklistsFromApi,
  renderChecklistFromApi,
  reportChecklistDivergenceFromApi,
  updateChecklistRunFromApi,
} from "./checklist-runtime.adapter";
import {
  acknowledgeMockChecklistRun,
  addMockChecklistMarker,
  completeMockChecklistRun,
  createMockChecklistRun,
  getMockChecklistRunComparison,
  listMockAvailableChecklists,
  renderMockChecklist,
  reportMockChecklistDivergence,
  updateMockChecklistRun,
} from "./checklist-runtime.mock";
import type {
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
  UpdateChecklistRunInput,
} from "./types";

export function listAvailableChecklists(context: ChecklistApiContext): Promise<ChecklistAvailableItem[]> {
  if (isMockMode()) return listMockAvailableChecklists();
  return listAvailableChecklistsFromApi(context);
}

export function renderChecklist(context: ChecklistApiContext, checklistId: string): Promise<ChecklistRenderSchema> {
  if (isMockMode()) return renderMockChecklist(checklistId);
  return renderChecklistFromApi(context, checklistId);
}

export function createChecklistRun(context: ChecklistApiContext, input: CreateChecklistRunInput): Promise<ChecklistRun> {
  if (isMockMode()) return createMockChecklistRun(context, input);
  return createChecklistRunFromApi(context, input);
}

export function updateChecklistRun(
  context: ChecklistApiContext,
  runId: string,
  input: UpdateChecklistRunInput,
): Promise<ChecklistRunDetails> {
  if (isMockMode()) return updateMockChecklistRun(runId, input);
  return updateChecklistRunFromApi(context, runId, input);
}

export function completeChecklistRun(context: ChecklistApiContext, runId: string): Promise<ChecklistRunDetails> {
  if (isMockMode()) return completeMockChecklistRun(runId);
  return completeChecklistRunFromApi(context, runId);
}

export function addMarker(context: ChecklistApiContext, runId: string, input: CreateChecklistMarkerInput): Promise<ChecklistMarker> {
  if (isMockMode()) return addMockChecklistMarker(runId, input);
  return addChecklistMarkerFromApi(context, runId, input);
}

export function reportDivergence(
  context: ChecklistApiContext,
  runId: string,
  input: ChecklistDivergence,
): Promise<ChecklistRunDetails> {
  if (isMockMode()) return reportMockChecklistDivergence(runId, input);
  return reportChecklistDivergenceFromApi(context, runId, input);
}

export function acknowledgeRun(
  context: ChecklistApiContext,
  runId: string,
  input: CreateChecklistAcknowledgementInput,
): Promise<{ run: ChecklistRunDetails }> {
  if (isMockMode()) {
    return acknowledgeMockChecklistRun(runId, input).then(({ run }) => ({ run }));
  }

  return acknowledgeChecklistRunFromApi(context, runId, input).then(({ run }) => ({ run }));
}

export function getRunComparison(context: ChecklistApiContext, runId: string): Promise<ChecklistRunComparison> {
  if (isMockMode()) return getMockChecklistRunComparison(runId);
  return getChecklistRunComparisonFromApi(context, runId);
}
