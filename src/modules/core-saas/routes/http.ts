import type { Request, RequestHandler, Response } from "express";

import { createLogger } from "../../../infra/logging/logger.js";
import { classifyPublicError, publicText } from "../../../infra/logging/public-error.js";
import { CoreSaasError } from "../types/core-saas.types.js";

// B-SEC-LOG-SANITIZA (H1): infra caída responde 500 com mensagem fixa (decisão do dono de 13/11); erro de driver, de
// sistema ou de SDK que não é queda responde 400 com mensagem fixa; o erro fica no log, saneado pela fábrica.
const INFRA_DOWN_STATUS = 500;
const UNEXPECTED_ERROR_MESSAGE = "Unexpected error.";
const INVALID_REQUEST_MESSAGE = "Invalid request.";
const logger = createLogger();

type RouteHandler = (request: Request, response: Response) => void;
type AsyncRouteHandler = (request: Request, response: Response) => Promise<void>;

export function handleRoute(handler: RouteHandler): RequestHandler {
  return (request, response) => {
    try {
      handler(request, response);
    } catch (error) {
      sendRouteError(response, error);
    }
  };
}

export function handleAsyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      sendRouteError(response, error);
    }
  };
}

export function sendRouteError(response: Response, error: unknown): void {
  if (error instanceof CoreSaasError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        reason: error.reason,
        message: publicText(error.message, UNEXPECTED_ERROR_MESSAGE),
      },
    });
    return;
  }

  if (isRouteError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        reason: error.reason,
        message: publicText(error.message, UNEXPECTED_ERROR_MESSAGE),
      },
    });
    return;
  }

  const errorClass = classifyPublicError(error);
  const request = (response as { req?: Partial<Pick<Request, "method" | "originalUrl" | "url">> }).req;
  const url = request?.originalUrl ?? request?.url;
  const where = {
    ...(typeof request?.method === "string" ? { method: request.method } : {}),
    ...(typeof url === "string" ? { path: url.split("?")[0] } : {}),
  };

  if (errorClass === "infra_down") {
    logger.error({ err: error, ...where }, "route error: infrastructure down");
    response.status(INFRA_DOWN_STATUS).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        reason: "unknown_error",
        message: UNEXPECTED_ERROR_MESSAGE,
      },
    });
    return;
  }

  if (errorClass === "opaque") {
    logger.warn({ err: error, ...where }, "route error: driver, system or SDK error");
    response.status(400).json({
      error: {
        code: "BAD_REQUEST",
        reason: "invalid_request",
        message: INVALID_REQUEST_MESSAGE,
      },
    });
    return;
  }

  if (error instanceof Error) {
    response.status(400).json({
      error: {
        code: "BAD_REQUEST",
        reason: "invalid_request",
        message: publicText(error.message, INVALID_REQUEST_MESSAGE),
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      reason: "unknown_error",
      message: "Unexpected error.",
    },
  });
}

export function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function readRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRouteError(error: unknown): error is {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error &&
    "reason" in error &&
    "message" in error &&
    typeof error.statusCode === "number" &&
    typeof error.code === "string" &&
    typeof error.reason === "string" &&
    typeof error.message === "string"
  );
}
