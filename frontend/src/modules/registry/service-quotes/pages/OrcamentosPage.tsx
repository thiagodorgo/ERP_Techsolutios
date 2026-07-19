import { BadgeCheck, Ban, Plus, Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { ServiceQuoteFormModal } from "../components/ServiceQuoteFormModal";
import {
  filterServiceQuotes,
  formatMoney,
  formatQuantity,
  getServiceQuotePriceSourceLabel,
  getServiceQuoteStatusLabel,
  getServiceQuoteStatusTone,
  shortRef,
} from "../service-quotes.adapter";
import { approveServiceQuote, changeServiceQuoteStatus, shareServiceQuote } from "../service-quotes.service";
import { ApiError } from "../../../../services/api/client";
import type { ServiceQuoteRow, ServiceQuoteStatus, ServiceQuotesFilters } from "../service-quotes.types";
import { useServiceQuotes } from "../useServiceQuotes";
import { useServiceQuoteReferences } from "../useServiceQuoteReferences";

const STABLE_FILTERS: ServiceQuotesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

type QuoteStatusFilter = "all" | ServiceQuoteStatus;

const STATUS_TABS: readonly { value: QuoteStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "void", label: "Anulado" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const monoStyle: CSSProperties = { fontFamily: "var(--font-mono, monospace)", fontSize: "var(--text-xs)" };
const moneyStyle: CSSProperties = { fontVariantNumeric: "tabular-nums", fontWeight: 600 };

// Erros do backend viram mensagem clara (o cliente só expõe o status, não o código do corpo — §2.8).
function messageForQuoteError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "Não foi possível concluir: o orçamento pode estar vencido ou sem itens.";
    if (err.status === 409) return "O orçamento já foi aprovado ou não está em situação aprovável.";
    if (err.status === 404) return "Orçamento não encontrado.";
    return err.safeMessage;
  }
  return err instanceof Error ? err.message : fallback;
}

