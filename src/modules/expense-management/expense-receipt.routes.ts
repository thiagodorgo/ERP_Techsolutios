import Busboy from "busboy";
import type { Request, Response, Router } from "express";

import { requireAnyPermission, requirePermission, requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import {
  EXPENSE_RECEIPT_MAX_FILE_SIZE_BYTES,
  createDefaultExpenseReceiptService,
  type ExpenseReceiptActorContext,
  type ExpenseReceiptServiceResolver,
} from "./expense-receipt.service.js";
import { ExpenseManagementError } from "./expense-management.types.js";

/**
 * B-RDV-COMPROVANTE (§G.3) — rotas do comprovante de despesa. Molde: `mobile-evidence-upload.ts`
 * (multipart por Busboy, limite estourado = 413, campos obrigatórios = 400). O alvo (relatório e
 * item) vem da URL; a permissão de anexar é `expense_receipt:attach` (o `field_technician` ganha
 * SÓ aqui); leitura segue `expense_report:read` / `read_own`.
 */

export const EXPENSE_RECEIPT_ROUTE_PATH = "/expense-reports/:reportId/items/:itemId/receipt";

/** Contrato multipart, provado dos dois lados por `tests/b-rdv-comprovante-receipt-contract.test.ts` (RR5). */
export const EXPENSE_RECEIPT_MULTIPART_FIELDS = [
  "client_action_id",
  "sha256",
  "size_bytes",
  "content_type",
  "file",
] as const;

export const EXPENSE_RECEIPT_PERMISSIONS = {
  attach: "expense_receipt:attach",
  reportRead: "expense_report:read",
  reportReadOwn: "expense_report:read_own",
} as const;

type ParsedReceiptUpload = {
  readonly fields: Map<string, string>;
  readonly file: {
    readonly buffer: Buffer;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

class ReceiptRouteError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ReceiptRouteError";
  }
}

function routeError(statusCode: number, code: string, reason: string, message: string): ReceiptRouteError {
  return new ReceiptRouteError(statusCode, code, reason, message);
}

function parseMultipartReceiptUploadRequest(request: Request): Promise<ParsedReceiptUpload> {
  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    let file: ParsedReceiptUpload["file"] | undefined;
    let fileTooLarge = false;
    let settled = false;

    const fail = (error: ReceiptRouteError): void => {
      if (settled) return;
      settled = true;
      request.unpipe(busboy);
      reject(error);
    };

    const busboy = Busboy({
      headers: request.headers,
      limits: {
        files: 1,
        fields: 16,
        fieldSize: 1024,
        fileSize: EXPENSE_RECEIPT_MAX_FILE_SIZE_BYTES,
      },
    });

    busboy.on("field", (name, value) => {
      fields.set(name, value);
    });

    busboy.on("file", (_name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on("limit", () => {
        fileTooLarge = true;
        stream.resume();
      });
      stream.on("data", (chunk: Buffer) => {
        if (!fileTooLarge) chunks.push(chunk);
      });
      stream.on("end", () => {
        if (fileTooLarge) return;
        const buffer = Buffer.concat(chunks);
        file = { buffer, mimeType: info.mimeType, sizeBytes: buffer.length };
      });
    });

    busboy.on("error", () => {
      fail(routeError(400, "BAD_REQUEST", "invalid_multipart", "Multipart payload could not be parsed."));
    });

    busboy.on("finish", () => {
      if (settled) return;
      if (fileTooLarge) {
        fail(routeError(413, "PAYLOAD_TOO_LARGE", "file_too_large", "Receipt file exceeds the maximum allowed size."));
        return;
      }
      if (!file) {
        fail(routeError(400, "BAD_REQUEST", "missing_file", "Multipart field 'file' is required."));
        return;
      }
      settled = true;
      resolve({ fields, file });
    });

    request.pipe(busboy);
  });
}

function requiredField(fields: Map<string, string>, name: string): string {
  const value = fields.get(name)?.trim();
  if (!value) throw routeError(400, "BAD_REQUEST", `missing_${name}`, `Multipart field '${name}' is required.`);
  return value;
}

