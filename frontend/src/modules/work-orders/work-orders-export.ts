import { downloadCsv } from "../../lib/csv";
import {
  isWorkOrderDelayed,
  workOrderServiceLine,
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATUS_LABEL,
} from "./work-orders-row.logic";
import type { WorkOrderListItem, WorkOrdersSource } from "./work-orders.types";

export const WORK_ORDERS_CSV_HEADER: readonly string[] = Object.freeze([
  "Código",
  "Prioridade",
  "Cliente",
  "Serviço",
  "Técnico",
  "Agenda",
  "Atrasada",
  "Situação",
]);

export function workOrdersCsvFilename(source: WorkOrdersSource): string {
  return source === "mock" ? "ordens-de-servico-demonstrativo.csv" : "ordens-de-servico.csv";
}

export function neutralizeCsvFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatAgendaForExport(iso: string | null | undefined): string {
  if (!iso) return "Sem agenda";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function workOrdersCsvRows(items: readonly WorkOrderListItem[], now: number): string[][] {
  return items.map((order) =>
    [
      order.code,
      WORK_ORDER_PRIORITY_LABEL[order.priority],
      order.customerName ? order.customerName : "Sem cliente vinculado",
      workOrderServiceLine(order),
      order.assignedOperatorId ? "Atribuído" : "Sem técnico",
      formatAgendaForExport(order.scheduledFor),
      isWorkOrderDelayed(order.scheduledFor, order.status, now).delayed ? "Sim" : "Não",
      WORK_ORDER_STATUS_LABEL[order.status],
    ].map(neutralizeCsvFormula),
  );
}

export function exportAvailability(input: {
  readonly loading: boolean;
  readonly failure: boolean;
  readonly total: number;
  readonly stale: boolean;
  readonly demo: boolean;
  readonly loaded: number;
  readonly serverTotal: number;
}): { readonly enabled: boolean; readonly hint: string } {
  if (input.loading) return { enabled: false, hint: "Aguarde: a lista ainda está carregando." };
  if (input.failure) return { enabled: false, hint: "Nada para exportar: a lista não carregou." };
  if (input.total === 0) return { enabled: false, hint: "Nenhuma ordem na lista para exportar." };

  let hint = input.total === 1
    ? "Baixar a ordem da lista em planilha (CSV)."
    : `Baixar as ${input.total} ordens da lista em planilha (CSV).`;
  if (input.serverTotal > input.loaded) {
    hint += ` A tela mostra as ${input.loaded} ordens mais recentes de ${input.serverTotal}; o arquivo leva só as da tela.`;
  }
  if (input.stale) hint += " Atenção: a última atualização falhou; os dados podem estar desatualizados.";
  if (input.demo) hint += " Dados demonstrativos.";
  return { enabled: true, hint };
}

export function exportWorkOrdersCsv(
  items: readonly WorkOrderListItem[],
  source: WorkOrdersSource,
  now: number,
): void {
  downloadCsv(
    workOrdersCsvFilename(source),
    [...WORK_ORDERS_CSV_HEADER],
    workOrdersCsvRows(items, now),
  );
}
