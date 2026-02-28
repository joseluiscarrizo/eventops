import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_MAP = {
  draft:       { label: "Borrador",   cls: "bg-gray-100 text-gray-600" },
  published:   { label: "Publicado",  cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En curso",   cls: "bg-amber-100 text-amber-700" },
  completed:   { label: "Completado", cls: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Cancelado",  cls: "bg-red-100 text-red-700" },
};

export default function UpcomingEvents({ events, loading }) {
  const upcoming = events
    .filter(e => e.status !== "cancelled" && e.status !== "completed")
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" /> Próximos eventos
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
              <div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-1/3" /><div className="h-3 bg-gray-100 rounded w-1/4" /></div>
            </div>
          ))
        ) : upcoming.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No hay eventos próximos</div>
        ) : (
          upcoming.map(event => {
            const s = STATUS_MAP[event.status] || STATUS_MAP.draft;
            return (
              <Link key={event.id} to={createPageUrl("Events")} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
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
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}