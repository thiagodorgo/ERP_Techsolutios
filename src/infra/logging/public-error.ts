// B-SEC-LOG-SANITIZA (L6) — o que um erro pode mostrar para FORA do servidor (corpo HTTP, resultado de sync, texto
// gravado que volta por rota). Três classes, por lista fechada (plano v2 §4 e Emenda 1 §E4):
//
// - `infra_down`: o serviço de apoio (banco, Redis, rede, S3) não respondeu, recusou a conexão ou foi desligado. Decisão
//   do dono (13/11): banco caído no meio de uma chamada responde 500 com mensagem fixa.
// - `opaque`: todo outro erro de driver, de sistema ou de SDK. Mantém o status de hoje (400) e perde o texto: o texto
//   destes erros leva caminho de arquivo, trecho do fonte e nome de bucket, e não existe texto seguro para devolver.
// - `text`: erro sem marca de driver (regra de negócio). A mensagem sai, limpa por `publicText`.
//
// O que não está na lista de queda NÃO vira 500 aqui: cai em `opaque` ou `text` e não vaza (risco R6 do plano).
import { scrubConnectionText } from "./log-sanitizer.js";

export type PublicErrorClass = "infra_down" | "opaque" | "text";

export const STORED_ERROR_FALLBACK = "Execution failed. See server logs.";

const MAX_CLASSIFY_DEPTH = 8;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

// ---------------------------------------------------------------------------------------------------------------------
// As listas fechadas de "infra caída".
// ---------------------------------------------------------------------------------------------------------------------

const NETWORK_CODES: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ECONNRESET",
  "ENETUNREACH",
  "EPIPE",
  "ECONNABORTED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

/** Família de conexão do Prisma. O `P2024` saiu (Emenda 1, X2: não existe no runtime do Prisma 7.8). */
const PRISMA_CONNECTION_CODE = /^P1\d{3}$/;

const DOWN_DRIVER_KINDS: ReadonlySet<string> = new Set([
  "DatabaseNotReachable",
  "AuthenticationFailed",
  "DatabaseDoesNotExist",
  "DatabaseAccessDenied",
  "SocketTimeout",
  "ConnectionClosed",
  "TlsConnectionError",
  "TooManyConnections",
]);

/** Classes de SQLSTATE: conexão, autorização, catálogo inválido, recurso, intervenção do operador, sistema, config, interno. */
const DOWN_SQLSTATE_CLASSES: ReadonlySet<string> = new Set(["08", "28", "3D", "53", "57", "58", "F0", "XX"]);

/** O `RedisCommandError` saiu desta lista (Emenda 1, R2-05): só a queda do Redis é infra (`isRedisDown`). */
const DOWN_NAMES: ReadonlySet<string> = new Set([
  "PrismaClientInitializationError",
  "PrismaClientRustPanicError",
  "TimeoutError",
  "NetworkingError",
]);

/** Emenda 1 (R2-01): as frases do `pg` 8.21 e do `pg-pool` 3.14 que chegam SEM código quando a conexão cai. */
export const PG_CONNECTION_LOST_MESSAGES: ReadonlySet<string> = new Set([
  "Connection terminated unexpectedly",
  "Connection terminated",
  "Connection terminated due to connection timeout",
  "Client has encountered a connection error and is not queryable",
  "Client was closed and is not queryable",
  "Query read timeout",
  "timeout exceeded when trying to connect",
  "timeout expired",
]);

/** Emenda 1 (R2-04): a transação que não conseguiu conexão no prazo (fila do pool). */
export const TRANSACTION_START_TIMEOUT_PHRASE = "Unable to start a transaction in the given time";

/** Emenda 1 (R2-05): do `RedisCommandError`, só a queda. */
export const REDIS_DOWN_MESSAGES: ReadonlySet<string> = new Set([
  "Redis command timed out.",
  "Redis connection ended before a complete response.",
]);
export const REDIS_DOWN_PREFIXES: readonly string[] = ["LOADING", "BUSY", "MASTERDOWN", "CLUSTERDOWN", "TRYAGAIN", "OOM", "READONLY"];

const SQLSTATE_IN_MESSAGE = /Code: `([0-9A-Z]{5})`/;
const SQLSTATE = /^[0-9A-Z]{5}$/;
const PRISMA_CODE = /^P\d{4}$/;

function nameOf(error: UnknownRecord): string {
  return typeof error.name === "string" ? error.name : "";
}

function driverCauseOf(error: UnknownRecord): UnknownRecord | undefined {
  const meta = error.meta;
  if (isRecord(meta) && isRecord(meta.driverAdapterError) && isRecord(meta.driverAdapterError.cause)) {
    return meta.driverAdapterError.cause;
  }
  if (nameOf(error) === "DriverAdapterError" && isRecord(error.cause)) return error.cause;
  return undefined;
}

function sqlStateOf(error: UnknownRecord): string | undefined {
  const cause = driverCauseOf(error);
  if (typeof cause?.originalCode === "string") return cause.originalCode;
  const inMessage = typeof error.message === "string" ? SQLSTATE_IN_MESSAGE.exec(error.message)?.[1] : undefined;
  if (inMessage) return inMessage;
  return typeof error.code === "string" && SQLSTATE.test(error.code) && typeof error.severity === "string"
    ? error.code
    : undefined;
}

function isAwsServerFault(error: UnknownRecord): boolean {
  if (!isRecord(error.$metadata)) return false;
  const status = error.$metadata.httpStatusCode;
  return error.$fault === "server" || typeof status !== "number" || status >= 500;
}

