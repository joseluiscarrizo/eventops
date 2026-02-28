import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, parseISO, isWithinInterval, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar, CalendarRange, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_CONFIG = {
  day:        { label: "Día concreto",      icon: "📅", color: "bg-blue-500",    light: "bg-blue-100 text-blue-800",    border: "border-blue-300" },
  day_hours:  { label: "Día + Horas",       icon: "🕐", color: "bg-cyan-500",    light: "bg-cyan-100 text-cyan-800",    border: "border-cyan-300" },
  range:      { label: "Rango de días",     icon: "📆", color: "bg-emerald-500", light: "bg-emerald-100 text-emerald-800", border: "border-emerald-300" },
  range_hours:{ label: "Rango + Horas",     icon: "⏱️", color: "bg-teal-500",    light: "bg-teal-100 text-teal-800",    border: "border-teal-300" },
  week:       { label: "Semana completa",   icon: "🗓️", color: "bg-indigo-500",  light: "bg-indigo-100 text-indigo-800", border: "border-indigo-300" },
  week_hours: { label: "Semana + Horas",    icon: "📋", color: "bg-violet-500",  light: "bg-violet-100 text-violet-800", border: "border-violet-300" },
  weekdays:   { label: "Días de la semana", icon: "📅", color: "bg-orange-500",  light: "bg-orange-100 text-orange-800", border: "border-orange-300" },
  weekdays_h: { label: "Días sem. + Horas", icon: "⏰", color: "bg-red-500",     light: "bg-red-100 text-red-800",      border: "border-red-300" },
  month:      { label: "Mes completo",      icon: "📅", color: "bg-purple-500",  light: "bg-purple-100 text-purple-800", border: "border-purple-300" },
};

const EMPTY_SLOT = { type: "day", date_start: "", date_end: "", time_start: "", time_end: "", label: "", weekdays: [] };

const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function needsEndDate(type) { return ["range", "range_hours", "week", "week_hours", "month"].includes(type); }
function needsTime(type) { return ["day_hours", "range_hours", "week_hours", "weekdays_h"].includes(type); }
function needsWeekdays(type) { return ["weekdays", "weekdays_h"].includes(type); }

function slotCoversDay(s, dayStr) {
  if (s.type === "day" || s.type === "day_hours") return s.date_start === dayStr;
  if (s.type === "weekdays" || s.type === "weekdays_h") {
    const d = new Date(dayStr + "T00:00:00");
    const dow = (d.getDay() + 6) % 7;
    return s.weekdays?.includes(dow);
  }
  if (s.date_start && s.date_end) return dayStr >= s.date_start && dayStr <= s.date_end;
  return false;
}

function slotSummary(s) {
  const cfg = TYPE_CONFIG[s.type] || TYPE_CONFIG.day;
  const label = s.label || cfg.label;
  let dates = "";
  if (needsWeekdays(s.type)) {
    dates = s.weekdays?.map(d => DAY_NAMES_FULL[d]).join(", ") || "";
  } else {
    dates = s.date_start || "";
    if (needsEndDate(s.type) && s.date_end && s.date_end !== s.date_start) dates += ` → ${s.date_end}`;
  }
  let times = "";
  if (needsTime(s.type) && s.time_start) times = ` ${s.time_start}${s.time_end ? `–${s.time_end}` : ""}`;
  return { label, dates, times, cfg };
}

