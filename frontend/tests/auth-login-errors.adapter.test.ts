import assert from "node:assert/strict";
import test from "node:test";

// B-O6R-01 (§7, "Clientes") — o adapter web mapeia os códigos novos do login sem organização:
// 409 TENANT_SELECTION_REQUIRED, 400 TENANT_ID_REQUIRED e 429 RATE_LIMITED. A cópia fala
// "organização" (nunca termo técnico). B-AUTH-LOGIN-PLATAFORMA (§4 do plano): o 400 genérico e o
// 401 deixam de dizer "tenant" na tela; 423/500 seguem byte-idênticos.
test("login: 409/400 TENANT_ID_REQUIRED/429 têm mensagem própria; 400 genérico e 401 falam organização; 423/500 não mudam", async () => {
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

  // Sem código no corpo, o 400 fala "organização" (§3 do CLAUDE.md); o 401 idem, preservando a
  // substring "e-mail ou senha inválidos" que o E2E critical-flows.spec.ts:102 contrata.
  assert.equal(readLoginErrorMessage(400), "Revise organização, e-mail e senha.");
  assert.equal(readLoginErrorMessage(401), "Organização, e-mail ou senha inválidos.");
  assert.equal(readLoginErrorMessage(423), "Conta bloqueada. Solicite suporte ao administrador.");
  assert.equal(readLoginErrorMessage(500), "Não foi possível autenticar agora.");

  // Nenhuma saída de readLoginErrorMessage vaza termo técnico na UI (§3 do CLAUDE.md) — a
  // varredura cobre TODOS os status mapeados, não só os três novos do B-O6R-01.
  for (const [status, code] of [
    [400, "TENANT_ID_REQUIRED"],
    [400, undefined],
    [401, undefined],
    [409, "TENANT_SELECTION_REQUIRED"],
    [423, undefined],
    [429, "RATE_LIMITED"],
    [500, undefined],
  ] as const) {
    const message = readLoginErrorMessage(status, code);

    assert.equal(/tenant/i.test(message), false, `mensagem de ${status} não pode dizer "tenant"`);
  }
});
