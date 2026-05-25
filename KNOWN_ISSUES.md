# Known deferred issues

These were flagged by an architecture audit (2026-05) and **consciously deferred** — they're not unknown bugs. Read this before "fixing" any pattern that looks like one of them; the deferral reasoning is usually load-bearing.

Three other items from the same audit (undo race, atomic finish+template, missing error boundaries) were fixed in commit `7749005`.

---

## 1. No re-fetch after initial load

**Where:** `src/app/(app)/workout/active/ActiveWorkout.tsx` — fully client-side after the page loads. No polling, no Supabase Realtime subscription, no `revalidatePath` on local mutations.

**Why deferred:** Solo-user app, one tab at a time. The "stale read" failure mode requires concurrent edits across devices, which doesn't happen in practice. Live sync would cost battery (polling) or significant complexity (Realtime) for no current user benefit.

**Revisit when:** Multi-device support, shared workouts, or coach-watches-athlete features are added.

---

## 2. N+1 exercise-history queries on page load

**Where:** `src/app/(app)/workout/active/page.tsx` — fetches the session, then calls `getExerciseHistory(exerciseId)` once per exercise.

**Why deferred:** The N calls run in parallel via `Promise.all`, so the wall-clock cost is one round-trip (~50–100ms), not N round-trips serialized. With Supabase + Vercel co-located in the same region this is negligible inside an already-Suspense-wrapped page. **This looks like a bug at first glance but isn't** — the parallelism makes it cheap.

**Revisit when:** Production telemetry shows the workout page feels slow on cellular, or sessions routinely have 15+ exercises. The fix is a Postgres RPC: `get_exercise_history(exercise_ids uuid[])` returning all history in one round-trip.

---

## 3. `display_order` managed by client

**Where:** `src/app/(app)/workout/active/ActiveWorkout.tsx` `handleAddExercise` computes `MAX(display_order) + 1` locally and passes it to `addExerciseToSession()`.

**Why deferred:** `UNIQUE(session_id, display_order)` on `session_exercises` catches collisions at the DB level. Single-user touch app — concurrent adds can't happen with one finger, and the picker modal closes after each selection. If a collision ever occurs, the user sees a "Couldn't add exercise" toast and retries — no data corruption.

**Revisit when:** A feature ships that fires concurrent inserts (e.g. "bulk-add from template", "import workout"), or telemetry shows users hitting the error toast.

---

## 4. ExercisePicker fetches the full library on every mount

**Where:** `src/app/(app)/workout/active/ExercisePicker.tsx` — calls `getExercises()` on every modal open, no caching.

**Why deferred:** Library is ~60 exercises (~few KB, single indexed `SELECT`). The modal already shows a skeleton during the fetch. Adding a cache introduces a staleness question (what happens when the user creates a new custom exercise mid-session) that isn't worth the complexity at current scale.

**Revisit when:** The library grows past ~500 exercises, or a feature has users opening the picker repeatedly during a single workout. Fix: pass `initialExercises` as a prop from the server page, or wrap in SWR with a long stale time.
