export function falhaG(error: unknown) { (Reflect.get(globalThis, "console") as Console).error({ error: String(error) }); }
