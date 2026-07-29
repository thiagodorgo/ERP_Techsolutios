import {
  credentialRateKey,
  ipHash,
  issueChallenge,
  normalizeUsername,
  signAuthoritySession,
  verifySolution,
  type AntiAbuse,
  type ChallengeStore,
  type PortalAccessLogRepository,
  type PortalOutcome,
  type PowChallenge,
} from "../portal-shared/index.js";
import { AUTHORITY_SCRYPT_PARAMS, verifyPassword, verifyPasswordDummy, type ScryptParams } from "./authority-password.js";
import type { AuthorityCredentialLoginPort } from "./authority-credential.repository.js";
import { toAuthorityLoginResponse, type AuthorityLoginResponse } from "./authority-portal.dto.js";
import type { LoginRequest } from "./authority-portal.validators.js";

// Ω5P PR-18a — BFF do authority-portal (login anti-brute-force). MESMO rigor do lookup do owner: rate-limit(IP E
// credencial) → PoW progressivo → lookup sob RLS → scrypt tempo-constante → sessão JWE PRÓPRIA. **Anti-enumeração
// de username:** inexistente/suspenso/bloqueado executam scrypt DUMMY (trabalho constante) e a RESPOSTA/latência é
// UNIFORME (não-encontrado ≡ senha-errada ≡ bloqueado). O outcome interno (CREDENTIAL_INVALID/LOCKED/AUTHENTICATED)
// vive SÓ no PortalAccessLog. Piso de latência constante normaliza o timing das vias curtas.

export type AuthorityPortalDeps = {
  readonly tenantId: string; // BINDING de deploy (PORTAL_TENANT_ID / host→tenant)
  readonly credentials: AuthorityCredentialLoginPort;
  readonly accessLog: PortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly challengeStore: ChallengeStore;
  readonly logSecret: string;
  readonly sessionSecret: string; // PORTAL_AUTHORITY_SESSION_SECRET (≠ owner ≠ ERP)
  readonly minLatencyMs: number; // piso constante — normaliza timing anti-enumeração
  readonly challengeTtlMs: number;
  readonly lockThreshold: number; // nº de falhas consecutivas que TRAVA a credencial
  readonly lockDurationMs: number; // duração do lockout
  readonly sessionTtlSeconds?: number; // TTL da JWE (default AUTHORITY_SESSION_TTL_SECONDS)
  readonly scryptParams?: ScryptParams; // params do DUMMY (default OWASP; iguala o custo do verify real)
  readonly now?: () => number;
};

export type AuthorityChallengeResult =
  | { readonly kind: "issued"; readonly challenge: PowChallenge }
  | { readonly kind: "rate_limited" };

// Desfecho do login. `authenticated` é o ÚNICO caminho distinto; `invalid` é UNIFORME para não-encontrado ≡
// senha-errada ≡ status≠ACTIVE ≡ bloqueado (mesmo shape/status/latência — sem oráculo). rate_limited/challenge_failed
// são barreiras anti-abuso PRÉ-credencial (independem da existência do username → não são oráculo).
export type AuthorityLoginResult =
  | { readonly kind: "authenticated"; readonly response: AuthorityLoginResponse }
  | { readonly kind: "invalid" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "challenge_failed" };

