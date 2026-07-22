import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { createDefaultOperatorProfileService } from "../operator-profiles/operator-profile.service.js";
import { createDefaultProfessionalStatementService } from "../professional-statements/professional-statement.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import { createDefaultWorkOrderService } from "../work-orders/work-order.service.js";
import {
  deleteStoredDamageAttachmentFile,
  resolveDamageAttachmentDownload,
  saveDamageAttachmentFile,
  type DamageAttachmentDownload,
  type DamageAttachmentUpload,
} from "./damage-attachment.storage.js";
import { InMemoryDamageRepository, type DamageRepository } from "./damage.repository.js";
import type {
  Damage,
  DamageActorContext,
  DamageAttachment,
  DamageStatementDebit,
  ListDamagesInput,
  UpdateDamageInput,
} from "./damage.types.js";
import { DEFAULT_DAMAGE_STATUS, DamageError } from "./damage.types.js";
import {
  assertDamageStatusTransition,
  parseCusto,
  parseDamageStatus,
  parseDescricao,
  parseGravidade,
  parseLimit,
  parseOffset,
  parseOptionalDamageStatus,
  parseOptionalDate,
  parseOptionalDescricao,
  parseOptionalGravidade,
  parseOptionalSearch,
  parseOptionalText,
  parseOptionalTipo,
  parseOptionalUuid,
  parseRequiredDate,
  parseRequiredUuid,
  parseResponsibleAmount,
  parseResponsibleFirstDueDate,
  parseResponsibleInstallmentTotal,
  readOptionalBoolean,
} from "./damage.validators.js";

type RawRecord = Record<string, unknown>;

/**
 * Ω4C PR-09 (D-Ω4C-DANO-STATEMENT-EFFECT) — payload do efeito de domínio que lança o desconto do dano no
 * extrato do profissional responsável. O serviço fixa entryType='damage'/direction='debit'/sourceType='damage'
 * na fronteira (o dano nunca escreve tipo/direção arbitrários — NÃO-amplificador); `amount` é o valor REAL
 * digitado (responsible_amount ≤ custo_real, nunca fabricado). É service→service (NÃO exige
 * `professional_statements:create` do usuário — mandato §6, idêntico à Multa PR-07).
 */
export type DamageResponsibleStatementInput = {
  readonly damage: Damage;
  readonly operatorProfileId: string;
  readonly amount: number;
  readonly installmentTotal: number;
  readonly firstDueDate: Date;
};

/**
 * Tenant-scoped reads used to enforce cross-entity rules. A cross-tenant /
 * missing id resolves to "not found" and is rejected as an invalid reference.
 * - `resolveVehicle` validates the REQUIRED `vehicle_id` (400 invalid_vehicle_reference).
 * - `resolveWorkOrder` validates the OPTIONAL `work_order_id` (a WorkOrder). There is
 *   no hard FK: it is verified here as an in-tenant OS (400 invalid_work_order_reference).
 * - `resolveResponsible` (Ω4C PR-09) validates the OPTIONAL `responsible_operator_profile_id`
 *   (an operator_profile) → 400 invalid_operator_profile_reference cross-tenant.
 * - the statement resolvers wire the INTERNAL PR-03 rail (createForSource/removeForSource/
 *   findActiveBySource) reused from the Multa (PR-07). No REST route is exposed for them.
 */
export type DamageReferenceResolvers = {
  readonly resolveVehicle?: (actor: DamageActorContext, id: string) => Promise<boolean>;
  readonly resolveWorkOrder?: (actor: DamageActorContext, id: string) => Promise<boolean>;
  readonly resolveResponsible?: (actor: DamageActorContext, id: string) => Promise<boolean>;
  // Efeito de domínio: cria o débito parcelado do dano no extrato do profissional. Idempotente por origem.
  readonly createResponsibleStatementDebit?: (actor: DamageActorContext, input: DamageResponsibleStatementInput) => Promise<void>;
  // Efeito inverso: retira o débito do extrato (soft-delete do grupo). Respeita RN-EXT-01 (settled → 409).
  readonly removeResponsibleStatementDebit?: (actor: DamageActorContext, damageId: string) => Promise<void>;
  // Débito ATIVO derivado (badge do detalhe + trava). undefined = sem débito (identificação-só/empresa absorve).
  readonly getActiveStatementDebit?: (actor: DamageActorContext, damageId: string) => Promise<DamageStatementDebit | undefined>;
};

