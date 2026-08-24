import { Ban, ChevronRight, MoreVertical } from "lucide-react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useState } from "react";

import { advanceLabel, canAdvanceRow, canRevokeDispatch } from "../work-orders-row.logic";
import type { WorkOrderStatus } from "../work-orders.types";

// Ω3F-9 — célula de AÇÃO da linha da lista de OS: "Dar andamento → X" (forward-only) · ⋮ com
// "Revogar envio". Gates LIGADOS ao JSX (lição Ω3F-6: predicado testado ≠ predicado ligado — o teste monta
// este componente e a mutação do gate quebra). Todo handler faz stopPropagation: a linha inteira navega ao
// detalhe no clique do corpo (padrão DispatchesTable). §3/§11.2: rótulos PT-BR, sem status técnico cru.
//
// Padrão "linha clicável" (decisão do dono, 2026-08-24): o botão "Abrir" SAIU — clicar em qualquer ponto
// da linha já abre o detalhe da OS. A célula sobrevive porque restam ações secundárias reais ("Dar
// andamento" e o ⋮ "Revogar envio"), nunca para hospedar um duplicado do clique da linha.

const advanceBtn = (busy: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 3,
  padding: "5px 10px",
  background: busy ? "#EFF6FF" : "#2563EB",
  border: "none",
  borderRadius: 7,
  fontSize: 11.5,
  fontWeight: 700,
  color: busy ? "#93C5FD" : "#fff",
  cursor: busy ? "default" : "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
});

const kebabBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "5px 7px",
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 7,
  color: "#64748B",
  cursor: "pointer",
};

const menuItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "9px 12px",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  // SEM `background` inline: quem pinta repouso/hover/foco é a classe `.ui-menu-item` do DS (lição J-Ω3F-6B:
  // background inline venceria o :hover e mataria o feedback — a cognicao mede o menu como "morto").
};

function stop(fn: () => void) {
  return (event: ReactMouseEvent) => {
    event.stopPropagation();
    fn();
  };
}

/**
 * Conteúdo do ⋮ como componente PURO e exportado — mesmo motivo do WorkOrderActionsMenu (Ω3F-6): o menu só
 * monta no clique e os testes são SSR sem clique, então o teste monta ESTE componente direto e prova o item.
 */
export function WorkOrderRowMenu({ onRevoke }: { onRevoke: () => void }) {
  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(15,23,42,.10)",
        padding: 6,
        zIndex: 20,
        minWidth: 180,
      }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={stop(onRevoke)}
        className="ui-menu-item"
        style={{ ...menuItem, color: "var(--color-status-danger)" }}
      >
        <Ban size={14} aria-hidden />
        Revogar envio
      </button>
    </div>
  );
}

export function WorkOrderRowActions({
  status,
  permissions,
  busy = false,
  error,
  onAdvance,
  onRevoke,
}: {
  status: WorkOrderStatus;
  permissions: readonly string[];
  busy?: boolean;
  error?: string | null;
  onAdvance: () => void;
  onRevoke: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showAdvance = canAdvanceRow(permissions, status);
  const showRevoke = canRevokeDispatch(permissions, status);
  const label = advanceLabel(status);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, position: "relative" }}>
      {error ? (
        <span role="alert" style={{ fontSize: 10.5, color: "#B91C1C", maxWidth: 150, textAlign: "right", lineHeight: 1.3 }}>
          {error}
        </span>
      ) : null}

      {showAdvance && label ? (
        <button type="button" onClick={stop(onAdvance)} disabled={busy} aria-label={label} title={label} style={advanceBtn(busy)}>
          {busy ? "Enviando…" : "Dar andamento"}
          <ChevronRight size={13} aria-hidden />
        </button>
      ) : null}

      {showRevoke ? (
        <>
          <button
            type="button"
            onClick={stop(() => setMenuOpen((v) => !v))}
            aria-label="Mais ações"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            style={kebabBtn}
          >
            <MoreVertical size={15} aria-hidden />
          </button>
          {menuOpen ? <WorkOrderRowMenu onRevoke={() => { setMenuOpen(false); onRevoke(); }} /> : null}
        </>
      ) : null}
    </div>
  );
}

export default WorkOrderRowActions;
