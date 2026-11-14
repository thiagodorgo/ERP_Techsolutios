// B-ASS-08c1b (P4) — o predicado ÚNICO "há provedor de PAGAMENTO ligado agora?", extraído de `enabledPaymentPorts`
// (`channel.runtime.ts`, que passa a chamá-lo). Ligado = o canal por env (`BILLING_PROVIDERS_ENABLED`) E o cofre disponível
// E a configuração `enabled` de um provedor de pagamento com adaptador neste pacote. Nunca faz rede e nunca grava: só lê a
// flag, o estado do cofre e a lista de configurações. Canal desligado responde `null` sem tocar no cofre.

import { env } from "../../../config/env.js";
import type { ProviderEnvironment } from "../providers/provider-config.repository.js";
import { getProviderCatalogEntry, type ProviderId } from "../providers/provider.catalog.js";
import type { VaultRuntime } from "../vault/vault.factory.js";

export type PaymentProviderOn = { readonly provider: ProviderId; readonly environment: ProviderEnvironment };

/** O provedor de pagamento ligado agora (um por vez — G14), ou `null`. */
export async function paymentProviderOn(vault: VaultRuntime): Promise<PaymentProviderOn | null> {
  if (!env.BILLING_PROVIDERS_ENABLED) return null;
  if (vault.vault.status() !== "available") return null;
  for (const config of await vault.configs.list()) {
    const entry = getProviderCatalogEntry(config.provider);
    if (!entry || entry.kind !== "payment" || !config.enabled) continue;
    // Portão 1 + 1: só o Asaas tem adaptador ligado neste pacote (Mercado Pago é do B-ASS-15).
    if (entry.id === "asaas") return { provider: entry.id, environment: config.environment };
  }
  return null;
}
