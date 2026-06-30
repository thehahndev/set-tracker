import { notFound } from "next/navigation"
import { getSessionDetail } from "@/lib/actions/workout"
import { createClient } from "@/lib/supabase/server"
import { EditableSessionDetail } from "./EditableSessionDetail"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ data: session }, supabase] = await Promise.all([getSessionDetail(id), createClient()])
  if (!session) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <EditableSessionDetail session={session} currentUserId={user?.id ?? null} />
}
