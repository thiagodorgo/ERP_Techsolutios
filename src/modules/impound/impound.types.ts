import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type ImpoundActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-05 — enums em INGLÊS validados na APP (sem CHECK de enum no banco). Labels PT-BR ficam no DTO.
// Máquina de estados §4.2 (14 estados). Mapeamento PT→EN em impound.dto.ts.
export const IMPOUND_STATUSES = [
  "IN_REMOVAL",
  "RECEPTION",
  "ACTIVE_CUSTODY",
  "RELEASE_IN_PROGRESS",
  "RELEASED_FOR_REPAIR",
  "RELEASED",
  "AUCTION_ELIGIBLE",
  "AUCTION_PREP",
  "LOTTED",
  "AUCTIONED",
  "AUCTION_CLOSED",
  "DIRECT_RECYCLING",
  "JUDICIAL_HOLD",
  "CLOSED",
] as const;
export type ImpoundStatus = (typeof IMPOUND_STATUSES)[number];

// Tipos de evento de custódia (closed union). Os subtipos de leilão são declarados AGORA só p/ os PRs donos
// (PR-12/13) os USAREM — aditivo-friendly. Em PR-05 o serviço só EMITE STATUS_CHANGE (abertura + transição) e
// SPOT_ASSIGNED (via assignSpot). Correção retroativa = novo evento ADJUSTMENT (NUNCA UPDATE/DELETE — I2).
export const CUSTODY_EVENT_TYPES = [
  "RECEPTION",
  "INSPECTION",
  "SPOT_ASSIGNED",
  "SPOT_MOVED",
  "YARD_TRANSFER",
  "PHOTO_SET",
  "CHARGE_ACCRUAL",
  "NOTIFICATION",
  "STATUS_CHANGE",
  "RELEASE",
  // Ω5P PR-10a — SETTLEMENT: registro do ATO DE QUITAÇÃO (settled_*) na cadeia hash (I2). type é TEXT livre no
  // banco; a union é a allowlist da APP. RELEASE já existia (consumação da liberação).
  "SETTLEMENT",
  "AUCTION_PREP",
  "AUCTION_LOTTED",
  "AUCTION_SOLD",
  "AUCTION_CLOSED",
  // Ω5P PR-14a — AUCTION_SETTLEMENT: registro da LIQUIDAÇÃO em cascata §6º (I7) na cadeia hash. type é TEXT livre
  // no banco; a union é a allowlist da APP. Aditivo (mesmo padrão dos AUCTION_* acima); PR-14a é o único que EMITE.
  "AUCTION_SETTLEMENT",
  "ADJUSTMENT",
] as const;
export type CustodyEventType = (typeof CUSTODY_EVENT_TYPES)[number];

// Valor JSON canonicalizável (money/km = string, nunca number; number só inteiro finito — ver hashchain).
export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

export type ImpoundProcess = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehiclePlate?: string;
  readonly vehicleChassis?: string;
  readonly vehicleRenavam?: string;
  readonly vehicleBrand?: string;
  readonly vehicleModel?: string;
  readonly vehicleColor?: string;
  readonly vehicleYear?: number;
  readonly vehicleUnidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly yardId?: string;
  readonly profileId: string;
  readonly status: ImpoundStatus;
  readonly enteredAt?: Date;
  readonly frozenAt?: Date;
  readonly originAuthority: string;
  readonly originAgentName?: string;
  readonly authorityCaseNumber?: string;
  readonly incidentReportNumber?: string;
  readonly legalBasis?: string;
  readonly serviceOrderId?: string;
  readonly custodySeqHead: number;
  readonly custodyHashHead?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CustodyEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly seq: number;
  readonly type: CustodyEventType;
  readonly payload: CanonicalValue;
  readonly occurredAt: Date;
  readonly actorId?: string;
  readonly prevHash: string;
  readonly hash: string;
  readonly createdAt: Date;
};

// Rascunho de evento (o que o serviço passa ao repositório; seq/prev_hash/hash são computados no append).
export type CustodyEventDraft = {
  readonly type: CustodyEventType;
  readonly payload: CanonicalValue;
  readonly occurredAt: Date;
  readonly actorId?: string;
};

