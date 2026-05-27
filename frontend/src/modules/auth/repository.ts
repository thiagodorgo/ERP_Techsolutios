import { mockSession } from "../../mocks/auth/context";
import type { AuthSession } from "./types";

export async function signInWithCognitoCompatibleProvider(email: string, password: string): Promise<AuthSession> {
  await new Promise((resolve) => window.setTimeout(resolve, 450));

  if (!email || !password) {
    throw new Error("Credenciais obrigatorias");
  }

  return mockSession;
}
