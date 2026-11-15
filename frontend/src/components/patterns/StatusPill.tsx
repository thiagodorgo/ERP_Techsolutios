import type { ReactNode } from "react";

// PR-A TELAS PADRONIZADAS — chip de status 99px do padrão transversal
// (fonte: "ERP Web - Telas Padronizadas.dc.html": pills de situação com dot 6px opcional).
// Cores semânticas chegam por prop (bg/fg do tom); `dot` recebe a COR do ponto quando usado.
// PR-B (BAIXA 1 da junta do PR-A): variante `sm` (10px/700, padding 3px 8px) para pills em
// massa nas tabelas (ex.: coluna SITUAÇÃO da lista de OS).
// B-ASS-11 (REV576-04): variante `icon` — o ícone antes do rótulo, no lugar do ponto, para os selos que a referência
// aprovada desenha com ícone (ex.: "Passou do limite", "Em dia" na Minha assinatura). Sem `icon`, o selo sai igual a antes.

export type StatusPillProps = {
  label: string;
  bg: string;
  fg: string;
  /** Cor do dot 6px (omitido → pill sem dot). */
  dot?: string;
  /** Variante compacta para tabelas (10px/700, padding 3px 8px). */
  sm?: boolean;
  /** Ícone antes do rótulo (12 px, decorativo: fica escondido do leitor de tela); com ele, o `dot` não aparece. */
  icon?: ReactNode;
};

export function StatusPill({ label, bg, fg, dot, sm, icon }: StatusPillProps) {
  return (
    <span className={sm ? "pat-pill pat-pill--sm" : "pat-pill"} style={{ background: bg, color: fg }}>
      {icon ? (
        <span className="pat-pill__icon" aria-hidden="true">
          {icon}
        </span>
      ) : dot ? (
        <span className="pat-pill__dot" style={{ background: dot }} aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}
