// Validates required environment variables on first access.
// Lazy getters defer evaluation until runtime, after NEXT_PUBLIC_* vars are inlined by the bundler.

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  get supabase() {
    return {
      url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    }
  },
}
