import { useEffect, useMemo, useState } from "react";

import { DENSE_LIST_FETCH_LIMIT } from "../../../components/dense-list";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listCustomersFromApi } from "../customers/customers.service";
import { listServiceCatalogFromApi } from "../service-catalog/service-catalog.service";
import { listWorkOrdersFromApi } from "../../work-orders/work-orders.service";
import type { ServiceQuoteReferenceOption } from "./service-quotes.types";

// Ω3-a — resolve os RÓTULOS humanos das colunas Serviço/OS/Cliente (veto cognicao-visual: UUID cru na
// coluna) e preenche os selects do modal. Espelho de useTariffReferences; reaproveita os services já
// existentes. D-007: em mock/erro voltam vazios (a coluna cai no fallback shortRef, nunca fabrica).
export type ServiceQuoteReferences = {
  readonly services: ServiceQuoteReferenceOption[];
  readonly customers: ServiceQuoteReferenceOption[];
  readonly workOrders: ServiceQuoteReferenceOption[];
  readonly serviceLabelById: ReadonlyMap<string, string>;
  readonly customerLabelById: ReadonlyMap<string, string>;
  readonly workOrderLabelById: ReadonlyMap<string, string>;
  readonly loading: boolean;
};

const REF_FILTERS = { search: "", isActive: "active" as const, limit: DENSE_LIST_FETCH_LIMIT };

export function useServiceQuoteReferences(): ServiceQuoteReferences {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [services, setServices] = useState<ServiceQuoteReferenceOption[]>([]);
  const [customers, setCustomers] = useState<ServiceQuoteReferenceOption[]>([]);
  const [workOrders, setWorkOrders] = useState<ServiceQuoteReferenceOption[]>([]);
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
      const [catalog, clients, orders] = await Promise.all([
        listServiceCatalogFromApi(context, REF_FILTERS),
        listCustomersFromApi(context, REF_FILTERS),
        listWorkOrdersFromApi(context, {}),
      ]);
      if (cancelled) return;
      setServices(catalog.items.map((service) => ({ id: service.id, label: service.name })));
      setCustomers(clients.items.map((customer) => ({ id: customer.id, label: customer.name })));
      setWorkOrders(orders.items.map((order) => ({ id: order.id, label: order.code })));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeContext, context]);

  const serviceLabelById = useMemo(() => new Map(services.map((option) => [option.id, option.label])), [services]);
  const customerLabelById = useMemo(() => new Map(customers.map((option) => [option.id, option.label])), [customers]);
  const workOrderLabelById = useMemo(() => new Map(workOrders.map((option) => [option.id, option.label])), [workOrders]);

  return { services, customers, workOrders, serviceLabelById, customerLabelById, workOrderLabelById, loading };
}
