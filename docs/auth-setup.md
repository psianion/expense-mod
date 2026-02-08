# Auth setup

This app supports three **app modes** (see [app-modes.md](app-modes.md)). This doc covers configuring authentication for **PUBLIC** and **MASTER** modes.

## Supabase Auth

1. **Enable Auth in Supabase**
   - In Supabase Dashboard → **Authentication** → **Providers**, enable **Email** (for magic link) and **Google** if you want “Sign in with Google”.
   - **Google**: Turn the Google provider **ON**, then set:
     - **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/) (APIs & Services → Credentials → OAuth 2.0 Client ID, type “Web application”).
     - In Google Cloud Console, add this **Authorized redirect URI**: `https://<your-project-ref>.supabase.co/auth/v1/callback` (replace with your Supabase project URL host).
   - If you see `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` when clicking “Sign in with Google”, the Google provider is still disabled or not saved in Supabase → Authentication → Providers → Google (enable it and save).

2. **Service role key (optional but recommended)**
   - Used server-side for role lookups (`user_roles` → `roles`). Set `SUPABASE_SERVICE_ROLE_KEY` in `.env` (and in production env). Never expose it to the client.

3. **Database**
   - Run `sql/init.sql` first (creates auth-related tables and RLS).
   - Then run `sql/seed-auth.sql` to seed roles, permissions, role_permissions, and (for DEMO) the demo profile and user_roles.

## App behaviour

- **PUBLIC**: Users sign in at `/login` (magic link or Google). All data is scoped by `user_id`; RLS and repo layer enforce it.
- **MASTER**: Same login; the signed-in user is treated as “master” (full access; no RLS restriction in app logic for that user).
- **DEMO**: No login; a fixed demo user is used. Set `DEMO_USER_ID` (and optionally `DEMO_USER_EMAIL`). Seed script creates the demo user and sample data.

## Env reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_APP_MODE` | No | `DEMO` \| `PUBLIC` \| `MASTER` (default `PUBLIC`) |
| `SUPABASE_SERVICE_ROLE_KEY` | For role lookups | Server-only; used for `user_roles` / roles |
| `DEMO_USER_ID` | For DEMO mode | UUID of the demo user (from seed) |
| `DEMO_USER_EMAIL` | No | Display email for demo (default demo@expense-tracker.app) |

## Troubleshooting: "Invalid API key" (503 on /api/expenses, /api/analytics, etc.)

If `/api/auth/me` returns 200 but `/api/expenses`, `/api/analytics`, or `/api/bill-instances` return 503 with "Invalid Supabase API key", your `.env` Supabase keys are wrong or mismatched.

1. Open **Supabase Dashboard** → your project → **Settings** → **API**.
2. Copy **Project URL** into `NEXT_PUBLIC_SUPABASE_URL` in `.env`.
3. Under **Project API keys**, copy the **anon** **public** key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.  
   - Do **not** use the `service_role` key here (that goes in `SUPABASE_SERVICE_ROLE_KEY` only, and is optional for DEMO).
4. Ensure both values are from the **same** project, with no extra spaces or quotes.
5. Restart the dev server (`npm run dev`).

## Testing

- Unit and API tests use **DEMO** mode: `NEXT_PUBLIC_APP_MODE=DEMO` and `DEMO_USER_ID` set in test setup. No real Supabase auth is used; `getDemoUserContext()` provides the user.
- There are **no automated tests for Google login** (only `auth-me` for the session endpoint). Google sign-in is validated manually; E2E could be added against a test Supabase project with Google enabled.
