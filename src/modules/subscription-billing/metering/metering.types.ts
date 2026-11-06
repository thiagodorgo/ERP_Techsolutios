// B-ASS-03 — domínio da medição diária por organização. Valores de banco/arquivo em BigInt (bytes) e
// contagens em number. `db_bytes_estimated` e `files_bytes` saem como STRING decimal na borda HTTP
// (BigInt não serializa em JSON); os tipos internos ficam em BigInt.

export const METERING_METHOD_VERSION = 2;

// As 4 tabelas de anexo medidas. `status`/`deleted_at` existem SÓ em work_order_attachments e
// attachments (E23); checklist_attachments e damage_attachments não têm essas colunas (S2) e entram
// sem filtro. A ordem aqui é a ordem do inventário de storage do rateio (STORAGE_INVENTORY_MODELS).
export const METERING_ATTACHMENT_MODELS = [
  "checklist_attachments",
  "work_order_attachments",
  "attachments",
  "damage_attachments",
] as const;

export type MeteringAttachmentModel = (typeof METERING_ATTACHMENT_MODELS)[number];

// Filtros por tabela: só as duas que têm as colunas filtram; as outras não.
export const METERING_ATTACHMENT_FILTERS: Record<MeteringAttachmentModel, { readonly deletedAt?: boolean; readonly status?: boolean }> = {
  checklist_attachments: {},
  work_order_attachments: { deletedAt: true, status: true },
  attachments: { deletedAt: true, status: true },
  damage_attachments: {},
};

export type TenantUsageDaily = {
  readonly tenantId: string;
  readonly date: string;
  readonly activeUsers: number | null;
  readonly dbBytesEstimated: bigint | null;
  readonly filesBytes: bigint | null;
  readonly filesWithoutSize: number | null;
  readonly trackedVehicles: number | null;
  readonly methodVersion: number;
  readonly measuredAt: Date;
  readonly metadata: TenantUsageDailyMetadata;
};

export type TenantUsageDailyMetadata = {
  readonly tablesTimedOut: readonly string[];
};

export type TenantUsageUpsert = {
  readonly tenantId: string;
  readonly date: string;
  readonly activeUsers: number;
  readonly dbBytesEstimated: bigint | null;
  readonly filesBytes: bigint | null;
  readonly filesWithoutSize: number;
  readonly trackedVehicles: number;
  readonly methodVersion: number;
  readonly measuredAt: Date;
  readonly metadata: TenantUsageDailyMetadata;
};

export class MeteringError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "MeteringError";
  }
}

/** O GUC de tenant não casa com o da organização da volta (ou está ausente). Fail-closed: nada é gravado. */
export class TenantContextMissingError extends MeteringError {
  constructor() {
    super(500, "tenant_context_missing", "tenant_context_missing", "tenant_context_missing: GUC app.current_tenant_id ausente ou diferente da organização da volta.");
    this.name = "TenantContextMissingError";
  }
}

/** Estouro do statement_timeout de uma tabela. O medidor registra a tabela e continua as demais (gap honesto). */
export class TableMeasurementTimeoutError extends Error {
  constructor(readonly table: string) {
    super(`table_measurement_timeout: ${table}`);
    this.name = "TableMeasurementTimeoutError";
  }
}
