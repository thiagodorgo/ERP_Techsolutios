import { stderr } from "node:process";
export function f(error: unknown) { stderr.write(String(error)); }
