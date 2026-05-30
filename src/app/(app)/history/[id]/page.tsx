import { notFound } from "next/navigation"
import { getSessionDetail } from "@/lib/actions/workout"
import { EditableSessionDetail } from "./EditableSessionDetail"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: session } = await getSessionDetail(id)
  if (!session) notFound()

  return <EditableSessionDetail session={session} />
}
