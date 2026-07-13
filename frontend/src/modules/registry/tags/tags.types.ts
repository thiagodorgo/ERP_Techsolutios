// Ω2-d — Tags/Etiquetas (cadastro denso, multi-tenant). Espelho de suppliers/tariffs (padrão
// registry). O NOME é a chave natural do 409 (duplicado por organização) mas PERMANECE editável —
// o backend aceita renomear (não é imutável como o `code` de Filiais).

export type TagItem = {
  readonly id: string;
  readonly name: string;
  // Cor em hexadecimal normalizado `#rrggbb` (minúsculo) ou null quando a etiqueta não tem cor.
  readonly color: string | null;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type TagsPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type TagsSource = "api" | "mock" | "fallback";

export type TagsData = {
  readonly items: TagItem[];
  readonly pagination: TagsPagination;
  readonly source: TagsSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (isActive) — mesmo vocabulário da dense-list ("all"/"active"/"inactive").
export type TagActiveFilter = "all" | "active" | "inactive";

export type TagsFilters = {
  readonly search: string;
  readonly isActive: TagActiveFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type TagsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — apenas o nome é obrigatório; cor e descrição opcionais.
export type TagCreatePayload = {
  readonly name: string;
  readonly color?: string;
  readonly description?: string;
};

export type TagUpdatePayload = Partial<TagCreatePayload> & {
  readonly isActive?: boolean;
};

export type TagField = keyof TagCreatePayload;

export type TagFieldError = {
  readonly field: TagField;
  readonly message: string;
};
