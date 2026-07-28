// Ω5P PR-16 — PortalAccessLog: trilha probatória IMUTÁVEL de TODO acesso à superfície pública (I10). §2.8/RN-POR-02:
// NUNCA placa/Renavam/IP CRUS — só o HMAC (query_fingerprint/ip_hash). NUNCA servido em resposta pública (o
// `outcome` interno FACTOR_MISMATCH×NOT_FOUND fica SÓ aqui — a resposta é uniforme).

// Qual portal originou o acesso (o owner é PR-16; o authority entra em PR-18 reusando a MESMA tabela).
export const PORTAL_NAMES = ["OWNER", "AUTHORITY"] as const;
export type PortalName = (typeof PORTAL_NAMES)[number];

// Qual operação. CHALLENGE_ISSUED = emissão de PoW; LOOKUP = tentativa de consulta.
export const PORTAL_ACTIONS = ["CHALLENGE_ISSUED", "LOOKUP"] as const;
export type PortalAction = (typeof PORTAL_ACTIONS)[number];

// Desfecho INTERNO (NUNCA exposto). ISSUED = desafio emitido; FOUND/NOT_FOUND/FACTOR_MISMATCH = resultado da
// consulta (os dois últimos são UNIFORMES na resposta); RATE_LIMITED/CHALLENGE_FAILED = barreiras anti-abuso.
export const PORTAL_OUTCOMES = [
  "ISSUED",
  "FOUND",
  "NOT_FOUND",
  "FACTOR_MISMATCH",
  "RATE_LIMITED",
  "CHALLENGE_FAILED",
] as const;
export type PortalOutcome = (typeof PORTAL_OUTCOMES)[number];

export type AppendPortalAccessLogInput = {
  readonly tenantId: string;
  readonly portal: PortalName;
  readonly action: PortalAction;
  readonly outcome: PortalOutcome;
  readonly processId?: string; // só FOUND (FK composta tenant-first RESTRICT — I9)
  readonly queryFingerprint?: string; // HMAC(placa‖Renavam) — só quando há 2 fatores (LOOKUP)
  readonly ipHash: string; // HMAC(ip) — nunca IP cru
  readonly userAgent?: string; // truncado; nunca campo sensível
  readonly sessionId?: string;
  readonly occurredAt: Date;
};

export type PortalAccessLogRow = {
  readonly id: string;
  readonly tenantId: string;
  readonly portal: PortalName;
  readonly action: PortalAction;
  readonly outcome: PortalOutcome;
  readonly processId?: string;
  readonly queryFingerprint?: string;
  readonly ipHash: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly occurredAt: Date;
  readonly createdAt: Date;
};

// APPEND-ONLY por construção: a interface NÃO expõe update/delete (o trigger do banco é o belt estrutural).
export interface PortalAccessLogRepository {
  append(input: AppendPortalAccessLogInput): Promise<void>;
}
