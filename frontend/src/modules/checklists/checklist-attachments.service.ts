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

const useMocks = import.meta.env.VITE_USE_MOCKS === "true";

export function uploadChecklistAttachment(input: ChecklistAttachmentUploadInput): Promise<ChecklistAttachmentUploadResult> {
  if (useMocks) return uploadMockChecklistAttachment(input);
  return uploadChecklistAttachmentToApi(input);
}

export function downloadChecklistAttachment(
  context: ChecklistApiContext,
  runId: string,
  attachmentId: string,
): Promise<ChecklistAttachmentDownloadResult> {
  if (useMocks) return downloadMockChecklistAttachment(context, runId, attachmentId);
  return downloadChecklistAttachmentFromApi(context, runId, attachmentId);
}

export function revokeChecklistAttachmentDownloadUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
