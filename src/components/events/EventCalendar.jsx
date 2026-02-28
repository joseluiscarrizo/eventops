import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  isSameDay, isSameMonth, startOfDay, addHours, parseISO,
  setHours, setMinutes
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";

const STATUS_COLORS = {
  draft:       "bg-gray-400",
  published:   "bg-blue-500",
  in_progress: "bg-amber-500",
  completed:   "bg-emerald-500",
  cancelled:   "bg-red-400",
};
const STATUS_LABELS = {
  draft: "Borrador", published: "Publicado", in_progress: "En curso",
  completed: "Completado", cancelled: "Cancelado",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function EventPill({ event, onClick }) {
  const color = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate text-white font-medium ${color} hover:opacity-90 transition-opacity`}
      title={event.name}
    >
      {event.date_start && format(parseISO(event.date_start), "HH:mm")} {event.name}
    </button>
  );
}

// ── MONTH VIEW ────────────────────────────────────────────────────────────────
function MonthView({ currentDate, events, onEventClick, onDayClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const eventsForDay = (day) =>
    events.filter(e => e.date_start && isSameDay(parseISO(e.date_start), day));

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {DAY_NAMES_SHORT.map(n => (
          <div key={n} className="py-2 text-center text-xs font-semibold text-gray-500">{n}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map(day => {
          const dayEvents = eventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-[90px] border-b border-r p-1 cursor-pointer hover:bg-indigo-50/30 transition-colors
                ${!inMonth ? "bg-gray-50/60" : "bg-white"}`}
            >
              <span className={`text-xs font-semibold inline-flex w-6 h-6 items-center justify-center rounded-full mb-1
                ${isToday ? "bg-indigo-600 text-white" : inMonth ? "text-gray-700" : "text-gray-300"}`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventPill key={ev.id} event={ev} onClick={onEventClick} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WEEK VIEW ─────────────────────────────────────────────────────────────────
function WeekView({ currentDate, events, onEventClick }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsForDayHour = (day, hour) =>
    events.filter(e => {
      if (!e.date_start) return false;
      const d = parseISO(e.date_start);
      return isSameDay(d, day) && d.getHours() === hour;
    });

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-10">
        <div className="py-2" />
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="py-2 text-center">
              <div className="text-xs text-gray-500">{format(day, "EEE", { locale: es })}</div>
              <div className={`text-sm font-semibold inline-flex w-7 h-7 items-center justify-center rounded-full mx-auto
                ${isToday ? "bg-indigo-600 text-white" : "text-gray-700"}`}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-8">
        {/* Time column */}
        <div>
          {HOURS.map(h => (
            <div key={h} className="h-14 border-b flex items-start justify-end pr-2 pt-1">
              <span className="text-xs text-gray-400">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map(day => (
          <div key={day.toISOString()} className="border-l">
            {HOURS.map(h => {
              const slotEvents = eventsForDayHour(day, h);
              return (
                <div key={h} className="h-14 border-b p-0.5 space-y-0.5">
                  {slotEvents.map(ev => (
                    <EventPill key={ev.id} event={ev} onClick={onEventClick} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DAY VIEW ──────────────────────────────────────────────────────────────────
function DayView({ currentDate, events, onEventClick }) {
  const dayEvents = events.filter(e => e.date_start && isSameDay(parseISO(e.date_start), currentDate));

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[80px_1fr]">
        {HOURS.map(h => {
          const slotEvents = dayEvents.filter(e => parseISO(e.date_start).getHours() === h);
          return (
            <>
              <div key={`t-${h}`} className="h-16 border-b flex items-start justify-end pr-3 pt-1">
                <span className="text-xs text-gray-400">{String(h).padStart(2, "0")}:00</span>
              </div>
              <div key={`c-${h}`} className="h-16 border-b border-l p-1 space-y-0.5">
                {slotEvents.map(ev => (
                  <EventPill key={ev.id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}

// ── EVENT DETAIL MODAL ────────────────────────────────────────────────────────
function EventDetailModal({ event, canEdit, onEdit, onClose }) {
  if (!event) return null;
  const color = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className={`h-2 rounded-t-2xl ${color}`} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{event.name}</h2>
            <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 text-white ${color}`}>
              {STATUS_LABELS[event.status] || "—"}
            </span>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            {event.date_start && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>
                  {format(parseISO(event.date_start), "EEEE d MMM yyyy · HH:mm", { locale: es })}
                  {event.date_end && ` – ${format(parseISO(event.date_end), "HH:mm")}`}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span>{event.location}</span>
              </div>
            )}
            {event.capacity && (
              <div className="text-gray-500">Capacidad: <strong>{event.capacity}</strong> staff</div>
            )}
            {event.description && (
              <p className="text-gray-500 mt-2 border-t pt-3">{event.description}</p>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cerrar
            </button>
            {canEdit && (
              <button onClick={() => { onEdit(event); onClose(); }} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                Editar evento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN CALENDAR ─────────────────────────────────────────────────────────────
export default function EventCalendar({ events, canEdit, onEditEvent }) {
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const prev = () => {
    if (view === "month") setCurrentDate(d => subMonths(d, 1));
    else if (view === "week") setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, -1));
  };
  const next = () => {
    if (view === "month") setCurrentDate(d => addMonths(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };
  const today = () => setCurrentDate(new Date());

  const headerTitle = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: es });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM yyyy", { locale: es })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: es });
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 600 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50 flex-wrap">
        <button onClick={today} className="text-xs px-3 py-1.5 rounded-lg border bg-white font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          Hoy
        </button>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <span className="font-semibold text-gray-800 text-sm capitalize">{headerTitle()}</span>
        <div className="ml-auto flex gap-1 bg-gray-200 p-1 rounded-lg">
          {[["month", "Mes"], ["week", "Semana"], ["day", "Día"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === v ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={setSelectedEvent}
          onDayClick={(day) => { setCurrentDate(day); setView("day"); }}
        />
      )}
      {view === "week" && (
        <WeekView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />
      )}
      {view === "day" && (
        <DayView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          canEdit={canEdit}
          onEdit={onEditEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}