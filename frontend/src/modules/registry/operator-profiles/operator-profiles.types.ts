// Ω2-c — Profissionais (OperatorProfile): perfil profissional 1-1 com um Usuário. Cadastro denso,
// multi-tenant, espelho de suppliers/tariffs (padrão registry). Diferenças-chave:
//   1. A chave natural é o `userId` (relação 1-1): o backend rejeita duplicata (409 duplicate_profile)
//      e um userId inexistente na organização (400 invalid_user_reference).
//   2. `userId` é IMUTÁVEL após a criação (fixo — lição do veto B2 de Tarifas): na edição fica
//      desabilitado com dica e FORA do payload PATCH.
//   3. Carrega dado sensível LGPD: `trackingConsent` é o REGISTRO do consentimento do operador com
//      o rastreamento de localização — a UI apenas exibe/registra, não presume.

export type OperatorProfileItem = {
  readonly id: string;
  readonly userId: string;
  readonly fullName: string | null;
  readonly cnhNumber: string | null;
  readonly cnhCategory: string | null;
  readonly cnhExpiresAt: string | null;
  readonly trackingConsent: boolean;
  readonly trackingConsentAt: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type OperatorProfilesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type OperatorProfilesSource = "api" | "mock" | "fallback";

export type OperatorProfilesData = {
  readonly items: OperatorProfileItem[];
  readonly pagination: OperatorProfilesPagination;
  readonly source: OperatorProfilesSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (isActive) — profissional é MASCULINO ("Ativo"/"Inativo"),
// mesmo vocabulário da dense-list ("all"/"active"/"inactive").
export type OperatorProfileActiveFilter = "all" | "active" | "inactive";

// Filtro de consentimento LGPD (query `has_consent`). "with" = consentiu; "without" = não consentiu.
export type OperatorProfileConsentFilter = "all" | "with" | "without";

export type OperatorProfilesFilters = {
  readonly search: string;
  readonly isActive: OperatorProfileActiveFilter;
  // Filtro server-side por consentimento (query `has_consent`) — muda a janela buscada.
  readonly hasConsent: OperatorProfileConsentFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type OperatorProfilesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — apenas o `userId` é obrigatório (chave natural 1-1); demais campos opcionais.
export type OperatorProfileCreatePayload = {
  readonly userId: string;
  readonly fullName?: string;
  readonly cnhNumber?: string;
  readonly cnhCategory?: string;
  readonly cnhExpiresAt?: string;
  readonly trackingConsent?: boolean;
  readonly phone?: string;
  readonly notes?: string;
};

// Update — `userId` é IMUTÁVEL (fora do payload); `isActive` editável na edição.
export type OperatorProfileUpdatePayload = Partial<Omit<OperatorProfileCreatePayload, "userId">> & {
  readonly isActive?: boolean;
};

export type OperatorProfileField = keyof OperatorProfileCreatePayload;

export type OperatorProfileFieldError = {
  readonly field: OperatorProfileField;
  readonly message: string;
};