/** O `Error` cru do `pg` com uma das 8 frases, igualdade exata, sem código e sem classe própria. */
export function isPgConnectionLost(error: UnknownRecord): boolean {
  return (
    error instanceof Error &&
    error.name === "Error" &&
    error.code === undefined &&
    PG_CONNECTION_LOST_MESSAGES.has(error.message)
  );
}

export function isTransactionStartTimeout(error: UnknownRecord): boolean {
  return (
    error.code === "P2028" &&
    typeof error.message === "string" &&
    error.message.includes(TRANSACTION_START_TIMEOUT_PHRASE)
  );
}

export function isRedisDown(error: UnknownRecord): boolean {
  if (nameOf(error) !== "RedisCommandError" || typeof error.message !== "string") return false;
  const message = error.message;
  return (
    REDIS_DOWN_MESSAGES.has(message) ||
    REDIS_DOWN_PREFIXES.some((prefix) => message === prefix || message.startsWith(`${prefix} `))
  );
}

/** Verdadeiro se QUALQUER critério do §4.1 (com a Emenda 1) valer, no erro, no `cause` ou num item de `errors[]`. */
export function isInfrastructureDown(error: unknown, depth = 0): boolean {
  if (!isRecord(error) || depth > MAX_CLASSIFY_DEPTH) return false;
  const e = error;
  const name = nameOf(e);
  if (DOWN_NAMES.has(name)) return true;
  if (isPgConnectionLost(e)) return true;
  if (isTransactionStartTimeout(e)) return true;
  if (isRedisDown(e)) return true;
  if (typeof e.code === "string" && (NETWORK_CODES.has(e.code) || PRISMA_CONNECTION_CODE.test(e.code))) return true;
  const kind = driverCauseOf(e)?.kind;
  if (typeof kind === "string" && DOWN_DRIVER_KINDS.has(kind)) return true;
  const sqlState = sqlStateOf(e);
  if (sqlState !== undefined && DOWN_SQLSTATE_CLASSES.has(sqlState.slice(0, 2))) return true;
  if (isAwsServerFault(e)) return true;
  if (Array.isArray(e.errors) && e.errors.some((item) => isInfrastructureDown(item, depth + 1))) return true;
  return e.cause !== undefined && isInfrastructureDown(e.cause, depth + 1);
}

/** Tudo que tem marca de driver, de sistema ou de SDK (§4.2, com a Emenda 1 §E4.3). */
export function isOpaqueSystemError(error: unknown, depth = 0): boolean {
  if (!isRecord(error) || depth > MAX_CLASSIFY_DEPTH) return false;
  const e = error;
  const name = nameOf(e);
  if (name.startsWith("PrismaClient") || name === "DriverAdapterError" || name === "AggregateError") return true;
  if (name === "RedisCommandError") return true;
  if (typeof e.clientVersion === "string") return true;
  if (isRecord(e.meta) && isRecord(e.meta.driverAdapterError)) return true;
  if (typeof e.code === "string" && PRISMA_CODE.test(e.code)) return true;
  if (typeof e.severity === "string" && typeof e.code === "string" && e.code.length === 5) return true;
  if (typeof e.errno === "number" || typeof e.syscall === "string") return true;
  if (isRecord(e.$metadata)) return true;
  if (Array.isArray(e.errors) && e.errors.some((item) => isOpaqueSystemError(item, depth + 1))) return true;
  return e.cause !== undefined && isOpaqueSystemError(e.cause, depth + 1);
}

export function classifyPublicError(error: unknown): PublicErrorClass {
  if (isInfrastructureDown(error)) return "infra_down";
  if (isOpaqueSystemError(error)) return "opaque";
  return "text";
}

// ---------------------------------------------------------------------------------------------------------------------
// O texto que sai.
// ---------------------------------------------------------------------------------------------------------------------

const DRIVER_TEXT_MARKERS: readonly string[] = [
  "Invalid `prisma.",
  "Raw query failed",
  "PrismaClient",
  "DriverAdapterError",
  "reach database server",
  "getaddrinfo",
  "node_modules",
];
const DRIVER_TEXT_CODES =
  /\b(?:ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|ENETUNREACH|EPIPE|ECONNABORTED)\b/;

/** R6: texto com marca de driver (inclusive o já gravado por versão antiga) vira o `fallback`; o resto sai limpo. */
export function publicText(text: string, fallback: string): string {
  if (DRIVER_TEXT_MARKERS.some((marker) => text.includes(marker)) || DRIVER_TEXT_CODES.test(text)) return fallback;
  return scrubConnectionText(text);
}

/** `infra_down` e `opaque` devolvem o `fallback`; `text` devolve a mensagem do erro, limpa. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (classifyPublicError(error) !== "text") return fallback;
  return error instanceof Error ? publicText(error.message, fallback) : fallback;
}

/** O texto de erro já gravado (custo de nuvem) é limpo na saída: não há migração. `null`/`undefined` voltam como vieram. */
export function publicStoredError(text: string): string;
export function publicStoredError(text: null): null;
export function publicStoredError(text: undefined): undefined;
export function publicStoredError(text: string | null | undefined): string | null | undefined;
export function publicStoredError(text: string | null | undefined): string | null | undefined {
  if (text === null || text === undefined) return text;
  return publicText(text, STORED_ERROR_FALLBACK);
}
