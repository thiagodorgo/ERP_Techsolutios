import { AlertTriangle, CheckCircle2, Plus, Search, Send, UserRound, Wrench } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ClickableKpiCard } from "../../../components/kpi";
import { KpiStatCard, PageHeader, StatusPill, TablePager, type KpiStatTag } from "../../../components/patterns";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { buildWorkOrdersKpiDetails } from "../work-orders-kpi-detail";
import { RevokeDispatchPrompt } from "../components/RevokeDispatchPrompt";
import { WorkOrderDelayBadge } from "../components/WorkOrderDelayBadge";
import { WorkOrderRowActions } from "../components/WorkOrderRowActions";
import { runAdvance, runRevokeConfirm, runRevokeDiscovery, type RevokeTarget } from "../work-orders-row.handlers";
import { isWorkOrderDelayed, WORK_ORDER_STATUS_LABEL } from "../work-orders-row.logic";
import { useWorkOrders } from "../useWorkOrders";
import type { WorkOrderListItem, WorkOrderPriority, WorkOrderStatus, WorkOrdersFilters } from "../work-orders.types";

// "Ordens de Serviço" (lista) — PR-B TELAS PADRONIZADAS. Reproduz o bloco `sc_os` do protótipo
// "ERP Web - Telas Padronizadas.dc.html" com os DADOS REAIS do módulo (useWorkOrders + adapters).
// Nenhum número é fabricado (D-007). Degradações honestas documentadas inline:
//  · "SLA em risco" do design não é derivável da lista (prazo de SLA não garantido no DTO) →
//    o slot crítico é "Atrasadas" (agenda vencida e não finalizada) — precedente do PR-A.
//  · O DTO de lista traz só o ID do técnico (sem nome) → célula TÉCNICO mostra "Atribuído"
//    (avatar genérico, sem inventar iniciais/nome). Pendência: nome do técnico na lista.
//  · "Exportar" do protótipo OMITIDO (sem ação de exportação real) e "Filtrar" também
//    (os filtros reais — busca + tabs — são inline na toolbar, como no próprio design).
//  · "atualizado há X min" do design omitido: o hook não expõe timestamp real de atualização.
//  · "Concluídas hoje" do design → "Concluídas" no total da lista (sem recorte diário real).

