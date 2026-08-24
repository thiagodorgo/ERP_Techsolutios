import type { PriceTableRepository } from "./price-table.repository.js";
import type { PriceTableTariffSummary } from "./price-table.types.js";
import type { TariffRepository } from "../tariffs/tariff.repository.js";

// Ω5P PR-03 — camada de RESOLUÇÃO ESCOPADA e de NÃO-SOBREPOSIÇÃO (RN-TAR-01), PURA e sem acoplamento de
// serviço/singleton: todas as funções recebem os repositórios por parâmetro (as composições que pegam os
// singletons vivem em *.service.ts, evitando ciclos de import). Inerte até o charging (PR-07).
//
// F4 (ciclo-1) — os conjuntos de tabelas do BUCKET vêm de `findPublishedInBucket` (filtro SERVIDOR-SIDE, SEM
// teto de página): o invariante de cobrança NÃO pode depender de `limit:100`. F8 — o bucket-key do overlap
// inclui `customer_id` (plano §7c: tenant, scope, vehicle_category, service, customer).
//
// F5 (D-Ω5P-TAR-04, risco residual herdado pelo PR-07) — a RN-TAR-01 é read-then-write app-level SEM lock/tx/
// constraint: sob dois `publish` concorrentes do MESMO bucket ela é fail-OPEN (ambos leem "sem conflito" antes
// de gravar). O backstop de banco (EXCLUDE USING gist + btree_gist sobre range gerado) fica DEFERIDO — exige
// coluna range + extensão, fora do aditivo mínimo. Registrado como risco residual.

const DEFAULT_SERVICE_KEY = ""; // service_catalog_id/customer_id reais são UUID → "" nunca colide.
const DEFAULT_CUSTOMER_KEY = "";
const NULL_BUCKET = " "; // marcador de NULL distinto de qualquer valor real (NULL casa NULL, não curinga).

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// (b) Resolução do conjunto de tabelas PUBLICADAS do BUCKET (scope × categoria) que COBREM a data. O
// resolveTariff (tariffs/tariff-resolution.ts) compõe as passadas específico→geral por cima, SEM alterar
// findApplicable/pickApplicableTariff. NULL no filtro = "casar tabelas cujo campo É NULL" (curinga do legado).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type ScopedPriceTableResolver = (input: {
  readonly tenantId: string;
  readonly scope: string | null;
  readonly vehicleCategory: string | null;
  readonly date: Date;
}) => Promise<ReadonlySet<string>>;

export async function resolvePublishedPriceTableIdsScoped(
  repo: Pick<PriceTableRepository, "findPublishedInBucket">,
  input: { readonly tenantId: string; readonly scope: string | null; readonly vehicleCategory: string | null; readonly date: Date },
): Promise<Set<string>> {
  // "Cobre a data D" = janela [valid_from, valid_to] sobrepõe [D, D]. Filtro no servidor, sem teto de página.
  const tables = await repo.findPublishedInBucket({
    tenantId: input.tenantId,
    scope: input.scope,
    vehicleCategory: input.vehicleCategory,
    from: input.date,
    to: input.date,
  });
  return new Set(tables.map((table) => table.id));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// (c) RN-TAR-01 — NÃO-sobreposição: para um mesmo BUCKET EXATO (scope, vehicle_category) — NULL casa NULL — no
// máx. 1 tabela publicada aplicável por (serviço, cliente) num instante. Duas tabelas do MESMO bucket com
// janelas de vigência sobrepostas E que compartilham ≥1 (service_catalog_id, customer_id) → OVERLAP. Um bucket
// específico (SC) e um geral (∅∅) são buckets DIFERENTES → NÃO conflitam (o resolveTariff desempata por
// especificidade). "sem falso-positivo entre serviços/clientes distintos" = o filtro de (serviço, cliente).
//
// O overlap usa a janela da PRICETABLE (F8 parte-1: conservador/fail-safe — não intersecta a janela própria da
// Tariff; a intersecção cross-tabela ficaria só num EXCLUDE de banco, F5/D-Ω5P-TAR-04).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type OverlapTable = {
  readonly id: string;
  readonly scope: string | null;
  readonly vehicleCategory: string | null;
  readonly validFrom: Date | null;
  readonly validTo: Date | null;
  readonly serviceKeys: ReadonlySet<string>; // chaves "service|customer" (F8).
};

