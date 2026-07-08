// F5 Danos — tipos do módulo de Frota (Damage). DTO camelCase do backend /damages.
// `status` avança por transição de linha (registrado → em_tratativa → resolvido).
// Anexos (fotos) são SAFE: nunca expõem storage_key, file_url, bucket, path ou base64 (allowlist §2.8).

export type DamageStatus = "registrado" | "em_tratativa" | "resolvido";
export type DamageGravidade = "leve" | "moderada" | "grave";

// Marcação opcional da foto sobre a viatura (x/y) + observação. Campos seguros para exibição.
export type DamageAttachmentMarker = {
  readonly x?: number;
  readonly y?: number;
  readonly description?: string;
};

// Anexo SAFE — só metadados de exibição + caminho autenticado de download.
// `downloadPath = /api/v1/damages/:damageId/attachments/:id/download` (stream autenticado).
export type DamageAttachment = {
  readonly id: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly marker?: DamageAttachmentMarker | null;
  readonly createdAt: string;
  readonly downloadPath: string;
};

export type Damage = {
  readonly id: string;
  readonly vehicleId: string;
  readonly workOrderId: string | null;
  readonly data: string;
  readonly gravidade: DamageGravidade;
  readonly descricao: string;
  readonly status: DamageStatus;
  readonly custoEstimado: number | null;
  readonly custoReal: number | null;
  readonly isActive: boolean;
  readonly attachments: DamageAttachment[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DamagePagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type DamageSource = "api" | "mock" | "fallback";

export type DamageData = {
  readonly items: Damage[];
  readonly pagination: DamagePagination;
  readonly source: DamageSource;
  readonly fallbackReason?: string;
};

// Filtro de situação lógica (compatível com a dense-list: all/active/inactive → is_active).
export type DamageStatusFilter = "all" | "active" | "inactive";

export type DamageFilters = {
  readonly search: string;
  readonly isActive: DamageStatusFilter;
  readonly vehicleId?: string;
  readonly workOrderId?: string;
  readonly status?: DamageStatus;
  readonly gravidade?: DamageGravidade;
  // Janela de busca (`limit`); ordenação/paginação/filtros são client-side sobre ela.
  readonly limit?: number;
  readonly offset?: number;
};

export type DamageApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Rascunho validado no cliente antes do envio (custos podem faltar durante a digitação).
export type DamageDraft = {
  readonly vehicleId: string;
  readonly gravidade: DamageGravidade | "";
  readonly data: string;
  readonly descricao: string;
  readonly workOrderId?: string;
  readonly custoEstimado?: number;
  readonly custoReal?: number;
};

export type DamageCreatePayload = {
  readonly vehicleId: string;
  readonly gravidade: DamageGravidade;
  readonly data: string;
  readonly descricao: string;
  readonly workOrderId?: string;
  readonly custoEstimado?: number;
  readonly custoReal?: number;
  readonly isActive?: boolean;
};

// PATCH único: edição de campos, transição de situação e desativação lógica.
export type DamageUpdatePayload = Partial<
  DamageCreatePayload & {
    readonly status: DamageStatus;
  }
>;

export type DamageAttachmentUploadOptions = {
  readonly x?: number;
  readonly y?: number;
  readonly description?: string;
};

export type DamageAttachmentDownloadResult = {
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
};

export type DamageField = keyof DamageDraft;

export type DamageFieldError = {
  readonly field: DamageField;
  readonly message: string;
};