function parsePositiveInteger(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw routeError(400, "BAD_REQUEST", `invalid_${field}`, `Multipart field '${field}' must be a positive integer.`);
  }
  return parsed;
}

function actorFromRequest(request: Request): ExpenseReceiptActorContext {
  const tenantContext = requireTenantContext(request);
  if (!tenantContext.userId) {
    throw routeError(401, "UNAUTHORIZED", "missing_actor", "Authenticated actor is required.");
  }
  return {
    tenantId: tenantContext.tenantId,
    userId: tenantContext.userId,
    roles: tenantContext.roles ?? [],
    permissions: tenantContext.permissions ?? [],
  };
}

function sendRouteFailure(response: Response, error: unknown): void {
  if (error instanceof ReceiptRouteError || error instanceof ExpenseManagementError) {
    response.status(error.statusCode).json({
      error: { code: error.code, reason: error.reason, message: error.message },
    });
    return;
  }
  throw error;
}

export function registerExpenseReceiptRoutes(
  router: Router,
  resolveService: ExpenseReceiptServiceResolver = createDefaultExpenseReceiptService,
): void {
  router.post(
    EXPENSE_RECEIPT_ROUTE_PATH,
    requirePermission(EXPENSE_RECEIPT_PERMISSIONS.attach),
    handleAsyncRoute(async (request, response) => {
      try {
        const actor = actorFromRequest(request);
        if (request.is("multipart/form-data") !== "multipart/form-data") {
          throw routeError(400, "BAD_REQUEST", "invalid_content_type", "Request must be multipart/form-data.");
        }
        const parsed = await parseMultipartReceiptUploadRequest(request);
        const service = await resolveService();
        const result = await service.attachReceipt(actor, {
          reportId: request.params.reportId as string,
          itemId: request.params.itemId as string,
          clientActionId: requiredField(parsed.fields, "client_action_id"),
          buffer: parsed.file.buffer,
          declaredSha256: requiredField(parsed.fields, "sha256").toLowerCase(),
          declaredSizeBytes: parsePositiveInteger(requiredField(parsed.fields, "size_bytes"), "size_bytes"),
          declaredContentType: parsed.fields.get("content_type")?.trim() || parsed.file.mimeType,
        });
        response.status(result.statusCode).json({
          data: { receiptId: result.receiptId, uploadStatus: result.uploadStatus },
        });
      } catch (error) {
        sendRouteFailure(response, error);
      }
    }),
  );

  router.get(
    EXPENSE_RECEIPT_ROUTE_PATH,
    requireAnyPermission([
      EXPENSE_RECEIPT_PERMISSIONS.reportRead,
      EXPENSE_RECEIPT_PERMISSIONS.reportReadOwn,
    ]),
    handleAsyncRoute(async (request, response) => {
      try {
        const actor = actorFromRequest(request);
        const service = await resolveService();
        const details = await service.getReceipt(actor, {
          reportId: request.params.reportId as string,
          itemId: request.params.itemId as string,
        });
        response.status(200).json({
          data: {
            receiptId: details.receiptId,
            uploadStatus: details.uploadStatus,
            mimeType: details.mimeType,
            downloadUrl: details.downloadUrl,
          },
        });
      } catch (error) {
        sendRouteFailure(response, error);
      }
    }),
  );

  router.get(
    `${EXPENSE_RECEIPT_ROUTE_PATH}/file`,
    requireAnyPermission([
      EXPENSE_RECEIPT_PERMISSIONS.reportRead,
      EXPENSE_RECEIPT_PERMISSIONS.reportReadOwn,
    ]),
    handleAsyncRoute(async (request, response) => {
      try {
        const actor = actorFromRequest(request);
        const service = await resolveService();
        const served = await service.serveReceiptFile(actor, {
          reportId: request.params.reportId as string,
          itemId: request.params.itemId as string,
        });
        response
          .status(200)
          .setHeader("content-type", served.mimeType)
          .setHeader("content-disposition", "attachment")
          .setHeader("x-content-type-options", "nosniff")
          .send(served.buffer);
      } catch (error) {
        sendRouteFailure(response, error);
      }
    }),
  );
}
