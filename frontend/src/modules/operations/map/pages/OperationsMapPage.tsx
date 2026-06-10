import { AlertTriangle, Map, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Chip, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import {
  calculateOperationsMapSummary,
  filterFieldLocations,
  formatFieldLocationDate,
  listOperationTeams,
} from "../operations-map.adapter";
import type { FieldLocationItem, OperationsMapFilters as OperationsMapFilterState } from "../operations-map.types";
import { useOperationsMap } from "../useOperationsMap";
import { OperationsMapCanvas } from "../components/OperationsMapCanvas";
import { OperationsMapFilters } from "../components/OperationsMapFilters";
import { OperationsMapSummaryCards } from "../components/OperationsMapSummaryCards";
import { OperationsOperatorDetailPanel } from "../components/OperationsOperatorDetailPanel";
import { OperationsOperatorList } from "../components/OperationsOperatorList";

const initialFilters: OperationsMapFilterState = {
  status: "all",
  team: "all",
  staleOnly: false,
  search: "",
};

export function OperationsMapPage() {
  const { locations, source, fallbackReason, loading, error, refreshedAt, refresh } = useOperationsMap();
  const { can } = usePermissions();
  const [filters, setFilters] = useState<OperationsMapFilterState>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const canReadWorkOrders = can("work_orders:read");
  const canReadDispatches = can("field_dispatch:read");
  const canCreateDispatches = can("field_dispatch:create");
  const teams = useMemo(() => listOperationTeams(locations), [locations]);
  const filteredLocations = useMemo(() => filterFieldLocations(locations, filters), [filters, locations]);
  const summary = useMemo(() => calculateOperationsMapSummary(locations), [locations]);
  const selectedLocation =
    filteredLocations.find((location) => location.id === selectedId) ??
    filteredLocations[0] ??
    locations.find((location) => location.id === selectedId);

  useEffect(() => {
    if (!selectedId && filteredLocations[0]) {
      setSelectedId(filteredLocations[0].id);
    }
  }, [filteredLocations, selectedId]);

  return (
    <div className="page-stack operations-map-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operação em campo</span>
          <h1>Mapa Operacional</h1>
          <p>Acompanhe a última localização conhecida dos operadores em campo.</p>
        </div>
        <div className="operations-map-actions">
          <Chip tone={source === "api" ? "success" : source === "fallback" ? "warning" : "info"}>
            Fonte: {source === "api" ? "API real" : source === "fallback" ? "fallback seguro" : "mock local"}
          </Chip>
          {canReadWorkOrders ? <Chip tone="info">OS vinculadas</Chip> : null}
          {canReadDispatches ? <Chip tone="info">Despachos vinculados</Chip> : null}
          {refreshedAt ? <Chip tone="default">Atualizado {formatFieldLocationDate(refreshedAt)}</Chip> : null}
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>
      </header>

      {source === "fallback" ? (
        <Alert title="Fallback seguro ativo" tone="warning">
          {fallbackReason ?? "A tela esta usando dados locais seguros ate a API retornar dados."}
        </Alert>
      ) : null}
      {error ? (
        <Alert title="Fonte de dados degradada" tone="warning">
          {error}
        </Alert>
      ) : null}

      <OperationsMapSummaryCards summary={summary} />
      <OperationsMapFilters filters={filters} teams={teams} onChange={setFilters} />

      {loading && locations.length === 0 ? <Skeleton lines={4} /> : null}
      {!loading && locations.length === 0 && source === "api" ? (
        <EmptyState title="Nenhum operador localizado" detail="A API nao retornou localizacoes para o tenant atual." />
      ) : null}
      {!loading && locations.length > 0 && filteredLocations.length === 0 ? (
        <ErrorState title="Nenhum resultado para os filtros" detail="Ajuste status, equipe, busca ou filtro de localizacao antiga." />
      ) : null}

      {filteredLocations.length > 0 ? (
        <section className="operations-map-layout">
          <div className="operations-map-main">
            <OperationsMapCanvas
              locations={filteredLocations}
              selectedId={selectedLocation?.id}
              onSelect={(location: FieldLocationItem) => setSelectedId(location.id)}
              showDispatches={canReadDispatches}
            />
            <OperationsOperatorList
              locations={filteredLocations}
              selectedId={selectedLocation?.id}
              onSelect={(location) => setSelectedId(location.id)}
              showWorkOrders={canReadWorkOrders}
              showDispatches={canReadDispatches}
              canCreateDispatch={canCreateDispatches}
            />
          </div>
          <aside className="operations-map-side">
            <OperationsOperatorDetailPanel
              location={selectedLocation}
              showWorkOrder={canReadWorkOrders}
              showDispatch={canReadDispatches}
              canCreateDispatch={canCreateDispatches}
            />
            <Alert title="Privacidade operacional" tone="info">
              Localização é dado sensível. O frontend não registra coordenadas em logs e o acesso real continua protegido por RBAC/RLS no backend.
            </Alert>
            <Alert title="Limite desta etapa" tone="info">
              <span><Map size={16} /> Google Maps, roteirização e tempo real serão adicionados em etapas futuras.</span>
            </Alert>
          </aside>
        </section>
      ) : null}

      {locations.some((location) => location.isStale) ? (
        <Alert title="Há localização antiga" tone="warning">
          <span><AlertTriangle size={16} /> Registros com mais de 15 minutos aparecem destacados para revisão operacional.</span>
        </Alert>
      ) : null}
    </div>
  );
}
