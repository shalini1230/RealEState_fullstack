import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Building2, ArrowLeft, Loader2, Calendar, CheckCircle2,
  XCircle, Clock, MapPin, IndianRupee, Users
} from "lucide-react"

const STATUS_STYLE = {
  PENDING:   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  label: "Pending"   },
  ACCEPTED:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  label: "Accepted"  },
  REJECTED:  { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    label: "Rejected"  },
  CANCELLED: { bg: "bg-slate-100", border: "border-slate-200",  text: "text-slate-500",  label: "Withdrawn" },
}

function BookingCard({ booking, onWithdraw }) {
  const [cancelling, setCancelling] = useState(false)
  const { property, status, position, name, phone, email, message, createdAt } = booking
  const s = STATUS_STYLE[status]
  const remaining = (property.vacancies ?? 1) - (property._count?.bookingQueue ?? 0)

  async function handleWithdraw() {
    if (!confirm("Withdraw this booking request?")) return
    setCancelling(true)
    try {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      onWithdraw(booking.id)
    } catch {}
    setCancelling(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Property header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-50">
        {property.images?.[0] ? (
          <img src={property.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-slate-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{property.title}</p>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
            <MapPin className="w-3 h-3" />
            {property.area}, {property.city}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
            <IndianRupee className="w-3 h-3" />
            {property.price?.toLocaleString("en-IN")} / mo
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${s.bg} ${s.border} ${s.text}`}>
            {s.label}
          </span>
          <div className="flex items-center gap-1 mt-1.5 text-xs justify-end" style={{ color: remaining > 0 ? "#10b981" : "#ef4444" }}>
            <Users className="w-3 h-3" />
            {remaining}/{property.vacancies} left
          </div>
        </div>
      </div>

      {/* Booking details */}
      <div className="p-4 space-y-3">
        {status === "PENDING" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              You are <span className="font-bold">#{position}</span> in the queue — waiting for owner review
            </p>
          </div>
        )}
        {status === "ACCEPTED" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">Booking confirmed — the owner will contact you soon.</p>
          </div>
        )}
        {status === "REJECTED" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">Your request was declined by the owner.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
          <span><span className="text-slate-400">Name:</span> {name}</span>
          <span><span className="text-slate-400">Phone:</span> {phone}</span>
          <span className="col-span-2"><span className="text-slate-400">Email:</span> {email}</span>
          {message && <span className="col-span-2 italic text-slate-400">"{message}"</span>}
          <span className="col-span-2 text-slate-300">
            Requested {new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = `/properties/${property.id}`}
            className="flex-1 text-xs"
          >
            View Property
          </Button>
          {status === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleWithdraw}
              disabled={cancelling}
              className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
              Withdraw
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) { navigate("/login"); return }
    apiFetch("/bookings/my")
      .then(setBookings)
      .catch(() => setBookings([]))
  }, [navigate])

  function handleWithdraw(id) {
    setBookings((prev) =>
      prev.map((b) => b.id === id ? { ...b, status: "CANCELLED" } : b)
    )
  }

  const pending   = bookings?.filter((b) => b.status === "PENDING") ?? []
  const accepted  = bookings?.filter((b) => b.status === "ACCEPTED") ?? []
  const past      = bookings?.filter((b) => b.status === "REJECTED" || b.status === "CANCELLED") ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">My Bookings</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {bookings === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Calendar className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-slate-500 font-medium">No booking requests yet</p>
            <p className="text-sm text-slate-400">Browse properties and send a booking request to get started.</p>
            <Button onClick={() => navigate("/properties")} className="mt-2 text-white" style={{ background: "var(--accent)" }}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Pending · {pending.length}
                </h2>
                {pending.map((b) => <BookingCard key={b.id} booking={b} onWithdraw={handleWithdraw} />)}
              </section>
            )}
            {accepted.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Confirmed · {accepted.length}
                </h2>
                {accepted.map((b) => <BookingCard key={b.id} booking={b} onWithdraw={handleWithdraw} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Past · {past.length}
                </h2>
                {past.map((b) => <BookingCard key={b.id} booking={b} onWithdraw={handleWithdraw} />)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
