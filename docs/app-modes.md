# App modes

The app can run in three modes, controlled by `NEXT_PUBLIC_APP_MODE`.

## DEMO

- **Use case**: Tryout, kiosk, tests; no sign-in.
- **Behaviour**: A fixed user (from `DEMO_USER_ID`) is used for all requests. No login page; `AuthGuard` never redirects to `/login`.
- **Config**: Set `NEXT_PUBLIC_APP_MODE=DEMO` and `DEMO_USER_ID` to the UUID of the demo user (e.g. from `sql/seed-auth.sql`).

## PUBLIC

- **Use case**: Multi-tenant; each user sees only their data.
- **Behaviour**: Users must sign in (magic link or Google). Unauthenticated users are redirected to `/login`. Data is scoped by `user_id`; RLS and the service/repo layer enforce it.
- **Config**: Set `NEXT_PUBLIC_APP_MODE=PUBLIC` (or leave unset). Configure Supabase Auth and optional `SUPABASE_SERVICE_ROLE_KEY` for role lookups.

## MASTER

- **Use case**: Single user / admin; one account has full access.
- **Behaviour**: Same login as PUBLIC, but the signed-in user is treated as “master” and bypasses RLS restrictions in app logic (full access to all data).
- **Config**: Set `NEXT_PUBLIC_APP_MODE=MASTER`. Same Supabase and optional service role key as PUBLIC.

## Summary

| Mode   | Login required | Data scope   | Typical use   |
|--------|-----------------|-------------|---------------|
| DEMO   | No             | Fixed user  | Tryout, tests |
| PUBLIC | Yes             | Per user    | Multi-tenant   |
| MASTER | Yes             | Full access | Single admin  |
