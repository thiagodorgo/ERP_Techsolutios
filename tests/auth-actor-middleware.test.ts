import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { SignJWT } from "jose";

import {
  attachAuthenticatedActor,
  resolveRequestActor,
  signAccessToken,
} from "../src/modules/auth/index.js";

const jwtSecret = "dev-only-change-me";
const textEncoder = new TextEncoder();

test("attachAuthenticatedActor leaves request.actor absent without Authorization", async () => {
  await withActorApi(async (baseUrl) => {
    const response = await requestJson(baseUrl);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      data: {
        actorPresent: false,
        actor: null,
        resolvedActor: null,
      },
    });
  });
});

test("attachAuthenticatedActor rejects Authorization without Bearer", async () => {
  await withActorApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, {
      authorization: "Basic not-a-bearer-token",
    });

    assertInvalidTokenResponse(response, "not-a-bearer-token");
  });
});

test("attachAuthenticatedActor rejects invalid Bearer token", async () => {
  await withActorApi(async (baseUrl) => {
    const invalidToken = "invalid.token.value";
    const response = await requestJson(baseUrl, {
      authorization: `Bearer ${invalidToken}`,
    });

    assertInvalidTokenResponse(response, invalidToken);
  });
});

test("attachAuthenticatedActor rejects expired Bearer token", async () => {
  await withActorApi(async (baseUrl) => {
    const expiredToken = await signExpiredAccessToken();
    const response = await requestJson(baseUrl, {
      authorization: `Bearer ${expiredToken}`,
    });

    assertInvalidTokenResponse(response, expiredToken);
  });
});

test("attachAuthenticatedActor populates request.actor with a valid Bearer token", async () => {
  await withActorApi(async (baseUrl) => {
    const token = await signAccessToken({
      user_id: "user-1",
      tenant_id: "tenant-1",
      email: "admin@example.com",
      roles: ["tenant_admin", "viewer"],
    });
    const response = await requestJson(baseUrl, {
      authorization: `Bearer ${token}`,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      data: {
        actorPresent: true,
        actor: {
          userId: "user-1",
          tenantId: "tenant-1",
          email: "admin@example.com",
          roles: ["tenant_admin", "viewer"],
          authType: "jwt",
        },
        resolvedActor: {
          userId: "user-1",
          tenantId: "tenant-1",
          email: "admin@example.com",
          roles: ["tenant_admin", "viewer"],
          authType: "jwt",
        },
      },
    });

    assert.equal(JSON.stringify(response.body).includes(token), false);
  });
});

test("resolveRequestActor falls back to legacy headers when no JWT actor exists", async () => {
  await withActorApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, {
      "x-tenant-id": "tenant-legacy",
      "x-user-id": "user-legacy",
      "x-role": "tenant_admin,viewer",
      "x-permissions": "users.read,users.manage",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      data: {
        actorPresent: false,
        actor: null,
        resolvedActor: {
          userId: "user-legacy",
          tenantId: "tenant-legacy",
          roles: ["tenant_admin", "viewer"],
          permissions: ["users.read", "users.manage"],
          authType: "legacy_headers",
        },
      },
    });
  });
});

async function withActorApi(
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();

  app.get("/actor", attachAuthenticatedActor(), (request, response) => {
    response.status(200).json({
      data: {
        actorPresent: request.actor !== undefined,
        actor: request.actor ?? null,
        resolvedActor: resolveRequestActor(request),
      },
    });
  });

  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback(baseUrl);
  } finally {
    await closeServer(server);
  }
}

async function requestJson(baseUrl: string, headers: Record<string, string> = {}) {
  const response = await fetch(`${baseUrl}/actor`, {
    headers,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function assertInvalidTokenResponse(
  response: Awaited<ReturnType<typeof requestJson>>,
  tokenSnippet: string,
): void {
  assert.equal(response.status, 401);
  assert.deepEqual(response.body, {
    error: {
      code: "INVALID_TOKEN",
      message: "Invalid or expired access token.",
    },
  });
  assert.equal(JSON.stringify(response.body).includes(tokenSnippet), false);
  assert.equal(JSON.stringify(response.body).includes("JWT"), false);
}

async function signExpiredAccessToken(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000) - 120;

  return new SignJWT({
    tenant_id: "tenant-1",
    email: "admin@example.com",
    roles: ["tenant_admin"],
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("user-1")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 60)
    .setIssuer("erp-techsolutions")
    .setAudience("erp-techsolutions-api")
    .sign(textEncoder.encode(jwtSecret));
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
