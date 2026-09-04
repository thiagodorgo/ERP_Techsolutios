// B-O6R-01 (§6 do plano) — parâmetros do login sem organização. Valores propostos ao §12.2 da
// junta (lockout 5/15min · teto 3 · balde 10/15min · piso 400ms); mudá-los é decisão de junta.

// Teto de candidatos verificáveis por e-mail. A fonte (função elevada no prisma; registry na
// memória) devolve NO MÁXIMO MAX_LOGIN_CANDIDATES + 1 linhas — a linha extra é o sentinela de
// teto: com ela presente, o desfecho é 400 TENANT_ID_REQUIRED com ZERO scrypt (C7).
export const MAX_LOGIN_CANDIDATES = 3;

// Balde token-bucket POR E-MAIL do caminho anônimo (espelho do balde por credencial do
// authority-portal — anti-abuse.ts DEFAULT_LOGIN_BUCKET: 10/15min).
export const ANONYMOUS_LOGIN_BUCKET = {
  capacity: 10,
  refillTokens: 10,
  refillIntervalMs: 15 * 60 * 1000,
} as const;

// Piso de latência constante de TODOS os desfechos do caminho anônimo, inclusive 429/400
// (padrão `settle` de authority-portal.service.ts:190-198).
export const ANONYMOUS_LOGIN_MIN_LATENCY_MS = 400;

// Lockout direcionado: 5 falhas → 15 minutos (§12.2).
export const LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

// B-O6R-07a (§3.5 do plano) — balde por IP das DUAS vias de POST /auth/login (com organização e
// anônima), fechando `P-O6R-B01-RATE-LIMIT-IP`: o balde do B01 é por E-MAIL, então rodar e-mails
// (ou organizações) na mesma origem escapava do freio inteiro. Medido no head-base: 200 tentativas
// do mesmo IP com 200 e-mails distintos → 200×401 e ZERO 429.
//
// Números NÃO inventados: são os mesmos de `AUTHORITY_ANTI_ABUSE_DEFAULTS.ipBucket`
// (portal-shared/anti-abuse.ts) — 30 logins por IP com reposição de 30 a cada 5 min, o teto por
// ORIGEM que a casa já usa na outra superfície de login credenciada. Mais generoso que o balde por
// e-mail (10/15 min), de propósito: se o freio por IP fosse mais apertado, o primeiro a sentir
// seria o escritório atrás de NAT, não o atacante.
export const LOGIN_IP_BUCKET = {
  capacity: 30,
  refillTokens: 30,
  refillIntervalMs: 5 * 60 * 1000,
} as const;
