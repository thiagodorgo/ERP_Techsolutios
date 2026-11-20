import { AlertTriangle, ChevronRight, Clock, FileText, Power, UserX, XCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BACKLOG_LABEL, formatDay, profileFieldLabel, QUEUE_KIND_LABEL } from "../billing-ops.labels";
import { formatBRL } from "../billing-ops.money";
import { FILTERS, type KpiKey, type Row } from "../billing-ops.state";
import type { QueueLine } from "../billing-ops.types";
import { queueReason } from "../components/queueText";
import { BillingOpsBanners, BillingOpsHeader, BucketLegend, Card, isPressed, KpiBlock, MonthsChart, plain, StatementList, type BillingOpsViewProps } from "./billingOps.shared";

// B-ASS-10c-OPERACAO — aparência B · Mesa de revisão (a maquete aprovada, `viewB`): 5 indicadores no alto; à esquerda, a
// mesa com o canal e o que pede ação (em revisão, com falha, em atraso, notas, perfil), cada item filtra a lista; à
// direita, os últimos 6 meses e a lista estreita com o detalhe logo abaixo da linha.

const MINI_KPIS: readonly KpiKey[] = ["todos", "acobrar", "emitidas", "pagos", "atraso"];

type Tone = readonly [string, string];

function MesaItem({ target, pressed, icon: Icon, tone, title, text, onTarget }: { readonly target: string; readonly pressed: boolean; readonly icon: LucideIcon; readonly tone: Tone; readonly title: string; readonly text: string; readonly onTarget: (key: string) => void }) {
  return (
    <button type="button" className="cb-att__item" data-alvo={target} aria-pressed={pressed} onClick={() => onTarget(target)} title={`${title} · ${text}`}>
      <span className="cb-att__icon" style={{ background: tone[0], color: tone[1] }} aria-hidden="true">
        <Icon size={14} />
      </span>
      <span>
        <span className="cb-att__kind" style={{ color: tone[1] }}>
          {title}
        </span>
        <span className="cb-att__text">{text}</span>
      </span>
    </button>
  );
}

function MesaSection({ label, count, target, pressed, onTarget, children }: { readonly label: string; readonly count: number | null; readonly target: KpiKey; readonly pressed: boolean; readonly onTarget: (key: string) => void; readonly children: ReactNode }) {
  return (
    <div data-mesa={target}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 4px", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: ".05em" }}>
        <span>
          {label} · {count === null ? "—" : count}
        </span>
        {count ? (
          <button type="button" className="pat-btn" style={{ marginLeft: "auto", minHeight: 28, padding: "3px 9px", fontSize: 11 }} aria-pressed={pressed} onClick={() => onTarget(target)}>
            Ver na lista
          </button>
        ) : null}
      </div>
      {count ? children : <div style={{ padding: "2px 16px 8px", fontSize: 12, color: "#94a3b8" }}>Nada aqui.</div>}
    </div>
  );
}

function lineItems(rows: readonly Row[], pick: (row: Row) => readonly QueueLine[], tone: Tone, icon: LucideIcon, alvo: string | null, onTarget: (key: string) => void) {
  return rows.flatMap((row) =>
    pick(row).map((line) => (
      <MesaItem key={line.id} target={`q:${line.id}`} pressed={alvo === `q:${line.id}`} icon={icon} tone={tone} title={row.org.name} text={`${QUEUE_KIND_LABEL[line.kind]}: ${queueReason(line)}`} onTarget={onTarget} />
    )),
  );
}

