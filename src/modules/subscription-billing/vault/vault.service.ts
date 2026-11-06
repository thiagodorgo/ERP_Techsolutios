// B-ASS-05 — o SERVIÇO do cofre (plano §4.5): grava, resume, revoga e rotaciona credenciais de provedor.
//
// O que sai daqui para fora (rota, log, trilha): só `{ kind, fingerprint, last4, createdAt, keyVersion }`.
// O claro só sai por `readSecretForProvider`, como `VaultSecret`, e só os adaptadores (B-ASS-06..08) chamam.
//
// Sem chave (`BILLING_VAULT_KEY` vazia): gravar → 503 `vault_unavailable`; resumir segue funcionando (o resumo
// não precisa decifrar) e marca `readable: false`; nada mais no app depende do cofre (R-VLT-4).

import { randomUUID } from "node:crypto";

import { pickBillingAuditMetadata } from "../platform-audit/audit-metadata.js";
import type { PlatformAuditWriter } from "../plans/platform-audit.js";
import type { CredentialSummary, ProviderCredentialSummaries } from "../providers/provider-config.service.js";
import { fingerprintOf, last4Of, openSecret, sealSecret, vaultAad, VaultError } from "./vault.crypto.js";
import { keyForVersion, vaultStatus, type VaultKeyProvider, type VaultStatus } from "./vault-keys.js";
import type { CredentialKind, CredentialRepository, ProviderEnvironment, StoredCredential } from "./vault.repository.js";
import type { VaultSecret } from "./vault-secret.js";

export const CREDENTIAL_KINDS: readonly CredentialKind[] = ["api_token", "webhook_secret", "certificate"];

export function isCredentialKind(value: unknown): value is CredentialKind {
  return typeof value === "string" && (CREDENTIAL_KINDS as readonly string[]).includes(value);
}

export type { CredentialSummary };

export type CredentialInput =
  | { readonly kind: "api_token" | "webhook_secret"; readonly secret: string }
  | { readonly kind: "certificate"; readonly pfxBase64: string; readonly password: string };

export type RotationResult = { readonly rotated: readonly string[]; readonly unreadable: readonly string[] };

/** Erro de cofre com status HTTP e motivo, no envelope da casa. A mensagem nunca carrega segredo. */
export class VaultServiceError extends Error {
  readonly status: number;
  readonly reason: string;

  constructor(status: number, reason: string, message: string) {
    super(message);
    this.name = "VaultServiceError";
    this.status = status;
    this.reason = reason;
  }
}

const MAX_SECRET_LENGTH = 16_384;
const MAX_PFX_BASE64_LENGTH = 65_536;

function plaintextOf(input: CredentialInput): string {
  if (input.kind === "certificate") {
    if (typeof input.pfxBase64 !== "string" || input.pfxBase64.trim() === "" || input.pfxBase64.length > MAX_PFX_BASE64_LENGTH) {
      throw new VaultServiceError(400, "certificate_requires_pfx_and_password", "certificate requires pfxBase64 and password.");
    }
    if (typeof input.password !== "string" || input.password === "") {
      throw new VaultServiceError(400, "certificate_requires_pfx_and_password", "certificate requires pfxBase64 and password.");
    }
    return JSON.stringify({ pfxBase64: input.pfxBase64.trim(), password: input.password });
  }
  if (typeof input.secret !== "string" || input.secret.trim() === "" || input.secret.length > MAX_SECRET_LENGTH) {
    throw new VaultServiceError(400, "invalid_secret", "secret must be a non-empty string.");
  }
  return input.secret;
}

/** O que identifica a credencial na tela: os 4 últimos do token, ou do PFX no caso do certificado (nunca da senha). */
function displayLast4(input: CredentialInput, plaintext: string): string {
  return input.kind === "certificate" ? last4Of(input.pfxBase64.trim()) : last4Of(plaintext);
}

export function summaryOf(row: StoredCredential): CredentialSummary {
  return { kind: row.kind, fingerprint: row.fingerprint, last4: row.last4, createdAt: row.createdAt, keyVersion: row.keyVersion };
}