export function OrcamentosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useServiceQuotes(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });
  const references = useServiceQuoteReferences();

  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const canCreate = can("service_quotes:create");
  const canUpdate = can("service_quotes:update");
  const canApprove = can("service_quotes:approve");

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

  const visibleItems = useMemo(
    () => (statusFilter === "all" ? items : items.filter((quote) => quote.status === statusFilter)),
    [items, statusFilter],
  );

  async function applyStatus(quote: ServiceQuoteRow, status: ServiceQuoteStatus) {
    setActionError(null);
    setActionNotice(null);
    try {
      await changeServiceQuoteStatus(context, quote.id, status);
      void refresh();
    } catch (actionErr) {
      setActionError(actionErr instanceof Error ? actionErr.message : "Não foi possível alterar a situação do orçamento.");
    }
  }

  // Ω3F-4c — aprova o orçamento (draft) → CRIA a OS. Mostra a OS gerada e recarrega a lista.
  async function approveQuote(quote: ServiceQuoteRow) {
    setActionError(null);
    setActionNotice(null);
    try {
      const result = await approveServiceQuote(context, quote.id, {});
      setActionNotice(result.workOrderId ? `Orçamento aprovado — OS gerada (${result.workOrderId}).` : "Orçamento aprovado.");
      void refresh();
    } catch (actionErr) {
      setActionError(messageForQuoteError(actionErr, "Não foi possível aprovar o orçamento."));
    }
  }

  // Ω3F-4c — compartilha o orçamento: devolve o link (sharePath) para copiar.
  async function shareQuote(quote: ServiceQuoteRow) {
    setActionError(null);
    setActionNotice(null);
    try {
      const result = await shareServiceQuote(context, quote.id);
      if (result.sharePath) {
        if (typeof navigator !== "undefined" && navigator.clipboard) void navigator.clipboard.writeText(result.sharePath);
        setActionNotice(`Link de compartilhamento: ${result.sharePath}`);
      } else {
        setActionError("O orçamento não retornou um link de compartilhamento.");
      }
    } catch (actionErr) {
      setActionError(messageForQuoteError(actionErr, "Não foi possível compartilhar o orçamento."));
    }
  }

  // Resolve o RÓTULO humano (nome do serviço/cliente, código da OS); UUID só no title (veto
  // cognicao-visual). Fallback shortRef enquanto as referências carregam / D-007 vazio.
  const serviceName = (quote: ServiceQuoteRow) => references.serviceLabelById.get(quote.serviceCatalogId);
  const customerName = (quote: ServiceQuoteRow) => (quote.customerId ? references.customerLabelById.get(quote.customerId) : undefined);
  const workOrderCode = (quote: ServiceQuoteRow) => (quote.workOrderId ? references.workOrderLabelById.get(quote.workOrderId) : undefined);

  const columns: DenseColumn<ServiceQuoteRow>[] = [
    {
      key: "workOrderId",
      header: "OS",
      sortable: true,
      sortValue: (quote) => workOrderCode(quote) ?? quote.workOrderId ?? "",
      render: (quote) =>
        quote.workOrderId ? (
          <span title={quote.workOrderId}>{workOrderCode(quote) ?? shortRef(quote.workOrderId)}</span>
        ) : (
          <span style={mutedStyle}>Avulso</span>
        ),
    },
    {
      key: "serviceCatalogId",
      header: "Serviço",
      sortable: true,
      sortValue: (quote) => serviceName(quote) ?? quote.serviceCatalogId,
      render: (quote) => (
        <span title={quote.serviceCatalogId}>
          {serviceName(quote) ?? <span style={monoStyle}>{shortRef(quote.serviceCatalogId)}</span>}
        </span>
      ),
    },
    {
      key: "customerId",
      header: "Cliente",
      sortable: true,
      sortValue: (quote) => customerName(quote) ?? quote.customerId ?? "",
      render: (quote) =>
        quote.customerId ? (
          <span title={quote.customerId}>{customerName(quote) ?? shortRef(quote.customerId)}</span>
        ) : (
          <span style={mutedStyle}>—</span>
        ),
    },
    {
      key: "frozenUnitPrice",
      header: "Valor unit.",
      sortable: true,
      tabular: true,
      sortValue: (quote) => quote.frozenUnitPrice,
      render: (quote) => <span style={moneyStyle}>{formatMoney(quote.frozenUnitPrice, quote.frozenCurrency)}</span>,
    },
    {
      key: "quantity",
      header: "Qtd.",
      sortable: true,
      tabular: true,
      sortValue: (quote) => quote.quantity,
      render: (quote) => formatQuantity(quote.quantity),
    },
    {
      key: "frozenTotal",
      header: "Total",
      sortable: true,
      tabular: true,
      sortValue: (quote) => quote.frozenTotal,
      render: (quote) => <span style={moneyStyle}>{formatMoney(quote.frozenTotal, quote.frozenCurrency)}</span>,
    },
    {
      key: "priceSource",
      header: "Origem",
      sortable: true,
      sortValue: (quote) => quote.priceSource,
      render: (quote) => <Chip tone={quote.priceSource === "tariff" ? "info" : "default"}>{getServiceQuotePriceSourceLabel(quote.priceSource)}</Chip>,
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (quote) => getServiceQuoteStatusLabel(quote.status),
      render: (quote) => <Chip tone={getServiceQuoteStatusTone(quote.status)}>{getServiceQuoteStatusLabel(quote.status)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (quote) => {
        if (!canUpdate && !canApprove) return <span style={countStyle}>—</span>;
        const actions = [];
        // Aprovar (draft) → cria a OS. Exige a permissão dedicada service_quotes:approve.
        if (quote.status === "draft" && canApprove) {
          actions.push(
            <Button key="approve" type="button" size="sm" variant="secondary" aria-label="Aprovar orçamento" onClick={() => void approveQuote(quote)}>
              <BadgeCheck size={14} aria-hidden /> Aprovar
            </Button>,
          );
        }
        // Compartilhar (gera/reusa o link). Reusa service_quotes:update.
        if (canUpdate && quote.status !== "void") {
          actions.push(
            <Button key="share" type="button" size="sm" variant="ghost" aria-label="Compartilhar orçamento" onClick={() => void shareQuote(quote)}>
              <Share2 size={14} aria-hidden /> Compartilhar
            </Button>,
          );
        }
        if (canUpdate && (quote.status === "draft" || quote.status === "approved" || quote.status === "rejected")) {
          actions.push(
            <Button key="void" type="button" size="sm" variant="ghost" aria-label="Anular orçamento" onClick={() => void applyStatus(quote, "void")}>
              <Ban size={14} aria-hidden /> Anular
            </Button>,
          );
        }
        return actions.length ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            {actions}
          </div>
        ) : (
          <span style={countStyle}>—</span>
        );
      },
    },
  ];

  // Busca casa os RÓTULOS resolvidos (nome do serviço/cliente, código da OS), não só o UUID.
  const filterWithLabels = useCallback(
    (its: readonly ServiceQuoteRow[], f: { search: string; isActive: ServiceQuotesFilters["isActive"] }) =>
      filterServiceQuotes(its, f, (q) => [
        q.serviceCatalogId ? references.serviceLabelById.get(q.serviceCatalogId) : undefined,
        q.customerId ? references.customerLabelById.get(q.customerId) : undefined,
        q.workOrderId ? references.workOrderLabelById.get(q.workOrderId) : undefined,
      ]),
    [references],
  );

  const dense = useDenseList<ServiceQuoteRow>({ items: visibleItems, columns, filter: filterWithLabels, defaultSort: { key: "frozenTotal", dir: "desc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operação</span>
          <h1>Orçamentos</h1>
          <p>Preço congelado a partir da Tarifa vigente — OS, serviço, valor, quantidade, total e situação.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por OS, serviço, cliente, situação ou origem…" />
          {canCreate ? (
            <Button type="button" onClick={() => setModalOpen(true)}>
              <Plus size={16} aria-hidden /> Novo orçamento
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os orçamentos" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Não foi possível concluir a ação" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert title="Ação concluída" tone="info">
          {actionNotice}
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>Situação</span>
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={statusFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card
        title="Orçamentos"
        action={
          <span style={countStyle}>
            {dense.total} registro(s)
            {pagination.total > items.length ? ` · janela: primeiros ${items.length} de ${pagination.total}` : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhum orçamento encontrado"
            detail={
              dense.hasActiveFilters || statusFilter !== "all"
                ? "Ajuste a busca ou a situação para encontrar orçamentos."
                : "Crie o primeiro orçamento para congelar o preço de um serviço."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(quote) => quote.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
            <DenseListPagination
              page={dense.page}
              pageSize={dense.pageSize}
              pageSizeOptions={dense.pageSizeOptions}
              total={dense.total}
              totalPages={dense.totalPages}
              pageStart={dense.pageStart}
              pageEnd={dense.pageEnd}
              onPageChange={dense.setPage}
              onPageSizeChange={dense.setPageSize}
            />
          </>
        ) : null}
      </Card>

      {modalOpen ? (
        <ServiceQuoteFormModal
          context={context}
          services={references.services}
          customers={references.customers}
          workOrders={references.workOrders}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}

export default OrcamentosPage;
