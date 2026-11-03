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
// estado da janela; o corpo tem altura fixa (trocar de seção não muda o tamanho da janela). Escape fecha (salvo quando há
// um diálogo da própria OS aberto por cima), Tab fica preso dentro da janela, e fechar devolve o foco a quem a abriu (a
// linha da lista — o contêiner cuida). A rede só é chamada aqui, ao abrir: nada por linha da lista.

export function WorkOrderDetailWindow({ workOrderId, initialTab = DEFAULT_TAB, onClose }: { readonly workOrderId: string; readonly initialTab?: WorkOrderTabSlug; readonly onClose: () => void }) {
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
      const dialog = bodyRef.current?.closest<HTMLElement>("[role='dialog']");
      if (!dialog) return;
      // Um diálogo da própria OS (Cancelar, Duplicar, Imprimir) aberto por cima responde primeiro.
      if (dialog.querySelector("[role='dialog']")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, select, textarea, [tabindex='0']"));
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

  return (
    <Modal title="Ordem de serviço" open size="lg" onClose={onClose}>
      <div ref={bodyRef} className="aparos-janela" data-janela-os="">
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
          onRefresh={() => void refresh()}
          onBack={onClose}
          embedded
        />
      </div>
    </Modal>
  );
}
