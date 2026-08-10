import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import {
  toChecklistRunAnswerDto,
  toChecklistRunDto,
} from "../checklists/checklist.dto.js";
import {
  ChecklistError,
  type ChecklistRunAnswer,
} from "../checklists/checklist.types.js";
import { assertChecklistRunFieldWritable } from "../checklists/checklist.run-lifecycle.js";
import {
  createDefaultChecklistService,
  type ChecklistService,
} from "../checklists/checklist.service.js";

type RawRecord = Record<string, unknown>;

type MobileChecklistActionOutcome = "accepted" | "rejected" | "conflict" | "already_applied";

// P0a — CONTRATO CANÔNICO de tipos de ação. O backend fecha o CICLO COMPLETO do checklist de campo
// (antes só 3 tipos persistiam; foto/avaria/assinatura se perdiam em silêncio). O canônico usa
// o namespace consistente `checklist.*`; os ALIASES crus que o codec do mobile ATUAL manda (`checklist_run.create`
// etc.) são aceitos por RETROCOMPAT durante a transição — a P0b (Flutter) alinhará o codec aos canônicos e os
// aliases poderão ser removidos depois. `checklist_answer.upsert`/`checklist_run.complete` do mobile já chegam
// traduzidos para `checklist.item_answer`/`checklist.item_note`/`checklist.complete`.
//
// D-CHK-DISPATCH-CREATE — quem CRIA a run é o DESPACHO/OPERADOR, não o guincheiro. O `checklist.run_create` deste
// sync é o caminho do OPERADOR (gated `checklist_runs:create`, checado por-ação abaixo) — NÃO o do guincheiro,
// que NÃO tem `create` e apenas RESPONDE/CONCLUI/ASSINA (answer/note/marker/divergence/ack/attachment/complete)
// uma run já criada. No fluxo normal de campo a run nasce do despacho (efeito de domínio de
// `field_dispatch:create`); este `run.create` cobre a criação manual/direta pelo operador.
type CanonicalChecklistActionType =
  | "checklist.run_create"
  | "checklist.item_answer"
  | "checklist.item_note"
  | "checklist.marker_create"
  | "checklist.divergence_create"
  | "checklist.acknowledgement_create"
  | "checklist.attachment_attach"
  | "checklist.complete";

type ChecklistRunPermission =
  | "checklist_runs:create"
  | "checklist_runs:update"
  | "checklist_runs:complete"
  | "checklist_runs:acknowledge";

// Aliases crus do mobile atual → tipo canônico. Aceitar AMBOS é a decisão de design (opção "a" do comando):
// zero quebra do app em produção enquanto a P0b não migra o codec.
const ACTION_TYPE_ALIASES: Readonly<Record<string, CanonicalChecklistActionType>> = {
  "checklist.run_create": "checklist.run_create",
  "checklist_run.create": "checklist.run_create",
  "checklist.item_answer": "checklist.item_answer",
  "checklist.item_note": "checklist.item_note",
  "checklist.marker_create": "checklist.marker_create",
  "checklist_marker.create": "checklist.marker_create",
  "checklist.divergence_create": "checklist.divergence_create",
  "checklist_divergence.create": "checklist.divergence_create",
  "checklist.acknowledgement_create": "checklist.acknowledgement_create",
  "checklist_acknowledgement.create": "checklist.acknowledgement_create",
  "checklist.attachment_attach": "checklist.attachment_attach",
  "checklist_attachment.attach": "checklist.attachment_attach",
  "checklist.complete": "checklist.complete",
  "checklist_run.complete": "checklist.complete",
};

// Permissão exigida por TIPO CANÔNICO (checagem por-ação, não global): create→create, answer/note/marker/
// divergence/attachment→update, complete→complete, acknowledgement→acknowledge.
const ACTION_PERMISSIONS: Readonly<Record<CanonicalChecklistActionType, ChecklistRunPermission>> = {
  "checklist.run_create": "checklist_runs:create",
  "checklist.item_answer": "checklist_runs:update",
  "checklist.item_note": "checklist_runs:update",
  "checklist.marker_create": "checklist_runs:update",
  "checklist.divergence_create": "checklist_runs:update",
  "checklist.attachment_attach": "checklist_runs:update",
  "checklist.complete": "checklist_runs:complete",
  "checklist.acknowledgement_create": "checklist_runs:acknowledge",
};

const SYNC_CLIENT_ACTION_METADATA_KEY = "sync_client_action_id";

