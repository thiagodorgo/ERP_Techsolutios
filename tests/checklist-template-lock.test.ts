import assert from "node:assert/strict";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

import {
  parseExpectedUpdatedAtDto,
  parseExpectedUpdatedAtQuery,
  parseUpdateChecklistTemplateDto,
} from "../src/modules/checklists/checklist.validator.js";
import { InMemoryChecklistRepository } from "../src/modules/checklists/checklist.repository.js";
import { ChecklistService } from "../src/modules/checklists/checklist.service.js";
import { ChecklistError } from "../src/modules/checklists/checklist.types.js";

const actor = { tenantId: "10000000-0000-4000-8000-000000000001", userId: "10000000-0000-4000-8000-000000000002" };

test("CE-1/2b/10a/11a: token e componentKey são obrigatórios na borda", () => {
  assert.throws(() => parseUpdateChecklistTemplateDto({ name: "X" }));
  assert.throws(() => parseUpdateChecklistTemplateDto({ expectedUpdatedAt: "não-é-data", name: "X" }));
  assert.throws(() => parseUpdateChecklistTemplateDto({ expectedUpdatedAt: new Date().toISOString(), components: [{ type: "observation", label: "X" }] }));
  assert.throws(() => parseExpectedUpdatedAtDto({}));
  assert.throws(() => parseExpectedUpdatedAtQuery({}));
});

test("CE-3/7/8/9/14: memória trava versão, estrutura em uso e expõe activeRuns", async () => {
  const repository = new InMemoryChecklistRepository();
  const service = new ChecklistService(repository);
  const created = await service.createTemplate(actor, {
    name: "Vistoria", type: "custom", schema: {},
    components: [{ componentKey: "obs", type: "observation", label: "Obs", required: true, config: {}, validationRules: {}, visibilityRules: {} }],
  });
  const published = await service.publishTemplate(actor, created.id, created.updatedAt);
  assert.equal(published.activeRuns, 0);
  const run = await service.createRun(actor, { checklistId: created.id, answers: [] });
  const detail = await service.getTemplateDetail(actor, created.id);
  assert.equal(detail.activeRuns, 1);

  await assert.rejects(
    service.updateTemplate(actor, created.id, { expectedUpdatedAt: published.updatedAt, components: [] } as never),
    (error: unknown) => error instanceof ChecklistError && error.reason === "template_has_active_runs",
  );
  const textSaved = await service.updateTemplate(actor, created.id, { expectedUpdatedAt: published.updatedAt, name: "Texto novo" });
  assert.equal(textSaved.activeRuns, 1);
  await assert.rejects(
    service.updateTemplate(actor, created.id, { expectedUpdatedAt: published.updatedAt, name: "stale" }),
    (error: unknown) => error instanceof ChecklistError && error.reason === "template_changed_since_read",
  );
  await assert.rejects(
    service.updateTemplate(actor, created.id, { expectedUpdatedAt: textSaved.updatedAt, status: "draft" }),
    (error: unknown) => error instanceof ChecklistError && error.reason === "template_has_active_runs",
  );
  await assert.rejects(
    service.updateTemplate(actor, created.id, { expectedUpdatedAt: textSaved.updatedAt, status: "published" }),
    (error: unknown) => error instanceof ChecklistError && error.reason === "status_requires_publish_endpoint",
  );
  await assert.rejects(
    service.updateTemplate(actor, created.id, { expectedUpdatedAt: textSaved.updatedAt, status: "archived" }),
    (error: unknown) => error instanceof ChecklistError && error.reason === "status_requires_delete_endpoint",
  );
  assert.equal(run.status, "in_progress");
});

