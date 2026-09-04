import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type Request } from "express";

import { createAuthRouter } from "../src/modules/auth/routes/auth.routes.js";
import {
  AnonymousLoginService,
  loginIpBucketKey,
} from "../src/modules/auth/services/anonymous-login.service.js";
import {
  ANONYMOUS_LOGIN_BUCKET,
  LOGIN_IP_BUCKET,
} from "../src/modules/auth/anonymous-login.constants.js";
import type { LocalAuthLoginService } from "../src/modules/auth/services/local-auth-login.service.js";
import type { ICoreSaasService } from "../src/modules/core-saas/services/core-saas-service.interface.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-07a (§3.5 do plano) — freio por IP nas DUAS vias de POST /auth/login (com organização e
// anônima). Fecha o residual `P-O6R-B01-RATE-LIMIT-IP`: o balde do B01 é por E-MAIL, então rodar
// e-mails (ou tenants) no mesmo IP escapava do freio inteiro. Reuso do TokenBucket de
// portal-shared (zero dependência nova), chave = HMAC(subchave derivada de JWT_SECRET, ip).
// Parâmetros, relógio e extrator de IP são INJETÁVEIS — o teste não depende de socket real nem
// de espera de janela.
// Residual declarado e FORA deste bloco: X-Forwarded-For/proxy e balde multi-réplica (Redis) —
// `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`.
// -----------------------------------------------------------------------------------------------

const TEST_BUCKET = { capacity: 3, refillTokens: 3, refillIntervalMs: 60_000 } as const;

type Harness = {
  readonly baseUrl: string;
  readonly setIp: (ip: string) => void;
  readonly advance: (ms: number) => void;
  readonly close: () => Promise<void>;
};

test("[com organização] mesmo IP: esgotado o balde, a tentativa seguinte é 429 RATE_LIMITED", async () => {
  const harness = await buildHarness();

  try {
    for (let attempt = 0; attempt < TEST_BUCKET.capacity; attempt += 1) {
      const allowed = await login(harness.baseUrl, {
        tenantId: "11111111-1111-4111-8111-111111111111",
        email: `com-org-${attempt}@example.com`,
        password: "SenhaErrada123!",
      });

      assert.equal(allowed.status, 401, "dentro do balde a via segue respondendo o contrato normal");
    }

    const blocked = await login(harness.baseUrl, {
      tenantId: "11111111-1111-4111-8111-111111111111",
      email: "com-org-extra@example.com",
      password: "SenhaErrada123!",
    });

    assert.equal(blocked.status, 429);
    assert.equal((blocked.body.error as { code?: string })?.code, "RATE_LIMITED");
  } finally {
    await harness.close();
  }
});

test("[anônimo] e-mails DIFERENTES no mesmo IP → 429 (rotação de e-mail não escapa do freio)", async () => {
  const harness = await buildHarness();

  try {
    // Cada tentativa usa um e-mail novo: o balde por E-MAIL do B01 (10/15min) nunca é tocado.
    // Só o balde por IP pode parar isto — é exatamente o residual que este item fecha.
    for (let attempt = 0; attempt < TEST_BUCKET.capacity; attempt += 1) {
      const allowed = await login(harness.baseUrl, {
        email: `rotacao-${attempt}@example.com`,
        password: "SenhaErrada123!",
      });

      assert.equal(allowed.status, 401);
    }

    const blocked = await login(harness.baseUrl, {
      email: "rotacao-extra@example.com",
      password: "SenhaErrada123!",
    });

    assert.equal(blocked.status, 429, "o freio por IP alcança a via anônima, não só a direcionada");
    assert.equal((blocked.body.error as { code?: string })?.code, "RATE_LIMITED");
  } finally {
    await harness.close();
  }
});

