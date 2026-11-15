export async function mk() { const { default: p } = await import("pino"); return p({ level: "info" }); }
