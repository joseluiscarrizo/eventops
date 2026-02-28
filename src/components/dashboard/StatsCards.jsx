import { Calendar, Users, CheckCircle2, Clock, ClipboardList, UserMinus } from "lucide-react";

const STATS = [
  { key: "activeEvents",    label: "Eventos activos",    icon: Calendar,      color: "bg-indigo-500" },
  { key: "pendingOrders",   label: "Pedidos pendientes", icon: ClipboardList, color: "bg-amber-500" },
  { key: "activePersonal",  label: "Personal activo",    icon: Users,         color: "bg-emerald-500" },
  { key: "pendingAbsences", label: "Ausencias pendientes", icon: UserMinus,   color: "bg-rose-500" },
  { key: "confirmedShifts", label: "Turnos confirmados", icon: CheckCircle2,  color: "bg-blue-500" },
  { key: "todayShifts",     label: "Turnos hoy",         icon: Clock,         color: "bg-violet-500" },
];

export default function StatsCards({ data, loading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STATS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? <span className="inline-block w-6 h-6 bg-gray-100 rounded animate-pulse" /> : data[key] ?? 0}
            </div>
            <div className="text-xs text-gray-500 leading-tight">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}