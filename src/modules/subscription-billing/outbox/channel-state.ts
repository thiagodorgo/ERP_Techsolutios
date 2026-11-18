// B-ASS-08c1b (P4) — o predicado ÚNICO "há provedor de PAGAMENTO ligado agora?", extraído de `enabledPaymentPorts`
// (`channel.runtime.ts`, que passa a chamá-lo). Ligado = o canal por env (`BILLING_PROVIDERS_ENABLED`) E o cofre disponível
// E a configuração `enabled` de um provedor de pagamento com adaptador neste pacote. Nunca faz rede e nunca grava: só lê a
// flag, o estado do cofre e a lista de configurações. Canal desligado responde `null` sem tocar no cofre.

import { env } from "../../../config/env.js";
import type { ProviderEnvironment } from "../providers/provider-config.repository.js";
import { getProviderCatalogEntry, type ProviderId } from "../providers/provider.catalog.js";
import type { VaultRuntime } from "../vault/vault.factory.js";
import type { InvoiceIntents } from "../statements/statement-settlement.service.js";

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

/** B-ASS-08c2 (plano de abertura §4.1 item 1) — o predicado "há provedor de NOTA ligado agora?", extraído de
 * `enabledInvoicePorts` (`channel.runtime.ts`, que passa a chamá-lo e só monta os adaptadores), ao lado do de pagamento.
 * Ligado = o canal por env E o cofre disponível E a configuração `enabled` de um provedor de nota com adaptador neste
 * pacote. Nunca faz rede e nunca grava. Canal desligado responde `[]` sem tocar no cofre. */
export async function invoiceProvidersOn(vault: VaultRuntime): Promise<readonly ProviderId[]> {
  if (!env.BILLING_PROVIDERS_ENABLED) return [];
  if (vault.vault.status() !== "available") return [];
  const on: ProviderId[] = [];
  for (const config of await vault.configs.list()) {
    const entry = getProviderCatalogEntry(config.provider);
    if (!entry || entry.kind !== "invoice" || !config.enabled) continue;
    // Portão 1 + 1: só o Focus NFe tem adaptador ligado neste pacote (NFE.io e PlugNotas são do B-ASS-15).
    if (entry.id === "focusnfe" && !on.includes(entry.id)) on.push(entry.id);
  }
  return on;
}

/** B-ASS-08c2 (§4.1 item 1): para onde vai a intenção de nota AGORA — o `issueTarget` (o provedor de nota com a configuração
 * `enabled`; senão o configurado mais recente; senão o Focus NFe) e os provedores de nota ligados. É o `enabledInvoiceProvider`
 * mais o `invoiceIssueTarget` que viviam em `channel.runtime.ts`, movidos SEM mudar a regra: `enabled` = há porta ligada para
 * ele agora (o mesmo predicado de `invoiceProvidersOn`). Lido ANTES da transação (v2 §10 D3); nunca faz rede. */
export async function invoiceIntentsNow(vault: VaultRuntime): Promise<InvoiceIntents> {
  const enabledInvoiceProviders = await invoiceProvidersOn(vault);
  const configs = await vault.configs.list();
  let provider: string | null = null;
  for (const config of configs) {
    const entry = getProviderCatalogEntry(config.provider);
    if (entry?.kind === "invoice" && config.enabled) {
      provider = entry.id;
      break;
    }
  }
  if (!provider) {
    const configured = configs
      .filter((config) => getProviderCatalogEntry(config.provider)?.kind === "invoice")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    provider = configured[0]?.provider ?? "focusnfe";
  }
  return { issueTarget: { provider, enabled: (enabledInvoiceProviders as readonly string[]).includes(provider) }, enabledInvoiceProviders };
}
