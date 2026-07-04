import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2, Home, Calendar, MessageSquare, Heart,
  Bell, LogOut, ChevronRight, ChevronLeft, Plus,
  User, Phone, Mail, Pencil, Check, X, Loader2, Users
} from "lucide-react"

const SLIDES = [
  {
    title: "Find Your Perfect Apartment",
    description: "Modern flats and luxury apartments in premium locations across the city. Verified listings, zero brokerage.",
    cta: "Browse Apartments",
    action: "APARTMENT",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&q=90",
    tag: "Apartments",
    accent: "#7c3aed",
  },
  {
    title: "Prime Land & Plots",
    description: "Agricultural, residential, and commercial land for direct sale at competitive prices. GPS verified.",
    cta: "Explore Plots",
    action: "LAND",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=90",
    tag: "Land / Plots",
    accent: "#10b981",
  },
  {
    title: "Hostels & PG Accommodations",
    description: "Affordable, safe, and comfortable shared living for students and working professionals.",
    cta: "Find a PG",
    action: "HOSTEL",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1600&q=90",
    tag: "Hostels & PGs",
    accent: "#8b5cf6",
  },
  {
    title: "Commercial Spaces for Rent",
    description: "Shops, showrooms, and office units in high-footfall commercial hubs. Ready to move in.",
    cta: "View Commercial",
    action: "COMMERCIAL",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=90",
    tag: "Commercial",
    accent: "#f59e0b",
  },
  {
    title: "Villas & Independent Houses",
    description: "Spacious villas and standalone homes for families seeking privacy, comfort, and prestige.",
    cta: "See Villas",
    action: "APARTMENT",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=90",
    tag: "Villas & Houses",
    accent: "#3b82f6",
  },
  {
    title: "List Your Property Today",
    description: "Reach thousands of verified buyers and tenants. Simple, fast, and free to list on NestFinder.",
    cta: "List Property",
    action: "LIST",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=90",
    tag: "For Owners",
    accent: "#7c3aed",
  },
]

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? "6%" : "-6%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? "-4%" : "4%", opacity: 0 }),
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay } }),
}

