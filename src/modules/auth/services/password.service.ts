import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

import type { PasswordHashResult } from "../types/auth.types.js";

const SCRYPT_VERSION = 1;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEM = 64 * 1024 * 1024;
const SALT_BYTES = 16;

export async function hashPassword(plainPassword: string): Promise<PasswordHashResult> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await deriveScryptHash(plainPassword, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return {
    password_algorithm: "scrypt-v1",
    password_hash: [
      "scrypt",
      `v=${SCRYPT_VERSION}`,
      `N=${SCRYPT_N}`,
      `r=${SCRYPT_R}`,
      `p=${SCRYPT_P}`,
      `salt=${salt.toString("base64")}`,
      `hash=${hash.toString("base64")}`,
    ].join("$"),
  };
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  const parsedHash = parseScryptHash(passwordHash);

  if (!parsedHash) {
    return false;
  }

  const actualHash = await deriveScryptHash(plainPassword, parsedHash.salt, {
    N: parsedHash.N,
    r: parsedHash.r,
    p: parsedHash.p,
  });

  return (
    actualHash.byteLength === parsedHash.hash.byteLength &&
    timingSafeEqual(actualHash, parsedHash.hash)
  );
}

type ScryptParams = {
  readonly N: number;
  readonly r: number;
  readonly p: number;
};

type ParsedScryptHash = ScryptParams & {
  readonly salt: Buffer;
  readonly hash: Buffer;
};

async function deriveScryptHash(
  plainPassword: string,
  salt: Buffer,
  params: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      plainPassword,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: params.N,
        r: params.r,
        p: params.p,
        maxmem: SCRYPT_MAX_MEM,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

function parseScryptHash(passwordHash: string): ParsedScryptHash | undefined {
  const [algorithm, version, N, r, p, salt, hash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || version !== `v=${SCRYPT_VERSION}`) {
    return undefined;
  }

  const parsed = {
    N: readNumericPart(N, "N"),
    r: readNumericPart(r, "r"),
    p: readNumericPart(p, "p"),
    salt: readBase64Part(salt, "salt"),
    hash: readBase64Part(hash, "hash"),
  };

  if (
    !parsed.N ||
    !parsed.r ||
    !parsed.p ||
    !parsed.salt ||
    !parsed.hash ||
    parsed.hash.byteLength !== SCRYPT_KEY_LENGTH
  ) {
    return undefined;
  }

  // B-O6R-07a (§3.6 do plano) — PINO de N/r/p. O trio de custo é CONSTANTE DO SISTEMA, nunca
  // função do dado armazenado: `v=1` significa exatamente N=16384, r=8, p=1, que é o único trio
  // que `hashPassword` emite. Qualquer outro trio → `undefined` → `invalid_credentials`, SEM
  // rodar scrypt. Rotacionar o custo exige uma VERSÃO NOVA do formato (v=2) — não um stored que
  // se auto-descreve.
  //
  // Lição do SAN2-4b (`authority-password.ts:89-93`), classe irmã: lá o `keylen` vinha do input
  // recebido e uma extensão em comprimento era aceita a 1/256 por byte extra. Aqui a mesma
  // família aparecia no trio de custo, e com duas consequências MEDIDAS neste bloco:
  //   (1) DOWNGRADE — um stored forjado com N=2 autenticava com a senha correspondente, ou seja,
  //       quem escrevesse a coluna escolhia o custo do KDF (vermelho-controle: `true !== false`);
  //   (2) 500 — um stored com N acima do maxmem (64 MiB) fazia o scrypt LANÇAR
  //       (`ERR_CRYPTO_INVALID_SCRYPT_PARAMS`) e o erro subia sem catch até a rota de login.
  if (parsed.N !== SCRYPT_N || parsed.r !== SCRYPT_R || parsed.p !== SCRYPT_P) {
    return undefined;
  }

  return {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    salt: parsed.salt,
    hash: parsed.hash,
  };
}

function readNumericPart(value: string | undefined, key: string): number | undefined {
  const prefix = `${key}=`;

  if (!value?.startsWith(prefix)) {
    return undefined;
  }

  const parsed = Number(value.slice(prefix.length));

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readBase64Part(value: string | undefined, key: string): Buffer | undefined {
  const prefix = `${key}=`;

  if (!value?.startsWith(prefix)) {
    return undefined;
  }

  const decoded = Buffer.from(value.slice(prefix.length), "base64");

  return decoded.byteLength > 0 ? decoded : undefined;
}
