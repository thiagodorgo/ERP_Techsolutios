import { Filter, Search } from "lucide-react";

import { Input, Select } from "../../../components/ui";
import { getWorkOrderPriorityLabel, getWorkOrderStatusLabel } from "../work-orders.adapter";
import { WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES, type WorkOrdersFilters as WorkOrdersFilterState } from "../work-orders.types";

export function WorkOrdersFilters({
  filters,
  onChange,
}: {
  readonly filters: WorkOrdersFilterState;
  readonly onChange: (filters: WorkOrdersFilterState) => void;
}) {
  return (
    <section className="erp-filter-bar work-orders-filters">
      <label className="ui-search">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Buscar por codigo, titulo ou cliente"
        />
      </label>
      <Select label="Status" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as WorkOrdersFilterState["status"] })}>
        <option value="all">Todos</option>
        {WORK_ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>{getWorkOrderStatusLabel(status)}</option>
        ))}
      </Select>
      <Select label="Prioridade" value={filters.priority} onChange={(event) => onChange({ ...filters, priority: event.target.value as WorkOrdersFilterState["priority"] })}>
        <option value="all">Todas</option>
        {WORK_ORDER_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>{getWorkOrderPriorityLabel(priority)}</option>
        ))}
      </Select>
      <Input label="Operador atribuido" value={filters.assignedOperatorId} onChange={(event) => onChange({ ...filters, assignedOperatorId: event.target.value })} placeholder="UUID ou user ID" />
      <Input label="De" type="date" value={filters.from} onChange={(event) => onChange({ ...filters, from: event.target.value })} />
      <Input label="Ate" type="date" value={filters.to} onChange={(event) => onChange({ ...filters, to: event.target.value })} />
      <span className="work-orders-filter-label"><Filter size={16} /> Filtros ativos</span>
    </section>
  );
}