function truncateUa(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;
  return userAgent.slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AuthorityPortalService {
  private readonly clock: () => number;
  private readonly dummyParams: ScryptParams;

  constructor(private readonly deps: AuthorityPortalDeps) {
    this.clock = deps.now ?? (() => Date.now());
    this.dummyParams = deps.scryptParams ?? AUTHORITY_SCRYPT_PARAMS;
  }

  // POST /portal/v1/authority/challenge — emite o desafio PoW (dificuldade progressiva pelas falhas do IP) e loga
  // CHALLENGE_ISSUED (I10). Rate-limit BARATO por IP ANTES de emitir/logar (contém flood — HIGH-1 do owner).
  async challenge(ctx: { ip: string; userAgent?: string }): Promise<AuthorityChallengeResult> {
    const nowMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    if (this.deps.antiAbuse.checkChallengeRate(ip, nowMs).limited) {
      return { kind: "rate_limited" };
    }
    const difficulty = this.deps.antiAbuse.difficultyFor(ip, nowMs);
    const challenge = issueChallenge(this.deps.challengeStore, difficulty, this.deps.challengeTtlMs, nowMs);
    await this.log("CHALLENGE_ISSUED", "ISSUED", { ip, ua: truncateUa(ctx.userAgent) });
    return { kind: "issued", challenge };
  }

  // POST /portal/v1/authority/login — o CORAÇÃO de segurança da superfície credenciada.
  async login(input: LoginRequest & { ip: string; userAgent?: string }): Promise<AuthorityLoginResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, input.ip);
    const ua = truncateUa(input.userAgent);
    const username = normalizeUsername(input.username);
    const credKey = credentialRateKey(this.deps.logSecret, username);
    const nowMs = this.clock();

    // (1) Rate-limit por IP E por CREDENCIAL (mais restritivo vence) → 429 genérico + RATE_LIMITED.
    if (this.deps.antiAbuse.checkLoginRate(credKey, ip, nowMs).limited) {
      await this.log("LOGIN", "RATE_LIMITED", { ip, ua, credKey });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // (2) PoW obrigatório. Inválida/expirada/reusada → falha genérica + CHALLENGE_FAILED + dificuldade do IP sobe.
    const pow = verifySolution(
      this.deps.challengeStore,
      { challengeId: input.challengeId, solution: input.solution },
      nowMs,
    );
    if (!pow.ok) {
      this.deps.antiAbuse.registerFailure(ip, nowMs);
      await this.log("LOGIN", "CHALLENGE_FAILED", { ip, ua, credKey });
      return this.settle(startMs, { kind: "challenge_failed" });
    }

    // (3) Lookup por (tenant vinculado, username normalizado) sob RLS.
    const credential = await this.deps.credentials.findByUsername(this.deps.tenantId, username);

    // (3a) INEXISTENTE → scrypt DUMMY (trabalho constante) + resposta uniforme. O outcome interno fica só no log.
    if (!credential) {
      await verifyPasswordDummy(input.password, this.dummyParams);
      await this.log("LOGIN", "CREDENTIAL_INVALID", { ip, ua, credKey });
      return this.settle(startMs, { kind: "invalid" });
    }

    // (3b) status≠ACTIVE (SUSPENDED/REVOKED) → DUMMY (custo constante) + resposta uniforme.
    if (credential.status !== "ACTIVE") {
      await verifyPasswordDummy(input.password, this.dummyParams);
      await this.log("LOGIN", "CREDENTIAL_INVALID", { ip, ua, credKey });
      return this.settle(startMs, { kind: "invalid" });
    }

    // (3c) LOCKOUT ativo (locked_until>now) → DUMMY + resposta uniforme (não revela que está bloqueada).
    if (credential.lockedUntil && credential.lockedUntil.getTime() > nowMs) {
      await verifyPasswordDummy(input.password, this.dummyParams);
      await this.log("LOGIN", "LOCKED", { ip, ua, credKey });
      return this.settle(startMs, { kind: "invalid" });
    }

    // (4) Verificação de senha em TEMPO CONSTANTE (usa os params do hash armazenado).
    const ok = await verifyPassword(input.password, credential.passwordHash);
    if (!ok) {
      // Falha → contabiliza ATOMICAMENTE no banco (incremento auto-referente + decisão de lockout embutida). A
      // decisão LOCKED vem do `lockedUntil` RETORNADO pelo update — NUNCA de um valor lido antes (findByUsername) e
      // recalculado em JS: isso fechava a race de lost-update (N falhas concorrentes liam `k` e gravavam `k+1`, o
      // contador travava em 1 e o lockout não engatava). Persistente (linha sob RLS → sobrevive a restart);
      // reset-na-expiração embutido (lockout anterior expirado → reinicia em 1).
      const state = await this.deps.credentials.registerFailedLogin({
        tenantId: this.deps.tenantId,
        id: credential.id,
        threshold: this.deps.lockThreshold,
        lockDurationMs: this.deps.lockDurationMs,
        nowMs,
      });
      await this.log("LOGIN", state.lockedUntil ? "LOCKED" : "CREDENTIAL_INVALID", { ip, ua, credKey });
      return this.settle(startMs, { kind: "invalid" });
    }

    // (5) SUCESSO → zera contador + carimba last_login_at + emite a JWE (audience authority, TTL 30min).
    await this.deps.credentials.resetLoginState(this.deps.tenantId, credential.id, new Date(nowMs));
    const session = await signAuthoritySession(
      { credentialId: credential.id },
      { secret: this.deps.sessionSecret, ttlSeconds: this.deps.sessionTtlSeconds },
    );
    await this.log("LOGIN", "AUTHENTICATED", { ip, ua, credKey });
    return this.settle(startMs, {
      kind: "authenticated",
      response: toAuthorityLoginResponse(session, credential.authorityName),
    });
  }

  // 1 linha no PortalAccessLog por tentativa (I10). §2.8: só ip_hash + ua truncada + fingerprint HMAC do username
  // (queryFingerprint) — NUNCA username cru, senha, hash, contador ou credentialId. process_id sempre ausente
  // (login não amarra um bem).
  private async log(
    action: "CHALLENGE_ISSUED" | "LOGIN",
    outcome: PortalOutcome,
    ctx: { ip: string; ua?: string; credKey?: string },
  ): Promise<void> {
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "AUTHORITY",
      action,
      outcome,
      queryFingerprint: ctx.credKey,
      ipHash: ctx.ip,
      userAgent: ctx.ua,
      occurredAt: new Date(),
    });
  }

  // Piso de latência CONSTANTE aplicado a TODOS os desfechos → nenhuma via é oráculo de timing. As vias com scrypt
  // (verify real / dummy) já custam ~igual entre si; o piso protege as vias curtas (rate-limit/PoW-fail).
  private async settle<T>(startMs: number, result: T): Promise<T> {
    const elapsed = this.clock() - startMs;
    if (elapsed < this.deps.minLatencyMs) {
      await sleep(this.deps.minLatencyMs - elapsed);
    }
    return result;
  }
}