test("CE-10/11: publish e archive recusam token defasado", async () => {
  const repository = new InMemoryChecklistRepository();
  const service = new ChecklistService(repository);
  const created = await service.createTemplate(actor, {
    name: "Vistoria", type: "custom", schema: {},
    components: [{ componentKey: "obs", type: "observation", label: "Obs", required: true, config: {}, validationRules: {}, visibilityRules: {} }],
  });
  const saved = await service.updateTemplate(actor, created.id, { expectedUpdatedAt: created.updatedAt, name: "Nova" });
  await assert.rejects(service.publishTemplate(actor, created.id, created.updatedAt), (error: unknown) => error instanceof ChecklistError && error.reason === "template_changed_since_read");
  await assert.rejects(service.archiveTemplate(actor, created.id, created.updatedAt), (error: unknown) => error instanceof ChecklistError && error.reason === "template_changed_since_read");
  const published = await service.publishTemplate(actor, created.id, saved.updatedAt);
  assert.equal(published.status, "published");
});

test("CE-10c: modelo arquivado continua servindo a vistoria viva", async () => {
  const repository = new InMemoryChecklistRepository();
  const service = new ChecklistService(repository);
  const created = await service.createTemplate(actor, {
    name: "Vistoria", type: "custom", schema: {},
    components: [
      { componentKey: "obs", type: "observation", label: "Obs", required: true, config: {}, validationRules: {}, visibilityRules: {} },
      { componentKey: "foto", type: "photo_upload", label: "Foto", required: true, config: {}, validationRules: {}, visibilityRules: {} },
    ],
  });
  const published = await service.publishTemplate(actor, created.id, created.updatedAt);
  const run = await service.createRun(actor, { checklistId: created.id, answers: [] });
  const photo = published.components.find((component) => component.componentKey === "foto")!;

  await service.archiveTemplate(actor, created.id, published.updatedAt);
  assert.equal((await service.renderChecklist(actor, created.id)).id, created.id);
  assert.equal((await service.createAttachment(actor, run.id, {
    componentId: photo.id,
    fileUrl: "https://storage.example/checklists/arquivada.jpg",
    metadata: {},
  })).componentId, photo.id);
});

// ---------------------------------------------------------------------------------------------------------
// §8.1 do plano v2 pela porta HTTP (REST em memória, molde `tests/checklist-routes.test.ts`). Retomada
// `dev-san322-opus`: os blocos acima provam a regra no serviço; os de baixo provam o contrato na rota.
// ---------------------------------------------------------------------------------------------------------

test("CE-1/2a/2b/3/14 (REST): token obrigatório, componentKey obrigatório, 409 stale e activeRuns só no modelo único", async () => {
  await withLockApi(async ({ baseUrl, seed }) => {
    const h = authHeaders(seed.tenantA, seed.adminA);
    const created = await createDraftTemplate(baseUrl, h);
    const url = `/api/v1/tenant/checklists/${created.id}`;

    const detail = await requestJson(baseUrl, url, { headers: h });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.activeRuns, 0);
    const list = await requestJson(baseUrl, "/api/v1/tenant/checklists", { headers: h });
    assert.equal(list.status, 200);
    for (const item of list.body.data) assert.equal("activeRuns" in item, false, "a lista não traz activeRuns");

    // CE-1 — sem token e token não-ISO → 400, e nada muda.
    const semToken = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { /* sem-token-proposital */ name: "X" } });
    assert.equal(semToken.status, 400);
    const naoIso = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { expectedUpdatedAt: "ontem", name: "X" } });
    assert.equal(naoIso.status, 400);
    // CE-2b — componente sem componentKey → 400.
    const semChave = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: { expectedUpdatedAt: detail.body.data.updatedAt, components: [{ /* sem-chave-proposital */ type: "observation", label: "Obs" }] },
    });
    assert.equal(semChave.status, 400);
    assert.equal((await requestJson(baseUrl, url, { headers: h })).body.data.updatedAt, detail.body.data.updatedAt);

    // CE-2a/CE-3 — duas edições da mesma leitura: a 1ª grava (200, token novo), a 2ª é 409 stale.
    const first = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: {
        expectedUpdatedAt: detail.body.data.updatedAt,
        name: "Primeira",
        components: [
          { componentKey: "obs", type: "observation", label: "Obs da primeira", required: false },
          { componentKey: "fotos", type: "photo_upload", label: "Fotos", required: false },
        ],
      },
    });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.notEqual(first.body.data.updatedAt, detail.body.data.updatedAt);
    assert.equal(first.body.data.activeRuns, 0);
    const second = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: {
        expectedUpdatedAt: detail.body.data.updatedAt,
        name: "Segunda",
        components: [{ componentKey: "obs", type: "observation", label: "Obs da segunda", required: false }],
      },
    });
    assert.equal(second.status, 409);
    assert.equal(second.body.error.reason, "template_changed_since_read");
    const after = await requestJson(baseUrl, url, { headers: h });
    assert.equal(after.body.data.name, "Primeira");
    assert.deepEqual(after.body.data.components.map((c: { label: string }) => c.label), ["Obs da primeira", "Fotos"]);

    // CE-14 — activeRuns em publish e GET: 0 → 1 depois de abrir a vistoria → 0 depois de concluir.
    const published = await requestJson(baseUrl, `${url}/publish`, { method: "POST", headers: h, body: { expectedUpdatedAt: after.body.data.updatedAt } });
    assert.equal(published.status, 200);
    assert.equal(published.body.data.activeRuns, 0);
    const run = await createRun(baseUrl, h, created.id);
    assert.equal((await requestJson(baseUrl, url, { headers: h })).body.data.activeRuns, 1);
    const done = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, { method: "POST", headers: h, body: { hasDivergence: false } });
    assert.equal(done.status, 200);
    assert.equal((await requestJson(baseUrl, url, { headers: h })).body.data.activeRuns, 0);
  });
});

