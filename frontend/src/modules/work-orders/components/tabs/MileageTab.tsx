import type { CSSProperties } from "react";
import { useState } from "react";
import { Gauge, Route } from "lucide-react";

import { correctMileage } from "../../work-orders.service";
import type { WorkOrderDetail, WorkOrdersApiContext } from "../../work-orders.types";
import { ApiError } from "../../../../services/api/client";

// Ω3F-7b — aba "Quilometragem" do Hub da OS (espelho do FinancialTab). Mostra km inicial/final,
// distância (final−inicial quando ambos), a ORIGEM do dado ("Preenchido pelo app"/"Corrigido pela
// base") e a data da correção. A correção da base (form km inicial/final → PATCH /mileage) é gated
// por work_orders:mileage_correct — quem não tem NÃO vê o form (o técnico de campo só visualiza).
// Estados §7: sem loading (os dados vêm do detail); erro do submit; vazio honesto.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const input: CSSProperties = { width: "100%", padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const statLabel: CSSProperties = { fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" };
const statValue: CSSProperties = { fontSize: 20, fontWeight: 800, color: "#0F172A", marginTop: 4, fontVariantNumeric: "tabular-nums" };

const KM_FORMAT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function formatKm(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${KM_FORMAT.format(value)} km`;
}

// "app" → preenchido no campo pelo técnico; "base" → corrigido no escritório. Outro/ausente → sem origem.
function sourceLabel(source: string | null | undefined): string | null {
  if (source === "app") return "Preenchido pelo app";
  if (source === "base") return "Corrigido pela base";
  return null;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function messageForError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "O km final não pode ser menor que o inicial.";
    if (err.status === 403) return "Você não tem permissão para corrigir a quilometragem.";
    if (err.status === 404) return "Ordem de serviço não encontrada.";
    if (err.status === 400) return "Valor de km inválido.";
    return err.safeMessage;
  }
  return "Não foi possível corrigir a quilometragem.";
}

// Aceita "1234" ou "1234,5" (vírgula pt-BR); vazio → undefined (campo não enviado).
function parseKm(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return Number(trimmed.replace(",", "."));
}

export function MileageTab({
  workOrder,
  context,
  permissions,
  onRefresh,
}: {
  workOrder: WorkOrderDetail;
  context: WorkOrdersApiContext;
  permissions: readonly string[];
  onRefresh?: () => void;
}) {
  const canCorrect = permissions.includes("work_orders:mileage_correct");

  const [start, setStart] = useState(workOrder.mileageStart != null ? String(workOrder.mileageStart) : "");
  const [end, setEnd] = useState(workOrder.mileageEnd != null ? String(workOrder.mileageEnd) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasStart = workOrder.mileageStart != null;
  const hasEnd = workOrder.mileageEnd != null;
  const hasAny = hasStart || hasEnd;
  const distance = hasStart && hasEnd ? Math.max(0, (workOrder.mileageEnd as number) - (workOrder.mileageStart as number)) : null;
  const origin = sourceLabel(workOrder.mileageSource);
  const correctedAt = formatDateTime(workOrder.mileageCorrectedAt);

  const submit = async () => {
    setError(null);
    setSaved(false);
    const startValue = parseKm(start);
    const endValue = parseKm(end);

    if (startValue === undefined && endValue === undefined) {
      setError("Informe ao menos um valor.");
      return;
    }
    const invalid = (v: number | undefined) => v !== undefined && (!Number.isFinite(v) || v < 0 || v > 1e9);
    if (invalid(startValue) || invalid(endValue)) {
      setError("Valor de km inválido.");
      return;
    }
    if (startValue !== undefined && endValue !== undefined && endValue < startValue) {
      setError("O km final não pode ser menor que o inicial.");
      return;
    }

    setBusy(true);
    try {
      await correctMileage(context, workOrder.id, { mileageStart: startValue, mileageEnd: endValue });
      setSaved(true);
      onRefresh?.();
    } catch (err) {
      setError(messageForError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Gauge size={18} aria-hidden style={{ color: "#2563EB" }} />
          <div style={{ fontSize: 15, fontWeight: 800 }}>Quilometragem da OS</div>
        </div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>
          Distância percorrida no atendimento, preenchida pelo app e corrigível pela base.
        </div>

        {hasAny ? (
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <div style={{ padding: 14, border: "1px solid #F1F5F9", borderRadius: 12, background: "#F8FAFC" }}>
              <div style={statLabel}>Km inicial</div>
              <div style={statValue}>{formatKm(workOrder.mileageStart)}</div>
            </div>
            <div style={{ padding: 14, border: "1px solid #F1F5F9", borderRadius: 12, background: "#F8FAFC" }}>
              <div style={statLabel}>Km final</div>
              <div style={statValue}>{formatKm(workOrder.mileageEnd)}</div>
            </div>
            <div style={{ padding: 14, border: "1px solid #DBEAFE", borderRadius: 12, background: "#EFF6FF" }}>
              <div style={{ ...statLabel, color: "#3B82F6" }}>Distância</div>
              <div style={{ ...statValue, color: "#1E40AF" }}>{distance != null ? formatKm(distance) : "—"}</div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18, padding: "24px 20px", textAlign: "center", border: "1px dashed #E2E8F0", borderRadius: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Quilometragem ainda não informada</div>
            <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>O app registra os valores no atendimento; a base pode corrigi-los aqui.</div>
          </div>
        )}

        {origin || correctedAt ? (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#64748B" }}>
            {origin ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: workOrder.mileageSource === "base" ? "#FEF3C7" : "#EFF6FF", color: workOrder.mileageSource === "base" ? "#92400E" : "#2563EB" }}>
                <Route size={13} aria-hidden /> {origin}
              </span>
            ) : null}
            {correctedAt ? <span>Corrigido em {correctedAt}</span> : null}
          </div>
        ) : null}
      </div>

      {canCorrect ? (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Corrigir quilometragem</div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Ajuste os valores informados pelo app. A correção fica registrada como feita pela base.</div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Km inicial
              <input style={{ ...input, marginTop: 5 }} value={start} inputMode="decimal" placeholder="0" onChange={(e) => setStart(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Km final
              <input style={{ ...input, marginTop: 5 }} value={end} inputMode="decimal" placeholder="0" onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>

          {error ? (
            <div style={{ marginTop: 12, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>{error}</div>
          ) : null}
          {saved && !error ? (
            <div style={{ marginTop: 12, padding: "10px 13px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 9, fontSize: 12.5, color: "#166534" }}>Quilometragem corrigida.</div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="button" style={primaryBtn} disabled={busy} onClick={() => void submit()}>
              <Gauge size={16} aria-hidden /> Salvar correção
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MileageTab;
