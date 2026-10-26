import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";

export type WorkOrderInspectionApiContext = {
  readonly token?: string | null;
  readonly tenantId?: string;
  readonly branchId?: string | null;
  readonly role?: string;
  readonly permissions?: readonly string[];
};

export type WorkOrderInspectionItem = {
  readonly id: string;
  readonly componentId: string;
  readonly label: string;
  readonly value: string;
  readonly answeredAt: string | null;
};

export type WorkOrderInspectionData = {
  readonly runId: string;
  readonly templateName: string | null;
  readonly status: string;
  readonly statusLabel: string;
  readonly completedAt: string | null;
  readonly items: readonly WorkOrderInspectionItem[];
};

export type WorkOrderInspectionResult =
  | { readonly status: "success"; readonly data: WorkOrderInspectionData }
  | { readonly status: "empty" }
  | { readonly status: "forbidden" }
  | { readonly status: "error"; readonly error: string };

function toRequestOptions(context: WorkOrderInspectionApiContext) {
  return {
    token: context.token ?? undefined,
    tenantId: context.tenantId,
    branchId: context.branchId ?? undefined,
    role: context.role,
    permissions: context.permissions ? [...context.permissions] : undefined,
  };
}

export function formatInspectionStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Concluída";
    case "completed_with_divergence":
      return "Concluída com divergência";
    case "pending_acknowledgement":
      return "Aguardando ciência";
    case "in_progress":
      return "Em andamento";
    case "cancelled":
      return "Cancelada";
    default:
      return status || "Em andamento";
  }
}

export function formatInspectionValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === "true") return "Sim";
    if (trimmed.toLowerCase() === "false") return "Não";
    return trimmed || "—";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((entry) => (typeof entry === "string" ? entry : formatInspectionValue(entry)))
      .filter(Boolean)
      .join(", ") || "—";
  }
  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.text === "string" && candidate.text.trim()) {
      return candidate.text.trim();
    }
    if (typeof candidate.value !== "undefined") {
      return formatInspectionValue(candidate.value);
    }
    if (typeof candidate.label === "string" && candidate.label.trim()) {
      return candidate.label.trim();
    }
  }
  return "—";
}

type ChecklistRunListDto = {
  readonly id: string;
  readonly status: string;
  readonly templateId: string;
  readonly completedAt?: string | null;
  readonly createdAt: string;
};

type ChecklistRunComparisonDto = {
  readonly run: {
    readonly id: string;
    readonly status: string;
    readonly completedAt?: string | null;
    readonly createdAt: string;
  };
  readonly template?: {
    readonly id: string;
    readonly name: string;
    readonly components?: Array<{
      readonly id: string;
      readonly label: string;
      readonly type: string;
    }>;
  } | null;
  readonly answers: Array<{
    readonly id?: string;
    readonly componentId: string;
    readonly value: unknown;
    readonly createdAt?: string;
    readonly updatedAt?: string;
  }>;
};

export async function fetchWorkOrderInspection(
  context: WorkOrderInspectionApiContext,
  workOrderId: string,
): Promise<WorkOrderInspectionResult> {
  if (context.permissions && !context.permissions.includes("checklist_runs:read")) {
    return { status: "forbidden" };
  }

  if (isMockMode()) {
    return { status: "empty" };
  }

  try {
    const options = toRequestOptions(context);
    const runsResponse = await apiRequest<{ readonly data: readonly ChecklistRunListDto[] }>(
      `/mobile/checklist-runs?workOrderId=${encodeURIComponent(workOrderId)}`,
      options,
    );

    const runs = runsResponse?.data ?? [];
    if (!Array.isArray(runs) || runs.length === 0) {
      return { status: "empty" };
    }

    const targetRun =
      runs.find(
        (r) =>
          r.status === "completed" ||
          r.status === "completed_with_divergence" ||
          r.status === "pending_acknowledgement",
      ) ?? runs[0];

    if (!targetRun?.id) {
      return { status: "empty" };
    }

    const comparisonResponse = await apiRequest<{ readonly data: ChecklistRunComparisonDto }>(
      `/mobile/checklist-runs/${encodeURIComponent(targetRun.id)}/comparison`,
      options,
    );

    const comparison = comparisonResponse?.data;
    if (!comparison) {
      return { status: "empty" };
    }

    const templateComponents = comparison.template?.components ?? [];
    const answers = comparison.answers ?? [];

    // Foto NÃO entra: o servidor recusa arquivo até existir o antivírus.
    const items: WorkOrderInspectionItem[] = [];

    for (const answer of answers) {
      const comp = templateComponents.find((c) => c.id === answer.componentId);
      if (comp?.type === "photo_upload" || comp?.type === "evidence") {
        continue;
      }

      const label = comp?.label?.trim() || "Item";
      const formattedValue = formatInspectionValue(answer.value);
      const answeredAt =
        answer.createdAt ??
        answer.updatedAt ??
        comparison.run.completedAt ??
        comparison.run.createdAt ??
        null;

      items.push({
        id: answer.id ?? answer.componentId,
        componentId: answer.componentId,
        label,
        value: formattedValue,
        answeredAt,
      });
    }

    if (items.length === 0) {
      return { status: "empty" };
    }

    return {
      status: "success",
      data: {
        runId: comparison.run.id,
        templateName: comparison.template?.name ?? null,
        status: comparison.run.status,
        statusLabel: formatInspectionStatusLabel(comparison.run.status),
        completedAt: comparison.run.completedAt ?? null,
        items,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("403") ||
      message.includes("permission_required") ||
      message.includes("forbidden")
    ) {
      return { status: "forbidden" };
    }
    return { status: "error", error: "Não foi possível carregar a vistoria." };
  }
}
