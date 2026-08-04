// PR-A TELAS PADRONIZADAS — chip de status 99px do padrão transversal
// (fonte: "ERP Web - Telas Padronizadas.dc.html": pills de situação com dot 6px opcional).
// Cores semânticas chegam por prop (bg/fg do tom); `dot` recebe a COR do ponto quando usado.

export type StatusPillProps = {
  label: string;
  bg: string;
  fg: string;
  /** Cor do dot 6px (omitido → pill sem dot). */
  dot?: string;
};

export function StatusPill({ label, bg, fg, dot }: StatusPillProps) {
  return (
    <span className="pat-pill" style={{ background: bg, color: fg }}>
      {dot ? <span className="pat-pill__dot" style={{ background: dot }} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
