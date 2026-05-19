import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, ShieldCheck, Loader2, RotateCcw, ArrowLeft } from "lucide-react"

const API = "http://localhost:3000"

export default function VerifyPage() {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState("")
  const [seconds, setSeconds] = useState(30)
  const navigate = useNavigate()

  const email = localStorage.getItem("otp_email") || ""
  const name = localStorage.getItem("otp_name") || ""
  const isNew = localStorage.getItem("otp_is_new") === "true"
  const canResend = seconds === 0

  // 30s countdown
  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp, name: isNew ? name : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid or expired OTP")
      localStorage.setItem("session", JSON.stringify(data.session))
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.removeItem("otp_name")
      localStorage.removeItem("otp_is_new")
      navigate("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) return navigate("/login")
    setResending(true)
    setError("")
    setResent(false)
    try {
      const endpoint = isNew ? "/auth/login" : "/auth/signin"
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error("Failed to resend")
      setOtp("")
      setResent(true)
      setSeconds(30) // restart countdown
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #aa3bff 50%, #c084fc 100%)" }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">NestFinder</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-semibold leading-snug mb-4">
            "Secure access, every time. Your privacy is our priority."
          </p>
          <p className="text-white/70 text-sm">
            One-time passwords expire in 30 seconds and can only be used once.
          </p>
        </div>

        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">NestFinder</span>
          </div>

          <div className="mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(170, 59, 255, 0.1)" }}
            >
              <ShieldCheck className="w-6 h-6" style={{ color: "var(--accent)" }} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Check your email</h1>
            <p className="text-slate-500 text-sm">
              We sent a verification code to{" "}
              <span className="font-medium text-slate-700">{email || "your email"}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp">One-time password</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                  className="h-12 text-center text-2xl tracking-[0.6em] font-mono"
                />

                {/* Countdown bar + timer */}
                <div className="space-y-1 pt-1">
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(seconds / 30) * 100}%`,
                        background: seconds <= 10 ? "#ef4444" : "var(--accent)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {canResend
                      ? "Code expired — request a new one below"
                      : <>Expires in <span className="font-semibold tabular-nums" style={{ color: seconds <= 10 ? "#ef4444" : "var(--accent)" }}>{seconds}s</span></>
                    }
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  {error}
                </div>
              )}

              {resent && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                  New code sent — check your inbox.
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-white"
                style={{ background: "var(--accent)" }}
                disabled={loading || otp.length < 6}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {loading ? "Verifying…" : "Verify & Continue"}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">Didn't receive it?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend || resending}
                className="flex items-center gap-1.5 font-medium disabled:opacity-30 transition-opacity"
                style={{ color: "var(--accent)" }}
              >
                {resending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RotateCcw className="w-3.5 h-3.5" />
                }
                {canResend ? "Resend code" : `Resend in ${seconds}s`}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </button>
        </div>
      </div>
    </div>
  )
}
