// Ω5P PR-19 — a autoridade credenciada APROVA/REJEITA a liberação in-system, SÓ nos processos que ela PRÓPRIA
// originou (D-Ω5P-AUTH-08: vinculação por PROVENIÊNCIA — AuthorityRemovalRequest.credential_id → work_order_id →
// ImpoundProcess.service_order_id — nunca "qualquer processo do tenant", nunca authority_case_number/
// origin_agent_name/origin_authority, textos livres spoofáveis/neutros). APPROVE grava a decisão + reusa
// release.repository.approve() (D-Ω5P-AUTH-09: soma-se ao stand-in release:approve, não o substitui). REJECT NÃO
// muda ImpoundRelease — a FSM existente não tem status REJECTED (D-Ω5P-AUTH-10); só grava a decisão formal
// append-only em release_authority_decisions.

export const RELEASE_DECISION_KINDS = ["APPROVE", "REJECT"] as const;
export type ReleaseDecisionRequestKind = (typeof RELEASE_DECISION_KINDS)[number];

export const RELEASE_DECISIONS = ["APPROVED", "REJECTED"] as const;
export type ReleaseDecisionOutcome = (typeof RELEASE_DECISIONS)[number];

// Item da fila (GET /portal/v1/authority/approvals) — resposta MINIMIZADA (§2.8/RN-POR-02): NUNCA tenant_id, NUNCA
// id interno de custódia (releaseId fica de fora da resposta pública — só processId, o identificador que o próprio
// fluxo da autoridade já conhece). vehiclePlate: só a placa (dado do BEM, não do proprietário).
export type PendingApproval = {
  readonly processId: string;
  readonly releaseId: string; // uso INTERNO (join com decide) — o controller filtra antes de responder
  readonly kind: string; // STANDARD | FOR_REPAIR
  readonly vehiclePlate?: string;
  readonly requestedAt: Date;
  readonly pendingRequirements: readonly string[]; // codes ainda não satisfeitos (informativo)
};

// A liberação vinculada e ATIVA (IN_PROGRESS|AUTHORIZED) do processo — resolvida SOMENTE quando a proveniência
// (D-08) bate. `alreadyApproved` habilita a idempotência do APPROVE e bloqueia REJECT pós-aprovação (409, não é
// enumeração: o vínculo já foi provado; é conflito de estado).
export type LinkedRelease = {
  readonly releaseId: string;
  readonly alreadyApproved: boolean;
};

export type RecordApprovalInput = {
  readonly tenantId: string;
  readonly releaseId: string;
  readonly credentialId: string;
  readonly reference?: string;
  readonly note?: string;
  readonly occurredAt: Date;
};

export type RecordRejectionInput = {
  readonly tenantId: string;
  readonly releaseId: string;
  readonly credentialId: string;
  readonly note: string; // OBRIGATÓRIA (validada no controller/validator — 400 se ausente)
  readonly occurredAt: Date;
};

export interface AuthorityReleaseApprovalRepository {
  // Fila PENDENTE (status IN_PROGRESS && authority_approved_at IS NULL), vinculada à credencial (D-08).
  listPendingApprovals(tenantId: string, credentialId: string): Promise<readonly PendingApproval[]>;
  // Resolve o vínculo (D-08) para 1 processId — undefined = sem vínculo OU sem release ATIVA (404 uniforme).
  findLinkedRelease(tenantId: string, credentialId: string, processId: string): Promise<LinkedRelease | undefined>;
  // 1 tx: INSERT release_authority_decisions(APPROVED) + release.repository.approve() (reusado tal-qual).
  recordApproval(input: RecordApprovalInput): Promise<void>;
  // 1 tx: INSERT release_authority_decisions(REJECTED). ImpoundRelease intacto (D-10).
  recordRejection(input: RecordRejectionInput): Promise<void>;
}

export class AuthorityReleaseApprovalError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthorityReleaseApprovalError";
  }
}
