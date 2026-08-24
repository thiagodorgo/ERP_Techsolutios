import type { WorkOrderPriority, WorkOrderStatus } from "./work-orders.types";

/**
 * AUDITORIA VISUAL — FONTE ÚNICA de COR da OS (status e prioridade).
 *
 * Defeito medido antes deste arquivo: a MESMA ordem de serviço trocava de cor entre a lista
 * (`WorkOrdersPage`) e o detalhe (`GeneralInfoTab`) — 8 dos 10 status divergiam — e a prioridade
 * chegava a INVERTER a semântica: na lista `baixa=cinza / média=âmbar / alta=VERMELHA`; no detalhe
 * `baixa=VERDE / média=AZUL / alta=âmbar`. Clicar numa OS "Alta" vermelha e ver "Alta" âmbar a um
 * clique de distância quebra a confiança no dado sem que o usuário saiba nomear o motivo.
 *
 * A paleta canônica é a da LISTA (P1) — ela é a que veio do protótipo (`sc_os`), e é a superfície
 * onde o usuário vê dezenas de OS lado a lado, logo é a que ancora a leitura.
 *
 * Regra: quem precisa de cor de status/prioridade de OS IMPORTA daqui. Nenhum consumidor mantém a
 * sua própria tabela — era exatamente isso que produzia as duas verdades.
 */

/** Par (fundo, texto) de um chip. Mesma forma em toda a UI. */
export type Tone = { readonly bg: string; readonly fg: string };

/**
 * Paleta semântica canônica (nomeada pela FUNÇÃO, nunca pela cor — §"color-danger, não color-red").
 * Contraste do texto sobre o fundo do par: todos ≥ 4.5:1 (WCAG AA para texto pequeno).
 */
export const TONE = {
  success: { bg: "#DCFCE7", fg: "#15803D" },
  warning: { bg: "#FEF3C7", fg: "#B45309" },
  critical: { bg: "#FEE2E2", fg: "#B91C1C" },
  info: { bg: "#EFF6FF", fg: "#2563EB" },
  neutral: { bg: "#F1F5F9", fg: "#475569" },
} as const satisfies Record<string, Tone>;

/**
 * Status → tom. Agrupamento do protótipo: aberta/atribuída/aceita = INFO (aguarda) · em rota/no
 * local/em atendimento = SUCCESS (fluindo em campo) · pausada = WARNING (parou, exige atenção) ·
 * concluída = NEUTRAL (encerrada, sai do radar) · cancelada/recusada = CRITICAL.
 */
export const WORK_ORDER_STATUS_TONE: Record<WorkOrderStatus, Tone> = {
  open: TONE.info,
  assigned: TONE.info,
  accepted: TONE.info,
  on_route: TONE.success,
  on_site: TONE.success,
  in_progress: TONE.success,
  paused: TONE.warning,
  completed: TONE.neutral,
  cancelled: TONE.critical,
  rejected: TONE.critical,
};

/**
 * Prioridade → dot + cor do texto. Escala ASCENDENTE de urgência (cinza → âmbar → vermelho): é a
 * direção que a lista já usava e a única que não mente sobre o que é urgente. "Urgente" não existe
 * no protótipo → herda a família vermelha (a mais próxima), com o rótulo real.
 */
export const PRIORITY_TONE: Record<WorkOrderPriority, { readonly dot: string; readonly fg: string }> = {
  low: { dot: "#94A3B8", fg: "#64748B" },
  medium: { dot: "#F59E0B", fg: "#B45309" },
  high: { dot: "#DC2626", fg: "#B91C1C" },
  urgent: { dot: "#DC2626", fg: "#B91C1C" },
};

/**
 * Rótulo PT-BR da prioridade. Mora aqui junto do tom porque os dois consumidores (lista e detalhe)
 * mantinham CÓPIAS do mesmo mapa — a mesma classe de defeito que a cor tinha. O rótulo de STATUS já
 * tem fonte única em `work-orders-row.logic.ts` (`WORK_ORDER_STATUS_LABEL`) e não é duplicado aqui.
 */
export const WORK_ORDER_PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};
