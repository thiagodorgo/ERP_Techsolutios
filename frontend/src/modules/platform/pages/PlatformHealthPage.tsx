import type { CSSProperties } from "react";
import { Activity } from "lucide-react";

// "Saúde do Sistema" (sc_platformHealth). Toda a telemetria desta tela (latência p95, erros 5xx, fila de
// sync, uptime, status de serviços) é METRICA DE INFRAESTRUTURA que exige uma stack de OBSERVABILIDADE
// (coleta/ingestão de métricas + healthchecks reais) que ainda NÃO existe nesta versão — trilha de infra
// (Onda 5-6 do docs/scale-roadmap.md). Por CLAUDE.md §2.8 / D-007 esta tela NÃO fabrica número nem status
// de serviço; mostra o estado honesto da ausência de monitoramento até a observabilidade ser ativada.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

export function PlatformHealthPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Saúde do Sistema</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Disponibilidade de serviços, banco, filas, cache e integrações</div>
        </div>
      </div>

      {/* estado honesto — sem telemetria fabricada (D-007 / §2.8) */}
      <div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Activity size={28} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Monitoramento em preparação</div>
        <p style={{ fontSize: 13.5, color: "#475569", maxWidth: 580, lineHeight: 1.6, margin: 0 }}>
          As métricas de saúde da infraestrutura — <strong>latência</strong>, <strong>erros</strong>, <strong>fila de
          sincronização</strong>, <strong>disponibilidade</strong> e o <strong>status de cada serviço</strong> — dependem de uma
          <strong> camada de observabilidade</strong> (coleta de métricas e verificações de saúde reais) que ainda não faz parte
          desta versão. Ela é habilitada <strong>após a ativação da infraestrutura cloud</strong>. Até lá, esta tela não exibe
          indicadores para não apresentar números que ainda não são medidos.
        </p>
        <div style={{ fontSize: 12.5, color: "#94A3B8", maxWidth: 560 }}>
          Enquanto isso, a trilha de auditoria e os agregados de plataforma (organizações e usuários) já refletem dados reais.
        </div>
      </div>
    </div>
  );
}

export default PlatformHealthPage;
