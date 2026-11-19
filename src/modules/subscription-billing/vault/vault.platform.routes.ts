// B-ASS-05 · F4 — rotas de PLATAFORMA do cofre e dos provedores (contrato §3.5), sob
// `platform:billing-providers:manage`. As rotas de test-connection/register-webhook/enable/disable
// do B-ASS-08c3 chamam o serviço e gravam a trilha; as demais chamadas externas vivem fora daqui.
//
// O SEGREDO NUNCA SAI: a resposta da credencial é o resumo mascarado; nenhuma rota loga `request.body`; a trilha
// passa pela allowlist própria (`pickBillingAuditMetadata`). O tipo da credencial tem de ser um dos que o
// provedor aceita (certificado só para provedor de nota).

import { Router, type Request, type Response } from "express";

import { handleAsyncRoute, readRouteParam, sendRouteError } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { pickBillingAuditMetadata } from "../platform-audit/audit-metadata.js";
import { getProviderCatalogEntry } from "../providers/provider.catalog.js";
import { ProviderConfigError } from "../providers/provider-config.service.js";
import { createDefaultVaultRuntime } from "./vault.factory.js";
import { isCredentialKind, VaultServiceError, type CredentialInput } from "./vault.service.js";

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

// Wrapper local: um `ProviderConfigError` com `details` (o `enable` recusado leva a lista `failed[]`) é
// serializado com eles; os demais erros caem no `sendRouteError` compartilhado, que descarta campos além de
// código, motivo e mensagem.
function handleProviderRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return async (request: Request, response: Response): Promise<void> => {
    try {
      await handler(request, response);
    } catch (error) {
      if (error instanceof ProviderConfigError && error.details) {
        response.status(error.statusCode).json({
          error: { code: error.code, reason: error.reason, message: error.message, details: error.details },
        });
        return;
      }
      sendRouteError(response, error);
    }
  };
}

/** O código curto da recusa para a trilha; erro fora do serviço vira `provider_unavailable`. */
function refusalCode(error: unknown): string {
  return error instanceof ProviderConfigError ? error.reason : "provider_unavailable";
}

/** A lista `failed[]` de uma recusa de precondições, na forma da allowlist `codes`. */
function refusedCodes(error: unknown): readonly string[] {
  if (!(error instanceof ProviderConfigError) || error.reason !== "enable_preconditions_failed") return [];
  const failed = error.details?.failed;
  return Array.isArray(failed) ? failed.filter((item): item is string => typeof item === "string") : [];
}

