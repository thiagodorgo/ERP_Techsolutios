export const CLOUD_COST_PROVIDERS = ["aws"] as const;
export type CloudCostProvider = (typeof CLOUD_COST_PROVIDERS)[number];

export const CLOUD_COST_SOURCE_TYPES = ["manual_csv", "s3_cur", "athena_query", "mock_fixture"] as const;
export type CloudCostSourceType = (typeof CLOUD_COST_SOURCE_TYPES)[number];

export const CLOUD_COST_IMPORT_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type CloudCostImportStatus = (typeof CLOUD_COST_IMPORT_STATUSES)[number];

export type CloudCostMetadata = Record<string, unknown>;

export type CloudCostImport = {
  readonly id: string;
  readonly provider: CloudCostProvider;
  readonly sourceType: CloudCostSourceType;
  readonly sourceUri?: string;
  readonly status: CloudCostImportStatus;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly importedAt?: Date;
  readonly importedBy?: string;
  readonly rowCount: number;
  readonly totalUnblendedCost: number;
  readonly currency?: string;
  readonly metadata: CloudCostMetadata;
  readonly errorMessage?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CloudCostLineItem = {
  readonly id: string;
  readonly importId: string;
  readonly provider: CloudCostProvider;
  readonly billingPeriodStart: Date;
  readonly billingPeriodEnd: Date;
  readonly usageStart?: Date;
  readonly usageEnd?: Date;
  readonly serviceCode: string;
  readonly usageType?: string;
  readonly operation?: string;
  readonly region?: string;
  readonly resourceId?: string;
  readonly costCategory?: string;
  readonly environment?: string;
  readonly project?: string;
  readonly tenantTag?: string;
  readonly moduleTag?: string;
  readonly usageAmount?: number;
  readonly usageUnit?: string;
  readonly unblendedCost: number;
  readonly amortizedCost?: number;
  readonly currency: string;
  readonly rawLineHash: string;
  readonly metadata: CloudCostMetadata;
  readonly createdAt: Date;
};

export type ParsedAwsCurLineItem = Omit<CloudCostLineItem, "id" | "importId" | "createdAt">;

export type CreateCloudCostImportInput = {
  readonly provider: CloudCostProvider;
  readonly sourceType: CloudCostSourceType;
  readonly sourceUri?: string;
  readonly status: CloudCostImportStatus;
  readonly importedBy?: string;
  readonly metadata?: CloudCostMetadata;
};

export type CompleteCloudCostImportInput = {
  readonly status: CloudCostImportStatus;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly importedAt?: Date;
  readonly rowCount?: number;
  readonly totalUnblendedCost?: number;
  readonly currency?: string;
  readonly errorMessage?: string;
  readonly metadata?: CloudCostMetadata;
};

export type CloudCostImportFilters = {
  readonly status?: CloudCostImportStatus;
  readonly sourceType?: CloudCostSourceType;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
};

export type CloudCostLineItemFilters = {
  readonly importId?: string;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly serviceCode?: string;
  readonly usageType?: string;
  readonly region?: string;
  readonly tenantTag?: string;
  readonly limit?: number;
};

export type ImportAwsCurCsvInput = {
  readonly csv: string;
  readonly sourceType?: CloudCostSourceType;
  readonly sourceUri?: string;
  readonly importedBy?: string;
  readonly metadata?: CloudCostMetadata;
};

// B-O6R-06 (Omega6R-DIN-007) — A FORMA QUE O `SUM`/`GROUP BY` NO BANCO DEVOLVE, com os tipos NULAVEIS.
//
// `SUM` de zero linhas devolve NULL, nao zero (PostgreSQL), e o Prisma tipa TODO campo agregado como
// nulavel desde 2.21.0 — `_count` e a excecao, sempre numero. Periodo vazio e estado NORMAL (organizacao
// nova, filtro sem linha), entao `null` aqui nao e erro: e "nao havia o que somar".
//
// `lineItemCount` e o DISCRIMINADOR entre "janela vazia" e "soma nula". A regra de contrato vive no
// servico: `lineItemCount === 0` -> zeros; `lineItemCount > 0 && total === null` -> ERRO (combinacao
// impossivel, denuncia bug). Um `?? 0` incondicional e PROIBIDO NOMINALMENTE neste bloco — e o mesmo
// `|| 0` que ja fabricou pico no painel de KPI desta casa. Sem `COALESCE` no SQL, pela mesma razao.
//
// O total viaja como STRING DECIMAL (o `Decimal.toString()` do driver, sem `toNumber()` no meio): com
// `@prisma/adapter-pg` o `numeric` chega como texto -> Decimal, sem float em ponto nenhum. A conversao
// para `number` acontece UMA vez, na borda do contrato, e o campo exato viaja ao lado.
export type CloudCostSummaryRow = {
  readonly serviceCode: string;
  readonly currency: string;
  readonly unblendedCost: string | null;
  readonly lineItemCount: number;
};

export type CloudCostSummaryRows = {
  readonly total: string | null;
  readonly lineItemCount: number;
  readonly byServiceCurrency: readonly CloudCostSummaryRow[];
  readonly currencies: readonly string[];
};

export type CloudCostSummary = {
  readonly provider: CloudCostProvider;
  readonly periodStart: string;
  readonly periodEnd: string;
  // LOSSY acima de ~1e10 com 6 casas — documentado, mantido por compatibilidade do painel. O valor
  // EXATO e `totalUnblendedCostExact`, que e o que se deve usar para conferir fatura.
  readonly totalUnblendedCost: number;
  readonly totalUnblendedCostExact: string;
  // Quantas linhas de custo foram AGREGADAS. E o que permite ao consumidor cruzar resumo x detalhe
  // paginado — antes o resumo somava no maximo 10.000 linhas e nao tinha como dizer que faltou linha.
  readonly lineItemCount: number;
  readonly currencies: readonly string[];
  readonly services: readonly {
    readonly serviceCode: string;
    readonly unblendedCost: number;
    readonly unblendedCostExact: string;
    readonly currency: string;
  }[];
  readonly generatedAt: string;
};

export class CloudCostError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CloudCostError";
  }
}
