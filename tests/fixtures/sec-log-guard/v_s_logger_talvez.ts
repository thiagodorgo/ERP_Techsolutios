import { pinoHttp } from "pino-http"; import type { Logger } from "pino"; export const mk = (logger: Logger | undefined) => pinoHttp({ logger });