export function createVaultPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/providers",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleAsyncRoute(async (_request, response) => {
      const runtime = await createDefaultVaultRuntime();
      response.status(200).json({ data: await runtime.providers.list(), vault: { status: runtime.vault.status() } });
    }),
  );

  router.get(
    "/providers/:provider",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleAsyncRoute(async (request, response) => {
      const runtime = await createDefaultVaultRuntime();
      response.status(200).json({ data: await runtime.providers.get(providerParam(request)), vault: { status: runtime.vault.status() } });
    }),
  );

  router.put(
    "/providers/:provider",
    requirePlatformPermission("platform:billing-providers:manage"),
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
    requirePlatformPermission("platform:billing-providers:manage"),
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
    "/providers/:provider/test-connection",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleProviderRoute(async (request, response) => {
      const provider = providerParam(request);
      const runtime = await createDefaultVaultRuntime();
      const outcome = await runtime.providers.testConnection(provider);
      await runtime.audit.record({
        action: "billing_provider.connection_tested",
        entity: "billing_provider",
        entityId: provider,
        metadata: pickBillingAuditMetadata({
          actor_user_id: actorId(request),
          provider,
          environment: outcome.environment,
          codes: outcome.ok ? [] : [outcome.code],
        }),
      });
      response.status(200).json({
        data: {
          provider: outcome.provider,
          environment: outcome.environment,
          ok: outcome.ok,
          ...(outcome.ok ? {} : { code: outcome.code }),
          at: outcome.at,
        },
      });
    }),
  );

  router.post(
    "/providers/:provider/register-webhook",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleProviderRoute(async (request, response) => {
      const provider = providerParam(request);
      const runtime = await createDefaultVaultRuntime();
      const environment = (await runtime.providers.get(provider)).environment;
      try {
        const outcome = await runtime.providers.registerWebhook(provider);
        if (outcome.alreadyRegistered) {
          response.status(200).json({
            data: { provider: outcome.provider, environment: outcome.environment, registeredAt: outcome.registeredAt, alreadyRegistered: true },
          });
          return;
        }
        await runtime.audit.record({
          action: "billing_provider.webhook_registered",
          entity: "billing_provider",
          entityId: provider,
          metadata: pickBillingAuditMetadata({ actor_user_id: actorId(request), provider, environment: outcome.environment }),
        });
        response.status(200).json({
          data: { provider: outcome.provider, environment: outcome.environment, registeredAt: outcome.registeredAt },
        });
      } catch (error) {
        await runtime.audit.record({
          action: "billing_provider.webhook_register_failed",
          entity: "billing_provider",
          entityId: provider,
          metadata: pickBillingAuditMetadata({ actor_user_id: actorId(request), provider, environment, codes: [refusalCode(error)] }),
        });
        throw error;
      }
    }),
  );

  router.post(
    "/providers/:provider/enable",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleProviderRoute(async (request, response) => {
      const provider = providerParam(request);
      const runtime = await createDefaultVaultRuntime();
      const entry = getProviderCatalogEntry(provider)!;
      const environment = (await runtime.providers.get(provider)).environment;
      try {
        const confirm = body(request).confirm;
        const outcome = await runtime.providers.enable(provider, { confirm: typeof confirm === "string" ? confirm : null }, actorId(request));
        await runtime.audit.record({
          action: "billing_provider.enabled",
          entity: "billing_provider",
          entityId: provider,
          metadata: pickBillingAuditMetadata({ actor_user_id: actorId(request), provider, environment: outcome.environment, kind: entry.kind }),
        });
        response.status(200).json({
          data: { provider: outcome.provider, environment: outcome.environment, enabledAt: outcome.enabledAt, enabledBy: outcome.enabledBy },
        });
      } catch (error) {
        if (error instanceof ProviderConfigError && error.reason === "enable_preconditions_failed") {
          await runtime.audit.record({
            action: "billing_provider.enable_refused",
            entity: "billing_provider",
            entityId: provider,
            metadata: pickBillingAuditMetadata({ actor_user_id: actorId(request), provider, environment, kind: entry.kind, codes: refusedCodes(error) }),
          });
        }
        throw error;
      }
    }),
  );

  router.post(
    "/providers/:provider/disable",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleProviderRoute(async (request, response) => {
      const provider = providerParam(request);
      const runtime = await createDefaultVaultRuntime();
      const entry = getProviderCatalogEntry(provider)!;
      const outcome = await runtime.providers.disable(provider, actorId(request));
      if (outcome.changed) {
        await runtime.audit.record({
          action: "billing_provider.disabled",
          entity: "billing_provider",
          entityId: provider,
          metadata: pickBillingAuditMetadata({ actor_user_id: actorId(request), provider, environment: outcome.environment, kind: entry.kind }),
        });
      }
      response.status(200).json({
        data: { provider: outcome.provider, environment: outcome.environment, disabledAt: outcome.disabledAt },
      });
    }),
  );

  router.post(
    "/vault/rotate",
    requirePlatformPermission("platform:billing-providers:manage"),
    handleAsyncRoute(async (request, response) => {
      const runtime = await createDefaultVaultRuntime();
      const result = await runtime.vault.rotate(actorId(request));
      response.status(200).json({ data: { rotated: result.rotated, unreadable: result.unreadable } });
    }),
  );

  return router;
}
