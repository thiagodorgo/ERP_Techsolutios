import type { CloudUsageMetricKey } from "../cloud-usage/cloud-usage.types.js";
import type { CloudCostAllocationMethod } from "./cloud-cost-allocation.types.js";

export type CloudCostAllocationRule = {
  readonly costCategory: string;
  readonly allocationMethod: CloudCostAllocationMethod;
  readonly basisMetricKeys: readonly CloudUsageMetricKey[];
};

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

  if (service.includes("s3") || usageType.includes("storage") || usageType.includes("byte")) {
    return {
      costCategory: "storage",
      allocationMethod: "storage_usage_weight",
      basisMetricKeys: [
        "storage_gb_month",
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

  if (service.includes("apigateway") || service.includes("elasticloadbalancing") || usageType.includes("request")) {
    return {
      costCategory: "api_requests",
      allocationMethod: "api_request_weight",
      basisMetricKeys: ["api_request.count", "api_requests_count"],
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
