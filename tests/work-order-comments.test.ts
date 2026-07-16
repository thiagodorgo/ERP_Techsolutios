import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3F-5 (D-Ω3F-5) — o comentário virou AGREGADO PRÓPRIO mutável (WorkOrderComment), servido por
// WorkOrderCommentService + a junção polimórfica TagAssignment. NÃO grava mais evento na timeline.

async function harness() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createMemoryWorkOrderCommentService, resetWorkOrderCommentRuntimeForTests },
    { resetTagAssignmentRuntimeForTests },
    { createMemoryTagService, resetTagRuntimeForTests },
    { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests },
  ] = await Promise.all([
    import("../src/modules/work-order-comments/index.js"),
    import("../src/modules/tag-assignments/index.js"),
    import("../src/modules/tags/tag.service.js"),
    import("../src/modules/work-orders/index.js"),
  ]);

  const reset = () => {
    resetWorkOrderCommentRuntimeForTests();
    resetTagAssignmentRuntimeForTests();
    resetTagRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  };
  reset();

  return {
    comments: createMemoryWorkOrderCommentService(),
    workOrders: createMemoryWorkOrderService(),
    tags: createMemoryTagService(),
    reset,
  };
}

function actor(overrides: Partial<{ tenantId: string; userId: string; permissions: string[] }> = {}) {
  return {
    tenantId: overrides.tenantId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    roles: ["manager"],
    permissions: overrides.permissions ?? ["work_orders:read", "work_orders:create", "work_orders:comment", "work_orders:update", "tags:read", "tags:create"],
  } as never;
}

async function reason(fn: () => Promise<unknown>): Promise<{ statusCode?: number; reason?: string }> {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (error) {
    return error as { statusCode?: number; reason?: string };
  }
}

test("addComment cria o comentário (sem tags) e aparece em listComments — não na timeline", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS com comentário" });
    const created = await comments.addComment(ctx, wo.id, { message: "Cliente pediu para adiantar." });
    assert.equal(created.message, "Cliente pediu para adiantar.");
    assert.equal(created.workOrderId, wo.id);
    assert.equal(created.authorUserId, ctx.userId);
    assert.deepEqual(created.tags, []);

    const list = await comments.listComments(ctx, wo.id);
    assert.equal(list.length, 1);
    assert.equal(list[0]!.message, "Cliente pediu para adiantar.");

    // O comentário NÃO gera evento — a timeline da OS só tem o evento de criação.
    const timeline = await workOrders.timeline(ctx, wo.id);
    assert.equal(timeline.filter((e) => e.eventType === "work_order_comment").length, 0);
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0]!.eventType, "work_order_created");
  } finally {
    reset();
  }
});

test("addComment aceita alias text/comment", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    assert.equal((await comments.addComment(ctx, wo.id, { text: "via text" })).message, "via text");
    assert.equal((await comments.addComment(ctx, wo.id, { comment: "via comment" })).message, "via comment");
  } finally {
    reset();
  }
});

test("addComment com tags → DTO traz tags coloridas (id/name/color)", async () => {
  const { comments, workOrders, tags, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const urgente = await tags.create(ctx, { name: "Urgente", color: "#ef4444" });
    const vip = await tags.create(ctx, { name: "VIP", color: "#22c55e" });
    const created = await comments.addComment(ctx, wo.id, { message: "priorizar", tag_ids: [urgente.id, vip.id] });
    assert.equal(created.tags.length, 2);
    const names = created.tags.map((t) => t.name).sort();
    assert.deepEqual(names, ["Urgente", "VIP"]);
    const urgenteRef = created.tags.find((t) => t.name === "Urgente");
    assert.equal(urgenteRef!.color, "#ef4444");
    assert.equal(urgenteRef!.id, urgente.id);

    const list = await comments.listComments(ctx, wo.id);
    assert.equal(list[0]!.tags.length, 2);
  } finally {
    reset();
  }
});

test("addComment com tag inexistente → 422 tag_not_found (comentário NÃO é criado)", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const err = await reason(() => comments.addComment(ctx, wo.id, { message: "x", tag_ids: [randomUUID()] }));
    assert.equal(err.statusCode, 422);
    assert.equal(err.reason, "tag_not_found");
    // Nenhum comentário órfão foi gravado.
    assert.equal((await comments.listComments(ctx, wo.id)).length, 0);
  } finally {
    reset();
  }
});

