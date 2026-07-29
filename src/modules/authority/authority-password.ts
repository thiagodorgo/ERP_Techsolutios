import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Ω5P PR-18a — hashing de senha da AuthorityCredential com **scrypt do node:crypto** (built-in, ZERO dependência
// nova — PD-Ω5P-AUTH-SCRYPT / D-Ω5P-AUTH-02). bcrypt/argon2 seriam dependência nova (= junta-5); scrypt é o
// substituto zero-dep aprovado pela OWASP quando argon2id não está disponível.
//
// PARÂMETROS OWASP (Password Storage Cheat Sheet): N=2^17, r=8, p=1, keylen=32.
// GOTCHA CRÍTICO (documentado na PD): N=2^17·r=8 ≈ 128 MiB de memória EXCEDE o `maxmem` DEFAULT do Node (~32 MiB)
//   → o scrypt LANÇA "memory limit exceeded" se `maxmem` não for passado explícito. Passamos maxmem = 256 MiB
//   (teto folgado acima do necessário) para TODAS as chamadas — inclusive as de params reduzidos (o maxmem é só
//   um TETO, nunca reduz o custo).
//
// Formato self-describing `scrypt$N$r$p$<saltB64>$<hashB64>` (base64 não contém '$' → split seguro). Salt de 16 B
// por-hash (randomBytes) → dois hashes da MESMA senha diferem. Verificação em TEMPO CONSTANTE (timingSafeEqual
// sobre os 32 B derivados; comprimento comparado antes, sem oráculo de timing por diferença de tamanho).

// Wrapper de promise SOBRE a OVERLOAD com options do scrypt (o `promisify` do node:util só tipa a overload
// sem-options → não aceitaria `maxmem`, e o maxmem explícito é OBRIGATÓRIO aqui — gotcha PD-Ω5P-AUTH-SCRYPT).
function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export type ScryptParams = {
  readonly N: number; // custo de CPU/memória (potência de 2)
  readonly r: number; // tamanho do bloco
  readonly p: number; // paralelização
  readonly keylen: number; // bytes derivados
};

// Parâmetros OWASP — os de PRODUÇÃO (D-Ω5P-AUTH-02). Testes de pipeline podem injetar params reduzidos por
// velocidade; o teste-alvo de hashing PROVA que estes defaults são os OWASP e que o maxmem os comporta.
export const AUTHORITY_SCRYPT_PARAMS: ScryptParams = { N: 2 ** 17, r: 8, p: 1, keylen: 32 };

const SALT_BYTES = 16;
// maxmem EXPLÍCITO ≥ 256 MiB — acima do ~128 MiB exigido por N=2^17·r=8 (senão o scrypt lança; gotcha PD). É só um
// teto: params reduzidos usam menos, params OWASP cabem com folga.
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

async function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  // NFKC normaliza a senha (equivalência Unicode) antes de derivar — o mesmo texto sempre gera o mesmo hash.
  return scryptAsync(password.normalize("NFKC"), salt, params.keylen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: SCRYPT_MAXMEM,
  });
}

// Gera o hash self-describing. params default = OWASP (produção); injetável para testes rápidos.
export async function hashPassword(password: string, params: ScryptParams = AUTHORITY_SCRYPT_PARAMS): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await derive(password, salt, params);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

type ParsedHash = { params: ScryptParams; salt: Buffer; hash: Buffer };

function parseStored(stored: string): ParsedHash | undefined {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return undefined;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N < 2 || r < 1 || p < 1) return undefined;
  let salt: Buffer;
  let hash: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    hash = Buffer.from(parts[5], "base64");
  } catch {
    return undefined;
  }
  if (salt.length === 0 || hash.length === 0) return undefined;
  return { params: { N, r, p, keylen: hash.length }, salt, hash };
}

// Verifica em TEMPO CONSTANTE. Usa os params DO HASH ARMAZENADO (self-describing) — permite rotacionar params sem
// invalidar credenciais antigas. Hash malformado → false (nunca lança). O comprimento é comparado ANTES do
// timingSafeEqual (que exige buffers do mesmo tamanho) — a divergência de tamanho não é um oráculo aqui porque
// todos os hashes desta casa têm keylen fixo (32); um stored corrompido simplesmente falha.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  const derived = await derive(password, parsed.salt, parsed.params);
  if (derived.length !== parsed.hash.length) return false;
  return timingSafeEqual(derived, parsed.hash);
}

// Salt DUMMY fixo por-processo (nasce de randomBytes; não é segredo, só precisa existir para a derivação custar o
// MESMO que uma verificação real). NÃO deriva de senha real nenhuma.
const DUMMY_SALT = randomBytes(SALT_BYTES);

// Verificação DUMMY: para um username INEXISTENTE (ou credencial não-ACTIVE/locked), executa scrypt com os MESMOS
// params → TRABALHO CONSTANTE, para que a latência não revele se o username existe (anti-enumeração). Sempre false.
export async function verifyPasswordDummy(
  password: string,
  params: ScryptParams = AUTHORITY_SCRYPT_PARAMS,
): Promise<false> {
  await derive(password, DUMMY_SALT, params);
  return false;
}

// Gera uma senha inicial ALEATÓRIA (base64url, ~24 chars ≈ 144 bits) — devolvida ao admin UMA vez; no banco só o
// hash. Alfabeto url-safe (sem '$' → não colide com o separador do formato do hash).
export function generateInitialPassword(): string {
  return randomBytes(18).toString("base64url");
}
