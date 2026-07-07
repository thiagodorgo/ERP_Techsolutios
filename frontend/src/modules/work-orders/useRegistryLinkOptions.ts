import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { listCustomersFromApi } from "../registry/customers/customers.service";
import type { Customer } from "../registry/customers/customers.types";
import { listServiceCatalogFromApi } from "../registry/service-catalog/service-catalog.service";
import type { ServiceItem } from "../registry/service-catalog/service-catalog.types";
import { listTeamsFromApi, listTenantUsers } from "../registry/teams/teams.service";
import type { Team, TenantUser } from "../registry/teams/teams.types";
import { listVehiclesFromApi } from "../registry/vehicles/vehicles.service";
import type { Vehicle } from "../registry/vehicles/vehicles.types";

// B1 (OS integrada): carrega, uma vez, os cadastros mesclados (A1-A4) para popular os
// seletores de vínculo do formulário de OS. D-007: nunca fabrica linhas — se uma lista
// falhar ou vier vazia, o seletor correspondente exibe só a opção "Sem ...".
//
// B2 (cadastro rápido): expõe o `context` compartilhado (mesmos claims usados nas listas),
// a lista de usuários da organização (necessária ao modal de Equipe) e `addOption`, que
// injeta na hora um cadastro recém-criado no seletor correspondente sem novo fetch.

// Contexto de API compartilhado pelos quatro cadastros (estruturalmente igual a
// CustomersApiContext / VehiclesApiContext / TeamsApiContext / ServiceCatalogApiContext).
export type RegistryLinkContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type RegistryLinkKind = "customer" | "vehicle" | "team" | "service";

export type RegistryLinkEntity = Customer | Vehicle | Team | ServiceItem;

export type RegistryLinkOptions = {
  readonly customers: Customer[];
  readonly vehicles: Vehicle[];
  readonly teams: Team[];
  readonly services: ServiceItem[];
  readonly users: TenantUser[];
  readonly loading: boolean;
  readonly context: RegistryLinkContext;
  readonly addOption: (kind: RegistryLinkKind, entity: RegistryLinkEntity) => void;
};

// Prepende um cadastro recém-criado e remove duplicata pelo id (o novo vence).
// Puro e testável em isolamento — base do "append+select" do cadastro rápido (B2).
export function prependRegistryOption<T extends { readonly id: string }>(list: readonly T[], entity: T): T[] {
  return [entity, ...list.filter((item) => item.id !== entity.id)];
}

export function useRegistryLinkOptions(): RegistryLinkOptions {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);

  const context = useMemo<RegistryLinkContext>(
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
      const [customersData, vehiclesData, teamsData, servicesData, usersData] = await Promise.all([
        listCustomersFromApi(context, { search: "", isActive: "active" }),
        listVehiclesFromApi(context),
        listTeamsFromApi(context),
        listServiceCatalogFromApi(context),
        // Usuários alimentam o seletor de líder no cadastro rápido de Equipe; degrada para [].
        listTenantUsers(context),
      ]);

      if (cancelled) return;
      // Cliente: apenas cadastros ativos podem ser vinculados a uma nova OS.
      setCustomers(customersData.items.filter((item) => item.isActive));
      setVehicles(vehiclesData.items);
      setTeams(teamsData.items);
      setServices(servicesData.items);
      setUsers(usersData);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeContext, context]);

  // Injeta um cadastro recém-criado (via modal de cadastro rápido) no topo do seletor,
  // deixando-o imediatamente selecionável sem recarregar as listas.
  const addOption = useCallback((kind: RegistryLinkKind, entity: RegistryLinkEntity) => {
    switch (kind) {
      case "customer":
        setCustomers((prev) => prependRegistryOption(prev, entity as Customer));
        break;
      case "vehicle":
        setVehicles((prev) => prependRegistryOption(prev, entity as Vehicle));
        break;
      case "team":
        setTeams((prev) => prependRegistryOption(prev, entity as Team));
        break;
      case "service":
        setServices((prev) => prependRegistryOption(prev, entity as ServiceItem));
        break;
    }
  }, []);

  return { customers, vehicles, teams, services, users, loading, context, addOption };
}
