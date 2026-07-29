import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { createPortalApp } from "../src/portal-app.js";
import { AuthorityPortalService } from "../src/modules/authority/authority-portal.service.js";
import { createAuthorityPortalRouter } from "../src/modules/authority/authority-portal.routes.js";
import {
  InMemoryAuthorityCredentialRepository,
} from "../src/modules/authority/authority-credential.repository.js";
import {
  AUTHORITY_SCRYPT_PARAMS,
  hashPassword,
  verifyPassword,
  verifyPasswordDummy,
  type ScryptParams,
} from "../src/modules/authority/authority-password.js";
import {
  AntiAbuse,
  InMemoryChallengeStore,
  InMemoryPortalAccessLogRepository,
  issueChallenge,
  normalizeUsername,
  signAuthoritySession,
  verifyAuthoritySession,
  signOwnerSession,
  verifyOwnerSession,
  solveChallenge,
  type AntiAbuseConfig,
} from "../src/modules/portal-shared/index.js";
import type { AuthorityCredentialStatus } from "../src/modules/authority/authority-credential.types.js";

const TENANT = randomUUID();
const LOG_SECRET = "test-portal-log-secret";
const AUTHORITY_SECRET = "test-authority-session-secret";
const OWNER_SECRET = "test-owner-session-secret";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Params scrypt REDUZIDOS para o pipeline (rápido); o teste-alvo de hashing (1) prova os OWASP + maxmem separado.
const FAST_PARAMS: ScryptParams = { N: 2 ** 10, r: 8, p: 1, keylen: 32 };

const BASE_ANTI_ABUSE: AntiAbuseConfig = {
  ipBucket: { capacity: 100, refillTokens: 100, refillIntervalMs: 60_000 },
  plateBucket: { capacity: 100, refillTokens: 100, refillIntervalMs: 60_000 },
  loginBucket: { capacity: 100, refillTokens: 100, refillIntervalMs: 60_000 },
  challengeBucket: { capacity: 100, refillTokens: 100, refillIntervalMs: 60_000 },
  baseDifficulty: 2, // solve instantâneo em teste
  maxDifficulty: 5,
  failuresPerStep: 1,
  failureWindowMs: 60_000,
};

type Harness = {
  readonly repo: InMemoryAuthorityCredentialRepository;
  readonly accessLog: InMemoryPortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly challengeStore: InMemoryChallengeStore;
  readonly service: AuthorityPortalService;
};

function buildHarness(
  overrides: { antiAbuse?: Partial<AntiAbuseConfig>; minLatencyMs?: number; lockThreshold?: number; lockDurationMs?: number } = {},
): Harness {
  const repo = new InMemoryAuthorityCredentialRepository();
  const accessLog = new InMemoryPortalAccessLogRepository();
  const antiAbuse = new AntiAbuse({ ...BASE_ANTI_ABUSE, ...overrides.antiAbuse });
  const challengeStore = new InMemoryChallengeStore();
  const service = new AuthorityPortalService({
    tenantId: TENANT,
    credentials: repo,
    accessLog,
    antiAbuse,
    challengeStore,
    logSecret: LOG_SECRET,
    sessionSecret: AUTHORITY_SECRET,
    minLatencyMs: overrides.minLatencyMs ?? 15,
    challengeTtlMs: 120_000,
    lockThreshold: overrides.lockThreshold ?? 3,
    lockDurationMs: overrides.lockDurationMs ?? 3_600_000,
    scryptParams: FAST_PARAMS, // o DUMMY iguala o custo do verify real (ambos FAST no teste)
  });
  return { repo, accessLog, antiAbuse, challengeStore, service };
}

async function seedCredential(
  repo: InMemoryAuthorityCredentialRepository,
  input: { username: string; password: string; status?: AuthorityCredentialStatus; authorityName?: string },
): Promise<string> {
  const passwordHash = await hashPassword(input.password, FAST_PARAMS);
  const credential = await repo.create({
    tenantId: TENANT,
    authorityName: input.authorityName ?? "Órgão Municipal de Trânsito",
    username: normalizeUsername(input.username),
    passwordHash,
    createdBy: null,
  });
  if (input.status && input.status !== "ACTIVE") {
    await repo.updateStatus(TENANT, credential.id, input.status);
  }
  return credential.id;
}

