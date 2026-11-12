import type { AllocationBasisMetricKey, CloudCostAllocationMethod } from "./cloud-cost-allocation.types.js";

export type CloudCostAllocationRule = {
  readonly costCategory: string;
  readonly allocationMethod: CloudCostAllocationMethod;
  readonly basisMetricKeys: readonly AllocationBasisMetricKey[];
  /** B-SAN3-03 · R11 — base aproximada (pelas ações), rotulada como estimativa até a medição própria. */
  readonly estimate?: true;
  /**
   * B-ASS-09a · R8 (P6, `P-ASS03-METODO-RATEIO-FALLBACK`) — o método gravado segue a base EFETIVAMENTE usada. Só a regra
   * do banco preenche: sem medição de espaço ela cai para as ações e grava `api_request_weight`. As outras regras com
   * mais de uma base ficam como estão (`P-ASS09A-METODO-OUTRAS-REGRAS`, dono `B-ASS-09`).
   */
  readonly methodByMetricKey?: Partial<Record<AllocationBasisMetricKey, CloudCostAllocationMethod>>;
};

// B-SAN3-03 · R11 (RECOMENDACAO ADOTADA 1, não é fala do dono) — máquina, banco e cache, por código de
// serviço EXATO em minúsculas. Base: ações auditadas, com o método `api_request_weight` (o CHECK de
// `allocation_method` é lista fechada; método novo exigiria migração). O banco passa ao espaço medido
// (`db_bytes_estimated`) no B-ASS-03.
const COMPUTE_SERVICES = new Set(["amazonec2", "amazonecs", "amazoneks", "awsfargate"]);
const DATABASE_SERVICES = new Set(["amazonrds"]);
const CACHE_SERVICES = new Set(["amazonelasticache", "amazonmemorydb"]);

// B-ASS-09a · R5 (P8) — monitoramento, chaves, DNS e rede entram no rateio PELAS AÇÕES, como estimativa: decisão do
// dono de 31/10 (`D-COBRANCA-RESPOSTAS-3110`, anexo CE-P8: "Recomendação: sim, pelas ações"). O mapa dos códigos é
// desenho do plano do bloco, não fala do dono; "chaves" inclui o Secrets Manager por leitura declarada do plano (§A6).
// Por código de serviço EXATO, consultado antes de `storage` e de `api_requests`: sem ele, `AmazonVPC/NatGateway-Bytes`
// caía em `storage` (por "byte") e `AmazonCloudWatch/…Requests` em `api_requests`. O NAT Gateway do CUR real vem com o
// código `AmazonEC2` e entra como máquina (R2-09); o `AmazonVPC` fica para endpoint e IPv4 público.
const PLATFORM_SHARED_SERVICES = new Map<string, string>([["amazoncloudwatch", "monitoring"], ["awskms", "keys"], ["awssecretsmanager", "keys"], ["amazonroute53", "dns"], ["amazonvpc", "network"]]);

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
      methodByMetricKey: { db_bytes_estimated: "storage_usage_weight", audited_actions_count: "api_request_weight" },
      estimate: true,
    };
  }
  if (CACHE_SERVICES.has(service)) return estimatedByActions("cache");
  const sharedCategory = PLATFORM_SHARED_SERVICES.get(service);
  if (sharedCategory) return estimatedByActions(sharedCategory);

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
