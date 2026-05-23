export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a sign-in link
          </p>
        </div>
        {/* LoginForm client component will go here in Phase 6 */}
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Auth form — Phase 6
        </div>
      </div>
    </div>
  )
}
