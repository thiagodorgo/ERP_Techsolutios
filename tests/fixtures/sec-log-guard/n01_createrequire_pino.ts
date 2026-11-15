import { createRequire } from "node:module";
const carregar = createRequire(import.meta.url);
const fabricaCrua = carregar("pino") as (o: { level: string }) => { error: (o: object, m: string) => void };
export const logger = fabricaCrua({ level: "info" });
