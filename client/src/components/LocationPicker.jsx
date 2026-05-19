import { useState, useRef, useCallback } from "react"
import { Search, MapPin, Navigation, Loader2, X } from "lucide-react"

export default function LocationPicker({ onSelect }) {
  const [query, setQuery] = useState("")
  const [mapQuery, setMapQuery] = useState("")
  const [address, setAddress] = useState("")
  const [coords, setCoords] = useState(null)
  const [houseNumber, setHouseNumber] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [locatingMe, setLocatingMe] = useState(false)
  const debounceRef = useRef(null)

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setConfirmed(false)
    clearTimeout(debounceRef.current)
    if (val.trim().length > 2) {
      debounceRef.current = setTimeout(() => {
        setMapQuery(val.trim())
        setAddress(val.trim())
        setCoords(null)
      }, 700)
    } else if (!val.trim()) {
      setMapQuery("")
      setAddress("")
      setCoords(null)
    }
  }

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocatingMe(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        const lat = c.latitude
        const lng = c.longitude
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          )
          const data = await res.json()
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          setAddress(addr)
          setQuery(addr)
          setMapQuery(`${lat},${lng}`)
          setCoords({ lat, lng })
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
          setQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
          setMapQuery(`${lat},${lng}`)
          setCoords({ lat, lng })
        }
        setConfirmed(false)
        setLocatingMe(false)
      },
      () => setLocatingMe(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const handleConfirm = () => {
    setConfirmed(true)
    onSelect({
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address: houseNumber ? `${houseNumber}, ${address}` : address,
    })
  }

  const mapSrc = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : null

  return (
    <div className="space-y-3">

      {/* Search input */}
      <div className="flex items-center gap-2 h-11 px-3 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Type a location, venture, area or landmark…"
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setMapQuery(""); setAddress(""); setCoords(null); setConfirmed(false) }}
          >
            <X className="w-4 h-4 text-slate-300 hover:text-slate-500" />
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Type any location name — Google Maps will find it. Use <span className="text-violet-500 font-medium">My Location</span> for exact GPS pin.
      </p>

      {/* Use my location */}
      <button
        type="button"
        onClick={handleMyLocation}
        disabled={locatingMe}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-60 transition-colors"
      >
        {locatingMe
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Navigation className="w-3.5 h-3.5" />
        }
        {locatingMe ? "Detecting your location…" : "Use my current location"}
      </button>

      {/* Google Maps embed */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-slate-100"
        style={{ height: 300 }}
      >
        {mapSrc ? (
          <iframe
            key={mapSrc}
            title="Location Preview"
            src={mapSrc}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="text-center space-y-2 px-6">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">Type a location above to preview it on the map</p>
          </div>
        )}
      </div>

      {/* Address + house number + confirm */}
      {address && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">
                {coords ? "GPS location detected" : "Location from search"}
              </p>
              <p className="text-sm text-slate-700 leading-snug">{address}</p>
            </div>
          </div>

          <input
            type="text"
            value={houseNumber}
            onChange={(e) => { setHouseNumber(e.target.value); setConfirmed(false) }}
            placeholder="House / Flat / Door No.  e.g. H.No 4-56 / Flat 301"
            className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed}
            className={`w-full h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              confirmed
                ? "bg-green-50 text-green-600 border border-green-200"
                : "text-white"
            }`}
            style={confirmed ? {} : { background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
          >
            <MapPin className="w-4 h-4" />
            {confirmed ? "Location confirmed ✓" : "Confirm this location"}
          </button>
        </div>
      )}
    </div>
  )
}
