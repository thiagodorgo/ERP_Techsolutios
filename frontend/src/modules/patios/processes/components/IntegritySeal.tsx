import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

import { truncateHash } from "../processes.adapter";
import type { VerifyResult } from "../processes.types";

// Selo de integridade (I2) — a UI expõe a verificação da cadeia de hash do backend (GET /verify). NÃO recomputa:
// valid → verde "Cadeia íntegra (N eventos)"; inválido → vermelho "Adulteração detectada no evento #brokenAt".
// §2.8: headHash é PROVA (exibido truncado, não é segredo).
const wrapStyle: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid" };
const hashStyle: CSSProperties = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 };

export function IntegritySeal({ verify, loading }: { readonly verify: VerifyResult | null; readonly loading?: boolean }) {
  if (loading && !verify) {
    return (
      <div style={{ ...wrapStyle, borderColor: "#E2E8F0", background: "#F8FAFC", color: "#475569" }} aria-busy="true">
        <ShieldCheck size={18} aria-hidden />
        <div>
          <strong>Verificando a integridade da cadeia…</strong>
        </div>
      </div>
    );
  }

  if (!verify) {
    return (
      <div style={{ ...wrapStyle, borderColor: "#E2E8F0", background: "#F8FAFC", color: "#475569" }}>
        <ShieldCheck size={18} aria-hidden />
        <div>
          <strong>Verificação de integridade indisponível no momento.</strong>
        </div>
      </div>
    );
  }

  const plural = (n: number) => (n === 1 ? "evento" : "eventos");

  if (verify.valid) {
    return (
      <div style={{ ...wrapStyle, borderColor: "#BBF7D0", background: "#F0FDF4", color: "#166534" }} role="status">
        <ShieldCheck size={18} aria-hidden />
        <div>
          <strong>{`Cadeia íntegra (${verify.eventCount} ${plural(verify.eventCount)})`}</strong>
          <div style={hashStyle}>{`Selo: ${truncateHash(verify.headHash)}`}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrapStyle, borderColor: "#FECACA", background: "#FEF2F2", color: "#991B1B" }} role="alert">
      <ShieldAlert size={18} aria-hidden />
      <div>
        <strong>{verify.brokenAt != null ? `Adulteração detectada no evento #${verify.brokenAt}` : "Adulteração detectada"}</strong>
        <div style={hashStyle}>{`Cadeia verificada em ${verify.eventCount} ${plural(verify.eventCount)} · Selo: ${truncateHash(verify.headHash)}`}</div>
      </div>
    </div>
  );
}

export default IntegritySeal;