export function detectTariffOverlap(candidate: OverlapTable, others: readonly OverlapTable[]): boolean {
  return others.some(
    (other) =>
      other.id !== candidate.id &&
      sameBucket(candidate, other) &&
      windowsOverlap(candidate, other) &&
      sharesServiceKey(candidate, other),
  );
}

function sameBucket(a: OverlapTable, b: OverlapTable): boolean {
  return bucketKey(a.scope) === bucketKey(b.scope) && bucketKey(a.vehicleCategory) === bucketKey(b.vehicleCategory);
}

function bucketKey(value: string | null): string {
  return value ?? NULL_BUCKET;
}

function windowsOverlap(a: OverlapTable, b: OverlapTable): boolean {
  const aFrom = a.validFrom ? a.validFrom.getTime() : Number.NEGATIVE_INFINITY;
  const aTo = a.validTo ? a.validTo.getTime() : Number.POSITIVE_INFINITY;
  const bFrom = b.validFrom ? b.validFrom.getTime() : Number.NEGATIVE_INFINITY;
  const bTo = b.validTo ? b.validTo.getTime() : Number.POSITIVE_INFINITY;
  return aFrom <= bTo && bFrom <= aTo; // intervalos fechados sobrepõem-se.
}

function sharesServiceKey(a: OverlapTable, b: OverlapTable): boolean {
  for (const key of a.serviceKeys) {
    if (b.serviceKeys.has(key)) return true;
  }
  return false;
}

// F8 — bucket-key inclui o cliente: tabelas que diferem SÓ pelo customer não conflitam.
function serviceCustomerKey(serviceCatalogId: string | undefined, customerId: string | undefined): string {
  return `${serviceCatalogId ?? DEFAULT_SERVICE_KEY}|${customerId ?? DEFAULT_CUSTOMER_KEY}`;
}

// Checker de PUBLICAÇÃO (ponto i): monta o BUCKET candidato (estado pós-publicação) + os (serviço,cliente) das
// SUAS tarifas ativas, e confronta com as demais publicadas do MESMO bucket + janela sobreposta (servidor-side,
// F4). Só LÊ → guarda não-amplificador. Retorna true se há sobreposição.
export type TariffOverlapChecker = (input: {
  readonly tenantId: string;
  readonly priceTableId: string;
  readonly scope: string | null;
  readonly vehicleCategory: string | null;
  readonly validFrom: Date | null;
  readonly validTo: Date | null;
}) => Promise<boolean>;

export function buildTariffOverlapChecker(
  priceRepo: Pick<PriceTableRepository, "findPublishedInBucket">,
  tariffRepo: Pick<TariffRepository, "list">,
): TariffOverlapChecker {
  return async (input) => {
    const candidate: OverlapTable = {
      id: input.priceTableId,
      scope: input.scope,
      vehicleCategory: input.vehicleCategory,
      validFrom: input.validFrom,
      validTo: input.validTo,
      serviceKeys: await serviceKeysOf(tariffRepo, input.tenantId, input.priceTableId),
    };
    const others = await bucketPeers(priceRepo, tariffRepo, input.tenantId, candidate);
    return detectTariffOverlap(candidate, others);
  };
}

// Checker de MUTAÇÃO (ponto ii): create/update de Tariff DENTRO de uma tabela já PUBLICADA (que segue editável,
// D-OMEGA2A). Carrega a tabela-alvo; se não está publicada, não trava (o gate de publicação cobre o rascunho).
// Se publicada, monta o bucket dela + (chaves atuais ∪ a chave (serviço,cliente) que entra) e confronta.
export type TariffMutationOverlapChecker = (input: {
  readonly tenantId: string;
  readonly priceTableId: string;
  readonly incomingServiceCatalogId?: string;
  readonly incomingCustomerId?: string;
}) => Promise<boolean>;

export function buildTariffMutationOverlapChecker(
  priceRepo: Pick<PriceTableRepository, "findById" | "findPublishedInBucket">,
  tariffRepo: Pick<TariffRepository, "list">,
): TariffMutationOverlapChecker {
  return async (input) => {
    const table = await priceRepo.findById(input.tenantId, input.priceTableId);
    if (!table || table.status !== "published") return false; // rascunho/inexistente → coberto pelo gate de publicação.
    const existing = await serviceKeysOf(tariffRepo, input.tenantId, input.priceTableId);
    const candidate: OverlapTable = {
      id: table.id,
      scope: table.scope ?? null,
      vehicleCategory: table.vehicleCategory ?? null,
      validFrom: table.validFrom ?? null,
      validTo: table.validTo ?? null,
      serviceKeys: new Set([...existing, serviceCustomerKey(input.incomingServiceCatalogId, input.incomingCustomerId)]),
    };
    const others = await bucketPeers(priceRepo, tariffRepo, input.tenantId, candidate);
    return detectTariffOverlap(candidate, others);
  };
}

