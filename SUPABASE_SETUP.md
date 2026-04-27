# Supabase setup — one-time configuration

This document walks you (Rutik) through every manual step needed to wire Planning Matrix's authentication to a Supabase project. **Total time: ~20 minutes.** No coding involved on this end — copy/paste only.

When you're done, the auth pages I'm shipping in commits 2–13 will sign people up, send confirmation emails in their chosen locale, persist sessions, and protect routes.

---

## What you'll have at the end

- A Supabase project with email + password auth, email confirmations required, password-reset flow live.
- A `public.profiles` table that auto-populates whenever someone signs up.
- DE + EN email templates (confirm signup + reset password) that switch on the user's preferred locale.
- Local dev environment that authenticates against the Supabase project.
- Vercel production + preview environments that authenticate against the same project.

---

## Step 1 — Create the Supabase project

1. Go to <https://supabase.com> and sign in (or sign up — free tier is fine).
2. Click **New project**.
3. Fill in:
   - **Name:** `planning-matrix` (or whatever you prefer; only visible to you).
   - **Database password:** generate a strong one and save it in your password manager. We won't need it day-to-day, but you'll need it if you ever touch the Postgres console directly.
   - **Region:** **Frankfurt (eu-central-1)** if available — that's the closest option to our German user base. If only `Europe (West)` is available, that's also fine.
   - **Pricing plan:** Free.
4. Click **Create new project**. Provisioning takes ~2 minutes.

---

## Step 2 — Get the API credentials

Once provisioning is done:

1. Open the project, then **Project Settings → API** (in the left sidebar, near the bottom).
2. Copy these two values — you'll need them in Step 6:

   | Field | What to copy | Goes into env var |
   |---|---|---|
   | **Project URL** | the `https://….supabase.co` URL | `VITE_SUPABASE_URL` |
   | **Project API Keys → `anon` `public`** | the long `eyJ…` JWT-style string | `VITE_SUPABASE_ANON_KEY` |

   ⚠️ **Do not copy the `service_role` key.** That key bypasses Row Level Security and must never appear in client code or env vars. We only ever use the `anon` key in this project.

---

## Step 3 — Apply the database migration

1. Open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase/migrations/0001_profiles.sql` from this repo.
4. Copy its **entire** contents and paste into the Supabase SQL editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. You should see a success message at the bottom.

To verify it worked: go to **Table Editor** in the sidebar. You should see a `profiles` table under the `public` schema with the columns `id`, `email`, `full_name`, `locale`, `role`, `created_at`, `updated_at`.

---

## Step 4 — Configure auth dashboard settings

Open **Authentication** in the sidebar. Make these changes across the auth sub-pages:

### 4a. Authentication → Sign In / Up → Auth Providers → Email

- **Enable Email provider:** ON
- **Confirm email:** **ON** (required — users cannot sign in until they click the confirmation link)
- **Secure email change:** ON
- **Secure password change:** ON
- **Minimum password length:** `10`

Click **Save** on this section.

### 4b. Authentication → URL Configuration

- **Site URL:** `https://planning-matrix.vercel.app`
- **Redirect URLs (allow list):** add each of these as a separate entry:
  - `https://planning-matrix.vercel.app/verify-email`
  - `https://planning-matrix.vercel.app/reset-password`
  - `http://localhost:5173/verify-email`
  - `http://localhost:5173/reset-password`

Click **Save**.

### 4c. Authentication → Rate Limits (informational)

Leave defaults. **Note:** the free tier caps outgoing emails at **2 per hour**, and failed signups also burn quota. You will hit this in dev. We accept this for v1; production-quality email (custom SMTP via Resend / Postmark / SES) is a Phase 3 task.

---

## Step 5 — Set up email templates

Open **Authentication → Emails → Email Templates** in the sidebar.

There are several templates. We need to customise two:

- **Confirm signup**
- **Reset Password**

