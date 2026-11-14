const { stderr } = process;
export function f(error: unknown) { stderr.write(String(error)); }
