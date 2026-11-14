import * as modulo from "node:module";
const carregar = modulo.createRequire(import.meta.url);
export const logger = (carregar("pino") as (o: object) => unknown)({ level: "info" });
