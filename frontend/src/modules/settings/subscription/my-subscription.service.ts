import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptMySubscriptionResponse } from "./my-subscription.adapter";
import type { MySubscriptionApiContext, MySubscriptionResult } from "./my-subscription.types";

// B-ASS-11 (F2, Emenda 1 §6.1) — UMA chamada: `GET /api/v1/billing/subscription`, a rota isolada do cliente (a
// organização vem da sessão; nunca `tenantId` na consulta). A tela não chama a tendência nem nada de plataforma (T-L1,
// T-G1). Devolve `ready`, `none` (sem assinatura, `data: null`), `forbidden` (403: papel sem `billing:read` ou ator de
// plataforma) ou `failed` (rede, erro do servidor ou resposta fora da forma). Modo simulado: `none` (D-007, nada
// fabricado).

export const MY_SUBSCRIPTION_ENDPOINT = "/billing/subscription";

export async function fetchMySubscription(context: MySubscriptionApiContext): Promise<MySubscriptionResult> {
  if (isMockMode()) return { kind: "none" };
  let response: unknown;
  try {
    response = await apiRequest<unknown>(MY_SUBSCRIPTION_ENDPOINT, context);
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status;
    if (status === 403) return { kind: "forbidden" };
    return { kind: "failed", status: typeof status === "number" ? status : null };
  }
  const parsed = adaptMySubscriptionResponse(response);
  if (parsed.kind === "invalid") return { kind: "failed", status: null };
  return parsed;
}