type MobileChecklistAction = {
  readonly client_action_id: string;
  readonly type: string;
  readonly payload: RawRecord;
  readonly local_created_at: string;
};

type MobileChecklistActionResult = {
  readonly client_action_id: string;
  readonly type?: string;
  readonly status: MobileChecklistActionOutcome;
  readonly checklist_run_id?: string;
  readonly server_run_id?: string;
  readonly server_state?: {
    readonly run: ReturnType<typeof toChecklistRunDto>;
    readonly answers: readonly ReturnType<typeof toChecklistRunAnswerDto>[];
  };
  // P0a — descritor do anexo pendente (metadado do sync). NÃO cria registro: o BINÁRIO sobe pelo multipart
  // (POST /mobile/checklist-runs/:runId/attachments). Serve para o app localizar o endpoint e vincular o
  // local_att_id ao anexo do servidor sem gerar "anexo fantasma".
  readonly attachment?: {
    readonly local_att_id?: string;
    readonly component_id: string;
    readonly file_name?: string;
    readonly status: "pending_binary_upload";
    readonly upload_endpoint: string;
  };
  readonly error?: {
    readonly code: string;
    readonly reason: string;
    readonly message: string;
  };
  readonly conflict?: {
    readonly conflict_type: string;
    readonly server_id?: string;
    readonly local: RawRecord;
    readonly remote?: RawRecord;
    readonly next_action: string;
    // `false` = a condição NÃO muda com o tempo; repetir devolve o MESMO 409 para sempre. É o sinal PARA o app
    // tirar a ação da fila sem decorar quais strings de `next_action` são terminais — hoje o Flutter ainda não
    // o lê (conflitos já saem da fila pelo status `conflict`); o campo existe para o PR-08 consumir sem nova
    // mudança de contrato.
    readonly retriable: boolean;
    // O que o técnico preencheu e NÃO entrou — só nas recusas definitivas, para o app MOSTRAR em vez de
    // descartar em silêncio.
    readonly rejected_content?: RawRecord;
  };
};

type MobileChecklistSyncReceipt = {
  readonly fingerprint: string;
  readonly result: MobileChecklistActionResult;
};

export type MobileChecklistSyncResponse = {
  readonly contract: {
    readonly name: "mobile_checklist_actions_sync";
    readonly version: "2026-08-10.chk-p1-pr03";
    readonly status: "partial";
  };
  readonly client_batch_id: string | null;
  readonly tenant_id: string;
  readonly server_time: string;
  readonly summary: {
    readonly received: number;
    readonly accepted: number;
    readonly rejected: number;
    readonly conflicts: number;
    readonly already_applied: number;
  };
  readonly accepted: readonly MobileChecklistActionResult[];
  readonly rejected: readonly MobileChecklistActionResult[];
  readonly conflicts: readonly MobileChecklistActionResult[];
  readonly already_applied: readonly MobileChecklistActionResult[];
};

const MAX_BATCH_SIZE = 50;
const syncReceipts = new Map<string, MobileChecklistSyncReceipt>();
const GATE_PERMISSIONS: readonly ChecklistRunPermission[] = [
  "checklist_runs:create",
  "checklist_runs:update",
  "checklist_runs:complete",
  "checklist_runs:acknowledge",
];

const CHECKLIST_ATTACHMENT_UPLOAD_ENDPOINT = "/api/v1/mobile/checklist-runs/{runId}/attachments";

// CHECKLIST P1 PR-03 (junta, MÉDIA-5) — orientação de conflito por REASON, separando o que o tempo resolve do
// que o tempo NÃO resolve.
//
// `refresh_..._and_retry` só faz sentido quando o servidor pode mudar de ideia. Numa vistoria travada
// (concluída/assinada) a condição é PERMANENTE: atualizar a vistoria devolve o mesmo `completed`, e o próximo
// retry devolve o mesmo 409 — a ação recicla na fila do aparelho para sempre. No campo isso apaga trabalho
// real: o guincheiro sem sinal responde o item, marca a avaria e conclui; a conclusão sobe primeiro e o resto
// vira conflito eterno. No ANEXO é pior — o contrato manda o binário subir DEPOIS do sync JSON, então a FOTO
// DA AVARIA nunca mais entra.
//
// Por isso a orientação aqui é TERMINAL: a ação SAI da fila (`retriable:false`), o conteúdo recusado volta no
// corpo para o app mostrar ao técnico, e o nome diz o caminho REAL — reabrir exige `checklist_runs:reopen`
// (gestão); o técnico não destrava a própria assinatura, ele PEDE a reabertura.
const TERMINAL_CONFLICT_NEXT_ACTIONS: Readonly<Record<string, string>> = {
  checklist_run_locked: "stop_retrying_and_request_run_reopen",
  // Vistoria cancelada não se reabre (não é prova de nada): o caminho é abrir outra pela ordem de serviço.
  checklist_run_cancelled: "stop_retrying_and_start_new_run",
};