// Peers = tabelas publicadas do MESMO bucket + janela sobreposta (servidor-side, sem teto), exceto a própria.
async function bucketPeers(
  priceRepo: Pick<PriceTableRepository, "findPublishedInBucket">,
  tariffRepo: Pick<TariffRepository, "list">,
  tenantId: string,
  candidate: OverlapTable,
): Promise<OverlapTable[]> {
  const peers = await priceRepo.findPublishedInBucket({
    tenantId,
    scope: candidate.scope,
    vehicleCategory: candidate.vehicleCategory,
    from: candidate.validFrom,
    to: candidate.validTo,
  });
  return Promise.all(
    peers
      .filter((table) => table.id !== candidate.id)
      .map(async (table) => ({
        id: table.id,
        scope: table.scope ?? null,
        vehicleCategory: table.vehicleCategory ?? null,
        validFrom: table.validFrom ?? null,
        validTo: table.validTo ?? null,
        serviceKeys: await serviceKeysOf(tariffRepo, tenantId, table.id),
      })),
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// (d) AGREGADO DOS ITENS — quantas tarifas ativas a tabela tem e em que faixa de valor. Mesma forma de
// composição das demais: função pura que recebe o repositório por parâmetro (o singleton fica no *.service).
//
// UMA passada, nunca N+1: a implementação Prisma faz um único `groupBy` sobre `tariffs` (ver
// `price-table-prisma.repository.ts`). Esta implementação existe para o modo MEMÓRIA e varre a coleção de
// tarifas ativas do tenant UMA vez, agrupando em JS — o número de chamadas depende do total de tarifas
// (paginação), NÃO do número de tabelas da página.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type PriceTableTariffAggregator = (input: {
  readonly tenantId: string;
  readonly priceTableIds: readonly string[];
}) => Promise<ReadonlyMap<string, PriceTableTariffSummary>>;

export function buildMemoryTariffSummaryAggregator(
  tariffRepo: Pick<TariffRepository, "list">,
): PriceTableTariffAggregator {
  return async ({ tenantId, priceTableIds }) => {
    const summaries = new Map<string, PriceTableTariffSummary>();
    const wanted = new Set(priceTableIds);
    if (wanted.size === 0) return summaries;

    const pageSize = 200;
    for (let offset = 0; ; offset += pageSize) {
      // `isActive: true` = só tarifa VIVA (is_active=false é a exclusão lógica da tarifa).
      const page = await tariffRepo.list({ tenantId, isActive: true, limit: pageSize, offset });
      for (const tariff of page.items) {
        if (!wanted.has(tariff.priceTableId)) continue;
        if (!Number.isFinite(tariff.unitPrice)) continue;
        const current = summaries.get(tariff.priceTableId);
        if (!current) {
          summaries.set(tariff.priceTableId, {
            itemCount: 1,
            minUnitPrice: tariff.unitPrice,
            maxUnitPrice: tariff.unitPrice,
          });
          continue;
        }
        summaries.set(tariff.priceTableId, {
          itemCount: current.itemCount + 1,
          minUnitPrice: Math.min(current.minUnitPrice ?? tariff.unitPrice, tariff.unitPrice),
          maxUnitPrice: Math.max(current.maxUnitPrice ?? tariff.unitPrice, tariff.unitPrice),
        });
      }
      if (page.items.length < pageSize) break;
    }
    return summaries;
  };
}

// F4 — pagina TODAS as tarifas ativas da tabela (não depende do teto de página para o invariante). Chave por
// (service_catalog_id, customer_id) (F8).
async function serviceKeysOf(tariffRepo: Pick<TariffRepository, "list">, tenantId: string, priceTableId: string): Promise<Set<string>> {
  const pageSize = 100;
  const keys = new Set<string>();
  for (let offset = 0; ; offset += pageSize) {
    const result = await tariffRepo.list({ tenantId, priceTableId, isActive: true, limit: pageSize, offset });
    for (const tariff of result.items) {
      keys.add(serviceCustomerKey(tariff.serviceCatalogId, tariff.customerId));
    }
    if (result.items.length < pageSize) break;
  }
  return keys;
}
