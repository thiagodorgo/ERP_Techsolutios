import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("checklist routes cover tenant templates, runs, divergence and acknowledgement", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const components = await requestJson(baseUrl, "/api/v1/tenant/checklist-components", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(components.status, 200);
    assert.deepEqual(
      components.body.data.map((component: { type: string }) => component.type),
      [
        "vehicle_selector",
        "damage_map",
        "photo_upload",
        "observation",
        "comparison",
        "acknowledgement",
        "before_after",
        "single_choice",
        "multi_choice",
        "signature",
      ],
    );

    const createDraft = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        tenant_id: seed.tenantB.id,
        name: "Coleta guincho",
        description: "Checklist M10",
        type: "towing_collection",
        schema: {
          vehicleImage: "dynamic_by_type",
        },
        components: [
          {
            componentKey: "vehicle",
            type: "vehicle_selector",
            label: "Veiculo",
            required: true,
          },
          {
            componentKey: "photos",
            type: "photo_upload",
            label: "Fotos",
            required: true,
            config: {
              minPhotos: 1,
            },
          },
          {
            componentKey: "damage",
            type: "damage_map",
            label: "Avarias",
            required: false,
          },
          {
            componentKey: "observation",
            type: "observation",
            label: "Observacao",
            required: false,
          },
          {
            componentKey: "ack",
            type: "acknowledgement",
            label: "Ciencia",
            required: true,
          },
        ],
      },
    });

    assert.equal(createDraft.status, 201);
    assert.equal(createDraft.body.data.tenantId, seed.tenantA.id);
    assert.equal(createDraft.body.data.status, "draft");

    const checklistId = createDraft.body.data.id as string;
    const photoComponentId = findComponentId(createDraft.body.data, "photo_upload");

    const unpublishedRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        checklistId,
      },
    });
    assert.equal(unpublishedRun.status, 409);
    assert.equal(unpublishedRun.body.error.reason, "checklist_not_published");

    const tenantBAccess = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}`, {
      headers: authHeaders(seed.tenantB, seed.adminB),
    });
    assert.equal(tenantBAccess.status, 404);

    const listA = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(listA.status, 200);
    assert.equal(listA.body.data.length, 1);

    const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}/publish`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(publish.status, 200);
    assert.equal(publish.body.data.status, "published");

    const render = await requestJson(baseUrl, `/api/v1/mobile/checklists/${checklistId}/render`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(render.status, 200);
    assert.equal(render.body.data.type, "towing_collection");
    assert.equal(render.body.data.components.length, 5);

    const createRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        checklistId,
        relatedEntityType: "work_order",
        relatedEntityId: "os_123",
        answers: [
          {
            componentId: render.body.data.components[0].id,
            value: {
              vehicleType: "car",
            },
          },
        ],
      },
    });
    assert.equal(createRun.status, 201);
    assert.equal(createRun.body.data.status, "in_progress");

    const runId = createRun.body.data.id as string;

    const attachment = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: photoComponentId,
        fileUrl: "https://storage.example/checklists/photo-1.jpg",
        fileName: "photo-1.jpg",
        mimeType: "image/jpeg",
      },
    });
    assert.equal(attachment.status, 201);

    const marker = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/markers`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: findComponentId(createDraft.body.data, "damage_map"),
        x: 0.32,
        y: 0.48,
        markerType: "scratch",
        description: "Risco lateral",
      },
    });
    assert.equal(marker.status, 201);

    const divergenceWithoutObservation = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/divergence`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: photoComponentId,
        fileUrl: "https://storage.example/checklists/divergence.jpg",
      },
    });
    assert.equal(divergenceWithoutObservation.status, 400);

    const divergence = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/divergence`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: photoComponentId,
        fileUrl: "https://storage.example/checklists/divergence.jpg",
        observation: "Divergencia encontrada na entrega.",
      },
    });
    assert.equal(divergence.status, 200);
    assert.equal(divergence.body.data.run.status, "pending_acknowledgement");

    const comparison = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/comparison`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(comparison.status, 200);
    assert.equal(comparison.body.data.comparison.divergence, true);

    const acknowledgement = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/acknowledgement`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        message: "Estou ciente da responsabilidade pela divergencia.",
      },
    });
    assert.equal(acknowledgement.status, 201);
    assert.equal(acknowledgement.body.data.run.run.status, "completed_with_divergence");
  });
});

test("checklist run can be completed without divergence", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const checklist = await createAndPublishChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        checklistId: checklist.id,
      },
    });

    const complete = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.body.data.id}/complete`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        hasDivergence: false,
      },
    });

    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.run.status, "completed");
  });
});

