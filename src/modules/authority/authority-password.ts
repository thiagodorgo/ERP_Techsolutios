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

// Base64 CANÔNICO. `Buffer.from(x, "base64")` do Node é LENIENTE — aceita padding faltando e ignora caracteres
// inválidos, então ele praticamente nunca lança e NÃO serve de validação sozinho. O round-trip (re-encodar e comparar
// com o texto original) é o teste barato de canonicidade: tudo que `hashPassword` emite é `Buffer.toString("base64")`,
// canônico por construção, logo o round-trip é identidade para todo stored legítimo.
function isCanonicalBase64(raw: string, decoded: Buffer): boolean {
  return decoded.toString("base64") === raw;
}

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
  // (1) Codificação não-canônica → o stored NÃO saiu de `hashPassword` → rejeita ANTES de qualquer derivação.
  if (!isCanonicalBase64(parts[4], salt) || !isCanonicalBase64(parts[5], hash)) return undefined;
  // (2) PINO do keylen: o tamanho da chave é CONSTANTE DO SISTEMA, nunca função do dado recebido (era o defeito —
  //     ver o bloco de comentário de `verifyPassword`). Rotacionar o keylen exigiria uma VERSÃO NOVA do formato;
  //     N/r/p seguem self-describing, então a rotação de CUSTO continua possível como sempre foi.
  if (hash.length !== AUTHORITY_SCRYPT_PARAMS.keylen) return undefined;
  return { params: { N, r, p, keylen: AUTHORITY_SCRYPT_PARAMS.keylen }, salt, hash };
}

// Verifica em TEMPO CONSTANTE. Usa **N/r/p** DO HASH ARMAZENADO (self-describing) — permite rotacionar o CUSTO sem
// invalidar credenciais antigas. O **keylen NÃO** vem do stored: é constante do sistema, pinada em `parseStored`.
// Hash malformado, não-canônico ou de comprimento errado → false (nunca lança).
//
// SAN2-4b (2026-08-31) — este comentário afirmava, até aqui, que "um stored corrompido simplesmente falha". A EXECUÇÃO
// contradizia a afirmação (SAN2-4a, `medicao-1-authority-portal.md` §F3, OBS-2): `parseStored` derivava
// `keylen: hash.length` do stored RECEBIDO, de modo que uma EXTENSÃO EM COMPRIMENTO de um stored válido era aceita a
// **1/256 por byte extra** — scrypt é prefixo-estável (os 32 primeiros bytes derivados não mudam com keylen maior), o
// guard `derived.length !== parsed.hash.length` comparava 33 com 33 e só sobrava o acaso do byte novo bater. Vermelho
// medido nesta casa, no código anterior: 79/20 000 (hash com o `=` de padding trocado → 33 B, os 32 originais intactos)
// e 18/5 000 (33 B em base64 perfeitamente canônico). As DUAS validações de `parseStored` existem por causa disso: o
// round-trip canônico mata a primeira forma, o pino do keylen mata a segunda — nenhuma das duas sozinha basta.
// O comprimento segue comparado antes do `timingSafeEqual` (que exige buffers do mesmo tamanho) e continua sem ser
// oráculo: o stored vem do banco, não do atacante — quem se autentica controla a SENHA, não o hash armazenado.
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
