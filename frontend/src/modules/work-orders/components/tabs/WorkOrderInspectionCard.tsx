import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  fetchWorkOrderInspection,
  type WorkOrderInspectionApiContext,
  type WorkOrderInspectionData,
  type WorkOrderInspectionItem,
  type WorkOrderInspectionResult,
} from "../../inspection.service";
import { fmtDate } from "./GeneralInfoTab";

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  padding: 20,
};

export type WorkOrderInspectionViewProps = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly forbidden: boolean;
  readonly inspection: WorkOrderInspectionData | null;
  readonly onRetry?: () => void;
};

export function WorkOrderInspectionView({
  loading,
  error,
  forbidden,
  inspection,
  onRetry,
}: WorkOrderInspectionViewProps) {
  const hasItems = inspection && inspection.items.length > 0;

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800 }}>Vistoria</div>
        {inspection?.statusLabel ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 99,
              background: "#ECFDF5",
              color: "#059669",
            }}
          >
            {inspection.statusLabel}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div data-inspection-state="loading" style={{ fontSize: 13, color: "#64748B" }}>
          Carregando vistoria…
        </div>
      ) : forbidden ? (
        <div data-inspection-state="forbidden" style={{ fontSize: 13, color: "#64748B" }}>
          Você não tem permissão para visualizar a vistoria desta ordem de serviço.
        </div>
      ) : error ? (
        <div data-inspection-state="error">
          <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 8 }}>{error}</div>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: "6px 12px",
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : !hasItems ? (
        <div data-inspection-state="empty" style={{ fontSize: 13, color: "#64748B" }}>
          Sem vistoria nesta OS
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {inspection.items.map((item: WorkOrderInspectionItem, index: number) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "10px 0",
                borderBottom:
                  index < inspection.items.length - 1 ? "1px solid #F1F5F9" : "none",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
                  {item.value}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#94A3B8",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {fmtDate(item.answeredAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type WorkOrderInspectionCardProps = {
  readonly workOrderId: string;
  readonly context: WorkOrderInspectionApiContext;
  readonly permissions?: readonly string[];
  readonly initialInspection?: WorkOrderInspectionData | null;
};

export function WorkOrderInspectionCard({
  workOrderId,
  context,
  permissions,
  initialInspection,
}: WorkOrderInspectionCardProps) {
  const effectivePermissions = permissions ?? context.permissions ?? [];
  const hasPermission =
    effectivePermissions.length === 0 ||
    effectivePermissions.includes("checklist_runs:read");

  const [loading, setLoading] = useState(initialInspection === undefined && hasPermission);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(!hasPermission);
  const [inspection, setInspection] = useState<WorkOrderInspectionData | null>(
    initialInspection ?? null,
  );

  const load = useCallback(async () => {
    if (!hasPermission) {
      setForbidden(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const result: WorkOrderInspectionResult = await fetchWorkOrderInspection(
        { ...context, permissions: effectivePermissions },
        workOrderId,
      );

      if (result.status === "forbidden") {
        setForbidden(true);
        setInspection(null);
      } else if (result.status === "error") {
        setError(result.error);
        setInspection(null);
      } else if (result.status === "empty") {
        setInspection(null);
      } else {
        setInspection(result.data);
      }
    } catch {
      setError("Não foi possível carregar a vistoria.");
      setInspection(null);
    } finally {
      setLoading(false);
    }
  }, [context, effectivePermissions, hasPermission, workOrderId]);

  useEffect(() => {
    if (initialInspection === undefined) {
      void load();
    }
  }, [initialInspection, load]);

  return (
    <WorkOrderInspectionView
      loading={loading}
      error={error}
      forbidden={forbidden}
      inspection={inspection}
      onRetry={() => void load()}
    />
  );
}

export default WorkOrderInspectionCard;
