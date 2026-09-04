import assert from "node:assert/strict";
import { randomBytes, scrypt } from "node:crypto";
import test from "node:test";

import { hashPassword, verifyPassword } from "../src/modules/auth/services/password.service.js";
import { LocalAuthLoginService } from "../src/modules/auth/services/local-auth-login.service.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-07a (§3.6 do plano) — PINO de N/r/p no parse do scrypt de tenant. Classe irmã do SAN2-4b:
// lá o `keylen` era função do INPUT recebido; aqui o TRIO DE CUSTO vinha do stored e era aceito
// para qualquer inteiro positivo. Duas consequências, e as duas viram sonda:
//   (1) DOWNGRADE DE CUSTO — um stored forjado com N=2 autentica com a senha correspondente, ou
//       seja, o custo do KDF passa a ser escolhido por quem escreve a coluna, não pelo sistema.
//   (2) 500 NO LOGIN — um stored com N acima do maxmem (64 MiB) faz o scrypt LANÇAR, e o erro
//       sobe sem catch pelo serviço de login.
// A "prova de que não derivou" é feita por TESTEMUNHA DE EFEITO, não por relógio:
//   - o caso (1) vira um FLIP de booleano (base autentica → pino recusa);
//   - o caso (2) vira um FLIP de exceção (base LANÇA — e lançar SÓ é possível se a derivação foi
//     tentada — → pino devolve false sem tocar no scrypt).
// -----------------------------------------------------------------------------------------------

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEM = 64 * 1024 * 1024;
const CANONICAL = { N: 16384, r: 8, p: 1 } as const;

type ScryptParams = { readonly N: number; readonly r: number; readonly p: number };

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      { N: params.N, r: params.r, p: params.p, maxmem: SCRYPT_MAX_MEM },
      (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)),
    );
  });
}

function encodeStored(params: ScryptParams, salt: Buffer, hash: Buffer): string {
  return [
    "scrypt",
    "v=1",
    `N=${params.N}`,
    `r=${params.r}`,
    `p=${params.p}`,
    `salt=${salt.toString("base64")}`,
    `hash=${hash.toString("base64")}`,
  ].join("$");
}

// Stored VÁLIDO em tudo (formato, base64, keylen 64) exceto no trio de custo: o hash é a derivação
// REAL da senha com aqueles parâmetros, de modo que o código sem pino o aceita como legítimo.
async function forgeStored(password: string, params: ScryptParams): Promise<string> {
  const salt = randomBytes(16);

  return encodeStored(params, salt, await derive(password, salt, params));
}

test("downgrade de custo: stored forjado com N=2 e a SENHA CORRETA é RECUSADO (o base autenticava)", async () => {
  const stored = await forgeStored("SenhaCerta123!", { N: 2, r: 8, p: 1 });

  assert.match(stored, /^scrypt\$v=1\$N=2\$r=8\$p=1\$salt=.+\$hash=.+$/);
  assert.equal(
    await verifyPassword("SenhaCerta123!", stored),
    false,
    "o custo do KDF é constante do sistema — nunca o que o dado armazenado pedir",
  );
});

test("stored com N=32768 (acima do canônico, abaixo do maxmem) e senha correta → RECUSADO", async () => {
  const stored = await forgeStored("SenhaCerta123!", { N: 32768, r: 8, p: 1 });

  assert.equal(await verifyPassword("SenhaCerta123!", stored), false);
});

test("r e p também são pinados: r=16 e p=2 com a senha correta → RECUSADOS", async () => {
  const rForaDoPino = await forgeStored("SenhaCerta123!", { N: 16384, r: 16, p: 1 });
  const pForaDoPino = await forgeStored("SenhaCerta123!", { N: 16384, r: 8, p: 2 });

  assert.equal(await verifyPassword("SenhaCerta123!", rForaDoPino), false, "r fora do pino");
  assert.equal(await verifyPassword("SenhaCerta123!", pForaDoPino), false, "p fora do pino");
});

test("N gigante (1048576, acima do maxmem): recusa LIMPA — false, sem lançar", async () => {
  // Não dá para derivar este hash (é justamente o ponto): o buffer é opaco, com o keylen certo.
  const stored = encodeStored({ N: 1048576, r: 8, p: 1 }, randomBytes(16), randomBytes(SCRYPT_KEY_LENGTH));

  // No base, `verifyPassword` REJEITA aqui: a única forma de o scrypt lançar é a derivação ter
  // sido TENTADA com o N do dado. A ausência de exceção é a testemunha de que não derivou.
  const result = await verifyPassword("qualquer-senha", stored);

  assert.equal(result, false);
});

test("round-trip canônico (N=16384, r=8, p=1) segue VERDE — o pino não quebra a emissão", async () => {
  const issued = await hashPassword("SenhaCerta123!");

  assert.equal(
    issued.password_hash.includes(`N=${CANONICAL.N}$r=${CANONICAL.r}$p=${CANONICAL.p}`),
    true,
    "a emissão continua produzindo exatamente o trio pinado",
  );
  assert.equal(await verifyPassword("SenhaCerta123!", issued.password_hash), true);
  assert.equal(await verifyPassword("SenhaErrada123!", issued.password_hash), false);
});

test("no SERVIÇO de login, stored com N gigante vira invalid_credentials — o 500 morre", async () => {
  const stored = encodeStored({ N: 1048576, r: 8, p: 1 }, randomBytes(16), randomBytes(SCRYPT_KEY_LENGTH));
  const harness = buildLoginHarness(stored);

  // No base isto REJEITA (a exceção do scrypt sobe pelo serviço e vira 500 na rota).
  const result = await harness.service.authenticateLocalCredential({
    tenant_id: "tenant-pin",
    email: "pin@example.com",
    password: "qualquer-senha",
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false ? result.reason : null, "invalid_credentials");
  assert.equal(harness.increments(), 1, "recusa por hash não-canônico conta como falha de senha");
});

// -----------------------------------------------------------------------------------------------
// Arnês mínimo do serviço de login (sem banco): só o suficiente para atravessar o caminho da senha.
// -----------------------------------------------------------------------------------------------
function buildLoginHarness(passwordHash: string): {
  readonly service: LocalAuthLoginService;
  readonly increments: () => number;
} {
  let increments = 0;

  const service = new LocalAuthLoginService(
    {
      async findByEmailForTenant(email: string, tenantId: string) {
        return {
          id: "credential-pin",
          tenant_id: tenantId,
          user_id: "user-pin",
          email,
          password_hash: passwordHash,
          locked_until: null,
        };
      },
      async incrementFailedAttempts() {
        increments += 1;
      },
      async markSuccessfulLogin() {},
    },
    { async findById(tenantId: string) { return { id: tenantId, name: "Org Pino" }; } },
    {
      async findByIdForTenant(userId: string, tenantId: string) {
        return {
          id: userId,
          tenant_id: tenantId,
          email: "pin@example.com",
          name: "Pino",
          status: "active",
        };
      },
    },
    { async listByUserForTenant() { return []; } },
    { async create(data) { return data as never; } },
  );

  return { service, increments: () => increments };
}