For each one, paste the corresponding **Subject** and **Body** below. Both subjects and bodies use Go-template conditionals on `.Data.locale` so the user gets DE or EN automatically based on what they selected at signup.

> ℹ️ Supabase ships sensible defaults for the other templates (Magic Link, Change Email, Invite). We don't use those flows yet, so leave them alone.

### 5a. Confirm signup template

**Subject:**

```
{{ if eq .Data.locale "de" }}Planning Matrix · Bitte bestätigen Sie Ihre E-Mail-Adresse{{ else }}Planning Matrix · Confirm your email address{{ end }}
```

**Body (paste into the HTML editor — switch to "Source" mode in the dashboard if it offers WYSIWYG):**

```html
{{ if eq .Data.locale "de" }}
<!doctype html>
<html lang="de">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 32px auto; padding: 0 24px; color: #181b23; line-height: 1.65;">
    <div style="border-bottom: 1px solid rgba(122,82,50,0.18); padding-bottom: 14px; margin-bottom: 28px;">
      <span style="font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-style: italic; color: #181b23;">Planning Matrix</span>
    </div>
    <p style="margin: 0 0 16px;">Guten Tag,</p>
    <p style="margin: 0 0 16px;">willkommen bei Planning Matrix. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.</p>
    <p style="margin: 28px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #181b23; color: #f8f4ed; text-decoration: none; padding: 12px 22px; border-radius: 5px; font-weight: 500; font-size: 14px; letter-spacing: -0.005em;">Konto bestätigen</a>
    </p>
    <p style="font-size: 13px; color: #5a5e6b; margin: 0 0 16px;">Wenn Sie sich nicht bei Planning Matrix registriert haben, können Sie diese E-Mail ignorieren.</p>
    <p style="font-size: 13px; color: #7a5232; margin: 32px 0 0; padding-top: 16px; border-top: 1px solid rgba(220,220,210,0.55);">— Planning Matrix</p>
  </body>
</html>
{{ else }}
<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 32px auto; padding: 0 24px; color: #181b23; line-height: 1.65;">
    <div style="border-bottom: 1px solid rgba(122,82,50,0.18); padding-bottom: 14px; margin-bottom: 28px;">
      <span style="font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-style: italic; color: #181b23;">Planning Matrix</span>
    </div>
    <p style="margin: 0 0 16px;">Hello,</p>
    <p style="margin: 0 0 16px;">welcome to Planning Matrix. Please confirm your email address to activate your account.</p>
    <p style="margin: 28px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #181b23; color: #f8f4ed; text-decoration: none; padding: 12px 22px; border-radius: 5px; font-weight: 500; font-size: 14px; letter-spacing: -0.005em;">Confirm account</a>
    </p>
    <p style="font-size: 13px; color: #5a5e6b; margin: 0 0 16px;">If you didn't sign up for Planning Matrix, you can safely ignore this email.</p>
    <p style="font-size: 13px; color: #7a5232; margin: 32px 0 0; padding-top: 16px; border-top: 1px solid rgba(220,220,210,0.55);">— Planning Matrix</p>
  </body>
</html>
{{ end }}
```

Click **Save** on the Confirm signup template.

### 5b. Reset Password template

**Subject:**

```
{{ if eq .Data.locale "de" }}Planning Matrix · Passwort zurücksetzen{{ else }}Planning Matrix · Reset your password{{ end }}
```

**Body:**

