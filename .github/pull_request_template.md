<!--
Title: type(scope): summary   (types: feat, fix, chore, refactor, test, docs)
Write for a reviewer deciding whether to merge from this description
alone: plain sentences, no shorthand, no undefined abbreviations. The
reader did not watch the session that produced this change. Answer their
questions in order; do not walk the diff file by file.
For a trivial change, one sentence plus a risk note is enough — delete
the headings below.
Delete these comments before submitting.
-->

<!-- Lead sentence: the outcome in plain English. Fold "Closes #N" in. -->

## Issue

<!-- The problem or goal, stated plainly. -->

## Implementation

<!-- What changed, described by what a user can now do differently —
behaviour first. If a mechanism matters (a schema or RLS change, a data
migration, shared exercise library semantics), say why in the same
breath. -->

## Assumptions — worth checking

<!-- Things taken as true without confirming them, which this change may
be wrong if violated. Or "No material assumptions". -->
-

## Decisions — overrule if you disagree

<!-- Points where real alternatives existed and one was chosen: what and
why, so the reviewer can agree or overrule. -->
-

## Outcome

- **Verified.** <!-- Results, e.g. `npx tsc --noEmit — clean`,
  `npm run lint — clean`, plus the manual flow exercised. Distinguish
  "ran it" from "read it and it looks right"; name what was not verified
  if it matters. -->
- **Risk.** <!-- What could break, what is hard to reverse, what you are
  unsure of — schema or RLS changes, data migrations, shared exercise
  library semantics. Note anything that should be recorded in
  KNOWN_ISSUES.md. If none, "No significant risk" and one line why. -->
- **Decision:** <!-- The specific thing the reviewer must decide beyond
  "merge", or "none — straightforward approve". -->
