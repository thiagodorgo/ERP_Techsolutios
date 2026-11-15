export function falhaE(error: unknown) { (globalThis as unknown as Record<string, Console>)["console"].error({ error: String(error) }); }
