"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updateExercise } from "@/lib/actions/exercises"

const CATEGORIES = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "calves", "core"]

type Props = {
  exercise: { id: string; name: string; category: string | null }
}

export function EditExerciseForm({ exercise }: Props) {
  const router = useRouter()
  const [name, setName] = useState(exercise.name)
  const [category, setCategory] = useState(exercise.category ?? "")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await updateExercise({
      id: exercise.id,
      name: name.trim(),
      category: category || null,
    })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    router.push(`/exercises/${exercise.id}`)
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <Link
          href={`/exercises/${exercise.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {exercise.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Edit Exercise</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  )
}