```html
{{ if eq .Data.locale "de" }}
<!doctype html>
<html lang="de">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 32px auto; padding: 0 24px; color: #181b23; line-height: 1.65;">
    <div style="border-bottom: 1px solid rgba(122,82,50,0.18); padding-bottom: 14px; margin-bottom: 28px;">
      <span style="font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-style: italic; color: #181b23;">Planning Matrix</span>
    </div>
    <p style="margin: 0 0 16px;">Guten Tag,</p>
    <p style="margin: 0 0 16px;">Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen.</p>
    <p style="margin: 28px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #181b23; color: #f8f4ed; text-decoration: none; padding: 12px 22px; border-radius: 5px; font-weight: 500; font-size: 14px; letter-spacing: -0.005em;">Neues Passwort festlegen</a>
    </p>
    <p style="font-size: 13px; color: #5a5e6b; margin: 0 0 16px;">Der Link ist 1 Stunde gültig. Wenn Sie diese Anforderung nicht gestellt haben, ignorieren Sie diese E-Mail — Ihr Passwort bleibt unverändert.</p>
    <p style="font-size: 13px; color: #7a5232; margin: 32px 0 0; padding-top: 16px; border-top: 1px solid rgba(220,220,210,0.55);">— Planning Matrix</p>
  </body>
</html>
{{ else }}
<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 32px auto; padding: 0 24px; color: #181b23; line-height: 1.65;">
    <div style="border-bottom: 1px solid rgba(122,82,50,0.18); padding-bottom: 14px; margin-bottom: 28px;">
      <span style="font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-style: italic; color: #181b23;">Planning Matrix</span>
    </div>
    <p style="margin: 0 0 16px;">Hello,</p>
    <p style="margin: 0 0 16px;">you've requested to reset your password. Click the link below to set a new one.</p>
    <p style="margin: 28px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #181b23; color: #f8f4ed; text-decoration: none; padding: 12px 22px; border-radius: 5px; font-weight: 500; font-size: 14px; letter-spacing: -0.005em;">Set new password</a>
    </p>
    <p style="font-size: 13px; color: #5a5e6b; margin: 0 0 16px;">The link is valid for 1 hour. If you didn't request this, you can safely ignore this email — your password remains unchanged.</p>
    <p style="font-size: 13px; color: #7a5232; margin: 32px 0 0; padding-top: 16px; border-top: 1px solid rgba(220,220,210,0.55);">— Planning Matrix</p>
  </body>
</html>
{{ end }}
```

Click **Save** on the Reset Password template.

### 5c. A note on the "From" sender identity

Until Phase 3 (custom SMTP), the "From" header on every email Supabase sends will be the platform default — typically `noreply@mail.app.supabase.io` or similar. This is **fine for v1 development and pilot users** but is visibly **not Planning Matrix**, so test recipients shouldn't be surprised when the email arrives from a `supabase.io` address.

Phase 3 will swap this out via custom SMTP (Resend / Postmark / AWS SES — Resend has a co-published guide with Supabase). At that point the From line becomes `Planning Matrix <noreply@planning-matrix.app>` or whichever sender-domain we provision. Until then: `supabase.io` is what testers will see, and that's expected.

---

## Step 6 — Add environment variables

### 6a. Local development (your machine)

