import type { CSSProperties, ReactNode } from "react";

import type { WorkOrderTabDef, WorkOrderTabSlug } from "../tabs.config";

// Ω3F-1 — shell de abas do Hub da OS: menu lateral interno PRÓPRIO (não toca a navegação global) +
// área de conteúdo. Prop-driven (a página resolve `?aba=` e injeta activeTab/tabs) → SSR-testável.
// C2: `tabs` recebe SÓ as abas visíveis (revelação progressiva). §7: `accessAllowed=false` → estado
// "acesso não permitido" (nunca 404/redirect silencioso).

const menuItem = (active: boolean): CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: active ? "#2563EB" : "transparent",
  color: active ? "#fff" : "#334155",
  fontSize: 13.5,
  fontWeight: active ? 700 : 600,
  cursor: "pointer",
  fontFamily: "inherit",
  marginBottom: 2,
});

export function WorkOrderTabsShell({
  tabs,
  activeTab,
  accessAllowed = true,
  onSelect,
  children,
}: {
  tabs: readonly WorkOrderTabDef[];
  activeTab: WorkOrderTabSlug;
  accessAllowed?: boolean;
  onSelect: (slug: WorkOrderTabSlug) => void;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "216px 1fr", gap: 20, alignItems: "start" }}>
      <nav aria-label="Seções da ordem de serviço" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 8, position: "sticky", top: 16 }}>
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            aria-current={tab.slug === activeTab ? "page" : undefined}
            onClick={() => onSelect(tab.slug)}
            style={menuItem(tab.slug === activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
        {accessAllowed ? (
          children
        ) : (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Acesso não permitido</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Você não tem permissão para ver esta seção da ordem de serviço.</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkOrderTabsShell;
