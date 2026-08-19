import assert from "node:assert/strict";
import test from "node:test";

// B-O6R-01 (§7, "Clientes") — o adapter web mapeia os códigos novos do login sem organização:
// 409 TENANT_SELECTION_REQUIRED, 400 TENANT_ID_REQUIRED e 429 RATE_LIMITED. A cópia fala
// "organização" (nunca termo técnico) e os mapeamentos antigos (400 genérico/401/423) seguem
// byte-idênticos.
test("login: 409/400 TENANT_ID_REQUIRED/429 têm mensagem própria; os códigos antigos não mudam", async () => {
  const { readLoginErrorMessage } = await import("../src/modules/auth/auth.adapter");

  assert.equal(
    readLoginErrorMessage(400, "TENANT_ID_REQUIRED"),
    "Este e-mail existe em mais de uma organização. Selecione a organização para entrar.",
  );
  assert.equal(
    readLoginErrorMessage(409, "TENANT_SELECTION_REQUIRED"),
    "Sua senha vale em mais de uma organização. Selecione a organização para entrar.",
  );
  assert.equal(
    readLoginErrorMessage(429, "RATE_LIMITED"),
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  );

  // Sem código no corpo, o 400 mantém o texto histórico; 401/423 idem.
  assert.equal(readLoginErrorMessage(400), "Revise tenant, e-mail e senha.");
  assert.equal(readLoginErrorMessage(401), "Tenant, e-mail ou senha invalidos.");
  assert.equal(readLoginErrorMessage(423), "Conta bloqueada. Solicite suporte ao administrador.");
  assert.equal(readLoginErrorMessage(500), "Nao foi possivel autenticar agora.");

  // Nenhuma mensagem nova vaza termo técnico na UI (§3 do CLAUDE.md).
  for (const [status, code] of [
    [400, "TENANT_ID_REQUIRED"],
    [409, "TENANT_SELECTION_REQUIRED"],
    [429, "RATE_LIMITED"],
  ] as const) {
    const message = readLoginErrorMessage(status, code);

    assert.equal(/tenant/i.test(message), false, `mensagem de ${status} não pode dizer "tenant"`);
  }
});