// Cor por status; o RÓTULO vem da fonte única WORK_ORDER_STATUS_LABEL (work-orders-row.logic) — sem
// duas verdades de rótulo (condição fid J-Ω3F-9). Tons do design (sc_os): Aberta EFF6FF/2563EB ·
// Em campo DCFCE7/15803D · risco FEE2E2/B91C1C · Concluída F1F5F9/475569; status reais fora do
// design usam a família semântica mais próxima (pausada → âmbar).
const STATUS_TONE: Record<WorkOrderStatus, { bg: string; fg: string }> = {
  open: { bg: "#EFF6FF", fg: "#2563EB" },
  assigned: { bg: "#EFF6FF", fg: "#2563EB" },
  accepted: { bg: "#EFF6FF", fg: "#2563EB" },
  on_route: { bg: "#DCFCE7", fg: "#15803D" },
  on_site: { bg: "#DCFCE7", fg: "#15803D" },
  in_progress: { bg: "#DCFCE7", fg: "#15803D" },
  paused: { bg: "#FEF3C7", fg: "#B45309" },
  completed: { bg: "#F1F5F9", fg: "#475569" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C" },
  rejected: { bg: "#FEE2E2", fg: "#B91C1C" },
};

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

// Dot + cor do texto de prioridade (design: Alta DC2626/B91C1C · Média F59E0B/B45309 · Baixa
// 94A3B8/64748B). "Urgente" não existe no design → família vermelha (a mais próxima), rótulo real.
const PRIORITY_TONE: Record<WorkOrderPriority, { dot: string; fg: string }> = {
  low: { dot: "#94A3B8", fg: "#64748B" },
  medium: { dot: "#F59E0B", fg: "#B45309" },
  high: { dot: "#DC2626", fg: "#B91C1C" },
  urgent: { dot: "#DC2626", fg: "#B91C1C" },
};

const isFinalStatus = (s: WorkOrderStatus) => s === "completed" || s === "cancelled" || s === "rejected";
const isFieldStatus = (s: WorkOrderStatus) => s === "on_route" || s === "on_site" || s === "in_progress" || s === "paused";

// Tabs-pill do design [Todas | Sem técnico | Em campo | Concluídas] mapeadas aos filtros REAIS:
// "Sem técnico" = sem operador atribuído e ainda não finalizada; "Em campo" = status de campo;
// "Concluídas" = completed. (A antiga tab "Agendadas" foi absorvida: essas OS seguem em "Todas".)
type TabKey = "all" | "unassigned" | "field" | "done";
const TABS: readonly { key: TabKey; label: string; match: (o: WorkOrderListItem) => boolean }[] = [
  { key: "all", label: "Todas", match: () => true },
  { key: "unassigned", label: "Sem técnico", match: (o) => !isFinalStatus(o.status) && !o.assignedOperatorId },
  { key: "field", label: "Em campo", match: (o) => isFieldStatus(o.status) },
  { key: "done", label: "Concluídas", match: (o) => o.status === "completed" },
];

const STABLE_FILTERS: WorkOrdersFilters = { search: "", status: "all", priority: "all", assignedOperatorId: "", from: "", to: "" };

const pad = (n: number) => n.toString().padStart(2, "0");

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type AgendaInfo = { text: string; color: string; weight: number; overdue: boolean };

/**
 * Célula AGENDA — "Hoje/Amanhã/Ontem, HH:MM" (senão dd/mm), tabular. Cor por urgência REAL
 * derivada de scheduled_for × status (design sc_os): vencida e não finalizada → vermelho 700;
 * vence em ≤2 h → âmbar-forte 700; finalizada/sem urgência → neutro; sem agenda → cinza.
 */
function agendaInfo(iso: string | null | undefined, status: WorkOrderStatus, now: Date): AgendaInfo {
  if (!iso) return { text: "Sem agenda", color: "#94A3B8", weight: 600, overdue: false };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { text: "—", color: "#94A3B8", weight: 600, overdue: false };

  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = sameDay(date, now)
    ? "Hoje"
    : sameDay(date, tomorrow)
      ? "Amanhã"
      : sameDay(date, yesterday)
        ? "Ontem"
        : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  const text = `${day}, ${hm}`;

  if (isFinalStatus(status)) return { text, color: "#94A3B8", weight: 600, overdue: false };
  const diffMin = (date.getTime() - now.getTime()) / 60000;
  if (diffMin <= 0) return { text, color: "#DC2626", weight: 700, overdue: true };
  if (diffMin <= 120) return { text, color: "#B45309", weight: 700, overdue: false };
  return { text, color: "#334155", weight: 600, overdue: false };
}

/** Wrapper de clique que NÃO propaga (a linha inteira navega ao detalhe no clique do corpo). */
function stop(fn: () => void) {
  return (event: ReactMouseEvent) => {
    event.stopPropagation();
    fn();
  };
}

const TAG_ACT_NOW: KpiStatTag = { label: "agir agora", bg: "#FEE2E2", fg: "#B91C1C" };
const TAG_UNDER_CONTROL: KpiStatTag = { label: "sob controle", bg: "#DCFCE7", fg: "#15803D" };
const TAG_ON_TIME: KpiStatTag = { label: "no prazo", bg: "#DCFCE7", fg: "#15803D" };
const TAG_LATE: KpiStatTag = { label: "há atrasos", bg: "#FEF3C7", fg: "#B45309" };
const TAG_DONE: KpiStatTag = { label: "finalizadas", bg: "#DCFCE7", fg: "#15803D" };

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const { items, loading, source, refresh, context } = useWorkOrders(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(context.tenantId) });
  const { permissions } = usePermissions();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  // Ω3F-9 — estado por-linha das ações (avançar/revogar) + o prompt de motivo do revogar.
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  const [revoke, setRevoke] = useState<RevokeTarget | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const setBusy = useCallback((id: string, value: boolean) => setRowBusy((m) => ({ ...m, [id]: value })), []);
  const setError = useCallback((id: string, value: string | null) => setRowError((m) => ({ ...m, [id]: value })), []);

  const handleAdvance = useCallback(
    (order: WorkOrderListItem) => runAdvance({ context, refresh, setBusy, setError }, order),
    [context, refresh, setBusy, setError],
  );

  const handleRevokeClick = useCallback(
    async (order: WorkOrderListItem) => {
      setRevokeError(null);
      const target = await runRevokeDiscovery({ context, setBusy, setError }, order);
      if (target) setRevoke(target);
    },
    [context, setBusy, setError],
  );

  const handleRevokeConfirm = useCallback(
    async (reason: string) => {
      if (!revoke) return;
      setRevokeBusy(true);
      setRevokeError(null);
      const result = await runRevokeConfirm({ context, refresh }, revoke, reason);
      if (result === true) setRevoke(null);
      else setRevokeError(result);
      setRevokeBusy(false);
    },
    [context, revoke, refresh],
  );

  // Contagens 100% derivadas dos itens REAIS já carregados (D-007 — nada fabricado).
  // "atrasadas" reusa isWorkOrderDelayed (agenda vencida × status não final — D-Ω3F-9-BADGE);
  // "semTecnico" alimenta o selo do card OS abertas (o "4 sem técnico" do design, com número real).
  const kpis = useMemo(() => {
    const delayed = (o: WorkOrderListItem) => isWorkOrderDelayed(o.scheduledFor, o.status).delayed;
    return {
      abertas: items.filter((o) => !isFinalStatus(o.status)).length,
      andamento: items.filter((o) => isFieldStatus(o.status)).length,
      atrasadas: items.filter(delayed).length,
      concluidas: items.filter((o) => o.status === "completed").length,
      semTecnico: items.filter((o) => !isFinalStatus(o.status) && !o.assignedOperatorId).length,
      // Selo do card "Em andamento" derivado do RECORTE em campo (não da contagem global —
      // resposta à BAIXA 3 da junta do PR-A: associação semântica justa).
      atrasadasEmCampo: items.filter((o) => isFieldStatus(o.status) && delayed(o)).length,
    };
  }, [items]);

  // WS-CARDS-CHARTS-F2 — pop-up de cada KPI: "participação no total" a partir das MESMAS contagens já
  // exibidas nos cards (derivadas de `items`); nada é somado nem fabricado (D-007).
  const kpiDetails = useMemo(
    () =>
      buildWorkOrdersKpiDetails(
        { abertas: kpis.abertas, andamento: kpis.andamento, atrasadas: kpis.atrasadas, concluidas: kpis.concluidas, total: items.length },
        source,
      ),
    [kpis, items.length, source],
  );

  const now = new Date();
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const q = search.trim().toLowerCase();
  const filtered = items
    .filter((o) => activeTab.match(o))
    .filter((o) => (q ? [o.code, o.title, o.customerName, o.serviceAddress].some((v) => (v ?? "").toLowerCase().includes(q)) : true));

  // Paginação client-side (TablePager padronizado). Página "clampada" quando o filtro encolhe a lista.
  const total = filtered.length;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const effectivePage = Math.min(page, maxPage);
  const start = effectivePage * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = filtered.slice(start, end);

  const canDispatch = permissions.includes("field_dispatch:create");
  const kpiSkeleton = loading && items.length === 0;

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="OPERAÇÃO"
        title="Ordens de Serviço"
        subtitle="Atribuição, execução, SLA e rastreabilidade de cada atendimento em campo."
        actions={
          // "Filtrar" omitido (filtros reais são inline na toolbar) e "Exportar" omitido
          // (sem ação de exportação real nesta tela) — nunca botão morto.
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
            <Plus size={15} aria-hidden="true" />
            Nova OS
          </button>
        }
      />

      {/* KPIs de decisão — contagens reais derivadas da própria lista */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 14 }} aria-live="polite">
        {kpiSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="pat-kpi" aria-hidden="true">
              <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
              <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
            </div>
          ))
        ) : (
          <>
            <ClickableKpiCard detail={kpiDetails.abertas}>
              <KpiStatCard
                icon={Wrench}
                iconColor="#2563EB"
                iconBg="#EFF6FF"
                value={kpis.abertas}
                label="OS abertas"
                hint="ainda não concluídas nem canceladas"
                tag={kpis.semTecnico > 0 ? { label: `${kpis.semTecnico} sem técnico`, bg: "#FEF3C7", fg: "#B45309" } : undefined}
              />
            </ClickableKpiCard>
            <ClickableKpiCard detail={kpiDetails.andamento}>
              <KpiStatCard
                icon={Send}
                iconColor="#0369A1"
                iconBg="#F0F9FF"
                value={kpis.andamento}
                label="Em andamento"
                hint="técnico em campo agora"
                tag={kpis.atrasadasEmCampo === 0 ? TAG_ON_TIME : TAG_LATE}
              />
            </ClickableKpiCard>
            {/* Slot crítico do design ("SLA em risco") ocupado por Atrasadas — precedente do PR-A. */}
            <ClickableKpiCard detail={kpiDetails.atrasadas}>
              <KpiStatCard
                icon={AlertTriangle}
                iconColor={kpis.atrasadas > 0 ? "#DC2626" : "#15803D"}
                iconBg={kpis.atrasadas > 0 ? "#FEF2F2" : "#F0FDF4"}
                value={kpis.atrasadas}
                label="Atrasadas"
                hint="agenda vencida e sem conclusão"
                tag={kpis.atrasadas > 0 ? TAG_ACT_NOW : TAG_UNDER_CONTROL}
                border={kpis.atrasadas > 0 ? "#FCA5A5" : undefined}
              />
            </ClickableKpiCard>
            <ClickableKpiCard detail={kpiDetails.concluidas}>
              <KpiStatCard
                icon={CheckCircle2}
                iconColor="#15803D"
                iconBg="#F0FDF4"
                value={kpis.concluidas}
                label="Concluídas"
                hint="no total da lista"
                tag={TAG_DONE}
              />
            </ClickableKpiCard>
          </>
        )}
      </div>

      {source === "fallback" ? (
        <div role="alert" className="pat-banner pat-banner--warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Sem conexão com a API — exibindo dados locais.</span>
          <button type="button" className="pat-link" onClick={() => void refresh()}>
            Tentar novamente
          </button>
        </div>
      ) : source === "mock" ? (
        <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
          <StatusPill label="Dados demonstrativos" bg="#EFF6FF" fg="#2563EB" />
        </div>
      ) : null}

      {/* Tabela padronizada (card 14px) — toolbar: busca real + tabs-pill + contagem real */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div className="pat-os-toolbar">
          <div className="pat-os-search">
            <Search size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar por código, cliente ou endereço…"
              aria-label="Buscar por código, cliente ou endereço"
            />
          </div>
          <div className="pat-os-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={t.key === tab ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                aria-pressed={t.key === tab}
                onClick={() => {
                  setTab(t.key);
                  setPage(0);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* "atualizado há X min" do design omitido: sem timestamp real exposto pelo hook. */}
          <span className="pat-os-count">{total === 1 ? "1 ordem" : `${total} ordens`}</span>
        </div>

        <div className="pat-os-grid pat-os-grid--head" aria-hidden="true">
          <div>CÓDIGO</div>
          <div>CLIENTE / SERVIÇO</div>
          <div>TÉCNICO</div>
          <div>AGENDA</div>
          <div>SITUAÇÃO</div>
          <div style={{ textAlign: "right" }}>AÇÃO</div>
        </div>

        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="pat-os-grid" style={{ borderBottom: "1px solid #F1F5F9" }} aria-hidden="true">
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
              <div className="pat-skel" style={{ height: 12 }} />
            </div>
          ))
        ) : total === 0 ? (
          <div style={{ padding: "48px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Nenhuma ordem de serviço</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>
              {q || tab !== "all" ? "Ajuste a busca ou os filtros acima." : "As ordens atribuídas à sua organização aparecem aqui."}
            </div>
          </div>
        ) : (
          pageItems.map((o: WorkOrderListItem) => {
            const st = STATUS_TONE[o.status];
            const pr = PRIORITY_TONE[o.priority];
            const agenda = agendaInfo(o.scheduledFor, o.status, now);
            const svc = [o.title, o.serviceCity ? `${o.serviceCity}${o.serviceState ? `/${o.serviceState}` : ""}` : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={o.id} className="pat-os-grid pat-os-row" onClick={() => navigate(`/work-orders/${o.id}`)}>
                {/* CÓDIGO — mono azul + prioridade com dot */}
                <div>
                  <div className="pat-mono" style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>{o.code}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.dot, flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: pr.fg }}>{PRIORITY_LABEL[o.priority]}</span>
                  </div>
                </div>

                {/* CLIENTE / SERVIÇO — cliente ausente vira chip âmbar + "Vincular" (destino real: detalhe da OS) */}
                <div style={{ minWidth: 0 }}>
                  {o.customerName ? (
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customerName}</div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="pat-os-noclient">Sem cliente vinculado</span>
                      <button
                        type="button"
                        className="pat-link"
                        style={{ fontSize: 11 }}
                        onClick={stop(() => navigate(`/work-orders/${o.id}?aba=informacoes-gerais`))}
                      >
                        Vincular
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{svc}</div>
                  {o.checklistId ? (
                    <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "#EFF6FF", color: "#2563EB" }}>Checklist</span>
                    </div>
                  ) : null}
                </div>

                {/* TÉCNICO — DTO da lista não traz o NOME do técnico → "Atribuído" sem inventar iniciais;
                    sem técnico → "Atribuir" leva ao fluxo real de envio (Despachos com a OS pré-selecionada). */}
                <div>
                  {o.assignedOperatorId ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{ width: 26, height: 26, borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        aria-hidden="true"
                      >
                        <UserRound size={13} />
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Atribuído</span>
                    </div>
                  ) : !isFinalStatus(o.status) && canDispatch ? (
                    <button
                      type="button"
                      className="pat-os-assign"
                      onClick={stop(() => navigate(`/operations/dispatches?workOrderId=${o.id}`))}
                      aria-label={`Atribuir técnico à OS ${o.code}`}
                    >
                      <Send size={12} aria-hidden="true" />
                      Atribuir
                    </button>
                  ) : (
                    <span style={{ fontSize: 12.5, color: "#94A3B8" }}>Sem técnico</span>
                  )}
                </div>

                {/* AGENDA — tabular, cor por urgência real; badge de atraso preservado (aria WCAG 1.4.1) */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: agenda.color, fontWeight: agenda.weight, fontVariantNumeric: "tabular-nums" }}>{agenda.text}</span>
                  <WorkOrderDelayBadge scheduledFor={o.scheduledFor} status={o.status} />
                </div>

                {/* SITUAÇÃO — pill no tamanho BASE (junta do PR-B, MÉDIA-1: no protótipo a tabela de OS usa 10.5px/3px 9px
                    — o .pat-pill base; a variante --sm pertence às listas compactas do Dashboard, não a esta tabela). */}
                <div>
                  <StatusPill label={WORK_ORDER_STATUS_LABEL[o.status]} bg={st.bg} fg={st.fg} />
                </div>

                {/* AÇÃO — capacidade preservada: Dar andamento (gate) · Abrir · ⋮ Revogar envio (gate) */}
                <WorkOrderRowActions
                  status={o.status}
                  permissions={permissions}
                  busy={rowBusy[o.id] ?? false}
                  error={rowError[o.id] ?? null}
                  onOpen={() => navigate(`/work-orders/${o.id}`)}
                  onAdvance={() => void handleAdvance(o)}
                  onRevoke={() => void handleRevokeClick(o)}
                />
              </div>
            );
          })
        )}

        {!loading && total > 0 ? (
          <TablePager
            pageSize={pageSize}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(0);
            }}
            rangeLabel={`${start + 1}–${end} de ${total}`}
            onPrev={() => setPage(Math.max(0, effectivePage - 1))}
            onNext={() => setPage(Math.min(maxPage, effectivePage + 1))}
            canPrev={effectivePage > 0}
            canNext={end < total}
          />
        ) : null}
      </div>

      {revoke ? (
        <RevokeDispatchPrompt
          workOrderCode={revoke.workOrder.code}
          submitting={revokeBusy}
          errorMessage={revokeError}
          onConfirm={(reason) => void handleRevokeConfirm(reason)}
          onClose={() => setRevoke(null)}
        />
      ) : null}
    </div>
  );
}

export default WorkOrdersPage;
