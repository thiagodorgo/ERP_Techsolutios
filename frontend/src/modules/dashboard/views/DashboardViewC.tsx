import { AlertTriangle, ArrowRight, FileCheck, LayoutGrid, Map as MapIcon, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "../../../components/patterns";
import { entityTypeLabel } from "../../work-orders/approval.types";
import type { CriticalQueueItem, CriticalQueueKind } from "../dashboard.adapter";
import { ACTIVE_DISPATCH_STATUSES, dispatchStatusMeta, fieldStatusMeta, relativeTimeFrom } from "../dashboard.adapter";
import {
  agendaCountdown,
  agendaText,
  BlockEmpty,
  BlockForbidden,
  BlockRow,
  BlockTable,
  buildPriorityQueue,
  clock,
  DashHeader,
  DashStatusStrip,
  FilterChip,
  groupRecentEvents,
  KpiPanel,
  PriorityText,
  QUEUE_KIND,
  queueWorkOrderId,
  REGISTRY,
  RowField,
  SkeletonRows,
  statusPill,
  SummaryFailure,
  TONE,
  VolumeBars,
  volumeBody,
} from "./dashboard.shared";
import type { DashboardState, DashboardViewModel } from "./dashboard.view-model";

// B-APAR-DASH — APARÊNCIA C "Central de prioridades" (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`,
// `renderC`/`railC`/`linhaFila`): o que pede decisão agora numa FILA ÚNICA, pela ordem de `buildCriticalQueue` (1 OS
// atrasada · 2 OS prioritária · 3 operador sem sinal · 4 aprovação pendente · 5 OS sem operador; uma entidade aparece uma
// vez), com blocos que filtram a fila; e, ao lado, a coluna fixa com o "Resumo do dia" (os 5 números, que abrem o detalhe
// do cartão), o volume de 14 dias (recorte da MESMA série de 30) e o "Agora" (campo, despachos, eventos). O selo de tipo
// é o `StatusPill` da biblioteca, com o ponto da cor do tipo (o plano mandou medir antes de criar componente: ele serve).
// Sem `work_orders:read` (Suporte) a fila tem só as atrasadas e as prioritárias que o agregado manda. VIEW PURA.

type BlockKey = "todas" | CriticalQueueKind;

const BLOCKS: readonly { readonly key: BlockKey; readonly label: string; readonly icon: LucideIcon; readonly fg: string; readonly bg: string }[] = [
  { key: "todas", label: "Todas as prioridades", icon: LayoutGrid, fg: "#2563EB", bg: "#EFF6FF" },
  { key: "os_atrasada", label: "Atrasadas", icon: AlertTriangle, fg: "#B91C1C", bg: "#FEF2F2" },
  { key: "os_prioritaria", label: "Prioridade alta/urgente", icon: AlertTriangle, fg: "#B45309", bg: "#FFFBEB" },
  { key: "campo_sem_sinal", label: "Sem sinal recente", icon: WifiOff, fg: "#B45309", bg: "#FFFBEB" },
  { key: "aprovacao_pendente", label: "Pendentes de aprovação", icon: FileCheck, fg: "#7E22CE", bg: "#FAF5FF" },
];

/** Rótulo do selo de tipo: "Urgente" quando a OS prioritária é urgente (o `severity` crítico), como a referência. */
export function queueTypeLabel(item: CriticalQueueItem): string {
  return item.kind === "os_prioritaria" && item.severity === "critical" ? "Urgente" : QUEUE_KIND[item.kind].label;
}

/** Blocos que o perfil tem fonte para contar (sem a fonte, o bloco não aparece — nunca um zero inventado). */
function availableBlocks(model: DashboardViewModel) {
  return BLOCKS.filter((block) => {
    if (block.key === "campo_sem_sinal") return model.access.readLocations && model.locations.status === "ready";
    if (block.key === "aprovacao_pendente") return model.access.readApprovals && model.approvals?.status === "ready";
    return true;
  });
}

function QueueDetail({ model, item }: { readonly model: DashboardViewModel; readonly item: CriticalQueueItem }) {
  const workOrderId = queueWorkOrderId(item);
  if (workOrderId) {
    const order = model.summary.critical.find((entry) => entry.id === workOrderId);
    const countdown = order ? agendaCountdown(order.scheduledFor, model.now) : null;
    return (
      <>
        <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
          <div className="pat-ab-detail-col">
            <RowField label="OS">
              <span className="pat-mono">{order?.code ?? item.title.split(" · ")[0]}</span>
            </RowField>
            <RowField label="Cliente">{order ? (order.customerName ?? "Sem cliente vinculado") : "—"}</RowField>
            <RowField label="Serviço">{order?.title ?? "—"}</RowField>
          </div>
          <div className="pat-ab-detail-col">
            <RowField label="Agenda">{order && countdown ? <b style={{ color: countdown.color }}>{agendaText(order.scheduledFor, model.now)}</b> : "—"}</RowField>
            <RowField label="Prioridade">{order ? <PriorityText priority={order.priority} label={order.priorityLabel} /> : "—"}</RowField>
            <RowField label="Situação">{statusPill(item.statusLabel, item.tone)}</RowField>
          </div>
        </div>
        <div className="pat-ab-detail-actions">
          {model.access.readWorkOrders ? (
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onOpenWorkOrder(workOrderId)}>
              <ArrowRight size={14} aria-hidden="true" />
              Abrir OS
            </button>
          ) : (
            <span className="pat-ab-detail-note">Seu perfil vê esta OS no painel, mas não abre ordens de serviço.</span>
          )}
          {model.access.readWorkOrders && model.access.readLocations ? (
            <button type="button" className="pat-btn" onClick={() => model.onNavigate("/operations/map")}>
              <MapIcon size={14} aria-hidden="true" />
              Abrir mapa
            </button>
          ) : null}
        </div>
      </>
    );
  }
  if (item.kind === "campo_sem_sinal") {
    const location = model.locations.items.find((entry) => `stale-${entry.id}` === item.id);
    const os = location?.currentWorkOrder ?? null;
    return (
      <>
        <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
          <div className="pat-ab-detail-col">
            <RowField label="Operador">{location ? [location.displayName || location.operatorName || "Operador de campo", location.teamName].filter(Boolean).join(" · ") : item.title}</RowField>
            <RowField label="OS atual">{os ? `${os.code} · ${os.title}` : "nenhuma"}</RowField>
          </div>
          <div className="pat-ab-detail-col">
            <RowField label="Última posição">
              {location
                ? `${relativeTimeFrom(location.capturedAt, model.now) || "—"} · ${clock(location.capturedAt)}${typeof location.accuracyMeters === "number" ? ` · precisão ${Math.round(location.accuracyMeters)} m` : ""}`
                : "—"}
            </RowField>
            <RowField label="Bateria">{location && typeof location.batteryLevel === "number" ? `${Math.round(location.batteryLevel)}% na última posição` : "—"}</RowField>
          </div>
        </div>
        <div className="pat-ab-detail-actions">
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onNavigate("/operations/map")}>
            <MapIcon size={14} aria-hidden="true" />
            Abrir mapa
          </button>
          {os && model.access.readWorkOrders ? (
            <button type="button" className="pat-btn" onClick={() => model.onOpenWorkOrder(os.id)}>
              <ArrowRight size={14} aria-hidden="true" />
              Abrir OS
            </button>
          ) : null}
        </div>
      </>
    );
  }
  // Aprovação pendente.
  const approval = model.approvals?.items.find((entry) => `approval-${entry.id}` === item.id);
  return (
    <>
      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
        <div className="pat-ab-detail-col">
          <RowField label="Entidade">{approval ? entityTypeLabel(approval.entityType) : "—"}</RowField>
          <RowField label="Pendência">{item.description}</RowField>
        </div>
        <div className="pat-ab-detail-col">
          <RowField label="Solicitado em">{approval ? `${clock(approval.requestedAt)} · ${relativeTimeFrom(approval.requestedAt, model.now) || "—"}` : "—"}</RowField>
        </div>
      </div>
      <div className="pat-ab-detail-actions">
        {model.access.readWorkOrders ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onNavigate(item.action.to)}>
            <FileCheck size={14} aria-hidden="true" />
            {item.action.label}
          </button>
        ) : null}
      </div>
    </>
  );
}

