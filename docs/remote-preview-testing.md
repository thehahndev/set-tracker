# Remote browser testing via Vercel preview deployments

How to let an agent (Claude) — or you, from a phone — drive browser tests against a
pull request's Vercel **preview** deployment. A preview URL is public HTTPS, so a
relayed/remote browser can reach it with no tunnel to run.

**Best for verifying a finished PR**, not a tight edit–test loop: every push triggers
a preview rebuild (roughly 1–2 minutes), so use the dev server for fast iteration and
previews for "does this PR actually work, tested from wherever I am."

> **Verified end-to-end (2026-07).** A remote-control session drove a full test this
> way: it cleared the Vercel gate, signed into the app with a magic link, seeded richer
> data, and exercised a feature on the preview. The concrete steps and gotchas that made
> it work — especially the login sequence and the relayed-browser quirks — are folded
> into the sections below.

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
   - **The bypass cookie can persist across sessions.** In the 2026-07 run the preview
     loaded straight to the app with no Vercel wall, because the relayed browser still
     carried the cookie from earlier. So try navigating to the preview first; only run
     the bypass URL if you actually hit the "log in to Vercel" wall.
3. Sign into the app using the magic-link paste method in
   [Signing in with a magic link](#signing-in-with-a-magic-link-the-method-that-works)
   below. (Once code-based login lands — issue #25 — this becomes a 6-digit code you read
   to Claude instead, with no link handling.)
4. Hand Claude the preview URL and let it drive the test.

## Signing in with a magic link (the method that works)

The app only supports magic-link login, and a magic link must be opened in the **same
browser that requested it** — which is the relayed browser Claude drives, not the
browser on your phone or laptop where your inbox is. That constraint is what makes this
fiddly, and it is why the sequence below is specific:

1. Claude opens the preview's `/login`, types your email, and clicks **Send sign-in
   link**. This step is load-bearing: sending the link from the relayed browser is what
   stores the PKCE `code_verifier` cookie in that browser. The page then shows "Check
   your email — a sign-in link is on its way."
2. Open that email yourself and **copy the full sign-in link — do not click it.**
   Clicking it in your own browser consumes the one-time token (and pairs it with the
   wrong verifier), which breaks the flow. The link is a Supabase verify URL shaped like:
   ```
   https://<project>.supabase.co/auth/v1/verify?token=pkce_…&type=magiclink&redirect_to=https://<preview-host>/auth/callback
   ```
3. Paste that URL to Claude. Claude navigates the relayed browser to it; Supabase
   verifies the token and redirects through `/auth/callback`, establishing the session.
4. The callback may briefly show `/login` again — that is a transient render, **not** a
   failure. Confirm by navigating to `/dashboard`; if the app loads, you are signed in.

Because the branch-alias origin is stable, the session cookie then persists in the
relayed browser for the rest of the test and often into later sessions.

## Browser automation quirks (relayed browser)

The relayed browser is less predictable than local Chrome. What the 2026-07 run hit,
and the workarounds:

- **The first interaction after a navigation is sometimes dropped** — a click into a
  search box, or on a list row, silently no-ops. Simply repeat it; the second attempt
  registers. (Typing into a search field showed this repeatedly.)
- **Screenshots occasionally time out** with "renderer may be frozen or unresponsive."
  Retry the screenshot; it recovers without a reload.
- **Prefer navigating by URL over tapping the bottom nav.** A direct `navigate` to
  `/exercises`, `/dashboard`, etc. is more reliable than clicking the nav bar, which
  intermittently does nothing.
- **The Vercel Toolbar can pop open** if a click lands near its launcher in the
  bottom-right corner. It is harmless — click away to dismiss — but it can cover page
  content and throw off the next click's coordinates.

## Getting richer data to test against

A fresh dev database has too little history to exercise most screens. To populate a
realistic set of workouts (progression, PRs, and one exercise with mixed weighted and
bodyweight sets), run the dev-only seed:

```
npx supabase db query --db-url "$SUPABASE_DB_URL" --file supabase/seeds/dev-workouts.sql
```

It is idempotent (re-running replaces its own rows, never touches real data) and targets
whatever `SUPABASE_DB_URL` points at, which is the dev project. See the file's header for
details. Previews read the dev database, so seeded data shows up on the preview too.

## Caveats

- Previews read the **dev** Supabase data — the same data your local dev server uses —
  so local test sessions are visible on the preview too.
- The bypass secret is sensitive. Rotate it if exposed (Vercel supports regenerate /
  revoke).
- Alternative to the bypass secret: fully disabling Vercel Authentication on Preview.
  Simpler, but it makes previews publicly viewable (still behind Supabase login). The
  bypass secret is the tidier option.

## The remaining friction

The preview approach cleanly solves **reachability** and the **Vercel gate**, and the
magic-link paste method above makes **app login** work reliably. The one rough edge left
is that login is not hands-off: you have to copy the sign-in URL from your email and
paste it to Claude for each fresh session. Adding code-based login (issue #25) would
remove even that — request sign-in, read the 6-digit code to Claude — and then preview,
LAN-IP, and tunnel testing all become smooth.