// Conflito de estado que o servidor AINDA pode resolver (ex.: a run vira `pending_acknowledgement` quando a
// divergência da fila subir): aqui atualizar e repetir continua sendo a instrução certa.
const RETRIABLE_CONFLICT_NEXT_ACTION = "refresh_checklist_run_and_retry";

// Texto longo/binário não volta no `rejected_content`: o app JÁ tem o conteúdo local, e devolver assinatura ou
// foto em base64 seria trafegar binário numa resposta pública (§2.8). A omissão é DECLARADA (D-007).
const REJECTED_VALUE_MAX_LENGTH = 240;

export async function syncMobileChecklistActions(
  actor: AuthenticatedActor | undefined,
  body: unknown,
  resolveService: () => Promise<ChecklistService> = createDefaultChecklistService,
): Promise<MobileChecklistSyncResponse> {
  assertSyncActor(actor);
  const request = parseSyncRequest(body);
  const service = await resolveService();
  const accepted: MobileChecklistActionResult[] = [];
  const rejected: MobileChecklistActionResult[] = [];
  const conflicts: MobileChecklistActionResult[] = [];
  const alreadyApplied: MobileChecklistActionResult[] = [];

  for (const action of request.actions) {
    const fingerprint = fingerprintAction(action);
    const receiptKey = buildReceiptKey(actor, action.client_action_id);
    const existingReceipt = syncReceipts.get(receiptKey);

    if (existingReceipt) {
      if (existingReceipt.fingerprint === fingerprint) {
        alreadyApplied.push({
          ...existingReceipt.result,
          status: "already_applied",
        });
        continue;
      }

      conflicts.push(buildIdempotencyConflict(action, existingReceipt.result));
      continue;
    }

    const result = await processAction(service, actor, action);

    if (result.status === "accepted") {
      syncReceipts.set(receiptKey, { fingerprint, result });
      accepted.push(result);
      continue;
    }

    // P0a — idempotência DURÁVEL: `processAction` pode devolver `already_applied` quando o efeito já persiste
    // no banco (run/marker/answer/ack/divergência já gravados), mesmo que o `syncReceipts` in-memory tenha se
    // perdido num restart. Grava o receipt para acelerar replays subsequentes do MESMO processo.
    if (result.status === "already_applied") {
      syncReceipts.set(receiptKey, { fingerprint, result });
      alreadyApplied.push(result);
      continue;
    }

    if (result.status === "conflict") {
      conflicts.push(result);
      continue;
    }

    rejected.push(result);
  }

  return {
    contract: {
      name: "mobile_checklist_actions_sync",
      version: "2026-08-10.chk-p1-pr03",
      status: "partial",
    },
    client_batch_id: request.client_batch_id,
    tenant_id: actor.tenantId,
    server_time: new Date().toISOString(),
    summary: {
      received: request.actions.length,
      accepted: accepted.length,
      rejected: rejected.length,
      conflicts: conflicts.length,
      already_applied: alreadyApplied.length,
    },
    accepted,
    rejected,
    conflicts,
    already_applied: alreadyApplied,
  };
}

export function resetMobileChecklistSyncRuntimeForTests(): void {
  syncReceipts.clear();
}

function assertSyncActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  if (!actor?.tenantId) {
    throw routeError(403, "FORBIDDEN", "tenant_required", "Tenant context is required.");
  }

  if (!actor.userId || actor.userId === "anonymous") {
    throw routeError(403, "FORBIDDEN", "user_required", "User context is required.");
  }

  if (actor.roles.length === 0) {
    throw routeError(403, "FORBIDDEN", "role_required", "Role is required.");
  }

  // Gate amplo: o ator precisa de PELO MENOS uma permissão de escrita de checklist_runs para sincronizar. A
  // permissão CERTA de cada tipo é checada por-ação em `processAction` (ex.: sem `:create`, só o run.create é
  // rejeitado; as demais ações do lote seguem).
  if (!hasAnyPermission(actor, GATE_PERMISSIONS)) {
    throw routeError(
      403,
      "FORBIDDEN",
      "permission_required",
      `One of these permissions is required: ${GATE_PERMISSIONS.join(", ")}.`,
    );
  }
}

