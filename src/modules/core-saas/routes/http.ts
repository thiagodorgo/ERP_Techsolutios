import type { Request, RequestHandler, Response } from "express";

import { CoreSaasError } from "../types/core-saas.types.js";

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
        message: error.message,
      },
    });
    return;
  }

  if (isRouteError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof Error) {
    response.status(400).json({
      error: {
        code: "BAD_REQUEST",
        reason: "invalid_request",
        message: error.message,
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
