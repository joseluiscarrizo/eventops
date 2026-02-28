import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, addDays, startOfToday } from "date-fns";
import { es } from "date-fns/locale";

export default function ShiftsOccupancy({ shifts, assignments, loading }) {
  const today = startOfToday();

  const data = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const dateStr = format(day, "yyyy-MM-dd");
    const dayShifts = shifts.filter(s => s.date === dateStr);
    const totalSlots = dayShifts.reduce((sum, s) => sum + (s.slots || 1), 0);
    const assigned = dayShifts.reduce((sum, s) => {
      const count = assignments.filter(a => a.shift_id === s.id && a.status !== "cancelled").length;
      return sum + count;
    }, 0);
    return {
      day: format(day, "EEE d", { locale: es }),
      Plazas: totalSlots,
      Asignados: assigned,
    };
  });

  return (
    <div className="bg-white rounded-xl border p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Ocupación de turnos (próximos 7 días)</h2>
      {loading ? (
        <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={14} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Plazas" fill="#e0e7ff" radius={[4,4,0,0]} />
            <Bar dataKey="Asignados" fill="#6366f1" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}