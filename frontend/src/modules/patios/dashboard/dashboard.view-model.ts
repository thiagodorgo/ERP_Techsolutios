import type { CSSProperties } from "react";

import type { AuctionRevenueByBeneficiary, DeadlineAlert, ProcessPhaseBucket, YardOccupancySummary } from "./dashboard.types";

// Painel gerencial dos Pátios — CAMADA DE APRESENTAÇÃO (pura: sem JSX e sem runtime de React).
// Aqui vivem SÓ os tons semânticos e as derivações de leitura (faixa de ocupação, distância do prazo,
// participação percentual). Nenhuma função inventa dado: tudo deriva de números que o backend já agregou
// (D-007). Manter separado dos componentes permite provar a semântica de cor por teste, sem renderizar.

/** Tom semântico do design system: `fg` texto/ícone · `tag` fundo do selo · `tile` fundo do ícone · `solid` preenchimento de gráfico. */
export type Tone = {
  readonly fg: string;
  readonly tag: string;
  readonly tile: string;
  readonly solid: string;
};

// Paleta §11.5 do CLAUDE.md — azul plataforma · verde sucesso · âmbar atenção · vermelho crítico · roxo receita.
// Os valores são os MESMOS já usados no cadastro de Pátios (modules/patios/yards) e no Dashboard operacional,
// para que a mesma informação nunca mude de cor entre telas.
export const PLATFORM_TONE: Tone = { fg: "#2563EB", tag: "#EFF6FF", tile: "#EFF6FF", solid: "#2563EB" };
export const SUCCESS_TONE: Tone = { fg: "#15803D", tag: "#DCFCE7", tile: "#F0FDF4", solid: "#22C55E" };
export const WARNING_TONE: Tone = { fg: "#B45309", tag: "#FEF3C7", tile: "#FFFBEB", solid: "#F59E0B" };
export const DANGER_TONE: Tone = { fg: "#B91C1C", tag: "#FEE2E2", tile: "#FEF2F2", solid: "#DC2626" };
export const REVENUE_TONE: Tone = { fg: "#7E22CE", tag: "#F3E8FF", tile: "#FAF5FF", solid: "#A855F7" };
export const NEUTRAL_TONE: Tone = { fg: "#475569", tag: "#F1F5F9", tile: "#F1F5F9", solid: "#94A3B8" };

/** Borda vermelha do card quando o indicador exige ação agora (mesmo `border` do KpiStatCard no cadastro). */
export const CRITICAL_BORDER = "#FCA5A5";

/**
 * Link de ação de cabeçalho de card (.pat-link) tem só 16px de altura clicável — abaixo do mínimo de alvo.
 * O padding sobe a área de toque para 44px e a margem negativa devolve exatamente o mesmo espaço, então NADA
 * se move no layout: o link continua pixel a pixel onde estava, só fica clicável numa área maior.
 */
export const ACTION_HIT_AREA: CSSProperties = { textDecoration: "none", padding: "14px 8px", margin: "-14px -8px" };

// ── Ocupação ────────────────────────────────────────────────────────────────────────────────────────────
// Faixas IDÊNTICAS às da lista de Pátios (yards/pages/PatiosPage.tsx → occupancyTone): <60% folgada,
// 60–85% apertada, >85% lotada. Se divergirem, o mesmo pátio apareceria verde aqui e vermelho lá.
export type OccupancyBand = "folgada" | "apertada" | "lotada";

export function occupancyBand(pct: number): OccupancyBand {
  if (pct > 85) return "lotada";
  if (pct >= 60) return "apertada";
  return "folgada";
}

export function occupancyTone(pct: number): Tone {
  const band = occupancyBand(pct);
  if (band === "lotada") return DANGER_TONE;
  if (band === "apertada") return WARNING_TONE;
  return SUCCESS_TONE;
}

/** Trilho e segmentos não-ocupados da barra empilhada (livres = folga disponível; bloqueadas = indisponíveis). */
export const FREE_SPOTS_COLOR = "#E2E8F0";
export const BLOCKED_SPOTS_COLOR = "#64748B";
export const TRACK_COLOR = "#F1F5F9";

export type YardOccupancyRow = {
  readonly yardId: string;
  readonly yardName: string;
  readonly totalSpots: number;
  readonly occupiedSpots: number;
  readonly freeSpots: number;
  readonly blockedSpots: number;
  /** Percentual ocupado (0–100) ou `null` quando o pátio não tem vaga cadastrada — nunca 0 fabricado. */
  readonly rate: number | null;
  readonly tone: Tone;
  /** Larguras em % do total de vagas, já normalizadas para nunca estourar 100. */
  readonly occupiedWidth: number;
  readonly blockedWidth: number;
  readonly freeWidth: number;
};

