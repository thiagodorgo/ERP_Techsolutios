// B-ASS-05 · F3 — o CATÁLOGO dos 6 provedores (plano §4.5, R-VLT-8). Lista FECHADA: provedor fora dela não existe.
//
// Hosts, autenticação e itens pendentes copiados da pesquisa `PESQUISA-pagamento-nota.md` (Partes 1, 2 e 4,
// lidas em 2026-10-31). Nada aqui chama a rede: os hosts são só o que os adaptadores (B-ASS-06..08) vão usar.
// Nenhum preço nem tarifa entra no catálogo.

import type { CredentialKind } from "../vault/vault.repository.js";

export const PROVIDER_IDS = ["asaas", "iugu", "mercadopago", "focusnfe", "nfeio", "plugnotas"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type ProviderKind = "payment" | "invoice";

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

/** Campos fiscais do emissor que todo provedor de nota exige (NFS-e Nacional). */
export const BASE_FISCAL_FIELDS = ["cnpj", "regimeTributario", "municipioIbge", "cTribNac"] as const;

export type ProviderCatalogEntry = {
  readonly id: ProviderId;
  readonly label: string;
  readonly kind: ProviderKind;
  /** Base da API por ambiente. Igual nos dois quando o provedor decide o ambiente pelo token (pesquisa P2, P3, N2). */
  readonly hosts: { readonly sandbox: string; readonly production: string };
  /** Os kinds de credencial que o provedor aceita no cofre. */
  readonly credentialKinds: readonly CredentialKind[];
  /** Os campos fiscais obrigatórios para a nota sair (vazio para pagamento). */
  readonly requiredFiscalFields: readonly string[];
  /** O que só uma credencial real de sandbox provaria (pesquisa, Parte 4): monitorar na 1ª operação real. */
  readonly pendingHomologation: readonly string[];
};

const PAYMENT_CREDENTIALS: readonly CredentialKind[] = ["api_token", "webhook_secret"];
const INVOICE_CREDENTIALS: readonly CredentialKind[] = ["api_token", "webhook_secret", "certificate"];

export const PROVIDER_CATALOG: Readonly<Record<ProviderId, ProviderCatalogEntry>> = {
  asaas: {
    id: "asaas",
    label: "Asaas",
    kind: "payment",
    // P1 "O que precisa para usar": sandbox e produção são contas e hosts separados.
    hosts: { sandbox: "https://api-sandbox.asaas.com/v3", production: "https://api.asaas.com/v3" },
    credentialKinds: PAYMENT_CREDENTIALS,
    requiredFiscalFields: [],
    pendingHomologation: ["credit_card_without_data_saves_card", "webhook_queue_2xx_vs_200", "real_timeout", "sandbox_ips", "net_value_after_fees", "confirmation_event_delay"],
  },
  iugu: {
    id: "iugu",
    label: "Iugu",
    kind: "payment",
    // P2: "Não há URL de sandbox separada: o tipo de token decide o ambiente" (test_token × live_token).
    hosts: { sandbox: "https://api.iugu.com/v1", production: "https://api.iugu.com/v1" },
    credentialKinds: PAYMENT_CREDENTIALS,
    requiredFiscalFields: [],
    pendingHomologation: ["trigger_authorization_shape", "form_encoded_body", "automatic_retry_count", "only_on_charge_success_name", "rate_limit", "net_value_after_fees", "confirmation_event_delay"],
  },
  mercadopago: {
    id: "mercadopago",
    label: "Mercado Pago",
    kind: "payment",
    // P3: "mesma para teste e produção; o token decide. Não há host de sandbox."
    hosts: { sandbox: "https://api.mercadopago.com", production: "https://api.mercadopago.com" },
    credentialKinds: PAYMENT_CREDENTIALS,
    requiredFiscalFields: [],
    pendingHomologation: ["error_json_body", "cnpj_identification_pix_boleto", "boleto_digitable_line", "subscription_topic_shape", "cancelled_vs_canceled", "subscription_webhook_in_panel", "net_value_after_fees", "confirmation_event_delay"],
  },
  focusnfe: {
    id: "focusnfe",
    label: "Focus NFe",
    kind: "invoice",
    // N1: homologação e produção têm hosts próprios; muda a URL e o token.
    hosts: { sandbox: "https://homologacao.focusnfe.com.br/v2", production: "https://api.focusnfe.com.br/v2" },
    credentialKinds: INVOICE_CREDENTIALS,
    requiredFiscalFields: [...BASE_FISCAL_FIELDS, "tributacaoIss", "regimeEspecialTributacao", "codigoOpcaoSimplesNacional", "serieDps"],
    pendingHomologation: ["municipality_rejection", "tokens_in_post_empresas", "ref_in_webhook_body", "xml_path_host", "cancel_code_field", "nfsen_ref_hook", "nt009_cutover"],
  },
  nfeio: {
    id: "nfeio",
    label: "NFE.io",
    kind: "invoice",
    // N2: sem URL de sandbox (o ambiente é da inscrição municipal); empresa, certificado e webhook em api.nfse.io,
    // emissão e consulta de nota em api.nfe.io. Aqui fica o host da emissão; o adaptador (B-ASS-07) usa os dois.
    hosts: { sandbox: "https://api.nfe.io", production: "https://api.nfe.io" },
    credentialKinds: INVOICE_CREDENTIALS,
    requiredFiscalFields: [...BASE_FISCAL_FIELDS, "companyId", "municipalTaxStatus"],
    pendingHomologation: ["municipality_rejection", "hub_signature_hash_and_prefix", "account_id", "repeated_external_id", "force_national_environment", "full_schema", "nt009_cutover"],
  },
  plugnotas: {
    id: "plugnotas",
    label: "PlugNotas",
    kind: "invoice",
    // N3: produção em api.plugnotas.com.br, sandbox em api.sandbox.plugnotas.com.br (token público de sandbox:
    // compartilhado, nunca dado real nele).
    hosts: { sandbox: "https://api.sandbox.plugnotas.com.br", production: "https://api.plugnotas.com.br" },
    credentialKinds: INVOICE_CREDENTIALS,
    requiredFiscalFields: [...BASE_FISCAL_FIELDS, "issAliquota", "issTipoTributacao", "issExigibilidade"],
    pendingHomologation: ["municipality_rejection", "webhook_real_body", "situacao_enum", "company_without_other_blocks", "global_rate_limit", "nt009_cutover"],
  },
};

export function getProviderCatalogEntry(provider: string): ProviderCatalogEntry | null {
  return isProviderId(provider) ? PROVIDER_CATALOG[provider] : null;
}
