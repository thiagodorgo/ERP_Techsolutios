import { ArrowDownRight, ArrowUpRight, Plus, RefreshCw, Trash2, UserRound, Wallet } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, ErrorState, Select, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { getOperatorProfileDisplayName } from "../../../registry/operator-profiles/operator-profiles.adapter";
import { useOperatorProfiles } from "../../../registry/operator-profiles/useOperatorProfiles";
import type { OperatorProfilesFilters } from "../../../registry/operator-profiles/operator-profiles.types";
import { StatementAdjustmentModal } from "../components/StatementAdjustmentModal";
import {
  describeBalance,
  formatBalance,
  formatBRL,
  formatInstallment,
  formatSignedAmount,
  formatStatementDate,
  getAmountTone,
  getBalanceTone,
  getEntryTypeLabel,
  getEntryTypeTone,
  getStatusLabel,
  getStatusTone,
  interpretRemoveError,
} from "../statement.adapter";
import { removeStatementGroup } from "../statement.service";
import type { ProfessionalStatementEntry, StatementQuery } from "../statement.types";
import { useStatement } from "../useStatement";

// Janela carregada uma vez (limit); busca/ordenação/paginação são client-side sobre ela.
const STABLE_QUERY: StatementQuery = { limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_PROFILE_FILTERS: OperatorProfilesFilters = { search: "", isActive: "all", hasConsent: "all", limit: DENSE_LIST_FETCH_LIMIT };

const TONE_COLOR: Record<string, string> = {
  success: "var(--color-status-success)",
  danger: "var(--color-status-danger)",
  warning: "var(--color-status-warning)",
  default: "var(--text-primary, #0F172A)",
};

const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const filterFieldStyle: CSSProperties = { minWidth: 260 };
const balanceGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "var(--space-10)" };
const amountCellStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, fontVariantNumeric: "tabular-nums", fontWeight: 700 };

