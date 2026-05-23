import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { config } from "@/lib/config"
import type { Database } from "@/lib/types/database"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware handles session refresh.
          }
        },
      },
    }
  )
}
