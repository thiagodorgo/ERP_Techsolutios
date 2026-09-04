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
// B-O6R-07a (§3.4 do plano) — o caminho ANÔNIMO passa a armar o lockout e a deixar rastro.
// Fecha `P-O6R-B01-ANONIMO-SEM-LOCKOUT` (ALTA): o B01 escreveu, com todas as letras, que "falha
// anônima não incrementa contador de candidato nem audita" — 12 tentativas medidas pelo secops
// deixavam o contador PARADO, ou seja, força bruta ilimitada e sem rastro por uma via que não
// exige sequer conhecer a organização.
//
// Duas invariantes que este arquivo protege, e que são a razão de ele existir:
//   (I-REUSO)  o incremento é o MESMO `incrementFailedAttempts` atômico do B01. Nenhum contador
//              novo, nenhum read-modify-write novo. Provado por REPOSITÓRIO SELADO: qualquer
//              método fora dos três do contrato LANÇA.
//   (I-401)    a RESPOSTA anônima segue 401 uniforme — o 423 NUNCA vaza no caminho anônimo, e a
//              lista de organizações nunca aparece. Armar o lockout não pode custar o
//              anti-enumeração que o B01 comprou.
//
// A prova contra Postgres real (o UPDATE atômico de verdade) está em `o6r07a-anon-lockout-db`.
// Aqui o dublê ESPELHA aquele UPDATE — é teste de FIAÇÃO, e está dito.
// -----------------------------------------------------------------------------------------------

const TENANT = "tenant-anon";
const EMAIL = "alvo@example.com";
const SENHA_CERTA = "SenhaCerta123!";
const SENHA_ERRADA = "SenhaErrada123!";

// CICLO 2 (C2·3): o sítio da cobrança saiu de `verifyAnonymousCandidate` (que voltou a ser SEM
// efeito colateral) para o ato único pós-veredicto em `AnonymousLoginService.attempt`. Ajuste
// MECÂNICO exigido pela assinatura interna: os dois primeiros testes passam a exercer o caminho
// real (`attempt`); as asserções de contagem NÃO afrouxam — 1 falha mono-org segue = 1 incremento
// (o MESMO do B01) + 1 linha de rastro, idêntico ao ciclo 1.
test("(I-REUSO) falha anônima chama o incrementFailedAttempts do B01 — e NENHUM contador novo", async () => {
  const harness = await buildHarness();

  const outcome = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_ERRADA });

  assert.equal(outcome.kind, "invalid");
  assert.deepEqual(
    harness.repository.mutations,
    [`incrementFailedAttempts:credential-1:${TENANT}`],
    "a ÚNICA mutação da falha anônima é o incremento atômico do B01",
  );
  assert.equal(harness.repository.row.failed_attempts, 1);
});

test("(rastro) a falha anônima deixa 1 linha de auditoria interna, marcada como sem organização", async () => {
  const harness = await buildHarness();

  await harness.anonymous.attempt({ email: EMAIL, password: SENHA_ERRADA });

  assert.equal(harness.auditRows.length, 1, "exatamente UMA linha por candidato que falhou");

  const [row] = harness.auditRows;

  assert.equal(row.tenant_id, TENANT, "o rastro vive na organização do candidato — é interno");
  assert.equal(row.action, "auth.login.failed");

  const metadata = row.metadata as { email?: string; reason?: string; loginMode?: string };

  assert.equal(metadata.loginMode, "without_org", "distingue o modo sem organização do direcionado");
  assert.equal(metadata.reason, "invalid_credentials");
  assert.equal(metadata.email, EMAIL);
  assert.equal(
    JSON.stringify(row).includes(SENHA_ERRADA),
    false,
    "allowlist: nem senha nem hash entram no rastro",
  );
});

test("candidato SEM credencial na organização: nada incrementa e nada é auditado", async () => {
  const harness = await buildHarness();

  const result = await harness.service.verifyAnonymousCandidate({
    tenant_id: TENANT,
    email: "nao-existe@example.com",
    password: SENHA_ERRADA,
  });

  assert.equal(result.ok === false ? result.reason : null, "invalid_credentials");
  assert.deepEqual(harness.repository.mutations, [], "sem credencial não há contador a mover");
  assert.equal(harness.auditRows.length, 0);
});

