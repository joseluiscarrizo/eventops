import { useState } from "react";
import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, isSameDay, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROFILE_COLORS = {
  camarero: "bg-blue-100 text-blue-800 border-blue-200",
  cocinero: "bg-orange-100 text-orange-800 border-orange-200",
  ayudante_cocina: "bg-yellow-100 text-yellow-800 border-yellow-200",
  coctelero: "bg-purple-100 text-purple-800 border-purple-200",
  azafata: "bg-pink-100 text-pink-800 border-pink-200",
};

const PROFILE_LABELS = {
  camarero: "Camarero",
  cocinero: "Cocinero",
  ayudante_cocina: "Ayud. cocina",
  coctelero: "Coctelero",
  azafata: "Azafata",
};

export default function ShiftCalendar({ shifts, absences, onShiftClick, onDayClick }) {
  const [view, setView] = useState("month"); // month | week
  const [current, setCurrent] = useState(new Date());

  const shiftsByDate = {};
  shifts.forEach(s => {
    if (!shiftsByDate[s.date]) shiftsByDate[s.date] = [];
    shiftsByDate[s.date].push(s);
  });

  const absencesByDate = {};
  absences.forEach(a => {
    // expand absence range
    if (!a.date_start || !a.date_end) return;
    try {
      const days = eachDayOfInterval({ start: new Date(a.date_start), end: new Date(a.date_end) });
      days.forEach(d => {
        const key = format(d, "yyyy-MM-dd");
        if (!absencesByDate[key]) absencesByDate[key] = [];
        absencesByDate[key].push(a);
      });
    } catch {}
  });

  const getDays = () => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
  };

  const navigate = (dir) => {
    if (view === "month") setCurrent(d => addMonths(d, dir));
    else setCurrent(d => addWeeks(d, dir));
  };

  const days = getDays();

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-gray-800 min-w-36 text-center">
            {view === "month"
              ? format(current, "MMMM yyyy", { locale: es })
              : `${format(days[0], "d MMM", { locale: es })} – ${format(days[6], "d MMM yyyy", { locale: es })}`}
          </h2>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrent(new Date())} className="ml-2 text-xs text-indigo-600 hover:underline">Hoy</button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>Mes</Button>
          <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Semana</Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 ${view === "week" ? "min-h-48" : ""}`}>
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayShifts = shiftsByDate[key] || [];
          const dayAbsences = absencesByDate[key] || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = view === "week" || isSameMonth(day, current);

          return (
            <div
              key={key}
              onClick={() => onDayClick && onDayClick(key)}
              className={`min-h-24 p-1.5 border-b border-r cursor-pointer hover:bg-gray-50 transition-colors
                ${!isCurrentMonth ? "bg-gray-50/60" : ""}
                ${view === "week" ? "min-h-48" : ""}
              `}
            >
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? "bg-indigo-600 text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-400"}`}>
                {format(day, "d")}
              </div>

              {/* Absences */}
              {dayAbsences.length > 0 && (
                <div className="mb-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 truncate">
                  ⚠ {dayAbsences.length} ausencia{dayAbsences.length > 1 ? "s" : ""}
                </div>
              )}

              {/* Shifts */}
              <div className="space-y-0.5">
                {dayShifts.slice(0, view === "week" ? 10 : 3).map(s => (
                  <div
                    key={s.id}
                    onClick={e => { e.stopPropagation(); onShiftClick(s); }}
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium truncate cursor-pointer hover:opacity-80 ${PROFILE_COLORS[s.profile_required] || "bg-gray-100 text-gray-700"}`}
                  >
                    {s.time_start} {s.title || PROFILE_LABELS[s.profile_required]}
                  </div>
                ))}
                {view === "month" && dayShifts.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">+{dayShifts.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-t bg-gray-50">
        {Object.entries(PROFILE_COLORS).map(([k, cls]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded border ${cls}`} />
            <span className="text-xs text-gray-600">{PROFILE_LABELS[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}