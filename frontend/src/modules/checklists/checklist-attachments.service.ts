import { isMockMode } from "../../config/env";
import {
  downloadChecklistAttachmentFromApi,
  uploadChecklistAttachmentToApi,
} from "./checklist-attachments.adapter";
import {
  downloadMockChecklistAttachment,
  uploadMockChecklistAttachment,
} from "./checklist-attachments.mock";
import type {
  ChecklistApiContext,
  ChecklistAttachmentDownloadResult,
  ChecklistAttachmentUploadInput,
  ChecklistAttachmentUploadResult,
} from "./types";

export function uploadChecklistAttachment(input: ChecklistAttachmentUploadInput): Promise<ChecklistAttachmentUploadResult> {
  if (isMockMode()) return uploadMockChecklistAttachment(input);
  return uploadChecklistAttachmentToApi(input);
}

export function downloadChecklistAttachment(
  context: ChecklistApiContext,
  runId: string,
  attachmentId: string,
): Promise<ChecklistAttachmentDownloadResult> {
  if (isMockMode()) return downloadMockChecklistAttachment(context, runId, attachmentId);
  return downloadChecklistAttachmentFromApi(context, runId, attachmentId);
}

export function revokeChecklistAttachmentDownloadUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
