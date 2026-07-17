import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ListChecks, MapPin, Smartphone } from "lucide-react";

import { listDispatchesFromApi } from "../../../operations/dispatches/dispatches.service";
import { formatDispatchDate, getDispatchStatusLabel } from "../../../operations/dispatches/dispatches.adapter";
import type { DispatchListItem } from "../../../operations/dispatches/dispatches.types";
import type { WorkOrderDetail, WorkOrdersApiContext } from "../../work-orders.types";

// Ω3F-7b — aba "Mobile" do Hub da OS. Reúne o que veio do app de campo:
//  1) Timeline das etapas do despacho vinculado à OS (enviado→aceito→iniciado→origem→destino) com data-hora;
//  2) Mapa de posição por etapa — DIFERIDO para a Junta de Mapas (marcador abaixo);
//  3) Preview do checklist congelado (checklistSnapshot) preenchido no app.
// Estados §7: loading/erro/vazio honesto. PT-BR acentuado; sem UUID/termo técnico cru na UI (§11).

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 800, color: "#0F172A" };
const sectionSub: CSSProperties = { fontSize: 12.5, color: "#64748B", marginTop: 3 };

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly dispatch: DispatchListItem | null };

// Etapas do ciclo de vida do despacho, na ordem em que ocorrem no app.
const STAGE_DEFS: readonly { readonly label: string; readonly pick: (d: DispatchListItem) => string | null | undefined }[] = [
  { label: "Enviado ao app", pick: (d) => d.createdAt },
  { label: "Aceito pelo técnico", pick: (d) => d.acceptedAt },
  { label: "Em deslocamento", pick: (d) => d.onRouteAt },
  { label: "Chegada à origem", pick: (d) => d.arrivedAt },
  { label: "Em atendimento", pick: (d) => d.inServiceAt },
  { label: "Concluído no destino", pick: (d) => d.completedAt },
];

// --- Preview defensivo do checklist congelado (JSON opaco) ---
type ChecklistRow = { readonly label: string; readonly value: string };

function coerceValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() || "—";
  if (Array.isArray(value)) return value.map(coerceValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function readFirstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function rowFromItem(item: unknown, index: number): ChecklistRow {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    const label = readFirstString(record, ["label", "title", "name", "question", "text", "key", "item"]) ?? `Item ${index + 1}`;
    for (const key of ["value", "answer", "response", "checked", "status", "result", "note", "notes", "observation"]) {
      if (key in record) return { label, value: coerceValue(record[key]) };
    }
    return { label, value: "—" };
  }
  return { label: `Item ${index + 1}`, value: coerceValue(item) };
}

function parseChecklistSnapshot(snapshot: unknown): { readonly title: string | null; readonly rows: readonly ChecklistRow[] } | null {
  if (snapshot === null || snapshot === undefined) return null;

  if (Array.isArray(snapshot)) {
    return { title: null, rows: snapshot.map(rowFromItem) };
  }
  if (typeof snapshot === "object") {
    const record = snapshot as Record<string, unknown>;
    const title = readFirstString(record, ["name", "title", "templateName", "template_name"]);
    const items = record.items ?? record.fields ?? record.questions ?? record.answers;
    if (Array.isArray(items)) {
      return { title, rows: items.map(rowFromItem) };
    }
    const rows = Object.entries(record)
      .filter(([key]) => !["name", "title", "templateName", "template_name", "id"].includes(key))
      .map(([key, value]) => ({ label: key, value: coerceValue(value) }));
    return { title, rows };
  }
  return { title: null, rows: [{ label: "Checklist", value: coerceValue(snapshot) }] };
}