// Ω4C PR-03 — Extrato do Profissional (razão financeiro por profissional). Lista densa ligada ao endpoint
// real /api/v1/professional-statements. Comportamento AutEM (linha = parcela, saldo corrente, badge
// liquidado/pendente) no design system do ERP. §2.8/LGPD: NUNCA CNH/dado sensível — só nome/id do profissional.
export function ExtratoProfissionalPage() {
  const { operatorProfileId: paramId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const selectedId = paramId ?? "";

  const { items: profiles } = useOperatorProfiles(STABLE_PROFILE_FILTERS);
  const { ledger, items, summary, pagination, source, forbidden, loading, isRefreshing, error, refresh } = useStatement(
    selectedId || null,
    STABLE_QUERY,
  );
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) && Boolean(selectedId) });

  const [modalOpen, setModalOpen] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const canCreate = can("professional_statements:create");
  const canUpdate = can("professional_statements:update");

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

  // Rótulo do profissional selecionado: o nome retornado no razão (label allowlistado do backend), caindo
  // para a lista de Profissionais quando o deep-link ainda não carregou o razão. §2.8: só o nome, nunca CNH.
  const selectedProfileName = useMemo(() => {
    if (!selectedId) return null;
    if (ledger.professionalName) return ledger.professionalName;
    const fromList = profiles.find((profile) => profile.id === selectedId);
    return fromList ? getOperatorProfileDisplayName(fromList) : null;
  }, [selectedId, profiles, ledger.professionalName]);

  const professionalOptions = useMemo(() => {
    const options = profiles.map((profile) => ({ id: profile.id, label: getOperatorProfileDisplayName(profile) }));
    // Deep-link para um profissional fora da janela carregada: mantém a opção selecionada visível.
    if (selectedId && !options.some((option) => option.id === selectedId)) {
      options.unshift({ id: selectedId, label: selectedProfileName ?? "Profissional selecionado" });
    }
    return options;
  }, [profiles, selectedId, selectedProfileName]);

  const changeProfessional = useCallback(
    (id: string) => {
      setActionError(null);
      setActionNotice(null);
      navigate(id ? `/fleet/statement/${id}` : "/fleet/statement");
    },
    [navigate],
  );

  const openCreate = useCallback(() => {
    setActionError(null);
    setActionNotice(null);
    setModalOpen(true);
  }, []);

  const removeGroup = useCallback(
    async (entry: ProfessionalStatementEntry) => {
      setBusyGroupId(entry.groupId);
      setActionError(null);
      setActionNotice(null);
      try {
        await removeStatementGroup(context, entry.groupId);
        setActionNotice("Lançamento retirado do extrato.");
        await refresh();
      } catch (removeError) {
        // RN-EXT-01 — 409 statement_entry_locked → mensagem do AutEM (trava de integridade).
        setActionError(interpretRemoveError(removeError));
      } finally {
        setBusyGroupId(null);
      }
    },
    [context, refresh],
  );

  const columns: DenseColumn<ProfessionalStatementEntry>[] = [
    {
      key: "dueDate",
      header: "Data",
      sortable: true,
      tabular: true,
      sortValue: (entry) => entry.dueDate,
      render: (entry) => formatStatementDate(entry.dueDate),
    },
    {
      key: "entryType",
      header: "Tipo",
      sortable: true,
      sortValue: (entry) => getEntryTypeLabel(entry.entryType),
      render: (entry) => <Chip tone={getEntryTypeTone(entry.entryType)}>{getEntryTypeLabel(entry.entryType)}</Chip>,
    },
    {
      key: "description",
      header: "Descrição",
      sortable: true,
      sortValue: (entry) => entry.description ?? "",
      render: (entry) => (entry.description ? entry.description : <span style={mutedStyle}>—</span>),
    },
    {
      key: "installment",
      header: "Parcela",
      align: "right",
      tabular: true,
      sortable: true,
      sortValue: (entry) => entry.installmentNumber,
      render: (entry) => formatInstallment(entry.installmentNumber, entry.installmentTotal),
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      tabular: true,
      sortable: true,
      // Ordena pelo valor COM SINAL (crédito soma, débito subtrai) — coerente com a coluna.
      sortValue: (entry) => (entry.direction === "credit" ? entry.amount : -entry.amount),
      render: (entry) => {
        const tone = getAmountTone(entry.direction);
        const isCredit = entry.direction === "credit";
        return (
          <span style={{ ...amountCellStyle, color: TONE_COLOR[tone] }}>
            {isCredit ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}
            {formatSignedAmount(entry.amount, entry.direction)}
          </span>
        );
      },
    },
    {
      key: "runningBalance",
      header: "Saldo",
      align: "right",
      tabular: true,
      sortable: true,
      sortValue: (entry) => entry.runningBalance,
      render: (entry) => (
        <strong style={{ color: TONE_COLOR[getBalanceTone(entry.runningBalance)], fontVariantNumeric: "tabular-nums" }}>
          {formatBalance(entry.runningBalance)}
        </strong>
      ),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (entry) => getStatusLabel(entry.status),
      render: (entry) => <Chip tone={getStatusTone(entry.status)}>{getStatusLabel(entry.status)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (entry) => {
        // DELETE ("retirar do extrato") corre sob :update. A trava RN-EXT-01 (parcela liquidada) é do backend.
        if (!canUpdate) return <span style={countStyle}>—</span>;
        const ref = `${getEntryTypeLabel(entry.entryType)} · ${formatStatementDate(entry.dueDate)}`;
        return (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyGroupId === entry.groupId}
              aria-label={`Retirar do extrato o lançamento ${ref}`}
              onClick={() => void removeGroup(entry)}
            >
              <Trash2 size={14} aria-hidden /> Retirar
            </Button>
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback((rows: readonly ProfessionalStatementEntry[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((entry) =>
      [getEntryTypeLabel(entry.entryType), entry.description, getStatusLabel(entry.status), formatInstallment(entry.installmentNumber, entry.installmentTotal)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, []);

  // Saldo corrente é lido em ordem asc por vencimento (a progressão do runningBalance server-side).
  const dense = useDenseList<ProfessionalStatementEntry>({ items, columns, filter: denseFilter, defaultSort: { key: "dueDate", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Frota</span>
          <h1>Extrato do Profissional</h1>
          <p>Razão financeiro por profissional — lançamentos datados, parcelas e saldo corrente da folha.</p>
        </div>
        <div className="work-orders-actions">
          <div style={filterFieldStyle}>
            <Select
              label="Profissional"
              value={selectedId}
              aria-label="Selecionar profissional"
              onChange={(event) => changeProfessional(event.target.value)}
            >
              <option value="">Selecione um profissional…</option>
              {professionalOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {canCreate ? (
            <Button type="button" onClick={openCreate} disabled={!selectedId}>
              <Plus size={16} aria-hidden /> Novo ajuste
            </Button>
          ) : null}
        </div>
      </header>

      {actionNotice ? (
        <Alert title="Ação concluída" tone="info">
          {actionNotice}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      {error ? (
        <Alert title="Não foi possível carregar o extrato" tone="warning">
          {error}
        </Alert>
      ) : null}

      {!selectedId ? (
        <Card>
          <EmptyState
            title="Selecione um profissional"
            detail="Escolha um profissional acima para ver o extrato financeiro, com lançamentos, parcelas e saldo corrente."
          />
        </Card>
      ) : forbidden ? (
        <ErrorState
          title="Acesso não permitido"
          detail="Seu usuário não tem permissão para ver o extrato deste profissional."
        />
      ) : (
        <>
          <div style={balanceGridStyle}>
            <Card>
              <div className="work-orders-kpi">
                <span>
                  <Wallet size={16} aria-hidden /> Saldo corrente
                </span>
                <strong style={{ color: TONE_COLOR[getBalanceTone(summary.currentBalance)] }}>{formatBalance(summary.currentBalance)}</strong>
                <small style={mutedStyle}>{describeBalance(summary.currentBalance)}</small>
              </div>
            </Card>
            <Card>
              <div className="work-orders-kpi">
                <span>
                  <ArrowUpRight size={16} aria-hidden /> Total de créditos
                </span>
                <strong style={{ color: TONE_COLOR.success }}>{formatBRL(summary.totalCredits)}</strong>
                <small style={mutedStyle}>Proventos ao profissional</small>
              </div>
            </Card>
            <Card>
              <div className="work-orders-kpi">
                <span>
                  <ArrowDownRight size={16} aria-hidden /> Total de débitos
                </span>
                <strong style={{ color: TONE_COLOR.danger }}>{formatBRL(summary.totalDebits)}</strong>
                <small style={mutedStyle}>Descontos do profissional</small>
              </div>
            </Card>
            <Card>
              <div className="work-orders-kpi">
                <span>
                  <UserRound size={16} aria-hidden /> Lançamentos
                </span>
                <strong>{summary.count.toLocaleString("pt-BR")}</strong>
                <small style={mutedStyle}>{isRefreshing ? "Atualizando…" : "Parcelas no extrato"}</small>
              </div>
            </Card>
          </div>

          <Card
            title="Lançamentos do extrato"
            action={
              <span style={countStyle}>
                {dense.total} lançamento(s)
                {pagination.total > items.length ? ` · janela: primeiros ${items.length} de ${pagination.total}` : ""}
                {source === "fallback" ? " · dados podem estar desatualizados" : ""}
              </span>
            }
          >
            {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

            {!loading && !error && dense.total === 0 ? (
              <EmptyState
                title="Sem lançamentos"
                detail={
                  dense.hasActiveFilters
                    ? "Ajuste a busca para encontrar lançamentos no extrato."
                    : "Este profissional ainda não possui lançamentos no extrato."
                }
              />
            ) : null}

            {!error && dense.total > 0 ? (
              <>
                <DenseTable rows={dense.visibleItems} keyForRow={(entry) => entry.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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

            {error ? (
              <div style={{ marginTop: "var(--space-10)" }}>
                <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
                  <RefreshCw size={14} aria-hidden /> Tentar novamente
                </Button>
              </div>
            ) : null}
          </Card>
        </>
      )}

      {modalOpen && selectedId ? (
        <StatementAdjustmentModal
          operatorProfileId={selectedId}
          professionalName={selectedProfileName}
          context={context}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            setActionNotice("Ajuste registrado no extrato.");
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}

export default ExtratoProfissionalPage;
