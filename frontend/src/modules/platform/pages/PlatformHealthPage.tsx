import type { CSSProperties } from "react";

// "Health do Sistema" (sc_platformHealth). Alvo: ERP Web.dc.html.

type Metric = { value: string; label: string; color?: string };
type Service = { name: string; meta: string; status: string; dot: string; bg: string; color: string };

const METRICS: Metric[] = [
  { value: "128 ms", label: "Latência p95 API" },
  { value: "0", label: "Erros 5xx (24h)" },
  { value: "34", label: "Fila de sync", color: "#D97706" },
  { value: "03:00", label: "Último backup" },
];

const SERVICES: Service[] = [
  { name: "API Gateway", meta: "core · 3 instâncias", status: "Operacional", dot: "#10B981", bg: "#ECFDF5", color: "#059669" },
  { name: "PostgreSQL", meta: "primário + réplica · 42% CPU", status: "Operacional", dot: "#10B981", bg: "#ECFDF5", color: "#059669" },
  { name: "Redis (cache/filas)", meta: "hit 98,7% · 34 em fila", status: "Degradado", dot: "#F59E0B", bg: "#FFFBEB", color: "#D97706" },
  { name: "Object Storage", meta: "evidências e anexos", status: "Operacional", dot: "#10B981", bg: "#ECFDF5", color: "#059669" },
  { name: "Worker de Sync", meta: "replay offline · 2 réplicas", status: "Operacional", dot: "#10B981", bg: "#ECFDF5", color: "#059669" },
  { name: "Integração BI", meta: "export diário · webhook", status: "Operacional", dot: "#10B981", bg: "#ECFDF5", color: "#059669" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

export function PlatformHealthPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Health do Sistema</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>serviços, banco, filas, cache e integrações</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 99, background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#059669" }}>Uptime 99,98% (30d)</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        {METRICS.map((m) => (
          <div key={m.label} style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.color ?? "#0F172A" }}>{m.value}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 1 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800 }}>Serviços monitorados</div>
        {SERVICES.map((s) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{s.meta}</div>
            </div>
            <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 99, whiteSpace: "nowrap" }}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformHealthPage;
