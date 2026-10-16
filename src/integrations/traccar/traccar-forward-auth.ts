// B-TRC-01 · autenticação do forward do Traccar (plano v2.1 §4.6).
//
// - Header ÚNICO: `X-Traccar-Forward-Token`. O Traccar 6.16.0 o manda a partir de `forward.header`, e só para a
//   URL global (`Keys.java:1110-1116`; commit acd55bd0). O valor vem do ambiente (FORWARD_HEADER), nunca do XML.
// - Comparação: o valor apresentado e cada candidato viram SHA-256 (32 bytes) e são comparados com
//   `crypto.timingSafeEqual` — tamanho fixo, tempo constante; o segredo nunca é comparado em claro.
// - Rotação: current sempre; previous só enquanto `agora < TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL` (o env reprova
//   prazo acima de 72 h). Prazo vencido → previous recusado.
// - Recusados com 401: header ausente ou vazio; valor errado; header repetido (o Node junta repetições de header
//   não padronizado com ", ", §11 M-35 — e aqui a repetição é contada no `rawHeaders` e recusada antes); segredo
//   em `Authorization` (qualquer `Authorization` presente recusa a requisição).
// - O resultado não carrega o segredo; a resposta 401 é `{"error":{"code":"unauthorized"}}`, sem motivo.

import { createHash, timingSafeEqual } from "node:crypto";

import type { RequestHandler } from "express";

export const TRACCAR_FORWARD_HEADER = "x-traccar-forward-token";

export type TraccarForwardSecrets = {
  readonly current: string;
  readonly previous?: string;
  readonly previousUntil?: Date;
};

export type TraccarForwardAuthInput = {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly rawHeaders: readonly string[];
};

export type TraccarForwardAuthResult =
  | { readonly ok: true; readonly matched: "current" | "previous" }
  | { readonly ok: false };

export type TraccarForwardAuthenticator = (input: TraccarForwardAuthInput) => TraccarForwardAuthResult;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function countRawHeader(rawHeaders: readonly string[], name: string): number {
  let count = 0;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() === name) count += 1;
  }
  return count;
}

export function createTraccarForwardAuthenticator(
  secrets: TraccarForwardSecrets,
  options: { readonly now?: () => Date; readonly compare?: typeof timingSafeEqual } = {},
): TraccarForwardAuthenticator {
  if (!secrets.current) {
    throw new Error("traccar forward auth: o segredo current é obrigatório.");
  }
  const now = options.now ?? (() => new Date());
  const compare = options.compare ?? timingSafeEqual;
  const currentDigest = digest(secrets.current);
  const previousDigest = secrets.previous ? digest(secrets.previous) : undefined;
  const previousUntil = secrets.previousUntil;

  return (input) => {
    if (input.headers.authorization !== undefined || countRawHeader(input.rawHeaders, "authorization") > 0) {
      return { ok: false };
    }
    if (countRawHeader(input.rawHeaders, TRACCAR_FORWARD_HEADER) !== 1) {
      return { ok: false };
    }
    const presented = input.headers[TRACCAR_FORWARD_HEADER];
    if (typeof presented !== "string" || presented.length === 0) {
      return { ok: false };
    }

    const presentedDigest = digest(presented);
    const matchesCurrent = compare(presentedDigest, currentDigest);
    const previousOpen =
      previousDigest !== undefined && previousUntil !== undefined && now().getTime() < previousUntil.getTime();
    const matchesPrevious = previousOpen ? compare(presentedDigest, previousDigest) : false;

    if (matchesCurrent) return { ok: true, matched: "current" };
    if (matchesPrevious) return { ok: true, matched: "previous" };
    return { ok: false };
  };
}

export function traccarForwardAuthMiddleware(authenticator: TraccarForwardAuthenticator): RequestHandler {
  return (request, response, next) => {
    const result = authenticator({ headers: request.headers, rawHeaders: request.rawHeaders });
    if (!result.ok) {
      response.status(401).json({ error: { code: "unauthorized" } });
      return;
    }
    next();
  };
}
