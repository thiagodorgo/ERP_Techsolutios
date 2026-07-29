// Ω5P PR-16 — PortalAccessLog: trilha probatória IMUTÁVEL de TODO acesso à superfície pública (I10). §2.8/RN-POR-02:
// NUNCA placa/Renavam/IP CRUS — só o HMAC (query_fingerprint/ip_hash). NUNCA servido em resposta pública (o
// `outcome` interno FACTOR_MISMATCH×NOT_FOUND fica SÓ aqui — a resposta é uniforme).

// Qual portal originou o acesso (o owner é PR-16; o authority entra em PR-18 reusando a MESMA tabela).
export const PORTAL_NAMES = ["OWNER", "AUTHORITY"] as const;
export type PortalName = (typeof PORTAL_NAMES)[number];

// Qual operação. CHALLENGE_ISSUED = emissão de PoW; LOOKUP = tentativa de consulta.
// Ω5P PR-17 (aditivo): DOSSIER_VIEWED = leitura do dossiê detalhado (exige sessão JWE); RELEASE_REQUESTED =
// registro da intenção de liberação. A migração 20260848000000 alarga o CHECK de action da tabela (aditivo).
// Ω5P PR-18a (aditivo): LOGIN = tentativa de login do authority-portal (superfície CREDENCIADA). A migração
// 20260849000000 alarga o CHECK de action (+LOGIN, aditivo/não-destrutivo).
// Ω5P PR-18b (aditivo): REMOVAL_REQUESTED = solicitação de remoção originada pela autoridade credenciada (I10:
// quem solicitou — credencial fingerprintada, de onde — ip_hash, quando). A migração 20260850000000 alarga o
// CHECK de action (+REMOVAL_REQUESTED, aditivo/não-destrutivo). process_id sempre NULL (§2.8: nunca a OS/processo).
export const PORTAL_ACTIONS = ["CHALLENGE_ISSUED", "LOOKUP", "DOSSIER_VIEWED", "RELEASE_REQUESTED", "LOGIN", "REMOVAL_REQUESTED"] as const;
export type PortalAction = (typeof PORTAL_ACTIONS)[number];

// Desfecho INTERNO (NUNCA exposto). ISSUED = desafio emitido; FOUND/NOT_FOUND/FACTOR_MISMATCH = resultado da
// consulta (os dois últimos são UNIFORMES na resposta); RATE_LIMITED/CHALLENGE_FAILED = barreiras anti-abuso.
// Ω5P PR-17 (aditivo): AUTHORIZED = ação autorizada pela sessão JWE (dossiê lido / liberação registrada);
// SESSION_INVALID = sessão ausente/expirada/forjada/audience-errada (rejeição uniforme 401, sem oráculo).
// Ω5P PR-18a (aditivo): AUTHENTICATED = login OK (sessão authority emitida); CREDENTIAL_INVALID = username
// inexistente ∨ senha errada ∨ status≠ACTIVE (UNIFORME na resposta 401, sem oráculo); LOCKED = credencial em
// lockout (locked_until>now). Os três últimos são INTERNOS: a RESPOSTA do login é a MESMA para todos (§2.8).
export const PORTAL_OUTCOMES = [
  "ISSUED",
  "FOUND",
  "NOT_FOUND",
  "FACTOR_MISMATCH",
  "RATE_LIMITED",
  "CHALLENGE_FAILED",
  "AUTHORIZED",
  "SESSION_INVALID",
  "AUTHENTICATED",
  "CREDENTIAL_INVALID",
  "LOCKED",
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
