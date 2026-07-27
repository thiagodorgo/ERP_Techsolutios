import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import {
  adaptReleaseData,
  adaptReleaseView,
  adaptSettleResult,
  releaseActionErrorMessage,
} from "./release.adapter";
import type {
  ApproveInput,
  ForRepairInput,
  RecipientInput,
  ReleaseApiContext,
  ReleaseDto,
  ReleaseView,
  SettleResult,
} from "./release.types";

// Ω5P PR-11 — cliente da Liberação I5. TODAS as chamadas passam pelo cliente HTTP COMPARTILHADO (`apiRequest`:
// base URL, Bearer, headers de mock, refresh-retry de 401 + limpeza de sessão) — MESMO caminho de
// transição/allocate/settle. A UI NÃO reimplementa regra: o gate I5, o freeze e a hash-chain vivem no backend.

// Erro tipado da ação de liberação — carrega o `reason` do corpo do backend (o cliente HTTP guarda `reason` no
// ApiError; aqui o embrulhamos numa mensagem PT-BR white-label, MESMO padrão do TransitionError/fsm.ts). NÃO vaza
// corpo cru para a UI.
export class ReleaseActionError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(releaseActionErrorMessage(reason, status));
    this.name = "ReleaseActionError";
  }
}

function releasePath(processId: string, suffix = ""): string {
  return `/impound-processes/${encodeURIComponent(processId)}/release${suffix}`;
}

// Traduz o ApiError do cliente HTTP no erro tipado da fatia (preserva o reason discriminador do backend).
function rethrow(error: unknown): never {
  if (error instanceof ApiError) throw new ReleaseActionError(error.status, error.reason ?? null);
  throw error;
}

// GET /impound-processes/:id/release (impound:read). 404 release_not_found → null (EmptyState honesto). D-007:
// modo mock → null (nunca fabrica uma liberação).
export async function getRelease(context: ReleaseApiContext, processId: string): Promise<ReleaseView | null> {
  if (isMockMode() || !processId) return null;
  try {
    const response = await apiRequest<unknown>(releasePath(processId), context);
    return adaptReleaseView(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// POST /release/start (impound:transition) — salto A: abre a liberação + freeze T_stop. 409 já-em-curso / freeze
// retroativo → PT-BR.
export async function startRelease(context: ReleaseApiContext, processId: string): Promise<ReleaseView | null> {
  try {
    const response = await apiRequest<unknown>(releasePath(processId, "/start"), { ...context, method: "POST", body: {} });
    return adaptReleaseView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST /release/recipient (release:process) — quem retira (nome + documento + relação).
export async function setRecipient(context: ReleaseApiContext, processId: string, input: RecipientInput): Promise<ReleaseDto | null> {
  try {
    const response = await apiRequest<unknown>(releasePath(processId, "/recipient"), { ...context, method: "POST", body: toRecipientBody(input) });
    return adaptReleaseData(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST /release/checks (release:process) — marca UM requisito do checklist (code/satisfied/note?).
export async function setRequirementCheck(
  context: ReleaseApiContext,
  processId: string,
  input: { readonly code: string; readonly satisfied: boolean; readonly note?: string },
): Promise<void> {
  try {
    const body: Record<string, unknown> = { code: input.code, satisfied: input.satisfied };
    if (input.note?.trim()) body.note = input.note.trim();
    await apiRequest<unknown>(releasePath(processId, "/checks"), { ...context, method: "POST", body });
  } catch (error) {
    rethrow(error);
  }
}

// POST /release/approve (release:approve) — ATO DA AUTORIDADE (idempotente).
export async function approveRelease(context: ReleaseApiContext, processId: string, input: ApproveInput): Promise<ReleaseDto | null> {
  try {
    const body: Record<string, unknown> = {};
    if (input.authorityReference?.trim()) body.authority_reference = input.authorityReference.trim();
    if (input.authorityNote?.trim()) body.authority_note = input.authorityNote.trim();
    const response = await apiRequest<unknown>(releasePath(processId, "/approve"), { ...context, method: "POST", body });
    return adaptReleaseData(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST /release/consume (impound:transition) — salto B: consuma a liberação (I5 real). 409 IMPOUND_GUARD_FAILED
// (5 reasons) → PT-BR; o painel recarrega o dossiê (a UI é hint, o backend enforça).
export async function consumeRelease(context: ReleaseApiContext, processId: string): Promise<ReleaseView | null> {
  try {
    const response = await apiRequest<unknown>(releasePath(processId, "/consume"), { ...context, method: "POST", body: {} });
    return adaptReleaseView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST /release/for-repair/start (impound:transition) — art. 271 §2º. Idempotente-para-frente: 1ª chamada MONTA o
// dossiê FOR_REPAIR (repair_deadline ≤60d); 2ª (dossiê pronto) dispara a SAÍDA. 409 repair_deadline_invalid → PT-BR.
export async function startForRepair(context: ReleaseApiContext, processId: string, input: ForRepairInput = {}): Promise<ReleaseView | null> {
  try {
    const body = toRecipientBody(input);
    if (input.repairDeadline?.trim()) body.repair_deadline = input.repairDeadline.trim();
    const response = await apiRequest<unknown>(releasePath(processId, "/for-repair/start"), { ...context, method: "POST", body });
    return adaptReleaseView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST /release/for-repair/return (impound:transition) — retorno do reparo (RELEASED_FOR_REPAIR→ACTIVE_CUSTODY).
export async function returnFromRepair(context: ReleaseApiContext, processId: string): Promise<ReleaseView | null> {
  try {
    const response = await apiRequest<unknown>(releasePath(processId, "/for-repair/return"), { ...context, method: "POST", body: {} });
    return adaptReleaseView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST /impound-processes/:id/charges/settle (charging:settle) — QUITAÇÃO manual (SEM PSP/PIX, D-Ω5P-07). A
// aritmética/reconciliação vive no backend; a UI só exibe o resultado (settledTotal/estornoCount).
export async function settleCharges(context: ReleaseApiContext, processId: string): Promise<SettleResult> {
  try {
    const response = await apiRequest<unknown>(`/impound-processes/${encodeURIComponent(processId)}/charges/settle`, {
      ...context,
      method: "POST",
      body: {},
    });
    return adaptSettleResult(response);
  } catch (error) {
    rethrow(error);
  }
}

// Corpo em snake_case (contrato REST do backend — release.service.ts). Só campos preenchidos.
function toRecipientBody(input: RecipientInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.recipientName?.trim()) body.recipient_name = input.recipientName.trim();
  if (input.recipientDocument?.trim()) body.recipient_document = input.recipientDocument.trim();
  if (input.recipientRelationship) body.recipient_relationship = input.recipientRelationship;
  return body;
}
