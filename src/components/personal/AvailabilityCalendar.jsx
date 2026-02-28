import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_LABELS = { day: "Día", week: "Semana", month: "Mes", range: "Rango" };
const TYPE_COLORS = {
  day: "bg-blue-500",
  week: "bg-indigo-500",
  month: "bg-purple-500",
  range: "bg-emerald-500",
};

export default function AvailabilityCalendar({ value = [], onChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [newSlot, setNewSlot] = useState({ type: "day", date_start: "", date_end: "", time_start: "", time_end: "", label: "" });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const getSlotsForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return value.filter(s => {
      if (s.type === "day") return s.date_start === dayStr;
      if (s.type === "range" || s.type === "week" || s.type === "month") {
        return dayStr >= s.date_start && dayStr <= s.date_end;
      }
      return false;
    });
  };

  const addSlot = () => {
    if (!newSlot.date_start) return;
    const slot = { ...newSlot, label: newSlot.label || TYPE_LABELS[newSlot.type] };
    onChange([...value, slot]);
    setNewSlot({ type: "day", date_start: "", date_end: "", time_start: "", time_end: "", label: "" });
    setShowForm(false);
  };

  const removeSlot = (idx) => onChange(value.filter((_, i) => i !== idx));

  const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</span>
        <button type="button" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
        {DAY_NAMES.map(n => (
          <div key={n} className="bg-gray-50 text-center text-xs font-medium text-gray-500 py-1">{n}</div>
        ))}
        {days.map((day, i) => {
          const slots = getSlotsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div key={i} className={`bg-white min-h-[48px] p-1 ${!inMonth ? "opacity-40" : ""} ${isToday(day) ? "ring-2 ring-inset ring-indigo-400" : ""}`}>
              <span className="text-xs text-gray-500">{format(day, "d")}</span>
              <div className="mt-0.5 space-y-0.5">
                {slots.slice(0, 2).map((s, si) => (
                  <div key={si} className={`text-white text-[9px] px-1 rounded truncate ${TYPE_COLORS[s.type] || "bg-gray-400"}`}>
                    {s.time_start ? s.time_start : s.label || TYPE_LABELS[s.type]}
                  </div>
                ))}
                {slots.length > 2 && <div className="text-[9px] text-gray-400">+{slots.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slots list */}
      {value.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {value.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLORS[s.type]}`} />
              <span className="font-medium">{s.label || TYPE_LABELS[s.type]}</span>
              <span className="text-gray-400">{s.date_start}{s.date_end && s.date_end !== s.date_start ? ` → ${s.date_end}` : ""}</span>
              {s.time_start && <span className="text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.time_start}{s.time_end ? `–${s.time_end}` : ""}</span>}
              <button type="button" onClick={() => removeSlot(i)} className="ml-auto text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="border rounded-lg p-3 space-y-3 bg-blue-50 border-blue-200">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Tipo</label>
              <Select value={newSlot.type} onValueChange={v => setNewSlot(s => ({ ...s, type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Etiqueta (opcional)</label>
              <Input className="h-8 text-xs" value={newSlot.label} onChange={e => setNewSlot(s => ({ ...s, label: e.target.value }))} placeholder="Ej: Disponible mañanas" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Fecha inicio *</label>
              <Input type="date" className="h-8 text-xs" value={newSlot.date_start} onChange={e => setNewSlot(s => ({ ...s, date_start: e.target.value }))} />
            </div>
            {newSlot.type !== "day" && (
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Fecha fin</label>
                <Input type="date" className="h-8 text-xs" value={newSlot.date_end} onChange={e => setNewSlot(s => ({ ...s, date_end: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Hora inicio</label>
              <Input type="time" className="h-8 text-xs" value={newSlot.time_start} onChange={e => setNewSlot(s => ({ ...s, time_start: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Hora fin</label>
              <Input type="time" className="h-8 text-xs" value={newSlot.time_end} onChange={e => setNewSlot(s => ({ ...s, time_end: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="button" onClick={addSlot} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Añadir</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full text-xs text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 hover:bg-blue-50 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Añadir disponibilidad
        </button>
      )}
    </div>
  );
}