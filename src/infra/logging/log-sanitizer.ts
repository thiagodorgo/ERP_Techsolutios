// B-SEC-LOG-SANITIZA (L2) — o saneador de log. Todo erro e todo texto que chega ao logger da fábrica passa por aqui antes
// de virar linha. O objetivo é um só: dado de conexão (host, porta, usuário, senha, banco, URL de conexão) não sai em log.
//
// - `describeSafeError` reduz um erro a uma lista FECHADA de campos (`type`, `code`, `sqlState`, `driverKind`, `errno`,
//   `syscall`, `statusCode`, `reason`, `message`, `stack`, `cause`, `errors`). Todo o resto (`meta`, `address`, `port`,
//   `hostname`, `config`, `response`, `$metadata`…) é descartado.
// - `scrubConnectionText` limpa texto livre com 3 regras, nesta ordem: URL de conexão (R1, R2), valores configurados
//   (R3, R4) e frases do driver (R5).
// - `sanitizeForLog` percorre o que o logger recebe: erro → `describeSafeError`; texto → `scrubConnectionText`; array e
//   objeto simples → percorridos; instância de classe que não parece erro (`req`, `res`, `Date`, `Buffer`) passa intacta,
//   porque quem a serializa é o serializador dela (escape E-5 do plano).
//
// Os valores da R3 e da R4 são lidos UMA vez, do `env` já validado, na carga do módulo.
import { env } from "../../config/env.js";

export const MAX_ERROR_DEPTH = 3;
export const DEPTH_MARK = "[profundidade]";
export const DISCARDED_MARK = "[descartado]";
export const CYCLE_MARK = "[ciclo]";
const MAX_WALK_DEPTH = 8;
const MAX_AGGREGATE_ITEMS = 8;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------------------------------------------------
// R1 e R2 — URL de conexão.
// ---------------------------------------------------------------------------------------------------------------------

const CONNECTION_SCHEMES = "postgres|postgresql|redis|rediss|mysql|mongodb|mongodb\\+srv|amqp|amqps";
const STOP_CHARS = "\\s\\x22\\x27\\x60"; // espaço, aspas duplas, aspas simples e crase
const CREDENTIAL_URL = new RegExp(
  `\\b([a-z][a-z0-9+.-]*)://[^${STOP_CHARS}/@]+(?::[^${STOP_CHARS}/@]*)?@[^${STOP_CHARS}]*`,
  "gi",
);
const CONNECTION_URL = new RegExp(`\\b(?:${CONNECTION_SCHEMES})://[^${STOP_CHARS}]*`, "gi");

/** R1: `esquema://usuário[:senha]@…` vira `esquema://[redacted]`. R2: URL de esquema de conexão vira `[redacted-url]`. */
export function scrubCredentialUrls(text: string): string {
  return text.replace(CREDENTIAL_URL, "$1://[redacted]").replace(CONNECTION_URL, "[redacted-url]");
}

// ---------------------------------------------------------------------------------------------------------------------
// R3 e R4 — os valores configurados (`DATABASE_URL` e `REDIS_URL`).
// ---------------------------------------------------------------------------------------------------------------------

export type ConnectionValues = {
  readonly values: readonly RegExp[];
  readonly ports: readonly RegExp[];
};

/** `[::1]` → `::1`. O `URL` devolve o host IPv6 com colchetes; o Prisma e o Node escrevem sem (A7). */
export function stripIpv6Brackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function textForms(value: string): string[] {
  const forms = new Set<string>([value]);
  try {
    forms.add(decodeURIComponent(value));
  } catch {
    // fica a forma crua
  }
  forms.add(encodeURIComponent(value));
  for (const form of [...forms]) forms.add(JSON.stringify(form).slice(1, -1));
  return [...forms];
}

