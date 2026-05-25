"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"

export default function ActiveWorkoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold">The workout screen crashed</h2>
      <p className="text-sm text-muted-foreground">
        Your logged sets are saved. Reload to continue your workout, or head back to the dashboard.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => reset()}>Reload workout</Button>
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
