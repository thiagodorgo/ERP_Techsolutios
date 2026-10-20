import { setStoredAuthSession } from "../../src/modules/auth/auth.storage";
import type { AuthSession } from "../../src/modules/auth/types";

export function setStoredSessionPermissions(
  session: AuthSession,
  permissions: readonly string[],
): void {
  setStoredAuthSession({
    ...session,
    user: {
      ...session.user,
      permissions: [...permissions],
    },
  });
}
