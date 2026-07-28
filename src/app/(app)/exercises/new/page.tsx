"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createExercise, getExercises } from "@/lib/actions/exercises"
import { CATEGORY_ORDER as CATEGORIES } from "@/lib/categories"

const LOAD_TYPES = [
  { value: "external", label: "Standard weight" },
  { value: "assisted", label: "Assisted (counterweight machine)" },
] as const

type LoadTypeValue = (typeof LOAD_TYPES)[number]["value"]

export default function NewExercisePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [loadType, setLoadType] = useState<LoadTypeValue>("external")
  const [loading, setLoading] = useState(false)
  // Existing library, loaded once, so the name field can warn before submit instead of
  // relying on the createExercise duplicate-name toast after a full round-trip.
  const [existing, setExisting] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    getExercises().then(({ data }) => {
      if (data) setExisting(data.map(({ id, name }) => ({ id, name })))
    })
  }, [])

  // Matching is case-insensitive to mirror the picker's inline-create guard. Note the DB
  // constraint is still case-sensitive (see issue #33), so this UI is intentionally the
  // stricter of the two until that migration lands.
  const trimmedName = name.trim()
  const lowerName = trimmedName.toLowerCase()
  const exactMatch = existing.find((e) => e.name.toLowerCase() === lowerName)
  const similar =
    !exactMatch && trimmedName.length >= 2
      ? existing.filter((e) => e.name.toLowerCase().includes(lowerName)).slice(0, 3)
      : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (exactMatch) return
    setLoading(true)

    const result = await createExercise({
      name: name.trim(),
      category: category || null,
      load_type: loadType,
    })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    router.push("/exercises")
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Exercises
        </Link>
        <h1 className="mt-1 text-xl font-semibold">New Exercise</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            placeholder="e.g. Cable Fly"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoCapitalize="words"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {exactMatch ? (
            <p className="text-xs text-destructive">
              “{exactMatch.name}” already exists.{" "}
              <Link href={`/exercises/${exactMatch.id}`} className="underline">
                View it
              </Link>
            </p>
          ) : similar.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Similar: {similar.map((e) => e.name).join(", ")}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Category{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Weight type</label>
          <select
            value={loadType}
            onChange={(e) => setLoadType(e.target.value as LoadTypeValue)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {LOAD_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>
                {lt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Choose Assisted for counterweight machines, where less weight means more
            strength.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading || !!exactMatch}>
          {loading ? "Saving…" : "Save Exercise"}
        </Button>
      </form>
    </div>
  )
}
