import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-background via-background to-secondary/20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(100,200,220,0.1),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(80,180,200,0.08),transparent_50%)]" />

      <LoginForm />
    </div>
  )
}
