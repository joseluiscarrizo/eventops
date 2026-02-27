import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, CheckCircle2, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Event.list("-date_start", 50),
      base44.entities.StaffMember.list("-created_date", 100),
      base44.entities.Assignment.list("-created_date", 200),
    ]).then(([e, s, a]) => {
      setEvents(e);
      setStaff(s);
      setAssignments(a);
      setLoading(false);
    });
  }, []);

  const upcomingEvents = events.filter(e => e.status !== "cancelled" && e.status !== "completed").slice(0, 5);
  const checkedIn = assignments.filter(a => a.status === "checked_in").length;
  const confirmed = assignments.filter(a => a.status === "confirmed").length;
  const activeStaff = staff.filter(s => s.status === "active").length;

  const stats = [
    { label: "Eventos activos", value: upcomingEvents.length, icon: Calendar, color: "bg-indigo-500" },
    { label: "Staff activo", value: activeStaff, icon: Users, color: "bg-emerald-500" },
    { label: "Confirmados", value: confirmed, icon: Clock, color: "bg-amber-500" },
    { label: "Check-ins hoy", value: checkedIn, icon: CheckCircle2, color: "bg-blue-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general de operaciones</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Próximos eventos
          </h2>
          <Link to={createPageUrl("Events")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))
          ) : upcomingEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay eventos próximos</div>
          ) : (
            upcomingEvents.map(event => (
              <Link key={event.id} to={createPageUrl(`Events?id=${event.id}`)} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    {event.date_start ? format(new Date(event.date_start), "MMM", { locale: es }) : "—"}
                  </span>
                  <span className="text-lg font-bold text-indigo-700 leading-none">
                    {event.date_start ? format(new Date(event.date_start), "d") : "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{event.name}</div>
                  <div className="text-sm text-gray-500 truncate">{event.location || "Sin ubicación"}</div>
                </div>
                <StatusBadge status={event.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: "bg-gray-100 text-gray-600",
    published: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const labels = {
    draft: "Borrador",
    published: "Publicado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${map[status] || map.draft}`}>
      {labels[status] || status}
    </span>
  );
}