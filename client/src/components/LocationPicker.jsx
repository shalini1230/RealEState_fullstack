import { useState, useRef } from "react"
import { Search, MapPin, Navigation, Loader2, X, CheckCircle2, Link as LinkIcon } from "lucide-react"
import { apiFetch } from "@/lib/api"

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    )
    const data = await res.json()
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

const COORD_PATTERNS = [
  /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/, // raw "lat, lng"
  /[@](-?\d+\.\d+),(-?\d+\.\d+)/,                              // .../@lat,lng,17z
  /[?&]q=(?:loc:)?(-?\d+\.\d+),(-?\d+\.\d+)/,                  // ?q=lat,lng or q=loc:lat,lng
  /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,                          // ?ll=lat,lng
  /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/,                       // api=1&query=lat,lng
]

function extractCoords(text) {
  for (const re of COORD_PATTERNS) {
    const m = text.match(re)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  }
  return null
}

const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl", "g.co"]

function extractEmbedUrl(text) {
  const iframeMatch = text.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  const candidate = (iframeMatch ? iframeMatch[1] : text.trim()).replace(/&amp;/g, "&")
  try {
    const url = new URL(candidate)
    const validHost = ["www.google.com", "google.com", "maps.google.com"].includes(url.hostname)
    if (validHost && url.pathname.startsWith("/maps/embed")) return candidate
  } catch { /* not a URL */ }
  return null
}

