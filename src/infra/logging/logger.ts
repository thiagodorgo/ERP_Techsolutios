// B-SEC-LOG-SANITIZA (L1, L1b, L3, L4) — a fábrica ÚNICA de logger da API. É o único arquivo de `src/` que importa
// `pino` como valor (trava G1) e um dos dois que importam `pino-http` (trava G2).
//
// - `hooks.logMethod` passa cada argumento de log pelo saneador (`sanitizeForLog`). Se o saneador lançar, sai uma linha
//   fixa (`logSanitizerFailed`), NUNCA o argumento cru (fail-closed).
// - `hooks.streamWrite` aplica R1 e R2 (URL de conexão) sobre a linha final. A R3 não vai aqui: sobre o JSON ela
//   corromperia chaves.
// - `child()` e `setBindings()` do logger raiz são trocados para limpar os bindings e o `msgPrefix` (Emenda 1, R2-03): o
//   `logMethod` só vê os argumentos da chamada, e o que entra no filho o pino serializa direto. Filhos e netos herdam a
//   troca pelo protótipo (o `child` do pino faz `Object.create(this)`).
import type { Writable } from "node:stream";
import pino, { type Bindings, type ChildLoggerOptions, type LogFn, type Logger, type LoggerOptions } from "pino";
import { pinoHttp, type HttpLogger, type Options as HttpLoggerOptions } from "pino-http";
import { env } from "../../config/env.js";
import { sanitizeForLog, scrubConnectionText, scrubCredentialUrls } from "./log-sanitizer.js";

export const SANITIZER_FAILED_MESSAGE = "log suprimido: falha no saneador";

export type CreateLoggerOptions = {
  readonly level?: string;
  /** Só para teste: a saída vai para este `Writable` em vez do stdout. */
  readonly destination?: Writable;
};

/**
 * Cada argumento passa por `sanitizeForLog`. Um `Error` no 1º argumento vira `{ err: <erro saneado> }`, como o próprio
 * pino faz com um `Error` ali (sem isso o objeto saneado, que já não é `Error`, seria fundido no topo da linha); sem
 * mensagem, a do erro saneado vira o `msg`, também como no pino.
 */
export function sanitizeLogArgs(args: Parameters<LogFn>): Parameters<LogFn> {
  const [first, ...rest] = args as unknown[];
  if (first instanceof Error) {
    const err = sanitizeForLog(first) as { message?: unknown };
    const tail = rest.length > 0 ? rest.map((arg) => sanitizeForLog(arg)) : [String(err.message ?? "")];
    return [{ err }, ...tail] as unknown as Parameters<LogFn>;
  }
  return args.map((arg) => sanitizeForLog(arg)) as Parameters<LogFn>;
}

type ChildMethod = (this: Logger, bindings: Bindings, options?: ChildLoggerOptions) => Logger;
type SetBindingsMethod = (this: Logger, bindings: Bindings) => void;

function sanitizeBindings(bindings: Bindings): Bindings {
  try {
    return sanitizeForLog(bindings) as Bindings;
  } catch {
    return { logSanitizerFailed: true };
  }
}

function sanitizeChildOptions(options?: ChildLoggerOptions): ChildLoggerOptions | undefined {
  if (!options || typeof options.msgPrefix !== "string") return options;
  return { ...options, msgPrefix: scrubConnectionText(options.msgPrefix) };
}

function sanitizeChildLoggers(root: Logger): Logger {
  const originalChild = root.child as unknown as ChildMethod;
  const originalSetBindings = root.setBindings as SetBindingsMethod;
  root.child = function child(this: Logger, bindings: Bindings, options?: ChildLoggerOptions) {
    return originalChild.call(this, sanitizeBindings(bindings), sanitizeChildOptions(options));
  } as unknown as Logger["child"];
  root.setBindings = function setBindings(this: Logger, bindings: Bindings) {
    return originalSetBindings.call(this, sanitizeBindings(bindings));
  };
  return root;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const loggerOptions: LoggerOptions = {
    level: options.level ?? env.LOG_LEVEL,
    hooks: {
      logMethod(args, method) {
        try {
          return method.apply(this, sanitizeLogArgs(args));
        } catch {
          return method.call(this, { logSanitizerFailed: true }, SANITIZER_FAILED_MESSAGE);
        }
      },
      streamWrite: scrubCredentialUrls,
    },
  };
  const root = options.destination ? pino(loggerOptions, options.destination) : pino(loggerOptions);
  return sanitizeChildLoggers(root);
}

export type CreateHttpLoggerOptions = Omit<HttpLoggerOptions, "logger" | "level">;

/**
 * O `pino-http` com o logger da fábrica. O `logger` vem DEPOIS do spread: as opções não o trocam. O 2º argumento só
 * existe para o teste mandar a saída para um `Writable`.
 */
export function createHttpLogger(
  options: CreateHttpLoggerOptions = {},
  loggerOptions: CreateLoggerOptions = {},
): HttpLogger {
  return pinoHttp({ ...options, logger: createLogger(loggerOptions) });
}
