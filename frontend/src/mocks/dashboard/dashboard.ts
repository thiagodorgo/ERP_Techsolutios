// Demo (VITE_USE_MOCKS): agregado no MESMO formato do contrato real
// GET /api/v1/dashboard/summary, para o mock atravessar exatamente o mesmo
// adapter (adaptDashboardSummary) do caminho real. É dado de demonstração
// explícito — o caminho real nunca fabrica números.
export const mockDashboardSummary = {
  workOrders: {
    total: 148,
    byStatus: {
      open: 42,
      assigned: 18,
      accepted: 9,
      on_route: 6,
      on_site: 5,
      in_progress: 12,
      paused: 3,
      completed: 47,
      cancelled: 4,
      rejected: 2,
    },
    createdToday: 12,
    createdThisWeek: 63,
    overdue: 9,
  },
  registry: { customers: 86, vehicles: 24, teams: 7, services: 31 },
  criticalWorkOrders: [
    { id: "wo-10021", code: "OS-10021", title: "Manutenção corretiva HVAC", status: "paused", priority: "urgent", scheduledFor: "2026-05-26T14:30:00-03:00", customerName: "Atlas Refrigeração" },
    { id: "wo-10024", code: "OS-10024", title: "Inspeção preventiva de elevador", status: "assigned", priority: "high", scheduledFor: "2026-05-26T17:00:00-03:00", customerName: "Condomínio Torre Norte" },
    { id: "wo-10018", code: "OS-10018", title: "Gerador em contingência", status: "in_progress", priority: "high", scheduledFor: "2026-05-26T19:45:00-03:00", customerName: "Hospital Santa Clara" },
  ],
  recentEvents: [
    { id: "evt-1", workOrderId: "wo-10021", eventType: "work_order_status_changed", message: "OS-10021 movida para pausada aguardando aprovação de custo.", createdAt: "2026-05-26T13:42:00-03:00" },
    { id: "evt-2", workOrderId: "wo-10024", eventType: "work_order_assigned", message: "OS-10024 atribuída à Equipe Beta.", createdAt: "2026-05-26T12:15:00-03:00" },
    { id: "evt-3", workOrderId: "wo-10018", eventType: "work_order_created", message: "OS-10018 criada para atendimento emergencial.", createdAt: "2026-05-26T11:05:00-03:00" },
  ],
};
