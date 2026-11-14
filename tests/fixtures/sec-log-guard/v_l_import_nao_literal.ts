export async function mk(nome: string) { const m = await import(nome); return m.default({ level: "info" }); }
