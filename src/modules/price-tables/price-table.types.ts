import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import { PROFILE_SCOPES, type ProfileScope } from "../jurisdiction/jurisdiction.types.js";

export type PriceTableActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-03 (D-Ω5P-TAR-02) — o escopo da tabela tarifária REUSA o MESMO enum de JurisdictionProfile.scope
// (coerência com PR-02): PUBLIC_AGREEMENT (convênio público) | PRIVATE_CONTRACT (contrato privado). O perfil
// normativo dá prazos/teto; a tabela tarifária dá preço. scope NULL = curinga vale-para-os-dois.
export const TARIFF_SCOPES = PROFILE_SCOPES;
export type TariffScope = ProfileScope;

// Ω2-a.1 — status de publicação (RN-CAD-008). Máquina de estado: draft→published, published→archived,
// draft→archived; qualquer outra transição = 422. Tabela "published" PERMANECE editável nesta fatia
// (deferral consciente, sem version-on-publish — ver controle/D-OMEGA2A-*).
export type PriceTableStatus = "draft" | "published" | "archived";

export type PriceTable = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly currency: string;
  readonly version: number;
  readonly validFrom?: Date;
  readonly validTo?: Date;
  readonly status: PriceTableStatus;
  readonly isActive: boolean;
  // Ω5P PR-03 — eixos NULLABLE (curinga quando ausentes; retrocompat total com o legado).
  readonly scope?: TariffScope;
  readonly vehicleCategory?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListPriceTableInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly status?: PriceTableStatus;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListPriceTableResult = {
  readonly items: readonly PriceTable[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

// ── Agregado dos ITENS da tabela ────────────────────────────────────────────────────────────────────────
// A "Tabela de Valores" é um CONTÊINER: o valor vive nas Tarifas (`tariffs.price_table_id` → `price_tables.id`).
// Sem este agregado a listagem anuncia a moeda e nunca um número — quem abre precisa navegar para outra tela
// para saber se ali existe algum preço. O agregado é de LEITURA (nenhuma coluna nova; nenhuma migration).
//
// O que conta como item: tarifa com `is_active = true`. `is_active=false` É a exclusão lógica da tarifa (o
// controller de tariffs audita `tariff.deactivated` exatamente nesse patch) — tarifa apagada NÃO entra na
// conta nem na faixa. O campo `status` da Tariff é texto livre sem máquina de estado (RN-CAD-009), então
// NÃO serve de filtro. A janela de vigência PRÓPRIA da tarifa também não filtra: a coluna responde
// "o que esta tabela contém", não "o que está valendo agora" — filtrar por data faria a contagem oscilar
// sozinha e esconderia tarifa futura já cadastrada.
export type PriceTableTariffSummary = {
  readonly itemCount: number;
  readonly minUnitPrice: number | null;
  readonly maxUnitPrice: number | null;
};

// Tabela sem tarifa ativa: contagem 0 e faixa NULA. Nunca 0,00 — "zero reais" seria um preço inventado.
export const EMPTY_PRICE_TABLE_TARIFF_SUMMARY: PriceTableTariffSummary = {
  itemCount: 0,
  minUnitPrice: null,
  maxUnitPrice: null,
};

// Linha de listagem = a tabela + o agregado dos seus itens. O campo é OBRIGATÓRIO de propósito: apagá-lo
// quebra a compilação de quem monta a lista e do DTO, em vez de sumir calado da tela.
export type PriceTableListItem = PriceTable & {
  readonly tariffSummary: PriceTableTariffSummary;
};

export type ListPriceTableViewResult = {
  readonly items: readonly PriceTableListItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreatePriceTableInput = Omit<
  PriceTable,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdatePriceTableInput = Partial<
  Pick<
    PriceTable,
    | "name"
    | "description"
    | "currency"
    | "version"
    | "validFrom"
    | "validTo"
    | "status"
    | "isActive"
    | "scope"
    | "vehicleCategory"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly priceTableId: string;
};

export class PriceTableError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "PriceTableError";
  }
}

// Transições de status permitidas (RN-CAD-008).
export const PRICE_TABLE_STATUS_TRANSITIONS: Record<PriceTableStatus, readonly PriceTableStatus[]> = {
  draft: ["published", "archived"],
  published: ["archived"],
  archived: [],
};
