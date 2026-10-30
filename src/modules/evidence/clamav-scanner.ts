import net, { type Socket } from "node:net";

import type { EvidenceScanInput, EvidenceScanner, EvidenceScanResult } from "./evidence-storage.js";

const INSTREAM_COMMAND = Buffer.from("zINSTREAM\0", "latin1");
const INSTREAM_TERMINATOR = Buffer.alloc(4);
const MAX_CHUNK_BYTES = 64 * 1024;

type SocketFactory = (options: net.NetConnectOpts) => Socket;

export type ClamAvEvidenceScannerOptions = {
  readonly host: string;
  readonly port: number;
  readonly socketFactory?: SocketFactory;
};

/** Cliente mínimo do protocolo clamd INSTREAM. Limites/prazos entram nas fatias seguintes. */
export class ClamAvEvidenceScanner implements EvidenceScanner {
  private readonly socketFactory: SocketFactory;

  constructor(private readonly options: ClamAvEvidenceScannerOptions) {
    this.socketFactory = options.socketFactory ?? ((connectOptions) => net.createConnection(connectOptions));
  }

  scan(input: EvidenceScanInput): Promise<EvidenceScanResult> {
    return new Promise((resolve) => {
      const socket = this.socketFactory({ host: this.options.host, port: this.options.port });
      let response = Buffer.alloc(0);
      let terminatorSent = false;
      let settled = false;

      const settle = (result: EvidenceScanResult) => {
        if (settled) return;
        settled = true;
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      };

      socket.on("error", () => settle({ status: "failed", reason: "connect_failed" }));
      socket.on("end", () => {
        if (!settled) settle({ status: "failed", reason: "protocol_error" });
      });
      socket.on("data", (part: Buffer) => {
        if (!terminatorSent) {
          settle({ status: "failed", reason: "protocol_error" });
          return;
        }

        response = Buffer.concat([response, part]);
        const terminatorIndex = response.indexOf(0);
        if (terminatorIndex < 0) return;
        if (terminatorIndex !== response.length - 1 || response.indexOf(0, terminatorIndex + 1) >= 0) {
          settle({ status: "failed", reason: "protocol_error" });
          return;
        }

        settle(parseResponse(response.subarray(0, terminatorIndex).toString("utf8")));
      });

      socket.once("connect", () => {
        void sendInstream(socket, input.buffer)
          .then(() => {
            terminatorSent = true;
          })
          .catch(() => settle({ status: "failed", reason: "protocol_error" }));
      });
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
  if (/^stream: .+ FOUND$/.test(response)) return { status: "infected" };
  return { status: "failed", reason: "protocol_error" };
}
