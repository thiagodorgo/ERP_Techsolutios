import type { BillingHttpClient } from "../../http/billing-http.client.js";
import type { ProviderEnvironment } from "../../../vault/vault.repository.js";
import type { VaultService } from "../../../vault/vault.service.js";
import { FocusNfeInvoiceAdapter } from "./focusnfe.adapter.js";

export { FocusNfeInvoiceAdapter, type FocusNfeSecretKind, type FocusNfeSecretReader } from "./focusnfe.adapter.js";

export function createFocusNfeAdapter(
  client: BillingHttpClient,
  vault: Pick<VaultService, "readSecretForProvider">,
): FocusNfeInvoiceAdapter {
  const environment = client.environment as ProviderEnvironment;
  return new FocusNfeInvoiceAdapter(client, async (kind) => {
    const secret = await vault.readSecretForProvider("focusnfe", environment, kind);
    return secret?.reveal() ?? null;
  });
}
