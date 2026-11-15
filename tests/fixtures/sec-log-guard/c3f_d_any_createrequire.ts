const modulo: any = await import("node:module");
const carregar = modulo.createRequire(import.meta.url);
export const loggerCru = carregar("pino")({ level: "info" });
