-- Harden handle_new_user(): remove its PostgREST RPC exposure.
--
-- Clears the security-advisor warnings "SECURITY DEFINER function executable by
-- anon / authenticated" on public.handle_new_user().
--
-- handle_new_user() is the SECURITY DEFINER trigger function behind the
-- on_auth_user_created trigger (it inserts the profiles row on signup). Functions
-- created in the public schema inherit a default EXECUTE grant to anon /
-- authenticated, which publishes this one at /rest/v1/rpc/handle_new_user. It
-- can't actually be abused there — Postgres refuses to call a `RETURNS trigger`
-- function as a plain RPC — but the grant is unnecessary surface, so revoke it.
--
-- This does NOT affect signup: a trigger executes its function as the table owner,
-- independent of EXECUTE privileges on that function. Revoking a grant that isn't
-- present is a no-op, so this is safe to apply to both dev and prod.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
