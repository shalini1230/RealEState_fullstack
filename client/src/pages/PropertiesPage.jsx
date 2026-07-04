import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2, Plus, Search, MapPin, IndianRupee,
  Home, Hotel, Landmark, Store, Loader2, ArrowLeft, Heart, SlidersHorizontal, X
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
    <div onClick={onClick} className="cursor-pointer text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden flex flex-col">
      <div className="relative w-full" style={{ height: 180 }}>
        <img src={coverImage} alt={property.title} className="w-full h-full object-cover" />
        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border font-medium backdrop-blur-sm ${STATUS_COLORS[property.status]}`}>
          {property.status.charAt(0) + property.status.slice(1).toLowerCase()}
        </span>
        <span className="absolute bottom-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm bg-white/90" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {!isOwner && (
          <button onClick={handleHeart} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
            {toggling
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              : <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />}
          </button>
        )}
      </div>
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

const EMPTY_FILTERS = {
  minPrice: "", maxPrice: "",
  // Apartment
  bhk: "ALL", furnished: false,
  // Hostel
  gender: "ALL", sharing: "ALL",
  // Land
  minAcres: "", maxAcres: "", usage: "ALL",
  // Commercial
  purpose: "ALL", minSqFt: "",
}

export default function PropertiesPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState("")
  const [area, setArea] = useState("")
  const [type, setType] = useState("ALL")
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
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

  useEffect(() => {
    if (!currentUser) return
    apiFetch("/wishlist")
      .then((data) => setWishlistedIds(new Set(data.map((p) => p.id))))
      .catch(() => {})
  }, [])

  // Client-side filtering for price range + type-specific filters
  const filtered = useMemo(() => {
    return properties.filter(p => {
      const d = p.apartment || p.hostel || p.land || p.commercial
      if (filters.minPrice && p.price < Number(filters.minPrice)) return false
      if (filters.maxPrice && p.price > Number(filters.maxPrice)) return false
      if (p.type === "APARTMENT" && d) {
        if (filters.bhk !== "ALL") {
          const bhk = Number(filters.bhk)
          if (bhk === 4 ? d.rooms < 4 : d.rooms !== bhk) return false
        }
        if (filters.furnished && !d.furnished) return false
      }
      if (p.type === "HOSTEL" && d) {
        if (filters.gender !== "ALL" && d.gender !== filters.gender) return false
        if (filters.sharing !== "ALL" && d.sharing !== filters.sharing) return false
      }
      if (p.type === "LAND" && d) {
        if (filters.minAcres && d.sizeAcres < Number(filters.minAcres)) return false
        if (filters.maxAcres && d.sizeAcres > Number(filters.maxAcres)) return false
        if (filters.usage !== "ALL" && d.usage !== filters.usage) return false
      }
      if (p.type === "COMMERCIAL" && d) {
        if (filters.purpose !== "ALL" && d.purpose !== filters.purpose) return false
        if (filters.minSqFt && d.floorArea < Number(filters.minSqFt)) return false
      }
      return true
    })
  }, [properties, filters])

  function setF(key, val) { setFilters(f => ({ ...f, [key]: val })) }

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.minPrice) n++
    if (filters.maxPrice) n++
    if (filters.bhk !== "ALL") n++
    if (filters.furnished) n++
    if (filters.gender !== "ALL") n++
    if (filters.sharing !== "ALL") n++
    if (filters.minAcres) n++
    if (filters.maxAcres) n++
    if (filters.usage !== "ALL") n++
    if (filters.purpose !== "ALL") n++
    if (filters.minSqFt) n++
    return n
  }, [filters])

  function clearFilters() { setFilters(EMPTY_FILTERS) }

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
          <Button onClick={() => navigate("/properties/new")} className="gap-1.5 text-white h-9" style={{ background: "var(--accent)" }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">List Property</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Search + filter bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[130px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="City…" value={city} onChange={e => setCity(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="relative flex-1 min-w-[130px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Area / locality…" value={area} onChange={e => setArea(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={type} onValueChange={v => { setType(v); setFilters(EMPTY_FILTERS) }}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="APARTMENT">Apartment</SelectItem>
                <SelectItem value="HOSTEL">Hostel</SelectItem>
                <SelectItem value="LAND">Land</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: "var(--accent)" }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 h-9 px-3 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="border-t border-slate-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">

                {/* Price range — always shown */}
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Price Range (₹)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="Min price" value={filters.minPrice} onChange={e => setF("minPrice", e.target.value)} className="h-9" />
                    <Input type="number" placeholder="Max price" value={filters.maxPrice} onChange={e => setF("maxPrice", e.target.value)} className="h-9" />
                  </div>
                </div>

                {/* Apartment filters */}
                {(type === "ALL" || type === "APARTMENT") && (
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Apartment</p>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {["ALL", "1", "2", "3", "4"].map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setF("bhk", b)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filters.bhk === b ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                          >
                            {b === "ALL" ? "Any BHK" : b === "4" ? "4+ BHK" : `${b} BHK`}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setF("furnished", !filters.furnished)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filters.furnished ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                      >
                        Furnished only
                      </button>
                    </div>
                  </div>
                )}

                {/* Hostel filters */}
                {(type === "ALL" || type === "HOSTEL") && (
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Hostel / PG</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={filters.gender} onValueChange={v => setF("gender", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Any gender</SelectItem>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="MIXED">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filters.sharing} onValueChange={v => setF("sharing", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sharing" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Any sharing</SelectItem>
                          <SelectItem value="SINGLE">Single</SelectItem>
                          <SelectItem value="DOUBLE">Double</SelectItem>
                          <SelectItem value="TRIPLE">Triple</SelectItem>
                          <SelectItem value="QUAD">Quad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Land filters */}
                {(type === "ALL" || type === "LAND") && (
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Land / Plot</p>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Min acres" value={filters.minAcres} onChange={e => setF("minAcres", e.target.value)} className="h-9" />
                        <Input type="number" placeholder="Max acres" value={filters.maxAcres} onChange={e => setF("maxAcres", e.target.value)} className="h-9" />
                      </div>
                      <Select value={filters.usage} onValueChange={v => setF("usage", v)}>
                        <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Usage type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Any usage</SelectItem>
                          <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                          <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                          <SelectItem value="AGRICULTURAL">Agricultural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Commercial filters */}
                {(type === "ALL" || type === "COMMERCIAL") && (
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Commercial</p>
                    <div className="space-y-2">
                      <Select value={filters.purpose} onValueChange={v => setF("purpose", v)}>
                        <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Purpose" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Any purpose</SelectItem>
                          <SelectItem value="COMMERCIAL">Commercial use</SelectItem>
                          <SelectItem value="RESIDENTIAL">Residential use</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Min floor area (sq ft)" value={filters.minSqFt} onChange={e => setF("minSqFt", e.target.value)} className="h-9" />
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">No properties found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or list a new property.</p>
            <Button className="mt-4 text-white gap-1.5" style={{ background: "var(--accent)" }} onClick={() => navigate("/properties/new")}>
              <Plus className="w-4 h-4" /> List a Property
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400">{filtered.length} {filtered.length === 1 ? "property" : "properties"} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
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
