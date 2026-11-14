// B-SEC-LOG-SANITIZA (H3) — o tratador final de erro do Express. É a ÚLTIMA camada de `createApp` e de `createPortalApp`.
//
// Sem ele, o erro que escapa de uma rota cai no tratador padrão do Express, que responde com a stack em desenvolvimento e
// escreve a stack crua no stderr (`logerror`), com host e porta do banco quando o erro é de conexão.
//
// 1. loga `{ err, method, path }` com o logger da fábrica (o saneador limpa o erro);
// 2. com a resposta já começada, destrói o socket e NÃO chama `next(error)` (o `next` cairia no `logerror` do Express);
// 3. erro do `body-parser` (`http-errors` com `expose === true` e status 4xx: 400, 413, 415) responde o mesmo status,
//    com mensagem fixa;
// 4. qualquer outro erro responde 500 com mensagem fixa.
// Nunca devolve `error.message` nem stack, em `NODE_ENV` nenhum.
import type { Express, NextFunction, Request, Response } from "express";
import type { Logger } from "pino";

/** O status 4xx de um erro `http-errors` exposto (o do `body-parser`), ou `undefined` para qualquer outro erro. */
function exposedClientStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { expose?: unknown; status?: unknown; statusCode?: unknown };
  const status = typeof candidate.status === "number" ? candidate.status : candidate.statusCode;
  if (candidate.expose !== true || typeof status !== "number" || status < 400 || status >= 500) return undefined;
  return status;
}

function pathWithoutQuery(request: Request): string | undefined {
  const url = request.originalUrl ?? request.url;
  if (typeof url !== "string") return undefined;
  const queryAt = url.indexOf("?");
  return queryAt >= 0 ? url.slice(0, queryAt) : url;
}

export function installFinalErrorHandler(app: Express, logger: Pick<Logger, "error">): void {
  app.use(function finalErrorHandler(error: unknown, request: Request, response: Response, _next: NextFunction): void {
    const method = typeof request.method === "string" ? request.method : undefined;
    const path = pathWithoutQuery(request);
    logger.error({ err: error, method, path }, "unhandled route error");

    if (response.headersSent) {
      response.destroy();
      return;
    }

    const clientStatus = exposedClientStatus(error);
    if (clientStatus !== undefined) {
      response.status(clientStatus).json({
        error: { code: "BAD_REQUEST", reason: "invalid_request", message: "Invalid request." },
      });
      return;
    }

    response.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", reason: "unknown_error", message: "Unexpected error." },
    });
  });
}
