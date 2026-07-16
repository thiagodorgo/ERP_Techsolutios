import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toWorkOrderCommentDto, toWorkOrderCommentListDto } from "./work-order-comment.dto.js";
import type { WorkOrderCommentService } from "./work-order-comment.service.js";

export type WorkOrderCommentServiceResolver = () => Promise<WorkOrderCommentService>;

export class WorkOrderCommentController {
  constructor(private readonly resolveService: WorkOrderCommentServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const comments = await service.listComments(actor, readRouteParam(request.params.workOrderId));
    return { body: toWorkOrderCommentListDto(comments) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const comment = await service.addComment(actor, workOrderId, (request.body ?? {}) as Record<string, unknown>);
    // Auditoria ALLOWLIST (§2.8): NUNCA o corpo do comentário (pode conter PII) — só metadados curados.
    await recordRequestAuditBestEffort(request, {
      action: "work_order.comment_added",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { commentId: comment.id, messageLength: comment.message.length, tagCount: comment.tags.length },
    });
    return { status: 201, data: toWorkOrderCommentDto(comment) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const comment = await service.editComment(
      actor,
      workOrderId,
      readRouteParam(request.params.commentId),
      (request.body ?? {}) as Record<string, unknown>,
    );
    await recordRequestAuditBestEffort(request, {
      action: "work_order.comment_edited",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { commentId: comment.id, messageLength: comment.message.length },
    });
    return { data: toWorkOrderCommentDto(comment) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const commentId = readRouteParam(request.params.commentId);
    await service.deleteComment(actor, workOrderId, commentId);
    await recordRequestAuditBestEffort(request, {
      action: "work_order.comment_deleted",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { commentId },
    });
    return { status: 204 };
  }

  async attachTag(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const commentId = readRouteParam(request.params.commentId);
    const tagId = readRouteParam(request.params.tagId);
    const tags = await service.attachTag(actor, workOrderId, commentId, tagId);
    await recordRequestAuditBestEffort(request, {
      action: "work_order.comment_tag_attached",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { commentId, tagId },
    });
    return { status: 201, data: { tags } };
  }

  async detachTag(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const commentId = readRouteParam(request.params.commentId);
    const tagId = readRouteParam(request.params.tagId);
    await service.detachTag(actor, workOrderId, commentId, tagId);
    await recordRequestAuditBestEffort(request, {
      action: "work_order.comment_tag_detached",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { commentId, tagId },
    });
    return { status: 204 };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