test("CE-7a/7b/7c/7d/8a/8b (REST): com vistoria viva só textos mudam; sem viva, campo em publicado vira versão nova", async () => {
  await withLockApi(async ({ baseUrl, seed }) => {
    const h = authHeaders(seed.tenantA, seed.adminA);
    const tpl = await createPublishedTemplate(baseUrl, h);
    const url = `/api/v1/tenant/checklists/${tpl.id}`;
    const run = await createRun(baseUrl, h, tpl.id);
    let current = (await requestJson(baseUrl, url, { headers: h })).body.data;
    const version = current.version as number;

    // CE-7a — remover campo com viva → 409 in-use com N; o campo continua.
    const remove = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: { expectedUpdatedAt: current.updatedAt, components: [componentPayload(current, "obs")] },
    });
    assert.equal(remove.status, 409);
    assert.equal(remove.body.error.reason, "template_has_active_runs");
    assert.match(remove.body.error.message, /\b1\b/);
    current = (await requestJson(baseUrl, url, { headers: h })).body.data;
    assert.deepEqual(current.components.map((c: { componentKey: string }) => c.componentKey), ["obs", "fotos"]);

    // CE-7b/8b — só textos (nome, rótulo, ajuda, nome de seção) com viva → 200 e versão igual.
    const text = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: {
        expectedUpdatedAt: current.updatedAt,
        name: "Nome novo",
        schema: { ...current.schema, sections: [{ name: "Seção renomeada" }] },
        components: [
          componentPayload(current, "obs", { label: "Observação renomeada", config: { ...configOf(current, "obs"), help: "Ajuda nova" } }),
          componentPayload(current, "fotos"),
        ],
      },
    });
    assert.equal(text.status, 200, JSON.stringify(text.body));
    assert.equal(text.body.data.version, version);
    assert.equal(text.body.data.activeRuns, 1);
    current = text.body.data;

    // CE-7c — `pending_acknowledgement` conta como viva.
    const pending = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers: h,
      body: { hasDivergence: true, observation: "Avaria na chegada." },
    });
    assert.equal(pending.body.data.run.status, "pending_acknowledgement");
    const whilePending = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: { expectedUpdatedAt: current.updatedAt, components: [componentPayload(current, "obs", { required: true }), componentPayload(current, "fotos")] },
    });
    assert.equal(whilePending.status, 409);
    assert.equal(whilePending.body.error.reason, "template_has_active_runs");

    // CE-7d/8a — concluída não conta; campo em publicado sem viva → 200 e versão + 1.
    const ack = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/acknowledgement`, { method: "POST", headers: h, body: { message: "Ciente." } });
    assert.equal(ack.status, 201);
    current = (await requestJson(baseUrl, url, { headers: h })).body.data;
    assert.equal(current.activeRuns, 0);
    const field = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: { expectedUpdatedAt: current.updatedAt, components: [componentPayload(current, "obs", { required: true }), componentPayload(current, "fotos")] },
    });
    assert.equal(field.status, 200, JSON.stringify(field.body));
    assert.equal(field.body.data.version, version + 1);

    // CE-8b — rascunho + mudança de campo → versão igual.
    const draft = await createDraftTemplate(baseUrl, h);
    const draftDetail = (await requestJson(baseUrl, `/api/v1/tenant/checklists/${draft.id}`, { headers: h })).body.data;
    const draftField = await requestJson(baseUrl, `/api/v1/tenant/checklists/${draft.id}`, {
      method: "PATCH",
      headers: h,
      body: { expectedUpdatedAt: draftDetail.updatedAt, components: [componentPayload(draftDetail, "obs", { required: true })] },
    });
    assert.equal(draftField.status, 200);
    assert.equal(draftField.body.data.version, draftDetail.version);
  });
});

test("CE-9a/9b/9c/9d/9e (REST): status com vistoria viva só vai para inativo; publicar e arquivar têm porta própria", async () => {
  await withLockApi(async ({ baseUrl, seed }) => {
    const h = authHeaders(seed.tenantA, seed.adminA);
    const tpl = await createPublishedTemplate(baseUrl, h);
    const url = `/api/v1/tenant/checklists/${tpl.id}`;
    await createRun(baseUrl, h, tpl.id);
    let current = (await requestJson(baseUrl, url, { headers: h })).body.data;

    const toDraft = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { expectedUpdatedAt: current.updatedAt, status: "draft" } });
    assert.equal(toDraft.status, 409);
    assert.equal(toDraft.body.error.reason, "template_has_active_runs");
    assert.equal((await requestJson(baseUrl, `/api/v1/mobile/checklists/${tpl.id}/render`, { headers: h })).status, 200);

    const toPublished = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { expectedUpdatedAt: current.updatedAt, status: "published" } });
    assert.equal(toPublished.status, 409);
    assert.equal(toPublished.body.error.reason, "status_requires_publish_endpoint");
    const toArchived = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { expectedUpdatedAt: current.updatedAt, status: "archived" } });
    assert.equal(toArchived.status, 409);
    assert.equal(toArchived.body.error.reason, "status_requires_delete_endpoint");

    // CE-9a — inativar com viva passa e o render da viva continua.
    const toInactive = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { expectedUpdatedAt: current.updatedAt, status: "inactive" } });
    assert.equal(toInactive.status, 200, JSON.stringify(toInactive.body));
    assert.equal((await requestJson(baseUrl, `/api/v1/mobile/checklists/${tpl.id}/render`, { headers: h })).status, 200);
    current = toInactive.body.data;

    // CE-9c — a porta de publicar continua dando versão + 1.
    const republish = await requestJson(baseUrl, `${url}/publish`, { method: "POST", headers: h, body: { expectedUpdatedAt: current.updatedAt } });
    assert.equal(republish.status, 200);
    assert.equal(republish.body.data.version, current.version + 1);

    // CE-9e — sem viva, rascunho ↔ inativo livres.
    const free = await createDraftTemplate(baseUrl, h);
    let freeCurrent = (await requestJson(baseUrl, `/api/v1/tenant/checklists/${free.id}`, { headers: h })).body.data;
    for (const status of ["inactive", "draft"]) {
      const moved = await requestJson(baseUrl, `/api/v1/tenant/checklists/${free.id}`, {
        method: "PATCH",
        headers: h,
        body: { expectedUpdatedAt: freeCurrent.updatedAt, status },
      });
      assert.equal(moved.status, 200, `${status}: ${JSON.stringify(moved.body)}`);
      assert.equal(moved.body.data.status, status);
      freeCurrent = moved.body.data;
    }
  });
});

test("CE-10a/10b/10c (REST): arquivar exige token, recusa defasado e o arquivado segue servindo a vistoria viva", async () => {
  await withLockApi(async ({ baseUrl, seed }) => {
    const h = authHeaders(seed.tenantA, seed.adminA);
    const tpl = await createPublishedTemplate(baseUrl, h);
    const url = `/api/v1/tenant/checklists/${tpl.id}`;
    const live = await createRun(baseUrl, h, tpl.id);
    const closed = await createRun(baseUrl, h, tpl.id);
    assert.equal((await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${closed.id}/complete`, { method: "POST", headers: h, body: { hasDivergence: false } })).status, 200);
    const current = (await requestJson(baseUrl, url, { headers: h })).body.data;

    const semToken = await requestJson(baseUrl, url, { method: "DELETE", headers: h /* sem-token-proposital */ });
    assert.equal(semToken.status, 400);
    const stale = await requestJson(baseUrl, `${url}?expectedUpdatedAt=${encodeURIComponent(new Date(Date.parse(current.updatedAt) - 1).toISOString())}`, { method: "DELETE", headers: h });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.reason, "template_changed_since_read");
    assert.equal((await requestJson(baseUrl, url, { headers: h })).body.data.status, "published");

    const archived = await requestJson(baseUrl, `${url}?expectedUpdatedAt=${encodeURIComponent(current.updatedAt)}`, { method: "DELETE", headers: h });
    assert.equal(archived.status, 204);

    // A vistoria viva continua: render 200, foto 201, resposta 200.
    const render = await requestJson(baseUrl, `/api/v1/mobile/checklists/${tpl.id}/render`, { headers: h });
    assert.equal(render.status, 200);
    const photo = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${live.id}/attachments`, {
      method: "POST",
      headers: h,
      body: { componentId: idOf(current, "fotos"), fileUrl: "https://storage.example/checklists/arquivado.jpg", fileName: "arquivado.jpg", mimeType: "image/jpeg" },
    });
    assert.equal(photo.status, 201, JSON.stringify(photo.body));
    const answer = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${live.id}`, {
      method: "PATCH",
      headers: h,
      body: { answers: [{ componentId: idOf(current, "obs"), value: "Continua respondendo." }] },
    });
    assert.equal(answer.status, 200, JSON.stringify(answer.body));

    // Inalterados: não aparece em `available`, não abre vistoria nova, não reabre a concluída.
    const available = await requestJson(baseUrl, "/api/v1/mobile/checklists/available", { headers: h });
    assert.equal(JSON.stringify(available.body).includes(tpl.id), false);
    const fresh = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", { method: "POST", headers: h, body: { checklistId: tpl.id } });
    // Inalterado e medido: o serviço resolve o modelo por `getTemplate`, que não enxerga arquivado → 404.
    assert.equal(fresh.status, 404, `createRun de arquivado: ${fresh.status}`);
    const reopen = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${closed.id}/reopen`, { method: "POST", headers: h, body: { reason: "Reabrir arquivado." } });
    assert.equal(reopen.status, 409);
  });
});

test("CE-11a/11b (REST): publicar com o token da própria gravação depois que outra pessoa gravou → 409; relido → 200", async () => {
  await withLockApi(async ({ baseUrl, seed }) => {
    const h = authHeaders(seed.tenantA, seed.adminA);
    const draft = await createDraftTemplate(baseUrl, h);
    const url = `/api/v1/tenant/checklists/${draft.id}`;
    const readA = (await requestJson(baseUrl, url, { headers: h })).body.data;
    const savedA = await requestJson(baseUrl, url, { method: "PATCH", headers: h, body: { expectedUpdatedAt: readA.updatedAt, name: "Salvo por A" } });
    assert.equal(savedA.status, 200);
    const readB = (await requestJson(baseUrl, url, { headers: h })).body.data;
    const savedB = await requestJson(baseUrl, url, {
      method: "PATCH",
      headers: h,
      body: { expectedUpdatedAt: readB.updatedAt, components: [componentPayload(readB, "obs", { required: true })] },
    });
    assert.equal(savedB.status, 200);
    const publishA = await requestJson(baseUrl, `${url}/publish`, { method: "POST", headers: h, body: { expectedUpdatedAt: savedA.body.data.updatedAt } });
    assert.equal(publishA.status, 409);
    assert.equal(publishA.body.error.reason, "template_changed_since_read");
    assert.equal((await requestJson(baseUrl, url, { headers: h })).body.data.status, "draft");
    const reread = (await requestJson(baseUrl, url, { headers: h })).body.data;
    const publishAgain = await requestJson(baseUrl, `${url}/publish`, { method: "POST", headers: h, body: { expectedUpdatedAt: reread.updatedAt } });
    assert.equal(publishAgain.status, 200);
    assert.equal(publishAgain.body.data.version, reread.version + 1);
    const semToken = await requestJson(baseUrl, `${url}/publish`, { method: "POST", headers: h, body: { /* sem-token-proposital */ } });
    assert.equal(semToken.status, 400);
  });
});

test("CE-12 (REST): as três portas devolvem 404 para o modelo de outra organização, mesmo com o token certo", async () => {
  await withLockApi(async ({ baseUrl, seed }) => {
    const hA = authHeaders(seed.tenantA, seed.adminA);
    const hB = authHeaders(seed.tenantB, seed.adminB);
    const tplA = await createDraftTemplate(baseUrl, hA);
    const url = `/api/v1/tenant/checklists/${tplA.id}`;
    const token = (await requestJson(baseUrl, url, { headers: hA })).body.data.updatedAt as string;
    const patch = await requestJson(baseUrl, url, { method: "PATCH", headers: hB, body: { expectedUpdatedAt: token, name: "intruso" } });
    const publish = await requestJson(baseUrl, `${url}/publish`, { method: "POST", headers: hB, body: { expectedUpdatedAt: token } });
    const remove = await requestJson(baseUrl, `${url}?expectedUpdatedAt=${encodeURIComponent(token)}`, { method: "DELETE", headers: hB });
    for (const response of [patch, publish, remove]) {
      assert.equal(response.status, 404);
      assert.equal(response.body.error.reason, "checklist_not_found");
    }
    const intact = (await requestJson(baseUrl, url, { headers: hA })).body.data;
    assert.equal(intact.name, "Rascunho de trava");
    assert.equal(intact.updatedAt, token);
  });
});

test("CE-8c: a auditoria sai do `previous` lido sob a trava e o serviço não lê o modelo antes de gravar", async () => {
  const repository = new CountingRepository();
  const service = new ChecklistService(repository);
  const created = await service.createTemplate(actor, {
    name: "Auditoria", type: "custom", schema: {},
    components: [{ componentKey: "obs", type: "observation", label: "Obs", required: false, config: {}, validationRules: {}, visibilityRules: {} }],
  });
  const published = await service.publishTemplate(actor, created.id, created.updatedAt);
  repository.getTemplateCalls = 0;
  const saved = await service.updateTemplate(actor, created.id, {
    expectedUpdatedAt: published.updatedAt,
    type: "technical_evidence",
    components: [{ componentKey: "obs", type: "observation", label: "Obs", required: true, config: {}, validationRules: {}, visibilityRules: {} }],
  });
  assert.equal(repository.getTemplateCalls, 1, "uma leitura só, a do repositório sob a trava");
  assert.equal(saved.version, published.version + 1);
  const event = repository.auditEvents.find((item) => item.action === "checklist_template.updated");
  assert.ok(event, "auditoria checklist_template.updated");
  assert.equal(event.metadata.versionFrom, published.version);
  assert.equal(event.metadata.versionTo, published.version + 1);
  assert.equal(event.metadata.typeFrom, "custom");
  assert.equal(event.metadata.typeTo, "technical_evidence");
});

test("CE-11c: em src/, só controller, serviço e repositórios de checklist chamam publishTemplate/archiveTemplate", () => {
  const allowed = new Set([
    "src/modules/checklists/checklist.controller.ts",
    "src/modules/checklists/checklist.service.ts",
    "src/modules/checklists/checklist.repository.ts",
    "src/modules/checklists/checklist-prisma.repository.ts",
  ]);
  const offenders: string[] = [];
  for (const file of listFiles("src", (name) => name.endsWith(".ts"))) {
    const source = fs.readFileSync(file, "utf8");
    if (/\.(publishTemplate|archiveTemplate)\(/.test(source) && !allowed.has(file)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test("CE-13: em tests/, todo PATCH/publish/DELETE de modelo e todo updateTemplate direto levam o token", () => {
  const missing = checklistTokenCallSiteViolations("tests");
  assert.deepEqual(missing, [], `sítios sem expectedUpdatedAt/componentKey:\n${missing.join("\n")}`);
});

// --- arnês ------------------------------------------------------------------------------------------------

type LockSeed = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
};

type TemplateBody = {
  readonly components: readonly {
    readonly id: string;
    readonly componentKey: string;
    readonly type: string;
    readonly label: string;
    readonly required: boolean;
    readonly orderIndex: number;
    readonly config: Record<string, unknown>;
    readonly validationRules: Record<string, unknown>;
    readonly visibilityRules: Record<string, unknown>;
  }[];
};

class CountingRepository extends InMemoryChecklistRepository {
  getTemplateCalls = 0;
  readonly auditEvents: { action: string; metadata: Record<string, unknown> }[] = [];

  override async getTemplate(tenantId: string, checklistId: string) {
    this.getTemplateCalls += 1;
    return super.getTemplate(tenantId, checklistId);
  }

  override async createAuditEvent(event: Parameters<InMemoryChecklistRepository["createAuditEvent"]>[0]) {
    this.auditEvents.push({ action: event.action, metadata: event.metadata as Record<string, unknown> });
    return super.createAuditEvent(event);
  }
}

function componentPayload(template: TemplateBody, key: string, patch: Record<string, unknown> = {}) {
  const component = template.components.find((item) => item.componentKey === key);
  assert.ok(component, `componente ${key}`);
  return {
    componentKey: component.componentKey,
    type: component.type,
    label: component.label,
    required: component.required,
    orderIndex: component.orderIndex,
    config: component.config,
    validationRules: component.validationRules,
    visibilityRules: component.visibilityRules,
    ...patch,
  };
}

function configOf(template: TemplateBody, key: string): Record<string, unknown> {
  return template.components.find((item) => item.componentKey === key)!.config;
}

function idOf(template: TemplateBody, key: string): string {
  return template.components.find((item) => item.componentKey === key)!.id;
}

async function createDraftTemplate(baseUrl: string, h: Record<string, string>): Promise<{ id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: h,
    body: {
      name: "Rascunho de trava",
      type: "towing_collection",
      schema: { sections: [{ name: "Veículo" }] },
      components: [
        { componentKey: "obs", type: "observation", label: "Obs", required: false },
        { componentKey: "fotos", type: "photo_upload", label: "Fotos", required: false },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return { id: created.body.data.id as string };
}

async function createPublishedTemplate(baseUrl: string, h: Record<string, string>): Promise<{ id: string }> {
  const draft = await createDraftTemplate(baseUrl, h);
  const read = (await requestJson(baseUrl, `/api/v1/tenant/checklists/${draft.id}`, { headers: h })).body.data;
  const published = await requestJson(baseUrl, `/api/v1/tenant/checklists/${draft.id}/publish`, { method: "POST", headers: h, body: { expectedUpdatedAt: read.updatedAt } });
  assert.equal(published.status, 200, JSON.stringify(published.body));
  return draft;
}

async function createRun(baseUrl: string, h: Record<string, string>, checklistId: string): Promise<{ id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", { method: "POST", headers: h, body: { checklistId } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return { id: created.body.data.id as string };
}

async function withLockApi(callback: (context: { baseUrl: string; seed: LockSeed }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    { resetChecklistRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetChecklistRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Trava A" });
  const tenantB = core.createTenant({ name: "Trava B" });
  const adminA = core.createUser({ tenantId: tenantA.id, name: "Admin A", email: "trava-a@example.com", roles: ["tenant_admin"] });
  const adminB = core.createUser({ tenantId: tenantB.id, name: "Admin B", email: "trava-b@example.com", roles: ["tenant_admin"] });
  const server = createApp(new MemoryCoreSaasAdapter(core)).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await callback({ baseUrl, seed: { tenantA, tenantB, adminA, adminB } });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetChecklistRuntimeForTests();
  }
}

function authHeaders(tenant: Tenant, user: User): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": "tenant_admin" };
}

async function requestJson(
  baseUrl: string,
  urlPath: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function listFiles(dir: string, accept: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, accept));
    else if (accept(entry.name)) out.push(full);
  }
  return out;
}

// Leitura de arquivo (CE-13): cada chamada HTTP a `/api/v1/tenant/checklists/${…}` com PATCH, `/publish` ou
// DELETE, e cada `.updateTemplate(` direto, é recortada até o fim da chamada; o recorte tem de citar
// `expectedUpdatedAt` (e `componentKey` quando traz `components: [`). Negativo de propósito leva o marcador
// `sem-token-proposital` ou `sem-chave-proposital` dentro do recorte.
function checklistTokenCallSiteViolations(root: string): string[] {
  const violations: string[] = [];
  for (const file of listFiles(root, (name) => name.endsWith(".ts"))) {
    const source = fs.readFileSync(file, "utf8");
    const lineOf = (index: number) => source.slice(0, index).split("\n").length;
    const windowFrom = (index: number) => {
      const rest = source.slice(index, index + 1200);
      const end = rest.search(/\}\s*\)/);
      return end === -1 ? rest : rest.slice(0, end + 2);
    };
    const urlPattern = /\/api\/v1\/tenant\/checklists\/\$\{[^}]+\}/g;
    for (let match = urlPattern.exec(source); match; match = urlPattern.exec(source)) {
      const after = source.slice(match.index + match[0].length);
      const isPublish = after.startsWith("/publish`");
      if (!isPublish && !after.startsWith("`") && !after.startsWith("?")) continue;
      const window = windowFrom(match.index);
      const method = isPublish
        ? "POST /publish"
        : /method:\s*"PATCH"/.test(window)
          ? "PATCH"
          : /method:\s*"DELETE"/.test(window)
            ? "DELETE"
            : null;
      if (!method) continue;
      const negative = /sem-token-proposital|sem-chave-proposital/.test(window);
      if (!negative && !window.includes("expectedUpdatedAt")) violations.push(`${file}:${lineOf(match.index)} ${method} sem expectedUpdatedAt`);
      if (
        method === "PATCH" &&
        !negative &&
        /components:\s*\[/.test(window) &&
        !window.includes("componentKey") &&
        !window.includes("componentPayload(")
      ) {
        violations.push(`${file}:${lineOf(match.index)} PATCH com components sem componentKey`);
      }
    }
    // URL montada por concatenação (`"/api/v1/tenant/checklists/" + id + "/publish"`, a forma de
    // `tests/helpers/o6r07c-census.ts`, que o inventário M-27 do plano não contou): publish, ou PATCH/DELETE
    // quando o método vem como argumento posicional antes da URL.
    const concatPattern = /(?:(["'])(PATCH|DELETE)\1\s*,\s*)?["']\/api\/v1\/tenant\/checklists\/["']\s*\+\s*[^,]+/g;
    for (let match = concatPattern.exec(source); match; match = concatPattern.exec(source)) {
      const isPublish = /\+\s*["']\/publish["']\s*$/.test(match[0]);
      const method = isPublish ? "POST /publish" : match[2] ?? null;
      if (!method) continue;
      const window = windowFrom(match.index);
      if (!/sem-token-proposital/.test(window) && !window.includes("expectedUpdatedAt")) {
        violations.push(`${file}:${lineOf(match.index)} ${method} sem expectedUpdatedAt (URL concatenada)`);
      }
    }
    const directPattern = /(?<!super)\.updateTemplate\(/g;
    for (let match = directPattern.exec(source); match; match = directPattern.exec(source)) {
      const window = windowFrom(match.index);
      if (!/sem-token-proposital/.test(window) && !window.includes("expectedUpdatedAt")) {
        violations.push(`${file}:${lineOf(match.index)} updateTemplate direto sem expectedUpdatedAt`);
      }
    }
  }
  return violations;
}
