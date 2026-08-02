// Ω5P PR-08a — Processos de custódia (console do operador). Lista + dossiê (timeline/selo de integridade/
// vistoria) + movimentação de vaga. Consome os módulos backend `impound` (PR-05), recepção/vistoria (PR-06),
// `yard` (PR-01). A UI NÃO reimplementa regra (FSM, cadeia de hash, ocupação I1 vivem no backend) — molda/exibe
// e delega ao 403/409/422. Neutralidade white-label: "Processo de custódia / Autoridade solicitante / Órgão /
// Pátio / Vaga / Vistoria / Bloqueio judicial", NUNCA "polícia" nem termo técnico ("tenant"). §allowlist:
// tenant_id NUNCA é dado renderizado; prevHash/hash/headHash são PROVA (exibíveis, truncados p/ leitura).

// Enums em inglês (código/claims); rótulo PT-BR vem do backend em *Label (a UI reusa, não recria). App-validados.
export type ImpoundStatus =
  | "IN_REMOVAL"
  | "RECEPTION"
  | "ACTIVE_CUSTODY"
  | "RELEASE_IN_PROGRESS"
  | "RELEASED_FOR_REPAIR"
  | "RELEASED"
  | "AUCTION_ELIGIBLE"
  | "AUCTION_PREP"
  | "LOTTED"
  | "AUCTIONED"
  | "AUCTION_CLOSED"
  | "DIRECT_RECYCLING"
  | "JUDICIAL_HOLD"
  | "CLOSED";

export type CustodyEventType =
  | "RECEPTION"
  | "INSPECTION"
  | "SPOT_ASSIGNED"
  | "SPOT_MOVED"
  | "YARD_TRANSFER"
  | "PHOTO_SET"
  | "CHARGE_ACCRUAL"
  | "NOTIFICATION"
  | "STATUS_CHANGE"
  | "RELEASE"
  | "AUCTION_PREP"
  | "AUCTION_LOTTED"
  | "AUCTION_SOLD"
  | "AUCTION_CLOSED"
  | "ADJUSTMENT";

export type SignatureStatus = "SIGNED" | "REFUSED" | "ABSENT";

// Item da lista (subconjunto exposto por GET /impound-processes — impound.dto.ts toImpoundProcessListDto).
export type ProcessListItem = {
  readonly id: string;
  readonly vehiclePlate: string | null;
  readonly vehicleUnidentified: boolean;
  readonly yardId: string | null;
  readonly profileId: string;
  readonly status: ImpoundStatus;
  readonly statusLabel: string;
  readonly enteredAt: string | null;
  readonly frozenAt: string | null;
  readonly originAuthority: string;
  readonly custodySeqHead: number;
  readonly createdAt: string;
};

// Detalhe completo (GET /impound-processes/:id — impound.dto.ts toImpoundProcessDto).
export type ProcessDetail = ProcessListItem & {
  readonly vehicleChassis: string | null;
  readonly vehicleRenavam: string | null;
  readonly vehicleBrand: string | null;
  readonly vehicleModel: string | null;
  readonly vehicleColor: string | null;
  readonly vehicleYear: number | null;
  readonly unidentifiedReason: string | null;
  readonly originAgentName: string | null;
  readonly authorityCaseNumber: string | null;
  readonly incidentReportNumber: string | null;
  readonly legalBasis: string | null;
  readonly serviceOrderId: string | null;
  readonly custodyHashHead: string | null;
  readonly updatedAt: string;
};

// Evento da cadeia de custódia (I2) — hashes/seq/prev_hash são PROVA (exibíveis). payload = dado do evento.
export type CustodyEventItem = {
  readonly id: string;
  readonly seq: number;
  readonly type: CustodyEventType;
  readonly typeLabel: string;
  readonly payload: Record<string, unknown> | null;
  readonly occurredAt: string;
  readonly actorId: string | null;
  readonly prevHash: string | null;
  readonly hash: string | null;
  readonly createdAt: string;
};

// Verificação da cadeia (I2): valid=cadeia íntegra; brokenAt=seq do evento onde a adulteração foi detectada.
export type VerifyResult = {
  readonly processId: string;
  readonly valid: boolean;
  readonly eventCount: number;
  readonly headHash: string | null;
  readonly brokenAt: number | null;
  readonly checkedAt: string;
};

// Vistoria de recepção (art. 14 §1º) — leitura. §2.8: fileUrl é o único link de mídia (console autenticado).
export type InspectionPhotoItem = {
  readonly id: string;
  readonly set: string;
  readonly fileUrl: string;
  readonly status: string;
  readonly createdAt: string;
};

