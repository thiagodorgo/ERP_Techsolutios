import proc from "node:process";
export function f(error: unknown) { proc.stdout.write(String(error)); }
