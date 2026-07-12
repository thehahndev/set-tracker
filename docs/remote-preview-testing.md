# Remote browser testing via Vercel preview deployments

How to let an agent (Claude) — or you, from a phone — drive browser tests against a
pull request's Vercel **preview** deployment. A preview URL is public HTTPS, so a
relayed/remote browser can reach it with no tunnel to run.

**Best for verifying a finished PR**, not a tight edit–test loop: every push triggers
a preview rebuild (roughly 1–2 minutes), so use the dev server for fast iteration and
previews for "does this PR actually work, tested from wherever I am."

## Why this is needed

When Claude Code runs in remote-control mode (e.g. steered from mobile), the browser
Claude drives is a *relayed* browser, not your local Chrome. It cannot reach
`localhost:3000`, so it needs an address that is routable from wherever that browser
runs. A Vercel preview URL satisfies that. (The other options are the dev server's LAN
IP on the same network, or a public tunnel such as Cloudflare Tunnel / ngrok.)

## One-time setup

### 1. Vercel — enable Protection Bypass for Automation

This is what lets a browser through the preview's "you must be logged into Vercel"
wall without disabling protection.

- Project → **Settings → Deployment Protection → Protection Bypass for Automation** →
  generate a secret.
- Keep the secret somewhere you can hand it over per session. Treat it like a bearer
  token: **do not commit it to the repo**, and regenerate/revoke it if it leaks.

### 2. Vercel — confirm Preview-scoped Supabase env vars

Missing Preview-environment variables are what make previews return 500 while the
build still succeeds. In **Settings → Environment Variables**, ensure these exist for
the **Preview** environment (not only Production), pointing at the **dev** Supabase
project (`msahweejzdmfblpjzxrt`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **publishable** `sb_publishable_…` key (never
  the secret key)
- `SUPABASE_SERVICE_ROLE_KEY` — the `sb_secret_…` key, with **no** `NEXT_PUBLIC_` prefix

See the "Vercel env var gotchas" section of [AGENTS.md](../AGENTS.md) for the full
rationale — these have bitten this project repeatedly.

### 3. Supabase — confirm the preview origin is allowed for magic-link redirects

The **magic-link** flow redirects to `<origin>/auth/callback`, which must be on the
Supabase redirect allow-list. This project already has a wildcard that covers it:

```
https://*-thehahndev.vercel.app/auth/callback
```

Supabase treats `.` and `/` as separators but **not** `-`, so the single `*` matches
the whole hyphenated preview subdomain — both the branch alias
(`set-tracker-git-<branch>-thehahndev`) and per-deployment
(`set-tracker-<hash>-thehahndev`) forms. **No change is normally needed** — just
confirm this entry still exists under **Authentication → URL Configuration → Redirect
URLs** (dev project).

Note: the code-based login flow (issue #25) uses `verifyOtp`, which sets the session
directly and does **not** use a redirect URL — so it needs no allow-list entry at all.

## Per-PR flow

1. Open the PR and wait for the **Vercel preview comment**. Prefer the **branch-alias**
   URL (e.g. `https://set-tracker-git-<branch>-thehahndev.vercel.app`) — it stays
   constant across redeploys, so a login cookie set once persists.
2. Clear the Vercel protection wall by navigating the browser **once** to:
   `https://<preview-host>/?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true`
   The secret bypasses protection; the companion parameter sets a cookie so the rest of
   the browsing session is bypassed too.
3. Sign into the app on that origin:
   - **Today (magic-link only):** complete one magic-link login in that browser. Because
     the branch-alias origin is stable, the Supabase session persists in the relayed
     browser's profile for later sessions.
   - **Once code-based login lands** (see issue #25): request sign-in, then read the
     6-digit code from your email to Claude, who types it — no email-link click needed.
4. Hand Claude the preview URL and let it drive the test.

## Caveats

- Previews read the **dev** Supabase data — the same data your local dev server uses —
  so local test sessions are visible on the preview too.
- The bypass secret is sensitive. Rotate it if exposed (Vercel supports regenerate /
  revoke).
- Alternative to the bypass secret: fully disabling Vercel Authentication on Preview.
  Simpler, but it makes previews publicly viewable (still behind Supabase login). The
  bypass secret is the tidier option.

## The real limiter

The preview approach cleanly solves **reachability** and the **Vercel gate**. The
remaining friction is **authenticating the app inside the relayed browser** — a
magic-link-only flow needs a link click in that specific browser. Adding code-based
login (issue #25) removes that, and then preview, LAN-IP, and tunnel testing all become
smooth.