export default function LocationPicker({ onSelect, initialCoords = null, initialAddress = "", initialEmbedUrl = null, showLinkPaste = true }) {
  const [query, setQuery] = useState(initialAddress)
  const [mapQuery, setMapQuery] = useState(
    initialCoords ? `loc:${initialCoords.lat},${initialCoords.lng}` : ""
  )
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [coords, setCoords] = useState(initialCoords)
  const [address, setAddress] = useState(initialAddress)
  const [houseNumber, setHouseNumber] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [locatingMe, setLocatingMe] = useState(false)
  const [linkInput, setLinkInput] = useState("")
  const [linkError, setLinkError] = useState("")
  const [resolvingLink, setResolvingLink] = useState(false)
  const [embedInput, setEmbedInput] = useState("")
  const [embedUrl, setEmbedUrl] = useState(initialEmbedUrl)
  const [embedError, setEmbedError] = useState("")
  const debounceRef = useRef(null)

  const mapSrc = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : null

  const mapLink = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setConfirmed(false)
    clearTimeout(debounceRef.current)
    if (val.trim().length > 2) {
      debounceRef.current = setTimeout(() => runSearch(val.trim()), 500)
    } else {
      setSuggestions([])
      setMapQuery("")
    }
  }

  async function runSearch(q) {
    setSearching(true)
    setMapQuery(q)
    let results = []

    // Source 1 — Nominatim with India country code (fastest for major cities)
    if (!results.length) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&format=json&limit=5&addressdetails=1`
        const json = await fetch(url, { headers: { "Accept-Language": "en" } }).then(r => r.json())
        if (Array.isArray(json) && json.length) {
          results = json.map(item => ({
            lat: item.lat,
            lon: item.lon,
            display_name: item.display_name,
          }))
        }
      } catch { /* ignore */ }
    }

    // Source 2 — Photon (Komoot) with India bounding box (better for small towns/colonies)
    if (!results.length) {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en&bbox=68.1,7.9,97.4,35.5`
        const json = await fetch(url).then(r => r.json())
        if (json.features?.length) {
          results = json.features.map(f => ({
            lat: String(f.geometry.coordinates[1]),
            lon: String(f.geometry.coordinates[0]),
            display_name: [
              f.properties.name,
              f.properties.street,
              f.properties.city || f.properties.locality,
              f.properties.state,
              "India",
            ].filter(Boolean).join(", "),
          }))
        }
      } catch { /* ignore */ }
    }

    // Source 3 — ArcGIS World Geocoder (no API key, excellent India coverage)
    if (!results.length) {
      try {
        const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(q + ", India")}&f=json&outFields=Match_addr&maxLocations=5&countryCode=IND`
        const json = await fetch(url).then(r => r.json())
        if (json.candidates?.length) {
          results = json.candidates.map(c => ({
            lat: String(c.location.y),
            lon: String(c.location.x),
            display_name: c.address,
          }))
        }
      } catch { /* ignore */ }
    }

    setSuggestions(results)
    setSearching(false)
  }

  function pickSuggestion(item) {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    setCoords({ lat, lng })
    setAddress(item.display_name)
    setQuery(item.display_name)
    setMapQuery(`loc:${lat},${lng}`)
    setSuggestions([])
    setConfirmed(false)
  }

  const handleMyLocation = () => {
    if (!navigator.geolocation) return
    setLocatingMe(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        const lat = c.latitude
        const lng = c.longitude
        setCoords({ lat, lng })
        setMapQuery(`loc:${lat},${lng}`)
        setSuggestions([])
        setConfirmed(false)
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setQuery(addr)
        setLocatingMe(false)
      },
      () => setLocatingMe(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleLinkSubmit() {
    const text = linkInput.trim()
    if (!text) return
    setLinkError("")

    let found = extractCoords(text)

    if (!found) {
      try {
        const url = new URL(text)
        if (SHORT_LINK_HOSTS.includes(url.hostname)) {
          setResolvingLink(true)
          const { resolvedUrl } = await apiFetch(`/resolve-map-link?url=${encodeURIComponent(text)}`)
          found = extractCoords(resolvedUrl)
        }
      } catch { /* not a URL, fall through */ }
      finally {
        setResolvingLink(false)
      }
    }

    if (!found) {
      setLinkError('Couldn’t find coordinates in that link. Try pasting the full Google Maps link or plain "lat, lng".')
      return
    }

    setCoords(found)
    setMapQuery(`loc:${found.lat},${found.lng}`)
    setSuggestions([])
    setConfirmed(false)
    const addr = await reverseGeocode(found.lat, found.lng)
    setAddress(addr)
    setQuery(addr)
    setLinkInput("")
  }

  function handleEmbedSubmit() {
    const found = extractEmbedUrl(embedInput)
    if (!found) {
      setEmbedError('Paste the embed code or link from Google Maps → Share → Embed a map.')
      return
    }
    setEmbedError("")
    setEmbedUrl(found)
    setConfirmed(false)
  }

  function clearEmbed() {
    setEmbedUrl(null)
    setEmbedInput("")
    setEmbedError("")
    setConfirmed(false)
  }

  const handleConfirm = () => {
    if (!address && !query && !embedUrl) return
    setConfirmed(true)
    onSelect({
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address: houseNumber
        ? `${houseNumber}, ${address || query}`
        : (address || query),
      mapEmbedUrl: embedUrl ?? null,
    })
  }

  const showConfirmSection = mapQuery !== "" || coords !== null || address.length > 0 || embedUrl !== null
  const noResults = !searching && suggestions.length === 0 && mapQuery && !coords && query.length > 2

  return (
    <div className="space-y-3">

      {/* Search bar */}
      <div className="flex items-center gap-2 h-11 px-3 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
        {searching
          ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
          : <Search className="w-4 h-4 text-slate-400 shrink-0" />}
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search colony, landmark, area, city…"
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
        />
        {query && (
          <button type="button" onClick={() => {
            setQuery(""); setSuggestions([]); setCoords(null)
            setAddress(""); setMapQuery(""); setConfirmed(false)
          }}>
            <X className="w-4 h-4 text-slate-300 hover:text-slate-500" />
          </button>
        )}
      </div>

      {/* Suggestions — inline, pushes map down */}
      {suggestions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickSuggestion(item)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-violet-50 text-left border-b border-slate-100 last:border-0 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-700 leading-snug">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-700 mb-1">Location not found</p>
          <p className="text-xs text-amber-600">
            Try a nearby landmark or main road. Or use <strong>my current location</strong> if you are at the property.
          </p>
        </div>
      )}

      {/* GPS button */}
      <button
        type="button"
        onClick={handleMyLocation}
        disabled={locatingMe}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 hover:border-violet-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {locatingMe
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting your location…</>
          : <><Navigation className="w-4 h-4" /> Use my current location</>}
      </button>

      {/* Paste a Google Maps link or coordinates */}
      {showLinkPaste && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 h-11 px-3 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={linkInput}
              onChange={(e) => { setLinkInput(e.target.value); setLinkError("") }}
              onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
              placeholder="Paste a Google Maps link or “lat, lng”…"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={handleLinkSubmit}
              disabled={resolvingLink}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 shrink-0"
            >
              {resolvingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : "Locate"}
            </button>
          </div>
          {linkError && <p className="text-xs text-red-500">{linkError}</p>}
        </div>
      )}

      {/* Paste a Google Maps embed (Share → Embed a map) */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
          <LinkIcon className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          <textarea
            value={embedInput}
            onChange={(e) => { setEmbedInput(e.target.value); setEmbedError("") }}
            placeholder="Paste Google Maps → Share → Embed a map code (or just its link)…"
            rows={2}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleEmbedSubmit}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 shrink-0 mt-1"
          >
            Use this map
          </button>
        </div>
        {embedError && <p className="text-xs text-red-500">{embedError}</p>}
        {embedUrl && (
          <p className="text-xs text-green-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Custom embed map set
            <button type="button" onClick={clearEmbed} className="text-slate-400 hover:text-slate-600 underline ml-1">remove</button>
          </p>
        )}
      </div>

      {/* Map preview — click to open real Google Maps for directions */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative group"
        style={{ height: 240 }}
      >
        {embedUrl ? (
          <iframe
            title="Location Preview"
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
          />
        ) : mapSrc ? (
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full cursor-pointer"
          >
            <iframe
              key={mapSrc}
              title="Location Preview"
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0, pointerEvents: "none" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-3">
              <span className="bg-white text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <MapPin className="w-3 h-3" /> Open in Google Maps ↗
              </span>
            </div>
          </a>
        ) : (
          <div className="text-center space-y-2 px-6">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">Type a location or use GPS to see the map</p>
          </div>
        )}
      </div>

      {/* Confirm section */}
      {showConfirmSection && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${coords ? "text-green-500" : embedUrl ? "text-violet-500" : "text-amber-400"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs mb-0.5 font-medium ${coords ? "text-green-600" : embedUrl ? "text-violet-600" : "text-amber-600"}`}>
                {coords
                  ? `GPS pin · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                  : embedUrl
                  ? "Custom Google Maps embed"
                  : "Text address only (no GPS pin)"}
              </p>
              <p className="text-sm text-slate-700 leading-snug break-words">
                {address || query || (embedUrl && "Map embed provided, no address text")}
              </p>
            </div>
          </div>

          <input
            type="text"
            value={houseNumber}
            onChange={(e) => { setHouseNumber(e.target.value); setConfirmed(false) }}
            placeholder="House / Flat / Door No.  e.g. H.No 4-56"
            className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed}
            className={`w-full h-11 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm ${
              confirmed
                ? "bg-green-50 text-green-600 border-2 border-green-300"
                : "text-white hover:opacity-90 active:scale-[0.98]"
            }`}
            style={confirmed ? {} : { background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 16px #7c3aed44" }}
          >
            {confirmed
              ? <><CheckCircle2 className="w-4 h-4" /> Location Fixed ✓</>
              : <><MapPin className="w-4 h-4" /> Fix Location</>}
          </button>
        </div>
      )}
    </div>
  )
}