test("IPs distintos NÃO compartilham balde — o vizinho de NAT esgotado não derruba o outro IP", async () => {
  const harness = await buildHarness();

  try {
    harness.setIp("203.0.113.10");

    for (let attempt = 0; attempt <= TEST_BUCKET.capacity; attempt += 1) {
      await login(harness.baseUrl, { email: `ip-a-${attempt}@example.com`, password: "x1234567" });
    }

    const stillBlocked = await login(harness.baseUrl, {
      email: "ip-a-final@example.com",
      password: "x1234567",
    });

    assert.equal(stillBlocked.status, 429, "o IP que estourou continua barrado");

    harness.setIp("203.0.113.99");

    const otherIp = await login(harness.baseUrl, {
      email: "ip-b@example.com",
      password: "x1234567",
    });

    assert.equal(otherIp.status, 401, "outro IP tem balde PRÓPRIO");
  } finally {
    await harness.close();
  }
});

test("relógio injetado: passada a janela de reposição, o balde repõe e o login volta", async () => {
  const harness = await buildHarness();

  try {
    for (let attempt = 0; attempt <= TEST_BUCKET.capacity; attempt += 1) {
      await login(harness.baseUrl, { email: `janela-${attempt}@example.com`, password: "x1234567" });
    }

    const blocked = await login(harness.baseUrl, { email: "janela-x@example.com", password: "x1234567" });

    assert.equal(blocked.status, 429);

    harness.advance(TEST_BUCKET.refillIntervalMs);

    const afterWindow = await login(harness.baseUrl, {
      email: "janela-y@example.com",
      password: "x1234567",
    });

    assert.equal(afterWindow.status, 401, "o freio é temporário — não vira bloqueio permanente de IP");
  } finally {
    await harness.close();
  }
});

test("a chave do balde é HMAC — nunca o IP em claro — e separa IPs distintos", () => {
  const secret = "test-secret";
  const key = loginIpBucketKey(secret, "203.0.113.10");

  assert.equal(key.includes("203.0.113.10"), false, "o IP não vai em claro para a chave do balde");
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(loginIpBucketKey(secret, " 203.0.113.10 "), key, "a chave normaliza espaço");
  assert.notEqual(loginIpBucketKey(secret, "203.0.113.11"), key);
  assert.notEqual(loginIpBucketKey("outro-secret", "203.0.113.10"), key, "a subchave separa domínio");
});

test("o balde por IP de PRODUÇÃO é ao menos tão generoso quanto o balde por e-mail", () => {
  // Se o freio por IP fosse mais apertado que o freio por e-mail, o balde do B01 viraria letra
  // morta e o primeiro a sentir o aperto seria o escritório atrás de NAT — não o atacante.
  assert.ok(
    LOGIN_IP_BUCKET.capacity >= ANONYMOUS_LOGIN_BUCKET.capacity,
    `capacity por IP (${LOGIN_IP_BUCKET.capacity}) < capacity por e-mail (${ANONYMOUS_LOGIN_BUCKET.capacity})`,
  );
  assert.ok(LOGIN_IP_BUCKET.refillIntervalMs > 0 && LOGIN_IP_BUCKET.refillTokens > 0);
});

// -----------------------------------------------------------------------------------------------
// Arnês: app express real com o router real. Serviço de login e serviço anônimo são dublês que
// sempre recusam — o que se mede aqui é o FREIO, não a autenticação.
// -----------------------------------------------------------------------------------------------
async function buildHarness(): Promise<Harness> {
  const state = { ip: "198.51.100.7", now: 1_000_000 };

  const loginService = {
    async authenticateLocalCredential() {
      return { ok: false, reason: "invalid_credentials" } as const;
    },
  } as unknown as LocalAuthLoginService;

  const anonymousLoginService = new AnonymousLoginService({
    listCandidates: async () => [],
    verifyCandidate: async () => ({ ok: false, reason: "invalid_credentials" }) as const,
    finalizeSuccess: async () => {},
    verifyPasswordFn: async () => false,
    minLatencyMs: 0,
  });

  const app = express();

  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter({
      getLoginService: async () => loginService,
      getCoreSaasService: async () => ({}) as unknown as ICoreSaasService,
      getAnonymousLoginService: async () => anonymousLoginService,
      loginIpRateLimit: {
        config: TEST_BUCKET,
        clock: () => state.now,
        resolveClientIp: (_request: Request) => state.ip,
      },
    }),
  );

  const server: Server = app.listen(0);

  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    setIp: (ip: string) => {
      state.ip = ip;
    },
    advance: (ms: number) => {
      state.now += ms;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function login(
  baseUrl: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}
