import { createHmac } from "node:crypto";

import { env } from "../../../config/env.js";
import {
  InMemoryTokenBucketStore,
  TokenBucket,
  type TokenBucketStore,
} from "../../portal-shared/token-bucket.js";
import {
  ANONYMOUS_LOGIN_BUCKET,
  ANONYMOUS_LOGIN_MIN_LATENCY_MS,
  MAX_LOGIN_CANDIDATES,
} from "../anonymous-login.constants.js";
import { normalizeCredentialEmail } from "../repositories/local-auth-credential.repository.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import type {
  AnonymousCandidateResult,
  LocalAuthLoginService,
} from "./local-auth-login.service.js";
import type { LocalAuthLoginResult } from "../types/auth.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§6 do plano) — login SEM organização (Forma B). O e-mail nunca decide (I1): a fonte
// só seleciona candidatos INTERNOS e a CREDENCIAL decide. Freios do canal anônimo (C2/S3/S4):
//   balde por e-mail (chave = HMAC com segredo derivado de JWT_SECRET, sobre o e-mail
//   NORMALIZADO pelo mesmo normalizador da função — crítico 7: sem isso o freio seria contornado
//   variando caixa/espaço) → 429;
//   teto de candidatos (MAX+1 linhas da fonte = 400 TENANT_ID_REQUIRED com ZERO scrypt — C7);
//   verificação ESTRITAMENTE SEQUENCIAL (nunca Promise.all — S3);
//   401 uniforme em 0 sucessos — INCLUSIVE candidato em lock (o 423 não existe no caminho
//   anônimo); 409 TENANT_SELECTION_REQUIRED com SOMENTE as organizações provadas;
//   piso de latência constante em TODOS os desfechos (padrão settle do authority-portal).
// O que o balde NÃO fecha (declarado): rotação de e-mails segue sem teto — idêntico ao login de
// hoje; fecho por IP/distribuído é o B-O6R-07 (P-O6R-B01-RATE-LIMIT-IP). In-process, por
// instância — store Redis-ready (plugável).
// -----------------------------------------------------------------------------------------------

export type AnonymousLoginOutcome =
  | { readonly kind: "rate_limited" }
  | { readonly kind: "tenant_id_required" }
  | { readonly kind: "invalid" }
  | {
      readonly kind: "selection_required";
      readonly tenants: ReadonlyArray<{ readonly id: string; readonly name: string }>;
    }
  | {
      readonly kind: "success";
      readonly tenantId: string;
      readonly login: Extract<LocalAuthLoginResult, { ok: true }>;
    };

export type AnonymousLoginCandidateRef = {
  readonly tenantId: string;
  readonly userId: string;
};

type AnonymousLoginDeps = {
  readonly listCandidates: (email: string) => Promise<AnonymousLoginCandidateRef[]>;
  readonly verifyCandidate: (
    tenantId: string,
    email: string,
    password: string,
    verifyPasswordFn: typeof verifyPassword,
  ) => Promise<AnonymousCandidateResult>;
  readonly finalizeSuccess: (
    tenantId: string,
    credentialId: string,
    user: { readonly id: string; readonly email: string },
    roleCount: number,
    auditContext: { readonly ipAddress?: string; readonly userAgent?: string },
  ) => Promise<void>;
  readonly verifyPasswordFn?: typeof verifyPassword;
  readonly bucketStore?: TokenBucketStore;
  readonly minLatencyMs?: number;
  readonly clock?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly logError?: (message: string, error: unknown) => void;
};

// Chave do balde por e-mail: HMAC-SHA256 com subchave derivada de JWT_SECRET por separação de
// domínio (zero env nova; precedente portal-crypto.ts:49-61). O e-mail entra NORMALIZADO
// (trim+lower — o mesmo normalizador da igualdade da função elevada): "A@X.com", "a@x.com" e
// " a@x.com " caem num ÚNICO balde.
export function anonymousEmailBucketKey(secret: string, email: string): string {
  const domainKey = createHmac("sha256", secret).update("anonymous-login-bucket-v1", "utf8").digest();

  return createHmac("sha256", domainKey).update(normalizeCredentialEmail(email), "utf8").digest("hex");
}

export class AnonymousLoginService {
  private readonly bucket: TokenBucket;
  private readonly verify: typeof verifyPassword;
  private readonly minLatencyMs: number;
  private readonly clock: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private dummyHashPromise: Promise<string> | undefined;

