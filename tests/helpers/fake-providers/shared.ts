// B-ASS-06 · infra de teste compartilhada dos servidores FALSOS (plano §4.6). `node:http` em `127.0.0.1:0`;
// nenhuma chamada a host real. Cada requisição é gravada em `recorded[]` para asserção de método, caminho,
// headers e corpo. Cenários por cabeçalho `x-fake-scenario`.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type RecordedRequest = {
  readonly method: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: string;
};

export type FakeHandler = (req: IncomingMessage, res: ServerResponse, body: string) => Promise<void> | void;

export type FakeServer = {
  readonly baseUrl: string;
  readonly port: number;
  readonly recorded: RecordedRequest[];
  close(): Promise<void>;
};

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("fake request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

export async function startFakeServer(handler: FakeHandler): Promise<FakeServer> {
  const recorded: RecordedRequest[] = [];
  const sockets = new Set<import("node:net").Socket>();
  const server: Server = createServer((req, res) => {
    void (async () => {
      const body = await readBody(req);
      recorded.push({ method: req.method ?? "GET", path: req.url ?? "/", headers: { ...req.headers }, body });
      await handler(req, res, body);
    })();
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    port: address.port,
    recorded,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const socket of sockets) socket.destroy();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

export function scenarioOf(req: IncomingMessage): string {
  const value = req.headers["x-fake-scenario"];
  return typeof value === "string" ? value : "ok";
}
