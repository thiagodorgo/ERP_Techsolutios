import { AlertTriangle, ClipboardList, Shield, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

// B-SAN3-01 ciclo 2 (P5 — C3-B1, C3-A1, C3-A2) — UMA ficha para os estados §7 da OS, dois consumidores (lista e
// detalhe). Reproduz `docs/claude-code-handoff/ERP Web.dc.html` l.362-382: card branco com borda e raio 13, círculo
// 60×60 com o ícone do estado, título 16/800 #334155, detalhe 13 #94A3B8 (max 340; 330 no vazio) e botão CHEIO.
// Erro ≠ sem permissão por COR (borda #FECACA, círculo #FEF2F2, alerta #DC2626) e por ÍCONE (alerta × escudo).
// `app.css` fica fora do bloco: a ficha é inline e o hover (#1D4ED8) e o foco (outline 2px #2563EB) vêm das
// classes `.pat-btn` / `.pat-btn--primary` que já existem — o inline do botão só acerta as MEDIDAS do protótipo.
// `data-state` fica no elemento RAIZ (é por ele que os testes SSR e o e2e afirmam o estado) e `role="alert"` só no erro.

export type StatePanelTone = "error" | "forbidden" | "empty" | "not-found";

type ToneSpec = {
  readonly border: string;
  readonly circleBg: string;
  readonly iconColor: string;
  readonly icon: LucideIcon;
  readonly iconSize: number;
  readonly padding: string;
  readonly detailMaxWidth: number;
};

const TONES: Readonly<Record<StatePanelTone, ToneSpec>> = {
  error: { border: "#FECACA", circleBg: "#FEF2F2", iconColor: "#DC2626", icon: AlertTriangle, iconSize: 28, padding: "50px 32px", detailMaxWidth: 340 },
  forbidden: { border: "#E2E8F0", circleBg: "#F1F5F9", iconColor: "#94A3B8", icon: Shield, iconSize: 26, padding: "50px 32px", detailMaxWidth: 340 },
  empty: { border: "#E2E8F0", circleBg: "#F1F5F9", iconColor: "#94A3B8", icon: ClipboardList, iconSize: 28, padding: "54px 32px", detailMaxWidth: 330 },
  // "não encontrada" usa o ícone de OS do protótipo (`w-os` = prancheta): nada inventado.
  "not-found": { border: "#E2E8F0", circleBg: "#F1F5F9", iconColor: "#94A3B8", icon: ClipboardList, iconSize: 28, padding: "50px 32px", detailMaxWidth: 340 },
};

export function StatePanel({
  tone,
  title,
  detail,
  actions,
  embedded = false,
}: {
  readonly tone: StatePanelTone;
  readonly title: string;
  readonly detail: ReactNode;
  readonly actions?: ReactNode;
  /** Dentro do card da tabela (vazio por filtro): sem borda nem raio próprios. */
  readonly embedded?: boolean;
}) {
  const spec = TONES[tone];
  const Icon = spec.icon;
  const frame: CSSProperties = embedded ? {} : { border: `1px solid ${spec.border}`, borderRadius: 13 };
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      data-state={tone}
      style={{
        background: "#fff",
        ...frame,
        padding: spec.padding,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        aria-hidden="true"
        style={{ width: 60, height: 60, borderRadius: "50%", background: spec.circleBg, display: "flex", alignItems: "center", justifyContent: "center", color: spec.iconColor }}
      >
        <Icon size={spec.iconSize} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#334155" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94A3B8", maxWidth: spec.detailMaxWidth, lineHeight: 1.5 }}>{detail}</div>
      {actions ? <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

/**
 * Botão da ficha: primário cheio (`pat-btn pat-btn--primary`) ou secundário do padrão (`pat-btn`, branco com borda
 * #E2E8F0 e hover azul). Medidas do protótipo: `10px 20px` (`10px 18px` no "Nova OS" — `narrow`), raio 10, 13px.
 */
export function StatePanelAction({
  label,
  onClick,
  variant = "primary",
  narrow = false,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?: "primary" | "secondary";
  readonly narrow?: boolean;
}) {
  return (
    <button
      type="button"
      className={variant === "primary" ? "pat-btn pat-btn--primary" : "pat-btn"}
      style={{ marginTop: 6, padding: narrow ? "10px 18px" : "10px 20px", borderRadius: 10, fontSize: 13 }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