function parseSyncRequest(body: unknown): {
  readonly client_batch_id: string | null;
  readonly actions: readonly MobileChecklistAction[];
} {
  const record = asRecord(body, "body");
  const clientBatchId = parseOptionalString(record.client_batch_id);

  if (!Array.isArray(record.actions)) {
    throw routeError(400, "BAD_REQUEST", "invalid_envelope", "actions must be an array.");
  }

  if (record.actions.length > MAX_BATCH_SIZE) {
    throw routeError(400, "BAD_REQUEST", "batch_too_large", `actions must contain at most ${MAX_BATCH_SIZE} items.`);
  }

  return {
    client_batch_id: clientBatchId,
    actions: record.actions.map(parseAction),
  };
}

function parseAction(value: unknown): MobileChecklistAction {
  const record = asRecord(value, "action");
  const clientActionId = parseRequiredString(record.client_action_id, "client_action_id");
  const type = parseRequiredString(record.type, "type");
  const payload = asRecord(record.payload, "payload");
  const localCreatedAt = parseRequiredString(record.local_created_at, "local_created_at");

  if (Number.isNaN(Date.parse(localCreatedAt))) {
    throw routeError(400, "BAD_REQUEST", "invalid_action", "local_created_at must be a valid ISO date.");
  }

  return {
    client_action_id: clientActionId,
    type,
    payload,
    local_created_at: localCreatedAt,
  };
}

