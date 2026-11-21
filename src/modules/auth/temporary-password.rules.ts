type TemporaryPasswordCredential = {
  readonly must_change_password: boolean;
  readonly password_updated_at: Date;
};

export const TEMPORARY_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

export function isTemporaryPasswordExpired(
  credential: TemporaryPasswordCredential,
  nowMs: number = Date.now(),
): boolean {
  if (!credential.must_change_password) {
    return false;
  }

  const passwordUpdatedAtMs = credential.password_updated_at.getTime();

  return nowMs - passwordUpdatedAtMs >= TEMPORARY_PASSWORD_TTL_MS;
}

