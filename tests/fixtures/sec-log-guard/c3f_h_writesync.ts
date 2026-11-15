import fs from "node:fs";
export function falhaH(error: unknown) { fs.writeSync(2, String(error) + "\n"); }
