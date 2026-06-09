import { Filter } from "lucide-react";

import { Checkbox, SearchBar, Select } from "../../../../components/ui";
import { FIELD_LOCATION_STATUSES, type OperationsMapFilters } from "../operations-map.types";
import { getFieldLocationStatusLabel } from "../operations-map.adapter";

export function OperationsMapFilters({
  filters,
  teams,
  onChange,
}: {
  filters: OperationsMapFilters;
  teams: readonly string[];
  onChange: (filters: OperationsMapFilters) => void;
}) {
  return (
    <section className="erp-filter-bar operations-map-filters" aria-label="Filtros do mapa operacional">
      <Filter size={18} />
      <SearchBar
        value={filters.search}
        onChange={(search) => onChange({ ...filters, search })}
        placeholder="Buscar operador ou equipe"
      />
      <Select
        label="Status"
        value={filters.status}
        onChange={(event) => onChange({ ...filters, status: event.target.value as OperationsMapFilters["status"] })}
      >
        <option value="all">Todos</option>
        {FIELD_LOCATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {getFieldLocationStatusLabel(status)}
          </option>
        ))}
      </Select>
      <Select label="Equipe" value={filters.team} onChange={(event) => onChange({ ...filters, team: event.target.value })}>
        <option value="all">Todas equipes</option>
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </Select>
      <Checkbox
        label="Somente localização antiga"
        checked={filters.staleOnly}
        onChange={(event) => onChange({ ...filters, staleOnly: event.currentTarget.checked })}
      />
    </section>
  );
}
