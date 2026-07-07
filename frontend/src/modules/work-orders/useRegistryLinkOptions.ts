import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { listCustomersFromApi } from "../registry/customers/customers.service";
import type { Customer } from "../registry/customers/customers.types";
import { listServiceCatalogFromApi } from "../registry/service-catalog/service-catalog.service";
import type { ServiceItem } from "../registry/service-catalog/service-catalog.types";
import { listTeamsFromApi } from "../registry/teams/teams.service";
import type { Team } from "../registry/teams/teams.types";
import { listVehiclesFromApi } from "../registry/vehicles/vehicles.service";
import type { Vehicle } from "../registry/vehicles/vehicles.types";

// B1 (OS integrada): carrega, uma vez, os cadastros mesclados (A1-A4) para popular os
// seletores de vínculo do formulário de OS. D-007: nunca fabrica linhas — se uma lista
// falhar ou vier vazia, o seletor correspondente exibe só a opção "Sem ...".
export type RegistryLinkOptions = {
  readonly customers: Customer[];
  readonly vehicles: Vehicle[];
  readonly teams: Team[];
  readonly services: ServiceItem[];
  readonly loading: boolean;
};

export function useRegistryLinkOptions(): RegistryLinkOptions {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  useEffect(() => {
    if (!activeContext) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [customersData, vehiclesData, teamsData, servicesData] = await Promise.all([
        listCustomersFromApi(context, { search: "", isActive: "active" }),
        listVehiclesFromApi(context),
        listTeamsFromApi(context),
        listServiceCatalogFromApi(context),
      ]);

      if (cancelled) return;
      // Cliente: apenas cadastros ativos podem ser vinculados a uma nova OS.
      setCustomers(customersData.items.filter((item) => item.isActive));
      setVehicles(vehiclesData.items);
      setTeams(teamsData.items);
      setServices(servicesData.items);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeContext, context]);

  return { customers, vehicles, teams, services, loading };
}
