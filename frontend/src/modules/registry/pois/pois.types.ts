// Ω2-d — Pontos de Interesse / POI (cadastro denso, multi-tenant). Espelho de suppliers/tariffs
// (padrão registry). O NOME é a chave natural do 409 (duplicado por organização) mas PERMANECE
// editável — o backend aceita renomear. Diferença-chave: latitude/longitude são numéricos e
// obrigatórios (o backend rejeita coordenada inválida com 400 invalid_coordinate).

export type PoiItem = {
  readonly id: string;
  readonly name: string;
  readonly category: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly address: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type PoisPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type PoisSource = "api" | "mock" | "fallback";

export type PoisData = {
  readonly items: PoiItem[];
  readonly pagination: PoisPagination;
  readonly source: PoisSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (isActive) — mesmo vocabulário da dense-list ("all"/"active"/"inactive").
export type PoiActiveFilter = "all" | "active" | "inactive";

export type PoisFilters = {
  readonly search: string;
  readonly isActive: PoiActiveFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type PoisApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — nome, latitude e longitude são obrigatórios; categoria e endereço opcionais.
export type PoiCreatePayload = {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly category?: string;
  readonly address?: string;
};

export type PoiUpdatePayload = Partial<PoiCreatePayload> & {
  readonly isActive?: boolean;
};

export type PoiField = keyof PoiCreatePayload;

export type PoiFieldError = {
  readonly field: PoiField;
  readonly message: string;
};
