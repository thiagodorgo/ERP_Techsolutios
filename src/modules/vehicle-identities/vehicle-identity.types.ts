import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type VehicleIdentityActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω-VID PR-02 — enum completo (banco: CHECK third_party_vehicle_identities_confidence_chk, 3 valores fechados).
// PROVISIONAL/CONFIRMED são graváveis por este CRUD; MERGED só é atingível pelo fluxo de merge (PR-04, fora de
// escopo desta fatia — este módulo NUNCA grava MERGED nem canonical_identity_id).
export const CONFIDENCE_LEVELS = ["PROVISIONAL", "CONFIRMED", "MERGED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// Subconjunto graváveis por este módulo (create/patch). MERGED fica de fora — só o merge manual (PR-04) o atinge,
// sempre acompanhado de canonical_identity_id (CHECK merge_chk) e do registro em ThirdPartyVehicleIdentityMergeEvent.
export const WRITABLE_CONFIDENCE_LEVELS = ["PROVISIONAL", "CONFIRMED"] as const satisfies readonly ConfidenceLevel[];
export type WritableConfidenceLevel = (typeof WRITABLE_CONFIDENCE_LEVELS)[number];

export type VehicleIdentity = {
  readonly id: string;
  readonly tenantId: string;
  readonly plateRaw?: string;
  readonly plateKey?: string;
  readonly chassis?: string;
  readonly renavamKey?: string;
  readonly brand?: string;
  readonly model?: string;
  readonly color?: string;
  readonly year?: number;
  readonly unidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly confidence: ConfidenceLevel;
  // Só preenchido por MERGED (fora de escopo de escrita deste módulo — pode existir se outra fatia/PR já
  // mesclou a linha; este CRUD apenas o LÊ, nunca o escreve).
  readonly canonicalIdentityId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateVehicleIdentityInput = {
  readonly tenantId: string;
  readonly plateRaw?: string;
  readonly plateKey?: string;
  readonly chassis?: string;
  readonly renavamKey?: string;
  readonly brand?: string;
  readonly model?: string;
  readonly color?: string;
  readonly year?: number;
  readonly unidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly confidence?: WritableConfidenceLevel;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateVehicleIdentityInput = {
  readonly tenantId: string;
  readonly identityId: string;
  readonly plateRaw?: string | null;
  readonly plateKey?: string | null;
  readonly chassis?: string | null;
  readonly renavamKey?: string | null;
  readonly brand?: string | null;
  readonly model?: string | null;
  readonly color?: string | null;
  readonly year?: number | null;
  readonly unidentified?: boolean;
  readonly unidentifiedReason?: string | null;
  readonly confidence?: WritableConfidenceLevel;
  readonly updatedBy?: string;
};

export type ListVehicleIdentityInput = {
  readonly tenantId: string;
  readonly confidence?: ConfidenceLevel;
  readonly plateKey?: string;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListVehicleIdentityResult = {
  readonly items: readonly VehicleIdentity[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

// Ω-VID PR-04 — merge manual (§Parte A). targetId/mergedIdentityId são os ids CRUS recebidos da API (a
// resolução transitiva do alvo — se targetId já estiver MERGED e apontar adiante — acontece dentro do
// repositório, numa ÚNICA transação; ver mergeIdentities). O SOURCE (mergedIdentityId) NUNCA é resolvido
// transitivamente: se já está MERGED, é rejeição direta (merge_source_already_merged).
export type MergeIdentitiesInput = {
  readonly tenantId: string;
  readonly targetId: string;
  readonly mergedIdentityId: string;
  readonly reason: string;
  readonly actorId?: string;
};

export type MergeIdentitiesResult = {
  // Identidade viva que efetivamente recebeu os processos (após resolução transitiva do alvo, se aplicável).
  readonly resolvedTargetId: string;
  readonly target: VehicleIdentity;
  // A identidade SOURCE, já com confidence=MERGED e canonicalIdentityId=resolvedTargetId.
  readonly merged: VehicleIdentity;
  readonly movedProcessCount: number;
};

// Ω-VID PR-04 — estorno administrativo (§Parte B). NÃO reverte ImpoundProcess.identity_id movidos pelo merge
// original (não é possível reconstruir com segurança "quais eram originais" sem o snapshot completo do estado
// de todos os processos — fora de escopo; ver limitação documentada em vehicle-identity.service.ts).
export type UnmergeIdentityInput = {
  readonly tenantId: string;
  readonly identityId: string;
  readonly reason: string;
  readonly actorId?: string;
};

export type UnmergeIdentityResult = {
  readonly identity: VehicleIdentity;
  // O id da identidade da qual esta estava mesclada (canonical_identity_id ANTES do estorno) — para o cliente
  // saber a quem avisar sobre a separação (não é gravado de volta em canonicalIdentityId, que fica NULL).
  readonly previousCanonicalIdentityId: string;
  // Ω-VID PR-04 rework (item 4 da junta de revisão): quantos ImpoundProcess o merge original MOVEU para o alvo e
  // que este estorno NÃO devolve (limitação documentada). A identidade volta VAZIA — o admin precisa ser avisado
  // de que há N processos "órfãos" desta identidade que continuam apontando para o alvo. Vem do snapshot_before
  // (movedProcessCount) do MergeEvent de MERGE mais recente desta identidade; 0 quando o merge não moveu nada ou
  // o snapshot legado não guardava a contagem.
  readonly strandedProcessCount: number;
};

// Ω-VID PR-05 — semeadura da identidade AGREGADORA na criação do processo de custódia (sweep). É um efeito-de-
// domínio SISTEMA (created_by NULL), executado DENTRO da transação do impound (this.client já é o
// Prisma.TransactionClient sob RLS) — nunca re-checa permissão de vehicle_identity. Só campos DESCRITIVOS do
// veículo entram no seed; o identificador forte (placa) vira plate_key só no ramo por-placa.
export type VehicleIdentitySeed = {
  readonly plateRaw?: string;
  readonly brand?: string;
  readonly model?: string;
  readonly color?: string;
  readonly year?: number;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

// Ramo "placa plausível": RESOLVE (reusa a identidade ATIVA mais antiga da mesma placa) OU CRIA
// PROVISIONAL/unidentified=false/plate_key. A query de reuso é BYTE-IDÊNTICA à do backfill (PR-03) — sweep e
// backfill convergem na MESMA identidade agregadora ao longo do tempo (dossiê por veículo).
export type ResolveIdentityByPlateKeyInput = {
  readonly tenantId: string;
  readonly plateKey: string;
  readonly seed?: VehicleIdentitySeed;
};

// Ramo "sem placa plausível" (lixo/vazio): cria PROVISIONAL/unidentified=true com reason neutro (satisfaz
// third_party_vehicle_identities_identity_chk). NUNCA copia placa/chassi/renavam (espelha o backfill —
// não reabre a ambiguidade unidentified_conflicts_with_identifier fechada no PR-02).
export type CreateProvisionalUnidentifiedInput = {
  readonly tenantId: string;
  readonly unidentifiedReason: string;
  readonly seed?: VehicleIdentitySeed;
};

export type ResolveIdentityResult = {
  readonly id: string;
  // true quando reusou uma identidade pré-existente (placa já vista); false quando fundou uma nova.
  readonly reused: boolean;
};

export class VehicleIdentityError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "VehicleIdentityError";
  }
}
