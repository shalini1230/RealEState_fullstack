import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, ArrowRight, Loader2, User, Mail } from "lucide-react"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const API = "http://localhost:3000"

export default function LoginPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) { setError("Please enter your email"); return }
    if (!EMAIL_RE.test(email.trim())) { setError("Enter a valid email address (e.g. you@example.com)"); return }

    setLoading(true)
    setError("")
    try {
      // Detect new vs existing silently
      const checkRes = await fetch(`${API}/auth/check-email?email=${encodeURIComponent(email.trim())}`)
      const checkData = await checkRes.json()

      if (checkData.exists) {
        // Existing user — instant login, no OTP
        const res = await fetch(`${API}/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Login failed")
        localStorage.setItem("session", JSON.stringify(data.session))
        localStorage.setItem("user", JSON.stringify(data.user))
        navigate("/dashboard")
      } else {
        // New user — name is required
        if (!name.trim()) { setError("Please enter your full name to create an account"); return }
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to send OTP")
        localStorage.setItem("otp_email", email.trim())
        localStorage.setItem("otp_name", name.trim())
        localStorage.setItem("otp_is_new", "true")
        navigate("/verify")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-end">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-tr from-violet-900/30 via-transparent to-purple-900/20" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mr-12">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">NestFinder</span>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Get Started</h1>
            <p className="text-white/60 text-sm">Sign in or create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Full Name
              </Label>
              <Input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError("") }}
                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:border-white/50 rounded-xl"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                required
                autoFocus
                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:border-white/50 rounded-xl"
              />
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 gap-2 font-semibold rounded-xl text-white border-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? "Please wait…" : "Continue"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          By continuing you agree to our Terms of Service.
        </p>
      </div>
    </div>
  )
}
