import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { KpiDetailModal } from "./KpiDetailModal";
import type { KpiDetail } from "./kpi-detail.types";

// WS-UI-CARDS+CHARTS — transforma um card estático em alvo clicável REAL (role="button", teclado
// Enter/Espaço, foco visível, aria-haspopup="dialog") que abre o pop-up sobre o tema do card. Envolve
// visuais heterogêneos (KpiCard, <div> inline) sem reescrevê-los.
export function ClickableKpiCard({
  detail,
  children,
  className,
  style,
}: {
  readonly detail: KpiDetail;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${detail.title}: ${detail.value}. Abrir detalhes.`}
        className={`kpi-card-clickable ${className ?? ""}`}
        style={{ cursor: "pointer", ...style }}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </div>
      <KpiDetailModal detail={detail} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
