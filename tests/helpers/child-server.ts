import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const DEFAULT_START_TIMEOUT_MS = 90_000;
const STOP_TIMEOUT_MS = 3_000;
const activeChildren = new Set<ChildProcessWithoutNullStreams>();
let signalHandlersInstalled = false;

export type ChildServerOptions = {
  readonly args: readonly string[];
  readonly command?: string;
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly readyPrefix?: string;
  readonly startTimeoutMs?: number;
  readonly onSpawn?: (pid: number) => void;
};

export type ChildServer = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly readyValue: string;
  readonly output: () => string;
  readonly stdout: () => string;
  readonly stderr: () => string;
  waitFor(prefix: string, after?: number): Promise<string>;
  write(line: string): void;
  stop(): Promise<void>;
};

function configuredStartTimeout(): number {
  const configured = Number.parseInt(process.env.TEST_CHILD_SERVER_START_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_START_TIMEOUT_MS;
}

function hasExited(child: ChildProcessWithoutNullStreams): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForExit(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<boolean> {
  if (hasExited(child)) return true;
  return await new Promise<boolean>((resolve) => {
    const onClose = (): void => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("close", onClose);
      resolve(hasExited(child));
    }, timeoutMs);
    timer.unref();
    child.once("close", onClose);
  });
}

async function taskkillTree(pid: number): Promise<void> {
  await new Promise<void>((resolve) => {
    execFile("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => resolve());
  });
}

async function terminateChildTree(child: ChildProcessWithoutNullStreams): Promise<void> {
  activeChildren.delete(child);
  if (hasExited(child)) return;

  if (process.platform === "win32" && child.pid !== undefined) {
    await taskkillTree(child.pid);
  } else if (child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  } else {
    child.kill("SIGTERM");
  }

  if (await waitForExit(child, STOP_TIMEOUT_MS)) return;

  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  } else {
    child.kill("SIGKILL");
  }
  await waitForExit(child, STOP_TIMEOUT_MS);
}

async function stopAllChildren(): Promise<void> {
  await Promise.all([...activeChildren].map(async (child) => terminateChildTree(child)));
}

function installSignalHandlers(): void {
  if (signalHandlersInstalled) return;
  signalHandlersInstalled = true;

  for (const [signal, exitCode] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]] as const) {
    process.once(signal, () => {
      void stopAllChildren().finally(() => process.exit(exitCode));
    });
  }
  process.once("exit", () => {
    for (const child of activeChildren) child.kill("SIGKILL");
  });
}

export async function startChildServer(options: ChildServerOptions): Promise<ChildServer> {
  installSignalHandlers();
  const readyPrefix = options.readyPrefix ?? "PORT ";
  const timeoutMs = options.startTimeoutMs ?? configuredStartTimeout();
  const child = spawn(options.command ?? process.execPath, [...options.args], {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  activeChildren.add(child);
  if (child.pid !== undefined) options.onSpawn?.(child.pid);

  let stdout = "";
  let stderr = "";
  let spawnError: Error | undefined;
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
  child.once("error", (error) => (spawnError = error));
  child.once("close", () => activeChildren.delete(child));

  const waitFor = async (prefix: string, after = 0): Promise<string> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const line = stdout.slice(after).split(/\r?\n/).find((candidate) => candidate.startsWith(prefix));
      if (line !== undefined) return line;
      if (spawnError !== undefined) throw spawnError;
      if (hasExited(child)) throw new Error(`servidor saiu (${child.exitCode ?? child.signalCode}): ${stderr.slice(-2000)}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`sem "${prefix}" em ${timeoutMs} ms: ${stderr.slice(-2000)}`);
  };

  try {
    const readyLine = await waitFor(readyPrefix);
    return {
      child,
      readyValue: readyLine.slice(readyPrefix.length).trim(),
      output: () => stdout + stderr,
      stdout: () => stdout,
      stderr: () => stderr,
      waitFor,
      write(line: string) {
        child.stdin.write(`${line}\n`);
      },
      stop: async () => terminateChildTree(child),
    };
  } catch (error) {
    await terminateChildTree(child);
    throw error;
  }
}

export async function withChildServer<T>(options: ChildServerOptions, use: (server: ChildServer) => Promise<T>): Promise<T> {
  const server = await startChildServer(options);
  try {
    return await use(server);
  } finally {
    await server.stop();
  }
}