/** Chave da linha da fila: o código da OS para os itens de OS (o id interno nunca vai ao HTML); o id do registro para os demais. */
function queueRowKey(model: DashboardViewModel, item: CriticalQueueItem): string {
  const workOrderId = queueWorkOrderId(item);
  const code = workOrderId ? model.summary.critical.find((order) => order.id === workOrderId)?.code : null;
  return code ? `fila:${item.kind}:${code}` : `fila:${item.id}`;
}

function QueueRows({ model, items }: { readonly model: DashboardViewModel; readonly items: readonly CriticalQueueItem[] }) {
  return (
    <>
      {items.map((item) => {
        const kind = QUEUE_KIND[item.kind];
        const tone = TONE[kind.tone];
        const situation =
          item.kind === "campo_sem_sinal" ? statusPill("Sem sinal recente", "warning") : item.kind === "aprovacao_pendente" ? statusPill("Aguardando decisão", "accent") : statusPill(item.statusLabel, item.tone);
        return (
          <BlockRow
            key={item.id}
            model={model}
            rowKey={queueRowKey(model, item)}
            colSpan={4}
            cells={[
              { key: "tipo", content: <StatusPill label={queueTypeLabel(item)} bg={tone.bg} fg={tone.fg} dot={tone.dot} sm /> },
              {
                key: "item",
                title: `${item.title} · ${item.description}`,
                content: (
                  <>
                    <span className="apardash-cel-main">{item.title}</span>
                    <span className="apardash-cel-meta">{item.description}</span>
                  </>
                ),
              },
              { key: "situacao", content: situation, className: "apardash-right" },
            ]}
            detail={() => <QueueDetail model={model} item={item} />}
          />
        );
      })}
    </>
  );
}

