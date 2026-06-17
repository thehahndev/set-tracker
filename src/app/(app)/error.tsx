"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred. You can try again or return to the dashboard.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => unstable_retry()}>Try again</Button>
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
