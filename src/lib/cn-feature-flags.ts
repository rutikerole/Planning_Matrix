// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — runtime feature flags
//
// v1 ships one flag: an admin-email allowlist that gates the cost
// ticker on the right rail. The flag pattern is intentional — a real
// role check (admin column on profiles) is Phase 4 territory; until
// then, anything that should only be visible to Rutik or me-as-Rutik
// goes through ADMIN_EMAILS.
// ───────────────────────────────────────────────────────────────────────

// TODO(phase-4): replace with role check when admin role lands.
export const ADMIN_EMAILS: readonly string[] = [
  'erolerutik9@gmail.com', // Rutik — active dashboard account
  'vibecoders786@gmail.com', // Rutik — secondary working account
] as const

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lowered = email.toLowerCase()
  return ADMIN_EMAILS.some((e) => e === lowered)
}