test("checklist routes enforce tenant context and permission boundaries", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const checklist = await createAndPublishChecklist(baseUrl, seed.tenantA, seed.adminA);

    const withoutTenant = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
    });
    const withoutChecklistPermission = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin", ["os.read"]),
    });
    const operatorAdminRead = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const supervisorCreate = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.supervisorA, "manager"),
      body: {
        name: "Checklist indevido",
        type: "custom",
      },
    });
    const supervisorPublish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklist.id}/publish`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.supervisorA, "manager"),
    });
    const operatorRender = await requestJson(baseUrl, `/api/v1/mobile/checklists/${checklist.id}/render`, {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const operatorRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        checklistId: checklist.id,
      },
    });
    const tenantBRender = await requestJson(baseUrl, `/api/v1/mobile/checklists/${checklist.id}/render`, {
      headers: authHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
    });
    const acknowledgementWithoutPermission = await requestJson(
      baseUrl,
      `/api/v1/mobile/checklist-runs/${operatorRun.body.data.id}/acknowledgement`,
      {
        method: "POST",
        headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
        body: {
          message: "Ciente.",
        },
      },
    );

    assert.equal(withoutTenant.status, 403);
    assert.equal(withoutTenant.body.error.reason, "tenant_required");
    assert.equal(withoutChecklistPermission.status, 403);
    assert.equal(withoutChecklistPermission.body.error.reason, "permission_required");
    assert.equal(operatorAdminRead.status, 403);
    assert.equal(operatorAdminRead.body.error.reason, "permission_required");
    assert.equal(supervisorCreate.status, 403);
    assert.equal(supervisorCreate.body.error.reason, "permission_required");
    assert.equal(supervisorPublish.status, 403);
    assert.equal(supervisorPublish.body.error.reason, "permission_required");
    assert.equal(operatorRender.status, 200);
    assert.equal(operatorRun.status, 201);
    assert.equal(tenantBRender.status, 404);
    assert.equal(acknowledgementWithoutPermission.status, 403);
    assert.equal(acknowledgementWithoutPermission.body.error.reason, "permission_required");
  });
});

test("checklist routes reject legacy headers in production", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const response = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
        headers: authHeaders(seed.tenantA, seed.adminA),
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.error.reason, "legacy_headers_disabled");
    } finally {
      restoreOptionalEnv("NODE_ENV", previousNodeEnv);
    }
  });
});

// CHECKLIST P1 PR-01 — os tipos single_choice/multi_choice/signature entram no catálogo e o validator passa a EXIGIR
// config.options (lista não-vazia) para escolha. Assinatura/opções-válidas são aceitas.
test("checklist P1: escolha exige config.options; assinatura e opções válidas passam", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const base = { headers: authHeaders(seed.tenantA, seed.adminA), method: "POST" as const };

    // single_choice SEM options → 400 (validação tipada)
    const semOpcoes = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      ...base,
      body: {
        name: "Escolha sem opcoes",
        type: "custom",
        schema: {},
        components: [{ componentKey: "sel", type: "single_choice", label: "Cor", required: true, config: {} }],
      },
    });
    assert.equal(semOpcoes.status, 400);

    // single_choice + multi_choice COM options e signature → 201
    const valido = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      ...base,
      body: {
        name: "Checklist P1",
        type: "custom",
        schema: {},
        components: [
          { componentKey: "cor", type: "single_choice", label: "Cor", required: true, config: { options: ["Preto", "Prata"] } },
          { componentKey: "itens", type: "multi_choice", label: "Itens", required: false, config: { options: ["Estepe", "Macaco"] } },
          { componentKey: "assin", type: "signature", label: "Assinatura do condutor", required: true, config: {} },
        ],
      },
    });
    assert.equal(valido.status, 201);
    assert.equal(valido.body.data.components.length, 3);
    assert.deepEqual(
      valido.body.data.components.map((c: { type: string }) => c.type),
      ["single_choice", "multi_choice", "signature"],
    );
  });
});

// CHECKLIST P1 PR-02c (P-CHK-PATCH-SEM-TYPE) — antes deste bloco o PATCH DESCARTAVA `type` em silencio
// (o `z.object` do parser nao o listava e nenhum dos dois repositorios gravava a coluna). O teste prova o
// round-trip pelo caminho REST completo: PATCH devolve o novo tipo E o GET seguinte confirma que persistiu
// (nao e so o eco da resposta). Tipo invalido segue 400; PATCH sem `type` nao mexe no tipo.
test("checklist P1 PR-02c: PATCH grava `type` (round-trip) e rejeita tipo invalido", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);

    const created = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      method: "POST",
      headers,
      body: {
        name: "Modelo que muda de tipo",
        type: "towing_collection",
        schema: { sections: ["Formulario"] },
        components: [{ componentKey: "fotos", type: "photo_upload", label: "Fotos", required: true, config: { minPhotos: 2 } }],
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.type, "towing_collection");
    const checklistId = created.body.data.id as string;

    // 1) PATCH com `type` novo → resposta ja traz o tipo trocado.
    const patched = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}`, {
      method: "PATCH",
      headers,
      body: {
        type: "technical_evidence",
        name: "Modelo que mudou de tipo",
        schema: { sections: ["Formulario"] },
        components: [{ componentKey: "fotos", type: "photo_upload", label: "Fotos", required: true, config: { minPhotos: 2 } }],
      },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.type, "technical_evidence");
    assert.equal(patched.body.data.name, "Modelo que mudou de tipo");

    // 2) GET independente → o tipo PERSISTIU (prova que nao foi so eco da resposta).
    const reloaded = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}`, { headers });
    assert.equal(reloaded.status, 200);
    assert.equal(reloaded.body.data.type, "technical_evidence");

    // 3) PATCH SEM `type` nao mexe no tipo (ausente = no-op, nao volta ao default).
    const semTipo = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}`, {
      method: "PATCH",
      headers,
      body: { name: "So o nome mudou" },
    });
    assert.equal(semTipo.status, 200);
    assert.equal(semTipo.body.data.type, "technical_evidence");

    // 4) Tipo fora do enum → 400 (o parser nao virou porta aberta).
    const invalido = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}`, {
      method: "PATCH",
      headers,
      body: { type: "nao_existe" },
    });
    assert.equal(invalido.status, 400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// CHECKLIST P1 PR-03 — ciclo de vida da execução (D-CHK-P1-RUN-LIFECYCLE): a vistoria trava ao concluir,
// reabrir cria uma NOVA versão auditada, e inativar um modelo NÃO derruba quem já está no campo.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────

test("checklist P1 PR-03: vistoria CONCLUÍDA fica imutável — toda mutação responde 409", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    // Preenche e conclui normalmente (o caminho legítimo continua 200).
    const draft = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Veiculo em ordem." }] },
    });
    assert.equal(draft.status, 200);

    const complete = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: false },
    });
    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.run.status, "completed");

    // A partir daqui, NENHUM caminho de escrita passa.
    const patchAfter = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Tentativa de reescrever a prova." }] },
    });
    const attachmentAfter = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/attachments`, {
      method: "POST",
      headers,
      body: {
        componentId: checklist.photoId,
        fileUrl: "https://storage.example/checklists/tardia.jpg",
        fileName: "tardia.jpg",
        mimeType: "image/jpeg",
      },
    });
    const markerAfter = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/markers`, {
      method: "POST",
      headers,
      body: { componentId: checklist.damageId, x: 0.1, y: 0.2, markerType: "scratch" },
    });
    const completeAfter = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: false },
    });
    const divergenceAfter = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/divergence`, {
      method: "POST",
      headers,
      body: {
        componentId: checklist.photoId,
        fileUrl: "https://storage.example/checklists/divergencia-tardia.jpg",
        observation: "Divergencia tardia.",
      },
    });
    const acknowledgementAfter = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/acknowledgement`, {
      method: "POST",
      headers,
      body: { message: "Ciente." },
    });

    for (const response of [patchAfter, attachmentAfter, markerAfter, completeAfter, divergenceAfter]) {
      assert.equal(response.status, 409);
      assert.equal(response.body.error.reason, "checklist_run_locked");
    }
    // A ciência tem recusa PRÓPRIA (não há divergência pendente nesta run) — mas também é 409, nunca 200.
    assert.equal(acknowledgementAfter.status, 409);

    // E a prova continua intacta: nada foi gravado por cima.
    const reloaded = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(reloaded.status, 200);
    assert.equal(reloaded.body.data.run.status, "completed");
    assert.equal(reloaded.body.data.answers.length, 1);
    assert.equal(reloaded.body.data.answers[0].value, "Veiculo em ordem.");
    assert.equal(reloaded.body.data.attachments.length, 0);
    assert.equal(reloaded.body.data.markers.length, 0);
  });
});

test("checklist P1 PR-03: PATCH não conclui a vistoria pela porta dos fundos", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    // Concluir carrega assinatura, `completedAt/completedBy`, auditoria e evento de domínio: o PATCH de
    // rascunho não pode cravar `completed` sem nada disso.
    const sneaky = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { status: "completed", answers: [] },
    });
    assert.equal(sneaky.status, 409);
    assert.equal(sneaky.body.error.reason, "run_completion_requires_complete");

    const still = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(still.body.data.run.status, "in_progress");
  });
});

// Junta PR-03 (ALTA do critico-adversarial): a guarda do PATCH era BLOCKLIST — barrava as duas conclusões
// e deixava DUAS portas abertas. Este teste prova as duas fechadas pela ALLOWLIST.
test("checklist P1 PR-03: PATCH não REBAIXA a vistoria nem apaga a divergência da prova", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    // Divergência registrada: a vistoria vai para "aguardando ciência" — este é o estado que protege a
    // organização (o cliente ainda precisa dar ciência do dano encontrado).
    const divergence = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/divergence`, {
      method: "POST",
      headers,
      body: {
        componentId: checklist.photoId,
        fileUrl: "https://storage.example/checklists/avaria.jpg",
        observation: "Para-choque amassado na chegada.",
      },
    });
    assert.equal(divergence.status, 200);
    assert.equal(divergence.body.data.run.status, "pending_acknowledgement");

    // PORTA 1 — rebaixar para "em andamento" apagaria a pendência de ciência: a divergência sumiria da
    // prova sem ninguém ter dado ciência dela. Recusado pela trava de CONTEÚDO, que é mais forte e
    // dispara antes da allowlist de estado (a vistoria já está assinada).
    const downgrade = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { status: "in_progress", answers: [] },
    });
    assert.equal(downgrade.status, 409);
    assert.equal(downgrade.body.error.reason, "checklist_run_locked");

    // A divergência continua de pé.
    const afterDowngrade = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(afterDowngrade.body.data.run.status, "pending_acknowledgement");

    // PORTA 2 — carimbar "aguardando ciência" numa vistoria comum criaria a pendência sem divergência
    // nenhuma por trás (o estado nasce da conclusão, não da edição do rascunho). Aqui a vistoria está
    // VIVA, então quem recusa é a allowlist de estado.
    const other = await createRun(baseUrl, headers, checklist.id);

    const rebaixarViva = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${other.id}`, {
      method: "PATCH",
      headers,
      body: { status: "in_progress", answers: [] },
    });
    assert.equal(rebaixarViva.status, 409);
    assert.equal(rebaixarViva.body.error.reason, "run_status_transition_not_allowed");
    const fakePending = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${other.id}`, {
      method: "PATCH",
      headers,
      body: { status: "pending_acknowledgement", answers: [] },
    });
    assert.equal(fakePending.status, 409);
    assert.equal(fakePending.body.error.reason, "run_acknowledgement_requires_action");

    const untouched = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${other.id}/comparison`, { headers });
    assert.equal(untouched.body.data.run.status, "in_progress");

    // E o caminho legítimo (cancelar pela edição) segue aberto — a allowlist não fechou a porta certa.
    const cancel = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${other.id}`, {
      method: "PATCH",
      headers,
      body: { status: "cancelled", answers: [] },
    });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.data.run.status, "cancelled");
  });
});

