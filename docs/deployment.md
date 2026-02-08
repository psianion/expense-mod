# Deployment

## Environment variables

Set these in your hosting platform (e.g. Vercel):

- **Required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **App mode**: `NEXT_PUBLIC_APP_MODE` = `DEMO` | `PUBLIC` | `MASTER`
- **Auth (PUBLIC/MASTER)**: Optional `SUPABASE_SERVICE_ROLE_KEY` for role lookups
- **DEMO mode**: `DEMO_USER_ID` (and optionally `DEMO_USER_EMAIL`)
- **AI**: `OPENROUTER_API_KEY` for expense parsing
- **Cron**: `CRON_SECRET` for `/api/cron/bills` (e.g. Vercel Cron with header `x-cron-secret`)

## Database

1. Run `sql/init.sql` in the Supabase SQL Editor.
2. For auth/roles (and DEMO user): run `sql/seed-auth.sql`.

## Vercel

1. Connect the repo and set env vars above.
2. Optional: add a Cron job for bill generation:
   - Path: `/api/cron/bills`
   - Schedule: e.g. `0 5 * * *` (daily 05:00 UTC)
   - Header: `x-cron-secret: <CRON_SECRET>`

## Security

- Never commit `.env` or real keys.
- Use `SUPABASE_SERVICE_ROLE_KEY` only on the server; it must not be exposed to the client.
- In PUBLIC/MASTER, ensure Supabase Auth and RLS are configured as in [auth-setup.md](auth-setup.md).
