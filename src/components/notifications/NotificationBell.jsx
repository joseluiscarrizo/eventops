import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X, CheckCheck } from "lucide-react";

const TYPE_COLORS = {
  assignment: "bg-blue-50 border-blue-200 text-blue-700",
  event_reminder: "bg-indigo-50 border-indigo-200 text-indigo-700",
  order_alert: "bg-amber-50 border-amber-200 text-amber-700",
  general: "bg-gray-50 border-gray-200 text-gray-700",
};

const TYPE_ICONS = {
  assignment: "👤",
  event_reminder: "📅",
  order_alert: "⚠️",
  general: "🔔",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const all = await base44.entities.Notification.list("-created_date", 30);
    setNotifications(all);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadOnes = notifications.filter(n => !n.read);
    await Promise.all(unreadOnes.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id) => {
    await base44.entities.Notification.delete(id);
    setNotifications(ns => ns.filter(n => n.id !== id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="font-semibold text-gray-800 text-sm">Notificaciones</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Leer todas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Sin notificaciones</div>
              ) : notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold truncate ${!n.read ? "text-gray-900" : "text-gray-600"}`}>{n.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {n.created_date ? new Date(n.created_date).toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}