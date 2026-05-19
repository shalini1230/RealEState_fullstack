import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2, Home, Calendar, MessageSquare, Heart,
  Bell, LogOut, ChevronRight, ShieldCheck, Plus,
  User, Phone, Mail, Pencil, Check, X, Loader2
} from "lucide-react"

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
    } catch { navigate("/login") }
  }, [navigate])

  useEffect(() => {
    if (!user) return
    apiFetch("/my-properties")
      .then((data) => setPropertyCount(data.length))
      .catch(() => setPropertyCount("0"))
  }, [user])

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
    { label: "Bookings", value: "0", icon: Calendar, color: "#8b5cf6", bg: "#f5f3ff" },
    { label: "Messages", value: "0", icon: MessageSquare, color: "#10b981", bg: "#ecfdf5" },
    { label: "Wishlist", value: "0", icon: Heart, color: "#f43f5e", bg: "#fff1f2" },
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
            <button className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
              <Bell className="w-4 h-4" />
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

        {/* Welcome banner */}
        <div
          className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #aa3bff 60%, #c084fc 100%)" }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium mb-4 backdrop-blur-sm">
                <ShieldCheck className="w-3 h-3" />
                NestFinder — Smart Real Estate Platform
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Welcome, {displayName}</h1>
              <p className="text-white/80 text-sm">{user.email}</p>
            </div>
            <button
              onClick={() => navigate("/properties")}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Browse Properties
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 right-24 w-32 h-32 bg-white/5 rounded-full" />
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