/** Monta as expressões da R3 e da R4 a partir das URLs. URL que não se parseia não acrescenta valor. */
export function connectionValuesFromUrls(urls: ReadonlyArray<string | undefined>): ConnectionValues {
  const values = new Set<string>();
  const ports = new Set<string>();

  for (const url of urls) {
    if (!url) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    const host = parsed.hostname;
    const bareHost = stripIpv6Brackets(host);
    const raw = [host, bareHost, parsed.username, parsed.password, parsed.pathname.replace(/^\//, "")];
    for (const value of raw) {
      if (!value) continue;
      for (const form of textForms(value)) if (form.length >= 2) values.add(form);
    }
    if (parsed.port) ports.add(parsed.port);
  }

  const byLength = [...values].sort((a, b) => b.length - a.length);
  return {
    values: byLength.map((value) => new RegExp(`(?<![A-Za-z0-9_.-])${escapeRegExp(value)}(?![A-Za-z0-9_.-])`, "gi")),
    ports: [...ports].map((port) => new RegExp(`(?<=[A-Za-z0-9\\].-]):${escapeRegExp(port)}(?![0-9])`, "g")),
  };
}

const CONFIGURED_VALUES = connectionValuesFromUrls([env.DATABASE_URL, env.REDIS_URL]);

/** R3: host, usuário, senha e banco configurados, em fronteira de token. R4: a porta configurada depois de `:`. */
export function scrubKnownValues(text: string, known: ConnectionValues = CONFIGURED_VALUES): string {
  let out = text;
  for (const value of known.values) out = out.replace(value, "[redacted]");
  for (const port of known.ports) out = out.replace(port, ":[redacted]");
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// R5 — frases do driver, para valor NÃO configurado.
// ---------------------------------------------------------------------------------------------------------------------

const PHRASE_VALUE = `[^${STOP_CHARS}]+`; // tudo até espaço, crase ou aspas (aceita `:`, A7)
const NETWORK_PHRASE_CODES = "ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|ENETUNREACH|EPIPE|ECONNABORTED";
const REACH_PHRASE = new RegExp(`(Can\\x27t reach database server at )${PHRASE_VALUE}`, "g");
const NETWORK_PHRASE = new RegExp(`\\b(${NETWORK_PHRASE_CODES}) ${PHRASE_VALUE}`, "g");
const QUOTED_PHRASE = /(for user |role |database |host |user )"[^"]*"/gi;
const BACKTICK_PHRASE = /(credentials for |Database |User )`[^`]*`/g;

export function scrubDriverPhrases(text: string): string {
  return text
    .replace(REACH_PHRASE, "$1[redacted]")
    .replace(NETWORK_PHRASE, "$1 [redacted]")
    .replace(QUOTED_PHRASE, '$1"[redacted]"')
    .replace(BACKTICK_PHRASE, "$1`[redacted]`");
}

/** As 3 regras, nesta ordem. Cada linha é âncora de mutação do plano. */
export function scrubConnectionText(text: string): string {
  text = scrubCredentialUrls(text);
  text = scrubKnownValues(text);
  text = scrubDriverPhrases(text);
  return text;
}

// ---------------------------------------------------------------------------------------------------------------------
// L2 — o erro reduzido a campos permitidos.
// ---------------------------------------------------------------------------------------------------------------------

const ERROR_MARKER_KEYS = ["stack", "code", "errno", "syscall", "meta", "clientVersion", "errors"] as const;
const SQLSTATE_IN_MESSAGE = /Code: `([0-9A-Z]{5})`/;
const SQLSTATE = /^[0-9A-Z]{5}$/;

/** `instanceof Error`, ou objeto com `message` texto e mais uma marca de erro. */
export function looksLikeError(value: unknown): value is UnknownRecord {
  if (value instanceof Error) return true;
  if (!isRecord(value) || typeof value.message !== "string") return false;
  return ERROR_MARKER_KEYS.some((key) => key in value);
}

function driverCause(error: UnknownRecord): UnknownRecord | undefined {
  const meta = error.meta;
  if (isRecord(meta) && isRecord(meta.driverAdapterError) && isRecord(meta.driverAdapterError.cause)) {
    return meta.driverAdapterError.cause;
  }
  if (error.name === "DriverAdapterError" && isRecord(error.cause)) return error.cause;
  return undefined;
}

function sqlStateOf(error: UnknownRecord, cause: UnknownRecord | undefined): string | undefined {
  if (typeof cause?.originalCode === "string") return cause.originalCode;
  const inMessage = typeof error.message === "string" ? SQLSTATE_IN_MESSAGE.exec(error.message)?.[1] : undefined;
  if (inMessage) return inMessage;
  // Só o `DatabaseError` do `pg` (que tem `severity`) põe o SQLSTATE em `code`; o `P2010` do Prisma também tem 5
  // caracteres e não é SQLSTATE.
  return typeof error.code === "string" && SQLSTATE.test(error.code) && typeof error.severity === "string"
    ? error.code
    : undefined;
}

function safeScalar(value: unknown): string | number | undefined {
  if (typeof value === "string") return scrubConnectionText(value);
  if (typeof value === "number") return value;
  return undefined;
}

/**
 * O erro vira um objeto de protótipo `null` com a lista fechada de campos. O protótipo `null` faz o serializador `err`
 * do pino manter o `type` (com protótipo `Object`, ele escreveria `"type":"Object"`).
 */
export function describeSafeError(error: unknown, depth = 0): unknown {
  if (depth > MAX_ERROR_DEPTH) return DEPTH_MARK;
  if (!isRecord(error)) return DISCARDED_MARK;

  const out: UnknownRecord = Object.assign(Object.create(null) as UnknownRecord, {
    type: typeof error.name === "string" ? scrubConnectionText(error.name) : "Error",
    message: scrubConnectionText(typeof error.message === "string" ? error.message : ""),
  });

  const code = safeScalar(error.code);
  if (code !== undefined) out.code = code;
  const cause = driverCause(error);
  const sqlState = sqlStateOf(error, cause);
  if (sqlState) out.sqlState = sqlState;
  if (typeof cause?.kind === "string") out.driverKind = scrubConnectionText(cause.kind);
  for (const key of ["errno", "syscall", "statusCode", "reason"] as const) {
    const value = safeScalar(error[key]);
    if (value !== undefined) out[key] = value;
  }

  if (typeof error.stack === "string") out.stack = scrubConnectionText(error.stack);

  if (error.cause !== undefined) {
    out.cause = looksLikeError(error.cause)
      ? describeSafeError(error.cause, depth + 1)
      : typeof error.cause === "string"
        ? scrubConnectionText(error.cause)
        : DISCARDED_MARK;
  }
  if (Array.isArray(error.errors)) {
    out.errors = error.errors
      .slice(0, MAX_AGGREGATE_ITEMS)
      .map((item: unknown) => (looksLikeError(item) ? describeSafeError(item, depth + 1) : DISCARDED_MARK));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// O que o logger recebe.
// ---------------------------------------------------------------------------------------------------------------------

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (looksLikeError(value)) return describeSafeError(value);
  if (typeof value === "string") return scrubConnectionText(value);
  if (!isRecord(value)) return value;

  const isArray = Array.isArray(value);
  if (!isArray && !isPlainObject(value)) return value; // E-5: instância de classe passa intacta
  if (seen.has(value)) return CYCLE_MARK;
  if (depth >= MAX_WALK_DEPTH) return DEPTH_MARK;

  seen.add(value);
  try {
    if (isArray) return (value as unknown[]).map((item) => walk(item, depth + 1, seen));
    const out: UnknownRecord = Object.getPrototypeOf(value) === null ? (Object.create(null) as UnknownRecord) : {};
    for (const key of Object.keys(value)) out[key] = walk((value as UnknownRecord)[key], depth + 1, seen);
    return out;
  } finally {
    seen.delete(value);
  }
}

/** Limpa um argumento de log. Um getter que lança propaga o erro: quem chama (o `logMethod`) falha fechado. */
export function sanitizeForLog(value: unknown): unknown {
  return walk(value, 0, new WeakSet<object>());
}