// ── harness HTTP (createPortalApp com authorityRouter injetado) ─────────────────────────────────────────────────
async function withApp(service: AuthorityPortalService, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const router = createAuthorityPortalRouter(() => Promise.resolve(service));
  const app = createPortalApp({ authorityRouter: router });
  const server = app.listen(0);
  try {
    await run(await getBaseUrl(server));
  } finally {
    await closeServer(server);
  }
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function postRaw(baseUrl: string, path: string, body: unknown): Promise<{ status: number; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// Fluxo completo do login: /challenge → resolve PoW → /login.
async function loginFlow(baseUrl: string, input: { username: string; password: string }): Promise<{ status: number; text: string }> {
  const ch = await postRaw(baseUrl, "/portal/v1/authority/challenge", {});
  const challenge = JSON.parse(ch.text).data as { challengeId: string; salt: string; difficulty: number };
  const solution = solveChallenge(challenge.salt, challenge.difficulty);
  return postRaw(baseUrl, "/portal/v1/authority/login", {
    username: input.username,
    password: input.password,
    challengeId: challenge.challengeId,
    solution,
  });
}

// ── (1) HASHING scrypt — round-trip + params OWASP + tempo-constante + maxmem suficiente ─────────────────────────
test("hashing: scrypt round-trip + salt por-hash + rejeita senha errada/ hash adulterado", async () => {
  const hash = await hashPassword("senha-forte-123", FAST_PARAMS);
  assert.equal(await verifyPassword("senha-forte-123", hash), true);
  assert.equal(await verifyPassword("senha-errada", hash), false);
  // salt por-hash: dois hashes da MESMA senha diferem, mas ambos verificam.
  const hash2 = await hashPassword("senha-forte-123", FAST_PARAMS);
  assert.notEqual(hash, hash2);
  assert.equal(await verifyPassword("senha-forte-123", hash2), true);
  // hash adulterado (flip do último char) → false, sem lançar (tempo-constante via timingSafeEqual).
  const tampered = hash.slice(0, -1) + (hash.at(-1) === "A" ? "B" : "A");
  assert.equal(await verifyPassword("senha-forte-123", tampered), false);
  // stored malformado → false (nunca lança).
  assert.equal(await verifyPassword("x", "not-a-scrypt-hash"), false);
  assert.equal(await verifyPassword("x", "scrypt$1024$8$1$onlyfourfields"), false);
});

test("hashing: formato self-describing carrega os params OWASP e 32 bytes derivados", async () => {
  // Os DEFAULTS de produção são os OWASP (N=2^17, r=8, p=1, keylen=32).
  assert.deepEqual(AUTHORITY_SCRYPT_PARAMS, { N: 2 ** 17, r: 8, p: 1, keylen: 32 });
  const hash = await hashPassword("qualquer-senha", FAST_PARAMS);
  const parts = hash.split("$");
  assert.equal(parts[0], "scrypt");
  assert.equal(Number(parts[1]), FAST_PARAMS.N);
  assert.equal(Number(parts[2]), FAST_PARAMS.r);
  assert.equal(Number(parts[3]), FAST_PARAMS.p);
  assert.equal(Buffer.from(parts[5], "base64").length, 32, "chave derivada = 32 bytes");
});

test("hashing: params OWASP N=2^17 NÃO lançam (maxmem explícito ≥256MiB é suficiente; gotcha PD)", async () => {
  // Com o maxmem DEFAULT (~32MiB) o scrypt lançaria 'memory limit exceeded' em N=2^17·r=8 (~128MiB). Se estas
  // resolvem sem lançar, o maxmem explícito comporta os params OWASP — tanto no hash real quanto no DUMMY.
  const hash = await hashPassword("owasp-strength", AUTHORITY_SCRYPT_PARAMS);
  assert.equal(await verifyPassword("owasp-strength", hash), true);
  assert.equal(await verifyPasswordDummy("owasp-strength", AUTHORITY_SCRYPT_PARAMS), false);
});

// ── (2) ENUMERAÇÃO de username — inexistente ≡ senha-errada ≡ suspenso ≡ bloqueado (byte-idêntico + 401) ─────────
test("enumeração: inexistente ≡ senha-errada ≡ suspenso ≡ bloqueado → resposta BYTE-IDÊNTICA + 401", async () => {
  const { service, repo, accessLog } = buildHarness();
  const activeId = await seedCredential(repo, { username: "orgao.sp", password: "correct-horse-battery" });
  await seedCredential(repo, { username: "susp.org", password: "outra-senha-ok", status: "SUSPENDED" });
  // trava a credencial ativa (locked_until no futuro).
  await repo.applyFailedLogin(TENANT, activeId, 5, new Date(Date.now() + 3_600_000));

  await withApp(service, async (baseUrl) => {
    const absent = await loginFlow(baseUrl, { username: "nao.existe", password: "seja-la-o-que-for" });
    const wrong = await loginFlow(baseUrl, { username: "susp.org", password: "senha-errada-aqui" }); // existe mas suspensa
    const locked = await loginFlow(baseUrl, { username: "orgao.sp", password: "correct-horse-battery" }); // senha CERTA, mas travada

    for (const r of [absent, wrong, locked]) assert.equal(r.status, 401);
    assert.equal(absent.text, wrong.text, "inexistente ≡ suspenso");
    assert.equal(absent.text, locked.text, "inexistente ≡ bloqueado (mesmo com a senha certa)");
    assert.equal(absent.text, JSON.stringify({ error: { code: "AUTHENTICATION_FAILED", message: "Usuário ou senha inválidos." } }));
  });

  // O outcome INTERNO distinto vive SÓ no PortalAccessLog (a resposta é uniforme).
  const logins = accessLog.readForTests().filter((r) => r.action === "LOGIN");
  const outcomes = logins.map((r) => r.outcome).sort();
  assert.deepEqual(outcomes, ["CREDENTIAL_INVALID", "CREDENTIAL_INVALID", "LOCKED"]);
});

// ── (3) BRUTE-FORCE — rate-limit IP, rate-limit credencial, PoW, lockout + reset no sucesso ──────────────────────
test("brute-force: rate-limit por IP (usernames distintos) → 429 genérico", async () => {
  const { service, accessLog } = buildHarness({
    antiAbuse: { ipBucket: { capacity: 2, refillTokens: 2, refillIntervalMs: 3_600_000 } },
  });
  await withApp(service, async (baseUrl) => {
    const r1 = await loginFlow(baseUrl, { username: "aaa.um", password: "x-abcdefghij" });
    const r2 = await loginFlow(baseUrl, { username: "bbb.dois", password: "x-abcdefghij" });
    const r3 = await loginFlow(baseUrl, { username: "ccc.tres", password: "x-abcdefghij" });
    assert.equal(r1.status, 401);
    assert.equal(r2.status, 401);
    assert.equal(r3.status, 429, "o 3º login do mesmo IP estoura o balde de IP");
    assert.equal(JSON.parse(r3.text).error.code, "RATE_LIMITED");
    assert.ok(accessLog.readForTests().some((row) => row.outcome === "RATE_LIMITED"));
  });
});

test("brute-force: rate-limit por CREDENCIAL (mesmo username) → 429 (o palpite de senha por conta é barrado)", async () => {
  const { service, repo } = buildHarness({
    antiAbuse: {
      ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 3_600_000 },
      loginBucket: { capacity: 2, refillTokens: 2, refillIntervalMs: 3_600_000 },
    },
  });
  await seedCredential(repo, { username: "alvo.org", password: "a-senha-verdadeira" });
  await withApp(service, async (baseUrl) => {
    const r1 = await loginFlow(baseUrl, { username: "alvo.org", password: "palpite-1abc" });
    const r2 = await loginFlow(baseUrl, { username: "ALVO.ORG", password: "palpite-2abc" }); // caixa → mesma chave
    const r3 = await loginFlow(baseUrl, { username: "alvo.org ", password: "palpite-3abc" }); // espaço → mesma chave
    assert.equal(r1.status, 401);
    assert.equal(r2.status, 401);
    assert.equal(r3.status, 429, "3 palpites na MESMA credencial estouram o balde por-credencial");
    assert.equal(JSON.parse(r3.text).error.code, "RATE_LIMITED");
  });
});

test("brute-force: PoW forjada/reusada no login → 400 CHALLENGE_FAILED; dificuldade do IP sobe", async () => {
  const { service, accessLog } = buildHarness({ antiAbuse: { baseDifficulty: 2, failuresPerStep: 1 } });
  await withApp(service, async (baseUrl) => {
    const before = JSON.parse((await postRaw(baseUrl, "/portal/v1/authority/challenge", {})).text).data.difficulty as number;
    const forged = await postRaw(baseUrl, "/portal/v1/authority/login", {
      username: "qualquer.org",
      password: "senha-qualquer",
      challengeId: "forged-id",
      solution: "0",
    });
    assert.equal(forged.status, 400);
    assert.equal(JSON.parse(forged.text).error.code, "CHALLENGE_FAILED");
    const after = JSON.parse((await postRaw(baseUrl, "/portal/v1/authority/challenge", {})).text).data.difficulty as number;
    assert.ok(after > before, `dificuldade deve subir após falha de PoW (${before} → ${after})`);

    // reuso do MESMO challenge+solução → 2ª vez 400.
    const ch = JSON.parse((await postRaw(baseUrl, "/portal/v1/authority/challenge", {})).text).data as {
      challengeId: string;
      salt: string;
      difficulty: number;
    };
    const solution = solveChallenge(ch.salt, ch.difficulty);
    const body = { username: "qualquer.org", password: "senha", challengeId: ch.challengeId, solution };
    const first = await postRaw(baseUrl, "/portal/v1/authority/login", body);
    const second = await postRaw(baseUrl, "/portal/v1/authority/login", body);
    assert.equal(first.status, 401, "1ª vez: PoW ok → chega ao login (credencial inexistente → 401)");
    assert.equal(second.status, 400, "2ª vez: challenge já consumido → CHALLENGE_FAILED");
    assert.ok(accessLog.readForTests().some((row) => row.outcome === "CHALLENGE_FAILED"));
  });
});

test("brute-force: lockout após N falhas (persistente) + reset no login bem-sucedido", async () => {
  const { service, repo } = buildHarness({ lockThreshold: 3 });
  const id = await seedCredential(repo, { username: "conta.org", password: "senha-certa-9999" });
  await withApp(service, async (baseUrl) => {
    // 3 falhas consecutivas → trava.
    for (let i = 0; i < 3; i += 1) {
      const r = await loginFlow(baseUrl, { username: "conta.org", password: `errada-${i}` });
      assert.equal(r.status, 401);
    }
    const locked = await repo.findById(TENANT, id);
    assert.equal(locked?.failedLoginCount, 3);
    assert.ok(locked?.lockedUntil && locked.lockedUntil.getTime() > Date.now(), "locked_until deve estar no futuro (lockout persistente)");

    // Mesmo com a senha CERTA, a conta travada → 401 (uniforme).
    const whileLocked = await loginFlow(baseUrl, { username: "conta.org", password: "senha-certa-9999" });
    assert.equal(whileLocked.status, 401);
  });

  // Prova do RESET no sucesso: destrava manualmente (o lockout expirou) e loga com a senha certa → contador zera.
  await repo.applyFailedLogin(TENANT, id, 2, null); // simula 2 falhas e lock já expirado (null)
  await withApp(service, async (baseUrl) => {
    const ok = await loginFlow(baseUrl, { username: "conta.org", password: "senha-certa-9999" });
    assert.equal(ok.status, 200, "senha certa + destravado → autentica");
  });
  const afterSuccess = await repo.findById(TENANT, id);
  assert.equal(afterSuccess?.failedLoginCount, 0, "sucesso ZERA o contador de falhas");
  assert.equal(afterSuccess?.lockedUntil, null);
  assert.ok(afterSuccess?.lastLoginAt instanceof Date, "carimba last_login_at");
});

// ── (4) ISOLAMENTO — sessão authority ≠ owner ≠ ERP (secret + audience, 2 sentidos) ─────────────────────────────
test("isolamento: um token authority NÃO verifica como owner e vice-versa (secret + audience, 2 sentidos)", async () => {
  const credentialId = randomUUID();
  const processId = randomUUID();

  const authorityToken = await signAuthoritySession({ credentialId }, { secret: AUTHORITY_SECRET });
  const ownerToken = await signOwnerSession({ processId }, { secret: OWNER_SECRET });

  // authority verifica como authority (secret certo) → OK.
  assert.equal((await verifyAuthoritySession(authorityToken, { secret: AUTHORITY_SECRET })).credentialId, credentialId);
  // authority NÃO verifica como owner (audience + secret errados) — 2 tentativas.
  await assert.rejects(() => verifyOwnerSession(authorityToken, { secret: OWNER_SECRET }));
  await assert.rejects(() => verifyOwnerSession(authorityToken, { secret: AUTHORITY_SECRET }));

  // owner verifica como owner (secret certo) → OK.
  assert.equal((await verifyOwnerSession(ownerToken, { secret: OWNER_SECRET })).processId, processId);
  // owner NÃO verifica como authority — 2 tentativas.
  await assert.rejects(() => verifyAuthoritySession(ownerToken, { secret: AUTHORITY_SECRET }));
  await assert.rejects(() => verifyAuthoritySession(ownerToken, { secret: OWNER_SECRET }));

  // authority assinado com secret authority NÃO verifica com um secret de terceiro (ex.: material do ERP).
  await assert.rejects(() => verifyAuthoritySession(authorityToken, { secret: "erp-jwt-like-secret" }));
});

// ── (5) §2.8 — a resposta do login só {session, authorityName}; PortalAccessLog só HMAC ─────────────────────────
test("§2.8: resposta OK = allowlist {session, authorityName}; SEM credentialId/tenant_id/hash/contador", async () => {
  const { service, repo } = buildHarness();
  const id = await seedCredential(repo, { username: "orgao.publico", password: "uma-senha-boa-01", authorityName: "Departamento de Trânsito XYZ" });
  await withApp(service, async (baseUrl) => {
    const res = await loginFlow(baseUrl, { username: "orgao.publico", password: "uma-senha-boa-01" });
    assert.equal(res.status, 200);
    const parsed = JSON.parse(res.text) as { data: Record<string, unknown> };
    assert.deepEqual(Object.keys(parsed.data).sort(), ["authorityName", "session"].sort());
    assert.equal(parsed.data.authorityName, "Departamento de Trânsito XYZ");
    // NENHUM UUID no corpo (o credentialId é UUID; a sessão JWE é opaca/não-decodável).
    assert.equal(UUID_RE.test(res.text), false, "a resposta pública não pode conter UUID (credentialId/tenant_id)");
    assert.equal(res.text.includes(id), false, "o credentialId nunca aparece");
    assert.equal(res.text.includes(TENANT), false, "o tenant_id nunca aparece");
    assert.equal(res.text.toLowerCase().includes("tenant"), false);
    assert.equal(res.text.toLowerCase().includes("hash"), false);
    assert.equal(res.text.toLowerCase().includes("locked"), false);
    assert.equal(res.text.toLowerCase().includes("failed"), false);
  });
});

test("§2.8: PortalAccessLog — 1 linha por tentativa; NUNCA username/senha/hash crus (só HMAC + ip_hash)", async () => {
  const { service, repo, accessLog } = buildHarness();
  await seedCredential(repo, { username: "logtest.org", password: "senha-do-log-999" });
  await withApp(service, async (baseUrl) => {
    await loginFlow(baseUrl, { username: "logtest.org", password: "senha-do-log-999" }); // CHALLENGE + LOGIN(AUTHENTICATED)
    await loginFlow(baseUrl, { username: "logtest.org", password: "senha-errada-000" }); // CHALLENGE + LOGIN(CREDENTIAL_INVALID)
  });
  const rows = accessLog.readForTests();
  assert.equal(rows.length, 4, "2 fluxos = 2 challenge + 2 login = 4 linhas");
  assert.ok(rows.every((r) => r.portal === "AUTHORITY"));
  const outcomes = rows.map((r) => r.outcome).sort();
  assert.deepEqual(outcomes, ["AUTHENTICATED", "CREDENTIAL_INVALID", "ISSUED", "ISSUED"]);
  const blob = JSON.stringify(rows);
  assert.equal(blob.includes("logtest.org"), false, "username cru não pode aparecer no log");
  assert.equal(blob.includes("senha-do-log-999"), false, "senha crua não pode aparecer no log");
  assert.equal(blob.includes("senha-errada-000"), false);
  assert.equal(blob.includes("127.0.0.1"), false, "IP cru não pode aparecer no log");
  // toda linha tem ip_hash HMAC hex 64; os LOGIN têm o fingerprint HMAC hex 64 (HMAC do username, nunca cru).
  for (const row of rows) {
    assert.match(row.ipHash, /^[0-9a-f]{64}$/);
    if (row.action === "LOGIN") assert.match(row.queryFingerprint ?? "", /^[0-9a-f]{64}$/);
  }
  // login não amarra bem → process_id sempre ausente.
  assert.equal(rows.every((r) => r.processId === undefined), true);
});

// ── (8) RACE de lost-update no lockout — N falhas CONCORRENTES na MESMA credencial DEVEM ENGATAR o lockout ────────
// Regressão do MEDIUM da junta (PR-18a). ANTES do fix o serviço lia `failedLoginCount` no findByUsername e gravava o
// valor ABSOLUTO (SET = k+1); sob N tentativas concorrentes TODAS liam `k` e gravavam `k+1` (lost update) → o contador
// travava em 1 e o lockout NUNCA engatava (PoC do crítico: 8 concorrentes, threshold 3 → contador 1, destravado).
// DEPOIS a falha é contabilizada ATOMICAMENTE no repo (incremento auto-referente; o Postgres serializa os updaters,
// o InMemory soma sobre o valor ATUAL da linha) e o lockout é decidido pelo estado RETORNADO → N falhas concorrentes
// somam +N e TRAVAM. Este teste FALHA no código antigo (contador=1, sem lock) e PASSA no novo.
test("race: N falhas de senha CONCORRENTES na mesma credencial ENGATAM o lockout (sem lost-update)", async () => {
  const THRESHOLD = 3;
  const CONCURRENT = 8; // mesmo shape do PoC do crítico
  const { service, repo } = buildHarness({
    lockThreshold: THRESHOLD,
    minLatencyMs: 0, // sem piso: o alvo é o CONTADOR, não o timing
    // baldes largos de propósito — o alvo é a race do contador, não o rate-limit (coberto em (3)).
    antiAbuse: {
      ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 3_600_000 },
      loginBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 3_600_000 },
      challengeBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 3_600_000 },
    },
  });
  const id = await seedCredential(repo, { username: "alvo.race", password: "a-senha-certa-000" });

  // cada login consome 1 desafio PoW → pré-emite/resolve CONCURRENT desafios ANTES do disparo paralelo.
  const solved = async (): Promise<{ challengeId: string; solution: string }> => {
    const issued = await service.challenge({ ip: "198.51.100.9" });
    if (issued.kind !== "issued") throw new Error("challenge inesperadamente barrado no teste de race");
    return { challengeId: issued.challenge.challengeId, solution: solveChallenge(issued.challenge.salt, issued.challenge.difficulty) };
  };
  const tickets = await Promise.all(Array.from({ length: CONCURRENT }, () => solved()));

  // dispara as CONCURRENT tentativas de senha ERRADA em PARALELO (Promise.all) na MESMA credencial.
  const results = await Promise.all(
    tickets.map((t) =>
      service.login({ username: "alvo.race", password: "senha-ERRADA-xyz", challengeId: t.challengeId, solution: t.solution, ip: "198.51.100.9" }),
    ),
  );
  assert.ok(results.every((r) => r.kind === "invalid"), "toda tentativa errada responde uniforme (invalid) — sem oráculo");

  // PROVA do fix: o contador somou +N (não ficou preso em 1) e o lockout ENGATOU.
  const after = await repo.findById(TENANT, id);
  assert.equal(after?.failedLoginCount, CONCURRENT, `o contador deve somar as ${CONCURRENT} falhas concorrentes (sem lost-update)`);
  assert.ok(after?.lockedUntil && after.lockedUntil.getTime() > Date.now(), "o lockout deve ENGATAR (locked_until no futuro)");

  // e a tentativa SEGUINTE — mesmo com a senha CERTA — cai em bloqueado (uniforme/invalid).
  const next = await solved();
  const blocked = await service.login({
    username: "alvo.race",
    password: "a-senha-certa-000",
    challengeId: next.challengeId,
    solution: next.solution,
    ip: "198.51.100.9",
  });
  assert.equal(blocked.kind, "invalid", "com o lockout engatado, até a senha certa é uniforme/invalid");
});
