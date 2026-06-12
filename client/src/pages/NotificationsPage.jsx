import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Bell, ArrowLeft, Loader2, CheckCircle2, XCircle,
  Calendar, Ban, CheckCheck
} from "lucide-react"

const TYPE_META = {
  BOOKING_RECEIVED:  { icon: Calendar,      color: "text-violet-600",  bg: "bg-violet-50",  label: "New Request"   },
  BOOKING_ACCEPTED:  { icon: CheckCircle2,  color: "text-green-600",   bg: "bg-green-50",   label: "Accepted"      },
  BOOKING_REJECTED:  { icon: XCircle,       color: "text-red-500",     bg: "bg-red-50",     label: "Declined"      },
  BOOKING_CANCELLED: { icon: Ban,           color: "text-slate-500",   bg: "bg-slate-100",  label: "Withdrawn"     },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) { navigate("/login"); return }
    apiFetch("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }, [navigate])

  async function markRead(id) {
    await apiFetch(`/notifications/${id}/read`, { method: "PUT" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
  }

  async function markAllRead() {
    setMarkingAll(true)
    await apiFetch("/notifications/read-all", { method: "PUT" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setMarkingAll(false)
  }

  function handleClick(notif) {
    if (!notif.isRead) markRead(notif.id)
    if (notif.link) navigate(notif.link)
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
                <Bell className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--accent)" }}>
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead} disabled={markingAll} className="gap-1.5 text-xs">
              {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {notifications === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bell className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-slate-500 font-medium">No notifications yet</p>
            <p className="text-sm text-slate-400">Booking updates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.BOOKING_RECEIVED
              const Icon = meta.icon
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm ${
                    n.isRead
                      ? "bg-white border-slate-100"
                      : "bg-white border-violet-200 shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