export class DamageService {
  constructor(
    private readonly repository: DamageRepository,
    private readonly references: DamageReferenceResolvers = {},
  ) {}

  async list(actor: DamageActorContext, query: RawRecord) {
    const input: ListDamagesInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      workOrderId: parseOptionalUuid(query.work_order_id ?? query.workOrderId, "workOrderId"),
      status: parseOptionalDamageStatus(query.status),
      gravidade: parseOptionalGravidade(query.gravidade),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: DamageActorContext, body: RawRecord): Promise<Damage> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const workOrderId = parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId");
    if (workOrderId !== undefined) {
      await this.assertWorkOrderReference(actor, workOrderId);
    }

    // Ω4C PR-09 — profissional responsável (operator_profile). Setar no create + valor a cobrar → débito no extrato.
    const responsibleOperatorProfileId = parseOptionalUuid(
      body.responsible_operator_profile_id ?? body.responsibleOperatorProfileId,
      "responsibleOperatorProfileId",
    );
    if (responsibleOperatorProfileId !== undefined) {
      await this.assertResponsibleReference(actor, responsibleOperatorProfileId);
    }
    // "Profissional R$" (transiente) + parcelas + 1ª data — nunca persistidos no dano (o dinheiro vive no extrato).
    const responsibleAmount = parseResponsibleAmount(body.responsible_amount ?? body.responsibleAmount);
    const responsibleInstallmentTotal = parseResponsibleInstallmentTotal(
      body.responsible_installment_total ?? body.responsibleInstallmentTotal,
    );
    const responsibleFirstDueDate = parseResponsibleFirstDueDate(
      body.responsible_first_due_date ?? body.responsibleFirstDueDate,
    );
    const custoReal = parseCusto(body.custo_real ?? body.custoReal, "custoReal");

    // Guards de honestidade (D-Ω4C-DANO-MONEY, 422) — antes de gravar: cobrar exige valor total e amount ≤ total.
    const charging = responsibleOperatorProfileId !== undefined && responsibleAmount !== undefined;
    if (charging) {
      this.assertChargeable(custoReal, responsibleAmount as number);
    }

    // A damage always starts on `registrado`; later status changes go through the
    // PATCH state machine (R5.1). A body-supplied status is validated (a bad value
    // is a 400) but only the default is honoured on create.
    parseOptionalDamageStatus(body.status);

    const created = await this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      workOrderId,
      responsibleOperatorProfileId,
      data: parseRequiredDate(body.data, "data"),
      gravidade: parseGravidade(body.gravidade),
      descricao: parseDescricao(body.descricao),
      status: DEFAULT_DAMAGE_STATUS,
      tipo: parseOptionalTipo(body.tipo),
      origem: parseOptionalText(body.origem, "origem", 200),
      objeto: parseOptionalText(body.objeto, "objeto", 200),
      identificacaoObjeto: parseOptionalText(body.identificacao_objeto ?? body.identificacaoObjeto, "identificacaoObjeto", 200),
      analiseInterna: parseOptionalText(body.analise_interna ?? body.analiseInterna, "analiseInterna", 5000),
      custoEstimado: parseCusto(body.custo_estimado ?? body.custoEstimado, "custoEstimado"),
      custoReal,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    if (charging) {
      await this.applyResponsibleStatementEffect(actor, created, responsibleAmount as number, responsibleInstallmentTotal, responsibleFirstDueDate);
    }

