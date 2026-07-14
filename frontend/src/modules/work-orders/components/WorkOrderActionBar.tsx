import { ClipboardList, Copy, MoreVertical, RefreshCw, Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { WorkOrderTabSlug } from "../tabs.config";
import { buildWorkOrderDeepLink, composeWhatsAppText, type ShareableWorkOrder } from "../work-order-share";

// Ω3F-1 — barra de ações do Hub da OS. C2 + fid-analista Q3: só ações FUNCIONAIS agora — #22 Copiar
// (deep-link da URL, confirmação inline "Copiado!" — o DS não tem toast, fid-analista D-B) e #32 ⋮
// "Copiar texto p/ WhatsApp". Cancelar/Imprimir/Duplicar entram VISÍVEIS no Ω3F-6 (3 botões desabilitados
// = andaime = viola C2). Atualizar/Abrir checklist migram do header atual (chrome do hub, Q7).

const btn: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnGhost: CSSProperties = { ...btn, background: "#fff", border: "1px solid #E2E8F0", color: "#334155" };

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function WorkOrderActionBar({
  workOrder,
  activeTab,
  onRefresh,
}: {
  workOrder: ShareableWorkOrder & { checklistId?: string | null };
  activeTab: WorkOrderTabSlug;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [waCopied, setWaCopied] = useState(false);

  async function handleCopyUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const ok = await copyToClipboard(buildWorkOrderDeepLink(origin, workOrder.id, activeTab));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCopyWhatsApp() {
    const ok = await copyToClipboard(composeWhatsAppText(workOrder));
    if (ok) {
      setWaCopied(true);
      window.setTimeout(() => {
        setWaCopied(false);
        setMenuOpen(false);
      }, 1600);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, position: "relative" }}>
      <button type="button" onClick={onRefresh} style={btnGhost}><RefreshCw size={14} />Atualizar</button>

      {workOrder.checklistId ? (
        <button type="button" onClick={() => navigate(`/operations/checklists/${workOrder.checklistId}/run`)} style={{ ...btn, background: "#2563EB", border: "none", color: "#fff" }}><ClipboardList size={15} />Abrir checklist</button>
      ) : null}

      {/* #22 Copiar URL (deep-link) — confirmação inline (sem toast) */}
      <button type="button" onClick={() => void handleCopyUrl()} aria-label="Copiar link da ordem de serviço" style={{ ...btnGhost, color: copied ? "#059669" : "#334155", borderColor: copied ? "#A7F3D0" : "#E2E8F0" }}>
        <Copy size={14} />{copied ? "Copiado!" : "Copiar"}
      </button>

      {/* #32 menu ⋮ — Copiar texto p/ WhatsApp */}
      <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Mais ações" aria-haspopup="menu" aria-expanded={menuOpen} style={{ ...btnGhost, padding: "9px 11px" }}>
        <MoreVertical size={16} />
      </button>
      {menuOpen ? (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,.10)", padding: 6, zIndex: 20, minWidth: 220 }}>
          <button type="button" role="menuitem" onClick={() => void handleCopyWhatsApp()} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "transparent", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: waCopied ? "#059669" : "#334155", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            <Share2 size={14} />{waCopied ? "Texto copiado!" : "Copiar texto p/ WhatsApp"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default WorkOrderActionBar;
