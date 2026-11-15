const { console: saida } = globalThis;
export function f(error: unknown) { saida.error({ error }); }