export default function AvailabilityCalendar({ value = [], onChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [newSlot, setNewSlot] = useState({ ...EMPTY_SLOT });
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const getSlotsForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return value.filter(s => slotCoversDay(s, dayStr));
  };

  const handleDayClick = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    setSelectedDay(dayStr);
    setNewSlot({ ...EMPTY_SLOT, date_start: dayStr });
    setShowForm(true);
  };

  const handleTypeChange = (type) => {
    setNewSlot(s => ({
      ...s,
      type,
      date_end: needsEndDate(type) ? s.date_end : "",
      time_start: needsTime(type) ? s.time_start : "",
      time_end: needsTime(type) ? s.time_end : "",
      weekdays: needsWeekdays(type) ? s.weekdays : []
    }));
  };

  const addSlot = () => {
    if (needsWeekdays(newSlot.type)) {
      if (!newSlot.weekdays?.length) return;
    } else {
      if (!newSlot.date_start) return;
    }
    const slot = { ...newSlot };
    if (!needsEndDate(slot.type)) { slot.date_end = slot.date_start; }
    if (!needsTime(slot.type)) { slot.time_start = ""; slot.time_end = ""; }
    if (!needsWeekdays(slot.type)) { slot.weekdays = []; }
    onChange([...value, slot]);
    setNewSlot({ ...EMPTY_SLOT });
    setShowForm(false);
    setSelectedDay(null);
  };

  const removeSlot = (idx) => onChange(value.filter((_, i) => i !== idx));

  const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold capitalize hover:text-indigo-600 transition-colors">
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </button>
        <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_NAMES.map(n => (
            <div key={n} className="text-center text-xs font-medium text-gray-500 py-2">{n}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const slots = getSlotsForDay(day);
            const inMonth = isSameMonth(day, currentDate);
            const dayStr = format(day, "yyyy-MM-dd");
            const isSelected = selectedDay === dayStr;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[52px] p-1 text-left border-b border-r border-gray-100 transition-colors hover:bg-blue-50 group
                  ${!inMonth ? "opacity-30" : ""}
                  ${isToday(day) ? "bg-indigo-50" : "bg-white"}
                  ${isSelected ? "ring-2 ring-inset ring-blue-400" : ""}
                `}
              >
                <span className={`text-xs block mb-0.5 ${isToday(day) ? "bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold" : "text-gray-500"}`}>
                  {format(day, "d")}
                </span>
                <div className="space-y-0.5">
                  {slots.slice(0, 2).map((s, si) => {
                    const cfg = TYPE_CONFIG[s.type] || TYPE_CONFIG.day;
                    return (
                      <div key={si} className={`text-white text-[8px] px-1 rounded truncate ${cfg.color}`}>
                        {s.time_start || s.label || TYPE_CONFIG[s.type]?.label || ""}
                      </div>
                    );
                  })}
                  {slots.length > 2 && <div className="text-[8px] text-gray-400">+{slots.length - 2}</div>}
                  {slots.length === 0 && (
                    <div className="text-[8px] text-gray-300 group-hover:text-blue-400 transition-colors text-center">+</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-blue-800">Nueva disponibilidad</span>
            <button type="button" onClick={() => { setShowForm(false); setSelectedDay(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tipo */}
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block font-medium">Tipo de disponibilidad</label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleTypeChange(k)}
                  className={`text-xs px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    newSlot.type === k
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Días de la semana */}
          {needsWeekdays(newSlot.type) && (
            <div>
              <label className="text-xs text-gray-600 mb-2 block font-medium">Selecciona días *</label>
              <div className="grid grid-cols-4 gap-1.5">
                {DAY_NAMES_FULL.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewSlot(s => ({
                      ...s,
                      weekdays: s.weekdays?.includes(idx) ? s.weekdays.filter(d => d !== idx) : [...(s.weekdays || []), idx]
                    }))}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                      newSlot.weekdays?.includes(idx)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fechas */}
          {!needsWeekdays(newSlot.type) && (
            <div className={`grid gap-2 ${needsEndDate(newSlot.type) ? "grid-cols-2" : "grid-cols-1"}`}>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{needsEndDate(newSlot.type) ? "Fecha inicio *" : "Fecha *"}</label>
                <Input type="date" className="h-8 text-xs" value={newSlot.date_start} onChange={e => setNewSlot(s => ({ ...s, date_start: e.target.value }))} />
              </div>
              {needsEndDate(newSlot.type) && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Fecha fin *</label>
                  <Input type="date" className="h-8 text-xs" value={newSlot.date_end} min={newSlot.date_start} onChange={e => setNewSlot(s => ({ ...s, date_end: e.target.value }))} />
                </div>
              )}
            </div>
          )}

          {/* Horas */}
          {needsTime(newSlot.type) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Hora inicio</label>
                <Input type="time" className="h-8 text-xs" value={newSlot.time_start} onChange={e => setNewSlot(s => ({ ...s, time_start: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Hora fin</label>
                <Input type="time" className="h-8 text-xs" value={newSlot.time_end} min={newSlot.time_start} onChange={e => setNewSlot(s => ({ ...s, time_end: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Etiqueta */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Etiqueta <span className="text-gray-400">(opcional)</span></label>
            <Input className="h-8 text-xs" value={newSlot.label} onChange={e => setNewSlot(s => ({ ...s, label: e.target.value }))} placeholder="Ej: Disponible mañanas" />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowForm(false); setSelectedDay(null); }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white">Cancelar</button>
            <button
              type="button"
              onClick={addSlot}
              disabled={needsWeekdays(newSlot.type) ? !newSlot.weekdays?.length : !newSlot.date_start}
              className="text-xs px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Slots list */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Disponibilidades registradas ({value.length})</p>
          {value.map((s, i) => {
            const { label, dates, times, cfg } = slotSummary(s);
            return (
              <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${cfg.light} ${cfg.border}`}>
                <span className="font-semibold">{cfg.icon}</span>
                <span className="font-medium truncate">{label}</span>
                {dates && <span className="text-gray-500 truncate">{dates}</span>}
                {times && <span className="font-medium flex items-center gap-0.5"><Clock className="w-3 h-3" />{times}</span>}
                <button type="button" onClick={() => removeSlot(i)} className="ml-auto flex-shrink-0 opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => { setNewSlot({ ...EMPTY_SLOT }); setShowForm(true); setSelectedDay(null); }}
          className="w-full text-xs text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" /> Añadir disponibilidad manualmente
        </button>
      )}
    </div>
  );
}