function RailItems({ model }: { readonly model: DashboardViewModel }) {
  const { state } = model;
  if (state.rail === "campo") {
    const { locations } = model;
    if (!model.access.readLocations || locations.status === "forbidden") return <BlockForbidden>Seu perfil não vê a localização.</BlockForbidden>;
    if (locations.status === "loading") return <SkeletonRows cols={2} />;
    if (locations.status === "error") return <BlockEmpty state="error">Não foi possível carregar as localizações.</BlockEmpty>;
    if (locations.items.length === 0) return <BlockEmpty>Nenhum operador com localização recente.</BlockEmpty>;
    return (
      <>
        {locations.items.map((location) => {
          const meta = fieldStatusMeta(location);
          const name = location.displayName || location.operatorName || "Operador de campo";
          const os = location.currentWorkOrder;
          return (
            <button key={location.id} type="button" className="apardash-rail-item" onClick={() => model.onNavigate("/operations/map")} aria-label={`${name} · ${meta.label} — abrir mapa`}>
              <span className="apardash-rail-item__av" style={{ background: TONE[meta.tone].bg, color: TONE[meta.tone].fg }} aria-hidden="true">
                {initials(name)}
              </span>
              <span className="apardash-rail-item__txt">
                <span className="apardash-rail-item__t">{name}</span>
                <span className="apardash-rail-item__m">{os ? `${os.code} · ${os.title}` : `atualizado ${relativeTimeFrom(location.capturedAt, model.now) || "—"}`}</span>
              </span>
              <span className="apardash-rail-item__r" style={{ color: TONE[meta.tone].fg }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </>
    );
  }
  if (state.rail === "desp") {
    const { dispatches } = model;
    if (!model.access.readDispatches || dispatches.status === "forbidden") return <BlockForbidden>Seu perfil não acompanha despachos.</BlockForbidden>;
    if (dispatches.status === "loading") return <SkeletonRows cols={2} />;
    if (dispatches.status === "error") return <BlockEmpty state="error">Não foi possível carregar os despachos.</BlockEmpty>;
    // Mesma regra de `deriveActiveDispatchRows`: situação não terminal, ou desconhecida (tolerada).
    const active = dispatches.items.filter((dispatch) => ACTIVE_DISPATCH_STATUSES.has(dispatch.status) || dispatchStatusMeta(dispatch.status).label === "Status desconhecido");
    if (active.length === 0) return <BlockEmpty>Nenhum despacho ativo no momento.</BlockEmpty>;
    return (
      <>
        {active.map((dispatch) => {
          const meta = dispatchStatusMeta(dispatch.status);
          const title = `${dispatch.workOrderCode ?? "Despacho"} · ${dispatch.workOrderTitle ?? dispatch.observation ?? "Sem descrição"}`;
          const open = () => (model.access.readWorkOrders ? model.onOpenWorkOrder(dispatch.workOrderId) : model.onNavigate("/operations/dispatches"));
          return (
            <button key={dispatch.id} type="button" className="apardash-rail-item" onClick={open} aria-label={`${title} · ${meta.label} — ${model.access.readWorkOrders ? "abrir OS" : "abrir despachos"}`}>
              <span className="pat-dash-dot" style={{ background: TONE[meta.tone].dot }} aria-hidden="true" />
              <span className="apardash-rail-item__txt">
                <span className="apardash-rail-item__t">{title}</span>
                <span className="apardash-rail-item__m">{relativeTimeFrom(dispatch.updatedAt ?? dispatch.createdAt, model.now) || "—"}</span>
              </span>
              <span className="apardash-rail-item__r" style={{ color: TONE[meta.tone].fg }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </>
    );
  }
  const { summary } = model;
  if (summary.status === "loading") return <SkeletonRows cols={2} />;
  if (summary.status !== "ready") return <BlockEmpty state="error">Não foi possível carregar os eventos recentes.</BlockEmpty>;
  const groups = groupRecentEvents(summary.events);
  if (groups.length === 0) return <BlockEmpty>Sem atividade recente.</BlockEmpty>;
  return (
    <>
      {groups.map((group) => {
        const workOrderId = group.items[0].workOrderId;
        const inner: ReactNode = (
          <>
            <span className="pat-dash-dot" style={{ background: TONE[group.tone].dot }} aria-hidden="true" />
            <span className="apardash-rail-item__txt">
              <span className="apardash-rail-item__t">{group.items.length > 1 ? `${group.label} · ${group.items.length} eventos` : group.label}</span>
              <span className="apardash-rail-item__m">{group.message}</span>
            </span>
            <span className="apardash-rail-item__r apardash-rail-item__r--ago">{relativeTimeFrom(group.items[0].createdAt, model.now) || "—"}</span>
          </>
        );
        // Sem `work_orders:read` o evento é só leitura (nada de botão morto).
        return model.access.readWorkOrders && workOrderId ? (
          <button key={group.id} type="button" className="apardash-rail-item" onClick={() => model.onOpenWorkOrder(workOrderId)} aria-label={`${group.label} · ${group.message} — abrir OS`}>
            {inner}
          </button>
        ) : (
          <div key={group.id} className="apardash-rail-item apardash-rail-item--static">
            {inner}
          </div>
        );
      })}
    </>
  );
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function Rail({ model }: { readonly model: DashboardViewModel }) {
  const { summary, state } = model;
  if (summary.status === "loading") {
    return (
      <aside className="apardash-c-rail" aria-label="Resumo e campo" data-state="loading">
        <section className="pat-card">
          <span className="pat-skel" style={{ display: "block", height: 180 }} />
        </section>
      </aside>
    );
  }
  if (summary.status !== "ready") {
    return (
      <aside className="apardash-c-rail" aria-label="Resumo e campo">
        <section className="pat-card">
          <h2 className="pat-card__title">Resumo</h2>
          <BlockEmpty state="error">Indicadores indisponíveis no momento.</BlockEmpty>
        </section>
      </aside>
    );
  }
  const byId = new Map(summary.kpis.map((kpi) => [kpi.id, kpi]));
  const overdue = Number(byId.get("overdue")?.value ?? 0);
  const toggleTile = (key: string): DashboardState => {
    const opening = state.cartao !== key;
    // "Atrasadas" filtra a fila pelo bloco de atrasadas (referência); fechá-lo devolve a fila inteira.
    const bloco = opening && key === "overdue" ? "os_atrasada" : state.cartao === "overdue" && state.bloco === "os_atrasada" ? "todas" : state.bloco;
    return { ...state, cartao: opening ? key : null, bloco, linha: null };
  };
  const tile = (key: string, full = false) => {
    const kpi = byId.get(key);
    if (!kpi) return null;
    return (
      <button
        key={key}
        type="button"
        className={full ? "apardash-c-kpi apardash-c-kpi--full" : "apardash-c-kpi"}
        aria-pressed={state.cartao === key}
        aria-label={`${kpi.label}: ${kpi.value} — ver detalhes`}
        onClick={() => model.onState(toggleTile(key))}
      >
        <b style={{ color: key === "overdue" && overdue > 0 ? "#B91C1C" : "#0F172A" }}>{kpi.value}</b>
        <span>{kpi.label}</span>
      </button>
    );
  };
  const days = model.series.items.slice(-14);
  const tabs: readonly { readonly key: DashboardState["rail"]; readonly label: string }[] = [
    { key: "campo", label: "Campo" },
    { key: "desp", label: "Despachos" },
    { key: "evt", label: "Eventos" },
  ];
  return (
    <aside className="apardash-c-rail" aria-label="Resumo e campo">
      <section className="pat-card apardash-c-card">
        <div className="pat-card__head">
          <h2 className="pat-card__title">Resumo do dia</h2>
          <span className="pat-card__subtitle" style={{ margin: 0 }}>
            recarrega sozinho
          </span>
        </div>
        <div className="apardash-c-kpis">
          {tile("open")}
          {tile("in_progress")}
          {tile("overdue")}
          {tile("created_today")}
          {tile("completed", true)}
        </div>
        {/* Na C só "Atrasadas" filtra a fila (pelo bloco); os demais números só explicam. */}
        <KpiPanel model={model} rail filterText={state.cartao === "overdue" && state.bloco === "os_atrasada" ? "A fila está filtrada por “Atrasadas”." : undefined} />
        <div className="apardash-c-cads">
          {REGISTRY.flatMap((entry) => {
            const kpi = byId.get(entry.id);
            return kpi
              ? [
                  <span key={entry.id}>
                    <b>{kpi.value}</b> {entry.label}
                  </span>,
                ]
              : [];
          })}
        </div>
      </section>
      <section className="pat-card apardash-c-card">
        <div className="pat-dash-chart-head" style={{ marginBottom: 10 }}>
          <div>
            <h2 className="pat-card__title">Volume · 14 dias</h2>
            <div className="pat-card__subtitle">abertas, concluídas e canceladas</div>
          </div>
        </div>
        {volumeBody(model, days, () => <VolumeBars points={days} compact />)}
      </section>
      <section className="pat-card apardash-c-card">
        <div className="pat-card__head">
          <h2 className="pat-card__title">Agora</h2>
        </div>
        <div className="pat-os-tabs" role="group" aria-label="O que mostrar" style={{ marginTop: 6 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={state.rail === tab.key ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
              aria-pressed={state.rail === tab.key}
              onClick={() => model.onState({ ...state, rail: tab.key })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="apardash-rail-lista">
          <RailItems model={model} />
        </div>
      </section>
    </aside>
  );
}

export function DashboardViewC(model: DashboardViewModel) {
  const header = <DashHeader model={model} kicker="VISÃO GERAL · CENTRAL DE PRIORIDADES" subtitle="O que pede decisão agora, numa fila só — e o resumo do dia ao lado" />;
  if (model.summary.status === "forbidden") {
    return (
      <div data-aparencia="C" className="apardash apardash--c">
        {header}
        <SummaryFailure model={model} />
      </div>
    );
  }
  const { state } = model;
  const blocks = availableBlocks(model);
  const bloco: BlockKey = blocks.some((block) => block.key === state.bloco) ? (state.bloco as BlockKey) : "todas";

  let blocksNode: ReactNode = null;
  let body: ReactNode;
  let count = "";
  let universe: ReactNode = null;
  if (model.summary.status === "loading") {
    blocksNode = (
      <div className="apardash-c-blocos" data-state="loading" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="apardash-bloco-c">
            <span className="pat-skel" style={{ width: 30, height: 30 }} />
            <span className="pat-skel" style={{ width: "60%", height: 12 }} />
          </div>
        ))}
      </div>
    );
    body = <SkeletonRows cols={4} rows={5} />;
  } else if (model.summary.status === "error") {
    body = (
      <div className="apardash-lista-vazia" data-state="error">
        <b>Não foi possível carregar a fila de prioridades</b>
        <span>
          Tentaremos novamente na próxima atualização —{" "}
          <button type="button" className="pat-link" onClick={model.onRetry}>
            Tentar novamente
          </button>
        </span>
      </div>
    );
  } else {
    const queue = buildPriorityQueue(model).items;
    const visible = bloco === "todas" ? queue : queue.filter((item) => item.kind === bloco);
    count = `${visible.length !== queue.length ? `${visible.length} de ` : ""}${queue.length} ${queue.length === 1 ? "item" : "itens"}`;
    blocksNode = (
      <div className="apardash-c-blocos">
        {blocks.map((block) => {
          const n = block.key === "todas" ? queue.length : queue.filter((item) => item.kind === block.key).length;
          const Icon = block.icon;
          return (
            <button
              key={block.key}
              type="button"
              className="apardash-bloco-c"
              aria-pressed={bloco === block.key}
              aria-label={`${block.label}: ${n} — filtrar a fila`}
              onClick={() => {
                const next = bloco === block.key || block.key === "todas" ? "todas" : block.key;
                model.onState({ ...state, bloco: next, cartao: state.cartao === "overdue" && next !== "os_atrasada" ? null : state.cartao, linha: null });
              }}
            >
              <span className="pat-kpi__tile" style={{ background: block.bg, color: block.fg, width: 32, height: 32, flexShrink: 0 }} aria-hidden="true">
                <Icon size={16} />
              </span>
              <span>
                <b style={{ color: n && block.key !== "todas" ? block.fg : "#0F172A" }}>{n}</b>
                <span className="apardash-bloco-c__rot">{block.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
    // D-007: as OS atrasadas e prioritárias desta fila são as OS críticas que o painel recebe, não todas as da organização.
    universe = <p className="apardash-universo">{`OS atrasadas e prioritárias: entre as ${model.summary.critical.length} OS críticas que o painel recebe.`}</p>;
    const blockLabel = bloco === "todas" ? null : (BLOCKS.find((block) => block.key === bloco)?.label ?? null);
    body = (
      <>
        <FilterChip label={blockLabel} onClear={() => model.onState({ ...state, bloco: "todas", cartao: state.cartao === "overdue" ? null : state.cartao, linha: null })} />
        <BlockTable widths={[138, null, 140, 40]} head={["TIPO", "ITEM", "SITUAÇÃO", ""]}>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: 0 }}>
                <div className="apardash-lista-vazia" data-state="empty">
                  <b>{queue.length > 0 ? "Nada neste filtro" : "Nenhuma prioridade no momento"}</b>
                  <span>{queue.length > 0 ? "Escolha outro bloco acima." : "Atrasos, prioridades, operadores sem sinal e aprovações aparecem aqui."}</span>
                </div>
              </td>
            </tr>
          ) : (
            <QueueRows model={model} items={visible} />
          )}
        </BlockTable>
      </>
    );
  }

  return (
    <div data-aparencia="C" className="apardash apardash--c">
      {header}
      <DashStatusStrip model={model} />
      {model.summary.status === "error" ? <SummaryFailure model={model} /> : null}
      {blocksNode}
      {universe}
      <div className="apardash-c-mesa">
        <section className="pat-table">
          <div className="pat-table__topbar">
            <h2 className="pat-card__title">Fila de prioridades</h2>
            {count ? <span className="pat-table__count">{count}</span> : null}
          </div>
          {body}
        </section>
        <Rail model={model} />
      </div>
    </div>
  );
}