// Junta PR-03 (2a rodada, ALTA do critico-adversarial PROVADO POR EXECUCAO): a trava anterior so olhava
// estado TERMINAL, e "aguardando ciencia" nao e terminal — embora seja POS-ASSINATURA. O proprio guincheiro
// (que tem `checklist_runs:update` e NAO tem `checklist_runs:reopen`) reescrevia a resposta e acrescentava
// marcador de avaria depois de concluir, sem versao nova e sem motivo registrado. Este teste assere o
// CONTEUDO — o teste anterior so olhava o status e por isso nao via o buraco.
test("checklist P1 PR-03: vistoria que aguarda ciencia tem o CONTEUDO congelado (nao so o status)", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Para-choque amassado na chegada." }] },
    });

    // Conclusao COM divergencia: a vistoria esta assinada e espera a ciencia do cliente.
    const concluida = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: true, observation: "Avaria encontrada na chegada." },
    });
    assert.equal(concluida.status, 200);
    assert.equal(concluida.body.data.run.status, "pending_acknowledgement");

    // O ataque: reescrever a prova sem reabrir.
    const reescrever = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Veiculo sem avarias." }] },
    });
    const marcarDepois = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/markers`, {
      method: "POST",
      headers,
      body: { componentId: checklist.damageId, x: 0.5, y: 0.5, markerType: "scratch" },
    });
    const anexarDepois = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/attachments`, {
      method: "POST",
      headers,
      body: {
        componentId: checklist.photoId,
        fileUrl: "https://storage.example/checklists/tardia.jpg",
        fileName: "tardia.jpg",
        mimeType: "image/jpeg",
      },
    });

    for (const resposta of [reescrever, marcarDepois, anexarDepois]) {
      assert.equal(resposta.status, 409);
      assert.equal(resposta.body.error.reason, "checklist_run_locked");
    }

    // E a prova continua EXATAMENTE como foi assinada — esta e a asercao que faltava.
    const prova = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(prova.body.data.run.status, "pending_acknowledgement");
    assert.equal(prova.body.data.answers[0].value, "Para-choque amassado na chegada.");
    assert.equal(prova.body.data.markers.length, 0);
    assert.equal(prova.body.data.attachments.length, 0);

    // A CIENCIA continua passando — e o unico caminho que ainda escreve, e fecha o ciclo.
    const ciencia = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/acknowledgement`, {
      method: "POST",
      headers,
      body: { message: "Ciente da avaria." },
    });
    assert.equal(ciencia.status, 201);

    const fechada = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(fechada.body.data.run.status, "completed_with_divergence");
  });
});

// Consequencia obrigatoria da trava acima: sem reabertura, a vistoria travada esperando ciencia ficaria
// SEM NENHUMA saida — nao edita e nao reabre. Reabrir e a saida.
test("checklist P1 PR-03: vistoria aguardando ciencia PODE ser reaberta (senao nao teria saida)", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: true, observation: "Avaria registrada por engano." },
    });

    const reaberta = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers,
      body: { reason: "Divergencia lancada no veiculo errado." },
    });
    assert.equal(reaberta.status, 201);
    assert.equal(reaberta.body.data.run.reopenedFromRunId, run.id);
    assert.equal(reaberta.body.data.run.status, "in_progress");

    // A original continua registrada como estava — nada foi apagado.
    const original = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(original.body.data.run.status, "pending_acknowledgement");
  });
});

test("checklist P1 PR-03: reabrir vistoria de modelo ARQUIVADO é recusado (versão em limbo)", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: false },
    });

    // A organização aposenta o modelo DEPOIS da vistoria concluída.
    const archive = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklist.id}`, {
      method: "PATCH",
      headers,
      body: { status: "archived" },
    });
    assert.equal(archive.status, 200);

    // Reabrir criaria uma versão que o app de campo nem listaria (só serve modelo publicado): recusa com
    // linguagem de negócio e caminho de saída, não uma run órfã.
    const reopen = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers,
      body: { reason: "Corrigir a quilometragem registrada." },
    });
    assert.equal(reopen.status, 409);
    assert.equal(reopen.body.error.reason, "checklist_template_archived");
  });
});

