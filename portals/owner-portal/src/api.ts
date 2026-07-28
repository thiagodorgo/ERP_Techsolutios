// Ω5P PR-16 — cliente do BFF público (owner-portal). Fluxo: /challenge → resolve o PoW no Web Worker → /lookup.
// A resposta NEGATIVA é uniforme (found:false); só FOUND traz o processo minimizado + a sessão (jose/JWE).

export type OwnerProcess = {
  readonly status: string;
  readonly statusLabel: string;
  readonly yardPublicName: string | null;
  readonly yardPublicAddress: string | null;
  readonly enteredAt: string | null;
  readonly totalDueLabel: string;
};

type Challenge = { readonly challengeId: string; readonly salt: string; readonly difficulty: number; readonly expiresAt: string };

export type LookupOutcome =
  | { readonly kind: "found"; readonly process: OwnerProcess; readonly session: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "error" };

async function requestChallenge(): Promise<Challenge> {
  const response = await fetch("/portal/v1/owner/challenge", {
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

// ── Ω5P PR-17 — dossiê detalhado + solicitar liberação (consomem a sessão JWE do lookup FOUND) ───────────────────
export type DossierChargeItem = {
  readonly kindLabel: string;
  readonly subtotalLabel: string;
  readonly dailyCount?: number;
  readonly capReachedLabel?: string;
};
export type DossierDeadline = { readonly label: string; readonly dueDate: string; readonly elapsedLabel: string };
export type DossierRequirement = { readonly label: string; readonly required: boolean };
export type OwnerDossier = {
  readonly status: string;
  readonly statusLabel: string;
  readonly yardPublicName: string | null;
  readonly yardPublicAddress: string | null;
  readonly enteredAt: string | null;
  readonly vehicle: { readonly brand: string | null; readonly model: string | null; readonly color: string | null; readonly year: number | null };
  readonly charges: { readonly items: readonly DossierChargeItem[]; readonly totalDueLabel: string };
  readonly deadlines: readonly DossierDeadline[];
  readonly requirements: readonly DossierRequirement[];
  readonly photos: { readonly setsAvailableCount: number; readonly availabilityLabel: string };
};

// `session_invalid` (401) = a consulta expirou por segurança → o PWA pede refazer a consulta. Nunca guardamos a
// sessão em disco; ela vive só em memória durante a navegação.
export type DossierOutcome =
  | { readonly kind: "ok"; readonly dossier: OwnerDossier }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "error" };

export type ReleaseRequestOutcome =
  | { readonly kind: "ok" }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "error" };

function authHeader(session: string): Record<string, string> {
  return { authorization: `Bearer ${session}` };
}

export async function fetchDossier(session: string): Promise<DossierOutcome> {
  try {
    const response = await fetch("/portal/v1/owner/dossier", { method: "GET", headers: authHeader(session) });
    if (response.status === 401) return { kind: "session_invalid" };
    if (response.status === 429) return { kind: "rate_limited" };
    if (!response.ok) return { kind: "error" };
    return { kind: "ok", dossier: (await response.json()).data as OwnerDossier };
  } catch {
    return { kind: "error" };
  }
}

export async function submitReleaseRequest(session: string, note: string): Promise<ReleaseRequestOutcome> {
  try {
    const response = await fetch("/portal/v1/owner/release-request", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader(session) },
      body: JSON.stringify(note.trim().length > 0 ? { note: note.trim() } : {}),
    });
    if (response.status === 401) return { kind: "session_invalid" };
    if (response.status === 429) return { kind: "rate_limited" };
    if (!response.ok) return { kind: "error" };
    return { kind: "ok" };
  } catch {
    return { kind: "error" };
  }
}

export async function lookupVehicle(plate: string, renavam: string): Promise<LookupOutcome> {
  try {
    const challenge = await requestChallenge();
    const solution = await solvePow(challenge);
    const response = await fetch("/portal/v1/owner/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plate, renavam, challengeId: challenge.challengeId, solution }),
    });
    if (response.status === 429) return { kind: "rate_limited" };
    if (!response.ok) return { kind: "error" };
    const data = (await response.json()).data as {
      found: boolean;
      process: OwnerProcess | null;
      session: string | null;
    };
    if (data.found && data.process && data.session) {
      return { kind: "found", process: data.process, session: data.session };
    }
    return { kind: "not_found" };
  } catch {
    return { kind: "error" };
  }
}
