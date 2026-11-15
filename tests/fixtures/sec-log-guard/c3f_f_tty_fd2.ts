import tty from "node:tty";
export function falhaF(error: unknown) { new tty.WriteStream(2).write(String(error) + "\n"); }
