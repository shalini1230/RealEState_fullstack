import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2, Plus, Search, MapPin, IndianRupee,
  Home, Hotel, Landmark, Store, Loader2, ArrowLeft, Heart
} from "lucide-react"

const TYPE_META = {
  APARTMENT: { label: "Apartment", icon: Home, color: "#3b82f6", bg: "#eff6ff", defaultImg: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80" },
  HOSTEL: { label: "Hostel", icon: Hotel, color: "#8b5cf6", bg: "#f5f3ff", defaultImg: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80" },
  LAND: { label: "Land", icon: Landmark, color: "#10b981", bg: "#ecfdf5", defaultImg: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80" },
  COMMERCIAL: { label: "Commercial", icon: Store, color: "#f59e0b", bg: "#fffbeb", defaultImg: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80" },
}

const STATUS_COLORS = {
  AVAILABLE: "text-green-700 bg-green-50 border-green-200",
  RENTED: "text-blue-700 bg-blue-50 border-blue-200",
  SOLD: "text-slate-600 bg-slate-100 border-slate-200",
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
}

function PropertyCard({ property, onClick, isWishlisted, onToggleWishlist, isOwner }) {
  const [toggling, setToggling] = useState(false)
  const meta = TYPE_META[property.type]
  const details = property.apartment || property.hostel || property.land || property.commercial
  const coverImage = property.images?.[0] || meta.defaultImg

  async function handleHeart(e) {
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    await onToggleWishlist(property.id, isWishlisted)
    setToggling(false)
  }

  return (
    <div
      onClick={onClick}
      className="cursor-pointer text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden flex flex-col"
    >
      {/* Cover photo */}
      <div className="relative w-full" style={{ height: 180 }}>
        <img src={coverImage} alt={property.title} className="w-full h-full object-cover" />

        {/* Status badge */}
        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border font-medium backdrop-blur-sm ${STATUS_COLORS[property.status]}`}>
          {property.status.charAt(0) + property.status.slice(1).toLowerCase()}
        </span>

        {/* Type badge */}
        <span className="absolute bottom-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm bg-white/90" style={{ color: meta.color }}>
          {meta.label}
        </span>

        {/* Heart button — only for logged-in non-owners */}
        {!isOwner && (
          <button
            onClick={handleHeart}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            {toggling
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              : <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
            }
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{property.title}</h3>
          <div className="flex items-center gap-1 mt-1 text-slate-400">
            <MapPin className="w-3 h-3" />
            <span className="text-xs">{property.area}, {property.city}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-900 font-bold mt-auto">
          <IndianRupee className="w-4 h-4" />
          <span>{property.price.toLocaleString('en-IN')}</span>
          {property.type !== "LAND" && <span className="text-xs text-slate-400 font-normal ml-0.5">/mo</span>}
        </div>

        {details && (
          <div className="text-xs text-slate-400 border-t border-slate-50 pt-2">
            {property.type === "APARTMENT" && `${details.rooms} BHK · ${details.bathrooms} bath${details.furnished ? " · Furnished" : ""}`}
            {property.type === "HOSTEL" && `${details.gender} · ${details.sharing} sharing${details.wifi ? " · WiFi" : ""}`}
            {property.type === "LAND" && `${details.sizeAcres} acres · ${details.usage.toLowerCase()}`}
            {property.type === "COMMERCIAL" && `${details.shopType} · ${details.floorArea} sq ft`}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PropertiesPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState("")
  const [area, setArea] = useState("")
  const [type, setType] = useState("ALL")
  const [wishlistedIds, setWishlistedIds] = useState(new Set())

  const currentUser = JSON.parse(localStorage.getItem("user") || "null")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (city.trim()) params.set("city", city.trim())
      if (area.trim()) params.set("area", area.trim())
      if (type !== "ALL") params.set("type", type)
      const data = await apiFetch(`/properties?${params}`)
      setProperties(data)
    } catch {
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [city, area, type])

  useEffect(() => { load() }, [load])

  // Load wishlist IDs on mount (only if logged in)
  useEffect(() => {
    if (!currentUser) return
    apiFetch("/wishlist")
      .then((data) => setWishlistedIds(new Set(data.map((p) => p.id))))
      .catch(() => {})
  }, [])

  async function handleToggleWishlist(propertyId, currentlyWishlisted) {
    if (!currentUser) { navigate("/login"); return }
    try {
      if (currentlyWishlisted) {
        await apiFetch(`/wishlist/${propertyId}`, { method: "DELETE" })
        setWishlistedIds((prev) => { const next = new Set(prev); next.delete(propertyId); return next })
      } else {
        await apiFetch(`/wishlist/${propertyId}`, { method: "POST" })
        setWishlistedIds((prev) => new Set([...prev, propertyId]))
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Properties</span>
            </div>
          </div>
          <Button
            onClick={() => navigate("/properties/new")}
            className="gap-1.5 text-white h-9"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">List Property</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="City…"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="relative flex-1 min-w-[140px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Area / locality…"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="APARTMENT">Apartment</SelectItem>
              <SelectItem value="HOSTEL">Hostel</SelectItem>
              <SelectItem value="LAND">Land</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">No properties found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or list a new property.</p>
            <Button
              className="mt-4 text-white gap-1.5"
              style={{ background: "var(--accent)" }}
              onClick={() => navigate("/properties/new")}
            >
              <Plus className="w-4 h-4" /> List a Property
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400">{properties.length} {properties.length === 1 ? "property" : "properties"} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onClick={() => navigate(`/properties/${p.id}`)}
                  isWishlisted={wishlistedIds.has(p.id)}
                  onToggleWishlist={handleToggleWishlist}
                  isOwner={currentUser?.id === p.ownerId}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
