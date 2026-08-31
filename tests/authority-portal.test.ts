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
  // hash adulterado → false, sem lançar (tempo-constante via timingSafeEqual).
  // ARITMÉTICA DO BASE64 (SAN2-4b — medida, não escolhida por gosto; §2 do diário do dev). 32 bytes viram
  // 44 chars e o ÚLTIMO é SEMPRE "=" (5 000/5 000): o tamper anterior — `hash.at(-1) === "A" ? "B" : "A"` —
  // NUNCA via "A", então trocava o PADDING e não o dado. Os 44 chars resultantes decodificam para 33 bytes
  // com os 32 originais INTACTOS, e o `false` só acontecia por acaso (1/256). O PENÚLTIMO char também não
  // serve: ele carrega 4 bits de dado + 2 bits de preenchimento, e mexer nos 2 bits baixos decodifica para
  // os MESMOS 32 bytes (500/500 medidos). O PRIMEIRO char do payload carrega 6 bits do byte 0 — "A" vira
  // "B" (e vice-versa) mudando o byte 0 em 4: adulteração de DADO, canônica e com 32 bytes, que ATRAVESSA
  // os guards de formato e chega à derivação e ao timingSafeEqual — que é o que esta asserção diz exercitar.
  const parts = hash.split("$");
  const payloadAdulterado = (parts[5][0] === "A" ? "B" : "A") + parts[5].slice(1);
  const tampered = [...parts.slice(0, 5), payloadAdulterado].join("$");
  const bytesOriginais = Buffer.from(parts[5], "base64");
  const bytesAdulterados = Buffer.from(payloadAdulterado, "base64");
  // o tamper MORDE: mesmo comprimento, base64 canônico, keylen preservado — e os BYTES diferem.
  assert.equal(payloadAdulterado.length, parts[5].length);
  assert.equal(bytesAdulterados.toString("base64"), payloadAdulterado, "tamper canônico (não é troca de padding)");
  assert.equal(bytesAdulterados.length, 32, "tamper preserva o keylen: o que muda é o DADO");
  assert.ok(!bytesAdulterados.equals(bytesOriginais), "tamper muda os bytes derivados, não a codificação");
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

// ── (1-bis) GUARD DA CLASSE PADDING/COMPRIMENTO (SAN2-4b) ────────────────────────────────────────────────
// Por que estes dois testes existem. Até o SAN2-4b, o ÚNICO código do repositório que percorria o caminho
// "stored não-canônico ou de comprimento errado" era o tamper acima — e o percorria SEM SABER, asserindo
// `false` sobre algo que o `src/` aceitava a 1/256 (P(0 em 40) = 85,5 %: "ficou verde" não provava nada).
// Corrigido o tamper para adulterar DADO, a classe ficaria SEM TESTEMUNHA: reverter `parseStored` não
// quebraria mais nada. Estes dois testes são essa testemunha permanente — um por validação de `parseStored`
// (canonicidade e pino do keylen), que pegam vetores DISJUNTOS: nenhuma das duas validações é redundante.
// Os percentuais citados foram MEDIDOS contra o `src/` ANTERIOR à correção (diário do dev §2, N = 5 000).

test("hashing: stored com base64 NÃO-CANÔNICO é rejeitado (SAN2-4b — classe do padding)", async () => {
  const hash = await hashPassword("senha-forte-123", FAST_PARAMS);
  const parts = hash.split("$");
  const comHash = (payload: string) => [...parts.slice(0, 5), payload].join("$");
  const comSalt = (salt: string) => [...parts.slice(0, 4), salt, parts[5]].join("$");

  // (a) padding "=" REMOVIDO do hash: 43 chars que decodificam para os MESMOS 32 bytes — o texto muda, o
  //     dado não. Era aceito 5 000/5 000 (100 %) antes da correção: buraco DETERMINÍSTICO, e o único vetor
  //     desta bateria que SÓ a canonicidade pega (para o pino do keylen são 32 === 32, nada a ver).
  const semPadding = parts[5].slice(0, -1);
  assert.equal(parts[5].at(-1), "=", "32 bytes em base64 sempre terminam em padding");
  assert.equal(Buffer.from(semPadding, "base64").length, 32, "decodifica para os MESMOS 32 bytes");
  assert.notEqual(Buffer.from(semPadding, "base64").toString("base64"), semPadding, "e é não-canônico");
  assert.equal(await verifyPassword("senha-forte-123", comHash(semPadding)), false);

  // (b) o TAMPER ANTIGO preservado como CASO: "=" trocado por "A" → 44 chars → 33 bytes (os 32 originais
  //     + 0x00). Aceito a ~1/256 antes da correção (24/5 000) — é a intermitência que o SAN2-4a mediu.
  const paddingTrocado = parts[5].slice(0, -1) + "A";
  assert.equal(Buffer.from(paddingTrocado, "base64").length, 33, "trocar o padding ACRESCENTA um 33.º byte");
  assert.equal(await verifyPassword("senha-forte-123", comHash(paddingTrocado)), false);

  // (c) o SALT também é validado, não só o hash: 16 bytes → 24 chars terminando em "==". Sem o padding ele
  //     decodifica para os mesmos 16 bytes, e era aceito 500/500 (100 %) antes da correção.
  const saltSemPadding = parts[4].replace(/=+$/, "");
  assert.notEqual(saltSemPadding, parts[4], "o salt canônico tem padding a remover");
  assert.equal(await verifyPassword("senha-forte-123", comSalt(saltSemPadding)), false);
});

test("hashing: hash canônico de comprimento diferente do keylen é rejeitado (SAN2-4b — pino do keylen)", async () => {
  const hash = await hashPassword("senha-forte-123", FAST_PARAMS);
  const parts = hash.split("$");
  const derivado = Buffer.from(parts[5], "base64");
  const comBytes = (buf: Buffer) => [...parts.slice(0, 5), buf.toString("base64")].join("$");
  assert.equal(derivado.length, AUTHORITY_SCRYPT_PARAMS.keylen, "o keylen é constante do SISTEMA");

  // (a) EXTENSÃO em comprimento: 33 bytes em base64 impecavelmente canônico. Como o `keylen` vinha do
  //     stored RECEBIDO e o scrypt é prefixo-estável, isto era aceito a ~1/256 por byte extra (12/5 000).
  //     É a metade da OBS-2 que a canonicidade NÃO pega — o texto aqui é canônico.
  const estendido = Buffer.concat([derivado, Buffer.from([0x00])]);
  assert.equal(estendido.length, 33);
  const estendidoB64 = estendido.toString("base64");
  assert.equal(Buffer.from(estendidoB64, "base64").toString("base64"), estendidoB64, "vetor canônico");
  assert.equal(await verifyPassword("senha-forte-123", comBytes(estendido)), false);

  // (b) TRUNCAMENTO: 31 bytes canônicos. Prefixo-estável + keylen vindo do input = QUALQUER prefixo do
  //     hash autenticava — 5 000/5 000 (100 %) antes da correção. Determinístico, não intermitente.
  assert.equal(await verifyPassword("senha-forte-123", comBytes(derivado.subarray(0, 31))), false);

  // (c) e o caminho feliz segue feliz — o pino não rejeita credencial legítima.
  assert.equal(await verifyPassword("senha-forte-123", hash), true);
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
