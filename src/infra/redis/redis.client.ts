import { createConnection, type Socket } from "node:net";

import { env } from "../../config/env.js";

export type RedisValue = string | number | null | RedisValue[];

export class RedisCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisCommandError";
  }
}

export class RedisClient {
  constructor(private readonly redisUrl = env.REDIS_URL) {}

  async command(command: string, ...args: readonly string[]): Promise<RedisValue> {
    const url = new URL(this.redisUrl);
    const port = Number(url.port || 6379);
    const host = url.hostname;
    const payload = encodeCommand([command, ...args]);

    return new Promise<RedisValue>((resolve, reject) => {
      const socket = createConnection({ host, port });
      const chunks: Buffer[] = [];
      let settled = false;

      const finish = (error: unknown, value?: RedisValue) => {
        if (settled) return;
        settled = true;
        socket.destroy();

        if (error) {
          reject(error);
          return;
        }

        resolve(value ?? null);
      };

      socket.setTimeout(5_000);
      socket.once("connect", () => {
        socket.write(payload);
      });
      socket.on("data", (chunk) => {
        chunks.push(chunk);
        try {
          const parsed = parseRedisValue(Buffer.concat(chunks), 0);

          if (parsed) {
            finish(null, parsed.value);
          }
        } catch (error) {
          finish(error);
        }
      });
      socket.once("timeout", () => finish(new RedisCommandError("Redis command timed out.")));
      socket.once("error", (error) => finish(error));
      socket.once("end", () => {
        if (!settled) {
          finish(new RedisCommandError("Redis connection ended before a complete response."));
        }
      });
    });
  }

  async ping(): Promise<boolean> {
    return (await this.command("PING")) === "PONG";
  }

  async disconnect(): Promise<void> {
    // Commands use short-lived sockets, so there is no shared connection to close.
  }
}

let redisClient: RedisClient | undefined;

export function getRedisClient(): RedisClient {
  redisClient ??= new RedisClient();
  return redisClient;
}

export async function disconnectRedisClient(): Promise<void> {
  await redisClient?.disconnect();
  redisClient = undefined;
}

function encodeCommand(parts: readonly string[]): string {
  return `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join("")}`;
}

type ParsedRedisValue = {
  readonly value: RedisValue;
  readonly offset: number;
};

function parseRedisValue(buffer: Buffer, offset: number): ParsedRedisValue | null {
  if (offset >= buffer.length) return null;

  const prefix = String.fromCharCode(buffer[offset]);

  if (prefix === "+") {
    return parseLineValue(buffer, offset, (line) => line);
  }

  if (prefix === "-") {
    const parsed = parseLineValue(buffer, offset, (line) => line);

    if (!parsed) return null;
    throw new RedisCommandError(String(parsed.value));
  }

  if (prefix === ":") {
    return parseLineValue(buffer, offset, (line) => Number(line));
  }

  if (prefix === "$") {
    return parseBulkString(buffer, offset);
  }

  if (prefix === "*") {
    return parseArray(buffer, offset);
  }

  throw new RedisCommandError(`Unsupported Redis response prefix: ${prefix}`);
}

function parseLineValue(
  buffer: Buffer,
  offset: number,
  map: (line: string) => RedisValue,
): ParsedRedisValue | null {
  const end = buffer.indexOf("\r\n", offset);

  if (end === -1) return null;

  return {
    value: map(buffer.toString("utf8", offset + 1, end)),
    offset: end + 2,
  };
}

function parseBulkString(buffer: Buffer, offset: number): ParsedRedisValue | null {
  const lengthLine = parseLineValue(buffer, offset, (line) => Number(line));

  if (!lengthLine) return null;

  const length = Number(lengthLine.value);

  if (length === -1) {
    return {
      value: null,
      offset: lengthLine.offset,
    };
  }

  const valueStart = lengthLine.offset;
  const valueEnd = valueStart + length;
  const responseEnd = valueEnd + 2;

  if (buffer.length < responseEnd) return null;

  return {
    value: buffer.toString("utf8", valueStart, valueEnd),
    offset: responseEnd,
  };
}

function parseArray(buffer: Buffer, offset: number): ParsedRedisValue | null {
  const lengthLine = parseLineValue(buffer, offset, (line) => Number(line));

  if (!lengthLine) return null;

  const length = Number(lengthLine.value);

  if (length === -1) {
    return {
      value: null,
      offset: lengthLine.offset,
    };
  }

  const values: RedisValue[] = [];
  let nextOffset = lengthLine.offset;

  for (let index = 0; index < length; index += 1) {
    const parsed = parseRedisValue(buffer, nextOffset);

    if (!parsed) return null;
    values.push(parsed.value);
    nextOffset = parsed.offset;
  }

  return {
    value: values,
    offset: nextOffset,
  };
}
