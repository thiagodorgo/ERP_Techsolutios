export function f(logger: Pick<Console, "error">, error: unknown) { logger.error({ error }); }
