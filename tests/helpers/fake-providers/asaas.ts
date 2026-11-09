// B-ASS-06 · F2 — o servidor FALSO Asaas (plano §4.6). `node:http` em 127.0.0.1:0; corpos copiados da
// pesquisa (formatos Asaas v3). Cenários por cabeçalho `x-fake-scenario`: ok, validation_400,
// rate_limited_429 (Retry-After: 2), timeout (pendura), customer_duplicate. Grava as requisições em
// `recorded[]`. Nenhuma chamada a host real.

import type { IncomingMessage, ServerResponse } from "node:http";

import { scenarioOf, sendJson, startFakeServer, type FakeServer } from "./shared.js";

let idSeq = 1;
const customers: Array<Record<string, unknown>> = [];
const payments: Array<Record<string, unknown>> = [];

export function resetAsaasFakeState(): void {
  idSeq = 1;
  customers.length = 0;
  payments.length = 0;
}

function nextId(prefix: string): string {
  const id = `${prefix}${String(idSeq).padStart(4, "0")}`;
  idSeq += 1;
  return id;
}

function scenarioOfReq(req: IncomingMessage, fallback: string): string {
  const fromHeader = scenarioOf(req);
  return fromHeader === "ok" && fallback !== "ok" ? fallback : fromHeader;
}

const PAYMENT_SCENARIO_STATUS: Readonly<Record<string, string>> = {
  validation_400: "PENDING",
};

export type AsaasWebhookEvent = {
  readonly id: string;
  readonly event: string;
  readonly payment: Readonly<Record<string, unknown>>;
};

export type AsaasFake = FakeServer & {
  setPaymentStatus(id: string, status: string): void;
};

/**
 * B-ASS-08 · F3 — o falso EMITE um webhook para a nossa URL, com a autenticidade do Asaas: header
 * `asaas-access-token` = o segredo que registramos (`webhook_secret`). `badSecret`/`extraToken` reproduzem o
 * ataque (segredo errado, header repetido). Devolve `{ status }` da nossa resposta. Nenhuma chamada a host real.
 */
