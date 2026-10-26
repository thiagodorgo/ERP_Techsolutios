import { useMemo, useState } from "react";

import { DENSE_LIST_FETCH_LIMIT } from "../../../../components/dense-list";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { useScreenAppearance } from "../../../appearance";
import { usePatiosDashboardSummary } from "../../dashboard/usePatiosDashboardSummary";
import { PatiosViewA } from "../components/aparencias/PatiosViewA";
import { PatiosViewB } from "../components/aparencias/PatiosViewB";
import { PatiosViewC } from "../components/aparencias/PatiosViewC";
import type { PatiosViewProps } from "../components/aparencias/patiosAparencias.shared";
import { YardFormModal } from "../components/YardFormModal";
import type { YardItem, YardsFilters } from "../yards.types";
import { useYards } from "../useYards";

// Funções puras da tela (TELAS PR-D), agora no módulo compartilhado das aparências; seguem exportadas daqui.
export { computeYardKpis, occupancyTone, shouldShowInvite } from "../components/aparencias/patiosAparencias.shared";

// TELAS PADRONIZADAS PR-D — Pátios no padrão do protótipo do dono (sc_patios).
// Fontes REAIS: /api/v1/yards (useYards) para o cadastro + /patios/dashboard/summary (usePatiosDashboardSummary,
// sob impound:read) para a OCUPAÇÃO por pátio, veículos em custódia e fila de liberações — é UMA requisição e o
// app já a consome no Painel (achado da junta do PR-D: a degradação "não há ocupação na lista" era FALSA).
// Sem impound:read (ou com o resumo indisponível) a coluna degrada honestamente para CAPACIDADE PREVISTA.
//
// B-APARENCIA-USUARIO — a tela sai com as 3 aparências aprovadas (D-TELAS-SAEM-COM-TRES; referência
// `screen-refs/patios-3opcoes.reference.html`): A · Padrão, B · Analítica (o padrão de Pátios, D-APARENCIA-RESPOSTAS
// (b)) e C · Mesa de pátio. Cada usuário escolhe a sua no menu do usuário (`useScreenAppearance("patios")`).
// Esta página é o CONTÊINER: chama UMA vez o cadastro, o resumo e a auto-atualização e passa os mesmos dados à
// aparência escolhida — trocar de aparência não repete requisição.
const STABLE_FILTERS: YardsFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

export function PatiosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useYards(STABLE_FILTERS);
  const { summary, denied: summaryDenied } = usePatiosDashboardSummary();
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });
  const { appearance } = useScreenAppearance("patios");

  const [editing, setEditing] = useState<YardItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("yard:create");
  const canUpdate = can("yard:update");

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(yard: YardItem) {
    setEditing(yard);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const viewProps: PatiosViewProps = {
    items,
    serverTotal: pagination.total || items.length,
    partialWindow: pagination.total > items.length,
    loading,
    error,
    onRetry: () => void refresh(),
    summary,
    summaryDenied,
    canCreate,
    canUpdate,
    onCreate: openCreate,
    onEdit: openEdit,
    apiContext: context,
  };

  return (
    <>
      {appearance === "A" ? <PatiosViewA {...viewProps} /> : appearance === "C" ? <PatiosViewC {...viewProps} /> : <PatiosViewB {...viewProps} />}

      {modalOpen ? (
        <YardFormModal
          key={editing?.id ?? "new"}
          yard={editing}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}
    </>
  );
}

export default PatiosPage;
