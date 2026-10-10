import {
  countActiveFilters,
  CUSTOM_PERIOD_LABEL,
  deriveOpeningPeriod,
  isRangeInverted,
  OPENING_PERIOD_OPTIONS,
  openingPeriodRange,
  PRIORITY_FILTER_ORDER,
  type WorkOrdersListFilterState,
} from "../work-orders-list-filters";
import { WORK_ORDER_PRIORITY_LABEL } from "../work-orders-row.logic";
import type { WorkOrderPriority } from "../work-orders.types";

export function WorkOrdersListFilterCard({
  id,
  value,
  now,
  onChange,
  onClear,
}: {
  readonly id: string;
  readonly value: WorkOrdersListFilterState;
  readonly now: Date;
  readonly onChange: (next: WorkOrdersListFilterState) => void;
  readonly onClear: () => void;
}) {
  const period = deriveOpeningPeriod(value, now);

  return (
    <div className="pat-filter-card" id={id} role="group" aria-label="Filtros da lista de ordens de serviço">
      <div className="pat-filter-grid">
        <div className="pat-filter-field">
          <label htmlFor="os-filtro-prioridade">Prioridade</label>
          <select
            id="os-filtro-prioridade"
            value={value.priority}
            onChange={(event) => {
              const priority = event.target.value;
              if (priority !== "all" && !PRIORITY_FILTER_ORDER.includes(priority as WorkOrderPriority)) return;
              onChange({ ...value, priority: priority as WorkOrdersListFilterState["priority"] });
            }}
          >
            <option value="all">Todas as prioridades</option>
            {PRIORITY_FILTER_ORDER.map((priority) => (
              <option key={priority} value={priority}>{WORK_ORDER_PRIORITY_LABEL[priority]}</option>
            ))}
          </select>
        </div>

        <div className="pat-filter-field">
          <label htmlFor="os-filtro-abertura">Data de abertura</label>
          <select
            id="os-filtro-abertura"
            value={period}
            onChange={(event) => {
              const option = OPENING_PERIOD_OPTIONS.find((candidate) => candidate.key === event.target.value);
              if (!option) return;
              const range = openingPeriodRange(option.key, new Date());
              onChange({ ...value, from: range.from, to: range.to });
            }}
          >
            {OPENING_PERIOD_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
            {period === "custom" ? <option value="custom">{CUSTOM_PERIOD_LABEL}</option> : null}
          </select>
        </div>

        <div className="pat-filter-field">
          <label htmlFor="os-filtro-de">De</label>
          <input
            id="os-filtro-de"
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
          />
        </div>

        <div className="pat-filter-field">
          <label htmlFor="os-filtro-ate">Até</label>
          <input
            id="os-filtro-ate"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </div>

        <button type="button" className="pat-btn" disabled={countActiveFilters(value) === 0} onClick={onClear}>
          Limpar
        </button>
      </div>

      {isRangeInverted(value) ? (
        <p role="status" style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "#B45309" }}>
          A data “De” é posterior à data “Até”: nenhuma ordem cabe nesse intervalo.
        </p>
      ) : null}
    </div>
  );
}
