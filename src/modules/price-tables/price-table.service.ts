import { env } from "../../config/env.js";
import {
  InMemoryPriceTableRepository,
  type PriceTableRepository,
} from "./price-table.repository.js";
import type {
  PriceTable,
  PriceTableActorContext,
  ListPriceTableInput,
  ListPriceTableResult,
  UpdatePriceTableInput,
} from "./price-table.types.js";
import { PRICE_TABLE_STATUS_TRANSITIONS, PriceTableError } from "./price-table.types.js";
import {
  parseCurrency,
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalDate,
  parseOptionalDescription,
  parseOptionalScope,
  parseOptionalSearch,
  parseOptionalStatus,
  parseOptionalVehicleCategory,
  parseOptionalVersion,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./price-table.validators.js";
import { buildTariffOverlapChecker, type TariffOverlapChecker } from "./price-table-resolution.js";
import { getMemoryTariffRepositoryForTests } from "../tariffs/tariff.service.js";

type RawRecord = Record<string, unknown>;

export class PriceTableService {
  // Ω5P PR-03 (RN-TAR-01) — o overlapChecker é OPCIONAL: `new PriceTableService(repo)` (usos de teste legados)
  // segue sem guarda; as factories (memory/prisma) injetam o checker → a guarda de não-sobreposição só dispara
  // na transição draft→published. Não-amplificador (guarda read-only; só recusa com 409).
  constructor(
    private readonly repository: PriceTableRepository,
    private readonly overlapChecker?: TariffOverlapChecker,
  ) {}

  async list(actor: PriceTableActorContext, query: RawRecord): Promise<ListPriceTableResult> {
    const input: ListPriceTableInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      status: parseOptionalStatus(query.status),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: PriceTableActorContext, body: RawRecord): Promise<PriceTable> {
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      description: parseOptionalDescription(body.description),
      currency: parseCurrency(body.currency),
      version: parseOptionalVersion(body.version) ?? 1,
      validFrom: parseOptionalDate(body.valid_from ?? body.validFrom, "validFrom"),
      validTo: parseOptionalDate(body.valid_to ?? body.validTo, "validTo"),
      // Ω5P PR-03 — eixos NULLABLE app-validados (ausente = NULL = curinga).
      scope: parseOptionalScope(body.scope),
      vehicleCategory: parseOptionalVehicleCategory(body.vehicle_category ?? body.vehicleCategory),
      // Nova tabela sempre nasce em rascunho (RN-CAD-008); publica-se depois via PATCH status.
      status: "draft",
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: PriceTableActorContext, priceTableId: string): Promise<PriceTable> {
    const table = await this.repository.findById(actor.tenantId, parseRequiredUuid(priceTableId, "priceTableId"));
    if (!table) {
      throw new PriceTableError(404, "PRICE_TABLE_NOT_FOUND", "not_found", "Price table was not found.");
    }
    return table;
  }

  async update(actor: PriceTableActorContext, priceTableId: string, body: RawRecord): Promise<PriceTable> {
    const current = await this.get(actor, priceTableId);

    // RN-CAD-008 — máquina de estado: só transições permitidas; senão 422.
    const nextStatus = parseOptionalStatus(body.status);
    if (nextStatus !== undefined && nextStatus !== current.status) {
      if (!PRICE_TABLE_STATUS_TRANSITIONS[current.status].includes(nextStatus)) {
        throw new PriceTableError(
          422,
          "PRICE_TABLE_INVALID",
          "invalid_status_transition",
          `Cannot change status from ${current.status} to ${nextStatus}.`,
        );
      }
    }

    const nextScope = parseOptionalScope(body.scope);
    const nextVehicleCategory = parseOptionalVehicleCategory(body.vehicle_category ?? body.vehicleCategory);
    const nextValidFrom = parseOptionalDate(body.valid_from ?? body.validFrom, "validFrom");
    const nextValidTo = parseOptionalDate(body.valid_to ?? body.validTo, "validTo");

    // RN-TAR-01 (F2, D-Ω5P-TAR-04) — a guarda de NÃO-sobreposição roda sempre que a tabela RESULTAR APLICÁVEL
    // (status `published` E is_active=true) E algum eixo de aplicabilidade tiver mudado: transição de publicação,
    // REATIVAÇÃO (is_active false→true — ciclo-2: reativar recria a sobreposição, pois `findPublishedInBucket`
    // exige is_active), OU o PATCH mexeu no BUCKET/janela (scope, vehicle_category, valid_from, valid_to).
    // Fecha o bypass: tabela publicada segue editável (D-OMEGA2A). DESATIVAR segue livre (resultingIsActive=false
    // → sem guarda). Confronta o BUCKET efetivo (pós-patch) com as demais publicadas+ativas do mesmo bucket +
    // janela sobreposta → 409.
    const nextIsActive = readOptionalBoolean(body.is_active ?? body.isActive);
    const resultingStatus = nextStatus ?? current.status;
    const resultingIsActive = nextIsActive ?? current.isActive;
    const isBecomingPublished = nextStatus === "published" && current.status !== "published";
    const isBecomingActive = nextIsActive === true && current.isActive === false;
    const touchesBucketOrWindow =
      body.scope !== undefined ||
      body.vehicle_category !== undefined ||
      body.vehicleCategory !== undefined ||
      body.valid_from !== undefined ||
      body.validFrom !== undefined ||
      body.valid_to !== undefined ||
      body.validTo !== undefined;
    if (
      resultingStatus === "published" &&
      resultingIsActive === true &&
      (isBecomingPublished || isBecomingActive || touchesBucketOrWindow) &&
      this.overlapChecker
    ) {
      const overlap = await this.overlapChecker({
        tenantId: actor.tenantId,
        priceTableId: current.id,
        scope: (nextScope ?? current.scope) ?? null,
        vehicleCategory: (nextVehicleCategory ?? current.vehicleCategory) ?? null,
        validFrom: (nextValidFrom ?? current.validFrom) ?? null,
        validTo: (nextValidTo ?? current.validTo) ?? null,
      });
      if (overlap) {
        throw new PriceTableError(
          409,
          "TARIFF_OVERLAP",
          "tariff_overlap",
          "Another published price table with the same scope and vehicle category has an overlapping validity window and a shared service.",
        );
      }
    }

    const input: UpdatePriceTableInput = {
      tenantId: actor.tenantId,
      priceTableId: parseRequiredUuid(priceTableId, "priceTableId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      description: parseOptionalDescription(body.description),
      currency: body.currency === undefined ? undefined : parseCurrency(body.currency),
      version: parseOptionalVersion(body.version),
      validFrom: nextValidFrom,
      validTo: nextValidTo,
      status: nextStatus,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      scope: nextScope,
      vehicleCategory: nextVehicleCategory,
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new PriceTableError(404, "PRICE_TABLE_NOT_FOUND", "not_found", "Price table was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryPriceTableRepository();
let defaultServicePromise: Promise<PriceTableService> | undefined;

export function createMemoryPriceTableService(): PriceTableService {
  // RN-TAR-01 — no modo memória a guarda usa os MESMOS singletons dos módulos (paridade com o Prisma).
  const overlapChecker = buildTariffOverlapChecker(memoryRepository, getMemoryTariffRepositoryForTests());
  return new PriceTableService(memoryRepository, overlapChecker);
}

export function getMemoryPriceTableRepositoryForTests(): InMemoryPriceTableRepository {
  return memoryRepository;
}

export async function createDefaultPriceTableService(): Promise<PriceTableService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPriceTableService();
  }
  defaultServicePromise ??= createPrismaPriceTableService();
  return defaultServicePromise;
}

export function resetPriceTableRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaPriceTableService(): Promise<PriceTableService> {
  const { createPrismaPriceTableRepository } = await import("./price-table-prisma.repository.js");
  const { createPrismaTariffRepository } = await import("../tariffs/tariff-prisma.repository.js");
  const repository = await createPrismaPriceTableRepository();
  const tariffRepository = await createPrismaTariffRepository();
  const overlapChecker = buildTariffOverlapChecker(repository, tariffRepository);
  return new PriceTableService(repository, overlapChecker);
}