/** Converte a ocupação crua em linhas prontas para a barra empilhada, ordenadas pela mais cheia primeiro. */
export function toOccupancyRows(occupancy: readonly YardOccupancySummary[]): YardOccupancyRow[] {
  return occupancy
    .map((yard) => {
      // O denominador respeita o que o backend informou: se as partes somarem mais que o total (dado
      // inconsistente), a barra usa a soma real — assim nenhum segmento é cortado sem aviso.
      const parts = yard.occupiedSpots + yard.blockedSpots + yard.freeSpots;
      const base = Math.max(yard.totalSpots, parts, 1);
      const rate = yard.totalSpots > 0 ? Math.round((yard.occupiedSpots / yard.totalSpots) * 100) : null;
      return {
        yardId: yard.yardId,
        yardName: yard.yardName,
        totalSpots: yard.totalSpots,
        occupiedSpots: yard.occupiedSpots,
        freeSpots: yard.freeSpots,
        blockedSpots: yard.blockedSpots,
        rate,
        tone: rate === null ? NEUTRAL_TONE : occupancyTone(rate),
        occupiedWidth: (yard.occupiedSpots / base) * 100,
        blockedWidth: (yard.blockedSpots / base) * 100,
        freeWidth: (yard.freeSpots / base) * 100,
      };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || a.yardName.localeCompare(b.yardName, "pt-BR"));
}

// ── Processos por fase ──────────────────────────────────────────────────────────────────────────────────
// Cores do FUNIL (não são status de saúde): entrada em azul claro → núcleo em azul plataforma → devolução ao
// proprietário em verde (desfecho bom) → leilão em roxo (é o que gera arrecadação) → encerrado em neutro.
export const PHASE_COLORS: Record<ProcessPhaseBucket, string> = {
  RECEPTION: "#60A5FA",
  CUSTODY: "#2563EB",
  RELEASE: "#22C55E",
  AUCTION: "#A855F7",
  CLOSED: "#94A3B8",
};

export type PhaseSlice = {
  readonly bucket: ProcessPhaseBucket;
  readonly label: string;
  readonly count: number;
  readonly share: number; // 0–100
  readonly color: string;
};

// ── Prazos ──────────────────────────────────────────────────────────────────────────────────────────────
export type DeadlineStatus = {
  readonly overdue: boolean;
  /** Dias inteiros de distância (sempre ≥ 0); 0 = vence/venceu hoje. */
  readonly days: number;
  /** Rótulo curto do selo: "há 5 dias" · "hoje" · "em 3 dias". */
  readonly label: string;
  readonly tone: Tone;
};

const DAY_MS = 86_400_000;

/** Meia-noite local da data — a contagem de prazo é em DIAS DE CALENDÁRIO, não em janelas de 24h. */
function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

/**
 * Distância até o vencimento. Vencido → vermelho. A vencer em até 7 dias → âmbar (janela de ação).
 * Acima disso → neutro. O `now` é injetado para o resultado ser determinístico em teste.
 *
 * `overdue` compara INSTANTES (mesmo critério de `isDeadlineOverdue`, para que o marcador vermelho e o selo
 * nunca discordem); o RÓTULO conta dias de calendário, senão um prazo que vence hoje às 23h apareceria como
 * "amanhã" só porque faltam mais de 24 horas para o mesmo instante do dia seguinte.
 */
export function deadlineStatus(alert: DeadlineAlert, now: Date): DeadlineStatus {
  const dueTime = new Date(alert.dueAt).getTime();
  if (Number.isNaN(dueTime)) return { overdue: false, days: 0, label: "sem data", tone: NEUTRAL_TONE };

  const calendarDays = Math.round((startOfDay(new Date(dueTime)) - startOfDay(now)) / DAY_MS);

  if (dueTime <= now.getTime()) {
    const days = Math.max(0, -calendarDays);
    return {
      overdue: true,
      days,
      label: days === 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`,
      tone: DANGER_TONE,
    };
  }

  const days = Math.max(0, calendarDays);
  return {
    overdue: false,
    days,
    label: days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`,
    tone: days <= 7 ? WARNING_TONE : NEUTRAL_TONE,
  };
}

// ── Arrecadação ─────────────────────────────────────────────────────────────────────────────────────────
/** Soma dos beneficiários — usada só como denominador da participação (o total oficial vem do backend). */
export function sumBeneficiaries(rows: readonly AuctionRevenueByBeneficiary[]): number {
  return rows.reduce((sum, row) => {
    const value = Number(row.totalAmount);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/** Participação percentual de uma parte sobre um total; total ≤ 0 → 0 (nunca divide por zero nem inventa). */
export function shareOf(part: number, total: number): number {
  if (!Number.isFinite(part) || total <= 0) return 0;
  return (part / total) * 100;
}

/** Percentual já arredondado para exibição, com o sinal de porcentagem. */
export function formatShare(share: number): string {
  return `${Math.round(share)}%`;
}

/** Hora do último carregamento ("10:42") para o cabeçalho — data completa fica no aviso de desatualizado. */
export function formatClock(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value);
}
