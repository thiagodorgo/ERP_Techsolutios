export function falhaC(error: unknown) { (globalThis as unknown as { console: Console }).console.error({ error: String(error) }); }
