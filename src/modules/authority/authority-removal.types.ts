// Ω5P PR-18b — AuthorityRemovalRequest: registro da SOLICITAÇÃO de remoção originada pela AUTORIDADE credenciada no
// authority-portal (CTB art.269; Res. CONTRAN 1025/2026 art.9º-I identificação da autoridade + art.14 Termo). NÃO é
// a custódia (I1 = ImpoundProcess, aberto SÓ na CONCLUSÃO da OS pelo operador de campo): é o PEDIDO — que ORIGINA
// uma WorkOrder(open) quando o catálogo de remoção do tenant resolve (D-Ω5P-AUTH-06), ou fica ENFILEIRADA
// (work_order_id NULL) para o console despachar. A autoria vem SEMPRE do credential_id da SESSÃO (nunca do corpo —
// anti-spoof do órgão); o nome do órgão NÃO entra na OS (white-label neutra). §2.8: a resposta é genérica
// ({received:true}) para {originada, enfileirada, duplicada} — sem oráculo. Idempotência/anti-spam = índice PARCIAL
// único (tenant, plate) WHERE status='OPEN': no máx. 1 solicitação ABERTA por placa.

export const AUTHORITY_REMOVAL_STATUSES = ["OPEN", "DISPATCHED", "CANCELLED"] as const;
export type AuthorityRemovalStatus = (typeof AUTHORITY_REMOVAL_STATUSES)[number];

// Contexto de CONSUMO resolvido sob RLS (D-Ω5P-AUTH-07): a credencial da sessão + o catálogo de remoção do tenant.
// status re-checado ANTES de qualquer escrita (uma credencial revogada com JWE ainda válida NÃO origina remoção).
// removalServiceCatalogId (D-Ω5P-AUTH-06, fail-closed): o id do ÚNICO service_catalog ATIVO com custody_profile_id
// IS NOT NULL — `null` quando há 0 ou ≥2 (a solicitação fica ENFILEIRADA, sem OS; NUNCA se chuta um catálogo).
export type AuthorityConsumptionContext = {
  readonly status: string; // ACTIVE | SUSPENDED | REVOKED (o serviço exige ACTIVE)
  readonly authorityName: string; // nome do ÓRGÃO — NUNCA entra na OS (só existe para trilha/labels internas)
  readonly removalServiceCatalogId: string | null;
};

// Porta de CONSUMO ESTREITA (NÃO o repositório cheio): resolve a credencial (status/nome) + o catálogo de remoção
// do tenant sob RLS, a partir do credentialId da SESSÃO. undefined = credencial inexistente NAQUELE tenant.
export interface AuthorityRemovalConsumptionPort {
  findConsumptionContext(tenantId: string, credentialId: string): Promise<AuthorityConsumptionContext | undefined>;
}

// Entrada da escrita ATÔMICA (1 tx sob RLS): INSERT da solicitação (OPEN) + (catálogo resolvido → origina a
// WorkOrder na MESMA tx + UPDATE work_order_id). plate SEMPRE normalizada (chave anti-spam). credentialId SEMPRE
// da sessão. removalServiceCatalogId null ⇒ fila-pura (sem OS).
export type CreateAuthorityRemovalInput = {
  readonly tenantId: string;
  readonly credentialId: string; // da SESSÃO JWE verificada — nunca do corpo (anti-spoof do órgão)
  readonly plate: string; // normalizada (maiúsculas/alfanumérica)
  readonly legalBasis?: string; // fundamento legal (art.14 do Termo); texto curto sanitizado
  readonly locationNote?: string; // local do bem (art.14); texto curto sanitizado (§2.8: sem PII do proprietário)
  readonly sessionRef?: string; // ref OPACA da sessão (HMAC truncado; NUNCA a JWE crua)
  readonly removalServiceCatalogId: string | null; // resolvido server-side; null ⇒ enfileirada (sem OS)
  readonly requestedAt: Date;
};

// Desfecho INTERNO da escrita (a resposta pública é SEMPRE genérica). created:false = já havia uma solicitação
// ABERTA para a placa (duplicata, 23505 engolido — nada extra criado). originated = a OS foi aberta (catálogo
// resolvido); workOrderId só para leitura de teste (NUNCA vai à resposta pública — §2.8).
export type CreateAuthorityRemovalResult = {
  readonly created: boolean;
  readonly originated: boolean;
  readonly workOrderId?: string;
};

// Porta de ESCRITA (memory×prisma). NÃO lança por corrida: a partial-unique é a barreira final (23505 →
// created:false). A origem da OS (quando há catálogo) é atômica com o INSERT — 1 só tx.
export interface AuthorityRemovalRepository {
  createRemoval(input: CreateAuthorityRemovalInput): Promise<CreateAuthorityRemovalResult>;
}
