import assert from "node:assert/strict";
import test from "node:test";

import {
  AnonymousLoginService,
  anonymousEmailBucketKey,
  type AnonymousLoginCandidateRef,
} from "../src/modules/auth/services/anonymous-login.service.js";
import type { AnonymousCandidateResult } from "../src/modules/auth/services/local-auth-login.service.js";
import {
  ANONYMOUS_LOGIN_BUCKET,
  ANONYMOUS_LOGIN_MIN_LATENCY_MS,
  MAX_LOGIN_CANDIDATES,
} from "../src/modules/auth/anonymous-login.constants.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§6 do plano, grupo C2/S3/S4) — o canal anônimo deixa de ser grátis. "Zero scrypt" é
// provado por CONTADOR (espião injetado em verifyPassword), nunca por relógio (§6.4.4).
// -----------------------------------------------------------------------------------------------

type SpyHarness = {
  readonly service: AnonymousLoginService;
  readonly scryptCalls: () => number;
  readonly sleeps: () => number[];
  readonly verifiedTenantsInOrder: () => string[];
};

function buildService(options: {
  readonly candidates: AnonymousLoginCandidateRef[] | (() => Promise<AnonymousLoginCandidateRef[]>);
  readonly verdictByTenant?: Record<string, AnonymousCandidateResult>;
  readonly finalized?: Array<{ tenantId: string; credentialId: string }>;
}): SpyHarness {
  let scryptCalls = 0;
  const sleeps: number[] = [];
  const verifiedTenants: string[] = [];
  const clockState = { now: 1_000_000 };

  const service = new AnonymousLoginService({
    listCandidates: async () =>
      typeof options.candidates === "function" ? options.candidates() : options.candidates,
    verifyCandidate: async (tenantId, _email, _password, verifyPasswordFn) => {
      verifiedTenants.push(tenantId);
      // Conta o scrypt exatamente como o serviço real: uma verificação por candidato.
      await verifyPasswordFn("password", "hash");

      return (
        options.verdictByTenant?.[tenantId] ?? { ok: false, reason: "invalid_credentials" }
      );
    },
    finalizeSuccess: async (tenantId, credentialId) => {
      options.finalized?.push({ tenantId, credentialId });
    },
    verifyPasswordFn: async () => {
      scryptCalls += 1;

      return false;
    },
    clock: () => clockState.now,
    sleep: async (ms) => {
      sleeps.push(ms);
      clockState.now += ms;
    },
  });

  return {
    service,
    scryptCalls: () => scryptCalls,
    sleeps: () => sleeps,
    verifiedTenantsInOrder: () => verifiedTenants,
  };
}

function okResult(tenantId: string, name: string): AnonymousCandidateResult {
  return {
    ok: true,
    credential_id: `cred-${tenantId}`,
    user: {
      id: `user-${tenantId}`,
      tenant_id: tenantId,
      email: "pessoa@example.com",
      name: "Pessoa",
      status: "active",
    },
    tenant: { id: tenantId, name },
    roles: [{ id: "r1", key: "viewer", name: "Viewer" }],
  };
}

test("balde por e-mail estoura → 429 com contador de scrypt = 0 (nem a fonte de candidatos é tocada)", async () => {
  let candidateReads = 0;
  const harness = buildService({
    candidates: async () => {
      candidateReads += 1;

      return [];
    },
  });

  // Esgota o balde (capacity tentativas legítimas) e então mais uma → rate_limited.
  for (let i = 0; i < ANONYMOUS_LOGIN_BUCKET.capacity; i += 1) {
    await harness.service.attempt({ email: "balde@example.com", password: "x" });
  }

  const readsBefore = candidateReads;
  const scryptBefore = harness.scryptCalls();
  const outcome = await harness.service.attempt({ email: "balde@example.com", password: "x" });

  assert.equal(outcome.kind, "rate_limited");
  assert.equal(candidateReads, readsBefore, "429 não toca a fonte de candidatos");
  assert.equal(harness.scryptCalls(), scryptBefore, "429 custa ZERO scrypt");
});

test("teto: MAX+1 candidatos → 400 TENANT_ID_REQUIRED com contador de scrypt = 0", async () => {
  const candidates = Array.from({ length: MAX_LOGIN_CANDIDATES + 1 }, (_, index) => ({
    tenantId: `tenant-${index}`,
    userId: `user-${index}`,
  }));
  const harness = buildService({ candidates });

  const outcome = await harness.service.attempt({ email: "muitas@example.com", password: "x" });

  assert.equal(outcome.kind, "tenant_id_required");
  assert.equal(harness.scryptCalls(), 0, "o desfecho de teto custa ZERO scrypt (C7)");
});

test("0 candidatos: hash dummy roda (1 scrypt) e o desfecho é 401 uniforme — e-mail inexistente responde igual a senha errada", async () => {
  const semCandidato = buildService({ candidates: [] });
  const outcome = await semCandidato.service.attempt({ email: "nao-existe@example.com", password: "x" });

  assert.equal(outcome.kind, "invalid");
  assert.equal(semCandidato.scryptCalls(), 1, "o dummy custa exatamente 1 scrypt (anti-oráculo)");

  const senhaErrada = buildService({
    candidates: [{ tenantId: "t1", userId: "u1" }],
  });
  const outcomeSenhaErrada = await senhaErrada.service.attempt({
    email: "existe@example.com",
    password: "errada",
  });

  assert.equal(outcomeSenhaErrada.kind, "invalid");
  assert.equal(senhaErrada.scryptCalls(), 1, "senha errada em 1 candidato também custa 1 scrypt");
  // Os dois desfechos são o MESMO objeto de saída (uniformidade — quem olha a resposta não
  // distingue e-mail inexistente de senha errada).
  assert.deepEqual(outcome, outcomeSenhaErrada);
});

