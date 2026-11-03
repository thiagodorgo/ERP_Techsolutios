import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { Modal } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { WorkOrderDetailView } from "../pages/WorkOrderDetailPage";
import { DEFAULT_TAB, resolveActiveTab, type WorkOrderTabSlug } from "../tabs.config";
import { useWorkOrderDetail } from "../useWorkOrderDetail";

// B-APAR-OS — a OS aberta numa JANELA DE TAMANHO FIXO por cima da lista (aparências B e C da referência aprovada
// `screen-refs/ordens-de-servico-3opcoes.reference.html`, `.os-janela`), no padrão do dossiê de Pátios: `Modal size="lg"`
// da biblioteca. O conteúdo é o MESMO da página `/work-orders/:id`: `useWorkOrderDetail` + a `WorkOrderDetailView` de hoje,
// com as 9 seções e os estados dela (não encontrada, acesso não permitido, erro, desatualizada). A seção escolhida fica no
// estado da janela; o corpo tem altura fixa. A rede só é chamada aqui, ao abrir: nada por linha da lista.
//
// Emenda 1 do orquestrador ao plano B-APAR-3, item A11 (a barra de ações de hoje, `WorkOrderActionBar`, vive dentro da
// janela e abre os próprios diálogos — Cancelar, Duplicar, Imprimir — DENTRO dela):
//   - Escape fecha só a camada de CIMA (o diálogo da OS, se houver; senão a janela) e o Tab fica preso nessa camada;
//   - depois de uma mudança na OS (Cancelar avisa por `onRefresh`), a lista de trás recarrega (`onChanged`);
//   - "Imprimir" dentro da janela leva à PÁGINA do detalhe (`onOpenPage`), onde a impressão é a de hoje — a janela não
//     imprime o modal.
// Fechar devolve o foco a quem a abriu (a linha da lista — o contêiner cuida).

const FOCUSABLE = "button:not([disabled]), [href], input, select, textarea, [tabindex='0']";

/** A camada aberta mais de cima: o diálogo mais interno dentro da janela, ou a própria janela. */
function topLayer(windowDialog: HTMLElement): HTMLElement {
  const nested = Array.from(windowDialog.querySelectorAll<HTMLElement>("[role='dialog']"));
  return nested.length > 0 ? nested[nested.length - 1] : windowDialog;
}

export function WorkOrderDetailWindow({
  workOrderId,
  initialTab = DEFAULT_TAB,
  onClose,
  onChanged,
  onOpenPage,
}: {
  readonly workOrderId: string;
  readonly initialTab?: WorkOrderTabSlug;
  readonly onClose: () => void;
  /** A OS mudou dentro da janela (ex.: cancelada): a lista de trás recarrega. */
  readonly onChanged?: () => void;
  /** Ir à página `/work-orders/:id` (a impressão é a de lá). */
  readonly onOpenPage: (id: string) => void;
}) {
  const { workOrder, timeline, loading, status, error, stale, lastUpdatedAt, timelineUnavailable, context, refresh } = useWorkOrderDetail(workOrderId);
  useAutoRefresh(refresh, { enabled: Boolean(workOrderId) });
  const { permissions } = usePermissions();
  const { session } = useAuth();
  const [tab, setTab] = useState<WorkOrderTabSlug>(resolveActiveTab(initialTab));
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = bodyRef.current?.closest<HTMLElement>("[role='dialog']");
    dialog?.querySelector<HTMLButtonElement>("header button")?.focus?.();
  }, []);

  useEffect(() => {
    const body = typeof document !== "undefined" ? document.body : null;
    const previous = body?.style.overflow ?? "";
    if (body) body.style.overflow = "hidden";
    return () => {
      if (body) body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const windowDialog = bodyRef.current?.closest<HTMLElement>("[role='dialog']");
      if (!windowDialog) return;
      const layer = topLayer(windowDialog);
      if (event.key === "Escape") {
        event.preventDefault();
        if (layer === windowDialog) onClose();
        else layer.querySelector<HTMLButtonElement>("header button")?.click?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(layer.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const index = focusables.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        focusables[focusables.length - 1].focus();
      } else if (!event.shiftKey && (index === focusables.length - 1 || index < 0)) {
        event.preventDefault();
        focusables[0].focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // "Imprimir" da barra de ações de hoje: dentro da janela, vai à página do detalhe em vez de abrir a impressão do modal.
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement | null)?.closest?.<HTMLButtonElement>("button");
    if (!button || !button.closest(".wo-print-anchor") || button.textContent?.trim() !== "Imprimir") return;
    event.preventDefault();
    event.stopPropagation();
    onOpenPage(workOrderId);
  };

  return (
    <Modal title="Ordem de serviço" open size="lg" onClose={onClose}>
      <div ref={bodyRef} className="aparos-janela" data-janela-os="" onClickCapture={onClickCapture}>
        <WorkOrderDetailView
          workOrder={workOrder}
          timeline={timeline}
          loading={loading}
          status={status}
          error={error}
          stale={stale}
          lastUpdatedAt={lastUpdatedAt}
          timelineUnavailable={timelineUnavailable}
          context={context}
          permissions={permissions}
          currentUserId={session?.user.id}
          activeTab={tab}
          onSelectTab={setTab}
          onRefresh={() => {
            void refresh();
            onChanged?.();
          }}
          onBack={onClose}
          embedded
        />
      </div>
    </Modal>
  );
}
