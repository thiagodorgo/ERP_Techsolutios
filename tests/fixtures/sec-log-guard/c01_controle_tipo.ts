export function f(logger: Pick<Console, "error">, saida: typeof process.stderr | undefined, error: unknown) { logger.error({ error }); return saida; }
