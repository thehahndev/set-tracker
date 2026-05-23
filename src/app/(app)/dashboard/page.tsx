import { getActiveSession } from "@/lib/actions/workout"
import { DashboardCTAs } from "./DashboardCTAs"

export default async function DashboardPage() {
  const { data: activeSession } = await getActiveSession()

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardCTAs activeSessionId={activeSession?.id ?? null} />
      {/* Phase 12: Recent workout history feed */}
    </div>
  )
}
