// Canonical exercise-category list and ordering. The DB column is free text
// (nullable); these are the seeded values. Callers map null -> "other".
export const CATEGORY_ORDER = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "calves",
  "core",
]

// Known categories in CATEGORY_ORDER position, then unknowns alphabetically.
export function compareCategories(a: string, b: string): number {
  const ai = CATEGORY_ORDER.indexOf(a)
  const bi = CATEGORY_ORDER.indexOf(b)
  if (ai === -1 && bi === -1) return a.localeCompare(b)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}