test("checklist P1 PR-03: reabrir cria NOVA versão vinculada e preserva a vistoria original", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id, {
      relatedEntityType: "work_order",
      relatedEntityId: "os_reabertura",
    });

    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Primeira leitura." }] },
    });
    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/markers`, {
      method: "POST",
      headers,
      body: { componentId: checklist.damageId, x: 0.4, y: 0.6, markerType: "dent", description: "Amassado na porta" },
    });

    // Em andamento não se reabre: é só continuar preenchendo.
    const tooEarly = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers,
      body: { reason: "Ainda nem concluiu, mas quero reabrir." },
    });
    assert.equal(tooEarly.status, 409);
    assert.equal(tooEarly.body.error.reason, "checklist_run_not_completed");

    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: false },
    });

    // Motivo é obrigatório — reabrir prova assinada não é ato anônimo.
    const noReason = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers,
      body: {},
    });
    assert.equal(noReason.status, 400);

    const reopened = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers,
      body: { reason: "Foto do para-choque saiu tremida; refazer o registro." },
    });
    assert.equal(reopened.status, 201);
    assert.equal(reopened.body.data.run.status, "in_progress");
    assert.equal(reopened.body.data.run.reopenedFromRunId, run.id);
    assert.equal(reopened.body.data.previousRunId, run.id);
    assert.notEqual(reopened.body.data.run.id, run.id);
    // Herda o vínculo com a ordem de serviço e o trabalho já feito (não se redigita a vistoria).
    assert.equal(reopened.body.data.run.relatedEntityId, "os_reabertura");
    assert.equal(reopened.body.data.answers.length, 1);
    assert.equal(reopened.body.data.answers[0].value, "Primeira leitura.");
    assert.equal(reopened.body.data.markers.length, 1);
    assert.equal(reopened.body.data.markers[0].description, "Amassado na porta");

    // A vistoria original continua concluída e íntegra.
    const original = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
    assert.equal(original.body.data.run.status, "completed");
    assert.equal(original.body.data.answers.length, 1);

    // A nova versão aceita escrita normalmente.
    const writeOnNew = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${reopened.body.data.run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Leitura corrigida." }] },
    });
    assert.equal(writeOnNew.status, 200);

    // Reabrir DE NOVO a mesma vistoria concluída deixaria a cadeia de versões ambígua.
    const twice = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers,
      body: { reason: "Segunda reabertura concorrente da mesma vistoria." },
    });
    assert.equal(twice.status, 409);
    assert.equal(twice.body.error.reason, "checklist_run_already_reopened");
  });
});

test("checklist P1 PR-03: reabrir é permissão de GESTÃO — campo e despacho recebem 403", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const adminHeaders = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, adminHeaders, checklist.id);
    await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers: adminHeaders,
      body: { hasDivergence: false },
    });

    // O guincheiro TEM `checklist_runs:update` (responde a vistoria) e mesmo assim não destrava a própria
    // assinatura: reabrir é gate PRÓPRIO.
    const fieldReopen = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "field_technician"),
      body: { reason: "Quero corrigir a vistoria que eu mesmo assinei." },
    });
    assert.equal(fieldReopen.status, 403);
    assert.equal(fieldReopen.body.error.reason, "permission_required");

    const operatorReopen = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { reason: "Despacho tentando reabrir a vistoria." },
    });
    assert.equal(operatorReopen.status, 403);

    // Outra organização não enxerga a vistoria: 404 (nunca 403 — 403 confirmaria que ela existe).
    const crossTenant = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.adminB),
      body: { reason: "Reabrindo vistoria de outra organizacao." },
    });
    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "checklist_run_not_found");

    // O gestor reabre.
    const managerReopen = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.supervisorA, "manager"),
      body: { reason: "Gestor corrigindo o registro apos conferencia." },
    });
    assert.equal(managerReopen.status, 201);
    assert.equal(managerReopen.body.data.run.reopenedFromRunId, run.id);
  });
});

// P-CHK-INATIVAR-COM-RUN-ATIVA (opção "b" da pendência) — inativar tira o modelo das NOVAS ordens, mas quem
// já está com a vistoria aberta no aplicativo continua conseguindo carregar o formulário e concluir.
test("checklist P1 PR-03: modelo INATIVADO continua servindo quem já está no campo, mas sai das novas ordens", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA);
    const checklist = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await createRun(baseUrl, headers, checklist.id);

    const inactivate = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklist.id}`, {
      method: "PATCH",
      headers,
      body: { status: "inactive" },
    });
    assert.equal(inactivate.status, 200);
    assert.equal(inactivate.body.data.status, "inactive");

    // 1) O formulário da vistoria EM ANDAMENTO continua sendo servido.
    const render = await requestJson(baseUrl, `/api/v1/mobile/checklists/${checklist.id}/render`, { headers });
    assert.equal(render.status, 200);
    assert.equal(render.body.data.components.length, 4);

    // 2) O técnico continua preenchendo e CONCLUI (não fica preso com uma vistoria morta na mão).
    const answer = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
      method: "PATCH",
      headers,
      body: { answers: [{ componentId: checklist.observationId, value: "Concluida apos a inativacao." }] },
    });
    assert.equal(answer.status, 200);

    const complete = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
      method: "POST",
      headers,
      body: { hasDivergence: false },
    });
    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.run.status, "completed");

    // 3) Mas NENHUMA vistoria nova nasce do modelo inativo — é o que "fora das novas ordens" promete.
    const newRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers,
      body: { checklistId: checklist.id },
    });
    assert.equal(newRun.status, 409);
    assert.equal(newRun.body.error.reason, "checklist_not_published");

    // 4) E ele some da lista de modelos disponíveis para o aplicativo.
    const available = await requestJson(baseUrl, "/api/v1/mobile/checklists/available", { headers });
    assert.equal(available.status, 200);
    assert.equal(
      available.body.items.some((item: { id: string }) => item.id === checklist.id),
      false,
    );

    // 5) Sem NENHUMA vistoria viva, o modelo inativo volta a recusar o render (nada a servir).
    const semRunAtiva = await createFieldChecklist(baseUrl, seed.tenantA, seed.adminA);
    await requestJson(baseUrl, `/api/v1/tenant/checklists/${semRunAtiva.id}`, {
      method: "PATCH",
      headers,
      body: { status: "inactive" },
    });
    const renderSemRun = await requestJson(baseUrl, `/api/v1/mobile/checklists/${semRunAtiva.id}/render`, { headers });
    assert.equal(renderSemRun.status, 409);
    assert.equal(renderSemRun.body.error.reason, "checklist_not_published");
  });
});

