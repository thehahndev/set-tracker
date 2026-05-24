# Set Tracker

A mobile-first PWA for logging gym workouts. Track exercises, sets, weight, and reps. Save workout templates and review session history.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth — magic link OTP)
- Tailwind CSS v4, shadcn/ui (@base-ui/react)

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase project credentials.
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # lint
npx tsc --noEmit # type check
```

## Database

Migrations live in `supabase/migrations/`. Run them locally with the Supabase CLI, or push to production by merging to `main` (GitHub Actions handles deployment automatically).

## Deployment

Vercel. Preview deployments on all PRs; production on push to `main`.
