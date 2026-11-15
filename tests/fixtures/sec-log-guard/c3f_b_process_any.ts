export function falhaB(error: unknown) { (process as any).stderr.write(String(error) + "\n"); }
