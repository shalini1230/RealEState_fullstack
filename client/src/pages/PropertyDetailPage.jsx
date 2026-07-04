import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Building2, ArrowLeft, MapPin, IndianRupee, Home, Hotel,
  Landmark, Store, Wifi, UtensilsCrossed, Clock, Loader2,
  Trash2, User, CheckCircle2, XCircle, DoorOpen, Layers,
  TreePine, BarChart2, Mail, Phone, Pencil, Calendar,
  Users, BedDouble, Heart, X, ChevronLeft, ChevronRight, Expand,
  Star, Send
} from "lucide-react"

const TYPE_META = {
  APARTMENT: { label: "Apartment", icon: Home, color: "#3b82f6", bg: "#eff6ff" },
  HOSTEL: { label: "Hostel / PG", icon: Hotel, color: "#8b5cf6", bg: "#f5f3ff" },
  LAND: { label: "Land", icon: Landmark, color: "#10b981", bg: "#ecfdf5" },
  COMMERCIAL: { label: "Commercial", icon: Store, color: "#f59e0b", bg: "#fffbeb" },
}

const STATUS_COLORS = {
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  RENTED: "bg-blue-50 text-blue-700 border-blue-200",
  SOLD: "bg-slate-100 text-slate-600 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
}

const BOOKING_STATUS_STYLE = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ACCEPTED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
}