// Modelo de campo completo (observação + foto + avaria + ciência) usado pelos testes do PR-03.
async function createFieldChecklist(
  baseUrl: string,
  tenant: Tenant,
  user: User,
): Promise<{ id: string; observationId: string; photoId: string; damageId: string }> {
  const created = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: authHeaders(tenant, user),
    body: {
      name: `Vistoria de campo ${Math.random().toString(16).slice(2)}`,
      type: "towing_collection",
      schema: {},
      components: [
        { componentKey: "obs", type: "observation", label: "Observacao", required: false },
        { componentKey: "fotos", type: "photo_upload", label: "Fotos", required: false },
        { componentKey: "avarias", type: "damage_map", label: "Avarias", required: false },
        { componentKey: "ciencia", type: "acknowledgement", label: "Ciencia", required: false },
      ],
    },
  });
  assert.equal(created.status, 201);

  const published = await requestJson(baseUrl, `/api/v1/tenant/checklists/${created.body.data.id}/publish`, {
    method: "POST",
    headers: authHeaders(tenant, user),
  });
  assert.equal(published.status, 200);

  return {
    id: published.body.data.id as string,
    observationId: findComponentId(published.body.data, "observation"),
    photoId: findComponentId(published.body.data, "photo_upload"),
    damageId: findComponentId(published.body.data, "damage_map"),
  };
}

