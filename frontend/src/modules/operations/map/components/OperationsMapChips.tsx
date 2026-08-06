import { Pause, Play, RefreshCw, X } from "lucide-react";

import { formatFieldLocationDate } from "../operations-map.adapter";
import type { OperationsMapRealtimeState, OperationsMapSource } from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, divergência 10) — CHIPS flutuantes top-left do mapa, no estilo
 * .chip do protótipo (vidro navy, radius 99): é onde vivem os ESTADOS OBRIGATÓRIOS §7 que o
 * protótipo não desenha em markup próprio — fonte de dados, realtime, "Atualizado HH:MM",
 * pausar/retomar atualização automática e o contexto de OS filtrada (?workOrderId) com "Limpar".
 * O banner compacto de erro ("Tentar novamente") aparece logo abaixo quando a fonte falha.
 */
export function OperationsMapChips({
  source,
  realtime,
  refreshedAt,
  isRefreshing = false,
  autoRefresh,
  onToggleAutoRefresh,
  fallbackReason,
  hasStaleData = false,
  onRetry,
  workOrderContextLabel,
  onClearWorkOrderContext,
  workOrdersTruncated = false,
}: {
  readonly source: OperationsMapSource;
  readonly realtime: OperationsMapRealtimeState;
  readonly refreshedAt?: string;
  readonly isRefreshing?: boolean;
  readonly autoRefresh: boolean;
  readonly onToggleAutoRefresh: () => void;
  readonly fallbackReason?: string;
  // true = falha de atualização preservou o último dado real (estado "desatualizado" §7).
  readonly hasStaleData?: boolean;
  readonly onRetry?: () => void;
  readonly workOrderContextLabel?: string;
  readonly onClearWorkOrderContext?: () => void;
  // R1 — nunca truncar em silêncio: chip honesto quando há mais OS no sistema que as exibidas.
  readonly workOrdersTruncated?: boolean;
}) {
  const sourceLabel =
    source === "api" ? "Fonte: API real" : source === "fallback" ? "Fonte: indisponível" : "Fonte: modo demonstração";

  return (
    <div className="opmap-chips" aria-label="Estado do mapa operacional">
      <span className="opmap-chip" data-tone={source === "api" ? "ok" : source === "fallback" ? "warn" : "info"}>
        <i aria-hidden="true" /> {sourceLabel}
      </span>
      <span
        className="opmap-chip"
        data-tone={realtime.status === "connected" ? "ok" : realtime.status === "unavailable" ? "danger" : "warn"}
      >
        <i aria-hidden="true" /> {realtime.label}
      </span>
      {refreshedAt ? (
        <span className="opmap-chip" data-tone="neutral">
          Atualizado {formatFieldLocationDate(refreshedAt)}
        </span>
      ) : null}
      {isRefreshing ? (
        <span className="opmap-chip" data-tone="info">
          Atualizando…
        </span>
      ) : null}
      <button
        type="button"
        className="opmap-chip opmap-chip--action"
        onClick={onToggleAutoRefresh}
        title={autoRefresh ? "Pausar atualização automática" : "Retomar atualização automática"}
      >
        {autoRefresh ? (
          <>
            <Pause size={12} aria-hidden="true" /> Pausar auto
          </>
        ) : (
          <>
            <Play size={12} aria-hidden="true" /> Auto atualizar
          </>
        )}
      </button>
      {workOrderContextLabel ? (
        <span className="opmap-chip" data-tone="info">
          OS filtrada: {workOrderContextLabel}
          {onClearWorkOrderContext ? (
            <button
              type="button"
              className="opmap-chip__clear"
              onClick={onClearWorkOrderContext}
              aria-label="Limpar contexto da OS"
            >
              <X size={12} aria-hidden="true" /> Limpar contexto
            </button>
          ) : null}
        </span>
      ) : null}
      {workOrdersTruncated ? (
        <span className="opmap-chip" data-tone="warn" title="Use a tela de Ordens de Serviço para a lista completa.">
          Há mais chamados que os exibidos
        </span>
      ) : null}
      {source === "fallback" ? (
        <span className="opmap-banner" role="alert">
          {fallbackReason ?? "A API de localização não respondeu."}{" "}
          {hasStaleData
            ? "Exibindo os últimos dados carregados — eles podem estar desatualizados."
            : "Nenhum dado é exibido até a fonte real voltar."}
          {onRetry ? (
            <button type="button" className="opmap-banner__retry" onClick={onRetry}>
              <RefreshCw size={12} aria-hidden="true" /> Tentar novamente
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
