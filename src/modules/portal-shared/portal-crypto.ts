import { createHmac, timingSafeEqual } from "node:crypto";

// Ω5P PR-16 — HMAC helpers da superfície PÚBLICA. §2.8 / I10 / RN-POR-02: o PortalAccessLog correlaciona
// tentativas SEM guardar placa/Renavam/IP CRUS — só o HMAC (query_fingerprint / ip_hash) com PORTAL_LOG_SECRET.
// A comparação do 2º fator (Renavam) é em TEMPO CONSTANTE (anti-oráculo de timing, OWASP): HMAC de ambos os
// lados → digests de 32 bytes (comprimento fixo) → timingSafeEqual. Zero dependência nova (só node:crypto).

// Normalização para FINGERPRINTS/CHAVES DE SEGURANÇA (independente do match no banco): maiúsculas + só
// alfanumérico. Assim "ABC-1234", "abc1234" e "ABC 1234" caem no MESMO bucket/fingerprint — um atacante não
// contorna o rate-limit por-placa nem despista a correlação inserindo hífen/espaço.
export function normalizePlateKey(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Renavam: só dígitos (preserva zeros à esquerda — significativos).
export function normalizeRenavamKey(renavam: string): string {
  return renavam.replace(/\D/g, "");
}

function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

// Fingerprint da CONSULTA (placa+Renavam) para o PortalAccessLog — correlaciona a mesma consulta sem PII crua.
// SEP 0x1E evita colisão de concatenação (placa|renavam ≠ placar|enavam).
export function queryFingerprint(secret: string, plate: string, renavam: string): string {
  return hmacHex(secret, `q${normalizePlateKey(plate)}${normalizeRenavamKey(renavam)}`);
}

// Chave de RATE-LIMIT por PLACA — só a placa (NUNCA placa+Renavam): o atacante que varia o Renavam num brute-force
// cairia em chaves distintas e escaparia do limite. Fingerprintando só a placa, todo palpite da mesma placa
// consome o MESMO balde.
export function plateRateKey(secret: string, plate: string): string {
  return hmacHex(secret, `p${normalizePlateKey(plate)}`);
}

// Hash do IP para o log (nunca IP cru) e chave de rate-limit por IP.
export function ipHash(secret: string, ip: string): string {
  return hmacHex(secret, `ip${ip.trim()}`);
}

// Ω5P PR-17 — chave de RATE-LIMIT dos reads AUTORIZADOS (dossiê / solicitar liberação), derivada do processId da
// SESSÃO (nunca do corpo). Toda ação sob a mesma sessão/processo consome o MESMO balde (anti-spam por processo);
// combinada com o ip_hash no serviço → limite por sessão+IP. O processId nunca vaza (só o HMAC entra no balde/log).
export function sessionRateKey(secret: string, processId: string): string {
  return hmacHex(secret, `s${processId}`);
}

// Ω5P PR-18a — normalização do USERNAME da autoridade (independe do match no banco): minúsculas + trim. Assim
// "Orgao.SP", "orgao.sp " e "ORGAO.SP" caem no MESMO bucket/fingerprint de login — um atacante não escapa do
// rate-limit por-credencial variando a caixa/espaços.
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

// Ω5P PR-18a — chave de RATE-LIMIT/correlação por CREDENCIAL (login do authority-portal), derivada do USERNAME
// normalizado. Todo palpite de senha contra o MESMO username consome o MESMO balde (anti brute-force por conta) e
// correlaciona as tentativas no PortalAccessLog SEM guardar o username cru (só o HMAC — §2.8/RN-POR-02).
export function credentialRateKey(secret: string, username: string): string {
  return hmacHex(secret, `c${normalizeUsername(username)}`);
}

// Comparação em TEMPO CONSTANTE de dois segredos de comprimento arbitrário: HMAC(a) vs HMAC(b) → 32 bytes cada
// (comprimento fixo, pré-requisito do timingSafeEqual) → sem oráculo de timing por diferença de comprimento nem
// por posição do 1º byte divergente. Usada no 2º fator (Renavam).
export function constantTimeEqual(secret: string, a: string, b: string): boolean {
  const da = createHmac("sha256", secret).update(a, "utf8").digest();
  const db = createHmac("sha256", secret).update(b, "utf8").digest();
  return timingSafeEqual(da, db);
}
