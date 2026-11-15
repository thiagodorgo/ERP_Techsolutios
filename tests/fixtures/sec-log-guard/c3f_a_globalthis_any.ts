export function falhaA(error: unknown) { (globalThis as any).console.error({ error: String(error) }); }
