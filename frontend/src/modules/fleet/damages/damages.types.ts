// F5 Danos — tipos do módulo de Frota (Damage). DTO camelCase do backend /damages.
// `status` avança por transição de linha (registrado → em_tratativa → resolvido).
// Anexos (fotos) são SAFE: nunca expõem storage_key, file_url, bucket, path ou base64 (allowlist §2.8).

export type DamageStatus = "registrado" | "em_tratativa" | "resolvido";
export type DamageGravidade = "leve" | "moderada" | "grave";

// Ω4C PR-09 — "Tipo de Dano" (enum-app em inglês, rótulo PT-BR na fronteira: Interno/Externo/Ambos).
export type DamageTipo = "internal" | "external" | "both";

// Ω4C PR-09 — disposição DERIVADA do backend: `statement` = há profissional responsável atribuído (com o
// desconto lançado no extrato quando há valor a cobrar); `none` = sem responsável. §2.8: o nome do
// responsável NÃO vem no DTO — é resolvido no front pela lista de Profissionais, JAMAIS a CNH.
export type DamageDisposition = "statement" | "none";

// Ω4C PR-09 (D-Ω4C-DANO-MONEY) — resumo DERIVADO do débito ATIVO do dano no extrato do profissional. Só
// aparece no DETALHE (GET /:id), nunca na lista. §2.8: agregado (total + plano de parcelas), sem parcela
// individual/CNH. `null` = sem débito ativo (identificação-só / empresa absorve). Alimenta o badge
// "Lançado no extrato" e a trava do formulário (Valor Total e desativação bloqueados enquanto ativo).
export type DamageStatementDebit = {
  readonly totalAmount: number;
  readonly installmentTotal: number;
  readonly firstDueDate: string;
  readonly hasSettled: boolean;
};

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
  // Ω4C PR-09 — PROFISSIONAL RESPONSÁVEL (um operator_profile). Setar + valor a cobrar → desconto parcelado
  // no extrato desse profissional (RN-EXT-01). `null` = sem responsável.
  readonly responsibleOperatorProfileId: string | null;
  readonly disposition: DamageDisposition;
  readonly data: string;
  readonly gravidade: DamageGravidade;
  readonly descricao: string;
  readonly status: DamageStatus;
  // Ω4C PR-09 — campos descritivos (display/impressão). `analiseInterna` é uso interno e NUNCA é impressa.
  readonly tipo: DamageTipo | null;
  readonly origem: string | null;
  readonly objeto: string | null;
  readonly identificacaoObjeto: string | null;
  readonly analiseInterna: string | null;
  readonly custoEstimado: number | null;
  readonly custoReal: number | null;
  // Ω4C PR-09 — débito ativo DERIVADO do extrato (só no detalhe; `null` na lista e quando não há débito).
  readonly statementDebit: DamageStatementDebit | null;
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
  readonly tipo?: DamageTipo | "";
  readonly origem?: string;
  readonly objeto?: string;
  readonly identificacaoObjeto?: string;
  readonly analiseInterna?: string;
  readonly custoEstimado?: number;
  readonly custoReal?: number;
  // Ω4C PR-09 — responsável (Profissional) + desconto no extrato (valor pode ser PARCIAL) + parcelas + 1º venc.
  readonly responsibleOperatorProfileId?: string;
  readonly responsibleAmount?: number;
  readonly responsibleInstallmentTotal?: number;
  readonly responsibleFirstDueDate?: string;
};

export type DamageCreatePayload = {
  readonly vehicleId: string;
  readonly gravidade: DamageGravidade;
  readonly data: string;
  readonly descricao: string;
  readonly workOrderId?: string;
  readonly tipo?: DamageTipo;
  readonly origem?: string;
  readonly objeto?: string;
  readonly identificacaoObjeto?: string;
  readonly analiseInterna?: string;
  readonly custoEstimado?: number;
  readonly custoReal?: number;
  // Ω4C PR-09 — setar o responsável + valor no create dispara o débito parcelado no extrato (RN-EXT-01).
  readonly responsibleOperatorProfileId?: string;
  readonly responsibleAmount?: number;
  readonly responsibleInstallmentTotal?: number;
  readonly responsibleFirstDueDate?: string;
  readonly isActive?: boolean;
};

// PATCH único: edição de campos, transição de situação e desativação lógica.
// `responsibleOperatorProfileId`: `null` LIMPA (retira o débito do extrato); string SETA/TROCA; omitido = não muda.
export type DamageUpdatePayload = Partial<
  Omit<DamageCreatePayload, "responsibleOperatorProfileId"> & {
    readonly status: DamageStatus;
    readonly responsibleOperatorProfileId: string | null;
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