export function BillingOpsViewB(props: BillingOpsViewProps) {
  const { model, onTarget, onMonth, onRefresh, channelPanel } = props;
  const rows = model.monthRows;
  const alvo = model.ui.alvo;
  const channel = model.channel;
  const channelTone = channel.state !== "ok" ? ["#F1F5F9", "#64748B"] : channel.on ? ["#ECFDF5", "#047857"] : ["#FEF2F2", "#B91C1C"];
  const overdue = rows.filter(FILTERS.atraso);
  const notes = rows.filter(FILTERS.notas);
  const profile = rows.filter(FILTERS.perfil);
  return (
    <div className="cb-view" data-aparencia="B">
      <BillingOpsHeader model={model} onMonth={onMonth} onRefresh={onRefresh} />
      <BillingOpsBanners model={model} onRefresh={onRefresh} onTarget={onTarget} />
      <div className="cb-kpis" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {MINI_KPIS.map((key) => (
          <KpiBlock key={key} kpi={model.kpis[key]} pressed={isPressed(model, key)} onTarget={onTarget} />
        ))}
      </div>
      {model.ui.canal ? channelPanel : null}
      <div className="cb-base-a">
        <aside className="cb-att" aria-label="Mesa de revisão">
          <button
            type="button"
            className="cb-att__item"
            data-alvo="canal"
            aria-pressed={model.ui.canal}
            onClick={() => onTarget("canal")}
            aria-label={`Canal: ${channel.value} · ${channel.hint} — abre o painel do canal`}
            style={{ borderBottom: "1px solid #f1f5f9" }}
          >
            <span className="cb-att__icon" style={{ background: channelTone[0], color: channelTone[1] }} aria-hidden="true">
              <Power size={14} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="cb-att__kind" style={{ color: channelTone[1] }}>
                Canal: {channel.value}
              </span>
              <span className="cb-att__text">{channel.hint}</span>
            </span>
            <ChevronRight size={15} aria-hidden="true" style={{ marginLeft: "auto" }} />
          </button>
          <MesaSection label="Em revisão" count={model.kpis.revisao.count} target="revisao" pressed={alvo === "revisao"} onTarget={onTarget}>
            {lineItems(rows, (row) => row.review, ["#FFFBEB", "#B45309"], AlertTriangle, alvo, onTarget)}
          </MesaSection>
          <MesaSection label="Com falha" count={model.kpis.falha.count} target="falha" pressed={alvo === "falha"} onTarget={onTarget}>
            {lineItems(rows, (row) => row.failed, ["#FEF2F2", "#B91C1C"], XCircle, alvo, onTarget)}
          </MesaSection>
          <MesaSection label="Em atraso" count={model.kpis.atraso.count} target="atraso" pressed={alvo === "atraso"} onTarget={onTarget}>
            {overdue.map((row) => (
              <MesaItem key={row.key} target={`s:${row.statement.id}`} pressed={alvo === `s:${row.statement.id}`} icon={Clock} tone={["#FEF2F2", "#B91C1C"]} title={row.org.name} text={`Venceu em ${formatDay(row.statement.dueDate)} · saldo ${plain(formatBRL(row.statement.balance))}`} onTarget={onTarget} />
            ))}
          </MesaSection>
          <MesaSection label="Notas pendentes" count={model.kpis.notas.count} target="notas" pressed={alvo === "notas"} onTarget={onTarget}>
            {notes.map((row) => (
              <MesaItem
                key={row.key}
                target={`s:${row.statement.id}`}
                pressed={alvo === `s:${row.statement.id}`}
                icon={FileText}
                tone={row.backlog === "live_on_unpaid" ? ["#FEF2F2", "#B91C1C"] : ["#F5F3FF", "#6D28D9"]}
                title={row.org.name}
                text={row.backlog ? BACKLOG_LABEL[row.backlog] : ""}
                onTarget={onTarget}
              />
            ))}
          </MesaSection>
          <MesaSection label="Perfil incompleto" count={model.kpis.perfil.count} target="perfil" pressed={alvo === "perfil"} onTarget={onTarget}>
            {profile.map((row) => (
              <MesaItem key={row.key} target={`s:${row.statement.id}`} pressed={alvo === `s:${row.statement.id}`} icon={UserX} tone={["#F1F5F9", "#475569"]} title={row.org.name} text={`Faltam: ${row.profile?.missing.map(profileFieldLabel).join(", ") ?? ""}`} onTarget={onTarget} />
            ))}
          </MesaSection>
        </aside>
        <div style={{ minWidth: 0, display: "grid", gap: 14 }}>
          <Card title="Últimos 6 meses" hint="Quantidade de demonstrativos por situação · clique num mês">
            <MonthsChart model={model} onMonth={onMonth} height={130} />
            <BucketLegend model={model} onTarget={onTarget} />
          </Card>
          <StatementList {...props} wide={false} />
        </div>
      </div>
    </div>
  );
}
