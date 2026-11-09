// B-ASS-06 · F2 — reexport do adaptador Asaas e a fábrica que prende o leitor de segredo ao cofre
// no MESMO ambiente do cliente (A10).

import type { BillingHttpClient } from "../../http/billing-http.client.js";
import type { ProviderEnvironment } from "../../../vault/vault.repository.js";
import type { VaultService } from "../../../vault/vault.service.js";
import { AsaasPaymentAdapter } from "./asaas.adapter.js";

export { AsaasPaymentAdapter, type AsaasSecretKind, type AsaasSecretReader } from "./asaas.adapter.js";
export { asaasStatusToOurs, type AsaasChargeState } from "./asaas.state-map.js";

/** Fábrica do adaptador Asaas: o segredo vem do `readSecretForProvider` do MESMO ambiente do cliente (A10). */
export function createAsaasAdapter(
  client: BillingHttpClient,
  vault: Pick<VaultService, "readSecretForProvider">,
): AsaasPaymentAdapter {
  const environment = client.environment as ProviderEnvironment;
  return new AsaasPaymentAdapter(client, async (kind) => {
    const secret = await vault.readSecretForProvider("asaas", environment, kind);
    return secret?.reveal() ?? null;
  });
}