function Lightbox({ images, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm tabular-nums">
        {index + 1} / {images.length}
      </span>

      {/* Prev */}
      {images.length > 1 && (
        <button
          className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onNext() }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={`w-2 h-2 rounded-full transition-all ${i === index ? "bg-white scale-125" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value && value !== false && value !== 0) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function BoolRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="flex-1 text-sm text-slate-700">{label}</p>
      {value ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
    </div>
  )
}

function ApartmentSection({ d }) {
  return (
    <>
      <DetailRow icon={DoorOpen} label="Rooms (BHK)" value={`${d.rooms} BHK`} />
      <DetailRow icon={Home} label="Bathrooms" value={d.bathrooms} />
      {d.floor != null && <DetailRow icon={Layers} label="Floor" value={d.floor} />}
      {d.maintenanceCharges != null && (
        <DetailRow icon={IndianRupee} label="Maintenance Charges" value={`₹${d.maintenanceCharges.toLocaleString('en-IN')} / mo`} />
      )}
      <BoolRow icon={Building2} label="Balcony" value={d.balcony} />
      <BoolRow icon={Home} label="Furnished" value={d.furnished} />
      <BoolRow icon={Layers} label="Lift / Elevator" value={d.lift} />
    </>
  )
}

function HostelSection({ d }) {
  return (
    <>
      <DetailRow icon={User} label="Gender" value={d.gender.charAt(0) + d.gender.slice(1).toLowerCase()} />
      <DetailRow icon={BedDouble} label="Sharing" value={d.sharing.charAt(0) + d.sharing.slice(1).toLowerCase()} />
      {d.curfew && <DetailRow icon={Clock} label="Curfew" value={d.curfew} />}
      <BoolRow icon={Wifi} label="WiFi included" value={d.wifi} />
      <BoolRow icon={UtensilsCrossed} label="Food included" value={d.food} />
    </>
  )
}

function LandSection({ d }) {
  return (
    <>
      <DetailRow icon={Landmark} label="Size" value={`${d.sizeAcres} acres`} />
      <DetailRow icon={TreePine} label="Usage" value={d.usage.charAt(0) + d.usage.slice(1).toLowerCase()} />
      <BoolRow icon={MapPin} label="Road access" value={d.roadAccess} />
    </>
  )
}

function CommercialSection({ d }) {
  return (
    <>
      <DetailRow icon={Store} label="Shop / unit type" value={d.shopType} />
      <DetailRow icon={BarChart2} label="Floor area" value={`${d.floorArea} sq ft`} />
      {d.securityDeposit != null && (
        <DetailRow icon={IndianRupee} label="Security deposit" value={`₹${d.securityDeposit.toLocaleString('en-IN')}`} />
      )}
    </>
  )
}

// ── Booking section for non-owners ───────────────────────────────────────────
function BookingSection({ property, currentUser, onBookingChange }) {
  const [myBooking, setMyBooking] = useState(undefined) // undefined = loading
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")

  const remainingVacancies = property.vacancies - (property._count?.bookingQueue ?? 0)

  useEffect(() => {
    if (!currentUser) { setMyBooking(null); return }
    apiFetch(`/bookings/check/${property.id}`)
      .then(setMyBooking)
      .catch(() => setMyBooking(null))
  }, [property.id, currentUser])

  useEffect(() => {
    if (currentUser && myBooking === null) {
      setForm({
        name: currentUser.profile?.name || "",
        phone: currentUser.profile?.phone || "",
        email: currentUser.email || "",
        message: "",
      })
    }
  }, [currentUser, myBooking])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("Name, phone, and email are required.")
      return
    }
    setSubmitting(true)
    try {
      const result = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({ propertyId: property.id, ...form }),
      })
      setMyBooking(result)
      setShowForm(false)
      onBookingChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!confirm("Withdraw your booking request?")) return
    setCancelling(true)
    try {
      await apiFetch(`/bookings/${myBooking.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      setMyBooking((prev) => ({ ...prev, status: "CANCELLED" }))
      onBookingChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (!currentUser) return null
  if (myBooking === undefined) return null

  // Property not available and user has no booking
  if (property.status !== "AVAILABLE" && !myBooking) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Book This Property</h2>
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: remainingVacancies > 0 ? "#10b981" : "#ef4444" }}>
          <Users className="w-4 h-4" />
          {remainingVacancies > 0 ? `${remainingVacancies} of ${property.vacancies} vacancies left` : "No vacancies left"}
        </div>
      </div>

      {/* Already has a booking */}
      {myBooking && myBooking.status === "PENDING" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">You're in the queue</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Position <span className="font-bold">#{myBooking.position}</span> — the owner will review your request
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
            Withdraw Request
          </Button>
        </div>
      )}

      {myBooking && myBooking.status === "ACCEPTED" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Booking Confirmed!</p>
            <p className="text-xs text-green-600 mt-0.5">The owner has accepted your request. They will contact you shortly.</p>
          </div>
        </div>
      )}

      {myBooking && (myBooking.status === "REJECTED" || myBooking.status === "CANCELLED") && (
        <div className="space-y-3">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${BOOKING_STATUS_STYLE[myBooking.status]}`}>
            <XCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {myBooking.status === "REJECTED" ? "Request Declined" : "Request Withdrawn"}
              </p>
              <p className="text-xs mt-0.5">
                {myBooking.status === "REJECTED"
                  ? "The owner declined your request."
                  : "You withdrew this request."}
              </p>
            </div>
          </div>
          {property.status === "AVAILABLE" && remainingVacancies > 0 && (
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="text-white"
              style={{ background: "var(--accent)" }}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Request Again
            </Button>
          )}
        </div>
      )}

      {/* No booking yet — show button or form */}
      {!myBooking && property.status === "AVAILABLE" && remainingVacancies > 0 && (
        <>
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="text-white w-full"
              style={{ background: "var(--accent)" }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Request Booking
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    placeholder="+91 99999 00000"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message (optional)</Label>
                <Textarea
                  placeholder="Any questions or details for the owner…"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setShowForm(false); setError("") }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="flex-1 text-white" style={{ background: "var(--accent)" }}>
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Calendar className="w-3.5 h-3.5 mr-1.5" />}
                  {submitting ? "Sending…" : "Send Request"}
                </Button>
              </div>
            </form>
          )}
        </>
      )}

      {!myBooking && (property.status !== "AVAILABLE" || remainingVacancies <= 0) && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500">This property is currently not accepting booking requests.</p>
        </div>
      )}
    </div>
  )
}

// ── Owner queue panel ─────────────────────────────────────────────────────────
function OwnerQueuePanel({ propertyId, property, onStatusChange }) {
  const [queue, setQueue] = useState(null)
  const [processing, setProcessing] = useState(null)

  const acceptedCount = property._count?.bookingQueue ?? 0
  const remainingVacancies = property.vacancies - acceptedCount

  useEffect(() => {
    apiFetch(`/properties/${propertyId}/queue`)
      .then(setQueue)
      .catch(() => setQueue([]))
  }, [propertyId])

  async function handleAction(bookingId, status) {
    setProcessing(bookingId)
    try {
      const result = await apiFetch(`/bookings/${bookingId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
      // Refresh queue and propagate updated property (for vacancy count)
      const updated = await apiFetch(`/properties/${propertyId}/queue`)
      setQueue(updated)
      onStatusChange(result.property)
    } catch {}
    setProcessing(null)
  }

  const pending = queue?.filter((b) => b.status === "PENDING") ?? []
  const others = queue?.filter((b) => b.status !== "PENDING") ?? []

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Booking Requests</h2>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
          {remainingVacancies} / {property.vacancies} vacancies left
        </span>
      </div>

      {queue === null && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </div>
      )}

      {queue !== null && pending.length === 0 && others.length === 0 && (
        <p className="text-sm text-slate-400 py-2">No booking requests yet.</p>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending ({pending.length})</p>
          {pending.map((b) => (
            <div key={b.id} className="border border-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--accent)" }}>
                    {b.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-400">{b.email} · {b.phone}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                  #{b.position}
                </span>
              </div>
              {b.message && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 italic">"{b.message}"</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={processing === b.id || remainingVacancies <= 0}
                  onClick={() => handleAction(b.id, "ACCEPTED")}
                  className="flex-1 text-white text-xs"
                  style={{ background: remainingVacancies > 0 ? "#10b981" : undefined }}
                  variant={remainingVacancies <= 0 ? "outline" : undefined}
                >
                  {processing === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing === b.id}
                  onClick={() => handleAction(b.id, "REJECTED")}
                  className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  {processing === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Previous ({others.length})</p>
          {others.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "#94a3b8" }}>
                {b.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{b.name}</p>
                <p className="text-xs text-slate-400 truncate">{b.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${BOOKING_STATUS_STYLE[b.status]}`}>
                {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Review Section ────────────────────────────────────────────────────────────
function StarRow({ value, hover, onChange, onHover, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(n)}
          onMouseEnter={() => !readonly && onHover(n)}
          onMouseLeave={() => !readonly && onHover(0)}
          className={`transition-transform ${readonly ? "cursor-default" : "hover:scale-110"}`}
        >
          <Star
            className="w-6 h-6 transition-colors"
            style={{
              color: n <= (hover || value) ? "#f59e0b" : "#e2e8f0",
              fill: n <= (hover || value) ? "#f59e0b" : "none",
            }}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewSection({
  reviews, myRating, hoverRating, reviewComment, submittingReview, reviewError,
  currentUser, isOwner, onRatingChange, onHoverChange, onCommentChange, onSubmit, onDelete,
}) {
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0
  const myReview = currentUser ? reviews.find(r => r.userId === currentUser.id) : null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" fill="#f59e0b" />
          <h2 className="font-semibold text-slate-900">Reviews</h2>
          {reviews.length > 0 && (
            <span className="text-sm text-slate-400">
              {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
          )}
        </div>
      </div>

      {/* Write a review — only for logged-in non-owners */}
      {currentUser && !isOwner && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">
            {myReview ? "Update your review" : "Rate this property"}
          </p>
          <StarRow
            value={myRating}
            hover={hoverRating}
            onChange={onRatingChange}
            onHover={onHoverChange}
          />
          <textarea
            value={reviewComment}
            onChange={e => onCommentChange(e.target.value)}
            placeholder="Share your experience (optional)…"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none placeholder:text-slate-400"
          />
          {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
          <div className="flex gap-2">
            <button
              onClick={onSubmit}
              disabled={!myRating || submittingReview}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            >
              {submittingReview
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              {myReview ? "Update" : "Submit"}
            </button>
            {myReview && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      )}

      {!currentUser && !isOwner && (
        <p className="text-sm text-slate-400 italic">Log in to leave a review.</p>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews yet. Be the first to rate this property!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => {
            const name = r.user?.profile?.name || r.user?.email?.split("@")[0] || "User"
            const isMe = currentUser?.id === r.userId
            return (
              <div key={r.id} className={`flex gap-3 ${isMe ? "bg-violet-50 rounded-xl p-3 -mx-1" : ""}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--accent)" }}>
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{name}</span>
                    {isMe && <span className="text-xs text-violet-500 font-medium">You</span>}
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className="w-3.5 h-3.5" style={{ color: n <= r.rating ? "#f59e0b" : "#e2e8f0", fill: n <= r.rating ? "#f59e0b" : "none" }} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{r.comment}</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem("user") || "null")
  const isOwner = currentUser && property?.ownerId === currentUser.id
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [mapCoords, setMapCoords] = useState(null)
  const [mapExact, setMapExact] = useState(false)
  const [reviews, setReviews] = useState([])
  const [myRating, setMyRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState("")

  useEffect(() => {
    apiFetch(`/properties/${id}`)
      .then(setProperty)
      .catch(() => navigate("/properties"))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!property) return
    if (property.mapEmbedUrl) return // rendered directly from property.mapEmbedUrl, skip geocoding
    const hasGps = property.gpsLat != null && property.gpsLng != null
                  && !(property.gpsLat === 0 && property.gpsLng === 0)
    if (hasGps) {
      setMapCoords({ lat: property.gpsLat, lng: property.gpsLng })
      setMapExact(true)
      return
    }
    const queries = [
      [property.address, property.area, property.city].filter(Boolean).join(', '),
      [property.area, property.city].filter(Boolean).join(', '),
      property.city,
    ].filter(Boolean)

    const tryNext = (i) => {
      if (i >= queries.length) return
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queries[i])}&format=json&limit=1&countrycodes=in`)
        .then(r => r.json())
        .then(data => {
          if (data[0]) {
            setMapCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
            setMapExact(false)
          } else {
            tryNext(i + 1)
          }
        })
        .catch(() => tryNext(i + 1))
    }
    tryNext(0)
  }, [property])

  useEffect(() => {
    if (!currentUser || isOwner) return
    apiFetch(`/wishlist/check/${id}`)
      .then((d) => setWishlisted(d.wishlisted))
      .catch(() => {})
  }, [id, isOwner])

  // Load reviews
  useEffect(() => {
    apiFetch(`/properties/${id}/reviews`)
      .then(data => {
        setReviews(data)
        if (currentUser) {
          const mine = data.find(r => r.userId === currentUser.id)
          if (mine) { setMyRating(mine.rating); setReviewComment(mine.comment || "") }
        }
      })
      .catch(() => {})
  }, [id])

  async function submitReview() {
    if (!myRating) return
    setSubmittingReview(true)
    setReviewError("")
    try {
      const saved = await apiFetch(`/properties/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: myRating, comment: reviewComment }),
      })
      setReviews(prev => {
        const idx = prev.findIndex(r => r.userId === currentUser.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
        return [saved, ...prev]
      })
    } catch (e) {
      setReviewError(e.message || "Failed to submit review")
    } finally {
      setSubmittingReview(false)
    }
  }

  async function deleteMyReview() {
    try {
      await apiFetch(`/properties/${id}/reviews/mine`, { method: "DELETE" })
      setReviews(prev => prev.filter(r => r.userId !== currentUser.id))
      setMyRating(0)
      setReviewComment("")
    } catch {}
  }

  async function toggleWishlist() {
    if (!currentUser) return
    setWishlistLoading(true)
    try {
      if (wishlisted) {
        await apiFetch(`/wishlist/${id}`, { method: 'DELETE' })
        setWishlisted(false)
      } else {
        await apiFetch(`/wishlist/${id}`, { method: 'POST' })
        setWishlisted(true)
      }
    } catch {}
    setWishlistLoading(false)
  }

  async function handleDelete() {
    if (!confirm("Delete this property? This cannot be undone.")) return
    setDeleting(true)
    try {
      await apiFetch(`/properties/${id}`, { method: "DELETE" })
      navigate("/properties")
    } catch {
      setDeleting(false)
    }
  }

  function refreshProperty() {
    apiFetch(`/properties/${id}`).then(setProperty).catch(() => {})
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    )
  }

  if (!property) return null

  const meta = TYPE_META[property.type]
  const Icon = meta.icon
  const details = property.apartment || property.hostel || property.land || property.commercial
  const ownerName = property.owner?.profile?.name || property.owner?.email
  const acceptedCount = property._count?.bookingQueue ?? 0
  const remainingVacancies = property.vacancies - acceptedCount

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/properties")} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Property Detail</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && currentUser && (
              <button
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition-colors hover:bg-red-50"
                title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
              >
                {wishlistLoading
                  ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  : <Heart className={`w-4 h-4 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                }
              </button>
            )}
            {isOwner && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate(`/properties/${id}/edit`)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Cover photo + property info */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {property.images?.length > 0 ? (
            <div className="relative w-full cursor-zoom-in" style={{ height: 260 }} onClick={() => setLightboxIdx(0)}>
              <img src={property.images[0]} alt="cover" className="w-full h-full object-cover" />
              <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full border font-medium backdrop-blur-sm bg-white/80 ${STATUS_COLORS[property.status]}`}>
                {property.status.charAt(0) + property.status.slice(1).toLowerCase()}
              </span>
              <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/80" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                <Expand className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: 160, background: meta.bg }}>
              <Icon className="w-14 h-14 opacity-25" style={{ color: meta.color }} />
            </div>
          )}

          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {!property.images?.length && (
                <>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[property.status]}`}>
                    {property.status.charAt(0) + property.status.slice(1).toLowerCase()}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{property.title}</h1>
            <div className="flex items-center gap-1 mt-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-sm">{property.area}, {property.city}</span>
            </div>
            {property.address && <p className="text-xs text-slate-400 mt-0.5">{property.address}</p>}
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-slate-900" />
                <span className="text-2xl font-bold text-slate-900">{property.price.toLocaleString('en-IN')}</span>
                {property.type !== "LAND" && <span className="text-sm text-slate-400">/ month</span>}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: remainingVacancies > 0 ? "#10b981" : "#ef4444" }}>
                <Users className="w-4 h-4" />
                <span>{remainingVacancies}/{property.vacancies} vacancies</span>
              </div>
            </div>
            {property.description && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{property.description}</p>}
          </div>
        </div>

        {/* More photos */}
        {property.images?.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <h2 className="font-semibold text-slate-900">Photos</h2>
            <div className="grid grid-cols-3 gap-2">
              {property.images.slice(1).map((url, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden aspect-square border border-slate-100 cursor-zoom-in relative group"
                  onClick={() => setLightboxIdx(i + 1)}
                >
                  <img src={url} alt={`photo-${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Expand className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extension details */}
        {details && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-1">{meta.label} details</h2>
            <div>
              {property.apartment && <ApartmentSection d={details} />}
              {property.hostel && <HostelSection d={details} />}
              {property.land && <LandSection d={details} />}
              {property.commercial && <CommercialSection d={details} />}
            </div>
          </div>
        )}

        {/* Map */}
        {(property.mapEmbedUrl || mapCoords) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <h2 className="font-semibold text-slate-900">Property Location</h2>
              </div>
              {!property.mapEmbedUrl && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${mapExact ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                  {mapExact ? 'Exact GPS' : 'Approximate'}
                </span>
              )}
            </div>
            {property.mapEmbedUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 380 }}>
                <iframe
                  title="Property Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={property.mapEmbedUrl}
                />
              </div>
            ) : (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapCoords.lat},${mapCoords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer"
                style={{ height: 380 }}
              >
                <iframe
                  title="Property Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: 'none' }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=loc:${mapCoords.lat},${mapCoords.lng}&z=17&output=embed`}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-3">
                  <span className="bg-white text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MapPin className="w-3 h-3" /> Open in Google Maps ↗
                  </span>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Booking section for non-owners */}
        {!isOwner && (
          <BookingSection
            property={property}
            currentUser={currentUser}
            onBookingChange={refreshProperty}
          />
        )}

        {/* Owner queue panel */}
        {isOwner && (
          <OwnerQueuePanel
            propertyId={id}
            property={property}
            onStatusChange={(updatedProperty) => setProperty(updatedProperty)}
          />
        )}

        {/* Contact Owner */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Contact Owner</h2>
            {isOwner && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                Your listing
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0" style={{ background: "var(--accent)" }}>
              {ownerName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{property.owner?.profile?.name || "Owner"}</p>
              <p className="text-xs text-slate-400">Property Owner</p>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-50">
            <a
              href={`mailto:${property.owner?.email}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm text-slate-700 font-medium truncate group-hover:text-violet-600">{property.owner?.email}</p>
              </div>
            </a>

            {property.owner?.profile?.phone ? (
              <a
                href={`tel:${property.owner.profile.phone}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="text-sm text-slate-700 font-medium group-hover:text-green-600">{property.owner.profile.phone}</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 italic">No phone number added</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <ReviewSection
          reviews={reviews}
          myRating={myRating}
          hoverRating={hoverRating}
          reviewComment={reviewComment}
          submittingReview={submittingReview}
          reviewError={reviewError}
          currentUser={currentUser}
          isOwner={isOwner}
          onRatingChange={setMyRating}
          onHoverChange={setHoverRating}
          onCommentChange={setReviewComment}
          onSubmit={submitReview}
          onDelete={deleteMyReview}
        />

      </main>

      {lightboxIdx !== null && (
        <Lightbox
          images={property.images}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i - 1 + property.images.length) % property.images.length)}
          onNext={() => setLightboxIdx((i) => (i + 1) % property.images.length)}
        />
      )}
    </div>
  )
}
