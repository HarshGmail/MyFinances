const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const VAULT_MAX_FREE_ATTEMPTS = 4;

const LOCKOUT_LADDER: Record<number, number> = {
  5: 30 * SECOND,
  6: 60 * SECOND,
  7: 5 * MINUTE,
  8: 15 * MINUTE,
  9: HOUR,
};

const MAX_LOCKOUT_MS = 24 * HOUR;

export function computeLockoutMs(failedAttempts: number): number {
  if (failedAttempts <= VAULT_MAX_FREE_ATTEMPTS) return 0;
  return LOCKOUT_LADDER[failedAttempts] ?? MAX_LOCKOUT_MS;
}