test("candidato já em LOCK: nem incrementa nem audita de novo (o lock não é combustível)", async () => {
  const harness = await buildHarness();

  harness.repository.row.locked_until = new Date(Date.now() + 60_000);

  const result = await harness.service.verifyAnonymousCandidate({
    tenant_id: TENANT,
    email: EMAIL,
    password: SENHA_ERRADA,
  });

  assert.equal(result.ok === false ? result.reason : null, "locked");
  assert.deepEqual(harness.repository.mutations, []);
  assert.equal(harness.auditRows.length, 0);
});

test(`${LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS} falhas ANÔNIMAS armam o lockout — e o login DIRETO passa a recusar por locked`, async () => {
  const harness = await buildHarness();

  for (let attempt = 0; attempt < LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS; attempt += 1) {
    const outcome = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_ERRADA });

    assert.equal(outcome.kind, "invalid", "(I-401) toda falha anônima responde o MESMO 401 uniforme");
  }

  assert.equal(harness.repository.row.failed_attempts, LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS);
  assert.ok(harness.repository.row.locked_until, "a Nª falha ANÔNIMA arma o lockout");
  assert.ok((harness.repository.row.locked_until?.getTime() ?? 0) > Date.now());

  const direto = await harness.service.authenticateLocalCredential({
    tenant_id: TENANT,
    email: EMAIL,
    password: SENHA_CERTA,
  });

  assert.equal(direto.ok, false);
  assert.equal(direto.ok === false ? direto.reason : null, "locked");
});

test("(I-401) senha CERTA sob lock: direto devolve locked; anônimo achata em 401 — o 423 não vaza", async () => {
  const harness = await buildHarness();

  harness.repository.row.failed_attempts = LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS;
  harness.repository.row.locked_until = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000);

  const direto = await harness.service.authenticateLocalCredential({
    tenant_id: TENANT,
    email: EMAIL,
    password: SENHA_CERTA,
  });

  assert.equal(direto.ok === false ? direto.reason : null, "locked");

  const anonimo = await harness.anonymous.attempt({ email: EMAIL, password: SENHA_CERTA });
  const fantasma = await harness.anonymous.attempt({ email: "ghost@example.com", password: SENHA_CERTA });

  assert.equal(anonimo.kind, "invalid");
  assert.deepEqual(
    anonimo,
    fantasma,
    "conta em lock e e-mail inexistente são INDISTINGUÍVEIS na resposta anônima",
  );
  assert.equal(JSON.stringify(anonimo).includes(TENANT), false, "a resposta não enumera organizações");
});

test("passada a janela do lockout, a senha certa volta a entrar e o contador zera", async () => {
  const harness = await buildHarness();

  for (let attempt = 0; attempt < LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS; attempt += 1) {
    await harness.anonymous.attempt({ email: EMAIL, password: SENHA_ERRADA });
  }

  assert.ok(harness.repository.row.locked_until, "pré-condição: o lockout está armado");

  // TTL simulado pelo VENCIMENTO ARMAZENADO: `LocalAuthLoginService` compara `locked_until` com
  // `new Date()` e NÃO tem relógio injetável (seam fora do §3.4). Rebobinar o vencimento para o
  // passado é a operação equivalente a avançar o relógio além da janela de 15 min — declarado.
  harness.repository.row.locked_until = new Date(Date.now() - 1_000);

  const direto = await harness.service.authenticateLocalCredential({
    tenant_id: TENANT,
    email: EMAIL,
    password: SENHA_CERTA,
  });

  assert.equal(direto.ok, true, "o lockout é TEMPORÁRIO — não vira bloqueio permanente da conta");
  assert.equal(harness.repository.row.failed_attempts, 0, "o sucesso zera o contador");
  assert.equal(harness.repository.row.locked_until, null);
});

// -----------------------------------------------------------------------------------------------
// Arnês
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

