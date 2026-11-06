import type { AllocationBasisMetricKey, CloudCostAllocationMethod } from "./cloud-cost-allocation.types.js";

export type CloudCostAllocationRule = {
  readonly costCategory: string;
  readonly allocationMethod: CloudCostAllocationMethod;
  readonly basisMetricKeys: readonly AllocationBasisMetricKey[];
  /** B-SAN3-03 · R11 — base aproximada (pelas ações), rotulada como estimativa até a medição própria. */
  readonly estimate?: true;
};

// B-SAN3-03 · R11 (RECOMENDACAO ADOTADA 1, não é fala do dono) — máquina, banco e cache, por código de
// serviço EXATO em minúsculas. Base: ações auditadas, com o método `api_request_weight` (o CHECK de
// `allocation_method` é lista fechada; método novo exigiria migração). O banco passa ao espaço medido
// (`db_bytes_estimated`) no B-ASS-03.
const COMPUTE_SERVICES = new Set(["amazonec2", "amazonecs", "amazoneks", "awsfargate"]);
const DATABASE_SERVICES = new Set(["amazonrds"]);
const CACHE_SERVICES = new Set(["amazonelasticache", "amazonmemorydb"]);

function estimatedByActions(costCategory: string): CloudCostAllocationRule {
  return {
    costCategory,
    allocationMethod: "api_request_weight",
    basisMetricKeys: ["audited_actions_count"],
    estimate: true,
  };
}

export function resolveAllocationRule(input: {
  readonly serviceCode: string;
  readonly usageType?: string;
  readonly operation?: string;
}): CloudCostAllocationRule | undefined {
  const service = input.serviceCode.toLowerCase();
  const usageType = input.usageType?.toLowerCase() ?? "";
  const operation = input.operation?.toLowerCase() ?? "";

  if (service.includes("s3") && (usageType.includes("request") || operation.includes("get") || operation.includes("put"))) {
    return {
      costCategory: "s3_requests",
      allocationMethod: "download_usage_weight",
      basisMetricKeys: [
        "checklist_attachment.downloaded.bytes",
        "checklist_attachment.downloaded.count",
        "s3_get_requests",
        "s3_put_requests",
      ],
    };
  }

  // Antes de `storage`: `AmazonRDS/GP2-Storage` e `AmazonEC2/DataTransfer-Out-Bytes` cairiam lá.
  if (COMPUTE_SERVICES.has(service)) return estimatedByActions("compute");
  // B-ASS-03 · R-MED-8 — o banco pesa pelo ESPAÇO MEDIDO (`db_bytes_estimated`, último dia medido até o fim
  // do período); sem medição de nenhuma organização, `resolveBasis` cai para as ações (Q5 da emenda §3.1).
  if (DATABASE_SERVICES.has(service)) {
    return {
      costCategory: "database",
      allocationMethod: "storage_usage_weight",
      basisMetricKeys: ["db_bytes_estimated", "audited_actions_count"],
      estimate: true,
    };
  }
  if (CACHE_SERVICES.has(service)) return estimatedByActions("cache");

  if (service.includes("s3") || usageType.includes("storage") || usageType.includes("byte")) {
    return {
      costCategory: "storage",
      allocationMethod: "storage_usage_weight",
      basisMetricKeys: [
        "storage_bytes_current",
        "checklist_attachment.uploaded.bytes",
        "checklist_attachment.downloaded.bytes",
      ],
    };
  }

  if (service.includes("sqs") || service.includes("lambda") || service.includes("eventbridge") || usageType.includes("queue")) {
    return {
      costCategory: "jobs",
      allocationMethod: "job_execution_weight",
      basisMetricKeys: ["job.executed", "job_executions_count"],
    };
  }

  if (service.includes("apigateway") || service.includes("elasticloadbalancing") || service.includes("awselb") || usageType.includes("request")) {
    return {
      costCategory: "api_requests",
      allocationMethod: "api_request_weight",
      basisMetricKeys: ["audited_actions_count"],
    };
  }

  if (service.includes("checklist") || usageType.includes("checklist")) {
    return {
      costCategory: "checklists",
      allocationMethod: "checklist_run_weight",
      basisMetricKeys: ["checklist_run.completed", "checklist_runs_count"],
    };
  }

  return undefined;
}
