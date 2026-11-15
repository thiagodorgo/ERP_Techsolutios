import { pinoHttp } from "pino-http"; import type { Logger } from "pino"; export const mk = (logger: Logger, o: object) => pinoHttp({ logger, ...o });
