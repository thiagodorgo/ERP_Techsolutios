import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3-b — comentário livre grava evento imutável "work_order_comment" na timeline da OS (Opção A/D4).

async function svc() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  resetWorkOrderRuntimeForTests();
  return { service: createMemoryWorkOrderService(), reset: resetWorkOrderRuntimeForTests };
}

function actor(tenantId = randomUUID()) {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["work_orders:read", "work_orders:create", "work_orders:comment"],
  } as never;
}

test("addComment grava evento work_order_comment e aparece na timeline da OS", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS com comentário" });
    const event = await service.addComment(ctx, wo.id, { message: "Cliente pediu para adiantar." });
    assert.equal(event.eventType, "work_order_comment");
    assert.equal(event.message, "Cliente pediu para adiantar.");
    assert.equal(event.workOrderId, wo.id);

    const timeline = await service.timeline(ctx, wo.id);
    const comments = timeline.filter((e) => e.eventType === "work_order_comment");
    assert.equal(comments.length, 1);
    assert.equal(comments[0]!.message, "Cliente pediu para adiantar.");
  } finally {
    reset();
  }
});

test("addComment aceita alias text/comment", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS" });
    const byText = await service.addComment(ctx, wo.id, { text: "via text" });
    assert.equal(byText.message, "via text");
    const byComment = await service.addComment(ctx, wo.id, { comment: "via comment" });
    assert.equal(byComment.message, "via comment");
  } finally {
    reset();
  }
});

test("addComment vazio → 400 comment_required", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS" });
    await assert.rejects(
      () => service.addComment(ctx, wo.id, { message: "   " }),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 400 && (e as { reason?: string }).reason === "comment_required",
    );
    await assert.rejects(
      () => service.addComment(ctx, wo.id, {}),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 400 && (e as { reason?: string }).reason === "comment_required",
    );
  } finally {
    reset();
  }
});

test("addComment > 4000 chars → 422 comment_too_long", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS" });
    await assert.rejects(
      () => service.addComment(ctx, wo.id, { message: "x".repeat(4001) }),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "comment_too_long",
    );
  } finally {
    reset();
  }
});

test("isolamento: comentar em OS de outro tenant → 404", async () => {
  const { service, reset } = await svc();
  try {
    const owner = actor();
    const wo = await service.create(owner, { title: "OS do tenant A" });
    await assert.rejects(
      () => service.addComment(actor(), wo.id, { message: "invasor" }),
      (e: unknown) => (e as { statusCode?: number }).statusCode === 404,
    );
  } finally {
    reset();
  }
});

test("dois comentários preservam a ordem na timeline", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS" });
    await service.addComment(ctx, wo.id, { message: "primeiro" });
    await service.addComment(ctx, wo.id, { message: "segundo" });
    const comments = (await service.timeline(ctx, wo.id)).filter((e) => e.eventType === "work_order_comment");
    assert.deepEqual(comments.map((c) => c.message), ["primeiro", "segundo"]);
  } finally {
    reset();
  }
});

test("comentário preserva quebras de linha internas (só apara as bordas)", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS" });
    const event = await service.addComment(ctx, wo.id, { message: "  linha 1\nlinha 2  " });
    assert.equal(event.message, "linha 1\nlinha 2");
  } finally {
    reset();
  }
});

test("comentário com exatamente 4000 chars → 201 (limite inclusivo)", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const wo = await service.create(ctx, { title: "OS" });
    const event = await service.addComment(ctx, wo.id, { message: "y".repeat(4000) });
    assert.equal(event.message.length, 4000);
  } finally {
    reset();
  }
});

test("comentário não infla a timeline de OUTRA OS (evento por OS própria)", async () => {
  const { service, reset } = await svc();
  try {
    const ctx = actor();
    const woA = await service.create(ctx, { title: "OS A" });
    const woB = await service.create(ctx, { title: "OS B" });
    await service.addComment(ctx, woA.id, { message: "só na A" });
    const tlB = await service.timeline(ctx, woB.id);
    assert.equal(tlB.filter((e) => e.eventType === "work_order_comment").length, 0);
    // a timeline de B mantém só o evento de criação
    assert.equal(tlB.length, 1);
    assert.equal(tlB[0]!.eventType, "work_order_created");
  } finally {
    reset();
  }
});