export async function emitAsaasWebhook(
  targetUrl: string,
  event: AsaasWebhookEvent,
  options: { secret: string; badSecret?: boolean; extraToken?: string } = { secret: "" },
): Promise<{ status: number; body: unknown }> {
  const token = options.badSecret ? `${options.secret}-WRONG` : options.secret;
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("asaas-access-token", token);
  if (options.extraToken !== undefined) headers.append("asaas-access-token", options.extraToken);
  const response = await fetch(targetUrl, { method: "POST", headers, body: JSON.stringify(event) });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

export async function startAsaasFake(defaultScenario = "ok", options: { ignoreExternalReferenceFilter?: boolean } = {}): Promise<AsaasFake> {
  resetAsaasFakeState();
  const server = await startFakeServer(async (req, res, body) => {
    const scenario = scenarioOfReq(req, defaultScenario);
    const path = req.url ?? "/";
    const pathname = path.split("?")[0] ?? "/";
    const url = new URL(path, "http://127.0.0.1");
    const method = req.method ?? "GET";

    if (scenario === "timeout") {
      return; // pendura: o cliente aborta por timeout e o close destrói o socket.
    }
    if (scenario === "rate_limited_429") {
      res.setHeader("Retry-After", "2");
      return sendJson(res, 429, { errors: [{ code: "rate_limited", description: "too many requests" }] });
    }
    if (scenario === "rate_limited_429_reset") {
      res.setHeader("RateLimit-Reset", "30");
      return sendJson(res, 429, { errors: [{ code: "rate_limited", description: "too many requests" }] });
    }
    if (scenario === "validation_400") {
      return sendJson(res, 400, { errors: [{ code: "invalid_value", description: `O access_token ${String(req.headers["access_token"] ?? "")} é inválido` }] });
    }

    // GET /v3/customers?cpfCnpj=…
    if (method === "GET" && pathname === "/v3/customers") {
      const cpfCnpj = url.searchParams.get("cpfCnpj");
      const found = customers.filter((c) => c.cpfCnpj === cpfCnpj);
      return sendJson(res, 200, { object: "list", hasMore: false, totalCount: found.length, data: found });
    }
    if (method === "POST" && pathname === "/v3/customers") {
      const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
      const duplicate = customers.find((c) => c.cpfCnpj === parsed.cpfCnpj);
      if (scenario === "customer_duplicate" || duplicate) {
        return sendJson(res, 200, { ...duplicate, duplicate: true });
      }
      const customer = { object: "customer", id: nextId("cus_"), name: parsed.name, cpfCnpj: parsed.cpfCnpj, notificationDisabled: parsed.notificationDisabled ?? false };
      customers.push(customer);
      return sendJson(res, 200, customer);
    }

    // POST /v3/payments
    if (method === "POST" && pathname === "/v3/payments") {
      const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
      const payment = {
        object: "payment",
        id: nextId("pay_"),
        customer: parsed.customer,
        billingType: parsed.billingType,
        value: parsed.value,
        dueDate: parsed.dueDate,
        description: parsed.description,
        externalReference: parsed.externalReference,
        status: PAYMENT_SCENARIO_STATUS[scenario] ?? "PENDING",
        invoiceUrl: `https://www.asaas.com/i/${nextId("inv_")}`,
        bankSlipUrl: `https://www.asaas.com/b/pdf/${nextId("slip_")}`,
      };
      payments.push(payment);
      return sendJson(res, 200, payment);
    }

    // GET /v3/payments?externalReference=…
    if (method === "GET" && pathname === "/v3/payments") {
      const externalReference = url.searchParams.get("externalReference");
      const data = options.ignoreExternalReferenceFilter ? [...payments] : payments.filter((p) => p.externalReference === externalReference);
      return sendJson(res, 200, { object: "list", hasMore: false, totalCount: data.length, data });
    }

    // /v3/payments/{id}
    const paymentMatch = pathname.match(/^\/v3\/payments\/([^/]+)$/);
    if (paymentMatch && method === "GET") {
      const id = paymentMatch[1];
      const payment = payments.find((p) => p.id === id);
      return payment ? sendJson(res, 200, payment) : sendJson(res, 404, { errors: [{ code: "not_found", description: "payment not found" }] });
    }
    if (paymentMatch && method === "DELETE") {
      const id = paymentMatch[1];
      const payment = payments.find((p) => p.id === id);
      if (!payment) return sendJson(res, 404, { errors: [{ code: "not_found", description: "payment not found" }] });
      payment.status = "DELETED";
      return sendJson(res, 200, { ...payment, deleted: true });
    }

    const pixMatch = pathname.match(/^\/v3\/payments\/([^/]+)\/pixQrCode$/);
    if (pixMatch && method === "GET") {
      return sendJson(res, 200, { success: true, encodedImage: "iVBORw0KGgo=", payload: "00020126580014br.gov.bcb.pix" });
    }
    const fieldMatch = pathname.match(/^\/v3\/payments\/([^/]+)\/identificationField$/);
    if (fieldMatch && method === "GET") {
      return sendJson(res, 200, { identificationField: "34191.79001 01043.510047 91020.150008 5 00000000000000" });
    }
    const refundMatch = pathname.match(/^\/v3\/payments\/([^/]+)\/refund$/);
    if (refundMatch && method === "POST") {
      const id = refundMatch[1];
      const payment = payments.find((p) => p.id === id);
      if (!payment) return sendJson(res, 404, { errors: [{ code: "not_found", description: "payment not found" }] });
      payment.status = "REFUNDED";
      return sendJson(res, 200, { ...payment, status: "REFUNDED" });
    }

    // POST /v3/webhooks
    if (method === "POST" && pathname === "/v3/webhooks") {
      return sendJson(res, 200, { id: nextId("hook_") });
    }

    return sendJson(res, 404, { errors: [{ code: "not_found", description: `no route ${method} ${pathname}` }] });
  });
  return {
    ...server,
    setPaymentStatus(id, status) {
      const payment = payments.find((p) => p.id === id);
      if (payment) payment.status = status;
    },
  };
}
