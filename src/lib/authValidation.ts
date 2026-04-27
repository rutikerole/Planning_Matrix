import { z } from 'zod'

/* ── Field schemas ───────────────────────────────────────────────────── */

export const emailSchema = z
  .string()
  .min(1, 'auth.errors.emailRequired')
  .email('auth.errors.emailInvalid')
  .max(254, 'auth.errors.emailTooLong')
  .transform((v) => v.trim().toLowerCase())

export const passwordSchema = z
  .string()
  .min(10, 'auth.errors.passwordTooShort')
  .max(128, 'auth.errors.passwordTooLong')

/** Same as password, with a soft strength signal — never blocks, just
 *  warns. We never enforce complex rules (frustrates users, doesn't
 *  meaningfully improve security per OWASP's modern guidance). */
export const newPasswordSchema = passwordSchema.refine(
  (v) => /[a-zA-Z]/.test(v) && /[0-9\W]/.test(v),
  { message: 'auth.errors.passwordWeak' },
)

/* ── Form schemas ────────────────────────────────────────────────────── */

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'auth.errors.nameRequired')
    .max(80, 'auth.errors.nameTooLong')
    .transform((v) => v.trim()),
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: 'auth.errors.termsRequired',
  }),
  /** Honeypot — if filled, the form silently drops on submit. Bots that
   *  scrape the page tend to fill every input; humans never see this one
   *  thanks to sr-only + aria-hidden + tabindex=-1 on the input itself. */
  website: z.string().max(0).optional().or(z.literal('')),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'auth.errors.passwordRequired'),
  rememberMe: z.boolean().optional(),
})

export type SignInInput = z.infer<typeof signInSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'auth.errors.passwordMismatch',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/* ── Safe-next redirect ──────────────────────────────────────────────── */

const NEXT_PATTERN = /^\/(?!\/)[a-zA-Z0-9\-/?=&_%.]*$/

/**
 * Whitelists `?next=` redirect targets to internal paths only — guards
 * against open-redirect attacks. Anything that smells external resolves
 * to /dashboard.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/dashboard'
  if (value.startsWith('//')) return '/dashboard'
  return NEXT_PATTERN.test(value) ? value : '/dashboard'
}

/* ── Password strength helper (for the meter) ────────────────────────── */

/** Returns 0 (empty) / 1 (weak) / 2 (fair) / 3 (strong). */
export function passwordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 10) score += 1
  if (/[a-zA-Z]/.test(pwd)) score += 1
  if (/[0-9\W]/.test(pwd)) score += 1
  return Math.min(score, 3) as 0 | 1 | 2 | 3
}
