/// <reference lib="webworker" />
// Ω5P PR-16 — Web Worker que RESOLVE o proof-of-work fora da thread da UI (D-Ω5P-PORTAL-05). Procura um inteiro
// `n` tal que SHA-256("salt:n") tenha `difficulty` NIBBLES hex zero à esquerda — o MESMO algoritmo que o BFF
// verifica em O(1). Usa crypto.subtle (SHA-256 NATIVO) → correto por construção, sem crypto reimplementada.
declare const self: DedicatedWorkerGlobalScope;

type SolveRequest = { readonly salt: string; readonly difficulty: number };

const encoder = new TextEncoder();

function hasLeadingZeroNibbles(hex: string, difficulty: number): boolean {
  for (let i = 0; i < difficulty; i += 1) {
    if (hex[i] !== "0") return false;
  }
  return true;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function solve(salt: string, difficulty: number): Promise<string> {
  for (let n = 0; ; n += 1) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${n}`));
    if (hasLeadingZeroNibbles(toHex(digest), difficulty)) {
      return String(n);
    }
  }
}

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const { salt, difficulty } = event.data;
  solve(salt, difficulty)
    .then((solution) => self.postMessage({ ok: true, solution }))
    .catch(() => self.postMessage({ ok: false }));
};

export {};
