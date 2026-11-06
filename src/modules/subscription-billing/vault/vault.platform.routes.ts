// B-ASS-05 · F4 — rotas de PLATAFORMA do cofre e dos provedores (contrato §3.5), sob
// `platform:billing-providers:manage`. Nenhuma chamada externa: o canal (test-connection, enable, webhook,
// emitter, métricas, eventos) é do B-ASS-08, e aqui essas rotas não existem (404).
//
// O SEGREDO NUNCA SAI: a resposta da credencial é o resumo mascarado; nenhuma rota loga `request.body`; a trilha
// passa pela allowlist própria (`pickBillingAuditMetadata`). O tipo da credencial tem de ser um dos que o
// provedor aceita (certificado só para provedor de nota).

import { Router, type Request } from "express";

import { handleAsyncRoute, readRouteParam } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { pickBillingAuditMetadata } from "../platform-audit/audit-metadata.js";
import { getProviderCatalogEntry } from "../providers/provider.catalog.js";
import { ProviderConfigError } from "../providers/provider-config.service.js";
import { createDefaultVaultRuntime } from "./vault.factory.js";
import { isCredentialKind, VaultServiceError, type CredentialInput } from "./vault.service.js";

const PERMISSION = "platform:billing-providers:manage";

function actorId(request: Request): string | null {
  return request.actor?.userId ?? null;
}

function body(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" && !Array.isArray(request.body) ? (request.body as Record<string, unknown>) : {};
}

function providerParam(request: Request): string {
  const provider = readRouteParam(request.params.provider);
  if (!getProviderCatalogEntry(provider)) throw new ProviderConfigError(404, "provider_not_found", "Unknown billing provider.");
  return provider;
}

/** Lê a credencial do corpo, campo a campo; o corpo inteiro nunca vai a log nem a erro. */
function credentialInput(raw: Record<string, unknown>): CredentialInput {
  const kind = raw.kind;
  if (!isCredentialKind(kind)) throw new VaultServiceError(400, "invalid_credential_kind", "kind must be api_token, webhook_secret or certificate.");
  if (kind === "certificate") {
    return { kind, pfxBase64: typeof raw.pfxBase64 === "string" ? raw.pfxBase64 : "", password: typeof raw.password === "string" ? raw.password : "" };
  }
  return { kind, secret: typeof raw.secret === "string" ? raw.secret : "" };
}

export function createVaultPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/providers",
    requirePlatformPermission(PERMISSION),
    handleAsyncRoute(async (_request, response) => {
      const runtime = await createDefaultVaultRuntime();
      response.status(200).json({ data: await runtime.providers.list(), vault: { status: runtime.vault.status() } });
    }),
  );

  router.get(
    "/providers/:provider",
    requirePlatformPermission(PERMISSION),
    handleAsyncRoute(async (request, response) => {
      const runtime = await createDefaultVaultRuntime();
      response.status(200).json({ data: await runtime.providers.get(providerParam(request)), vault: { status: runtime.vault.status() } });
    }),
  );

  router.put(
    "/providers/:provider",
    requirePlatformPermission(PERMISSION),
    handleAsyncRoute(async (request, response) => {
      const provider = providerParam(request);
      const input = body(request);
      const runtime = await createDefaultVaultRuntime();
      const view = await runtime.providers.updateSettings(provider, { environment: input.environment, settings: input.settings });
      await runtime.audit.record({
        action: "billing_provider.settings_updated",
        entity: "billing_provider",
        entityId: provider,
        metadata: pickBillingAuditMetadata({ actor_user_id: actorId(request), provider, environment: view.environment }),
      });
      response.status(200).json({ data: view });
    }),
  );

  router.put(
    "/providers/:provider/credentials",
    requirePlatformPermission(PERMISSION),
    handleAsyncRoute(async (request, response) => {
      const provider = providerParam(request);
      const credential = credentialInput(body(request));
      const entry = getProviderCatalogEntry(provider)!;
      if (!entry.credentialKinds.includes(credential.kind)) {
        throw new VaultServiceError(400, "credential_kind_not_supported", "This provider does not take this kind of credential.");
      }
      const runtime = await createDefaultVaultRuntime();
      const { environment } = await runtime.providers.get(provider);
      const summary = await runtime.vault.setCredential({ provider, environment, credential, actorId: actorId(request) });
      response.status(200).json({
        data: { provider, environment, kind: summary.kind, fingerprint: summary.fingerprint, last4: summary.last4, createdAt: summary.createdAt.toISOString(), keyVersion: summary.keyVersion },
      });
    }),
  );

  router.post(
    "/vault/rotate",
    requirePlatformPermission(PERMISSION),
    handleAsyncRoute(async (request, response) => {
      const runtime = await createDefaultVaultRuntime();
      const result = await runtime.vault.rotate(actorId(request));
      response.status(200).json({ data: { rotated: result.rotated, unreadable: result.unreadable } });
    }),
  );

  return router;
}
