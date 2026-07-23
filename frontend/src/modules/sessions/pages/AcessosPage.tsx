import { Download, RefreshCw, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, useDenseList } from "../../../components/dense-list";
import { Alert, Button, Card, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { downloadCsv } from "../../../lib/csv";
import { formatWhen } from "../sessions.adapter";
import type { AccessView } from "../sessions.types";
import { useAccessHistory } from "../useAccessHistory";

const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

// Exporta SÓ os acessos reais carregados (nunca dado fabricado — D-007). Reusa o util de CSV compartilhado.
function exportAccessesCsv(accesses: readonly AccessView[]): void {
  const header = ["Usuário", "Último acesso"];
  const rows = accesses.map((access) => [access.userLabel, formatWhen(access.lastAccessAt)]);
  downloadCsv("acessos.csv", header, rows);
}

// Ω4C PR-11 — Acessos: último login por usuário, derivado de auth_sessions.created_at (D-Ω4C-ACESSO-SOURCE;
// sem tabela nova). §2.8: só usuário e quando — nunca IP/token/tenant_id. Gate audit.read.
export function AcessosPage() {
  const { data, loading, isRefreshing, refresh } = useAccessHistory();
  const { accesses, source } = data;

  const columns: DenseColumn<AccessView>[] = [
    {
      key: "user",
      header: "Usuário",
      sortable: true,
      sortValue: (item) => item.userLabel,
      render: (item) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <UserRound size={14} aria-hidden /> <strong>{item.userLabel}</strong>
        </span>
      ),
    },
    {
      key: "lastAccessAt",
      header: "Último acesso",
      align: "right",
      tabular: true,
      sortable: true,
      sortValue: (item) => item.lastAccessAt,
      render: (item) => formatWhen(item.lastAccessAt),
    },
  ];

  const denseFilter = useCallback((rows: readonly AccessView[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((item) => item.userLabel.toLowerCase().includes(search));
  }, []);

  const dense = useDenseList<AccessView>({
    items: accesses,
    columns,
    filter: denseFilter,
    defaultSort: { key: "lastAccessAt", dir: "desc" },
  });

  // §7 — acesso não permitido: gate audit.read respondeu 403.
  if (source === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Usuários</span>
          <h1>Acessos</h1>
        </header>
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar o histórico de acessos desta organização. Fale com um administrador se precisar deste acesso."
        />
      </section>
    );
  }

  const canExport = accesses.length > 0;

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Controle · Usuários</span>
          <h1>Acessos</h1>
          <p>Último acesso de cada usuário da organização, derivado dos registros de entrada no sistema.</p>
        </div>
        <div className="work-orders-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canExport}
            title={canExport ? "Exportar os acessos carregados" : "Nenhum acesso carregado para exportar."}
            onClick={() => exportAccessesCsv(accesses)}
          >
            <Download size={16} aria-hidden /> Exportar CSV
          </Button>
        </div>
      </header>

      {source === "fallback" ? (
        <Alert title="Não foi possível carregar os acessos" tone="warning">
          Houve uma falha ao buscar o histórico de acessos. A tela volta a tentar automaticamente em alguns instantes — nenhum acesso é exibido enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      ) : null}

      <Card
        title="Últimos acessos"
        action={
          <span style={countStyle}>
            {dense.total} usuário(s){isRefreshing ? " · atualizando…" : ""}
          </span>
        }
      >
        {loading && accesses.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && source !== "fallback" && dense.total === 0 ? (
          <EmptyState
            title="Sem acessos registrados"
            detail={
              dense.hasActiveFilters
                ? "Ajuste a busca para encontrar acessos."
                : "Ainda não há registros de acesso para esta organização. Assim que usuários entrarem, o último acesso aparecerá aqui."
            }
          />
        ) : null}

        {dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(item) => item.userLabel} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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

        {source === "fallback" ? (
          <div style={{ marginTop: "var(--space-10)" }}>
            <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
              <RefreshCw size={14} aria-hidden /> Tentar novamente
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

export default AcessosPage;
