import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";

import { listWorkOrderAuditLogs } from "../../work-orders.service";
import type { WorkOrderAuditLog, WorkOrderAuditLogApiContext } from "../../audit-logs.types";

// Ω3F-8a — aba "Logs" do Hub da OS: leitura da AUDITORIA filtrada pela OS. Cada linha responde
// quem [actorName, ou "Sistema" quando nulo] · o quê [action humanizada em PT-BR] · quando [data-hora].
// §11.2: mostra o NOME do autor, nunca o UUID. §7: loading / erro / vazio.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

// Mapa action → rótulo PT-BR de negócio (acentuado, §11). Cobre as ações de OS conhecidas; ações
// desconhecidas caem no humanizador (nunca o enum cru).
const ACTION_LABELS: Readonly<Record<string, string>> = {
  "work_order.created": "OS criada",
  "work_order.updated": "OS atualizada",
  "work_order.cancelled": "OS cancelada",
  "work_order.duplicated": "OS duplicada",
  "work_order.assigned": "OS atribuída",
  "work_order.geocoded": "Endereço geolocalizado",
  "work_order.mileage_updated": "Quilometragem atualizada",
  "work_order.comment_added": "Comentário adicionado",
  "work_order.comment_edited": "Comentário editado",
  "work_order.comment_deleted": "Comentário excluído",
  "work_order.comment_tag_attached": "Etiqueta anexada ao comentário",
  "work_order.comment_tag_detached": "Etiqueta removida do comentário",
  "work_order.attachment_uploaded": "Arquivo anexado",
  "work_order.attachment_deleted": "Arquivo removido",
  "work_order.financial_item_added": "Item financeiro lançado",
  "work_order.financial_item_updated": "Item financeiro atualizado",
  "work_order.financial_item_deleted": "Item financeiro excluído",
};

// Fallback legível para ações fora do mapa: descarta o prefixo do domínio, troca separadores por espaço
// e capitaliza — jamais expõe o enum cru feio (ex.: "billing.invoice_sent" → "Invoice sent").
export function humanizeAction(action: string): string {
  const known = ACTION_LABELS[action];
  if (known) return known;
  const tail = action.includes(".") ? action.slice(action.lastIndexOf(".") + 1) : action;
  const words = tail.replace(/[._-]+/g, " ").trim();
  if (!words) return action;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function LogsTab({
  workOrderId,
  context,
}: {
  workOrderId: string;
  context: WorkOrderAuditLogApiContext;
  permissions: readonly string[];
}) {
  const [logs, setLogs] = useState<readonly WorkOrderAuditLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkOrderAuditLogs(context, workOrderId);
      setLogs(data.items);
    } catch {
      setError("Não foi possível carregar os registros de auditoria desta ordem de serviço.");
    } finally {
      setLoading(false);
    }
  }, [context, workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = logs ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}>
            <History size={19} aria-hidden />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Logs</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>Trilha de auditoria desta ordem de serviço: quem fez, o quê e quando.</div>
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ ...card, padding: "12px 16px", background: "#FEF2F2", borderColor: "#FECACA", fontSize: 12.5, color: "#B91C1C" }}>{error}</div>
      ) : null}

      {loading ? (
        <div style={{ ...card, padding: 20, fontSize: 13, color: "#94A3B8" }}>Carregando registros de auditoria…</div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: "28px 20px", textAlign: "center", borderStyle: "dashed" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Nenhum registro de auditoria</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>As ações realizadas nesta ordem de serviço aparecerão aqui.</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 6 }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((log, index) => (
              <li
                key={log.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 14px", borderTop: index === 0 ? "none" : "1px solid #F1F5F9" }}
              >
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 99, background: "#2563EB", marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{humanizeAction(log.action)}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    {/* §11.2 — NOME do autor (resolvido no backend); nulo → "Sistema". Nunca o UUID. */}
                    <span style={{ fontWeight: 600, color: "#475569" }}>{log.actorName ?? "Sistema"}</span>
                    {log.createdAt ? <span> · {formatDateTime(log.createdAt)}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LogsTab;
