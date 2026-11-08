// B-ASS-05 — onde ficam as credenciais cifradas (`billing_provider_credentials`, plano §3.2). Tabela GLOBAL da
// plataforma (sem `tenant_id`), lida SÓ pelo serviço do cofre, nunca por rota. Aqui: o contrato e o dublê em
// memória; o repositório Prisma nasce com a M4 (F6).
//
// Regras do contrato:
//  - um segredo vivo por (provedor, ambiente, kind) (G13): gravar outro do mesmo kind revoga o anterior, na mesma
//    transação; kinds diferentes não se tocam;
//  - nunca DELETE: revogar é gravar `revokedAt`;
//  - a rotação grava uma linha NOVA (`rotatedFromId` → a antiga) e revoga a antiga, por linha.

export type CredentialKind = "api_token" | "webhook_secret" | "certificate";
export type ProviderEnvironment = "sandbox" | "production";

export type StoredCredential = {
  readonly id: string;
  readonly provider: string;
  readonly environment: ProviderEnvironment;
  readonly kind: CredentialKind;
  readonly ciphertext: Buffer;
  readonly iv: Buffer;
  readonly authTag: Buffer;
  readonly keyVersion: number;
  readonly fingerprint: string;
  readonly last4: string;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly rotatedFromId: string | null;
  readonly revokedAt: Date | null;
};

export type NewCredential = Omit<StoredCredential, "createdAt" | "revokedAt">;

export interface CredentialRepository {
  /** As linhas não revogadas, opcionalmente de um provedor e ambiente. */
  listActive(filter?: { readonly provider?: string; readonly environment?: ProviderEnvironment }): Promise<readonly StoredCredential[]>;
  /** Revoga a viva de mesmo (provedor, ambiente, kind), se houver, e grava a nova. Atômico. Devolve a revogada. */
  replaceActive(row: NewCredential, now: Date): Promise<{ readonly stored: StoredCredential; readonly revoked: StoredCredential | null }>;
  /** Rotação de UMA linha: revoga `fromId` (se ainda viva) e grava `row` com `rotatedFromId = fromId`. Atômico. */
  rotateRow(fromId: string, row: NewCredential, now: Date): Promise<StoredCredential | null>;
  /** Revoga a viva de (provedor, ambiente, kind). Devolve a revogada, ou `null` se não havia. */
  revokeActive(provider: string, environment: ProviderEnvironment, kind: CredentialKind, now: Date): Promise<StoredCredential | null>;
}

const sameSlot = (a: { provider: string; environment: string; kind: string }, b: { provider: string; environment: string; kind: string }) =>
  a.provider === b.provider && a.environment === b.environment && a.kind === b.kind;

export class InMemoryCredentialRepository implements CredentialRepository {
  readonly #rows: StoredCredential[] = [];

  async listActive(filter: { readonly provider?: string; readonly environment?: ProviderEnvironment } = {}): Promise<readonly StoredCredential[]> {
    return this.#rows.filter(
      (row) =>
        row.revokedAt === null &&
        (filter.provider === undefined || row.provider === filter.provider) &&
        (filter.environment === undefined || row.environment === filter.environment),
    );
  }

  async replaceActive(row: NewCredential, now: Date) {
    const index = this.#rows.findIndex((candidate) => candidate.revokedAt === null && sameSlot(candidate, row));
    let revoked: StoredCredential | null = null;
    if (index >= 0) {
      revoked = { ...this.#rows[index]!, revokedAt: now };
      this.#rows[index] = revoked;
    }
    const stored: StoredCredential = { ...row, createdAt: now, revokedAt: null };
    this.#assertUniqueActive(stored);
    this.#rows.push(stored);
    return { stored, revoked };
  }

  async rotateRow(fromId: string, row: NewCredential, now: Date): Promise<StoredCredential | null> {
    const index = this.#rows.findIndex((candidate) => candidate.id === fromId && candidate.revokedAt === null);
    if (index < 0) return null;
    this.#rows[index] = { ...this.#rows[index]!, revokedAt: now };
    const stored: StoredCredential = { ...row, rotatedFromId: fromId, createdAt: now, revokedAt: null };
    this.#assertUniqueActive(stored);
    this.#rows.push(stored);
    return stored;
  }

  async revokeActive(provider: string, environment: ProviderEnvironment, kind: CredentialKind, now: Date): Promise<StoredCredential | null> {
    const index = this.#rows.findIndex((candidate) => candidate.revokedAt === null && sameSlot(candidate, { provider, environment, kind }));
    if (index < 0) return null;
    const revoked = { ...this.#rows[index]!, revokedAt: now };
    this.#rows[index] = revoked;
    return revoked;
  }

  /** Só para testes: todas as linhas, inclusive as revogadas. */
  allForTests(): readonly StoredCredential[] {
    return this.#rows;
  }

  /** Só para testes: grava uma linha como está (ex.: uma linha de `key_version` desconhecida). */
  seedForTests(row: StoredCredential): void {
    this.#rows.push(row);
  }

  // O mesmo efeito do UNIQUE parcial (provider, environment, kind) WHERE revoked_at IS NULL da M4.
  #assertUniqueActive(row: StoredCredential): void {
    if (this.#rows.some((candidate) => candidate.revokedAt === null && sameSlot(candidate, row))) {
      throw new Error("unique_active_credential_violation");
    }
  }
}
