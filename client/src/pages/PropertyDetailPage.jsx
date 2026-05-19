import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Building2, ArrowLeft, MapPin, IndianRupee, Home, Hotel,
  Landmark, Store, Wifi, UtensilsCrossed, Clock, Loader2,
  Trash2, User, CheckCircle2, XCircle, DoorOpen, Layers,
  TreePine, BarChart2, Mail, Phone, Pencil
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
      {value ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-300" />
      )}
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
      <DetailRow icon={Home} label="Sharing" value={d.sharing.charAt(0) + d.sharing.slice(1).toLowerCase()} />
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

export default function PropertyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem("user") || "null")
  const isOwner = currentUser && property?.ownerId === currentUser.id

  useEffect(() => {
    apiFetch(`/properties/${id}`)
      .then(setProperty)
      .catch(() => navigate("/properties"))
      .finally(() => setLoading(false))
  }, [id, navigate])

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
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/properties/${id}/edit`)}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Cover photo + property info card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* Cover image */}
          {property.images?.length > 0 ? (
            <div className="relative w-full" style={{ height: 260 }}>
              <img src={property.images[0]} alt="cover" className="w-full h-full object-cover" />
              <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full border font-medium backdrop-blur-sm bg-white/80 ${STATUS_COLORS[property.status]}`}>
                {property.status.charAt(0) + property.status.slice(1).toLowerCase()}
              </span>
              <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/80" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: 160, background: meta.bg }}>
              <Icon className="w-14 h-14 opacity-25" style={{ color: meta.color }} />
            </div>
          )}

          {/* Info */}
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
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-slate-900" />
              <span className="text-2xl font-bold text-slate-900">{property.price.toLocaleString('en-IN')}</span>
              <span className="text-sm text-slate-400">/ month</span>
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
                <div key={i} className="rounded-xl overflow-hidden aspect-square border border-slate-100">
                  <img src={url} alt={`photo-${i + 1}`} className="w-full h-full object-cover" />
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
        {(property.gpsLat && property.gpsLng) || property.address ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold text-slate-900">Property Location</h2>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 280 }}>
              <iframe
                title="Property Location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={
                  property.gpsLat && property.gpsLng
                    ? `https://maps.google.com/maps?q=${property.gpsLat},${property.gpsLng}&z=16&output=embed`
                    : `https://maps.google.com/maps?q=${encodeURIComponent(property.address)}&output=embed`
                }
              />
            </div>
          </div>
        ) : null}

        {/* Contact Owner — visible to all viewers */}
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
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {ownerName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {property.owner?.profile?.name || "Owner"}
              </p>
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

      </main>
    </div>
  )
}
