import pino from "pino";
const make = pino;
export const logger = make({ level: "info" });
