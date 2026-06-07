import { login } from "./auth.service";
import type { AuthSession } from "./types";

export function signInWithCognitoCompatibleProvider(
  email: string,
  password: string,
  tenantId = "",
): Promise<AuthSession> {
  return login({
    tenantId,
    email,
    password,
  });
}
