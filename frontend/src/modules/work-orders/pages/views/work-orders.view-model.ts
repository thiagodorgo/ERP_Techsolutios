import type { ReactNode } from "react";

import type { WorkOrdersListStatus } from "../../work-orders.state";
import type { WorkOrderListItem } from "../../work-orders.types";

// B-APAR-OS — o MODELO que o contêiner (`WorkOrdersPage`) monta UMA vez e entrega às três aparências aprovadas
// (`screen-refs/ordens-de-servico-3opcoes.reference.html`: A · Padrão fiel, B · Analítica, C · Fila por agenda). As views
// são PURAS: não importam service nem hook de dados e não leem permissão da sessão; recebem tudo aqui (padrão do
// `FinanceiroViewModel`). Toda contagem é feita sobre `items` (a lista que o servidor devolveu, já com os filtros de
// prioridade e data); quando o servidor diz que há mais OS do que as carregadas, `partial` acende e a tela diz o universo.

/** Recorte da lista guardado em `?aba=` (as abas da tela de hoje, com nome de URL em português). */
export type WorkOrdersTabKey = "todas" | "sem-tecnico" | "em-campo" | "concluidas";

/** Estado navegável da lista, lido e escrito na querystring (`?aba=`, `?alvo=`, `?q=`, `?os=`). */
export type WorkOrdersListState = {
  readonly tab: WorkOrdersTabKey;
  /** Indicador, barra ou bloco que filtra a lista (`?alvo=`); `null` sem filtro. */
  readonly target: string | null;
  readonly q: string;
  /** OS aberta na janela fixa (B e C, `?os=`). */
  readonly openId: string | null;
};

export type WorkOrdersAccess = {
  /** `work_orders:create` — "Nova OS" no cabeçalho e no vazio. */
  readonly create: boolean;
  /** `field_dispatch:create` — "Atribuir técnico" no resumo. */
  readonly dispatch: boolean;
  /** Permissões do ator, só para os predicados puros de `work-orders-row.logic.ts` (dar andamento, revogar envio). */
  readonly permissions: readonly string[];
};

export type WorkOrdersViewModel = {
  readonly items: readonly WorkOrderListItem[];
  /** OS que o servidor devolveu nesta consulta (antes do filtro local) e o total que ele diz existir. */
  readonly loaded: number;
  readonly serverTotal: number;
  /** O servidor tem mais OS do que as carregadas: toda contagem diz o universo (D-007). */
  readonly partial: boolean;
  readonly status: WorkOrdersListStatus;
  readonly loading: boolean;
  readonly error: string | null;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
  /** Modo demonstração (`VITE_USE_MOCKS`): a faixa "Dados demonstrativos" de hoje. */
  readonly demo: boolean;
  readonly now: Date;
  readonly access: WorkOrdersAccess;
  readonly state: WorkOrdersListState;
  /** Filtros do servidor ativos (prioridade, data de abertura): o vazio diz "para os filtros atuais". */
  readonly activeFilterCount: number;
  /** Filtrar · Exportar · Nova OS, montados no contêiner (o cartão de filtros e o CSV moram lá). */
  readonly headerActions: ReactNode;
  readonly filterCard: ReactNode;
  readonly expandedId: string | null;
  readonly rowBusy: Readonly<Record<string, boolean>>;
  readonly rowError: Readonly<Record<string, string | null>>;
  readonly onState: (next: WorkOrdersListState) => void;
  readonly onToggleRow: (id: string) => void;
  /** "Abrir OS": a página `/work-orders/:id` na A; a janela fixa na B e na C. */
  readonly onOpenDetail: (id: string) => void;
  /** "Vincular cliente": o detalhe em Informações gerais (o destino de hoje). */
  readonly onLink: (id: string) => void;
  /** "Atribuir técnico": Despachos com a OS pré-selecionada (o destino de hoje). */
  readonly onAssign: (id: string) => void;
  readonly onAdvance: (order: WorkOrderListItem) => void;
  readonly onRevoke: (order: WorkOrderListItem) => void;
  readonly onCreate: () => void;
  readonly onRetry: () => void;
};
