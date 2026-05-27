import type { OperationalAlert, OperationalKpi } from "../../modules/dashboard/types";

export const mockKpis: OperationalKpi[] = [
  { id: "open", label: "OS abertas", value: "148", delta: "+12 hoje", tone: "info" },
  { id: "sla", label: "SLA vencido", value: "9", delta: "3 criticas", tone: "danger" },
  { id: "dispatch", label: "Tempo medio despacho", value: "18min", delta: "-4min", tone: "success" },
  { id: "rework", label: "Retrabalho", value: "6.8%", delta: "+1.1 p.p.", tone: "warning" },
];

export const mockAlerts: OperationalAlert[] = [
  {
    id: "al-1",
    title: "SLA critico em Barueri",
    detail: "OS-10021 esta vencida e bloqueada por aprovacao de custo.",
    severity: "danger",
    workOrderId: "wo-10021",
  },
  {
    id: "al-2",
    title: "Fila sem viatura",
    detail: "3 ordens aguardam disponibilidade de frota na filial Sao Paulo.",
    severity: "warning",
  },
  {
    id: "al-3",
    title: "Reconciliação parcial",
    detail: "Eventos mobile recebidos; 2 comandos aguardam confirmacao backend.",
    severity: "info",
  },
];
