import { Filter, Search } from "lucide-react";

import { Input, Select } from "../../../../components/ui";
import { getDispatchPriorityLabel, getDispatchStatusLabel } from "../dispatches.adapter";
import { DISPATCH_PRIORITIES, DISPATCH_STATUSES, type DispatchesFilters as DispatchesFilterState } from "../dispatches.types";

export function DispatchesFilters({
  filters,
  operatorOptions,
  onChange,
}: {
  readonly filters: DispatchesFilterState;
  readonly operatorOptions: readonly string[];
  readonly onChange: (filters: DispatchesFilterState) => void;
}) {
  return (
    <section className="erp-filter-bar work-orders-filters dispatches-filters">
      <label className="ui-search">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Buscar por OS, codigo ou operador"
        />
      </label>
      <Select label="Status" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as DispatchesFilterState["status"] })}>
        <option value="all">Todos</option>
        {DISPATCH_STATUSES.map((status) => (
          <option key={status} value={status}>{getDispatchStatusLabel(status)}</option>
        ))}
      </Select>
      <Select label="Prioridade" value={filters.priority} onChange={(event) => onChange({ ...filters, priority: event.target.value as DispatchesFilterState["priority"] })}>
        <option value="all">Todas</option>
        {DISPATCH_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>{getDispatchPriorityLabel(priority)}</option>
        ))}
      </Select>
      <Select label="Operador" value={filters.operatorUserId} onChange={(event) => onChange({ ...filters, operatorUserId: event.target.value })}>
        <option value="">Todos</option>
        {operatorOptions.map((operatorId) => (
          <option key={operatorId} value={operatorId}>{operatorId}</option>
        ))}
      </Select>
      <Input label="Operador manual" value={filters.operatorUserId} onChange={(event) => onChange({ ...filters, operatorUserId: event.target.value })} placeholder="UUID ou user ID" />
      <span className="work-orders-filter-label"><Filter size={16} /> Filtros ativos</span>
    </section>
  );
}
