import assert from "node:assert/strict";
import test from "node:test";

import { LocalAuthLoginService } from "../src/modules/auth/services/local-auth-login.service.js";
import { AnonymousLoginService } from "../src/modules/auth/services/anonymous-login.service.js";
import {
  LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
  LOGIN_LOCKOUT_MINUTES,
} from "../src/modules/auth/anonymous-login.constants.js";
import { hashPassword } from "../src/modules/auth/services/password.service.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-07a · CICLO 2 (C2·3 do plano) — a forma MULTI-ORGANIZAÇÃO do lockout anônimo, que é onde
// o defeito `C2-A1` vivia e que o arnês do ciclo 1 (mono-org) não exercia. As sondas da cadeira C2
// do ciclo 1 viram aqui casos permanentes (M1–M5).
//
// O desenho do ciclo 2: `verifyAnonymousCandidate` volta a ser SEM efeito colateral; a cobrança é
// ATO ÚNICO PÓS-VEREDICTO em `AnonymousLoginService.attempt` (ramo `successes.length === 0`),
// via dep `registerFailure` → `LocalAuthLoginService.registerAnonymousFailure`, que reusa o MESMO
// `incrementFailedAttempts` atômico do B01 + o MESMO `recordLoginFailure` append-only (agora com
// ipAddress/userAgent — fecha `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP`). Cobra-se EXATAMENTE UM
// candidato por requisição falhada: entre os que falharam a SENHA (nunca os em lock, nunca os
// inexistentes), o de MENOR failed_attempts (empate → ordem estável da lista).
//
// As 4 propriedades do C2·3 que este arquivo protege:
//   1. força bruta anônima segue armando lockout e deixando rastro (M4);
//   2. uso CORRETO nunca tranca o próprio dono (M1);
//   3. 1 requisição ≠ N incrementos (M3);
//   4. login bem-sucedido não fabrica auditoria (M2).
// M5 preserva a invariante do B01: 401 uniforme, lock indistinguível de inexistente.
//
// VERMELHO-CONTROLE (protocolo do C2·6 item 1): M1/M2/M3 vermelhos no head do ciclo 1 (pré-
// correção); M4 vermelho na BASE `f895dd2` (contador parado — o vermelho herdado do SEC-003);
// M5 é regressão declarada, sem vermelho próprio. Registro em
// agent-orchestration/omega/juntas/votos/O6R-07a/dev-ciclo2.md.
// -----------------------------------------------------------------------------------------------

const ORG_A = "tenant-multi-a";
const ORG_B = "tenant-multi-b";
const EMAIL = "dona@example.com";
const SENHA_A = "SenhaDaOrgA123!";
const SENHA_B = "SenhaDaOrgB123!";
const SENHA_ERRADA = "SenhaErradaNasDuas123!";

test("M1 — 5 logins anônimos CORRETOS na org A não trancam a org B; o login direto na B segue entrando", async () => {
  const harness = await buildMultiOrgHarness();

  for (let attempt = 0; attempt < LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS; attempt += 1) {
    const outcome = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_A });

    assert.equal(outcome.kind, "success", `login correto nº ${attempt + 1} tem de ser success`);
    assert.equal(outcome.kind === "success" ? outcome.tenantId : null, ORG_A);
  }

  assert.equal(
    harness.rows[ORG_B].failed_attempts,
    0,
    "uso CORRETO na org A não pode mover o contador da org B (propriedade 2 do C2·3)",
  );
  assert.equal(harness.rows[ORG_B].locked_until, null, "a org B não pode estar trancada");

  const direto = await harness.service.authenticateLocalCredential({
    tenant_id: ORG_B,
    email: EMAIL,
    password: SENHA_B,
  });

  assert.equal(direto.ok, true, "o dono entra na org B com a senha certa — ninguém o trancou");
});

test("M2 — 1 login anônimo bem-sucedido fabrica ZERO linha auth.login.failed (em qualquer organização)", async () => {
  const harness = await buildMultiOrgHarness();

  const outcome = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_A });

  assert.equal(outcome.kind, "success");

  const falhas = harness.auditRows.filter((row) => row.action === "auth.login.failed");

  assert.equal(
    falhas.length,
    0,
    `login bem-sucedido não fabrica auditoria de falha (propriedade 4); veio: ${JSON.stringify(falhas)}`,
  );
});

