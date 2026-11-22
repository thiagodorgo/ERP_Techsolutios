// B-APP-ORG-2S (Emenda 1.8.3 §2.2, P2 do dono) — a validade da senha PROVISÓRIA. Vale para toda
// provisória (criação e redefinição): 24 h contadas da hora em que a senha foi gravada
// (`password_updated_at`), conferida DEPOIS de a senha conferir, nos três lugares que provam senha
// (Entrar com organização, Entrar sem organização, `POST /auth/password`). Vencida, só uma nova
// redefinição devolve o acesso. Sem migração: a hora já está na credencial.

type TemporaryPasswordCredential = {
  readonly must_change_password: boolean;
  readonly password_updated_at: Date;
};

export const TEMPORARY_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

// Relógio injetável: os testes o adiantam (GP1, GP2). Produção usa a hora do processo.
export const temporaryPasswordClock = {
  now: (): Date => new Date(),
};

// Verdadeiro quando a marca de troca está ligada e a senha foi gravada há 24 h ou mais.
export function isTemporaryPasswordExpired(credential: TemporaryPasswordCredential): boolean {
  if (!credential.must_change_password) {
    return false;
  }

  return temporaryPasswordClock.now().getTime() - credential.password_updated_at.getTime() >= TEMPORARY_PASSWORD_TTL_MS;
}
