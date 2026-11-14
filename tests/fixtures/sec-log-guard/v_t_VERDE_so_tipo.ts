import type { Logger } from "pino"; export function f(logger: Logger, error: unknown) { logger.error({ err: error }, "x"); }