test("M3 — 1 requisição anônima com senha errada = 1 incremento + 1 linha de auditoria, com ipAddress/userAgent", async () => {
  const harness = await buildMultiOrgHarness();

  const outcome = await harness.anonymous.attempt({
    email: EMAIL,
    password: SENHA_ERRADA,
    ipAddress: "203.0.113.7",
    userAgent: "sonda-m3/1.0",
  });

  assert.deepEqual(outcome, { kind: "invalid" }, "a resposta é o 401 uniforme, sem dado de cobrança serializado");

  const somaIncrementos = harness.rows[ORG_A].failed_attempts + harness.rows[ORG_B].failed_attempts;

  assert.equal(somaIncrementos, 1, "cobrança é ATO ÚNICO: 1 requisição = 1 incremento (propriedade 3)");

  const falhas = harness.auditRows.filter((row) => row.action === "auth.login.failed");

  assert.equal(falhas.length, 1, "1 requisição falhada = exatamente 1 linha de auditoria");

  const [linha] = falhas;
  const metadata = linha.metadata as {
    loginMode?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  assert.equal(metadata.loginMode, "without_org");
  assert.equal(metadata.reason, "invalid_credentials");
  assert.equal(metadata.ipAddress, "203.0.113.7", "o rastro anônimo agora carrega o ipAddress");
  assert.equal(metadata.userAgent, "sonda-m3/1.0", "o rastro anônimo agora carrega o userAgent");
  assert.equal(
    JSON.stringify(linha).includes(SENHA_ERRADA),
    false,
    "allowlist preservada: a senha nunca entra no rastro",
  );
});

test("M4 — ataque anônimo sustentado tranca as DUAS organizações (armar preservado) e deixa rastro linha a linha", async () => {
  const harness = await buildMultiOrgHarness();

  // 2 organizações × teto de 5 falhas = 10 requisições (dentro da capacidade do balde por e-mail,
  // que é 10/15min). A cobrança única alterna entre as orgs (menor failed_attempts primeiro), então
  // a 10ª requisição fecha o segundo lock.
  const totalRequisicoes = 2 * LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS;

  for (let attempt = 0; attempt < totalRequisicoes; attempt += 1) {
    const outcome = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_ERRADA });

    assert.equal(outcome.kind, "invalid", "toda falha anônima responde o MESMO 401 uniforme");
  }

  for (const org of [ORG_A, ORG_B]) {
    assert.equal(
      harness.rows[org].failed_attempts,
      LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
      `${org}: o ataque sustentado move o contador real até o teto (propriedade 1)`,
    );
    assert.ok(harness.rows[org].locked_until, `${org}: o lockout ARMA de verdade`);
    assert.ok((harness.rows[org].locked_until?.getTime() ?? 0) > Date.now());
  }

  const falhas = harness.auditRows.filter((row) => row.action === "auth.login.failed");

  assert.equal(
    falhas.length,
    totalRequisicoes,
    "rastro linha a linha: 1 requisição falhada = 1 linha (nem N por requisição, nem silêncio)",
  );
});

test("M5 — conta em lock × conta inexistente: respostas indistinguíveis (401 uniforme; 423 nunca vaza) [regressão C2-2.a]", async () => {
  const harness = await buildMultiOrgHarness();

  harness.rows[ORG_A].locked_until = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000);
  harness.rows[ORG_B].locked_until = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000);

  const mutacoesAntes = harness.mutations.length;
  const sobLock = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_A });
  const fantasma = await harness.anonymous.attempt({ email: "ghost@example.com", password: SENHA_A });

  assert.equal(sobLock.kind, "invalid");
  assert.deepEqual(sobLock, fantasma, "lock e inexistente são INDISTINGUÍVEIS na resposta anônima");
  assert.equal(JSON.stringify(sobLock).includes(ORG_A), false, "a resposta não enumera organizações");
  assert.equal(
    harness.mutations.length,
    mutacoesAntes,
    "o lock não é combustível: candidato em lock não incrementa; inexistente não tem o que cobrar",
  );
  assert.equal(
    harness.auditRows.filter((row) => row.action === "auth.login.failed").length,
    0,
    "nem o lock nem o e-mail inexistente fabricam linha de falha",
  );
});

