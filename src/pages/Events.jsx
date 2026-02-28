import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Calendar, Users, Pencil, Trash2, LayoutGrid, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EventForm from "../components/events/EventForm";
import AssignmentPanel from "@/components/events/AssignmentPanel";
import EventCalendar from "@/components/events/EventCalendar";
import { useAppRole, CAN } from "@/components/auth/useAppRole";

const STATUS_LABELS = {
  draft: { label: "Borrador", cls: "bg-gray-100 text-gray-600" },
  published: { label: "Publicado", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En curso", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "Completado", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Event.list("-date_start", 100).then(data => {
      setEvents(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este evento?")) return;
    await base44.entities.Event.delete(id);
    load();
  };

  const filtered = events.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-500 mt-1">{events.length} eventos registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo evento
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay eventos</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(event => {
            const s = STATUS_LABELS[event.status] || STATUS_LABELS.draft;
            return (
              <div key={event.id} className="bg-white rounded-xl border hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900 leading-tight">{event.name}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-500">
                    {event.date_start && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(event.date_start), "d MMM yyyy · HH:mm", { locale: es })}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </div>
                    )}
                    {event.capacity && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Capacidad: {event.capacity} staff
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t px-5 py-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedEvent(event)}>
                    Ver staff
                  </Button>
                  <button onClick={() => { setEditing(event); setShowForm(true); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <EventForm
          event={editing}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {selectedEvent && (
        <AssignmentPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}