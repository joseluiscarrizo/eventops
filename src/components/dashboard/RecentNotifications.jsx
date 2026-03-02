import { Bell, Package, CalendarCheck, UserCheck, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_CONFIG = {
  order_alert:     { icon: Package,      cls: "bg-amber-100 text-amber-600" },
  event_reminder:  { icon: CalendarCheck,cls: "bg-indigo-100 text-indigo-600" },
  assignment:      { icon: UserCheck,    cls: "bg-emerald-100 text-emerald-600" },
  general:         { icon: Info,         cls: "bg-gray-100 text-gray-600" },
};

export default function RecentNotifications({ notifications, loading }) {
  const recent = notifications
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 6);

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-xl border">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-500" /> Notificaciones recientes
          {unread > 0 && (
            <span className="ml-1 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{unread} nuevas</span>
          )}
        </h2>
      </div>
      <div className="divide-y">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-100 rounded w-1/3" /></div>
            </div>
          ))
        ) : recent.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Sin notificaciones</div>
        ) : (
          recent.map(notif => {
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
            const Icon = cfg.icon;
            return (
              <div key={notif.id} className={`flex items-start gap-3 p-4 ${!notif.read ? "bg-indigo-50/40" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{notif.title}</div>
                  <div className="text-xs text-gray-500 truncate">{notif.message}</div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {notif.created_date ? formatDistanceToNow(new Date(notif.created_date), { locale: es, addSuffix: true }) : ""}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}