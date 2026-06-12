import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Building2, ArrowLeft, Loader2, CheckCircle2, XCircle,
  MapPin, IndianRupee, Users, Phone, Mail, MessageSquare
} from "lucide-react"

const STATUS_STYLE = {
  PENDING:   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  label: "Pending"   },
  ACCEPTED:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  label: "Accepted"  },
  REJECTED:  { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    label: "Rejected"  },
  CANCELLED: { bg: "bg-slate-100", border: "border-slate-200",  text: "text-slate-500",  label: "Withdrawn" },
}

function RequestCard({ booking, onAction }) {
  const [processing, setProcessing] = useState(null)
  const { property, status, position, name, phone, email, message, createdAt } = booking
  const s = STATUS_STYLE[status]
  const acceptedCount = property._count?.bookingQueue ?? 0
  const remainingVacancies = (property.vacancies ?? 1) - acceptedCount

  async function handle(newStatus) {
    setProcessing(newStatus)
    try {
      const result = await apiFetch(`/bookings/${booking.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      })
      onAction(booking.id, newStatus, result.property)
    } catch {}
    setProcessing(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Property row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        {property.images?.[0] ? (
          <img src={property.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{property.title}</p>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="w-3 h-3" />
            {property.area}, {property.city}
            <span className="mx-1">·</span>
            <IndianRupee className="w-3 h-3" />
            {property.price?.toLocaleString("en-IN")}{property.type !== "LAND" ? "/mo" : ""}
          </div>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="flex items-center gap-1 text-xs justify-end" style={{ color: remainingVacancies > 0 ? "#10b981" : "#ef4444" }}>
            <Users className="w-3 h-3" />
            {remainingVacancies}/{property.vacancies} left
          </div>
        </div>
      </div>

      {/* Requester info */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <a href={`mailto:${email}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600">
                  <Mail className="w-3 h-3" />
                  {email}
                </a>
              </div>
              <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 mt-0.5">
                <Phone className="w-3 h-3" />
                {phone}
              </a>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${s.bg} ${s.border} ${s.text}`}>
              {s.label}
            </span>
            {status === "PENDING" && (
              <p className="text-xs text-slate-400 mt-1">Queue #{position}</p>
            )}
          </div>
        </div>

        {message && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 italic">"{message}"</p>
          </div>
        )}

        <p className="text-xs text-slate-300">
          Requested {new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>

        {status === "PENDING" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={!!processing || remainingVacancies <= 0}
              onClick={() => handle("ACCEPTED")}
              className="flex-1 text-white text-xs"
              style={{ background: remainingVacancies > 0 ? "#10b981" : undefined }}
              variant={remainingVacancies <= 0 ? "outline" : undefined}
              title={remainingVacancies <= 0 ? "No vacancies remaining" : undefined}
            >
              {processing === "ACCEPTED"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!!processing}
              onClick={() => handle("REJECTED")}
              className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              {processing === "REJECTED"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <XCircle className="w-3.5 h-3.5 mr-1" />}
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) { navigate("/login"); return }
    apiFetch("/requests")
      .then(setRequests)
      .catch(() => setRequests([]))
  }, [navigate])

  function handleAction(bookingId, newStatus) {
    setRequests((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) return { ...b, status: newStatus }
        // If vacancies just filled, auto-rejected ones come back from the server-side
        // Re-fetch to get the full updated state
        return b
      })
    )
    // Re-fetch to reflect auto-rejected bookings and updated vacancy counts
    apiFetch("/requests").then(setRequests).catch(() => {})
  }

  const pending  = requests?.filter((b) => b.status === "PENDING")  ?? []
  const others   = requests?.filter((b) => b.status !== "PENDING")  ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Booking Requests</span>
          </div>
          {requests !== null && pending.length > 0 && (
            <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--accent)" }}>
              {pending.length}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {requests === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-slate-500 font-medium">No booking requests yet</p>
            <p className="text-sm text-slate-400">When tenants request your properties, they'll appear here.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Pending Requests · {pending.length}
                </h2>
                {pending.map((b) => (
                  <RequestCard key={b.id} booking={b} onAction={handleAction} />
                ))}
              </section>
            )}
            {others.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Previous · {others.length}
                </h2>
                {others.map((b) => (
                  <RequestCard key={b.id} booking={b} onAction={handleAction} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
