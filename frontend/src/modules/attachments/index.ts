// PR-01 Ω4C — barrel do módulo de anexos genéricos (aba "Arquivos" polimórfica).
export { EntityAttachmentsTab, EntityAttachmentsView, AttachmentRow } from "./components/EntityAttachmentsTab";
export { useEntityAttachments } from "./useEntityAttachments";
export { adaptAttachments, contentTypeLabel, formatBytes } from "./attachments.adapter";
export { listAttachments, uploadAttachment, downloadAttachment, deleteAttachment, revokeAttachmentUrl } from "./attachments.service";
export type {
  AttachmentEntityType,
  AttachmentStatus,
  AttachmentView,
  AttachmentsApiContext,
  AttachmentsData,
  AttachmentsSource,
  AttachmentDownloadResult,
} from "./attachments.types";
export { emptyAttachments } from "./attachments.types";
