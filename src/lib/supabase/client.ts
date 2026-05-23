import { createBrowserClient } from "@supabase/ssr"
import { config } from "@/lib/config"
import type { Database } from "@/lib/types/database"

export function createClient() {
  return createBrowserClient<Database>(config.supabase.url, config.supabase.anonKey)
}
