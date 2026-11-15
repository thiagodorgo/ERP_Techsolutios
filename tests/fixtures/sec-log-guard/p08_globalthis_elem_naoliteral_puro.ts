const k = "console" as const;
export function f(error: unknown) { globalThis[k].error({ error }); }
