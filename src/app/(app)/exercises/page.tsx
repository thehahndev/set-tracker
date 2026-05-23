import Link from "next/link"
import { Plus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { getExercises } from "@/lib/actions/exercises"
import { ExerciseList } from "./ExerciseList"

export default async function ExercisesPage() {
  const { data: exercises, error } = await getExercises()

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Exercises</h1>
        <Link href="/exercises/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" />
          Add
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <ExerciseList exercises={exercises ?? []} />
      )}
    </div>
  )
}