function HeroCarousel({ navigate }) {
  const [[current, dir], setSlide] = useState([0, 1])
  const [paused, setPaused] = useState(false)
  const AUTOPLAY_MS = 1000

  function goTo(idx) {
    setSlide(([c]) => (idx === c ? [c, dir] : [idx, idx > c ? 1 : -1]))
  }
  function goNext() { setSlide(([c, d]) => [(c + 1) % SLIDES.length, 1]) }
  function goPrev() { setSlide(([c, d]) => [(c - 1 + SLIDES.length) % SLIDES.length, -1]) }

  // Autoplay — advances on its own; arrows/dots are an optional manual override, not required
  useEffect(() => {
    if (paused) return
    const id = setInterval(goNext, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [current, paused])

  function handleCta(action) {
    if (action === "LIST") navigate("/properties/new")
    else navigate(`/properties?type=${action}`)
  }

  const slide = SLIDES[current]

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ height: "clamp(300px, 46vh, 500px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={current}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/10" />

          {/* Text content */}
          <div className="absolute inset-0 flex items-center">
            <div className="px-6 sm:px-12 lg:px-16 max-w-2xl w-full">
              {/* Tag chip */}
              <motion.div
                custom={0.2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white mb-4"
                style={{
                  background: `${slide.accent}55`,
                  border: `1px solid ${slide.accent}99`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: slide.accent }} />
                {slide.tag}
              </motion.div>

              {/* Heading */}
              <motion.h2
                custom={0.3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-3xl sm:text-4xl lg:text-[2.8rem] font-bold text-white leading-[1.15] mb-3"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)" }}
              >
                {slide.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                custom={0.4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-white/90 text-sm sm:text-base leading-relaxed mb-6 max-w-lg font-medium"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
              >
                {slide.description}
              </motion.p>

              {/* CTA */}
              <motion.button
                custom={0.5}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                onClick={() => handleCta(slide.action)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: slide.accent, boxShadow: `0 4px 24px ${slide.accent}55` }}
              >
                {slide.cta}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Progress bar */}
          {!paused && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-10">
              <motion.div
                key={`progress-${current}`}
                className="h-full"
                style={{ background: slide.accent }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Arrows — optional manual override, autoplay above keeps running without them */}
      <button
        onClick={goPrev}
        className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-black/55 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white transition-all hover:scale-110"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-black/55 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white transition-all hover:scale-110"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? 22 : 7,
              height: 7,
              borderRadius: 4,
              background: i === current ? "white" : "rgba(255,255,255,0.35)",
              transition: "all 0.35s ease",
            }}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute top-4 right-4 z-20 text-white/50 text-xs tabular-nums font-medium">
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg, onClick }) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3 ${onClick ? "hover:shadow-md hover:border-slate-200 transition-all cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  )
  return onClick ? <button onClick={onClick} className="text-left w-full">{inner}</button> : inner
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [propertyCount, setPropertyCount] = useState("—")
  const [bookingCount, setBookingCount] = useState("—")
  const [wishlistCount, setWishlistCount] = useState("—")
  const [unreadCount, setUnreadCount] = useState(0)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { navigate("/login"); return }
    try {
      const u = JSON.parse(stored)
      setUser(u)
      setProfile(u.profile || null)
      setEditName(u.profile?.name || "")
      setEditPhone(u.profile?.phone || "")
    } catch { navigate("/login"); return }

    // Fetch counts fresh on every mount
    apiFetch("/my-properties")
      .then((data) => setPropertyCount(data.length))
      .catch(() => setPropertyCount("0"))
    apiFetch("/bookings/my")
      .then((data) => setBookingCount(data.filter((b) => b.status === "PENDING").length))
      .catch(() => setBookingCount("0"))
    apiFetch("/notifications")
      .then((data) => setUnreadCount(data.filter((n) => !n.isRead).length))
      .catch(() => setUnreadCount(0))
    apiFetch("/wishlist")
      .then((data) => setWishlistCount(data.length))
      .catch(() => setWishlistCount("0"))
  }, [navigate])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const updated = await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
      })
      setProfile(updated.profile)
      localStorage.setItem("user", JSON.stringify(updated))
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  function handleLogout() {
    localStorage.removeItem("user")
    localStorage.removeItem("session")
    localStorage.removeItem("otp_email")
    navigate("/login")
  }

  if (!user) return null

  const displayName = profile?.name || user.email?.split("@")[0]
  const initials = (profile?.name || user.email || "U").slice(0, 2).toUpperCase()

  const stats = [
    { label: "My Properties", value: propertyCount, icon: Home, color: "#3b82f6", bg: "#eff6ff", onClick: () => navigate("/properties") },
    { label: "My Bookings", value: bookingCount, icon: Calendar, color: "#8b5cf6", bg: "#f5f3ff", onClick: () => navigate("/bookings") },
    { label: "Messages", value: "0", icon: MessageSquare, color: "#10b981", bg: "#ecfdf5" },
    { label: "Wishlist", value: wishlistCount, icon: Heart, color: "#f43f5e", bg: "#fff1f2", onClick: () => navigate("/wishlist") },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">NestFinder</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-white hidden sm:flex"
              style={{ background: "var(--accent)" }}
              onClick={() => navigate("/properties/new")}
            >
              <Plus className="w-3.5 h-3.5" />
              List Property
            </Button>
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--accent)" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)" }}
              title={user.email}
            >
              {initials}
            </button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 ml-1 hidden sm:flex">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
            <button
              onClick={handleLogout}
              className="sm:hidden w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Hero carousel */}
        <HeroCarousel navigate={navigate} />

        {/* Welcome row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Welcome back, {displayName} 👋</h1>
            <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
          </div>
          <Button
            className="gap-1.5 text-white hidden sm:flex"
            style={{ background: "var(--accent)" }}
            onClick={() => navigate("/properties/new")}
          >
            <Plus className="w-4 h-4" />
            List Property
          </Button>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/properties")}
            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 shrink-0">
              <Home className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">Browse all properties</p>
              <p className="text-xs text-slate-400">Search, filter, and explore listings</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
          <button
            onClick={() => navigate("/properties/new")}
            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-bg)" }}>
              <Plus className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">List a property</p>
              <p className="text-xs text-slate-400">Apartment, Hostel, Land, or Commercial</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
          <button
            onClick={() => navigate("/requests")}
            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 shrink-0">
              <Users className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">Booking requests</p>
              <p className="text-xs text-slate-400">Review and manage tenant requests</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
          <button
            onClick={() => navigate("/bookings")}
            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 shrink-0">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">My bookings</p>
              <p className="text-xs text-slate-400">Track your rental requests and queue position</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        </div>

        {/* My Profile */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">My Profile</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditing(false); setEditName(profile?.name || ""); setEditPhone(profile?.phone || "") }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: "var(--accent)" }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              {editing ? (
                <>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your full name"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Phone Number</label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 99999 00000"
                      className="h-9 text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="text-slate-800 font-medium">{profile?.name || <span className="text-slate-400 italic">No name set</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="text-slate-600">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className={profile?.phone ? "text-slate-600" : "text-slate-400 italic"}>
                      {profile?.phone || "No phone number set"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!editing && !profile?.name && (
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl">
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              Add your name and phone so buyers/renters can contact you directly.
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
