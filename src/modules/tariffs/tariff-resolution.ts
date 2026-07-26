import type { Tariff } from "./tariff.types.js";
import type { TariffRepository } from "./tariff.repository.js";
import { getMemoryTariffRepositoryForTests } from "./tariff.service.js";
import {
  resolvePublishedPriceTableIdsScoped,
  type ScopedPriceTableResolver,
} from "../price-tables/price-table-resolution.js";
import { getMemoryPriceTableRepositoryForTests } from "../price-tables/price-table.service.js";

// Ω5P PR-03 (D-Ω5P-TAR-03) — resolveTariff: a tarifa vigente por categoria×serviço×escopo na DATA de cada
// acumulação (o que o motor de diárias I4/PR-07 vai consumir). Composição em DUAS passadas (específico→geral)
// que REUSA findApplicable/pickApplicableTariff SEM alterá-los — só compõe conjuntos publicados diferentes via
// o resolvedor escopado (price-tables). INERTE até o charging PR-07 (padrão do findApplicable, nascido inerte
// no Ω3-a). Correção retroativa (I2) = novo lançamento/ajuste, nunca update de tarifa vigente.

export type TariffResolutionScope = "PUBLIC_AGREEMENT" | "PRIVATE_CONTRACT";
type ScopeFilter = TariffResolutionScope | null; // null = casar tabelas cujo scope É NULL (curinga do legado).
type CategoryFilter = string | null;

export type ScopedPublishedResolver = (input: {
  readonly tenantId: string;
  readonly scope: ScopeFilter;
  readonly vehicleCategory: CategoryFilter;
  readonly date: Date;
}) => Promise<ReadonlySet<string>>;

export type ResolveTariffInput = {
  readonly tenantId: string;
  readonly serviceCatalogId: string;
  readonly customerId?: string;
  readonly scope?: TariffResolutionScope;
  readonly vehicleCategory?: string;
  readonly date: Date;
};

// Passadas específico→geral: [scope=exato ∧ categoria=exata], [scope=exato ∧ categoria=NULL],
// [scope=NULL ∧ categoria=exata], [scope=NULL ∧ categoria=NULL]. A 1ª passada que devolver uma tarifa vence —
// assim uma tabela categoria/scope-específica ganha da genérica SEM ensinar categoria ao pickApplicableTariff.
// Quando o chamador NÃO informa scope/categoria, só as passadas NULL (curinga) daquele eixo rodam. Retorna ≤1.
//
// F6 (D-Ω5P-TAR-03, decisão de PRODUTO a ratificar) — a prioridade é ESCOPO > CATEGORIA (relaxa a categoria
// ANTES do escopo). É uma escolha (não uma verdade): "o convênio manda mais que a categoria do veículo". A UI
// (PR-04) deve avisar quando coexistirem parciais cross-bucket (ex.: uma tabela [PUBLIC,∅] e uma [∅,MOTO] para
// o mesmo serviço) — o resolvedor escolhe [PUBLIC,∅], e isso precisa ser visível ao admin.
//
// F7 (contrato p/ o charging PR-07) — consulta SEM categoria (veículo sem ID, D-Ω5P-09) quando SÓ existem
// tabelas categoria-específicas → nenhuma passada casa → `undefined`. O PR-07 DEVE FALHAR FECHADO em `undefined`
// (não cobrar 0 / não seguir), e a UI (PR-04) deve avisar a ausência de uma tabela geral (∅) para o serviço.
export async function resolveTariff(
  tariffRepo: Pick<TariffRepository, "findApplicable">,
  scopedResolver: ScopedPublishedResolver,
  input: ResolveTariffInput,
): Promise<Tariff | undefined> {
  const scopePasses: ScopeFilter[] = input.scope !== undefined ? [input.scope, null] : [null];
  const categoryPasses: CategoryFilter[] = input.vehicleCategory !== undefined ? [input.vehicleCategory, null] : [null];
  for (const scope of scopePasses) {
    for (const vehicleCategory of categoryPasses) {
      const publishedIds = await scopedResolver({ tenantId: input.tenantId, scope, vehicleCategory, date: input.date });
      if (publishedIds.size === 0) continue;
      // F1 — passa input.date como asOf: a janela PRÓPRIA da Tariff é avaliada NA DATA, não no relógio de parede
      // (determinístico + cobra só o vigente na data de entrada). O congelamento Ω3-a (sem date) segue com `now`.
      const tariff = await tariffRepo.findApplicable(input.tenantId, input.serviceCatalogId, input.customerId, publishedIds, input.date);
      if (tariff) return tariff;
    }
  }
  return undefined;
}

// Composições (pegam os singletons/repos — o resolveTariff puro fica testável por DI). Espelham o
// createApplicableTariffResolver do service-quotes; prontas para o charging PR-07 consumir.
export type TariffResolver = (input: ResolveTariffInput) => Promise<Tariff | undefined>;

export function createMemoryResolveTariff(): TariffResolver {
  const tariffRepo = getMemoryTariffRepositoryForTests();
  const priceRepo = getMemoryPriceTableRepositoryForTests();
  const scopedResolver: ScopedPriceTableResolver = (i) => resolvePublishedPriceTableIdsScoped(priceRepo, i);
  return (input) => resolveTariff(tariffRepo, scopedResolver, input);
}

export async function createPrismaResolveTariff(): Promise<TariffResolver> {
  const { createPrismaTariffRepository } = await import("./tariff-prisma.repository.js");
  const { createPrismaPriceTableRepository } = await import("../price-tables/price-table-prisma.repository.js");
  const tariffRepo = await createPrismaTariffRepository();
  const priceRepo = await createPrismaPriceTableRepository();
  const scopedResolver: ScopedPriceTableResolver = (i) => resolvePublishedPriceTableIdsScoped(priceRepo, i);
  return (input) => resolveTariff(tariffRepo, scopedResolver, input);
}

export async function createResolveTariff(): Promise<TariffResolver> {
  const { env } = await import("../../config/env.js");
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryResolveTariff();
  }
  return createPrismaResolveTariff();
}
