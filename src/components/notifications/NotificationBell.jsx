import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X, CheckCheck, Package, Calendar, UserCheck, AlertTriangle, MessageSquare } from "lucide-react";

const TYPE_CONFIG = {
  assignment: { icon: UserCheck,     bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-500"   },
  event_reminder: { icon: Calendar,  bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
  order_alert: { icon: Package,      bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "bg-amber-500"  },
  general: { icon: MessageSquare,    bg: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-700",   dot: "bg-gray-400"   },
};

function Toast({ notif, onDismiss }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
  const Icon = cfg.icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border ${cfg.bg} ${cfg.border} max-w-sm w-full pointer-events-auto animate-in slide-in-from-right`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.dot} bg-opacity-20`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${cfg.text}`}>{notif.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
      </div>
      <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const userEmailRef = useRef(null);

  const load = async () => {
    const all = await base44.entities.Notification.list("-created_date", 50);
    setNotifications(all);
  };

  useEffect(() => {
    base44.auth.me().then(u => { userEmailRef.current = u?.email; });
    load();

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create") {
        const n = event.data;
        // Show toast only if relevant to current user (or no recipient = broadcast)
        if (!n.recipient_email || n.recipient_email === userEmailRef.current) {
          setToasts(prev => [...prev, { ...n, _toastId: Date.now() }]);
        }
        setNotifications(prev => [n, ...prev].slice(0, 50));
      } else {
        load();
      }
    });
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

  const dismissToast = (toastId) => {
    setToasts(prev => prev.filter(t => t._toastId !== toastId));
  };

  return (
    <>
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <Toast key={t._toastId} notif={t} onDismiss={() => dismissToast(t._toastId)} />
        ))}
      </div>

      {/* Bell button */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="relative p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Bell className={`w-5 h-5 ${unread > 0 ? "animate-bounce" : ""}`} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-xl border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <span className="font-semibold text-gray-800 text-sm">
                  Notificaciones {unread > 0 && <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
                </span>
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

              <div className="max-h-[28rem] overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Sin notificaciones
                  </div>
                ) : notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={`p-3 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/40" : ""}`}
                      onClick={() => markRead(n.id)}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.dot} bg-opacity-15`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold truncate ${!n.read ? "text-gray-900" : "text-gray-500"}`}>{n.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {n.created_date ? new Date(n.created_date).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                        className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}