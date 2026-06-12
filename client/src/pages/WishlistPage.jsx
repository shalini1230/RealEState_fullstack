import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Heart, ArrowLeft, Loader2, MapPin, IndianRupee,
  Home, Hotel, Landmark, Store, Users, X
} from "lucide-react"

const TYPE_META = {
  APARTMENT: { label: "Apartment", icon: Home, color: "#3b82f6", bg: "#eff6ff" },
  HOSTEL:    { label: "Hostel / PG", icon: Hotel, color: "#8b5cf6", bg: "#f5f3ff" },
  LAND:      { label: "Land", icon: Landmark, color: "#10b981", bg: "#ecfdf5" },
  COMMERCIAL:{ label: "Commercial", icon: Store, color: "#f59e0b", bg: "#fffbeb" },
}

const STATUS_COLORS = {
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  RENTED:    "bg-blue-50 text-blue-700 border-blue-200",
  SOLD:      "bg-slate-100 text-slate-600 border-slate-200",
  PENDING:   "bg-amber-50 text-amber-700 border-amber-200",
}

function WishlistCard({ property, onRemove }) {
  const [removing, setRemoving] = useState(false)
  const meta = TYPE_META[property.type]
  const Icon = meta.icon
  const remaining = (property.vacancies ?? 1) - (property._count?.bookingQueue ?? 0)

  async function handleRemove() {
    setRemoving(true)
    try {
      await apiFetch(`/wishlist/${property.id}`, { method: "DELETE" })
      onRemove(property.id)
    } catch {}
    setRemoving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative" style={{ height: 160 }}>
        {property.images?.[0] ? (
          <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: meta.bg }}>
            <Icon className="w-12 h-12 opacity-20" style={{ color: meta.color }} />
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full border font-medium backdrop-blur-sm bg-white/80 ${STATUS_COLORS[property.status]}`}>
          {property.status.charAt(0) + property.status.slice(1).toLowerCase()}
        </span>
        {/* Type badge */}
        <span className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm bg-white/80" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {/* Remove button */}
        <button
          onClick={handleRemove}
          disabled={removing}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 border border-slate-200 flex items-center justify-center transition-colors"
          title="Remove from wishlist"
        >
          {removing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            : <X className="w-3.5 h-3.5 text-red-400" />
          }
        </button>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <p className="font-semibold text-slate-900 text-sm leading-snug truncate">{property.title}</p>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="w-3 h-3 shrink-0" />
          {property.area}, {property.city}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 font-bold text-slate-900">
            <IndianRupee className="w-3.5 h-3.5" />
            <span className="text-sm">{property.price.toLocaleString("en-IN")}</span>
            {property.type !== "LAND" && <span className="text-xs font-normal text-slate-400">/mo</span>}
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: remaining > 0 ? "#10b981" : "#ef4444" }}>
            <Users className="w-3 h-3" />
            {remaining}/{property.vacancies} left
          </div>
        </div>
        <Button
          size="sm"
          className="w-full text-xs mt-1"
          variant="outline"
          onClick={() => window.location.href = `/properties/${property.id}`}
        >
          View Property
        </Button>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) { navigate("/login"); return }
    apiFetch("/wishlist")
      .then(setProperties)
      .catch(() => setProperties([]))
  }, [navigate])

  function handleRemove(id) {
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-slate-900">Wishlist</span>
          </div>
          {properties !== null && (
            <span className="text-xs text-slate-400">{properties.length} saved</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {properties === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Heart className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-slate-500 font-medium">No saved properties yet</p>
            <p className="text-sm text-slate-400">Tap the heart icon on any property to save it here.</p>
            <Button onClick={() => navigate("/properties")} className="mt-2 text-white" style={{ background: "var(--accent)" }}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((p) => (
              <WishlistCard key={p.id} property={p} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
