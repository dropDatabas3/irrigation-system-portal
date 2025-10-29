import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fullscreen background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        poster="/placeholder.jpg"
      >
        <source src="/agua_video.mp4" type="video/mp4" />
        {/* Fallback background if video unsupported */}
      </video>

      {/* Subtle overlays to improve contrast over the video */}
      <div className="pointer-events-none absolute inset-0 bg-black/30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(100,200,220,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(80,180,200,0.08),transparent_55%)]" />

      {/* Login content */}
      <LoginForm />
    </div>
  )
}
