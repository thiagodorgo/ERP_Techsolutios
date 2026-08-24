import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { StatusPill } from "../../../../components/patterns";
import { formatDateTime, getNotificationKindLabel, isDeadlineOverdue } from "../dashboard.adapter";
import type { DeadlineAlert } from "../dashboard.types";
import { ACTION_HIT_AREA, deadlineStatus } from "../dashboard.view-model";

// Próximos prazos — tabela de verdade (cabeçalho + linhas do padrão .pat-table), ordenada pelo vencimento
// mais próximo, com o VENCIDO em vermelho. Cada linha NAVEGA para o processo correspondente (rota real
// /patios/processos/:id). O selo da coluna PRAZO carrega a distância ("há 12 dias" · "amanhã" · "em 30 dias")
// — vermelho quando já passou, âmbar na janela de 7 dias, neutro fora dela.
// D-007: lista vazia → vazio honesto; nenhuma linha é inventada.

const MAX_ROWS = 8;
const GRID: CSSProperties = { gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1.15fr) 108px 16px" };
const ROW_STYLE: CSSProperties = { ...GRID, textDecoration: "none", color: "inherit" };
const WRAP_STYLE: CSSProperties = { whiteSpace: "normal", overflow: "visible", textOverflow: "clip", lineHeight: 1.35 };
const OVERDUE_MARK: CSSProperties = { color: "#B91C1C", fontWeight: 800 };
const DATE_STYLE: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const FOOTER_STYLE: CSSProperties = { padding: "10px 18px", fontSize: 11.5, color: "#94A3B8", textAlign: "center" };

export type PrazosCardProps = {
  readonly alerts: readonly DeadlineAlert[];
  readonly now: Date;
};

export function PrazosCard({ alerts, now }: PrazosCardProps) {
  const sorted = useMemo(
    () => [...alerts].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [alerts],
  );
  const visible = sorted.slice(0, MAX_ROWS);
  const overdueCount = useMemo(() => sorted.filter((alert) => isDeadlineOverdue(alert, now)).length, [sorted, now]);

  return (
    <section className="pat-table">
      <div className="pat-table__topbar">
        <div>
          <div className="pat-table__title">Próximos prazos a tratar</div>
          <div className="pat-table__subtitle">Notificações e editais sem emissão nem dispensa registrada — os mais antigos primeiro</div>
        </div>
        <span className="pat-table__count">
          {sorted.length === 0
            ? "nenhum prazo em aberto"
            : `${sorted.length} em aberto${overdueCount > 0 ? ` · ${overdueCount} vencido(s)` : ""}`}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="pat-table__empty">
          <div className="pat-table__empty-title">Nenhum prazo pendente</div>
          <div className="pat-table__empty-detail">Não há notificações ou editais com prazo em aberto no momento.</div>
        </div>
      ) : (
        <>
          <div className="pat-table__head" style={GRID}>
            <div>NOTIFICAÇÃO</div>
            <div>VENCIMENTO</div>
            <div>PRAZO</div>
            <div aria-hidden="true" />
          </div>

          {visible.map((alert) => {
            const label = getNotificationKindLabel(alert.kind);
            const status = deadlineStatus(alert, now);
            return (
              <Link
                key={`${alert.processId}-${alert.kind}-${alert.dueAt}`}
                to={`/patios/processos/${alert.processId}`}
                className="pat-table__row"
                style={ROW_STYLE}
                aria-label={`Abrir o processo com ${label.toLowerCase()} ${status.overdue ? "vencida" : "a vencer"} em ${formatDateTime(alert.dueAt)}`}
              >
                <span className="pat-cell-main" style={WRAP_STYLE}>
                  {label}
                  {status.overdue ? <span style={OVERDUE_MARK}> · vencido</span> : null}
                </span>
                <span className="pat-cell-body" style={DATE_STYLE}>
                  {formatDateTime(alert.dueAt)}
                </span>
                <span>
                  <StatusPill label={status.label} bg={status.tone.tag} fg={status.tone.fg} dot={status.tone.solid} />
                </span>
                <ChevronRight size={14} aria-hidden="true" style={{ color: "#CBD5E1" }} />
              </Link>
            );
          })}

          {sorted.length > visible.length ? (
            <div style={FOOTER_STYLE}>
              Mostrando os {visible.length} prazos mais próximos de {sorted.length}.{" "}
              <Link to="/patios/processos" className="pat-link" style={ACTION_HIT_AREA}>
                Ver processos
              </Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
