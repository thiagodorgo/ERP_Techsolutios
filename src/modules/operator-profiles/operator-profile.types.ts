import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type OperatorProfileActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-c — Profissional (perfil profissional do operador de campo). Extensão 1-1 de User: chave natural
// [tenant_id, user_id] (409 duplicate_profile). Dado sensível LGPD — CNH e consentimento de rastreamento
// NUNCA entram na auditoria (allowlist estrita no controller). `user_id` é IMUTÁVEL (referência estável;
// omitido do UpdateInput). Desativação lógica via is_active=false (sem delete físico).
export type OperatorProfile = {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly fullName?: string;
  readonly cnhNumber?: string;
  readonly cnhCategory?: string;
  readonly cnhExpiresAt?: Date;
  readonly trackingConsent: boolean;
  readonly trackingConsentAt?: Date;
  readonly phone?: string;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListOperatorProfileInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly hasConsent?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListOperatorProfileResult = {
  readonly items: readonly OperatorProfile[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateOperatorProfileInput = Omit<
  OperatorProfile,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

// `userId` NÃO aparece aqui — vínculo com o User é imutável no update (referência estável 1-1).
// `trackingConsentAt` aceita null: null limpa o carimbo (consent revogado); undefined preserva o atual.
export type UpdateOperatorProfileInput = Partial<
  Pick<
    OperatorProfile,
    | "fullName"
    | "cnhNumber"
    | "cnhCategory"
    | "cnhExpiresAt"
    | "trackingConsent"
    | "phone"
    | "notes"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly profileId: string;
  readonly trackingConsentAt?: Date | null;
};

export class OperatorProfileError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "OperatorProfileError";
  }
}
