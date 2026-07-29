// Ω5P PR-18a — cliente do BFF público (authority-portal). Fluxo do LOGIN: /challenge → resolve o PoW no Web Worker
// → /login. A resposta de FALHA é UNIFORME (invalid) — não revela se o usuário existe, se a senha errou ou se está
// bloqueado. Só o sucesso traz { session, authorityName } (a sessão JWE vive só em memória durante a navegação).

type Challenge = { readonly challengeId: string; readonly salt: string; readonly difficulty: number; readonly expiresAt: string };

export type LoginOutcome =
  | { readonly kind: "authenticated"; readonly session: string; readonly authorityName: string }
  | { readonly kind: "invalid" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "error" };

async function requestChallenge(): Promise<Challenge> {
  const response = await fetch("/portal/v1/authority/challenge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error("challenge_request_failed");
  return (await response.json()).data as Challenge;
}

function solvePow(challenge: Challenge): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pow-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ ok: boolean; solution?: string }>) => {
      worker.terminate();
      if (event.data.ok && event.data.solution) resolve(event.data.solution);
      else reject(new Error("pow_failed"));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("pow_worker_error"));
    };
    worker.postMessage({ salt: challenge.salt, difficulty: challenge.difficulty });
  });
}

export async function login(username: string, password: string): Promise<LoginOutcome> {
  try {
    const challenge = await requestChallenge();
    const solution = await solvePow(challenge);
    const response = await fetch("/portal/v1/authority/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password, challengeId: challenge.challengeId, solution }),
    });
    if (response.status === 429) return { kind: "rate_limited" };
    if (response.status === 401) return { kind: "invalid" };
    if (response.status === 400) return { kind: "invalid" }; // formato/PoW — mensagem genérica ao usuário
    if (!response.ok) return { kind: "error" };
    const data = (await response.json()).data as { session: string; authorityName: string };
    if (data.session && data.authorityName) {
      return { kind: "authenticated", session: data.session, authorityName: data.authorityName };
    }
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
