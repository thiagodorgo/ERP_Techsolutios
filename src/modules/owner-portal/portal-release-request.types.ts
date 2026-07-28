// Ω5P PR-17 — PortalReleaseRequest: registro da INTENÇÃO de liberação originada pelo proprietário no owner-portal
// (Res. 1025 arts. 23-24). NÃO é a liberação (I5 = ImpoundRelease, dossiê + aprovação da autoridade in-system): é
// só o pedido — uma fila para o operador/autoridade tratar no console. SEM upload de binário público (CORTE PR-17).
// Enums em INGLÊS validados na APP; labels PT-BR no console. Idempotência = partial-unique (tenant,process) WHERE
// status IN (PENDING,IN_REVIEW): no máximo 1 pedido ABERTO por processo (anti-spam).

export const PORTAL_RELEASE_REQUEST_STATUSES = ["PENDING", "IN_REVIEW", "SCHEDULED", "DISMISSED"] as const;
export type PortalReleaseRequestStatus = (typeof PORTAL_RELEASE_REQUEST_STATUSES)[number];

export const PORTAL_RELEASE_REQUEST_ORIGINS = ["PORTAL_OWNER"] as const;
export type PortalReleaseRequestOrigin = (typeof PORTAL_RELEASE_REQUEST_ORIGINS)[number];

export type CreatePortalReleaseRequestInput = {
  readonly tenantId: string;
  readonly processId: string; // SEMPRE da sessão JWE verificada — nunca do corpo/query
  readonly note?: string; // nota curta sanitizada/limitada (§2.8: texto livre sem PII exigida)
  readonly sessionRef?: string; // referência OPACA da sessão (HMAC, nunca a JWE crua)
  readonly requestedAt: Date;
};

// A resposta ao portal é SEMPRE genérica ({received:true}) — `created` é interno (idempotência: false = já havia
// pedido aberto). O portal nunca revela se criou ou não (não confirma/nega existência do processo).
export type CreatePortalReleaseRequestResult = { readonly created: boolean };

export interface PortalReleaseRequestRepository {
  // Cria um pedido PENDING SE não houver nenhum ABERTO (PENDING/IN_REVIEW) para o processo. Idempotente/race-safe
  // (o partial-unique é a barreira final; 23505 → created:false). NUNCA lança por corrida.
  createIfNoneOpen(input: CreatePortalReleaseRequestInput): Promise<CreatePortalReleaseRequestResult>;
}