test("addComment com tag de OUTRO tenant → 422 tag_not_found (não vaza cross-tenant)", async () => {
  const { comments, workOrders, tags, reset } = await harness();
  try {
    const owner = actor();
    const other = actor();
    const foreignTag = await tags.create(other, { name: "Externa", color: "#000000" });
    const wo = await workOrders.create(owner, { title: "OS" });
    const err = await reason(() => comments.addComment(owner, wo.id, { message: "x", tag_ids: [foreignTag.id] }));
    assert.equal(err.statusCode, 422);
    assert.equal(err.reason, "tag_not_found");
  } finally {
    reset();
  }
});

test("addComment com tag INATIVA → 422 tag_not_found", async () => {
  const { comments, workOrders, tags, reset } = await harness();
  try {
    const ctx = actor();
    const tag = await tags.create(ctx, { name: "Arquivada" });
    await tags.update(ctx, tag.id, { is_active: false });
    const wo = await workOrders.create(ctx, { title: "OS" });
    const err = await reason(() => comments.addComment(ctx, wo.id, { message: "x", tag_ids: [tag.id] }));
    assert.equal(err.statusCode, 422);
    assert.equal(err.reason, "tag_not_found");
  } finally {
    reset();
  }
});

test("addComment vazio → 400 comment_required; > 4000 → 422 comment_too_long; 4000 exato → ok", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const empty = await reason(() => comments.addComment(ctx, wo.id, { message: "   " }));
    assert.equal(empty.statusCode, 400);
    assert.equal(empty.reason, "comment_required");
    const tooLong = await reason(() => comments.addComment(ctx, wo.id, { message: "x".repeat(4001) }));
    assert.equal(tooLong.statusCode, 422);
    assert.equal(tooLong.reason, "comment_too_long");
    const exact = await comments.addComment(ctx, wo.id, { message: "y".repeat(4000) });
    assert.equal(exact.message.length, 4000);
  } finally {
    reset();
  }
});

test("comentário preserva quebras de linha internas (só apara as bordas)", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const created = await comments.addComment(ctx, wo.id, { message: "  linha 1\nlinha 2  " });
    assert.equal(created.message, "linha 1\nlinha 2");
  } finally {
    reset();
  }
});

test("editComment altera a mensagem e carimba editedAt", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const created = await comments.addComment(ctx, wo.id, { message: "antes" });
    assert.equal(created.editedAt, undefined);
    const edited = await comments.editComment(ctx, wo.id, created.id, { message: "depois" });
    assert.equal(edited.message, "depois");
    assert.ok(edited.editedAt instanceof Date);
    const list = await comments.listComments(ctx, wo.id);
    assert.equal(list[0]!.message, "depois");
  } finally {
    reset();
  }
});

test("deleteComment (soft) some da lista; re-delete → 404", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const a = await comments.addComment(ctx, wo.id, { message: "primeiro" });
    await comments.addComment(ctx, wo.id, { message: "segundo" });
    await comments.deleteComment(ctx, wo.id, a.id);
    const list = await comments.listComments(ctx, wo.id);
    assert.deepEqual(list.map((c) => c.message), ["segundo"]);
    const err = await reason(() => comments.deleteComment(ctx, wo.id, a.id));
    assert.equal(err.statusCode, 404);
  } finally {
    reset();
  }
});

test("editar comentário INEXISTENTE → 404", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const err = await reason(() => comments.editComment(ctx, wo.id, randomUUID(), { message: "x" }));
    assert.equal(err.statusCode, 404);
  } finally {
    reset();
  }
});

test("isolamento: comentar / listar em OS de outro tenant → 404", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const owner = actor();
    const wo = await workOrders.create(owner, { title: "OS do tenant A" });
    const invader = await reason(() => comments.addComment(actor(), wo.id, { message: "invasor" }));
    assert.equal(invader.statusCode, 404);
    const listing = await reason(() => comments.listComments(actor(), wo.id));
    assert.equal(listing.statusCode, 404);
  } finally {
    reset();
  }
});

test("autor SEM work_orders:update edita/exclui o PRÓPRIO comentário; NÃO o de outro → 403", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const tenantId = randomUUID();
    // manager (tem update) cria a OS e um comentário próprio.
    const manager = actor({ tenantId, permissions: ["work_orders:read", "work_orders:create", "work_orders:comment", "work_orders:update"] });
    // dispatcher só comenta (SEM work_orders:update).
    const dispatcher = actor({ tenantId, permissions: ["work_orders:read", "work_orders:comment"] });
    const wo = await workOrders.create(manager, { title: "OS" });

    const own = await comments.addComment(dispatcher, wo.id, { message: "do dispatcher" });
    const foreign = await comments.addComment(manager, wo.id, { message: "do manager" });

    // autor edita o próprio → ok
    const edited = await comments.editComment(dispatcher, wo.id, own.id, { message: "editado pelo autor" });
    assert.equal(edited.message, "editado pelo autor");

    // dispatcher tenta editar o do manager → 403
    const forbidden = await reason(() => comments.editComment(dispatcher, wo.id, foreign.id, { message: "hack" }));
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.reason, "comment_forbidden");

    // manager (tem update) edita o do dispatcher → ok
    const byManager = await comments.editComment(manager, wo.id, own.id, { message: "moderado" });
    assert.equal(byManager.message, "moderado");
  } finally {
    reset();
  }
});

