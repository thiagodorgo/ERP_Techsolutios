import { pinoHttp } from "pino-http";
const deps: { logger?: undefined } = {};
export const mw = pinoHttp({ logger: deps.logger });
