import { ArrowDownRight, ArrowUpRight, ClipboardList, Clock, HandCoins, RefreshCw, Users, Wallet, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { DenseTable } from "../../../components/dense-list";
import type { DenseColumn } from "../../../components/dense-list/types";
import { KpiStatCard, PageHeader } from "../../../components/patterns";
import { StaleDataBanner } from "../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../work-orders/components/StatePanel";
import { CashFlowChart, ComparisonChart } from "../components/GroupPanelCharts";
import { GroupPanelOrganizationDetail } from "../components/GroupPanelOrganizationDetail";
import {
  ALL_ORGANIZATIONS,
  cashFlowFor,
  coverageNotices,
  findOrganization,
  formatCount,
  formatIndicator,
  formatMoney,
  GROUP_PANEL_INDICATORS,
  indicatorValue,
  isOrganizationFailed,
  missingReason,
  monthName,
  organizationValue,
  readingTime,
  sortOrganizations,
  variationText,
  type CoverageNotice,
  type GroupPanelIndicatorKey,
  type GroupPanelSelection,
} from "../group-panel.state";
import type { GroupPanelOrganization, GroupPanelScope, GroupPanelSummary } from "../group-panel.types";
import { useGroupPanel, useGroupPanelShortcut } from "../useGroupPanel";

// B-GRUPO-GESTOR-1b — o Painel do gestor do grupo em `/group`. Alvo de layout e conteúdo: o LOTE aprovado pelo dono
// (`docs/claude-code-handoff/screen-refs/painel-do-grupo.reference.html`, cópia de `painel/lote-gestor-grupo.html`, com os
// 8 itens ajustados e o "tudo já" — tempo de chegada e funcionários, Emenda 2 §2.4). Tela-modelo: `FinanceiroPage` e a
// aparência A dele (`PageHeader`, `KpiStatCard` que filtra, cartões `.pat-an-card`, `DenseTable` com detalhe embaixo,
// `StatePanel`, `StaleDataBanner`), no padrão D-PADRAO-BLOCOS-CLICAVEIS (`financeiro-ab.reference.html`).
//  - Todo número vem do servidor; a tela não soma nada (plano §6). Total não publicado → o bloco diz "não somado".
//  - Clicar num indicador ordena a lista por ele e troca a comparação entre pátios; o filtro aparece acima da lista e
//    sai com um clique. Clicar numa barra, ou escolher no seletor, mostra um pátio só. Clicar na linha abre o detalhe.
//  - Estados §7: carregando, vazio (1 pátio ou nenhum), erro, acesso não permitido, dados desatualizados; mais a faixa
//    de cobertura e o pátio em erro sem número (E3.2 §14, K1).

type IndicatorSpec = {
  readonly key: GroupPanelIndicatorKey;
  readonly icon: LucideIcon;
  readonly iconColor: string;
  readonly iconBg: string;
};

const INDICATOR_STYLE: readonly IndicatorSpec[] = [
  { key: "receber", icon: HandCoins, iconColor: "#2563EB", iconBg: "#EFF6FF" },
  { key: "recebido", icon: ArrowUpRight, iconColor: "#15803D", iconBg: "#DCFCE7" },
  { key: "pagar", icon: Wallet, iconColor: "#B45309", iconBg: "#FFFBEB" },
  { key: "pago", icon: ArrowDownRight, iconColor: "#B91C1C", iconBg: "#FEF2F2" },
  { key: "caixa", icon: Wallet, iconColor: "#7C3AED", iconBg: "#F5F3FF" },
  { key: "chamados", icon: ClipboardList, iconColor: "#2563EB", iconBg: "#EFF6FF" },
  { key: "chegada", icon: Clock, iconColor: "#0E7490", iconBg: "#ECFEFF" },
  { key: "funcionarios", icon: Users, iconColor: "#475569", iconBg: "#F1F5F9" },
];

const NOTICE_STYLE: Readonly<Record<CoverageNotice["tone"], { readonly className: string; readonly style?: CSSProperties }>> = {
  info: { className: "pat-banner", style: { background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF" } },
  warning: { className: "pat-banner pat-banner--warning" },
  error: { className: "pat-banner pat-banner--error" },
};

const HEADER = { kicker: "FINANCEIRO", title: "Painel do grupo" } as const;

function labelOf(key: GroupPanelIndicatorKey): string {
  return GROUP_PANEL_INDICATORS.find((indicator) => indicator.key === key)?.label ?? key;
}

export function GroupPanelPage() {
  const { state, refreshing, refresh } = useGroupPanel();
  const shortcut = useGroupPanelShortcut();

  if (state.status === "loading") return <LoadingView />;
  if (state.status === "forbidden") {
    return (
      <div style={{ color: "#0F172A" }}>
        <PageHeader kicker={HEADER.kicker} title={HEADER.title} />
        <StatePanel
          tone="forbidden"
          title={state.reason === "not_group_manager" ? "Só o gestor do grupo abre este painel" : "Acesso não permitido"}
          detail={
            state.reason === "not_group_manager"
              ? "A marca de gestor do grupo é dada pela plataforma. Se você cuida dos pátios deste grupo, peça a marca ao administrador da plataforma."
              : "Seu perfil nesta organização não pode ver o Painel do grupo."
          }
        />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div style={{ color: "#0F172A" }}>
        <PageHeader kicker={HEADER.kicker} title={HEADER.title} />
        <StatePanel tone="error" title="Não foi possível carregar o Painel do grupo" detail={state.message} actions={<StatePanelAction label="Tentar novamente" onClick={refresh} />} />
      </div>
    );
  }
  if (state.status === "empty") {
    const count = state.summary?.organizations.length ?? 0;
    return (
      <div style={{ color: "#0F172A" }}>
        <PageHeader kicker={HEADER.kicker} title={HEADER.title} />
        <StatePanel
          tone="empty"
          title="Ainda não há pátios para somar"
          detail={`O Painel do grupo mostra a soma quando você tem conta em dois ou mais pátios do grupo. Hoje você vê ${count === 1 ? "1 pátio" : "nenhum pátio"}.`}
          actions={<StatePanelAction label="Atualizar" variant="secondary" onClick={refresh} />}
        />
      </div>
    );
  }

  return (
    <ReadyView
      summary={state.summary}
      scope={state.scope}
      stale={state.stale}
      lastGoodAt={state.lastGoodAt}
      refreshing={refreshing}
      onRefresh={refresh}
      shortcut={shortcut}
    />
  );
}

function LoadingView() {
  return (
    <div style={{ color: "#0F172A" }} aria-busy="true" aria-label="Carregando o Painel do grupo">
      <PageHeader kicker={HEADER.kicker} title={HEADER.title} subtitle="Lendo os pátios do grupo…" />
      <div className="pat-kpi-row pat-kpi-row--4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="pat-kpi" aria-hidden="true">
            <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
            <div className="pat-skel" style={{ width: "70%", height: 22, marginTop: 12 }} />
            <div className="pat-skel" style={{ width: "50%", height: 11, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="pat-table" aria-hidden="true" style={{ padding: 16 }}>
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} style={{ display: "flex", gap: 16, padding: "12px 0" }}>
            <span className="pat-skel" style={{ width: "24%", height: 12 }} />
            {Array.from({ length: 6 }).map((__, col) => (
              <span key={col} className="pat-skel" style={{ width: "10%", height: 12 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadyView({
  summary,
  scope,
  stale,
  lastGoodAt,
  refreshing,
  onRefresh,
  shortcut,
}: {
  readonly summary: GroupPanelSummary;
  readonly scope: GroupPanelScope | null;
  readonly stale: boolean;
  readonly lastGoodAt: string;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
  readonly shortcut: ReturnType<typeof useGroupPanelShortcut>;
}) {
  const [selection, setSelection] = useState<GroupPanelSelection>(ALL_ORGANIZATIONS);
  const [sortKey, setSortKey] = useState<GroupPanelIndicatorKey | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const selected = findOrganization(summary, selection);
  const effectiveSelection = selected ? selected.id : ALL_ORGANIZATIONS;
  const scopeLabel = selected ? selected.name : "todos os pátios";
  const comparisonKey: GroupPanelIndicatorKey = sortKey ?? "recebido";
  const total = summary.organizations.length;
  const at = readingTime(summary.generatedAt);

  const selectOrganization = (id: GroupPanelSelection) => {
    setSelection(id);
    setOpenId(id === ALL_ORGANIZATIONS ? null : id);
  };
  const toggleSort = (key: GroupPanelIndicatorKey) => {
    setSortKey((current) => (current === key ? null : key));
    setOpenId(null);
  };

  const header = (
    <PageHeader
      kicker={HEADER.kicker}
      title={HEADER.title}
      subtitle={`Você vê ${total} ${total === 1 ? "pátio" : "pátios"}${summary.coverage.withoutAccess.length > 0 ? ` · ${summary.coverage.withoutAccess.length} sem acesso ao Financeiro` : ""}${at ? ` · leitura às ${at}` : ""}`}
      actions={
        <>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "#64748B" }}>
            Ver
            <select className="pat-select" value={effectiveSelection} onChange={(event) => selectOrganization(event.currentTarget.value)} aria-label="Ver todos os pátios ou um pátio só">
              <option value={ALL_ORGANIZATIONS}>Todos os pátios</option>
              {[...summary.organizations]
                .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
                .map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
            </select>
          </label>
          <button type="button" className="pat-btn" onClick={onRefresh} disabled={refreshing} aria-busy={refreshing || undefined}>
            <RefreshCw size={14} aria-hidden="true" />
            {refreshing ? "Atualizando…" : "Atualizar"}
          </button>
        </>
      }
    />
  );

  const notices = coverageNotices(summary, scope);
  const rows = sortOrganizations(summary, sortKey).filter((organization) => !selected || organization.id === selected.id);

  return (
    <div style={{ color: "#0F172A" }}>
      {header}
      {stale ? <StaleDataBanner lastUpdatedAt={lastGoodAt} onRetry={onRefresh} /> : null}
      <div data-state="cobertura" style={{ display: "grid", gap: 0 }}>
        {notices.map((notice) => (
          <div key={notice.text} className={NOTICE_STYLE[notice.tone].className} style={NOTICE_STYLE[notice.tone].style} role={notice.tone === "error" ? "alert" : "status"}>
            {notice.text}
          </div>
        ))}
      </div>

      <Indicators summary={summary} selected={selected} sortKey={sortKey} onToggle={toggleSort} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
        <article className="pat-an-card">
          <div className="pat-an-card__title">
            <span>Recebido × pago, últimos 6 meses</span>
            <small>{selected ? selected.name : "grupo"}</small>
          </div>
          <CashFlowChart
            points={cashFlowFor(summary, effectiveSelection)}
            scopeLabel={scopeLabel}
            emptyLabel={!selected && summary.consolidated === null ? "O total do grupo não foi somado nesta leitura. Escolha um pátio para ver os 6 meses dele." : "Sem lançamentos no período."}
          />
        </article>
        <article className="pat-an-card">
          <div className="pat-an-card__title">
            <span>{`${labelOf(comparisonKey)}, por pátio`}</span>
            <small>clique numa barra para ver só o pátio</small>
          </div>
          <ComparisonChart
            summary={summary}
            indicator={comparisonKey}
            selectedId={selected?.id ?? null}
            onSelect={(organization) => selectOrganization(selected?.id === organization.id ? ALL_ORGANIZATIONS : organization.id)}
          />
        </article>
      </div>

      <div className="pat-table">
        <div className="pat-table__topbar">
          <span style={{ fontSize: 13, fontWeight: 800 }}>Pátios do grupo</span>
          <span className="pat-table__count">{`${rows.length} de ${total} ${total === 1 ? "pátio" : "pátios"}`}</span>
        </div>
        {sortKey || selected ? (
          <div className="pat-filtro-chip-bar" style={{ gap: 8, flexWrap: "wrap" }}>
            {sortKey ? (
              <span className="pat-filtro-chip">
                {`Ordenado por: ${labelOf(sortKey)}`}
                <button type="button" onClick={() => setSortKey(null)} aria-label={`Tirar a ordem por ${labelOf(sortKey)}`}>
                  ✕
                </button>
              </span>
            ) : null}
            {selected ? (
              <span className="pat-filtro-chip">
                {`Pátio: ${selected.name}`}
                <button type="button" onClick={() => selectOrganization(ALL_ORGANIZATIONS)} aria-label="Voltar a todos os pátios">
                  ✕
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
        <DenseTable<GroupPanelOrganization>
          columns={columnsFor(summary)}
          rows={rows}
          keyForRow={(organization) => organization.id}
          sort={sortKey ? { key: sortKey, dir: sortKey === "chegada" ? "asc" : "desc" } : null}
          onSort={(key) => toggleSort(key as GroupPanelIndicatorKey)}
          onRowClick={(organization) => setOpenId((current) => (current === organization.id ? null : organization.id))}
          expandedKey={openId}
          cellTitle={(organization, key) => cellTitle(summary, organization, key)}
          renderDetail={(organization) => (
            <GroupPanelOrganizationDetail
              organization={organization}
              coverage={summary.coverage}
              busy={shortcut.busyId === organization.id}
              message={shortcut.message?.organizationId === organization.id ? shortcut.message.text : null}
              onShortcut={(target, destination) => void shortcut.open(target.id, destination)}
            />
          )}
        />
      </div>
      <p className="pat-cell-muted" style={{ fontSize: 11.5, marginTop: 10 }}>
        Clique num indicador para ordenar a lista por ele, e numa linha para abrir o detalhe do pátio logo abaixo. A receber, a pagar e o caixa são a posição de hoje; o recebido, o pago e os chamados são do mês corrente.
      </p>
    </div>
  );
}

function Indicators({
  summary,
  selected,
  sortKey,
  onToggle,
}: {
  readonly summary: GroupPanelSummary;
  readonly selected: GroupPanelOrganization | null;
  readonly sortKey: GroupPanelIndicatorKey | null;
  readonly onToggle: (key: GroupPanelIndicatorKey) => void;
}) {
  const selection = selected ? selected.id : ALL_ORGANIZATIONS;
  const failed = selected ? isOrganizationFailed(selected, summary.coverage) : false;
  const consolidated = summary.consolidated;
  const finance = selected ? (!failed && selected.finance.status === "ok" ? selected.finance.summary : null) : null;
  const operations = selected ? (!failed && selected.operations.status === "ok" ? selected.operations.summary : null) : consolidated?.operations ?? null;
  const staff = selected ? (!failed && selected.staff.status === "ok" ? selected.staff.summary : null) : consolidated?.staff ?? null;
  const competencia = selected ? (finance?.settledThisMonth.competencia ?? "") : (consolidated?.finance.competencia ?? "");
  const mes = competencia ? monthName(competencia) : "o mês";

  const hintFor = (key: GroupPanelIndicatorKey): string => {
    const value = indicatorValue(summary, selection, key);
    if (value === null) {
      if (!selected) return "total não somado nesta leitura";
      return missingReason(selected, summary.coverage, key) || "sem número";
    }
    switch (key) {
      case "receber":
        return `hoje · ${formatMoney(selected ? (finance?.receivable.overdueAmount ?? null) : (consolidated?.finance.receivableOverdue ?? null))} vencidos`;
      case "pagar":
        return `hoje · ${formatMoney(selected ? (finance?.payable.overdueAmount ?? null) : (consolidated?.finance.payableOverdue ?? null))} vencidos`;
      case "recebido":
        return variationText(selected ? selected.finance.receivedVariationPct : (consolidated?.finance.receivedVariationPct ?? null), competencia);
      case "pago":
        return variationText(selected ? selected.finance.paidVariationPct : (consolidated?.finance.paidVariationPct ?? null), competencia);
      case "caixa":
        return selected
          ? `hoje · ${formatCount(finance?.cash.accountCount ?? null)} ${finance?.cash.accountCount === 1 ? "conta" : "contas"}`
          : `hoje · soma de ${summary.coverage.included} ${summary.coverage.included === 1 ? "pátio" : "pátios"}`;
      case "chamados": {
        const rate = operations?.completionRatePct ?? null;
        const share = !selected && consolidated && consolidated.operations.included < summary.organizations.length ? ` · de ${consolidated.operations.included} pátios` : "";
        return `${rate === null ? "sem chamado concluído" : `${rate}% concluídos`}${share}`;
      }
      case "chegada":
        return `média de ${formatCount(operations?.arrivalCount ?? null)} chamados · ${formatCount(operations?.arrivalMissingCount ?? null)} sem chegada registrada`;
      case "funcionarios":
        return `${formatCount(staff?.inServiceNow ?? null)} em atendimento agora`;
    }
  };

  return (
    <div className="pat-kpi-row pat-kpi-row--4" data-scope={selected ? "patio" : "grupo"}>
      {INDICATOR_STYLE.map((spec) => {
        const label = spec.key === "recebido" && competencia ? `Recebido em ${mes}` : spec.key === "pago" && competencia ? `Pago em ${mes}` : labelOf(spec.key);
        const value = indicatorValue(summary, selection, spec.key);
        // Lote item 7: sem total publicado, o grupo diz "incompleto" em vez de mostrar um número errado.
        const shown = value === null ? (selected ? "—" : "Incompleto") : formatIndicator(spec.key, value);
        const shownNode = value === null ? <span style={{ color: "#94A3B8", fontSize: 20 }}>{shown}</span> : shown;
        const hint = hintFor(spec.key);
        return (
          <KpiStatCard
            key={spec.key}
            icon={spec.icon}
            iconColor={spec.iconColor}
            iconBg={spec.iconBg}
            value={shownNode}
            label={label}
            hint={hint}
            border={spec.key === "receber" && sortKey !== spec.key && value !== null && (selected ? (finance?.receivable.overdueAmount ?? 0) > 0 : (consolidated?.finance.receivableOverdue ?? 0) > 0) ? "#FCA5A5" : undefined}
            pressed={sortKey === spec.key}
            onClick={() => onToggle(spec.key)}
            ariaLabel={`${label}: ${value === null ? "sem número" : shown} — ordenar a lista de pátios por este indicador`}
          />
        );
      })}
    </div>
  );
}

function cellContent(summary: GroupPanelSummary, organization: GroupPanelOrganization, key: GroupPanelIndicatorKey) {
  const value = organizationValue(organization, summary.coverage, key);
  if (value !== null) return formatIndicator(key, value);
  return <span className="pat-cell-muted">{missingReason(organization, summary.coverage, key) || "—"}</span>;
}

function cellTitle(summary: GroupPanelSummary, organization: GroupPanelOrganization, key: string): string | undefined {
  if (key === "patio") return organization.name;
  const indicator = GROUP_PANEL_INDICATORS.find((item) => item.key === key);
  if (!indicator) return undefined;
  const value = organizationValue(organization, summary.coverage, indicator.key);
  return value === null ? missingReason(organization, summary.coverage, indicator.key) || undefined : formatIndicator(indicator.key, value);
}

function columnsFor(summary: GroupPanelSummary): DenseColumn<GroupPanelOrganization>[] {
  const money = (key: GroupPanelIndicatorKey, header: string): DenseColumn<GroupPanelOrganization> => ({
    key,
    header,
    align: "right",
    tabular: true,
    sortable: true,
    render: (organization) => cellContent(summary, organization, key),
  });
  return [
    {
      key: "patio",
      header: "PÁTIO",
      width: "20%",
      render: (organization) => (
        <span style={{ fontWeight: 700, color: "#0F172A" }}>
          {organization.name}
          {isOrganizationFailed(organization, summary.coverage) ? (
            <span className="pat-cell-muted" style={{ fontWeight: 600, marginLeft: 8, color: "#B91C1C" }}>
              erro na leitura
            </span>
          ) : null}
        </span>
      ),
    },
    money("receber", "A RECEBER"),
    money("recebido", "RECEBIDO"),
    money("pagar", "A PAGAR"),
    money("caixa", "CAIXA"),
    { ...money("chamados", "CHAMADOS"), width: "9%" },
    { ...money("chegada", "CHEGADA"), width: "10%" },
    { ...money("funcionarios", "FUNCIONÁRIOS"), width: "11%" },
  ];
}

export default GroupPanelPage;