async function processAction(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  try {
    const canonicalType = ACTION_TYPE_ALIASES[action.type];

    if (!canonicalType) {
      throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");
    }

    requireActionPermission(actor, action, ACTION_PERMISSIONS[canonicalType]);

    switch (canonicalType) {
      case "checklist.run_create":
        return await handleRunCreate(service, actor, action);
      case "checklist.item_answer":
      case "checklist.item_note":
        return await handleAnswer(service, actor, action, canonicalType);
      case "checklist.marker_create":
        return await handleMarkerCreate(service, actor, action);
      case "checklist.divergence_create":
        return await handleDivergenceCreate(service, actor, action);
      case "checklist.acknowledgement_create":
        return await handleAcknowledgementCreate(service, actor, action);
      case "checklist.attachment_attach":
        return await handleAttachmentAttach(service, actor, action);
      case "checklist.complete":
        return await handleComplete(service, actor, action);
    }
  } catch (error) {
    return actionErrorResult(action, error);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Handlers por tipo canônico.
// ---------------------------------------------------------------------------------------------------------

// Caminho do OPERADOR (gated `checklist_runs:create`) — criação direta/manual de run pelo sync. O guincheiro
// NÃO chega aqui (não tem `create`); no fluxo normal a run já foi criada pelo despacho (D-CHK-DISPATCH-CREATE).
async function handleRunCreate(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  const localRunId = parseRequiredString(action.payload.local_run_id, "local_run_id");
  const checklistId = parseRequiredString(
    (action.payload.checklist_id ?? action.payload.template_id) as unknown,
    "checklist_id",
  );

  // Idempotência durável: se a run já existe para este local_run_id (replay pós-restart), devolve a existente
  // como `already_applied` — ZERO duplicata. O repositório também barra a corrida no unique client_run_key.
  const existing = await service.findRunByClientKey(actor, localRunId);

  if (existing) {
    const details = await service.getRun(actor, existing.id);
    return alreadyAppliedResult(action, details);
  }

  const run = await service.createRun(actor, {
    checklistId,
    clientRunKey: localRunId,
    relatedEntityType: parseOptionalString(action.payload.related_entity_type) ?? undefined,
    relatedEntityId: parseOptionalString(action.payload.related_entity_id) ?? undefined,
    answers: [],
  });

  const details = await service.getRun(actor, run.id);
  return acceptedResult(action, details);
}

async function handleAnswer(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
  canonicalType: "checklist.item_answer" | "checklist.item_note",
): Promise<MobileChecklistActionResult> {
  const runId = await resolveRunId(service, actor, action);
  const details = await service.getRun(actor, runId);
  const componentId = parseRequiredString(readComponentId(action), "component_id");

  const duplicate = details.answers.find(
    (answer) =>
      answer.componentId === componentId &&
      readSyncClientActionId(answer.metadata) === action.client_action_id,
  );

  if (duplicate) {
    return alreadyAppliedResult(action, details);
  }

  const existingAnswer = details.answers.find((answer) => answer.componentId === componentId);
  const answer = canonicalType === "checklist.item_answer"
    ? buildAnswerPayload(action, componentId)
    : buildNotePayload(action, componentId, existingAnswer);
  const updated = await service.updateRun(actor, runId, { answers: [answer] });

  return acceptedResult(action, updated);
}

async function handleMarkerCreate(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  const runId = await resolveRunId(service, actor, action);
  const details = await service.getRun(actor, runId);

  const duplicate = details.markers.find(
    (marker) => readSyncClientActionId(marker.metadata) === action.client_action_id,
  );

  if (duplicate) {
    return alreadyAppliedResult(action, details);
  }

  const componentId = parseRequiredString(readComponentId(action), "component_id");
  const markerType =
    parseOptionalString(action.payload.marker_type) ?? parseOptionalString(action.payload.type) ?? "damage";
  const description =
    parseOptionalString(action.payload.description) ??
    parseOptionalString(action.payload.position_label) ??
    parseOptionalString(action.payload.label) ??
    undefined;
  const localMarkerId = parseOptionalString(action.payload.local_marker_id);

  await service.createMarker(actor, runId, {
    componentId,
    // x/y podem não vir numéricos (o rótulo textual position_label/label é o que importa) — default 0.
    x: toFiniteNumber(action.payload.x, 0),
    y: toFiniteNumber(action.payload.y, 0),
    markerType,
    description,
    metadata: {
      ...parseOptionalRecord(action.payload.metadata),
      [SYNC_CLIENT_ACTION_METADATA_KEY]: action.client_action_id,
      ...(localMarkerId ? { local_marker_id: localMarkerId } : {}),
    },
  });

  const refreshed = await service.getRun(actor, runId);
  return acceptedResult(action, refreshed);
}

async function handleDivergenceCreate(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  const runId = await resolveRunId(service, actor, action);
  const details = await service.getRun(actor, runId);

  // Divergência é um FLAG de estado (não uma entidade acumulável): se a run já está em pending_acknowledgement
  // ou completed_with_divergence, a divergência já foi registrada → idempotente (already_applied).
  if (
    details.run.status === "pending_acknowledgement" ||
    details.run.status === "completed_with_divergence"
  ) {
    return alreadyAppliedResult(action, details);
  }

  const componentId = parseRequiredString(readComponentId(action), "component_id");
  const observation = parseRequiredString(
    (action.payload.observation ?? action.payload.note) as unknown,
    "observation",
  );

  await service.registerDivergence(actor, runId, {
    observation,
    componentId,
    // Sem arquivo no JSON do sync: registerDivergence pula o anexo (sem "fantasma"); a foto sobe via multipart.
    fileUrl: parseOptionalString(action.payload.file_url) ?? undefined,
    metadata: {
      ...parseOptionalRecord(action.payload.metadata),
      [SYNC_CLIENT_ACTION_METADATA_KEY]: action.client_action_id,
    },
  });

  const refreshed = await service.getRun(actor, runId);
  return acceptedResult(action, refreshed);
}

async function handleAcknowledgementCreate(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  const runId = await resolveRunId(service, actor, action);
  const details = await service.getRun(actor, runId);

  const duplicate = details.acknowledgements.find(
    (acknowledgement) => readSyncClientActionId(acknowledgement.metadata) === action.client_action_id,
  );

  if (duplicate) {
    return alreadyAppliedResult(action, details);
  }

  const message = parseRequiredString(
    (action.payload.message ?? action.payload.observation) as unknown,
    "message",
  );
  const observation = parseOptionalString(action.payload.observation) ?? undefined;

  await service.acknowledgeRun(actor, runId, {
    message,
    observation,
    metadata: {
      ...parseOptionalRecord(action.payload.metadata),
      [SYNC_CLIENT_ACTION_METADATA_KEY]: action.client_action_id,
    },
  });

  const refreshed = await service.getRun(actor, runId);
  return acceptedResult(action, refreshed);
}

// attachment.attach — SÓ METADADO. NÃO cria ChecklistAttachment (o schema exige file_url NOT NULL; sem binário
// isso seria um "anexo fantasma"). A persistência do anexo é o UPLOAD MULTIPART do binário
// (POST /mobile/checklist-runs/:runId/attachments, já existente). Esta ação apenas resolve o local_run_id →
// server_run_id e devolve o endpoint de upload + eco do local_att_id para o app subir o binário depois (P0b).
// Não persiste nada → é idempotente por construção (replay não duplica).
async function handleAttachmentAttach(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  const runId = await resolveRunId(service, actor, action);
  const details = await service.getRun(actor, runId);

  // CHECKLIST P1 PR-03 (junta, MÉDIA-5) — a recusa da foto acontece AQUI, não lá no upload. Esta ação não
  // grava nada: ela PROMETE um endpoint para o binário subir depois, e numa vistoria travada essa promessa é
  // falsa (o multipart aplica a mesma trava e responde 409 permanente). O que este lado GARANTE: o sync deixa
  // de prometer endpoint que não honra, e o conflito volta terminal com o descritor da foto. O que este lado
  // NÃO faz sozinho: o app Flutter de hoje sobe o multipart sem ler esta orientação (o upload segue pela fila
  // própria e cai em UPLOAD_CONFLICT) — a economia de bateria só existe quando mobile/** consumir
  // `retriable`/`next_action` (registrado em pendencias.md como fronteira do PR-08).
  assertChecklistRunFieldWritable(details.run);

  const componentId = parseRequiredString(readComponentId(action), "component_id");
  const localAttId = parseOptionalString(action.payload.local_att_id) ?? undefined;
  const fileName = parseOptionalString(action.payload.file_name) ?? undefined;

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    checklist_run_id: runId,
    server_run_id: runId,
    server_state: {
      run: toChecklistRunDto(details.run),
      answers: details.answers.map(toChecklistRunAnswerDto),
    },
    attachment: {
      local_att_id: localAttId,
      component_id: componentId,
      file_name: fileName,
      status: "pending_binary_upload",
      upload_endpoint: CHECKLIST_ATTACHMENT_UPLOAD_ENDPOINT.replace("{runId}", encodeURIComponent(runId)),
    },
  };
}

async function handleComplete(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  const runId = await resolveRunId(service, actor, action);
  const current = await service.getRun(actor, runId);

  // Idempotente por estado: se a run já é terminal-completa (completed / completed_with_divergence), não
  // rebaixa o status — devolve o estado atual como already_applied.
  if (current.run.status === "completed" || current.run.status === "completed_with_divergence") {
    return alreadyAppliedResult(action, current);
  }

  const details = await service.completeRun(actor, runId, {
    hasDivergence: parseOptionalBoolean(action.payload.has_divergence) ?? false,
    observation: parseOptionalString(action.payload.observation) ?? undefined,
  });

  return acceptedResult(action, details);
}

// ---------------------------------------------------------------------------------------------------------
// Resolução de run + payloads.
// ---------------------------------------------------------------------------------------------------------

// Resolve o id de servidor da run: `run_id` explícito (server id) OU `local_run_id` (chave durável do mobile).
// A resolução por local_run_id funciona tanto DENTRO do mesmo lote (run.create já inseriu) quanto pós-restart
// (a run persiste no banco com client_run_key).
async function resolveRunId(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<string> {
  const serverRunId = parseOptionalString(action.payload.run_id);

  if (serverRunId) {
    return serverRunId;
  }

  const localRunId = parseOptionalString(action.payload.local_run_id);

  if (localRunId) {
    const run = await service.findRunByClientKey(actor, localRunId);

    if (!run) {
      throw new ChecklistError(
        404,
        "CHECKLIST_RUN_NOT_FOUND",
        "checklist_run_not_found",
        "Checklist run not found for local_run_id.",
      );
    }

    return run.id;
  }

  throw routeError(400, "BAD_REQUEST", "required_field", "run_id or local_run_id is required.");
}

function readComponentId(action: MobileChecklistAction): unknown {
  return action.payload.component_id ?? action.payload.field_id;
}

function readSyncClientActionId(metadata: RawRecord | undefined): string | undefined {
  const value = metadata?.[SYNC_CLIENT_ACTION_METADATA_KEY];

  return typeof value === "string" ? value : undefined;
}

function buildAnswerPayload(action: MobileChecklistAction, componentId: string) {
  return {
    componentId,
    value: action.payload.value ?? null,
    metadata: {
      ...parseOptionalRecord(action.payload.metadata),
      [SYNC_CLIENT_ACTION_METADATA_KEY]: action.client_action_id,
    },
  };
}

function buildNotePayload(
  action: MobileChecklistAction,
  componentId: string,
  existingAnswer: ChecklistRunAnswer | undefined,
) {
  return {
    componentId,
    value: existingAnswer?.value ?? action.payload.value ?? null,
    metadata: {
      ...(existingAnswer?.metadata ?? {}),
      ...parseOptionalRecord(action.payload.metadata),
      note: parseRequiredString(action.payload.note, "note"),
      [SYNC_CLIENT_ACTION_METADATA_KEY]: action.client_action_id,
    },
  };
}

function requireActionPermission(
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
  permission: ChecklistRunPermission,
): void {
  if (actor.permissions.includes(permission)) {
    return;
  }

  throw routeError(403, "FORBIDDEN", "permission_required", `One of these permissions is required: ${permission}.`);
}

function acceptedResult(
  action: MobileChecklistAction,
  details: Awaited<ReturnType<ChecklistService["updateRun"]>>,
): MobileChecklistActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    checklist_run_id: details.run.id,
    server_run_id: details.run.id,
    server_state: {
      run: toChecklistRunDto(details.run),
      answers: details.answers.map(toChecklistRunAnswerDto),
    },
  };
}

