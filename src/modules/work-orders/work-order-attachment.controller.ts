import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toWorkOrderAttachmentDto, toWorkOrderAttachmentListDto } from "./work-order-attachment.dto.js";
import type { WorkOrderAttachmentService } from "./work-order-attachment.service.js";
import {
  isMultipartWorkOrderAttachmentRequest,
  parseMultipartWorkOrderAttachmentRequest,
} from "./work-order-attachment.storage.js";
import { WorkOrderAttachmentError } from "./work-order-attachment.types.js";

export type WorkOrderAttachmentServiceResolver = () => Promise<WorkOrderAttachmentService>;

export class WorkOrderAttachmentController {
  constructor(private readonly resolveService: WorkOrderAttachmentServiceResolver) {}

  async listAttachments(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const attachments = await service.listAttachments(actor, readRouteParam(request.params.workOrderId));
    return { body: toWorkOrderAttachmentListDto(attachments) };
  }

  async createAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);

    if (!isMultipartWorkOrderAttachmentRequest(request)) {
      throw new WorkOrderAttachmentError(400, "WORK_ORDER_ATTACHMENT_INVALID", "multipart_required", "Attachment upload must be a multipart/form-data request with a file field.");
    }

    const workOrderId = readRouteParam(request.params.workOrderId);
    const upload = await parseMultipartWorkOrderAttachmentRequest(request);
    const attachment = await service.createUploadedAttachment(actor, workOrderId, upload);

    // R1 — auditoria com metadados CURADOS à mão (nunca storage_key/checksum/path/base64/corpo).
    await recordRequestAuditBestEffort(request, {
      action: "work_order.attachment_uploaded",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        status: attachment.status,
      },
    });

    return { status: 201, body: { data: toWorkOrderAttachmentDto(attachment) } };
  }

  async downloadAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const file = await service.getAttachmentDownload(
      actor,
      readRouteParam(request.params.workOrderId),
      readRouteParam(request.params.attachmentId),
    );
    return { file };
  }

  async deleteAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const attachmentId = readRouteParam(request.params.attachmentId);
    const removed = await service.deleteAttachment(actor, workOrderId, attachmentId);

    await recordRequestAuditBestEffort(request, {
      action: "work_order.attachment_deleted",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { attachmentId: removed.id },
    });

    return { status: 204 };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
