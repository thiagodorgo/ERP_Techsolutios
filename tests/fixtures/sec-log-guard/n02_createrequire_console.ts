import { createRequire } from "node:module";
const carregar = createRequire(import.meta.url);
const saida = carregar("node:console") as { error: (...a: unknown[]) => void };
export function f(error: unknown) { saida.error({ error }); }
