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
// existentes. D-007: em ERRO as listas voltam vazias (a coluna cai no fallback shortRef, nunca fabrica); em modo de
// demonstração explícito (`VITE_USE_MOCKS=true`) a coluna de OS recebe os itens de demonstração do service de OS (6, e a
// de clientes volta vazia — medido no plano do B-SAN3-01b): este hook não decide o modo, só repassa o que os services devolvem.
// B-SAN3-01b: este arquivo é RAIZ do guard `[G1]`/`[G1b]` (`work-orders-honest-errors.test.tsx`), que prova por alcance em
// profundidade arbitrária (barrel de N níveis, re-export local, `default`, namespace, `import()`) e por todo o fecho de
// import que identificador de origem mock só chega aqui pelo ramo verdadeiro de `isMockMode()` dos services, e que nenhuma
// entidade inline (`id`/`code` constante) nasce em ramo de falha. O que o guard não prova: ramo de falha sem
// `catch`/`.catch(`/`??`/`||`, identidade por outra chave ou não constante, dado de demonstração fora de `*.mock`/`mocks/`.
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