function alreadyAppliedResult(
  action: MobileChecklistAction,
  details: Awaited<ReturnType<ChecklistService["updateRun"]>>,
): MobileChecklistActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "already_applied",
    checklist_run_id: details.run.id,
    server_run_id: details.run.id,
    server_state: {
      run: toChecklistRunDto(details.run),
      answers: details.answers.map(toChecklistRunAnswerDto),
    },
  };
}

function actionErrorResult(
  action: MobileChecklistAction,
  error: unknown,
): MobileChecklistActionResult {
  if (isConflictError(error)) {
    const terminalNextAction = TERMINAL_CONFLICT_NEXT_ACTIONS[error.reason];

    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "conflict",
      checklist_run_id: readRunId(action),
      conflict: {
        conflict_type: error.reason,
        server_id: readRunId(action),
        local: sanitizeActionForConflict(action),
        next_action: terminalNextAction ?? RETRIABLE_CONFLICT_NEXT_ACTION,
        retriable: terminalNextAction === undefined,
        ...(terminalNextAction ? { rejected_content: describeRejectedContent(action) } : {}),
      },
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    };
  }

  if (isRouteLikeError(error)) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "rejected",
      checklist_run_id: readRunId(action),
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Invalid checklist action.";

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "rejected",
    checklist_run_id: readRunId(action),
    error: {
      code: "BAD_REQUEST",
      reason: "invalid_action",
      message,
    },
  };
}

