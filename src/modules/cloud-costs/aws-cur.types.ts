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

export type CloudCostSummary = {
  readonly provider: CloudCostProvider;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalUnblendedCost: number;
  readonly currencies: readonly string[];
  readonly services: readonly {
    readonly serviceCode: string;
    readonly unblendedCost: number;
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
