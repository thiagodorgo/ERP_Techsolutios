import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { resolveUserNames, type UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import { toAttachmentDto, toAttachmentListDto } from "./attachment.dto.js";
import type { AttachmentService } from "./attachment.service.js";
import {
  isMultipartAttachmentRequest,
  parseMultipartAttachmentRequest,
} from "./attachment.storage.js";
import { AttachmentError } from "./attachment.types.js";

export type AttachmentServiceResolver = () => Promise<AttachmentService>;

export class AttachmentController {
  // `resolveUserName` opcional (composto no app.ts): traduz uploadedBy → nome legível. Sem ele,
  // uploadedByName sai null e o front cai num rótulo neutro (NUNCA o UUID, §11.2).
  constructor(
    private readonly resolveService: AttachmentServiceResolver,
    private readonly resolveUserName?: UserNameResolver,
  ) {}

  async listAttachments(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const query = request.query as Record<string, unknown>;
    const attachments = await service.listAttachments(
      actor,
      readString(query.entityType ?? query.entity_type),
      readString(query.entityId ?? query.entity_id),
    );
    const names = await resolveUserNames(this.resolveUserName, actor.tenantId, attachments.map((a) => a.uploadedBy));
    return { body: toAttachmentListDto(attachments, names) };
  }

  async createAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);

    if (!isMultipartAttachmentRequest(request)) {
      throw new AttachmentError(400, "ATTACHMENT_INVALID", "multipart_required", "Attachment upload must be a multipart/form-data request with a file field.");
    }

    const upload = await parseMultipartAttachmentRequest(request);
    const attachment = await service.createUploadedAttachment(actor, upload.entityType, upload.entityId, upload);

    // Auditoria com metadados CURADOS à mão (§2.8): NUNCA storage_key/checksum/file_url/path/base64/
    // corpo binário nem tenant_id externo. Só o vínculo + rótulos não sensíveis.
    await recordRequestAuditBestEffort(request, {
      action: "attachment.uploaded",
      resourceType: attachment.entityType,
      resourceId: attachment.entityId,
      outcome: "success",
      severity: "info",
      metadata: {
        attachmentId: attachment.id,
        entityType: attachment.entityType,
        fileName: attachment.fileName,
        extension: attachment.extension,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        status: attachment.status,
      },
    });

    const names = await resolveUserNames(this.resolveUserName, actor.tenantId, [attachment.uploadedBy]);
    return { status: 201, body: { data: toAttachmentDto(attachment, names) } };
  }

  async downloadAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const file = await service.getAttachmentDownload(actor, readRouteParam(request.params.attachmentId));
    return { file };
  }

  async deleteAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const removed = await service.deleteAttachment(actor, readRouteParam(request.params.attachmentId));

    await recordRequestAuditBestEffort(request, {
      action: "attachment.deleted",
      resourceType: removed.entityType,
      resourceId: removed.entityId,
      outcome: "success",
      severity: "info",
      metadata: { attachmentId: removed.id, entityType: removed.entityType },
    });

    return { status: 204 };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