export type InspectionData = {
  readonly id: string;
  readonly processId: string;
  readonly inspectedAt: string;
  readonly agentName: string | null;
  readonly bodyworkState: string | null;
  readonly paintState: string | null;
  readonly tiresState: string | null;
  readonly internalObjects: string | null;
  readonly missingEquipment: string | null;
  readonly odometerKm: string | null;
  readonly observations: string | null;
  readonly signerName: string | null;
  readonly signatureStatus: SignatureStatus;
  readonly signatureStatusLabel: string;
  readonly signedAt: string | null;
  readonly completedAt: string | null;
};

// null quando não há vistoria registrada (404 IMPOUND_INSPECTION_NOT_FOUND → EmptyState honesto).
export type InspectionView = {
  readonly inspection: InspectionData;
  readonly photos: InspectionPhotoItem[];
  readonly requiredSets: string[];
  readonly complete: boolean;
} | null;

export type ProcessesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type ProcessesSource = "api" | "mock" | "fallback";

export type ProcessesData = {
  readonly items: ProcessListItem[];
  readonly pagination: ProcessesPagination;
  readonly source: ProcessesSource;
  readonly fallbackReason?: string;
};

// Filtro de estado da dense-list ("all" ou um dos 14 estados). Vocabulário PT-BR vem do backend em statusLabel.
export type ProcessStatusFilter = "all" | ImpoundStatus;

export type ProcessesFilters = {
  readonly status: ProcessStatusFilter;
  readonly yardId: string;
  readonly plate: string;
  readonly limit?: number;
};

export type ProcessesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação manual MÍNIMA (R3): identidade + origin_authority (req) + profile_id (req) + yard_id (opcional).
// D-Ω5P-09: bem não identificado exige justificativa (unidentifiedReason). O processo nasce IN_REMOVAL.
export type ProcessCreatePayload = {
  readonly profileId: string;
  readonly originAuthority: string;
  readonly yardId?: string;
  readonly vehiclePlate?: string;
  readonly vehicleChassis?: string;
  readonly vehicleRenavam?: string;
  readonly vehicleBrand?: string;
  readonly vehicleModel?: string;
  readonly vehicleColor?: string;
  readonly vehicleYear?: number;
  readonly vehicleUnidentified?: boolean;
  readonly unidentifiedReason?: string;
  readonly originAgentName?: string;
  readonly authorityCaseNumber?: string;
  readonly incidentReportNumber?: string;
  readonly legalBasis?: string;
};

export type ProcessCreateField =
  | "profileId"
  | "originAuthority"
  | "vehiclePlate"
  | "unidentifiedReason";

export type ProcessCreateFieldError = {
  readonly field: ProcessCreateField;
  readonly message: string;
};

// Ω-VID PR-08 — resumo ESTREITO de uma ChecklistRun vinculada ao processo (aba "Checklist do Guincho" do dossiê).
// §allowlist: espelha EXATAMENTE o DTO backend toChecklistRunSummaryListDto — sem hash-chain, sem tenant_id, sem PII;
// só o metadado que o guincheiro já enxerga. Consome o AUTO-link criado na criação do processo (PR-05).
export type ChecklistRunStatus =
  | "in_progress"
  | "completed"
  | "completed_with_divergence"
  | "pending_acknowledgement"
  | "cancelled";

export type ChecklistRunSummaryItem = {
  readonly id: string;
  readonly templateId: string;
  // Ω-VID PR-08 — nome do formulário (rótulo público que o guincheiro já vê no app) → identidade da linha na aba
  // do dossiê. null quando o backend não resolve o nome (a UI cai no rótulo genérico).
  readonly templateName: string | null;
  readonly templateVersion: number;
  readonly status: ChecklistRunStatus;
  readonly relatedEntityType: string | null;
  readonly relatedEntityId: string | null;
  readonly startedAt: string;
  readonly completedAt: string | null;
};

// Ω-VID PR-09 — item do Histórico de Custódias: uma passagem do MESMO veículo (identidade) pelo pátio. §allowlist:
// espelha o DTO estreito toCustodyHistoryListDto — sem tenant_id/identity_id/hash. `status` é o enum (a UI aplica
// rótulo/tom PT-BR). `isCurrent` marca o processo que o dossiê está exibindo.
export type CustodyHistoryItem = {
  readonly id: string;
  readonly vehiclePlate: string | null;
  readonly vehicleUnidentified: boolean;
  readonly status: string;
  readonly enteredAt: string | null;
  readonly yardName: string | null;
  readonly isCurrent: boolean;
};