// -----------------------------------------------------------------------------------------------
// Arnês multi-organização — espelho fiel do arnês mono-org de `o6r07a-anon-lockout.test.ts`, com
// DUAS organizações, o MESMO e-mail e senhas distintas (a forma que as sondas da C2 provaram).
// O dublê espelha o UPDATE atômico do B01 (local-auth-credential.repository.ts:111-122).
// -----------------------------------------------------------------------------------------------
type CredentialRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_hash: string;
  locked_until: Date | null;
  failed_attempts: number;
};

class MultiOrgLockoutMirrorRepository {
  readonly mutations: string[] = [];

  constructor(readonly rows: Record<string, CredentialRow>) {}

  async findByEmailForTenant(email: string, tenantId: string): Promise<CredentialRow | null> {
    const row = this.rows[tenantId];

    return row && row.email === email ? row : null;
  }

  async incrementFailedAttempts(id: string, tenantId: string): Promise<void> {
    this.mutations.push(`incrementFailedAttempts:${id}:${tenantId}`);

    const row = this.rows[tenantId];

    if (!row || row.id !== id) {
      return;
    }

    row.failed_attempts += 1;

    if (row.failed_attempts >= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS) {
      row.locked_until = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000);
    }
  }

  async markSuccessfulLogin(id: string, tenantId: string): Promise<void> {
    this.mutations.push(`markSuccessfulLogin:${id}:${tenantId}`);

    const row = this.rows[tenantId];

    if (!row || row.id !== id) {
      return;
    }

    row.failed_attempts = 0;
    row.locked_until = null;
  }
}

type AuditRow = { readonly tenant_id: string; readonly action: string; readonly metadata: unknown };

async function buildMultiOrgHarness(): Promise<{
  readonly service: LocalAuthLoginService;
  readonly anonymous: AnonymousLoginService;
  readonly rows: Record<string, CredentialRow>;
  readonly mutations: string[];
  readonly auditRows: AuditRow[];
}> {
  const [hashA, hashB] = await Promise.all([hashPassword(SENHA_A), hashPassword(SENHA_B)]);
  const rows: Record<string, CredentialRow> = {
    [ORG_A]: {
      id: "credential-a",
      tenant_id: ORG_A,
      user_id: "user-a",
      email: EMAIL,
      password_hash: hashA.password_hash,
      locked_until: null,
      failed_attempts: 0,
    },
    [ORG_B]: {
      id: "credential-b",
      tenant_id: ORG_B,
      user_id: "user-b",
      email: EMAIL,
      password_hash: hashB.password_hash,
      locked_until: null,
      failed_attempts: 0,
    },
  };
  const repository = new MultiOrgLockoutMirrorRepository(rows);
  const auditRows: AuditRow[] = [];

  const service = new LocalAuthLoginService(
    repository,
    { async findById(tenantId: string) { return { id: tenantId, name: `Org ${tenantId}` }; } },
    {
      async findByIdForTenant(userId: string, tenantId: string) {
        return { id: userId, tenant_id: tenantId, email: EMAIL, name: "Dona", status: "active" };
      },
    },
    { async listByUserForTenant() { return []; } },
    {
      async create(data) {
        auditRows.push(data as unknown as AuditRow);

        return { ...(data as object), id: `audit-${auditRows.length}`, created_at: new Date() } as never;
      },
    },
  );

  const anonymous = new AnonymousLoginService({
    // Ordem ESTÁVEL: A antes de B — é a ordem que decide o empate da cobrança única.
    listCandidates: async (email: string) =>
      email === EMAIL
        ? [
            { tenantId: ORG_A, userId: "user-a" },
            { tenantId: ORG_B, userId: "user-b" },
          ]
        : [],
    verifyCandidate: (tenantId, email, password, verifyPasswordFn) =>
      service.verifyAnonymousCandidate({ tenant_id: tenantId, email, password }, verifyPasswordFn),
    finalizeSuccess: (tenantId, credentialId, user, roleCount, auditContext) =>
      service.finalizeAnonymousLogin(tenantId, credentialId, user, roleCount, auditContext),
    registerFailure: (tenantId, credentialId, email, auditContext) =>
      service.registerAnonymousFailure(tenantId, credentialId, email, auditContext),
    minLatencyMs: 0,
  });

  return { service, anonymous, rows, mutations: repository.mutations, auditRows };
}
