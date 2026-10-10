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
    // B-O6R-07c-a — escopo por objeto ANTES do parse: o técnico de campo só comenta na OS dele.
    const workOrder = await this.assertWorkOrderForMutation(actor, workOrderId);
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
    // B-O6R-07c-a — escopo por objeto da OS ANTES de buscar o comentário; a moderação (D-Ω3F-5-COMMENT) vem depois.
    const workOrder = await this.assertWorkOrderForMutation(actor, workOrderId);
    const current = await this.findComment(actor, workOrder.id, commentId);
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
    const workOrder = await this.assertWorkOrderForMutation(actor, workOrderId);
    const current = await this.findComment(actor, workOrder.id, commentId);
    assertCanMutate(actor, current);
    const removed = await this.repository.softDelete(actor.tenantId, current.workOrderId, current.id);
    if (!removed) {
      throw commentNotFoundError();
    }
  }

  // Attach de tag a um comentário existente (404 se o comentário não existe/deletado/cross-tenant;
  // 422 tag_not_found; 409 duplicate_tag_assignment). Autor OU work_orders:update.
  async attachTag(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string, tagId: string): Promise<WorkOrderCommentWithTags["tags"]> {
    const workOrder = await this.assertWorkOrderForMutation(actor, workOrderId);
    const comment = await this.findComment(actor, workOrder.id, commentId);
    assertCanMutate(actor, comment);
    await this.tagAssignments.attach(actor, COMMENT_ENTITY_TYPE, comment.id, parseRequiredUuid(tagId, "tagId"));
    return this.tagAssignments.listForEntity(actor, COMMENT_ENTITY_TYPE, comment.id);
  }

  // Detach de tag = HARD-delete da associação (404 se não existir). Autor OU work_orders:update.
  async detachTag(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string, tagId: string): Promise<void> {
    const workOrder = await this.assertWorkOrderForMutation(actor, workOrderId);
    const comment = await this.findComment(actor, workOrder.id, commentId);
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
      throw toCommentWorkOrderError(error);
    }
  }

  // B-O6R-07c-a — a OS para ESCREVER: `getForMutation` (404 do cross-tenant + escopo por objeto do 07a). A conversão
  // do 404 é a mesma de `assertWorkOrder`; o 403 `not_assigned_to_actor` atravessa como está.
  private async assertWorkOrderForMutation(actor: WorkOrderCommentActorContext, workOrderId: string) {
    try {
      return await this.workOrderService.getForMutation(actor, workOrderId);
    } catch (error) {
      throw toCommentWorkOrderError(error);
    }
  }

  private async findComment(actor: WorkOrderCommentActorContext, workOrderId: string, commentId: string): Promise<WorkOrderComment> {
    const comment = await this.repository.findById(actor.tenantId, workOrderId, parseRequiredUuid(commentId, "commentId"));
    if (!comment) {
      throw commentNotFoundError();
    }
    return comment;
  }
}

function toCommentWorkOrderError(error: unknown): unknown {
  if (error instanceof WorkOrderError && error.statusCode === 404) {
    return commentNotFoundError();
  }
  return error;
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
let defaultRepositoryPromise: Promise<WorkOrderCommentRepository> | undefined;

// Ω3F-6 (D-Ω3F-6-DUPLICATE) — acesso ao REPOSITÓRIO (não ao service) para o `copy_comments` do
// duplicate: a cópia precisa preservar o AUTOR ORIGINAL, e addComment carimba `actor.userId` como
// autor (quem duplica viraria autor de todos os comentários — reescrita de autoria). O chamador é
// responsável pelo recorte de tenant/OS (o duplicate já resolveu ambos via WorkOrderService.get).

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

export async function createDefaultWorkOrderCommentRepository(): Promise<WorkOrderCommentRepository> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return memoryRepository;
  }
  defaultRepositoryPromise ??= createPrismaWorkOrderCommentRepositoryInstance();
  return defaultRepositoryPromise;
}

export function resetWorkOrderCommentRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
  defaultRepositoryPromise = undefined;
}

async function createPrismaWorkOrderCommentRepositoryInstance(): Promise<WorkOrderCommentRepository> {
  const { createPrismaWorkOrderCommentRepository } = await import("./work-order-comment-prisma.repository.js");
  return createPrismaWorkOrderCommentRepository();
}

async function createPrismaWorkOrderCommentService(): Promise<WorkOrderCommentService> {
  const { createPrismaWorkOrderCommentRepository } = await import("./work-order-comment-prisma.repository.js");
  const repository = await createPrismaWorkOrderCommentRepository();
  const workOrderService = await createDefaultWorkOrderService();
  const tagAssignments = await createDefaultTagAssignmentService();
  return new WorkOrderCommentService(repository, workOrderService, tagAssignments);
}