function buildIdempotencyConflict(
  action: MobileChecklistAction,
  existingResult: MobileChecklistActionResult,
): MobileChecklistActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    checklist_run_id: readRunId(action),
    conflict: {
      conflict_type: "idempotency_payload_mismatch",
      server_id: existingResult.checklist_run_id,
      local: sanitizeActionForConflict(action),
      remote: {
        status: existingResult.status,
        type: existingResult.type,
        checklist_run_id: existingResult.checklist_run_id,
      },
      next_action: "drop_duplicate_or_create_new_client_action_id",
      // Reenviar o MESMO client_action_id com payload diferente colide sempre (o recibo não muda): repetir só
      // gastaria bateria. A saída já está no `next_action` — descartar a duplicata ou emitir um id novo.
      retriable: false,
      rejected_content: describeRejectedContent(action),
    },
    error: {
      code: "MOBILE_SYNC_CONFLICT",
      reason: "idempotency_payload_mismatch",
      message: "client_action_id was already applied with a different payload.",
    },
  };
}

function fingerprintAction(action: MobileChecklistAction): string {
  return JSON.stringify({
    type: action.type,
    payload: normalizePayload(action.payload),
  });
}

function normalizePayload(record: RawRecord): RawRecord {
  return sortRecord(
    Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "tenant_id" && key !== "tenantId"),
    ),
  );
}

function sortRecord(record: RawRecord): RawRecord {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [
        key,
        isPlainRecord(value) ? sortRecord(value) : value,
      ]),
  );
}

function buildReceiptKey(actor: AuthenticatedActor, clientActionId: string): string {
  return `${actor.tenantId}:${actor.userId}:${clientActionId}`;
}

function parseRequiredString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw routeError(400, "BAD_REQUEST", "required_field", `${field} is required.`);
  }

  return normalized;
}

function parseOptionalString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || null;
}

function parseOptionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseOptionalRecord(value: unknown): RawRecord {
  return value === undefined ? {} : asRecord(value, "metadata");
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asRecord(value: unknown, field: string): RawRecord {
  if (isPlainRecord(value)) {
    return value;
  }

  throw routeError(400, "BAD_REQUEST", "invalid_envelope", `${field} must be an object.`);
}

function isPlainRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRunId(action: MobileChecklistAction): string | undefined {
  return (
    parseOptionalString(action.payload.run_id) ??
    parseOptionalString(action.payload.local_run_id) ??
    undefined
  );
}

// O que o técnico preencheu e o servidor recusou EM DEFINITIVO, em campos de negócio. Sem isto o app fica com
// uma ação morta na fila e nada para mostrar: a resposta, a avaria ou a foto somem sem ninguém ver — que é
// exatamente o desfecho que a trava de imutabilidade deveria evitar, não causar.
// §2.8: só conteúdo de negócio do PRÓPRIO aparelho — nada de file_url, chave de storage, binário ou tenant.
function describeRejectedContent(action: MobileChecklistAction): RawRecord {
  const payload = action.payload;
  const content: RawRecord = {
    action_type: ACTION_TYPE_ALIASES[action.type] ?? action.type,
    captured_at: action.local_created_at,
    ...describeRejectedValue(payload.value),
  };

  const fields: ReadonlyArray<readonly [string, unknown]> = [
    ["component_id", readComponentId(action)],
    ["note", payload.note],
    ["observation", payload.observation],
    ["message", payload.message],
    ["marker_type", payload.marker_type ?? payload.type],
    ["description", payload.description ?? payload.position_label ?? payload.label],
    ["file_name", payload.file_name],
    ["local_att_id", payload.local_att_id],
  ];

  for (const [field, raw] of fields) {
    const text = parseOptionalString(raw);

    if (text) {
      // O mesmo teto (e a mesma recusa de data-URI) do `value`: um binário colado em `note` ou
      // `observation` sairia inteiro por aqui — a redação de um campo não pode vazar pelo vizinho.
      const descrito = describeRejectedValue(text);
      if ("value" in descrito) {
        content[field] = descrito.value;
      } else {
        content[`${field}_omitted`] = descrito.value_omitted;
      }
    }
  }

  return content;
}

// Assinatura e foto chegam como data URI base64 no `value`. Devolvê-las seria trafegar binário de volta sem
// necessidade (o app tem o original em disco); então o valor sai e a AUSÊNCIA é declarada — nunca omitida em
// silêncio, que faria o app concluir que o item estava vazio.
function describeRejectedValue(value: unknown): RawRecord {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { value };
  }

  if (typeof value === "string") {
    if (value.startsWith("data:")) {
      return { value_omitted: "binary_content" };
    }

    return value.length > REJECTED_VALUE_MAX_LENGTH
      ? { value_omitted: "text_too_long" }
      : { value };
  }

  return { value_omitted: "structured_value" };
}

function sanitizeActionForConflict(action: MobileChecklistAction): RawRecord {
  // Junta PR-03 (2ª rodada, §2.8 PROVADO POR SONDA): `normalizePayload` só remove tenant_id — a
  // assinatura/foto em data-URI base64 voltava INTEIRA por `local.payload.value`, ao lado do
  // `rejected_content` cuidadosamente redigido. A redação acontece AQUI, nunca em `normalizePayload`:
  // aquele helper é compartilhado com `fingerprintAction`, e mudar o fingerprint invalidaria a
  // idempotência de toda fila em voo (cada replay viraria `idempotency_payload_mismatch` falso).
  const { value, ...rest } = action.payload;
  return {
    type: action.type,
    payload: { ...normalizePayload(rest), ...describeRejectedValue(value) },
    local_created_at: action.local_created_at,
  };
}

function hasAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly ChecklistRunPermission[],
): boolean {
  return permissions.some((permission) => actor.permissions.includes(permission));
}

function isConflictError(error: unknown): error is {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
} {
  return isRouteLikeError(error) && error.statusCode === 409;
}

function isRouteLikeError(error: unknown): error is {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
} {
  return (
    error instanceof ChecklistError ||
    (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      "code" in error &&
      "reason" in error &&
      "message" in error &&
      typeof error.statusCode === "number" &&
      typeof error.code === "string" &&
      typeof error.reason === "string" &&
      typeof error.message === "string"
    )
  );
}

function routeError(
  statusCode: number,
  code: string,
  reason: string,
  message: string,
) {
  return {
    statusCode,
    code,
    reason,
    message,
  };
}