// Dublê que ESPELHA o UPDATE atômico do B01 (local-auth-credential.repository.ts:111-122):
// incrementa e, ao alcançar o teto, grava locked_until = now + LOGIN_LOCKOUT_MINUTES.
class LockoutMirrorRepository {
  readonly mutations: string[] = [];

  constructor(readonly row: CredentialRow) {}

  async findByEmailForTenant(email: string, tenantId: string): Promise<CredentialRow | null> {
    return this.row.email === email && this.row.tenant_id === tenantId ? this.row : null;
  }

  async incrementFailedAttempts(id: string, tenantId: string): Promise<void> {
    this.mutations.push(`incrementFailedAttempts:${id}:${tenantId}`);

    if (this.row.id !== id || this.row.tenant_id !== tenantId) {
      return;
    }

    this.row.failed_attempts += 1;

    if (this.row.failed_attempts >= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS) {
      this.row.locked_until = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000);
    }
  }

  async markSuccessfulLogin(id: string, tenantId: string): Promise<void> {
    this.mutations.push(`markSuccessfulLogin:${id}:${tenantId}`);

    if (this.row.id !== id || this.row.tenant_id !== tenantId) {
      return;
    }

    this.row.failed_attempts = 0;
    this.row.locked_until = null;
  }
}

// Selo: acesso a QUALQUER membro fora do contrato do B01 lança. É isto que impede um "contador
// novo" de passar despercebido — o §3.4 exige REUSO, não um segundo caminho de escrita.
function sealRepository<T extends object>(repository: T): T {
  return new Proxy(repository, {
    get(target, property, receiver) {
      if (typeof property === "string" && !(property in target)) {
        throw new Error(
          `escrita NOVA no repositório de credenciais: "${property}" — o §3.4 exige REUSO do incrementFailedAttempts atômico do B01`,
        );
      }

      return Reflect.get(target, property, receiver) as unknown;
    },
  });
}

type AuditRow = { readonly tenant_id: string; readonly action: string; readonly metadata: unknown };

async function buildHarness(): Promise<{
  readonly service: LocalAuthLoginService;
  readonly anonymous: AnonymousLoginService;
  readonly repository: LockoutMirrorRepository;
  readonly auditRows: AuditRow[];
}> {
  const { password_hash } = await hashPassword(SENHA_CERTA);
  const repository = new LockoutMirrorRepository({
    id: "credential-1",
    tenant_id: TENANT,
    user_id: "user-1",
    email: EMAIL,
    password_hash,
    locked_until: null,
    failed_attempts: 0,
  });
  const auditRows: AuditRow[] = [];

  const service = new LocalAuthLoginService(
    sealRepository(repository),
    { async findById(tenantId: string) { return { id: tenantId, name: "Org Anônima" }; } },
    {
      async findByIdForTenant(userId: string, tenantId: string) {
        return { id: userId, tenant_id: tenantId, email: EMAIL, name: "Alvo", status: "active" };
      },
    },
    { async listByUserForTenant() { return []; } },
    {
      async create(data) {
        auditRows.push(data as unknown as AuditRow);

        return { ...(data as object), id: "audit-1", created_at: new Date() } as never;
      },
    },
  );

  const anonymous = new AnonymousLoginService({
    listCandidates: async (email: string) => (email === EMAIL ? [{ tenantId: TENANT, userId: "user-1" }] : []),
    verifyCandidate: (tenantId, email, password, verifyPasswordFn) =>
      service.verifyAnonymousCandidate({ tenant_id: tenantId, email, password }, verifyPasswordFn),
    finalizeSuccess: (tenantId, credentialId, user, roleCount) =>
      service.finalizeAnonymousLogin(tenantId, credentialId, user, roleCount, {}),
    // CICLO 2 (C2·3): a cobrança única pós-veredicto entra pela MESMA fiação do produto.
    registerFailure: (tenantId, credentialId, email, auditContext) =>
      service.registerAnonymousFailure(tenantId, credentialId, email, auditContext),
    minLatencyMs: 0,
  });

  return { service, anonymous, repository, auditRows };
}
