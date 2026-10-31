import net, { type Socket } from "node:net";

import type { EvidenceScanInput, EvidenceScanner, EvidenceScanResult } from "./evidence-storage.js";

const INSTREAM_COMMAND = Buffer.from("zINSTREAM\0", "latin1");
const INSTREAM_TERMINATOR = Buffer.alloc(4);
const MAX_CHUNK_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 4096;
const DEFAULT_SCAN_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_CONCURRENT_SCANS = 4;
const DEFAULT_STREAM_MAX_BYTES = 100 * 1024 * 1024;

type SocketFactory = (options: net.NetConnectOpts) => Socket;

export type ClamAvEvidenceScannerOptions = {
  readonly host: string;
  readonly port: number;
  readonly connectTimeoutMs?: number;
  readonly scanTimeoutMs?: number;
  readonly maxConcurrentScans?: number;
  readonly streamMaxBytes?: number;
  readonly maxDbAgeHours?: number;
  readonly now?: () => number;
  readonly socketFactory?: SocketFactory;
};

/** Cliente mínimo do protocolo clamd INSTREAM. Limites/prazos entram nas fatias seguintes. */
export class ClamAvEvidenceScanner implements EvidenceScanner {
  private readonly socketFactory: SocketFactory;
  private readonly connectTimeoutMs: number;
  private readonly scanTimeoutMs: number;
  private readonly maxConcurrentScans: number;
  private readonly streamMaxBytes: number;
  private readonly maxDbAgeHours: number;
  private readonly now: () => number;
  private activeScans = 0;
  private lastFreshSignatureCheckAt: number | undefined;

  constructor(private readonly options: ClamAvEvidenceScannerOptions) {
    this.socketFactory = options.socketFactory ?? ((connectOptions) => net.createConnection(connectOptions));
    this.connectTimeoutMs = options.connectTimeoutMs ?? 3000;
    this.scanTimeoutMs = options.scanTimeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
    this.maxConcurrentScans = options.maxConcurrentScans ?? DEFAULT_MAX_CONCURRENT_SCANS;
    this.streamMaxBytes = options.streamMaxBytes ?? DEFAULT_STREAM_MAX_BYTES;
    this.maxDbAgeHours = options.maxDbAgeHours ?? 0;
    this.now = options.now ?? Date.now;
  }

  async scan(input: EvidenceScanInput): Promise<EvidenceScanResult> {
    if (input.buffer.length !== input.sizeBytes) {
      return { status: "failed", reason: "size_mismatch" };
    }
    if (input.buffer.length > this.streamMaxBytes) {
      return { status: "failed", reason: "stream_too_large" };
    }
    if (this.activeScans >= this.maxConcurrentScans) {
      return { status: "failed", reason: "scanner_busy" };
    }

    // A vaga é reservada antes do primeiro `await` e cobre as duas conexões da chamada: VERSION e INSTREAM.
    this.activeScans += 1;
    try {
      const signatureResult = await this.checkSignatures();
      if (signatureResult) return signatureResult;
      return await this.scanInstream(input);
    } finally {
      this.activeScans -= 1;
    }
  }

  private scanInstream(input: EvidenceScanInput): Promise<EvidenceScanResult> {
    return new Promise((resolve) => {
      let socket: Socket | undefined;
      let response = Buffer.alloc(0);
      let terminatorSent = false;
      let settled = false;
      let connectDeadline: NodeJS.Timeout | undefined;
      const deadline = setTimeout(
        () => settle({ status: "failed", reason: "timeout" }),
        this.scanTimeoutMs,
      );

      const settle = (result: EvidenceScanResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        if (connectDeadline) clearTimeout(connectDeadline);
        socket?.removeAllListeners();
        socket?.destroy();
        resolve(result);
      };

      try {
        socket = this.socketFactory({ host: this.options.host, port: this.options.port });
      } catch {
        settle({ status: "failed", reason: "connect_failed" });
        return;
      }

      connectDeadline = setTimeout(
        () => settle({ status: "failed", reason: "connect_failed" }),
        this.connectTimeoutMs,
      );

      socket.on("error", () => settle({ status: "failed", reason: "connect_failed" }));
      socket.on("end", () => {
        if (!settled) settle({ status: "failed", reason: "protocol_error" });
      });
      socket.on("data", (part: Buffer) => {
        if (!terminatorSent) {
          const early = part.indexOf(0);
          if (early === part.length - 1) {
            const earlyResult = parseResponse(part.subarray(0, early).toString("utf8"));
            if (
              earlyResult.status === "failed" &&
              earlyResult.reason === "stream_limit_misconfigured"
            ) {
              settle(earlyResult);
              return;
            }
          }
          settle({ status: "failed", reason: "protocol_error" });
          return;
        }

        response = Buffer.concat([response, part]);
        if (response.length > MAX_RESPONSE_BYTES) {
          settle({ status: "failed", reason: "response_too_large" });
          return;
        }
        const terminatorIndex = response.indexOf(0);
        if (terminatorIndex < 0) return;
        if (terminatorIndex !== response.length - 1 || response.indexOf(0, terminatorIndex + 1) >= 0) {
          settle({ status: "failed", reason: "protocol_error" });
          return;
        }

        settle(parseResponse(response.subarray(0, terminatorIndex).toString("utf8")));
      });

      socket.once("connect", () => {
        if (connectDeadline) clearTimeout(connectDeadline);
        connectDeadline = undefined;
        void sendInstream(socket, input.buffer)
          .then(() => {
            terminatorSent = true;
          })
          .catch(() => settle({ status: "failed", reason: "protocol_error" }));
      });
    });
  }