test("attachTag adiciona tag a comentário existente; duplicar → 409; detach → some; detach de novo → 404", async () => {
  const { comments, workOrders, tags, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const tag = await tags.create(ctx, { name: "Followup", color: "#3b82f6" });
    const comment = await comments.addComment(ctx, wo.id, { message: "acompanhar" });

    const afterAttach = await comments.attachTag(ctx, wo.id, comment.id, tag.id);
    assert.equal(afterAttach.length, 1);
    assert.equal(afterAttach[0]!.name, "Followup");

    const dup = await reason(() => comments.attachTag(ctx, wo.id, comment.id, tag.id));
    assert.equal(dup.statusCode, 409);
    assert.equal(dup.reason, "duplicate_tag_assignment");

    await comments.detachTag(ctx, wo.id, comment.id, tag.id);
    const list = await comments.listComments(ctx, wo.id);
    assert.deepEqual(list[0]!.tags, []);

    const gone = await reason(() => comments.detachTag(ctx, wo.id, comment.id, tag.id));
    assert.equal(gone.statusCode, 404);
    assert.equal(gone.reason, "tag_assignment_not_found");
  } finally {
    reset();
  }
});

test("attachTag em comentário INEXISTENTE → 404 (alvo polimórfico validado app-level)", async () => {
  const { comments, workOrders, tags, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const tag = await tags.create(ctx, { name: "X" });
    const err = await reason(() => comments.attachTag(ctx, wo.id, randomUUID(), tag.id));
    assert.equal(err.statusCode, 404);
  } finally {
    reset();
  }
});

test("attachTag com tag inexistente → 422 tag_not_found", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const comment = await comments.addComment(ctx, wo.id, { message: "x" });
    const err = await reason(() => comments.attachTag(ctx, wo.id, comment.id, randomUUID()));
    assert.equal(err.statusCode, 422);
    assert.equal(err.reason, "tag_not_found");
  } finally {
    reset();
  }
});

test("tag_ids duplicados no addComment são deduplicados (não 409)", async () => {
  const { comments, workOrders, tags, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const tag = await tags.create(ctx, { name: "Dup" });
    const created = await comments.addComment(ctx, wo.id, { message: "x", tag_ids: [tag.id, tag.id] });
    assert.equal(created.tags.length, 1);
  } finally {
    reset();
  }
});

test("tag_ids inválido (não-array) → 400 invalid_tag_ids", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const err = await reason(() => comments.addComment(ctx, wo.id, { message: "x", tag_ids: "nope" }));
    assert.equal(err.statusCode, 400);
    assert.equal(err.reason, "invalid_tag_ids");
  } finally {
    reset();
  }
});

test("listComments preserva a ordem de criação (asc)", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    await comments.addComment(ctx, wo.id, { message: "primeiro" });
    await comments.addComment(ctx, wo.id, { message: "segundo" });
    await comments.addComment(ctx, wo.id, { message: "terceiro" });
    const list = await comments.listComments(ctx, wo.id);
    assert.deepEqual(list.map((c) => c.message), ["primeiro", "segundo", "terceiro"]);
  } finally {
    reset();
  }
});

test("comentário de uma OS não vaza para a lista de OUTRA OS", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const woA = await workOrders.create(ctx, { title: "OS A" });
    const woB = await workOrders.create(ctx, { title: "OS B" });
    await comments.addComment(ctx, woA.id, { message: "só na A" });
    assert.equal((await comments.listComments(ctx, woB.id)).length, 0);
    assert.equal((await comments.listComments(ctx, woA.id)).length, 1);
  } finally {
    reset();
  }
});

test("editar comentário com mensagem vazia → 400 comment_required", async () => {
  const { comments, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    const created = await comments.addComment(ctx, wo.id, { message: "válido" });
    const err = await reason(() => comments.editComment(ctx, wo.id, created.id, { message: "   " }));
    assert.equal(err.statusCode, 400);
    assert.equal(err.reason, "comment_required");
  } finally {
    reset();
  }
});
