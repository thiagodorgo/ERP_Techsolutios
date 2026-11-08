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

function scenarioOfReq(req: IncomingMessage): string {
  return scenarioOf(req);
}

const PAYMENT_SCENARIO_STATUS: Readonly<Record<string, string>> = {
  validation_400: "PENDING",
};

export async function startAsaasFake(): Promise<FakeServer> {
  resetAsaasFakeState();
  return startFakeServer(async (req, res, body) => {
    const scenario = scenarioOfReq(req);
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
    if (scenario === "validation_400") {
      return sendJson(res, 400, { errors: [{ code: "invalid_value", description: "value must be greater than zero" }] });
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
      const data = payments.filter((p) => p.externalReference === externalReference);
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
}
