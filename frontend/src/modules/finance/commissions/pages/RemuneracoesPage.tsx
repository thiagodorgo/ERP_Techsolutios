import { Coins, Receipt, RefreshCw, Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, EmptyState, ErrorState, Input, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { listTenantUsers } from "../../../registry/teams/teams.service";
import type { TenantUser } from "../../../registry/teams/teams.types";
import {
  formatBRL,
  formatCommissionCount,
  formatPeriodLabel,
} from "../commissions.adapter";
import type { CommissionSummaryItem, CommissionSummaryScope } from "../commissions.types";
import { CommissionDetailDrawer } from "../components/CommissionDetailDrawer";
import { useCommissionsSummary } from "../useCommissionsSummary";

// F8 Remunerações — extrato de comissões por operador/período, com detalhamento por OS.
// Tela adaptativa por permissão (o backend é a autoridade final; a UI só molda):
//   commissions:read      → extrato de todos os operadores (tabela densa + filtro por operador)
//   commissions:read_own  → apenas o próprio extrato (card focado), sem a tabela de operadores.

const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-10)" };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between" };
const filterFieldStyle: CSSProperties = { minWidth: 220 };
const periodRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-6)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const ownCardBodyStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-12)" };
const ownMetricsStyle: CSSProperties = { display: "flex", gap: "var(--space-16)", flexWrap: "wrap" };
const ownMetricStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)" };
const ownMetricValueStyle: CSSProperties = { fontSize: "var(--text-2xl, 22px)", fontWeight: 800, fontVariantNumeric: "tabular-nums" };

type SelectedPayee = { readonly id?: string; readonly name: string };

// Filtro client-side da janela carregada: busca por nome resolvido do operador (ou id).
function makeSummaryFilter(resolveName: (id: string) => string | undefined) {
  return (rows: readonly CommissionSummaryItem[], base: { search: string }): CommissionSummaryItem[] => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((row) => {
      const name = resolveName(row.payeeId) ?? "";
      return `${name} ${row.payeeId}`.toLowerCase().includes(search);
    });
  };
}

