export const logger = (process.mainModule!.require("pino") as (o: object) => unknown)({ level: "info" });
