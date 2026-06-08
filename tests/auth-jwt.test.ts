import assert from "node:assert/strict";
import test from "node:test";

import {
  getAccessTokenExpiresInSeconds,
  getRefreshTokenExpiresInSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
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

test("refresh token uses refresh payload and expiration", async () => {
  const token = await signRefreshToken(
    {
      session_id: "11111111-1111-4111-8111-111111111111",
      tenant_id: "22222222-2222-4222-8222-222222222222",
      user_id: "33333333-3333-4333-8333-333333333333",
    },
    {
      secret: "unit-test-refresh-secret",
      expiresIn: "7d",
    },
  );
  const payload = await verifyRefreshToken(token, {
    secret: "unit-test-refresh-secret",
  });

  assert.equal(payload.sub, "11111111-1111-4111-8111-111111111111");
  assert.equal(payload.session_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(payload.tenant_id, "22222222-2222-4222-8222-222222222222");
  assert.equal(payload.user_id, "33333333-3333-4333-8333-333333333333");
  assert.equal(payload.type, "refresh");
  assert.equal(payload.exp - payload.iat, 604800);
  assert.equal(getRefreshTokenExpiresInSeconds("7d"), 604800);
});

function createTokenInput() {
  return {
    user_id: "user-1",
    tenant_id: "tenant-1",
    email: "admin@example.com",
    roles: ["tenant_admin"],
  };
}