async function createRun(
  baseUrl: string,
  headers: Record<string, string>,
  checklistId: string,
  extra: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
    method: "POST",
    headers,
    body: { checklistId, ...extra },
  });

  assert.equal(created.status, 201);

  return { id: created.body.data.id as string };
}

async function createAndPublishChecklist(
  baseUrl: string,
  tenant: Tenant,
  user: User,
): Promise<{ id: string }> {
  const create = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: authHeaders(tenant, user),
    body: {
      name: "Evidencia tecnica",
      type: "technical_evidence",
      schema: {
        stages: ["before", "after"],
      },
      components: [
        {
          type: "before_after",
          label: "Antes e depois",
          required: true,
        },
      ],
    },
  });
  const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${create.body.data.id}/publish`, {
    method: "POST",
    headers: authHeaders(tenant, user),
  });

  return {
    id: publish.body.data.id as string,
  };
}

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly operatorA: User;
  readonly supervisorA: User;
};

type ChecklistApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withChecklistApi(callback: (context: ChecklistApiContext) => Promise<void>): Promise<void> {
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
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
    });
  } finally {
    await closeServer(server);
    resetChecklistRuntimeForTests();
  }
}

function seedCoreSaas(service: CoreSaasRegistry): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Checklist A",
  });
  const tenantB = service.createTenant({
    name: "Tenant Checklist B",
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "checklist-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "checklist-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "checklist-operator-a@example.com",
    roles: ["operator"],
  });
  const supervisorA = service.createUser({
    tenantId: tenantA.id,
    name: "Supervisor A",
    email: "checklist-supervisor-a@example.com",
    roles: ["manager"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    adminB,
    operatorA,
    supervisorA,
  };
}

function authHeaders(
  tenant: Tenant,
  user: User,
  role = "tenant_admin",
  permissions?: readonly string[],
): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

function findComponentId(template: { components: readonly { id: string; type: string }[] }, type: string): string {
  const component = template.components.find((item) => item.type === type);

  assert.ok(component);

  return component.id;
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function restoreOptionalEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
