import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Calendar, List, Pencil, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import ShiftForm from "@/components/shifts/ShiftForm";
import ShiftStaffAssigner from "@/components/shifts/ShiftStaffAssigner";
import ShiftCalendar from "@/components/shifts/ShiftCalendar";

const PROFILE_LABELS = {
  camarero: "Camarero/a",
  cocinero: "Cocinero/a",
  ayudante_cocina: "Ayudante cocina",
  coctelero: "Coctelero/a",
  azafata: "Azafata/o",
};

const STATUS_LABELS = { draft: "Borrador", published: "Publicado", completed: "Completado", cancelled: "Cancelado" };
const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PROFILE_COLORS = {
  camarero: "bg-blue-100 text-blue-800",
  cocinero: "bg-orange-100 text-orange-800",
  ayudante_cocina: "bg-yellow-100 text-yellow-800",
  coctelero: "bg-purple-100 text-purple-800",
  azafata: "bg-pink-100 text-pink-800",
};

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("calendar"); // calendar | list
  const [showForm, setShowForm] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [assignShift, setAssignShift] = useState(null);
  const [filterProfile, setFilterProfile] = useState("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [s, abs, assgn] = await Promise.all([
      base44.entities.Shift.list("-date", 500),
      base44.entities.Absence.filter({ status: "approved" }),
      base44.entities.ShiftAssignment.list("-created_date", 1000),
    ]);
    setShifts(s);
    setAbsences(abs);
    setAssignments(assgn);
    setLoading(false);
  };

  const handleDelete = async (shift) => {
    if (!confirm(`¿Eliminar el turno "${shift.title || shift.date}"?`)) return;
    await base44.entities.Shift.delete(shift.id);
    load();
  };

  const handleSave = () => {
    setShowForm(false);
    setEditShift(null);
    load();
  };

  const getAssignmentCount = (shiftId) => {
    return assignments.filter(a => a.shift_id === shiftId && a.status !== "cancelled").length;
  };

  const exportCSV = () => {
    const rows = [["Turno", "Fecha", "Inicio", "Fin", "Perfil", "Plazas", "Pedido", "Lugar", "Estado"]];
    const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach(s => {
      rows.push([
        s.title || "",
        s.date,
        s.time_start,
        s.time_end,
        PROFILE_LABELS[s.profile_required] || s.profile_required,
        s.slots || 1,
        s.order_name || "",
        s.location || "",
        STATUS_LABELS[s.status] || s.status,
      ]);
      // Add assignment rows
      const assigns = assignments.filter(a => a.shift_id === s.id && a.status !== "cancelled");
      assigns.forEach(a => {
        rows.push(["", "", "", "", "", "", `  → ${a.personal_name}`, `Estado: ${a.status}`, ""]);
      });
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horario_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredShifts = filterProfile === "all"
    ? shifts
    : shifts.filter(s => s.profile_required === filterProfile);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planificación de turnos</h1>
          <p className="text-sm text-gray-500 mt-1">{shifts.length} turno{shifts.length !== 1 ? "s" : ""} registrados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === "calendar" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <Calendar className="w-4 h-4" /> Calendario
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
          </div>
          <Button onClick={() => { setEditShift(null); setShowForm(true); }} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Nuevo turno
          </Button>
        </div>
      </div>

      {/* Profile filter */}
      <div className="flex gap-2 flex-wrap">
        {[["all", "Todos"], ...Object.entries(PROFILE_LABELS)].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterProfile(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterProfile === v
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && !loading && (
        <ShiftCalendar
          shifts={filteredShifts}
          absences={absences}
          onShiftClick={(s) => setAssignShift(s)}
          onDayClick={(date) => { setEditShift({ date }); setShowForm(true); }}
        />
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Cargando...</div>
          ) : filteredShifts.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No hay turnos. Crea el primero.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Turno</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Horario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Personal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredShifts].sort((a, b) => a.date.localeCompare(b.date)).map(s => {
                  const count = getAssignmentCount(s.id);
                  const slots = s.slots || 1;
                  return (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{s.title || "—"}</div>
                        {s.order_name && <div className="text-xs text-gray-400">{s.order_name}</div>}
                        {s.location && <div className="text-xs text-gray-400">{s.location}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.date}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.time_start} – {s.time_end}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROFILE_COLORS[s.profile_required] || "bg-gray-100 text-gray-700"}`}>
                          {PROFILE_LABELS[s.profile_required] || s.profile_required}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${count >= slots ? "text-green-600" : count > 0 ? "text-amber-600" : "text-gray-400"}`}>
                          {count}/{slots}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                          {STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAssignShift(s)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600" title="Asignar personal">
                            <Users className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditShift(s); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ShiftForm
          shift={editShift}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditShift(null); }}
        />
      )}
      {assignShift && (
        <ShiftStaffAssigner
          shift={assignShift}
          onClose={() => { setAssignShift(null); load(); }}
        />
      )}
    </div>
  );
}