export type CreateImpoundProcessInput = {
  readonly tenantId: string;
  readonly vehiclePlate?: string;
  readonly vehicleChassis?: string;
  readonly vehicleRenavam?: string;
  readonly vehicleBrand?: string;
  readonly vehicleModel?: string;
  readonly vehicleColor?: string;
  readonly vehicleYear?: number;
  readonly vehicleUnidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly yardId?: string;
  readonly profileId: string;
  readonly originAuthority: string;
  readonly originAgentName?: string;
  readonly authorityCaseNumber?: string;
  readonly incidentReportNumber?: string;
  readonly legalBasis?: string;
  readonly serviceOrderId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  // Evento de abertura (STATUS_CHANGE null→IN_REMOVAL) computado na MESMA tx do INSERT do processo.
  readonly openingEvent: CustodyEventDraft;
};

export type UpdateImpoundProcessInput = {
  readonly tenantId: string;
  readonly processId: string;
  // Metadado do bem/origem — NUNCA status/seq/head (a FSM é o único caminho de status).
  readonly vehiclePlate?: string | null;
  readonly vehicleChassis?: string | null;
  readonly vehicleRenavam?: string | null;
  readonly vehicleBrand?: string | null;
  readonly vehicleModel?: string | null;
  readonly vehicleColor?: string | null;
  readonly vehicleYear?: number | null;
  readonly originAgentName?: string | null;
  readonly authorityCaseNumber?: string | null;
  readonly incidentReportNumber?: string | null;
  readonly legalBasis?: string | null;
  readonly updatedBy?: string;
};

export type ListImpoundProcessInput = {
  readonly tenantId: string;
  readonly status?: ImpoundStatus;
  readonly yardId?: string;
  readonly profileId?: string;
  readonly plate?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListImpoundProcessResult = {
  readonly items: readonly ImpoundProcess[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

// Transição atômica: o serviço decide legalidade+guarda (impound.transitions.ts) e passa o expectedFrom +
// efeitos; o repositório aplica sob lock (FOR UPDATE) numa só tx com o append do STATUS_CHANGE.
export type ApplyTransitionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus;
  readonly to: ImpoundStatus;
  readonly setEnteredAt: boolean;
  readonly setFrozenAt: boolean;
  readonly event: CustodyEventDraft;
};

export type AppendEventInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly event: CustodyEventDraft;
};

// Ω5P PR-06 (F-1) — abertura de custódia pelo SWEEP em UMA ÚNICA tx: INSERT do processo (IN_REMOVAL) + evento de
// abertura + STATUS_CHANGE→RECEPTION (entered_at = completedAt = t0) + âncora. Atômico ⇒ nenhum half-open
// (IN_REMOVAL sem entered_at) pode nascer. occurredAt de AMBOS os eventos = completedAt (t0 = chegada, art. 21 §1º).
export type OpenFromRemovalInput = {
  readonly tenantId: string;
  readonly serviceOrderId: string;
  readonly profileId: string;
  readonly originAuthority: string;
  readonly unidentifiedReason: string;
  readonly completedAt: Date;
  readonly actorId?: string;
  // Ω-VID PR-05 — hints do veículo vindos de WorkOrder.service_details (todos OPCIONAIS — não quebram os ~15
  // test-callers). SEMEIAM a identidade AGREGADORA (ThirdPartyVehicleIdentity) na MESMA tx da abertura; o
  // PROCESSO segue vehicle_unidentified=true (a identidade dele é confirmada pela vistoria — D-Ω5P-REC-10).
  readonly vehiclePlate?: string;
  readonly vehicleBrand?: string;
  readonly vehicleModel?: string;
  readonly vehicleColor?: string;
};

// Ω5P PR-06 (I1 real) — alocação/vacância/movimentação ATÔMICA cross-módulo (yard+impound) numa ÚNICA tx:
// compõe a ocupação da vaga + o UPDATE de yard_id + o append do CustodyEvent. Falha de qualquer passo → rollback
// de tudo (elimina o vacate compensatório do PR-05). occurredAt = instante do evento na cadeia.
export type AssignSpotAtomicInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly spotId: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type VacateSpotAtomicInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly spotId: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type MoveSpotAtomicInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly fromSpotId: string;
  readonly toSpotId: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type AppendEventResult = {
  readonly process: ImpoundProcess;
  readonly event: CustodyEvent;
};

export class ImpoundError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ImpoundError";
  }
}
