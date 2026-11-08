// B-ASS-05 · F3 — catálogo dos provedores e configuração sem segredo (plano §4.5, R-VLT-8 e R-VLT-12).
// Mutação do plano: lista única de campos obrigatórios para os 3 provedores de nota → T-VLT-19 vermelho.

import assert from "node:assert/strict";
import test from "node:test";

import { PROVIDER_CATALOG, PROVIDER_IDS } from "../src/modules/subscription-billing/providers/provider.catalog.js";
import { InMemoryProviderConfigRepository } from "../src/modules/subscription-billing/providers/provider-config.repository.js";
import { ProviderConfigError, ProviderConfigService, type ProviderCredentialSummaries } from "../src/modules/subscription-billing/providers/provider-config.service.js";

const NO_CREDENTIALS: ProviderCredentialSummaries = { async list() { return []; } };

function setup(credentials: ProviderCredentialSummaries = NO_CREDENTIALS) {
  const repository = new InMemoryProviderConfigRepository();
  return { repository, service: new ProviderConfigService(repository, credentials, () => new Date("2026-11-06T15:00:00Z")) };
}

// Um CNPJ numérico válido de exemplo (dígitos verificadores corretos) e um alfanumérico válido.
const CNPJ = "11.222.333/0001-81";
const CNPJ_ALFA = "12ABC34501DE35";

const BASE = { cnpj: CNPJ, regimeTributario: "simples_nacional", municipioIbge: "3550308", cTribNac: "010701" };
const FOCUS = { ...BASE, tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: "1" };
const PLUGNOTAS = { ...BASE, issAliquota: 2, issTipoTributacao: "1", issExigibilidade: "1" };
const NFEIO = { ...BASE, companyId: "comp-123", municipalTaxStatus: "Active" };

const rejects = (status: number, reason: string) => (error: unknown) =>
  error instanceof ProviderConfigError && error.status === status && error.reason === reason;

