// PR-A TELAS PADRONIZADAS — chip de status 99px do padrão transversal
// (fonte: "ERP Web - Telas Padronizadas.dc.html": pills de situação com dot 6px opcional).
// Cores semânticas chegam por prop (bg/fg do tom); `dot` recebe a COR do ponto quando usado.
// PR-B (BAIXA 1 da junta do PR-A): variante `sm` (10px/700, padding 3px 8px) para pills em
// massa nas tabelas (ex.: coluna SITUAÇÃO da lista de OS).

export type StatusPillProps = {
  label: string;
  bg: string;
  fg: string;
  /** Cor do dot 6px (omitido → pill sem dot). */
  dot?: string;
  /** Variante compacta para tabelas (10px/700, padding 3px 8px). */
  sm?: boolean;
};

export function StatusPill({ label, bg, fg, dot, sm }: StatusPillProps) {
  return (
    <span className={sm ? "pat-pill pat-pill--sm" : "pat-pill"} style={{ background: bg, color: fg }}>
      {dot ? <span className="pat-pill__dot" style={{ background: dot }} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