  private async checkSignatures(): Promise<EvidenceScanResult | undefined> {
    if (this.maxDbAgeHours <= 0) return undefined;
    const now = this.now();
    if (
      this.lastFreshSignatureCheckAt !== undefined &&
      now - this.lastFreshSignatureCheckAt < 60_000
    ) {
      return undefined;
    }

    const version = await this.queryVersion();
    if (!version) {
      this.lastFreshSignatureCheckAt = undefined;
      return { status: "failed", reason: "signatures_unknown" };
    }
    const match = /^ClamAV [^/]+\/[^/]+\/(.+)$/.exec(version);
    const signatureDate = match ? Date.parse(match[1]!) : Number.NaN;
    if (!Number.isFinite(signatureDate)) {
      this.lastFreshSignatureCheckAt = undefined;
      return { status: "failed", reason: "signatures_unknown" };
    }
    const ageHours = (now - signatureDate) / (60 * 60 * 1000);
    if (ageHours > this.maxDbAgeHours) {
      this.lastFreshSignatureCheckAt = undefined;
      return { status: "failed", reason: "signatures_stale" };
    }
    this.lastFreshSignatureCheckAt = now;
    return undefined;
  }

  private queryVersion(): Promise<string | undefined> {
    return new Promise((resolve) => {
      let socket: Socket | undefined;
      let settled = false;
      let response = Buffer.alloc(0);
      const finish = (value: string | undefined) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        socket?.removeAllListeners();
        socket?.destroy();
        resolve(value);
      };
      const deadline = setTimeout(() => finish(undefined), this.connectTimeoutMs);
      try {
        socket = this.socketFactory({ host: this.options.host, port: this.options.port });
      } catch {
        finish(undefined);
        return;
      }
      socket.on("error", () => finish(undefined));
      socket.on("end", () => finish(undefined));
      socket.on("data", (part: Buffer) => {
        response = Buffer.concat([response, part]);
        if (response.length > MAX_RESPONSE_BYTES) {
          finish(undefined);
          return;
        }
        const nul = response.indexOf(0);
        if (nul < 0) return;
        if (nul !== response.length - 1) {
          finish(undefined);
          return;
        }
        finish(response.subarray(0, nul).toString("utf8"));
      });
      socket.once("connect", () => socket?.write(Buffer.from("zVERSION\0", "latin1")));
    });
  }
}

async function sendInstream(socket: Socket, buffer: Buffer): Promise<void> {
  await write(socket, INSTREAM_COMMAND);
  for (let offset = 0; offset < buffer.length; offset += MAX_CHUNK_BYTES) {
    const chunk = buffer.subarray(offset, Math.min(offset + MAX_CHUNK_BYTES, buffer.length));
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(chunk.length, 0);
    await write(socket, length);
    await write(socket, chunk);
  }
  await write(socket, INSTREAM_TERMINATOR);
}

function write(socket: Socket, bytes: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(bytes, (error) => (error ? reject(error) : resolve()));
  });
}

function parseResponse(response: string): EvidenceScanResult {
  if (response === "stream: OK") return { status: "clean" };
  if (/^stream: Heuristics\.Limits\.Exceeded[^\0]* FOUND$/.test(response)) {
    return { status: "infected", reason: "scan_limit_exceeded" };
  }
  if (/^stream: .+ FOUND$/.test(response)) return { status: "infected" };
  if (
    response === "stream: INSTREAM size limit exceeded. ERROR" ||
    response === "INSTREAM size limit exceeded. ERROR"
  ) {
    return { status: "failed", reason: "stream_limit_misconfigured" };
  }
  return { status: "failed", reason: "protocol_error" };
}