  constructor(private readonly deps: AnonymousLoginDeps) {
    this.bucket = new TokenBucket(
      deps.bucketStore ?? new InMemoryTokenBucketStore(),
      ANONYMOUS_LOGIN_BUCKET,
    );
    this.verify = deps.verifyPasswordFn ?? verifyPassword;
    this.minLatencyMs = deps.minLatencyMs ?? ANONYMOUS_LOGIN_MIN_LATENCY_MS;
    this.clock = deps.clock ?? Date.now;
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async attempt(input: {
    readonly email: string;
    readonly password: string;
    readonly ipAddress?: string;
    readonly userAgent?: string;
  }): Promise<AnonymousLoginOutcome> {
    const startMs = this.clock();
    const email = normalizeCredentialEmail(input.email);
    const bucketKey = anonymousEmailBucketKey(env.JWT_SECRET, email);
    const nowMs = Date.now();

    if (!this.bucket.wouldAllow(bucketKey, nowMs)) {
      return this.settle(startMs, { kind: "rate_limited" });
    }

    this.bucket.consume(bucketKey, nowMs);

    let candidates: AnonymousLoginCandidateRef[];

    try {
      candidates = await this.deps.listCandidates(email);
    } catch (error) {
      // Call-site BLINDADO (§3.8): 42501 (sem EXECUTE), 42883 (função ausente) ou qualquer
      // exceção da fonte → 401 uniforme, com log estruturado. A causa nunca vai ao corpo.
      this.deps.logError?.("anonymous login candidate source failed", error);

      return this.settle(startMs, { kind: "invalid" });
    }

    if (candidates.length === 0) {
      // Hash dummy: um scrypt real contra hash fixo — e-mail inexistente custa o mesmo que
      // senha errada (anti-oráculo de timing e de contagem).
      await this.verify(input.password, await this.dummyHash());

      return this.settle(startMs, { kind: "invalid" });
    }

    if (candidates.length > MAX_LOGIN_CANDIDATES) {
      // Sentinela do teto (a linha MAX+1): 400 nomeado, com ZERO scrypt (C7). Residual
      // declarado: o código revela "e-mail presente em mais de 3 organizações".
      return this.settle(startMs, { kind: "tenant_id_required" });
    }

    // Estritamente sequencial (S3) — nunca Promise.all: o custo do pior caso é 3 scrypt em série.
    const successes: Array<{
      readonly candidate: AnonymousLoginCandidateRef;
      readonly result: Extract<AnonymousCandidateResult, { ok: true }>;
    }> = [];

    for (const candidate of candidates) {
      const result = await this.deps.verifyCandidate(
        candidate.tenantId,
        email,
        input.password,
        this.verify,
      );

      if (result.ok) {
        successes.push({ candidate, result });
      }
    }

    if (successes.length === 0) {
      // 401 uniforme — inclusive quando algum candidato estava em lock (sem 423 anônimo).
      return this.settle(startMs, { kind: "invalid" });
    }

    if (successes.length > 1) {
      return this.settle(startMs, {
        kind: "selection_required",
        tenants: successes.map((success) => ({
          id: success.result.tenant.id,
          name: success.result.tenant.name,
        })),
      });
    }

    const [winner] = successes;

    await this.deps.finalizeSuccess(
      winner.candidate.tenantId,
      winner.result.credential_id,
      { id: winner.result.user.id, email: winner.result.user.email },
      winner.result.roles.length,
      { ipAddress: input.ipAddress, userAgent: input.userAgent },
    );

    return this.settle(startMs, {
      kind: "success",
      tenantId: winner.candidate.tenantId,
      login: {
        ok: true,
        user: winner.result.user,
        tenant: winner.result.tenant,
        roles: winner.result.roles,
      },
    });
  }

  // Piso de latência constante aplicado a TODOS os desfechos (espelho de
  // authority-portal.service.ts:190-198) — nenhuma via curta vira oráculo de timing.
  private async settle<T>(startMs: number, outcome: T): Promise<T> {
    const elapsed = this.clock() - startMs;

    if (elapsed < this.minLatencyMs) {
      await this.sleep(this.minLatencyMs - elapsed);
    }

    return outcome;
  }

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= hashPassword(
      "anonymous-login-dummy-password-v1",
    ).then((result) => result.password_hash);

    return this.dummyHashPromise;
  }
}
