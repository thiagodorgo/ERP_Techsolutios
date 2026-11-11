// B-ASS-08b · G12 (§11 (a) do conserto-c2): o id do CLIENTE no provedor fica guardado no perfil da organização
// (`tenant_billing_profiles.<provedor>_customer_id`) depois do `ensureCustomer`. Serve a duas coisas: o R-WH-5 (o reconcile
// confere o cliente da cobrança reconsultada contra o da organização — sem o id guardado, a conferência não tem com o que
// comparar) e a economia de rede (o `ensureCustomer` busca pelo documento antes de criar, então repetir é seguro, só custa).
// O valor vem SEMPRE do provedor, depois do gate do perfil (R-PRF-1); o payload da fila nunca o decide.

import type { CustomerResolution, DispatcherDeps } from "../outbox/outbox.dispatcher.js";

/** O cliente no provedor por organização. Provedor sem coluna própria → `get` devolve `null` e `set` não grava nada. */
export interface ProviderCustomerStore {
  get(tenantId: string, provider: string): Promise<string | null>;
  set(tenantId: string, provider: string, customerId: string, now: Date): Promise<void>;
}

/** Os provedores de pagamento que têm coluna no perfil (lista FECHADA: outro provedor não grava nada). */
export const PROVIDER_CUSTOMER_COLUMNS: Readonly<Record<string, "asaas_customer_id" | "mp_customer_id">> = {
  asaas: "asaas_customer_id",
  mercadopago: "mp_customer_id",
};

export class InMemoryProviderCustomerStore implements ProviderCustomerStore {
  readonly #ids = new Map<string, string>();

  async get(tenantId: string, provider: string): Promise<string | null> {
    return this.#ids.get(`${tenantId}::${provider}`) ?? null;
  }

  async set(tenantId: string, provider: string, customerId: string, _now: Date): Promise<void> {
    if (!PROVIDER_CUSTOMER_COLUMNS[provider]) return;
    this.#ids.set(`${tenantId}::${provider}`, customerId);
  }
}

/** O `resolveCustomer` do despacho que, resolvido o cliente pelo perfil (`profileCustomerResolver`), guarda o id no perfil.
 * Roda FORA de transação, depois da rede (R-OBX-1); uma falha ao gravar cai no backoff da linha, como qualquer erro. */
export function persistingCustomerResolver(
  resolve: DispatcherDeps["resolveCustomer"],
  store: ProviderCustomerStore,
  now: () => Date = () => new Date(),
): DispatcherDeps["resolveCustomer"] {
  return async (row, port): Promise<CustomerResolution> => {
    const resolution = await resolve(row, port);
    if (resolution.ok) await store.set(row.tenantId, row.provider, resolution.customerId, now());
    return resolution;
  };
}
