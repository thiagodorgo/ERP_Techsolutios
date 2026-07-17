import { Ban, ClipboardList, Copy, CopyPlus, MoreVertical, Printer, RefreshCw, Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { WorkOrderTabSlug } from "../tabs.config";
import { buildWorkOrderDeepLink, composeWhatsAppText } from "../work-order-share";
import type { WorkOrderDetail, WorkOrdersApiContext, WorkOrderStatus } from "../work-orders.types";
import { CancelWorkOrderModal } from "./CancelWorkOrderModal";
import { DuplicateWorkOrderModal } from "./DuplicateWorkOrderModal";
import { PrintWorkOrderModal } from "./PrintWorkOrderModal";

// Ω3F-1 — barra de ações do Hub da OS. C2 + fid-analista Q3: só ações FUNCIONAIS — #22 Copiar
// (deep-link da URL, confirmação inline "Copiado!" — o DS não tem toast, fid-analista D-B) e #32 ⋮
// "Copiar texto p/ WhatsApp". Atualizar/Abrir checklist migram do header atual (chrome do hub, Q7).
//
// Ω3F-6b — Cancelar/Duplicar/Imprimir entram VISÍVEIS (o lugar já estava reservado). Distribuição:
// Imprimir fica na BARRA (frequente, inofensivo, mesmo peso de "Copiar"); Duplicar e Cancelar vão para o
// ⋮ "Mais ações" — Duplicar cria OS e Cancelar decide o destino do dinheiro: são de baixa frequência e
// alto impacto, e o ⋮ protege de clique acidental. Cancelar é o último item, separado e em vermelho.
// Gating: Cancelar exige work_orders:cancel e OS não-cancelada; Duplicar exige work_orders:create
// (a cópia é uma OS nova); Imprimir é de todos (só arruma na tela o que o ator já enxerga).

const btn: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnGhost: CSSProperties = { ...btn, background: "#fff", border: "1px solid #E2E8F0", color: "#334155" };
// SEM `background` inline: quem pinta (repouso/hover/foco) é a classe `.ui-menu-item` do DS. Style inline
// venceria o seletor e mataria o :hover — foi exatamente o que a cognicao mediu morto no ⋮ (J-Ω3F-6B).
const menuItem: CSSProperties = { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" };

// Gating das ações do Ω3F-6b como predicados PUROS: a UI só molda — o backend é a autoridade (§2.4).
// Ficam exportados porque o ⋮ só monta no clique; testá-los aqui prova a regra sem depender do menu aberto.

/**
 * Situações a partir das quais o BACKEND aceita cancelar — espelho da tabela de transições
 * (`src/modules/work-orders/work-order.validators.ts`: cancelled é destino de open/assigned/accepted/
 * on_route/on_site/in_progress; `paused`, `completed`, `rejected` e `cancelled` NÃO cancelam).
 * cognicao/coordenador J-Ω3F-6B: oferecer "Cancelar" numa OS concluída fazia o gestor preencher decisão
 * financeira + motivo para colher 422 — a UI não pode ser mais permissiva que o backend.
 */
const CANCELLABLE_STATUSES: readonly WorkOrderStatus[] = [
  "open",
  "assigned",
  "accepted",
  "on_route",
  "on_site",
  "in_progress",
];

/** Cancelar exige `work_orders:cancel` (decide o destino do dinheiro) e uma OS ainda cancelável. */
export function canCancelWorkOrder(permissions: readonly string[], status: WorkOrderStatus): boolean {
  return permissions.includes("work_orders:cancel") && CANCELLABLE_STATUSES.includes(status);
}

/** Duplicar exige `work_orders:create`: a cópia é uma OS nova, não uma edição desta. */
export function canDuplicateWorkOrder(permissions: readonly string[]): boolean {
  return permissions.includes("work_orders:create");
}

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
  context,
  permissions,
  onRefresh,
}: {
  workOrder: WorkOrderDetail;
  activeTab: WorkOrderTabSlug;
  context: WorkOrdersApiContext;
  permissions: readonly string[];
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canCancel = canCancelWorkOrder(permissions, workOrder.status);
  const canDuplicate = canDuplicateWorkOrder(permissions);

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
    // `wo-print-anchor`: esta barra é position:relative e HOSPEDA o modal de impressão. Sem neutralizá-la
    // no @media print, o print-root (absolute) ancora NELA e o papel sai deslocado/cortado (cognicao J-Ω3F-6B).
    <div className="wo-print-anchor" style={{ display: "flex", gap: 8, position: "relative" }}>
      <button type="button" onClick={onRefresh} style={btnGhost}><RefreshCw size={14} />Atualizar</button>

      {workOrder.checklistId ? (
        <button type="button" onClick={() => navigate(`/operations/checklists/${workOrder.checklistId}/run`)} style={{ ...btn, background: "#2563EB", border: "none", color: "#fff" }}><ClipboardList size={15} />Abrir checklist</button>
      ) : null}

      {/* #22 Copiar URL (deep-link) — confirmação inline (sem toast) */}
      <button type="button" onClick={() => void handleCopyUrl()} aria-label="Copiar link da ordem de serviço" style={{ ...btnGhost, color: copied ? "#059669" : "#334155", borderColor: copied ? "#A7F3D0" : "#E2E8F0" }}>
        <Copy size={14} />{copied ? "Copiado!" : "Copiar"}
      </button>

      <button type="button" onClick={() => setPrintOpen(true)} style={btnGhost}>
        <Printer size={14} aria-hidden />Imprimir
      </button>

      {/* #32 menu ⋮ — WhatsApp + ações de baixa frequência/alto impacto (Ω3F-6b) */}
      <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Mais ações" aria-haspopup="menu" aria-expanded={menuOpen} style={{ ...btnGhost, padding: "9px 11px" }}>
        <MoreVertical size={16} />
      </button>
      {menuOpen ? (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,.10)", padding: 6, zIndex: 20, minWidth: 220 }}>
          <button type="button" role="menuitem" onClick={() => void handleCopyWhatsApp()} className="ui-menu-item" style={{ ...menuItem, color: waCopied ? "#059669" : "#334155" }}>
            <Share2 size={14} />{waCopied ? "Texto copiado!" : "Copiar texto p/ WhatsApp"}
          </button>

          {canDuplicate ? (
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setDuplicateOpen(true); }} className="ui-menu-item" style={{ ...menuItem, color: "#334155" }}>
              <CopyPlus size={14} aria-hidden />Duplicar
            </button>
          ) : null}

          {canCancel ? (
            <>
              <div style={{ height: 1, background: "#F1F5F9", margin: "5px 4px" }} />
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setCancelOpen(true); }} className="ui-menu-item" style={{ ...menuItem, color: "var(--color-status-danger)" }}>
                <Ban size={14} aria-hidden />Cancelar
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {printOpen ? (
        <PrintWorkOrderModal workOrder={workOrder} context={context} permissions={permissions} onClose={() => setPrintOpen(false)} />
      ) : null}

      {duplicateOpen ? (
        <DuplicateWorkOrderModal workOrderId={workOrder.id} workOrderCode={workOrder.code} context={context} onClose={() => setDuplicateOpen(false)} />
      ) : null}

      {cancelOpen ? (
        <CancelWorkOrderModal
          workOrderId={workOrder.id}
          workOrderCode={workOrder.code}
          context={context}
          onClose={() => setCancelOpen(false)}
          onCancelled={() => {
            setCancelOpen(false);
            onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}

export default WorkOrderActionBar;