test("verificação é estritamente SEQUENCIAL na ordem dos candidatos, com 1..MAX scrypt", async () => {
  const harness = buildService({
    candidates: [
      { tenantId: "t-a", userId: "u-a" },
      { tenantId: "t-b", userId: "u-b" },
      { tenantId: "t-c", userId: "u-c" },
    ],
  });

  await harness.service.attempt({ email: "tres@example.com", password: "x" });

  assert.deepEqual(harness.verifiedTenantsInOrder(), ["t-a", "t-b", "t-c"]);
  assert.equal(harness.scryptCalls(), 3, "pior caso EXATO: 3 scrypt sequenciais (3 organizações)");
});

test("candidato em LOCK no caminho anônimo → 401 uniforme (o 423 não existe aqui)", async () => {
  const harness = buildService({
    candidates: [{ tenantId: "t-lock", userId: "u-lock" }],
    verdictByTenant: { "t-lock": { ok: false, reason: "locked" } },
  });

  const outcome = await harness.service.attempt({ email: "lock@example.com", password: "x" });

  assert.equal(outcome.kind, "invalid", "lock anônimo achata em 401 — nunca vaza o estado da conta");
});

test("2+ sucessos → selection_required com SOMENTE as organizações provadas", async () => {
  const harness = buildService({
    candidates: [
      { tenantId: "t-1", userId: "u-1" },
      { tenantId: "t-2", userId: "u-2" },
      { tenantId: "t-3", userId: "u-3" },
    ],
    verdictByTenant: {
      "t-1": okResult("t-1", "Org Um"),
      "t-3": okResult("t-3", "Org Três"),
    },
  });

  const outcome = await harness.service.attempt({ email: "multi@example.com", password: "x" });

  assert.equal(outcome.kind, "selection_required");
  assert.deepEqual(
    outcome.kind === "selection_required" ? outcome.tenants : [],
    [
      { id: "t-1", name: "Org Um" },
      { id: "t-3", name: "Org Três" },
    ],
    "só as PROVADAS aparecem — t-2 (senha errada lá) fica de fora",
  );
});

test("1 sucesso → success finaliza (contadores/auditoria) na organização que autenticou", async () => {
  const finalized: Array<{ tenantId: string; credentialId: string }> = [];
  const harness = buildService({
    candidates: [
      { tenantId: "t-x", userId: "u-x" },
      { tenantId: "t-y", userId: "u-y" },
    ],
    verdictByTenant: { "t-y": okResult("t-y", "Org Y") },
    finalized,
  });

  const outcome = await harness.service.attempt({ email: "um@example.com", password: "x" });

  assert.equal(outcome.kind, "success");
  assert.equal(outcome.kind === "success" ? outcome.tenantId : null, "t-y");
  assert.deepEqual(finalized, [{ tenantId: "t-y", credentialId: "cred-t-y" }]);
});

test("piso de latência constante em TODOS os desfechos — inclusive 429 e 400", async () => {
  const casos: Array<{ harness: SpyHarness; email: string; expectKind: string }> = [
    { harness: buildService({ candidates: [] }), email: "a@example.com", expectKind: "invalid" },
    {
      harness: buildService({
        candidates: Array.from({ length: MAX_LOGIN_CANDIDATES + 1 }, (_, index) => ({
          tenantId: `t-${index}`,
          userId: `u-${index}`,
        })),
      }),
      email: "b@example.com",
      expectKind: "tenant_id_required",
    },
  ];

  for (const caso of casos) {
    const outcome = await caso.harness.service.attempt({ email: caso.email, password: "x" });

    assert.equal(outcome.kind, caso.expectKind);

    const totalSlept = caso.harness.sleeps().reduce((sum, ms) => sum + ms, 0);

    assert.equal(
      totalSlept,
      ANONYMOUS_LOGIN_MIN_LATENCY_MS,
      `desfecho ${caso.expectKind} dorme até o piso (relógio falso não avança sozinho)`,
    );
  }

  // 429: esgota o balde e mede o settle do desfecho limitado.
  const limited = buildService({ candidates: [] });

  for (let i = 0; i < ANONYMOUS_LOGIN_BUCKET.capacity; i += 1) {
    await limited.service.attempt({ email: "c@example.com", password: "x" });
  }

  const sleepsBefore = limited.sleeps().length;
  const outcome = await limited.service.attempt({ email: "c@example.com", password: "x" });

  assert.equal(outcome.kind, "rate_limited");
  assert.equal(limited.sleeps().length, sleepsBefore + 1, "o 429 também passa pelo settle");
});

test("chave do balde NORMALIZADA: 'A@X.com', 'a@x.com' e ' a@x.com ' caem num ÚNICO balde", () => {
  const secret = "test-secret";
  const canonical = anonymousEmailBucketKey(secret, "a@x.com");

  assert.equal(anonymousEmailBucketKey(secret, "A@X.com"), canonical);
  assert.equal(anonymousEmailBucketKey(secret, " a@x.com "), canonical);
  assert.notEqual(anonymousEmailBucketKey(secret, "b@x.com"), canonical);
});

test("as variantes de caixa/espaço CONSOMEM o mesmo balde (não só a mesma chave)", async () => {
  const harness = buildService({ candidates: [] });

  for (let i = 0; i < ANONYMOUS_LOGIN_BUCKET.capacity; i += 1) {
    await harness.service.attempt({ email: "MESMO@BALDE.com", password: "x" });
  }

  const outcome = await harness.service.attempt({ email: " mesmo@balde.com ", password: "x" });

  assert.equal(outcome.kind, "rate_limited", "variar caixa/espaço não escapa do freio (crítico 7)");
});
