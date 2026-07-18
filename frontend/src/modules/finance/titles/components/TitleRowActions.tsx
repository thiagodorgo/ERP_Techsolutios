import { MoreVertical } from "lucide-react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useState } from "react";

import { allowedStatusTargets, canChangeTitleStatus, getStatusActionLabel } from "../financial-titles.adapter";
import type { FinancialTitleStatus, FinancialTitleStatusTarget } from "../financial-titles.types";

// Ω4-2b — célula de AÇÃO da linha: menu ⋮ com SÓ as transições válidas do status atual (espelha a máquina
// do backend; nunca paid/partially_paid). Gate LIGADO ao JSX (lição Ω3F-9: predicado testado ≠ ligado) —
// sem `financial_titles:update` o gatilho inteiro some (§7 acesso não permitido). "Cancelar" em vermelho e
// protegido (pede confirmação no nível da página). §3/§11.2: rótulos PT-BR, sem status técnico cru.

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
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  color: "#334155",
};

function stop(fn: () => void) {
  return (event: ReactMouseEvent) => {
    event.stopPropagation();
    fn();
  };
}

/**
 * Conteúdo do ⋮ como componente PURO e exportado — o menu só monta no clique e os testes SSR não clicam;
 * o teste monta ESTE componente direto e prova os itens de transição/gate.
 */
export function TitleRowMenu({
  targets,
  onSelect,
}: {
  targets: readonly FinancialTitleStatusTarget[];
  onSelect: (target: FinancialTitleStatusTarget) => void;
}) {
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
        minWidth: 190,
      }}
    >
      {targets.map((target) => (
        <button
          key={target}
          type="button"
          role="menuitem"
          onClick={stop(() => onSelect(target))}
          className="ui-menu-item"
          style={target === "cancelled" ? { ...menuItem, color: "#DC2626", fontWeight: 700 } : menuItem}
        >
          {getStatusActionLabel(target)}
        </button>
      ))}
    </div>
  );
}

export function TitleRowActions({
  status,
  permissions,
  busy = false,
  error,
  onSelect,
}: {
  status: FinancialTitleStatus;
  permissions: readonly string[];
  busy?: boolean;
  error?: string | null;
  onSelect: (target: FinancialTitleStatusTarget) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const targets = allowedStatusTargets(status);
  const canUpdate = canChangeTitleStatus(permissions);

  // Sem permissão de escrita OU sem transição válida (título em estado terminal) ⇒ nenhuma ação.
  if (!canUpdate || targets.length === 0) {
    return error ? (
      <span role="alert" style={{ fontSize: 10.5, color: "#B91C1C", maxWidth: 160, textAlign: "right", lineHeight: 1.3 }}>
        {error}
      </span>
    ) : null;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, position: "relative" }}>
      {error ? (
        <span role="alert" style={{ fontSize: 10.5, color: "#B91C1C", maxWidth: 160, textAlign: "right", lineHeight: 1.3 }}>
          {error}
        </span>
      ) : null}

      {busy ? <span style={{ fontSize: 11, color: "#94A3B8" }}>Salvando…</span> : null}

      <button
        type="button"
        onClick={stop(() => setMenuOpen((value) => !value))}
        aria-label="Ações do título"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={busy}
        style={kebabBtn}
      >
        <MoreVertical size={15} aria-hidden />
      </button>

      {menuOpen ? (
        <TitleRowMenu
          targets={targets}
          onSelect={(target) => {
            setMenuOpen(false);
            onSelect(target);
          }}
        />
      ) : null}
    </div>
  );
}

export default TitleRowActions;
