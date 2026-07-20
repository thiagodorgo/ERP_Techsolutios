import type { KpiDetail, KpiSourceTag } from "../../components/kpi";
import type { DashboardSource } from "./repository";
import type { OperationalKpi } from "./types";
import type { WorkOrderTimeseriesData } from "./work-order-timeseries.types";

// WS-CARDS-CHARTS-F2 (PR2a) — monta o descritor do pop-up de cada KPI do Dashboard Operacional a partir
// SOMENTE de dado já carregado (D-007): o `value`/`caption` vêm do agregado real (summaryToKpis) e, nos
// dois cards com série diária REAL (Concluídas/OS hoje), o corpo é a tendência de useWorkOrderTimeseries.
// Nada é somado nem fabricado aqui — a função só reapresenta números que já estão na tela.

// Formata o dia civil YYYY-MM-DD (America/Sao_Paulo, já resolvido pelo backend) como "dd/mm" SEM
// `new Date(date)` — o parse ingênuo o interpretaria como UTC 00:00 e poderia recuar um dia no fuso local.
export function formatDiaMes(date: string): string {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [, month, day] = parts;
  return `${day}/${month}`;
}

/** DashboardSource → selo do modal: 'mock'→'mock', 'error'→'fallback', senão 'api'. */
export function mapDashboardSource(source: DashboardSource): KpiSourceTag {
  if (source === "mock") return "mock";
  if (source === "error") return "fallback";
  return "api";
}

const WORK_ORDERS_CTA = { label: "Ver ordens de serviço", to: "/work-orders" } as const;

// Cadastro: rotas confirmadas em App.tsx (/cadastros/*). Só há cta porque a rota existe de fato.
const REGISTRY_CTA: Record<string, { label: string; to: string }> = {
  customers: { label: "Ver clientes", to: "/cadastros/clientes" },
  vehicles: { label: "Ver viaturas", to: "/cadastros/viaturas" },
  teams: { label: "Ver equipes", to: "/cadastros/equipes" },
  services: { label: "Ver serviços", to: "/cadastros/servicos" },
};

// Permissão EXATA do PermissionGuard de cada rota de cadastro em App.tsx (o CTA só aparece se o papel
// puder abrir a rota — caso contrário o pop-up fica sem botão de navegação, sem cair num guard).
const REGISTRY_PERMISSION: Record<string, string> = {
  customers: "customers:read",
  vehicles: "vehicles:read",
  teams: "teams:read",
  services: "service_catalog:read", // atenção: catálogo usa `service_catalog:read`, não `services:read`
};

const REGISTRY_TEXT: Record<string, string> = {
  customers: "Total de clientes ativos no cadastro da organização.",
  vehicles: "Total de viaturas no cadastro da organização.",
  teams: "Total de equipes cadastradas na organização.",
  services: "Total de serviços no catálogo da organização.",
};

/**
 * Descritor do pop-up de um KPI do Dashboard. `summarySource` é o selo do agregado; `timeseries` alimenta
 * apenas os dois cards de série (Concluídas/OS hoje) — e só quando a série é usável de fato (api, não 403,
 * com pontos). Caso contrário degrada para `explain`, sem gráfico enganoso (D-007).
 *
 * `can(permission)` gateia os CTAs de navegação: só há botão quando o papel pode abrir a rota alvo (o mesmo
 * predicado dos PermissionGuard de App.tsx). Sem a permissão a `cta` é OMITIDA — o pop-up fica sem botão de
 * navegação (explain/chart continua), nunca oferecendo um link que cairia no guard.
 */
export function buildDashboardKpiDetail(
  kpi: OperationalKpi,
  summarySource: KpiSourceTag,
  timeseries: WorkOrderTimeseriesData,
  can: (permission: string) => boolean,
): KpiDetail {
  const chartUsable = timeseries.source === "api" && !timeseries.forbidden && timeseries.points.length > 0;
  // /work-orders é gateado por work_orders:read (App.tsx). Sem a permissão, nenhum CTA de OS.
  const workOrdersCta = can("work_orders:read") ? WORK_ORDERS_CTA : undefined;

  switch (kpi.id) {
    case "open":
      return {
        title: "OS abertas",
        value: kpi.value,
        caption: kpi.delta,
        source: summarySource,
        body: {
          kind: "explain",
          text: "Ordens aguardando início — soma de abertas, atribuídas e aceitas. Recarrega sozinho com o painel.",
        },
        cta: workOrdersCta,
      };
    case "in_progress":
      return {
        title: "Em andamento",
        value: kpi.value,
        caption: kpi.delta,
        source: summarySource,
        body: { kind: "explain", text: "OS em campo agora — em rota, no local, em execução ou pausadas." },
        cta: workOrdersCta,
      };
    case "completed":
      if (chartUsable) {
        return {
          title: "Concluídas",
          value: kpi.value,
          caption: "Concluídas por dia · últimos 30 dias",
          source: timeseries.source,
          body: {
            kind: "chart",
            chartType: "area",
            series: [{ id: "completed", label: "Concluídas", tone: "success", values: timeseries.points.map((p) => p.completed) }],
            labels: timeseries.points.map((p) => formatDiaMes(p.date)),
            valueFormat: (n) => String(Math.round(n)),
          },
          cta: workOrdersCta,
        };
      }
      return {
        title: "Concluídas",
        value: kpi.value,
        caption: kpi.delta,
        source: timeseries.source,
        body: {
          kind: "explain",
          text: "Concluídas no total. A série diária fica indisponível enquanto os dados não vêm do servidor.",
        },
        cta: workOrdersCta,
      };
    case "overdue":
      return {
        title: "Atrasadas",
        value: kpi.value,
        caption: kpi.delta,
        source: summarySource,
        body: { kind: "explain", text: "OS com agenda vencida e status não final. Priorize a fila crítica." },
        cta: can("work_orders:read") ? { label: "Ver fila", to: "/work-orders" } : undefined,
      };
    case "created_today":
      if (chartUsable) {
        return {
          title: "OS hoje",
          value: kpi.value,
          caption: "Aberturas por dia · últimos 30 dias",
          source: timeseries.source,
          body: {
            kind: "chart",
            chartType: "area",
            series: [{ id: "created", label: "Abertas", tone: "info", values: timeseries.points.map((p) => p.created) }],
            labels: timeseries.points.map((p) => formatDiaMes(p.date)),
            valueFormat: (n) => String(Math.round(n)),
          },
          cta: workOrdersCta,
        };
      }
      return {
        title: "OS hoje",
        value: kpi.value,
        caption: kpi.delta,
        source: timeseries.source,
        body: {
          kind: "explain",
          text: "Aberturas de hoje. A série diária fica indisponível enquanto os dados não vêm do servidor.",
        },
        cta: workOrdersCta,
      };
    case "customers":
    case "vehicles":
    case "teams":
    case "services":
      return {
        title: kpi.label,
        value: kpi.value,
        caption: "no cadastro",
        source: summarySource,
        body: { kind: "explain", text: REGISTRY_TEXT[kpi.id] },
        cta: can(REGISTRY_PERMISSION[kpi.id]) ? REGISTRY_CTA[kpi.id] : undefined,
      };
    default:
      return {
        title: kpi.label,
        value: kpi.value,
        caption: kpi.delta,
        source: summarySource,
        body: { kind: "explain", text: kpi.label },
      };
  }
}
