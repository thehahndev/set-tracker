"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "restTimerDuration"
const DEFAULT_DURATION = 90
export const REST_DURATION_PRESETS = [60, 90, 120, 180]

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const m = Math.floor(safe / 60)
  const s = (safe % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function readStoredDuration() {
  if (typeof window === "undefined") return DEFAULT_DURATION
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DURATION
}

// Tiny external store so the persisted default reads consistently across SSR
// and hydration (useSyncExternalStore) and updates every mounted timer in-tab.
const durationListeners = new Set<() => void>()

function subscribeDuration(callback: () => void) {
  durationListeners.add(callback)
  return () => durationListeners.delete(callback)
}

function writeStoredDuration(seconds: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(seconds))
  } catch {
    /* storage unavailable (private mode) — selection won't persist */
  }
  durationListeners.forEach((listener) => listener())
}

function fireCompletion() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    /* vibrate unsupported (e.g. iOS Safari) — silently ignore */
  }
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Rest complete", { body: "Time for your next set." })
    }
  } catch {
    /* Notification unsupported or blocked — silently ignore */
  }
}

export type RestTimerController = ReturnType<typeof useRestTimer>

/**
 * Client-only rest timer. The default duration is persisted in localStorage;
 * the running countdown is derived from an absolute end timestamp so it stays
 * accurate even if the tab is backgrounded and timers are throttled.
 */
export function useRestTimer() {
  const defaultDuration = useSyncExternalStore(
    subscribeDuration,
    readStoredDuration,
    () => DEFAULT_DURATION
  )
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(0)

  const setDefaultDuration = useCallback((seconds: number) => {
    writeStoredDuration(seconds)
  }, [])

  const start = useCallback(() => {
    const dur = readStoredDuration()
    setRemaining(dur)
    setEndsAt(Date.now() + dur * 1000)
  }, [])

  const addTime = useCallback((delta: number) => {
    setEndsAt((prev) => {
      const base = prev ?? Date.now()
      const min = Date.now() + 5000
      return Math.max(base + delta * 1000, min)
    })
  }, [])

  const dismiss = useCallback(() => {
    setEndsAt(null)
    setRemaining(0)
  }, [])

  useEffect(() => {
    if (endsAt === null) return
    let finished = false
    const tick = () => {
      if (finished) return
      const rem = Math.ceil((endsAt - Date.now()) / 1000)
      if (rem <= 0) {
        finished = true
        setRemaining(0)
        setEndsAt(null)
        fireCompletion()
      } else {
        setRemaining(rem)
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt])

  return {
    running: endsAt !== null,
    remaining,
    defaultDuration,
    setDefaultDuration,
    start,
    addTime,
    dismiss,
  }
}

export function RestTimer({ controller }: { controller: RestTimerController }) {
  const { running, remaining, defaultDuration, setDefaultDuration, addTime, dismiss } = controller

  if (running) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Rest</span>
        <span className="flex-1 text-center text-lg font-semibold tabular-nums">
          {formatTime(remaining)}
        </span>
        <Button size="sm" variant="ghost" className="px-2" onClick={() => addTime(-15)}>
          −15
        </Button>
        <Button size="sm" variant="ghost" className="px-2" onClick={() => addTime(15)}>
          +15
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss rest timer"
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Rest</span>
      <div className="flex flex-1 gap-1">
        {REST_DURATION_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setDefaultDuration(preset)}
            aria-pressed={preset === defaultDuration}
            className={cn(
              "flex-1 rounded-md border py-1 text-xs tabular-nums",
              preset === defaultDuration
                ? "border-primary font-medium text-foreground"
                : "border-input text-muted-foreground"
            )}
          >
            {preset}s
          </button>
        ))}
      </div>
    </div>
  )
}
