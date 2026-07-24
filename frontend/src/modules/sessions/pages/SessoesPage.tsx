import { Ban, MonitorSmartphone, RefreshCw, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, useDenseList } from "../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { RevokeSessionDialog } from "../components/RevokeSessionDialog";
import {
  SESSION_REVOKE_CAVEAT,
  formatWhen,
  getSessionStatusLabel,
  getSessionStatusTone,
  interpretRevokeError,
  shouldOfferRevoke,
} from "../sessions.adapter";
import { revokeSession } from "../sessions.service";
import type { SessionView } from "../sessions.types";
import { useSessions } from "../useSessions";

const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };

// Ω4C PR-11 — Sessões ativas da organização + revogação REAL. §2.8: a tabela NUNCA mostra
// refresh_token_hash/IP/token — só usuário, dispositivo (rótulo grosseiro), início, último acesso e situação.
// O botão "Revogar" é gated por sessions:revoke (auditor vê a lista, mas NÃO o botão — backend é a autoridade).
export function SessoesPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { data, loading, isRefreshing, refresh } = useSessions();
  const { sessions, source } = data;

  const canRevoke = can("sessions:revoke");

  const [target, setTarget] = useState<SessionView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  const confirmRevoke = useCallback(async () => {
    if (!target) return;
    setBusyId(target.id);
    setActionError(null);
    setActionNotice(null);
    try {
      await revokeSession(context, target.id);
      // Feedback HONESTO: refresh bloqueado agora, mas o access token JWT segue até expirar (≤15 min).
      setActionNotice(SESSION_REVOKE_CAVEAT);
      setTarget(null);
      await refresh();
    } catch (error) {
      setActionError(interpretRevokeError(error));
    } finally {
      setBusyId(null);
    }
  }, [target, context, refresh]);

  const columns: DenseColumn<SessionView>[] = [
    {
      key: "user",
      header: "Usuário",
      sortable: true,
      sortValue: (item) => item.userLabel,
      render: (item) => <strong>{item.userLabel}</strong>,
    },
    {
      key: "device",
      header: "Dispositivo",
      sortable: true,
      sortValue: (item) => item.deviceLabel,
      render: (item) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <MonitorSmartphone size={14} aria-hidden /> {item.deviceLabel}
        </span>
      ),
    },
    {
      key: "loginAt",
      header: "Início",
      sortable: true,
      tabular: true,
      sortValue: (item) => item.loginAt,
      render: (item) => formatWhen(item.loginAt),
    },
    {
      key: "lastActivityAt",
      header: "Último acesso",
      sortable: true,
      tabular: true,
      sortValue: (item) => item.lastActivityAt,
      render: (item) => formatWhen(item.lastActivityAt),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (item) => getSessionStatusLabel(item.status),
      render: (item) => <Chip tone={getSessionStatusTone(item.status)}>{getSessionStatusLabel(item.status)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      // Gate sessions:revoke: sem a permissão (ex.: auditor) a coluna não oferece o botão. O backend é a
      // autoridade final — mesmo que a UI vazasse o botão, a rota responderia 403.
      render: (item) => {
        if (!shouldOfferRevoke(canRevoke, item.status)) return <span style={countStyle}>—</span>;
        return (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === item.id}
              aria-label={`Revogar a sessão de ${item.userLabel} (${item.deviceLabel})`}
              onClick={() => {
                setActionError(null);
                setActionNotice(null);
                setTarget(item);
              }}
            >
              <Ban size={14} aria-hidden /> Revogar
            </Button>
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback((rows: readonly SessionView[], base: { search: string }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((item) =>
      [item.userLabel, item.deviceLabel, getSessionStatusLabel(item.status)]
        .some((value) => value.toLowerCase().includes(search)),
    );
  }, []);

  const dense = useDenseList<SessionView>({
    items: sessions,
    columns,
    filter: denseFilter,
    defaultSort: { key: "lastActivityAt", dir: "desc" },
  });

  // §7 — acesso não permitido: gate sessions:read respondeu 403.
  if (source === "forbidden") {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Controle · Usuários</span>
          <h1>Sessões</h1>
        </header>
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para consultar as sessões ativas desta organização. Fale com um administrador se precisar deste acesso."
        />
      </section>
    );
  }

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Controle · Usuários</span>
          <h1>Sessões</h1>
          <p>Sessões ativas de usuários da organização. Revogar encerra o acesso no próximo ciclo de renovação (em até ~15 min).</p>
        </div>
      </header>

      {actionNotice ? (
        <Alert title="Sessão revogada" tone="info">
          {actionNotice}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      {source === "fallback" ? (
        <Alert title="Não foi possível carregar as sessões" tone="warning">
          Houve uma falha ao buscar as sessões ativas. A tela volta a tentar automaticamente em alguns instantes — nenhuma sessão é exibida enquanto isso para não apresentar informação que ainda não existe.
        </Alert>
      ) : null}

      <Card
        title="Sessões ativas"
        action={
          <span style={countStyle}>
            {dense.total} sessão(ões){isRefreshing ? " · atualizando…" : ""}
          </span>
        }
      >
        {loading && sessions.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && source !== "fallback" && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma sessão ativa"
            detail={
              dense.hasActiveFilters
                ? "Ajuste a busca para encontrar sessões ativas."
                : "Não há sessões ativas no momento. Assim que usuários entrarem, elas aparecerão aqui."
            }
          />
        ) : null}

        {dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(item) => item.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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

      {!canRevoke ? (
        <p style={mutedStyle}>
          <ShieldCheck size={13} aria-hidden /> Seu perfil pode consultar as sessões, mas a revogação é restrita a administradores da organização.
        </p>
      ) : null}

      {target ? (
        <RevokeSessionDialog
          session={target}
          busy={busyId === target.id}
          onConfirm={() => void confirmRevoke()}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </section>
  );
}

export default SessoesPage;