In the repo root:

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and replace the two placeholder values with the real ones from Step 2:

   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-real-key
   ```

3. Save. `.env.local` is already gitignored, so you won't accidentally commit it.

4. Restart `npm run dev` if it's running (Vite picks up env changes only on restart).

### 6b. Vercel production + preview

1. Open the Planning Matrix project on Vercel: <https://vercel.com/dashboard>.
2. Go to **Settings → Environment Variables**.
3. Add **two variables**, each ticking both **Production** and **Preview** environments (and Development if you also use `vercel dev`):

   | Key | Value | Environments |
   |---|---|---|
   | `VITE_SUPABASE_URL` | the URL from Step 2 | Production, Preview |
   | `VITE_SUPABASE_ANON_KEY` | the anon key from Step 2 | Production, Preview |

4. Save. Vercel applies env vars on the **next** deployment — trigger a redeploy of `main` for them to take effect (or just push the next commit).

---

## Step 7 — Verify

When commits 2–13 land and Vercel redeploys, you should be able to:

- [ ] Visit <https://planning-matrix.vercel.app/sign-up>, fill in the form, submit.
- [ ] Receive a confirmation email at the address you used (check spam folder if needed). Subject should start with **"Planning Matrix · Bitte bestätigen Sie…"** if your browser was on DE, **"Confirm your email address"** if on EN.
- [ ] Click the link in the email. Land on `/verify-email`. After ~1 second, redirect to `/dashboard`. The dashboard placeholder shows "Willkommen — Phase 2.5 folgt."
- [ ] Visit your Supabase dashboard → **Authentication → Users**. You see your test user. Status: confirmed.
- [ ] In **Table Editor → profiles**, you see a row with your `full_name`, `locale`, `role: 'client'`.
- [ ] Sign out, sign in again — should land on `/dashboard` directly without re-verification.

If any of those fail, jump to the **Troubleshooting** section below.

---

## Troubleshooting

### "I never receive the confirmation email"

1. Check spam / promotions folder.
2. Check **Authentication → Logs** in the Supabase dashboard. The email send is logged there, including any error.
3. Most common cause: **free-tier 2-emails-per-hour rate limit** has been hit. Wait an hour, or temporarily raise it in **Authentication → Rate Limits → Email send rate** (free tier has a hard cap of 30/hour but defaults to 2).
4. For real production use, switch to a custom SMTP (Resend, Postmark, AWS SES) — that's a Phase 3 task.

### "Confirmation link goes to /verify-email and shows error"

- The redirect URL must be in the allow list (Step 4b). If not, the link still arrives but the client refuses the exchange.
- Open the URL in the same browser you signed up from. The PKCE auth code is bound to that browser session for ~5 minutes; opening on a different device will fail with "Bitte öffnen Sie diesen Link auf dem Gerät, auf dem Sie sich registriert haben."
- The link expires after 24 hours by default. If older, the user needs to request a new one (the auth UI handles this).

### "Sign-in says 'E-Mail-Adresse noch nicht bestätigt' but I confirmed"

- Sometimes browser autofill on the sign-in page submits before the cookie from the verification flow is set. Open `/dashboard` directly — if it loads, you're confirmed; just sign in again.

### "Vercel deploy works but auth doesn't authenticate"

- Did you redeploy after adding env vars? Vercel needs a fresh deployment to pick them up. Push any commit to `main` or click **Redeploy** in the Vercel dashboard.
- Check the deployed app's console: a missing-env error throws on first import of `src/lib/supabase.ts`.

### "Tests in dev burn through the email rate limit fast"

- Use the same email address repeatedly during development (no quota cost on already-confirmed users). Or use Supabase's `Resend` button sparingly.
- For multi-account testing, use Gmail's `+` aliasing: `you+test1@gmail.com`, `you+test2@gmail.com` etc. all route to your inbox.

### "I want to delete a test user"

- **Authentication → Users → ⋮ → Delete user.** Cascades to `public.profiles` automatically (foreign key with `on delete cascade`).

---

## A note on the rate limit

The Supabase free tier limits email sends to **2 per hour per project**, including failed signups (which still trigger an email send). This is restrictive for active development. Three pragmatic strategies:

1. **Reuse confirmed test accounts.** Sign-in does not consume email quota; only signup, resend-confirmation, and password-reset do.
2. **Bump the dashboard limit during dev sessions.** Authentication → Rate Limits → Email send rate. Free tier maxes out at 30/hour; that's enough for a debugging burst.
3. **Plan for Phase 3 SMTP migration.** Custom SMTP (Resend recommended — they have a guide co-published with Supabase) lifts the cap to whatever your sender allows. Until then, plan dev sessions accordingly.

---

## Done?

When all seven steps are complete and the Step 7 verification list passes, ping me and I'll run the manual test plan against the live URL.

If anything in this doc is ambiguous or doesn't match what you see in the Supabase dashboard, **stop and tell me which step**. I'd rather rewrite a confusing paragraph than ship code that won't authenticate.