export function MobileTab({
  workOrder,
  context,
  permissions: _permissions,
}: {
  workOrder: WorkOrderDetail;
  context: WorkOrdersApiContext;
  permissions: readonly string[];
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await listDispatchesFromApi(context, { workOrderId: workOrder.id });
      // O serviço cai em mock quando a API devolve vazio/erro; filtrar pela OS garante que
      // despachos não relacionados nunca vazem para esta aba (OS sem despacho → lista vazia).
      const related = data.items
        .filter((item) => item.workOrderId === workOrder.id)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      setState({ status: "ready", dispatch: related[0] ?? null });
    } catch {
      setState({ status: "error" });
    }
  }, [context, workOrder.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const checklist = parseChecklistSnapshot(workOrder.checklistSnapshot);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* --- Timeline das etapas do despacho --- */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Smartphone size={18} aria-hidden style={{ color: "#2563EB" }} />
          <div style={sectionTitle}>Acompanhamento no app</div>
        </div>
        <div style={sectionSub}>Etapas registradas pelo técnico no app de campo, na ordem em que aconteceram.</div>

        {state.status === "loading" ? (
          <div style={{ marginTop: 16, fontSize: 13, color: "#94A3B8" }}>Carregando etapas do despacho…</div>
        ) : state.status === "error" ? (
          <div style={{ marginTop: 16, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>
            Não foi possível carregar as etapas do despacho desta OS.
          </div>
        ) : state.dispatch === null ? (
          <div style={{ marginTop: 16, padding: "24px 20px", textAlign: "center", border: "1px dashed #E2E8F0", borderRadius: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Esta OS ainda não foi despachada ao app</div>
            <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Quando um técnico for designado, as etapas aparecerão aqui.</div>
          </div>
        ) : (
          <MobileTimeline dispatch={state.dispatch} />
        )}
      </div>

      {/* Mapa de posição por etapa: NÃO renderizado aqui. É um entregável separado (Ω3F-8, aba Mapa da OS,
          via Junta de Mapas) e — mais importante — HOJE NÃO EXISTE a fonte de dados (FieldOperatorLocation é
          localização AO VIVO, não snapshot por etapa de despacho): precisa de agregação backend nova. Sem
          andaime "em breve" na tela (§11.2) — a seção simplesmente não existe até haver o que mostrar. Ver
          P-Ω3F7B-MAPA-ETAPA. */}

      {/* --- Preview do checklist congelado --- */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <ListChecks size={18} aria-hidden style={{ color: "#2563EB" }} />
          <div style={sectionTitle}>Checklist do atendimento</div>
        </div>
        <div style={sectionSub}>Molde preenchido pelo técnico no app, congelado no momento do atendimento.</div>

        {!checklist || checklist.rows.length === 0 ? (
          <div style={{ marginTop: 16, padding: "24px 20px", textAlign: "center", border: "1px dashed #E2E8F0", borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: "#94A3B8" }}>Nenhum checklist preenchido no app.</div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            {checklist.title ? <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>{checklist.title}</div> : null}
            <div style={{ border: "1px solid #F1F5F9", borderRadius: 12, overflow: "hidden" }}>
              {checklist.rows.map((row, index) => (
                <div key={`${row.label}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderTop: index === 0 ? "none" : "1px solid #F1F5F9", background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                  <span style={{ fontSize: 12.5, color: "#64748B", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 12.5, color: "#0F172A", fontWeight: 600, textAlign: "right", whiteSpace: "pre-wrap" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileTimeline({ dispatch }: { dispatch: DispatchListItem }) {
  const stages = STAGE_DEFS.map((def) => ({ label: def.label, at: def.pick(dispatch) ?? null }));
  const terminal = dispatch.cancelledAt
    ? { label: "Cancelado", at: dispatch.cancelledAt, danger: true }
    : dispatch.failedAt
      ? { label: "Falhou", at: dispatch.failedAt, danger: true }
      : null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
        Situação atual: <span style={{ fontWeight: 700, color: "#334155" }}>{getDispatchStatusLabel(dispatch.status)}</span>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {stages.map((stage, index) => {
          const done = Boolean(stage.at);
          return (
            <li key={stage.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: index === stages.length - 1 && !terminal ? 0 : 16, position: "relative" }}>
              {index < stages.length - 1 || terminal ? (
                <span aria-hidden style={{ position: "absolute", left: 8, top: 20, bottom: 0, width: 2, background: "#E2E8F0" }} />
              ) : null}
              <span aria-hidden style={{ marginTop: 1, color: done ? "#16A34A" : "#CBD5E1", zIndex: 1, background: "#fff" }}>
                {done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: done ? "#0F172A" : "#94A3B8" }}>{stage.label}</div>
                <div style={{ fontSize: 12, color: done ? "#64748B" : "#CBD5E1", marginTop: 2 }}>
                  {done ? formatDispatchDate(stage.at) : "Aguardando"}
                </div>
              </div>
            </li>
          );
        })}
        {terminal ? (
          <li style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
            <span aria-hidden style={{ marginTop: 1, color: "#DC2626", zIndex: 1, background: "#fff" }}><CheckCircle2 size={17} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>{terminal.label}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{formatDispatchDate(terminal.at)}</div>
            </div>
          </li>
        ) : null}
      </ol>
    </div>
  );
}

export default MobileTab;