export class VaultService implements ProviderCredentialSummaries {
  constructor(
    private readonly repository: CredentialRepository,
    private readonly keys: VaultKeyProvider,
    private readonly audit: PlatformAuditWriter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  status(): VaultStatus {
    return vaultStatus(this.keys);
  }

  /** Implementa a porta `ProviderCredentialSummaries` da configuração de provedores (F3). */
  async list(provider: string, environment: ProviderEnvironment): Promise<readonly CredentialSummary[]> {
    return (await this.repository.listActive({ provider, environment })).map(summaryOf);
  }

  /** Cada credencial viva pode ser decifrada com as chaves de agora? (sem decifrar: só pela versão) */
  async readability(provider: string, environment: ProviderEnvironment): Promise<{ readonly configured: boolean; readonly readable: boolean }> {
    const rows = await this.repository.listActive({ provider, environment });
    return { configured: rows.length > 0, readable: rows.length > 0 && rows.every((row) => keyForVersion(this.keys, row.keyVersion) !== null) };
  }

  async setCredential(input: {
    readonly provider: string;
    readonly environment: ProviderEnvironment;
    readonly credential: CredentialInput;
    readonly actorId: string | null;
  }): Promise<CredentialSummary> {
    if (!isCredentialKind(input.credential?.kind)) {
      throw new VaultServiceError(400, "invalid_credential_kind", "kind must be api_token, webhook_secret or certificate.");
    }
    const plaintext = plaintextOf(input.credential);
    const key = this.keys.current();
    if (!key) throw new VaultServiceError(503, "vault_unavailable", "The credential vault is unavailable.");

    const id = randomUUID();
    const sealed = sealSecret(plaintext, key, vaultAad(input.provider, input.environment, id));
    const now = this.clock();
    const { stored, revoked } = await this.repository.replaceActive(
      {
        id,
        provider: input.provider,
        environment: input.environment,
        kind: input.credential.kind,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        authTag: sealed.authTag,
        keyVersion: sealed.keyVersion,
        fingerprint: fingerprintOf(plaintext),
        last4: displayLast4(input.credential, plaintext),
        createdBy: input.actorId,
        rotatedFromId: null,
      },
      now,
    );
    if (revoked) await this.#trail("billing_provider.credential_revoked", input.provider, input.actorId, { environment: input.environment, kind: revoked.kind, fingerprint: revoked.fingerprint });
    await this.#trail("billing_provider.credential_set", input.provider, input.actorId, { environment: input.environment, kind: stored.kind, fingerprint: stored.fingerprint });
    return summaryOf(stored);
  }

  async revokeCredential(input: {
    readonly provider: string;
    readonly environment: ProviderEnvironment;
    readonly kind: CredentialKind;
    readonly actorId: string | null;
  }): Promise<boolean> {
    const revoked = await this.repository.revokeActive(input.provider, input.environment, input.kind, this.clock());
    if (!revoked) return false;
    await this.#trail("billing_provider.credential_revoked", input.provider, input.actorId, { environment: input.environment, kind: revoked.kind, fingerprint: revoked.fingerprint });
    return true;
  }

  /**
   * O claro de uma credencial viva, para os adaptadores (B-ASS-06..08). Nunca para rota.
   * Sem chave → 503; versão desconhecida ou authTag inválido → o mesmo 503 `vault_unavailable` + trilha `vault.decrypt_failed`.
   */
  async readSecretForProvider(provider: string, environment: ProviderEnvironment, kind: CredentialKind): Promise<VaultSecret | null> {
    const row = (await this.repository.listActive({ provider, environment })).find((candidate) => candidate.kind === kind);
    if (!row) return null;
    if (!this.keys.current()) throw new VaultServiceError(503, "vault_unavailable", "The credential vault is unavailable.");
    const key = keyForVersion(this.keys, row.keyVersion);
    try {
      if (!key) throw new VaultError("unknown_key_version", "unknown key version");
      return openSecret(row, key, vaultAad(row.provider, row.environment, row.id));
    } catch {
      await this.#trail("vault.decrypt_failed", provider, null, { environment, kind, credential_ids: [row.id] });
      throw new VaultServiceError(503, "vault_unavailable", "The stored credential could not be read with the current keys.");
    }
  }

  /**
   * Rotação da CHAVE (R-VLT-5): recifra com a chave atual cada linha viva de outra versão, em linha nova, e revoga a
   * antiga, uma linha por vez. Linha que não decifra (versão desconhecida ou authTag inválido) vai para `unreadable`
   * e não trava as demais. Linha já na versão atual fica como está.
   */
  async rotate(actorId: string | null): Promise<RotationResult> {
    const current = this.keys.current();
    if (!current) throw new VaultServiceError(503, "vault_unavailable", "The credential vault is unavailable.");
    const rotated: string[] = [];
    const unreadable: string[] = [];
    for (const row of await this.repository.listActive()) {
      if (row.keyVersion === current.version) continue;
      const key = keyForVersion(this.keys, row.keyVersion);
      let plaintext: string;
      try {
        if (!key) throw new VaultError("unknown_key_version", "unknown key version");
        plaintext = openSecret(row, key, vaultAad(row.provider, row.environment, row.id)).reveal();
      } catch {
        unreadable.push(row.id);
        continue;
      }
      const id = randomUUID();
      const sealed = sealSecret(plaintext, current, vaultAad(row.provider, row.environment, id));
      const stored = await this.repository.rotateRow(
        row.id,
        {
          id,
          provider: row.provider,
          environment: row.environment,
          kind: row.kind,
          ciphertext: sealed.ciphertext,
          iv: sealed.iv,
          authTag: sealed.authTag,
          keyVersion: sealed.keyVersion,
          fingerprint: row.fingerprint,
          last4: row.last4,
          createdBy: actorId,
          rotatedFromId: row.id,
        },
        this.clock(),
      );
      if (stored) rotated.push(stored.id);
    }
    await this.#trail("vault.rotated", null, actorId, {
      credential_ids: rotated,
      unreadable_ids: unreadable,
      rotated_count: rotated.length,
      unreadable_count: unreadable.length,
    });
    return { rotated, unreadable };
  }

  async #trail(action: string, provider: string | null, actorId: string | null, extra: Record<string, unknown>): Promise<void> {
    await this.audit.record({
      action,
      entity: provider ? "billing_provider" : "billing_vault",
      entityId: provider,
      metadata: pickBillingAuditMetadata({ actor_user_id: actorId, provider: provider ?? undefined, ...extra }),
    });
  }
}
