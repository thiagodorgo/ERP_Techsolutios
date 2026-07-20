import type { CSSProperties } from "react";
import { FileText, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { usePermissions } from "../../../providers/PermissionProvider";

// "Faturas" (sc invoices). A emissao de NF-e exige INTEGRACAO FISCAL EXTERNA (certificado digital
// A1/A3 + autorizacao na SEFAZ) — parada estrutural declarada em docs/scale-roadmap.md (Onda 2/9),
// fora do v1 e so apos a ativacao cloud. Ate la NAO ha dado real de nota fiscal: por CLAUDE.md §2.8 /
// D-007 esta tela NAO fabrica NF-e, valores nem contadores. Mostra o estado honesto da parada e
// aponta para as Cobrancas (titulos a receber REAIS) para o usuario nao ficar sem caminho.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

export function InvoicesPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  // O atalho para Cobrancas so aparece para quem pode abrir a tela de titulos (mesma permissao do guard
  // de /finance/charges). Sem ela, o pop-up nao oferece um botao para uma rota que o perfil nao acessa.
  const canReadTitles = can("financial_titles:read");

  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Faturas</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Emissão de nota fiscal eletrônica (NF-e)</div>
        </div>
        <button
          type="button"
          disabled
          title="Requer integração fiscal (certificado + SEFAZ), disponível após a ativação cloud."
          style={{ padding: "9px 14px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#94A3B8", cursor: "not-allowed", fontFamily: "inherit" }}
        >
          Emitir NF-e
        </button>
      </div>

      {/* estado honesto de parada fiscal — sem numeros fabricados (D-007 / §2.8) */}
      <div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={28} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Integração fiscal necessária</div>
        <p style={{ fontSize: 13.5, color: "#475569", maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
          A emissão de NF-e depende de <strong>integração fiscal externa</strong> — certificado digital (A1/A3) e
          autorização junto à <strong>SEFAZ</strong>. Esse serviço fica disponível <strong>após a ativação cloud</strong> e
          não faz parte desta versão. Até lá, esta tela não exibe notas fiscais para não apresentar dados que ainda não existem.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#94A3B8" }}>
          <FileText size={15} />
          <span>Os títulos a receber e o faturamento continuam disponíveis no Financeiro.</span>
        </div>
        {canReadTitles && (
          <button
            type="button"
            onClick={() => navigate("/finance/charges")}
            style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            Ver cobranças <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default InvoicesPage;
