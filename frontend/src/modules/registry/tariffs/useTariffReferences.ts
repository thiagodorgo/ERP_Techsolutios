import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { DENSE_LIST_FETCH_LIMIT } from "../../../components/dense-list";
import { listCustomersFromApi } from "../customers/customers.service";
import { listPriceTablesFromApi } from "../price-tables/price-tables.service";
import { listServiceCatalogFromApi } from "../service-catalog/service-catalog.service";
import type { TariffReferenceOption } from "./tariffs.types";

// Carrega as telas de referência que preenchem o formulário de Tarifas e resolvem os rótulos
// das colunas (Serviço/Cliente) da lista: Tabelas de Valores, Serviços e Clientes.
// Reaproveita os services já existentes desses módulos (D-007: em mock/erro voltam vazios).
export type TariffReferences = {
  readonly priceTables: TariffReferenceOption[];
  readonly services: TariffReferenceOption[];
  readonly customers: TariffReferenceOption[];
  readonly serviceLabelById: ReadonlyMap<string, string>;
  readonly customerLabelById: ReadonlyMap<string, string>;
  readonly priceTableLabelById: ReadonlyMap<string, string>;
  readonly loading: boolean;
};

const REF_FILTERS = { search: "", isActive: "active" as const, limit: DENSE_LIST_FETCH_LIMIT };

export function useTariffReferences(): TariffReferences {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [priceTables, setPriceTables] = useState<TariffReferenceOption[]>([]);
  const [services, setServices] = useState<TariffReferenceOption[]>([]);
  const [customers, setCustomers] = useState<TariffReferenceOption[]>([]);
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
      const [tables, catalog, clients] = await Promise.all([
        listPriceTablesFromApi(context, REF_FILTERS),
        listServiceCatalogFromApi(context, REF_FILTERS),
        listCustomersFromApi(context, REF_FILTERS),
      ]);
      if (cancelled) return;
      setPriceTables(tables.items.map((table) => ({ id: table.id, label: table.name })));
      setServices(catalog.items.map((service) => ({ id: service.id, label: service.name })));
      setCustomers(clients.items.map((customer) => ({ id: customer.id, label: customer.name })));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeContext, context]);

  const priceTableLabelById = useMemo(() => new Map(priceTables.map((option) => [option.id, option.label])), [priceTables]);
  const serviceLabelById = useMemo(() => new Map(services.map((option) => [option.id, option.label])), [services]);
  const customerLabelById = useMemo(() => new Map(customers.map((option) => [option.id, option.label])), [customers]);

  return { priceTables, services, customers, priceTableLabelById, serviceLabelById, customerLabelById, loading };
}