test("T-VLT-14b · o catálogo tem os 6 provedores, com kind, hosts e os kinds de credencial", () => {
  assert.deepEqual([...PROVIDER_IDS], ["asaas", "iugu", "mercadopago", "focusnfe", "nfeio", "plugnotas"]);
  for (const id of PROVIDER_IDS) {
    const entry = PROVIDER_CATALOG[id];
    assert.match(entry.hosts.sandbox, /^https:\/\//);
    assert.match(entry.hosts.production, /^https:\/\//);
    assert.ok(entry.pendingHomologation.length > 0, `${id} tem item pendente de homologação`);
    assert.equal(entry.credentialKinds.includes("certificate"), entry.kind === "invoice", `${id}: certificado só para nota`);
    assert.equal(entry.requiredFiscalFields.length === 0, entry.kind === "payment");
  }
});

test("T-VLT-15 · dados fiscais válidos e completos de cada provedor de nota → fiscalDataComplete", async () => {
  const { service } = setup();
  for (const [provider, settings] of [["focusnfe", FOCUS], ["plugnotas", PLUGNOTAS], ["nfeio", NFEIO]] as const) {
    const view = await service.updateSettings(provider, { environment: "sandbox", settings });
    assert.equal(view.fiscalDataComplete, true, `${provider}: ${view.missing.join(",")}`);
    assert.deepEqual(view.missing, []);
    assert.equal(view.settings.nfseRoute, "nacional", "nfseRoute padrão");
    assert.equal(view.settings.cnpj, "11222333000181", "CNPJ normalizado");
  }
  const alpha = await service.updateSettings("focusnfe", { settings: { ...FOCUS, cnpj: CNPJ_ALFA } });
  assert.equal(alpha.settings.cnpj, CNPJ_ALFA, "CNPJ alfanumérico aceito");
});

test("T-VLT-16 · incompleto é aceito como rascunho, com missing[] exato; campo inválido → 400", async () => {
  const { service } = setup();
  const draft = await service.updateSettings("focusnfe", { settings: { cnpj: CNPJ, municipioIbge: "3550308" } });
  assert.equal(draft.fiscalDataComplete, false);
  assert.deepEqual(draft.missing, ["regimeTributario", "cTribNac", "tributacaoIss", "regimeEspecialTributacao", "codigoOpcaoSimplesNacional", "serieDps"]);
  await assert.rejects(service.updateSettings("focusnfe", { settings: { ...FOCUS, municipioIbge: "355030" } }), rejects(400, "invalid_fiscal_field"));
  await assert.rejects(service.updateSettings("focusnfe", { settings: { ...FOCUS, cTribNac: "01A701" } }), rejects(400, "invalid_fiscal_field"));
  await assert.rejects(service.updateSettings("focusnfe", { settings: { ...FOCUS, cnpj: "11.222.333/0001-82" } }), rejects(400, "invalid_fiscal_field"));
  await assert.rejects(service.updateSettings("focusnfe", { settings: { ...FOCUS, cnpj: "529.982.247-25" } }), rejects(400, "invalid_fiscal_field"), "CPF não é emissor");
  await assert.rejects(service.updateSettings("focusnfe", { settings: { ...FOCUS, nfseRoute: "estadual" } }), rejects(400, "invalid_fiscal_field"));
  // O inválido não foi gravado: o rascunho de antes continua.
  assert.equal((await service.get("focusnfe")).settings.municipioIbge, "3550308");
});

test("T-VLT-19 · completo é POR PROVEDOR: o conjunto da Focus está incompleto para NFE.io e PlugNotas", async () => {
  const { service } = setup();
  const focus = await service.updateSettings("focusnfe", { settings: FOCUS });
  const nfeio = await service.updateSettings("nfeio", { settings: FOCUS });
  const plugnotas = await service.updateSettings("plugnotas", { settings: FOCUS });
  assert.equal(focus.fiscalDataComplete, true);
  assert.deepEqual(nfeio.missing, ["companyId", "municipalTaxStatus"]);
  assert.deepEqual(plugnotas.missing, ["issAliquota", "issTipoTributacao", "issExigibilidade"]);
  const notActive = await service.updateSettings("nfeio", { settings: { ...NFEIO, municipalTaxStatus: "Pending" } });
  assert.deepEqual(notActive.missing, ["municipalTaxStatus"], "NFE.io só completa com Active");
  assert.equal((await service.updateSettings("asaas", { settings: {} })).fiscalDataComplete, true, "pagamento não tem campo fiscal");
});

test("T-VLT-24 · trocar o ambiente com o provedor ligado → 422 disable_first; desligado troca", async () => {
  const { service, repository } = setup();
  await service.updateSettings("asaas", { environment: "sandbox", settings: {} });
  repository.setEnabledForTests("asaas", true);
  await assert.rejects(service.updateSettings("asaas", { environment: "production" }), rejects(422, "disable_first"));
  assert.equal((await service.updateSettings("asaas", { environment: "sandbox", settings: { nota: "x" } })).environment, "sandbox", "mesmo ambiente, ligado: aceita");
  repository.setEnabledForTests("asaas", false);
  assert.equal((await service.updateSettings("asaas", { environment: "production" })).environment, "production");
});

test("T-VLT-24b · segredo em settings → 400 secret_in_settings, em qualquer grafia", async () => {
  const { service } = setup();
  for (const key of ["secret", "apiToken", "api_key", "apiKey", "password", "Senha", "pfxBase64", "certificado", "webhookSecret"]) {
    await assert.rejects(service.updateSettings("focusnfe", { settings: { ...FOCUS, [key]: "SECRET-ABC123-XYZ" } }), rejects(400, "secret_in_settings"), key);
  }
  assert.equal((await service.get("focusnfe")).configured, false, "nada foi gravado");
});

test("T-VLT-24c · provedor desconhecido → 404; ambiente inválido → 400; a lista traz os 6, configurados ou não", async () => {
  const { service } = setup();
  await assert.rejects(service.get("pagseguro"), rejects(404, "provider_not_found"));
  await assert.rejects(service.updateSettings("pagseguro", { settings: {} }), rejects(404, "provider_not_found"));
  await assert.rejects(service.updateSettings("asaas", { environment: "staging" }), rejects(400, "invalid_environment"));
  const list = await service.list();
  assert.deepEqual(list.map((view) => view.provider), [...PROVIDER_IDS]);
  assert.ok(list.every((view) => view.enabled === false && view.configured === false && view.environment === "sandbox"));
});

test("T-VLT-24d · a visão traz as credenciais só como resumo (kind, impressão digital, last4, data)", async () => {
  const credentials: ProviderCredentialSummaries = {
    async list(provider, environment) {
      return provider === "asaas" && environment === "sandbox"
        ? [{ kind: "api_token", fingerprint: "0123456789abcdef", last4: "-XYZ", createdAt: new Date("2026-11-06T12:00:00Z"), keyVersion: 1 }]
        : [];
    },
    async readability() {
      return { configured: true, readable: false };
    },
  };
  const { service } = setup(credentials);
  const view = await service.get("asaas");
  assert.deepEqual(view.credentials, [{ kind: "api_token", fingerprint: "0123456789abcdef", last4: "-XYZ", createdAt: "2026-11-06T12:00:00.000Z" }]);
  assert.equal(view.credentialsReadable, false);
});
