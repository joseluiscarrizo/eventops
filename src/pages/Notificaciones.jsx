import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCheck, Trash2, Package, Calendar, UserCheck, MessageSquare, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_CONFIG = {
  assignment:     { icon: UserCheck,    bg: "bg-blue-50",   dot: "bg-blue-500",   text: "text-blue-700",   label: "Asignaciones" },
  event_reminder: { icon: Calendar,    bg: "bg-indigo-50", dot: "bg-indigo-500", text: "text-indigo-700", label: "Eventos" },
  order_alert:    { icon: Package,     bg: "bg-amber-50",  dot: "bg-amber-500",  text: "text-amber-700",  label: "Pedidos" },
  general:        { icon: MessageSquare, bg: "bg-gray-50", dot: "bg-gray-400",   text: "text-gray-600",   label: "General" },
};

const PREF_TYPES = [
  { key: "assignment",     label: "Asignaciones",    description: "Cuando se te asigna a un turno o pedido" },
  { key: "event_reminder", label: "Recordatorios de eventos", description: "Alertas de eventos próximos" },
  { key: "order_alert",    label: "Alertas de pedidos",       description: "Cambios en el estado de pedidos" },
  { key: "general",        label: "General",                  description: "Mensajes y avisos generales" },
];

export default function Notificaciones() {
  const [notifications, setNotifications] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [prefId, setPrefId] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("history");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const [notifs, prefList] = await Promise.all([
      base44.entities.Notification.list("-created_date", 100),
      base44.entities.NotificationPreference.filter({ user_email: u.email })
    ]);
    setNotifications(notifs);
    if (prefList.length) {
      setPrefs(prefList[0]);
      setPrefId(prefList[0].id);
    } else {
      const defaults = {
        user_email: u.email,
        assignment_inapp: true, assignment_push: true,
        event_reminder_inapp: true, event_reminder_push: true,
        order_alert_inapp: true, order_alert_push: false,
        general_inapp: true, general_push: false,
      };
      setPrefs(defaults);
    }
    setLoading(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id) => {
    await base44.entities.Notification.delete(id);
    setNotifications(ns => ns.filter(n => n.id !== id));
  };

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const savePref = async (updated) => {
    setPrefs(updated);
    if (prefId) {
      await base44.entities.NotificationPreference.update(prefId, updated);
    } else {
      const created = await base44.entities.NotificationPreference.create(updated);
      setPrefId(created.id);
    }
  };

  const togglePref = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePref(updated);
  };

  const filtered = filterType === "all" ? notifications : notifications.filter(n => n.type === filterType);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500">Historial y preferencias</p>
        </div>
        {unread > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unread} no leídas</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[{ key: "history", label: "Historial", icon: Bell }, { key: "prefs", label: "Preferencias", icon: Settings }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-gray-50 flex-wrap">
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilterType("all")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterType === "all" ? "bg-indigo-600 text-white" : "bg-white border text-gray-500 hover:bg-gray-50"}`}
              >
                Todas
              </button>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilterType(k)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterType === k ? "bg-indigo-600 text-white" : "bg-white border text-gray-500 hover:bg-gray-50"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas leídas
              </button>
            )}
          </div>

          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : filtered.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/40" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${!n.read ? "text-gray-900" : "text-gray-500"}`}>{n.title}</span>
                      {!n.read && <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: es }) : ""}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "prefs" && prefs && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">¿Qué notificaciones quieres recibir?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configura cada tipo por canal (en la app o notificación push)</p>
          </div>
          <div className="divide-y">
            {PREF_TYPES.map(({ key, label, description }) => (
              <div key={key} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Toggle
                      label="En la app"
                      enabled={prefs[`${key}_inapp`]}
                      onToggle={() => togglePref(`${key}_inapp`)}
                    />
                    <Toggle
                      label="Push"
                      enabled={prefs[`${key}_push`]}
                      onToggle={() => togglePref(`${key}_push`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, enabled, onToggle }) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs text-gray-500">{label}</span>
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-colors relative ${enabled ? "bg-indigo-600" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}