export function RemuneracoesPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canReadAll = can("commissions:read");
  const canReadOwn = can("commissions:read_own");
  const scope: CommissionSummaryScope | null = canReadAll ? "all" : canReadOwn ? "own" : null;

  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const payeeId = searchParams.get("payee_id") ?? "";

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [selected, setSelected] = useState<SelectedPayee | null>(null);

  const { summary, loading, error, refresh } = useCommissionsSummary(scope, from, to, canReadAll ? payeeId : "");
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) && Boolean(scope) });

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

  // Carrega os usuários da organização uma vez para resolver nomes e popular o seletor.
  // D-007: em mock/erro retorna vazio (degrada para "Operador" sem fabricar identidades).
  useEffect(() => {
    if (!activeContext || scope !== "all") return;
    let active = true;
    void listTenantUsers(context).then((loaded) => {
      if (active) setUsers(loaded);
    });
    return () => {
      active = false;
    };
  }, [activeContext, context, scope]);

  const nameById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const resolveName = useCallback((id: string) => nameById.get(id), [nameById]);

  const setParam = useCallback(
    (key: "from" | "to" | "payee_id", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page"); // troca de filtro volta para a primeira página
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // ── Sem permissão: estado obrigatório "acesso não permitido" ──────────────────────────
  if (!scope) {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Financeiro</span>
          <h1>Remunerações</h1>
        </header>
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não possui permissão para visualizar remunerações."
        />
      </section>
    );
  }

  const periodControls = (
    <div style={periodRowStyle}>
      <div style={{ minWidth: 150 }}>
        <Input label="De" type="date" value={from} onChange={(event) => setParam("from", event.target.value)} aria-label="Início do período" />
      </div>
      <div style={{ minWidth: 150 }}>
        <Input label="Até" type="date" value={to} onChange={(event) => setParam("to", event.target.value)} aria-label="Fim do período" />
      </div>
    </div>
  );

  const errorBlock = error ? (
    <Alert title="Não foi possível carregar as remunerações" tone="warning">
      {error}{" "}
      <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
        <RefreshCw size={14} aria-hidden /> Tentar novamente
      </Button>
    </Alert>
  ) : null;

  // ── Escopo próprio (operador): apenas o próprio extrato ───────────────────────────────
  if (scope === "own") {
    const ownItem = summary.items[0];
    const ownCount = summary.items.reduce((sum, item) => sum + item.count, 0);
    const ownName = session?.user.name ?? "Você";

    return (
      <section className="page-stack">
        <header className="page-heading page-heading--row">
          <div>
            <span>Financeiro</span>
            <h1>Remunerações</h1>
            <p>Seu extrato de comissões por período, com detalhamento por OS.</p>
          </div>
          <div className="work-orders-actions">{periodControls}</div>
        </header>

        {errorBlock}

        <Card title="Seu extrato de comissões">
          {loading ? (
            <Skeleton lines={3} />
          ) : (
            <div style={ownCardBodyStyle}>
              <span style={mutedStyle}>{formatPeriodLabel(summary.from || from, summary.to || to)}</span>
              <div style={ownMetricsStyle}>
                <div style={ownMetricStyle}>
                  <span style={countStyle}>Total no período</span>
                  <strong style={ownMetricValueStyle}>{formatBRL(summary.total)}</strong>
                </div>
                <div style={ownMetricStyle}>
                  <span style={countStyle}>Comissões</span>
                  <strong style={ownMetricValueStyle}>{formatCommissionCount(ownCount)}</strong>
                </div>
              </div>
              <div>
                <Button type="button" onClick={() => setSelected({ id: ownItem?.payeeId, name: ownName })}>
                  <Receipt size={16} aria-hidden /> Ver detalhamento por OS
                </Button>
              </div>
              {ownCount === 0 ? (
                <EmptyState
                  title="Sem comissões no período"
                  detail="Nenhuma comissão foi calculada para você no período selecionado. Ajuste as datas para consultar outro intervalo."
                />
              ) : null}
            </div>
          )}
        </Card>

        {selected ? (
          <CommissionDetailDrawer
            scope="own"
            payeeId={selected.id}
            payeeName={selected.name}
            from={from}
            to={to}
            context={context}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </section>
    );
  }

  // ── Escopo total (finance/tenant_admin): extrato de todos os operadores ───────────────
  return (
    <RemuneracoesAllView
      summary={summary}
      loading={loading}
      errorBlock={errorBlock}
      resolveName={resolveName}
      users={users}
      payeeId={payeeId}
      onSelectPayee={(value) => setParam("payee_id", value)}
      onOpenDetail={setSelected}
      periodControls={periodControls}
    >
      {selected ? (
        <CommissionDetailDrawer
          scope="all"
          payeeId={selected.id}
          payeeName={selected.name}
          from={from}
          to={to}
          context={context}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </RemuneracoesAllView>
  );
}

function RemuneracoesAllView({
  summary,
  loading,
  errorBlock,
  resolveName,
  users,
  payeeId,
  onSelectPayee,
  onOpenDetail,
  periodControls,
  children,
}: {
  readonly summary: { items: CommissionSummaryItem[]; total: number; from: string; to: string };
  readonly loading: boolean;
  readonly errorBlock: ReactNode;
  readonly resolveName: (id: string) => string | undefined;
  readonly users: TenantUser[];
  readonly payeeId: string;
  readonly onSelectPayee: (value: string) => void;
  readonly onOpenDetail: (payee: SelectedPayee) => void;
  readonly periodControls: ReactNode;
  readonly children: ReactNode;
}) {
  const displayName = useCallback((id: string) => resolveName(id) ?? "Operador", [resolveName]);

  const columns: DenseColumn<CommissionSummaryItem>[] = useMemo(
    () => [
      {
        key: "operador",
        header: "Operador",
        sortable: true,
        sortValue: (item) => displayName(item.payeeId),
        render: (item) => (
          <Link
            to="/users"
            aria-label={`Ver perfil de ${displayName(item.payeeId)} em Usuários`}
            onClick={(event) => event.stopPropagation()}
          >
            {displayName(item.payeeId)}
          </Link>
        ),
      },
      {
        key: "comissoes",
        header: "Comissões",
        sortable: true,
        align: "right",
        tabular: true,
        sortValue: (item) => item.count,
        render: (item) => formatCommissionCount(item.count),
      },
      {
        key: "total",
        header: "Total",
        sortable: true,
        align: "right",
        tabular: true,
        sortValue: (item) => item.total,
        render: (item) => <strong>{formatBRL(item.total)}</strong>,
      },
      {
        key: "actions",
        header: "Ações",
        render: (item) => (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={`Ver detalhamento por OS de ${displayName(item.payeeId)}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail({ id: item.payeeId, name: displayName(item.payeeId) });
            }}
          >
            <Receipt size={14} aria-hidden /> Detalhar
          </Button>
        ),
      },
    ],
    [displayName, onOpenDetail],
  );

  const summaryFilter = useMemo(() => makeSummaryFilter(resolveName), [resolveName]);
  const dense = useDenseList<CommissionSummaryItem>({
    items: summary.items,
    columns,
    filter: summaryFilter,
    defaultSort: { key: "total", dir: "desc" },
  });

  // Totais renderizam mesmo vazio (a partir do extrato completo, não da página atual).
  const operatorCount = summary.items.length;
  const commissionCount = useMemo(() => summary.items.reduce((sum, item) => sum + item.count, 0), [summary.items]);

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>Financeiro</span>
          <h1>Remunerações</h1>
          <p>Comissões por operador e período, com detalhamento por OS. Período: {formatPeriodLabel(summary.from, summary.to)}.</p>
        </div>
        <div className="work-orders-actions">{periodControls}</div>
      </header>

      {errorBlock}

      <div style={totalsGridStyle}>
        <div className="work-orders-kpi">
          <span>
            <Coins size={16} aria-hidden /> Total geral
          </span>
          <strong style={tabularStyle}>{formatBRL(summary.total)}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Users size={16} aria-hidden /> Operadores
          </span>
          <strong style={tabularStyle}>{operatorCount.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Receipt size={16} aria-hidden /> Comissões
          </span>
          <strong style={tabularStyle}>{formatCommissionCount(commissionCount)}</strong>
        </div>
      </div>

      <div style={filterRowStyle}>
        <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar operador…" />
        <div style={filterFieldStyle}>
          <Select label="Operador" value={payeeId} onChange={(event) => onSelectPayee(event.target.value)}>
            <option value="">Todos os operadores</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card
        title="Extrato por operador"
        action={
          <span style={countStyle}>
            {dense.total} operador(es)
            {summary.items.length > DENSE_LIST_FETCH_LIMIT ? ` · janela: primeiros ${DENSE_LIST_FETCH_LIMIT}` : ""}
          </span>
        }
      >
        {loading && summary.items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma comissão no período"
            detail={
              dense.hasActiveFilters || payeeId
                ? "Ajuste a busca, o operador ou o período para encontrar comissões."
                : "Nenhuma comissão foi calculada no período selecionado. Ajuste as datas para consultar outro intervalo."
            }
          />
        ) : null}

        {dense.total > 0 ? (
          <>
            <DenseTable
              rows={dense.visibleItems}
              keyForRow={(item) => item.payeeId}
              columns={columns}
              sort={dense.sort}
              onSort={dense.toggleSort}
              onRowClick={(item) => onOpenDetail({ id: item.payeeId, name: displayName(item.payeeId) })}
            />
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

      {children}
    </section>
  );
}

export default RemuneracoesPage;
