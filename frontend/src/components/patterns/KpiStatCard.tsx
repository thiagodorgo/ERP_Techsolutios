import type { LucideIcon } from "lucide-react";

// PR-A TELAS PADRONIZADAS — KPI card "de decisão" do padrão transversal
// (fonte: "ERP Web - Telas Padronizadas.dc.html", bloco dashKpis/osKpis/userKpis).
// Layout exato do design: tile de ícone 30px + tag pill à direita; valor 27px/800 tabular;
// label 12.5px/600 #334155; hint 11px #94A3B8. `border` pinta a borda do card (ex.: #FCA5A5
// no crítico). Com `onClick` vira <button> acessível com hover #93C5FD (classes .pat-kpi*).
// Cores dinâmicas (ícone/tag) chegam por prop — nunca números fabricados aqui (D-007).

export type KpiStatTag = {
  label: string;
  bg: string;
  fg: string;
};

export type KpiStatCardProps = {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  hint?: string;
  tag?: KpiStatTag;
  /** Cor da borda do card quando semântica (ex.: "#FCA5A5" para crítico). */
  border?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

export function KpiStatCard({ icon: Icon, iconColor, iconBg, value, label, hint, tag, border, onClick, ariaLabel }: KpiStatCardProps) {
  const borderStyle = border ? { borderColor: border } : undefined;
  const body = (
    <>
      <div className="pat-kpi__head">
        <span className="pat-kpi__tile" style={{ background: iconBg, color: iconColor }} aria-hidden="true">
          <Icon size={16} />
        </span>
        {tag ? (
          <span className="pat-kpi__tag" style={{ background: tag.bg, color: tag.fg }}>
            {tag.label}
          </span>
        ) : null}
      </div>
      <div className="pat-kpi__value">{value}</div>
      <div className="pat-kpi__label">{label}</div>
      {hint ? <div className="pat-kpi__hint">{hint}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="pat-kpi pat-kpi--clickable" style={borderStyle} onClick={onClick} aria-label={ariaLabel ?? label}>
        {body}
      </button>
    );
  }
  return (
    <div className="pat-kpi" style={borderStyle}>
      {body}
    </div>
  );
}
