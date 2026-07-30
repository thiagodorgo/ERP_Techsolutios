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

// Ω5P PR-18b — solicitar remoção. Consome a SESSÃO JWE do login (Bearer). A resposta é SEMPRE genérica
// (200 {received:true}) para {originada, enfileirada, duplicada} — o portal não confirma/nega origem nem fila
// (anti-oráculo). 401 = sessão expirada/revogada → volta ao login. NUNCA envia credentialId/órgão (vem da sessão).
export type RemovalInput = { readonly plate: string; readonly location?: string; readonly legalBasis?: string };

export type RemovalOutcome =
  | { readonly kind: "received" }
  | { readonly kind: "session_expired" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "invalid" }
  | { readonly kind: "error" };

export async function requestRemoval(session: string, input: RemovalInput): Promise<RemovalOutcome> {
  try {
    const response = await fetch("/portal/v1/authority/removals", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session}` },
      body: JSON.stringify({ plate: input.plate, location: input.location, legalBasis: input.legalBasis }),
    });
    if (response.status === 200) return { kind: "received" };
    if (response.status === 401) return { kind: "session_expired" };
    if (response.status === 429) return { kind: "rate_limited" };
    if (response.status === 400) return { kind: "invalid" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

// Ω5P PR-19 — fila de aprovações pendentes + decisão (APPROVE|REJECT), só nos processos que a PRÓPRIA credencial
// originou. Resposta MINIMIZADA (§2.8): SEM releaseId (id interno de custódia).
export type PendingApprovalItem = {
  readonly processId: string;
  readonly kind: string;
  readonly vehiclePlate?: string;
  readonly requestedAt: string;
  readonly pendingRequirements: readonly string[];
};

export type ListApprovalsOutcome =
  | { readonly kind: "ok"; readonly items: readonly PendingApprovalItem[] }
  | { readonly kind: "session_expired" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "error" };

export async function listApprovals(session: string): Promise<ListApprovalsOutcome> {
  try {
    const response = await fetch("/portal/v1/authority/approvals", {
      headers: { authorization: `Bearer ${session}` },
    });
    if (response.status === 200) {
      const data = (await response.json()).data as PendingApprovalItem[];
      return { kind: "ok", items: data };
    }
    if (response.status === 401) return { kind: "session_expired" };
    if (response.status === 429) return { kind: "rate_limited" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

export type DecideInput = { readonly decision: "APPROVE" | "REJECT"; readonly reference?: string; readonly note?: string };

export type DecideOutcome =
  | { readonly kind: "decided"; readonly decision: "APPROVED" | "REJECTED" }
  | { readonly kind: "not_found" }
  | { readonly kind: "conflict" }
  | { readonly kind: "session_expired" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "invalid" }
  | { readonly kind: "error" };

export async function decideApproval(session: string, processId: string, input: DecideInput): Promise<DecideOutcome> {
  try {
    const response = await fetch(`/portal/v1/authority/approvals/${processId}/decide`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session}` },
      body: JSON.stringify({ decision: input.decision, reference: input.reference, note: input.note }),
    });
    if (response.status === 200) {
      const data = (await response.json()).data as { decision: "APPROVED" | "REJECTED" };
      return { kind: "decided", decision: data.decision };
    }
    if (response.status === 401) return { kind: "session_expired" };
    if (response.status === 404) return { kind: "not_found" };
    if (response.status === 409) return { kind: "conflict" };
    if (response.status === 429) return { kind: "rate_limited" };
    if (response.status === 400) return { kind: "invalid" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
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
