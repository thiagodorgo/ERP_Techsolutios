const p = process;
export function f(error: unknown) { p.stderr.write(String(error)); }
