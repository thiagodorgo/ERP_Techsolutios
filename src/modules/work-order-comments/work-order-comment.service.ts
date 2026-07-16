import { env } from "../../config/env.js";
import {
  createDefaultTagAssignmentService,
  createMemoryTagAssignmentService,
  type TagAssignmentService,
} from "../tag-assignments/tag-assignment.service.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "../work-orders/work-order.service.js";
import { WorkOrderError } from "../work-orders/work-order.types.js";
import { parseComment } from "../work-orders/work-order.validators.js";
import {
  InMemoryWorkOrderCommentRepository,
  type WorkOrderCommentRepository,
} from "./work-order-comment.repository.js";
import type {
  WorkOrderComment,
  WorkOrderCommentActorContext,
  WorkOrderCommentWithTags,
} from "./work-order-comment.types.js";
import { commentForbiddenError, commentNotFoundError } from "./work-order-comment.types.js";
import { parseOptionalTagIds, parseRequiredUuid } from "./work-order-comment.validators.js";

type RawRecord = Record<string, unknown>;

// D-Ω3F-5-TAGASSIGN — o comentário é o primeiro alvo polimórfico da junção de tags.
const COMMENT_ENTITY_TYPE = "work_order_comment";

export class WorkOrderCommentService {
  constructor(
    private readonly repository: WorkOrderCommentRepository,
    private readonly workOrderService: WorkOrderService,
    private readonly tagAssignments: TagAssignmentService,
  ) {}

  async listComments(actor: WorkOrderCommentActorContext, workOrderId: string): Promise<readonly WorkOrderCommentWithTags[]> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const comments = await this.repository.listByWorkOrder(actor.tenantId, workOrder.id);
    return Promise.all(comments.map((comment) => this.withTags(actor, comment)));
  }

  // Cria o comentário e (opcional) associa tag_ids. As tags são VALIDADAS antes da criação (422
  // tag_not_found se alguma não existe/ativa) para nunca deixar um comentário órfão.
  async addComment(actor: WorkOrderCommentActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrderCommentWithTags> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const message = parseComment(body.message ?? body.text ?? body.comment);
    const tagIds = parseOptionalTagIds(body.tag_ids ?? body.tagIds);

    // Pré-valida todas as tags (422 tag_not_found) ANTES de gravar o comentário.
    await this.tagAssignments.assertTagsActive(actor, tagIds);

    const comment = await this.repository.create({
      tenantId: actor.tenantId,
      workOrderId: workOrder.id,
      authorUserId: actor.userId,
      message,
    });

    for (const tagId of tagIds) {
      await this.tagAssignments.attach(actor, COMMENT_ENTITY_TYPE, comment.id, tagId);
    }

    return this.withTags(actor, comment);
  }

  // Editar = PATCH message (carimba editedAt). Autor OU work_orders:update; senão 403.
  async editComment(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string, body: RawRecord): Promise<WorkOrderCommentWithTags> {
    const current = await this.getComment(actor, workOrderId, commentId);
    assertCanMutate(actor, current);
    const message = parseComment(body.message ?? body.text ?? body.comment);
    const updated = await this.repository.updateMessage({
      tenantId: actor.tenantId,
      workOrderId: current.workOrderId,
      commentId: current.id,
      message,
    });
    if (!updated) {
      throw commentNotFoundError();
    }
    return this.withTags(actor, updated);
  }

  // Excluir = delete LÓGICO (deletedAt). Autor OU work_orders:update; senão 403. Re-delete → 404.
  async deleteComment(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string): Promise<void> {
    const current = await this.getComment(actor, workOrderId, commentId);
    assertCanMutate(actor, current);
    const removed = await this.repository.softDelete(actor.tenantId, current.workOrderId, current.id);
    if (!removed) {
      throw commentNotFoundError();
    }
  }

  // Attach de tag a um comentário existente (404 se o comentário não existe/deletado/cross-tenant;
  // 422 tag_not_found; 409 duplicate_tag_assignment). Autor OU work_orders:update.
  async attachTag(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string, tagId: string): Promise<WorkOrderCommentWithTags["tags"]> {
    const comment = await this.getComment(actor, workOrderId, commentId);
    assertCanMutate(actor, comment);
    await this.tagAssignments.attach(actor, COMMENT_ENTITY_TYPE, comment.id, parseRequiredUuid(tagId, "tagId"));
    return this.tagAssignments.listForEntity(actor, COMMENT_ENTITY_TYPE, comment.id);
  }

  // Detach de tag = HARD-delete da associação (404 se não existir). Autor OU work_orders:update.
  async detachTag(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string, tagId: string): Promise<void> {
    const comment = await this.getComment(actor, workOrderId, commentId);
    assertCanMutate(actor, comment);
    await this.tagAssignments.detach(actor, COMMENT_ENTITY_TYPE, comment.id, parseRequiredUuid(tagId, "tagId"));
  }

  private async withTags(actor: WorkOrderCommentActorContext, comment: WorkOrderComment): Promise<WorkOrderCommentWithTags> {
    const tags = await this.tagAssignments.listForEntity(actor, COMMENT_ENTITY_TYPE, comment.id);
    return { ...comment, tags };
  }

  // OS in-tenant? senão 404 (não vaza cross-tenant). Reusa o WorkOrderService — padrão dos vizinhos.
  private async assertWorkOrder(actor: WorkOrderCommentActorContext, workOrderId: string) {
    try {
      return await this.workOrderService.get(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw commentNotFoundError();
      }
      throw error;
    }
  }

  private async getComment(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string): Promise<WorkOrderComment> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const comment = await this.repository.findById(actor.tenantId, workOrder.id, parseRequiredUuid(commentId, "commentId"));
    if (!comment) {
      throw commentNotFoundError();
    }
    return comment;
  }
}

// Autor OU quem tem work_orders:update (D-Ω3F-5-COMMENT). A rota já exige work_orders:comment.
function assertCanMutate(actor: WorkOrderCommentActorContext, comment: WorkOrderComment): void {
  const isAuthor = comment.authorUserId === actor.userId;
  const canUpdate = actor.permissions.includes("work_orders:update");
  if (!isAuthor && !canUpdate) {
    throw commentForbiddenError();
  }
}

const memoryRepository = new InMemoryWorkOrderCommentRepository();
let defaultServicePromise: Promise<WorkOrderCommentService> | undefined;

export function createMemoryWorkOrderCommentService(): WorkOrderCommentService {
  return new WorkOrderCommentService(memoryRepository, createMemoryWorkOrderService(), createMemoryTagAssignmentService());
}

export function getMemoryWorkOrderCommentRepositoryForTests(): InMemoryWorkOrderCommentRepository {
  return memoryRepository;
}

export async function createDefaultWorkOrderCommentService(): Promise<WorkOrderCommentService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderCommentService();
  }
  defaultServicePromise ??= createPrismaWorkOrderCommentService();
  return defaultServicePromise;
}

export function resetWorkOrderCommentRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaWorkOrderCommentService(): Promise<WorkOrderCommentService> {
  const { createPrismaWorkOrderCommentRepository } = await import("./work-order-comment-prisma.repository.js");
  const repository = await createPrismaWorkOrderCommentRepository();
  const workOrderService = await createDefaultWorkOrderService();
  const tagAssignments = await createDefaultTagAssignmentService();
  return new WorkOrderCommentService(repository, workOrderService, tagAssignments);
}