    return created;
  }

  async get(actor: DamageActorContext, damageId: string): Promise<Damage> {
    return this.getEntity(actor, damageId);
  }

  /** Detail path: the damage plus its photo gallery + the DERIVED active statement debit (safe DTO downstream). */
  async getWithAttachments(
    actor: DamageActorContext,
    damageId: string,
  ): Promise<{ readonly damage: Damage; readonly attachments: readonly DamageAttachment[]; readonly statementDebit?: DamageStatementDebit }> {
    const damage = await this.getEntity(actor, damageId);
    const attachments = await this.repository.listAttachments(actor.tenantId, damage.id);
    const statementDebit = await this.getActiveStatementDebit(actor, damage.id);

    return { damage, attachments, statementDebit };
  }

  async update(actor: DamageActorContext, damageId: string, body: RawRecord): Promise<Damage> {
    const current = await this.getEntity(actor, damageId);

    const workOrderId = parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId");
    if (workOrderId !== undefined && workOrderId !== current.workOrderId) {
      await this.assertWorkOrderReference(actor, workOrderId);
    }

    const nextStatus =
      body.status === undefined || body.status === null || body.status === ""
        ? undefined
        : parseDamageStatus(body.status);

    if (nextStatus !== undefined && nextStatus !== current.status) {
      // R5.1 — restricted, strictly linear state machine (422 on invalid transition).
      assertDamageStatusTransition(current.status, nextStatus);
    }

    // Ω4C PR-09 (D-Ω4C-DANO-TRAVA) — enquanto há débito ATIVO da fonte, campos FINANCEIROS travam com 409.
    const activeDebit = await this.getActiveStatementDebit(actor, current.id);
    const hasActiveDebit = activeDebit !== undefined;
    const deactivating = body.is_active === false || body.isActive === false;
    // (a) desativar o dano (exclusão do AutEM) com débito ativo → 409 (msg AutEM).
    if (hasActiveDebit && deactivating) {
      throw damageStatementLocked();
    }
    // (b) editar custo_real (a BASE do desconto) com débito ativo → 409.
    const custoRealProvided = body.custo_real !== undefined || body.custoReal !== undefined;
    const nextCustoReal = parseCusto(body.custo_real ?? body.custoReal, "custoReal");
    if (hasActiveDebit && custoRealProvided && !numbersEqual(nextCustoReal, current.custoReal)) {
      throw damageStatementLocked();
    }

    // Tri-estado do responsável (espelha a Multa): ausente = não muda; null/"" = LIMPAR; uuid = SETAR/TROCAR.
    const responsibleProvided =
      body.responsible_operator_profile_id !== undefined || body.responsibleOperatorProfileId !== undefined;
    const responsibleAmount = parseResponsibleAmount(body.responsible_amount ?? body.responsibleAmount);
    const responsibleInstallmentTotal = parseResponsibleInstallmentTotal(
      body.responsible_installment_total ?? body.responsibleInstallmentTotal,
    );
    const responsibleFirstDueDate = parseResponsibleFirstDueDate(
      body.responsible_first_due_date ?? body.responsibleFirstDueDate,
    );
    let nextResponsible: string | null | undefined;
    if (responsibleProvided) {
      // NÃO usar `??`: `null` (limpar) colapsaria para o RHS. Prefere a chave snake quando presente.
      const raw =
        body.responsible_operator_profile_id !== undefined
          ? body.responsible_operator_profile_id
          : body.responsibleOperatorProfileId;
      nextResponsible = raw === null || raw === "" ? null : parseRequiredUuid(raw, "responsibleOperatorProfileId");
    }

    const isSetOrChange = nextResponsible != null && nextResponsible !== current.responsibleOperatorProfileId;
    const isClear = nextResponsible === null && current.responsibleOperatorProfileId !== undefined;
    // PRE-efeitos (antes de gravar): valida referência + retira o débito anterior sob a trava (settled → 409).
    if (isSetOrChange) {
      await this.assertResponsibleReference(actor, nextResponsible as string);
      if (current.responsibleOperatorProfileId !== undefined) {
        await this.removeResponsibleStatementEffect(actor, current.id);
      }
    } else if (isClear) {
      await this.removeResponsibleStatementEffect(actor, current.id);
    }

    const input: UpdateDamageInput = {
      tenantId: actor.tenantId,
      damageId: parseRequiredUuid(damageId, "damageId"),
      workOrderId,
      responsibleOperatorProfileId: nextResponsible,
      data: parseOptionalDate(body.data, "data"),
      gravidade: parseOptionalGravidade(body.gravidade),
      descricao: parseOptionalDescricao(body.descricao),
      status: nextStatus,
      tipo: parseOptionalTipo(body.tipo),
      origem: parseOptionalText(body.origem, "origem", 200),
      objeto: parseOptionalText(body.objeto, "objeto", 200),
      identificacaoObjeto: parseOptionalText(body.identificacao_objeto ?? body.identificacaoObjeto, "identificacaoObjeto", 200),
      analiseInterna: parseOptionalText(body.analise_interna ?? body.analiseInterna, "analiseInterna", 5000),
      custoEstimado: parseCusto(body.custo_estimado ?? body.custoEstimado, "custoEstimado"),
      custoReal: nextCustoReal,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new DamageError(404, "DAMAGE_NOT_FOUND", "not_found", "Damage was not found.");
    }

    // POST-efeito: lança o débito do responsável quando há valor a cobrar (idempotente por origem).
    const shouldCharge =
      updated.responsibleOperatorProfileId !== undefined &&
      responsibleAmount !== undefined &&
      (isSetOrChange || !hasActiveDebit);
    if (shouldCharge) {
      this.assertChargeable(updated.custoReal, responsibleAmount as number);
      await this.applyResponsibleStatementEffect(actor, updated, responsibleAmount as number, responsibleInstallmentTotal, responsibleFirstDueDate);
    }

    return updated;
  }

  async listAttachments(actor: DamageActorContext, damageId: string): Promise<readonly DamageAttachment[]> {
    // Ensures the damage exists in-tenant (404 otherwise) before listing photos.
    const damage = await this.getEntity(actor, damageId);

    return this.repository.listAttachments(actor.tenantId, damage.id);
  }

  /**
   * Persists the uploaded photo through the checklist STORAGE PROVIDER (D-014),
   * then records the attachment row. On any DB failure the stored object is
   * removed so no orphan blob is left behind.
   */
  async createUploadedAttachment(
    actor: DamageActorContext,
    damageId: string,
    upload: DamageAttachmentUpload,
  ): Promise<DamageAttachment> {
    const damage = await this.getEntity(actor, damageId);

    const stored = await saveDamageAttachmentFile({
      tenantId: actor.tenantId,
      damageId: damage.id,
      upload: upload.file,
    });

    try {
      const attachment = await this.repository.createAttachment({
        tenantId: actor.tenantId,
        damageId: damage.id,
        fileUrl: stored.fileUrl,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksum,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        marker: upload.marker,
        metadata: {},
        createdBy: actor.userId,
      });

      if (!attachment) {
        throw new DamageError(404, "DAMAGE_NOT_FOUND", "not_found", "Damage was not found.");
      }

      return attachment;
    } catch (error) {
      await deleteStoredDamageAttachmentFile(stored.storageKey, stored.storageProvider);
      throw error;
    }
  }

  async getAttachmentDownload(
    actor: DamageActorContext,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachmentDownload> {
    const attachment = await this.getAttachmentEntity(actor, damageId, attachmentId);

    return resolveDamageAttachmentDownload(attachment);
  }

  /** Removes the attachment row and its stored blob. Returns the removed row. */
  async deleteAttachment(
    actor: DamageActorContext,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment> {
    const attachment = await this.getAttachmentEntity(actor, damageId, attachmentId);

    const removed = await this.repository.deleteAttachment(actor.tenantId, attachment.damageId, attachment.id);

    if (!removed) {
      throw new DamageError(404, "DAMAGE_ATTACHMENT_NOT_FOUND", "attachment_not_found", "Damage attachment was not found.");
    }

    if (removed.storageKey) {
      await deleteStoredDamageAttachmentFile(
        removed.storageKey,
        removed.storageProvider === "s3" ? "s3" : "local",
      );
    }

    return removed;
  }

  private async getEntity(actor: DamageActorContext, damageId: string): Promise<Damage> {
    const damage = await this.repository.findById(actor.tenantId, parseRequiredUuid(damageId, "damageId"));

    if (!damage) {
      throw new DamageError(404, "DAMAGE_NOT_FOUND", "not_found", "Damage was not found.");
    }

    return damage;
  }

  private async getAttachmentEntity(
    actor: DamageActorContext,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment> {
    // Resolving the damage first keeps cross-tenant access a 404 (not a leak).
    const damage = await this.getEntity(actor, damageId);
    const attachment = await this.repository.findAttachmentById(
      actor.tenantId,
      damage.id,
      parseRequiredUuid(attachmentId, "attachmentId"),
    );

    if (!attachment) {
      throw new DamageError(404, "DAMAGE_ATTACHMENT_NOT_FOUND", "attachment_not_found", "Damage attachment was not found.");
    }

    return attachment;
  }

  private async assertVehicleReference(actor: DamageActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new DamageError(
        400,
        "DAMAGE_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }

  private async assertWorkOrderReference(actor: DamageActorContext, workOrderId: string): Promise<void> {
    const resolver = this.references.resolveWorkOrder;
    const exists = resolver ? await resolver(actor, workOrderId) : false;

    if (!exists) {
      throw new DamageError(
        400,
        "DAMAGE_INVALID",
        "invalid_work_order_reference",
        "workOrderId does not reference a work order in this organization.",
      );
    }
  }

  // Ω4C PR-09 — o profissional responsável (operator_profile) deve existir no tenant (a FK composta RESTRICT
  // é o backstop do banco → 23503; aqui é o pré-check → 400 cross-tenant, espelhando vehicle/work-order).
  private async assertResponsibleReference(actor: DamageActorContext, operatorProfileId: string): Promise<void> {
    const resolver = this.references.resolveResponsible;
    const exists = resolver ? await resolver(actor, operatorProfileId) : false;

    if (!exists) {
      throw new DamageError(
        400,
        "DAMAGE_INVALID",
        "invalid_operator_profile_reference",
        "responsibleOperatorProfileId does not reference a professional in this organization.",
      );
    }
  }

  // D-Ω4C-DANO-MONEY (422) — cobrar exige o valor total do dano e o desconto não pode exceder esse total.
  private assertChargeable(custoReal: number | undefined, amount: number): void {
    if (custoReal === undefined) {
      throw new DamageError(
        422,
        "DAMAGE_UNPROCESSABLE",
        "damage_total_required",
        "custoReal (Valor Total do Dano) é obrigatório para lançar o desconto no extrato do profissional.",
      );
    }
    if (amount - custoReal > 1e-9) {
      throw new DamageError(
        422,
        "DAMAGE_UNPROCESSABLE",
        "responsible_amount_exceeds_total",
        "responsibleAmount (Profissional R$) não pode exceder o Valor Total do Dano (custoReal).",
      );
    }
  }

  private async applyResponsibleStatementEffect(
    actor: DamageActorContext,
    damage: Damage,
    amount: number,
    installmentTotal: number,
    firstDueDate: Date | undefined,
  ): Promise<void> {
    const resolver = this.references.createResponsibleStatementDebit;
    if (!resolver || damage.responsibleOperatorProfileId === undefined) return;
    await resolver(actor, {
      damage,
      operatorProfileId: damage.responsibleOperatorProfileId,
      amount,
      installmentTotal,
      firstDueDate: firstDueDate ?? new Date(),
    });
  }

  private async removeResponsibleStatementEffect(actor: DamageActorContext, damageId: string): Promise<void> {
    const resolver = this.references.removeResponsibleStatementDebit;
    if (!resolver) return;
    await resolver(actor, damageId);
  }

  private async getActiveStatementDebit(actor: DamageActorContext, damageId: string): Promise<DamageStatementDebit | undefined> {
    const resolver = this.references.getActiveStatementDebit;
    return resolver ? resolver(actor, damageId) : undefined;
  }
}

// D-Ω4C-DANO-TRAVA — espelha o alerta amarelo do AutEM: com débito ativo no extrato, a exclusão e algumas
// alterações (o valor total) só voltam a ser possíveis quando as parcelas forem removidas do extrato.
function damageStatementLocked(): DamageError {
  return new DamageError(
    409,
    "DAMAGE_CONFLICT",
    "damage_statement_locked",
    "O valor do dano já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do mesmo.",
  );
}

function numbersEqual(a: number | undefined, b: number | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return Math.abs(a - b) < 1e-9;
}

const memoryRepository = new InMemoryDamageRepository();
let defaultServicePromise: Promise<DamageService> | undefined;

export function createMemoryDamageService(_coreService: ICoreSaasService): DamageService {
  return new DamageService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryDamageRepositoryForTests(): InMemoryDamageRepository {
  return memoryRepository;
}

export async function createDefaultDamageService(coreService: ICoreSaasService): Promise<DamageService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryDamageService(coreService);
  }

  defaultServicePromise ??= createPrismaDamageService();

  return defaultServicePromise;
}

export function resetDamageRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaDamageService(): Promise<DamageService> {
  const { createPrismaDamageRepository } = await import("./damage-prisma.repository.js");
  const repository = await createPrismaDamageRepository();

  return new DamageService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds tenant-scoped resolvers over the vehicles, work-orders and operator-profiles default services
 * (shared singletons in memory mode). A cross-tenant or missing reference resolves to `false`, surfacing as
 * a 400 invalid reference. The statement resolvers REUSE the internal PR-03 rail (createForSource/
 * removeForSource/findActiveBySource) via the professional-statement default service — the SAME rail the Multa
 * (PR-07) uses. It is a service→service effect: NÃO exige `professional_statements:create` do usuário (mandato §6).
 */
function createDefaultReferenceResolvers(): DamageReferenceResolvers {
  return {
    resolveVehicle: async (actor, id) => {
      try {
        const service = await createDefaultVehicleService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
    resolveWorkOrder: async (actor, id) => {
      try {
        const service = await createDefaultWorkOrderService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
    resolveResponsible: async (actor, id) => {
      try {
        const service = await createDefaultOperatorProfileService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
    // Efeito de domínio (service→service): lança o débito do dano no extrato do profissional pelo caminho
    // interno reservado da PR-03 (typed damage/debit/damage; amount = valor REAL digitado, nunca fabricado).
    // Idempotente por (source_type='damage', source_id). NÃO cria notificação (Danos não notifica).
    createResponsibleStatementDebit: async (actor, input) => {
      const service = await createDefaultProfessionalStatementService();
      await service.createForSource(actor, {
        operatorProfileId: input.operatorProfileId,
        entryType: "damage",
        direction: "debit",
        sourceType: "damage",
        sourceId: input.damage.id,
        amount: input.amount,
        installmentTotal: input.installmentTotal,
        firstDueDate: input.firstDueDate,
        description: `Dano em viatura (${input.damage.gravidade})`,
      });
    },
    // Efeito inverso: retira o débito do extrato (soft-delete do grupo). Respeita RN-EXT-01 (settled → 409).
    removeResponsibleStatementDebit: async (actor, damageId) => {
      const service = await createDefaultProfessionalStatementService();
      await service.removeForSource(actor, "damage", damageId);
    },
    // Débito ATIVO derivado (nunca persistido; agregado §2.8) — badge do detalhe + trava.
    getActiveStatementDebit: async (actor, damageId) => {
      const service = await createDefaultProfessionalStatementService();
      const entries = await service.findActiveBySource(actor, "damage", damageId);
      return deriveStatementDebit(entries);
    },
  };
}

// Resumo agregado do débito ativo (§2.8): soma das parcelas, plano, 1ª data e se há parcela liquidada.
export function deriveStatementDebit(
  entries: readonly { amount: number; installmentTotal: number; dueDate: Date; status: string }[],
): DamageStatementDebit | undefined {
  if (entries.length === 0) return undefined;
  const totalAmount = Math.round(entries.reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100;
  const firstDueDate = entries.reduce(
    (earliest, entry) => (entry.dueDate.getTime() < earliest.getTime() ? entry.dueDate : earliest),
    entries[0]!.dueDate,
  );
  return {
    totalAmount,
    installmentTotal: entries[0]!.installmentTotal,
    firstDueDate,
    hasSettled: entries.some((entry) => entry.status === "settled"),
  };
}
