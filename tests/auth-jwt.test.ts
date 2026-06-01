import assert from "node:assert/strict";
import test from "node:test";

import {
  getAccessTokenExpiresInSeconds,
  signAccessToken,
  verifyAccessToken,
} from "../src/modules/auth/index.js";

const jwtTestOptions = {
  secret: "unit-test-jwt-secret",
  expiresIn: "15m",
};

test("signAccessToken returns a JWT string", async () => {
  const token = await signAccessToken(createTokenInput(), jwtTestOptions);

  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("verifyAccessToken validates a signed access token", async () => {
  const input = createTokenInput();
  const token = await signAccessToken(input, jwtTestOptions);
  const payload = await verifyAccessToken(token, {
    secret: jwtTestOptions.secret,
  });

  assert.equal(payload.sub, input.user_id);
  assert.equal(payload.tenant_id, input.tenant_id);
  assert.equal(payload.email, input.email);
  assert.deepEqual(payload.roles, input.roles);
  assert.equal(payload.type, "access");
  assert.equal(payload.iss, "erp-techsolutions");
  assert.equal(payload.aud, "erp-techsolutions-api");
});

test("verifyAccessToken rejects an invalid token", async () => {
  await assert.rejects(() =>
    verifyAccessToken("invalid.token.value", {
      secret: jwtTestOptions.secret,
    }),
  );
});

test("access token payload does not contain password_hash", async () => {
  const token = await signAccessToken(createTokenInput(), jwtTestOptions);
  const payload = await verifyAccessToken(token, {
    secret: jwtTestOptions.secret,
  });

  assert.equal("password_hash" in payload, false);
});

test("access token expiration follows JWT_EXPIRES_IN", async () => {
  const token = await signAccessToken(createTokenInput(), {
    secret: jwtTestOptions.secret,
    expiresIn: "900s",
  });
  const payload = await verifyAccessToken(token, {
    secret: jwtTestOptions.secret,
  });

  assert.equal(payload.exp - payload.iat, 900);
  assert.equal(getAccessTokenExpiresInSeconds("15m"), 900);
});

function createTokenInput() {
  return {
    user_id: "user-1",
    tenant_id: "tenant-1",
    email: "admin@example.com",
    roles: ["tenant_admin"],
  };
}
