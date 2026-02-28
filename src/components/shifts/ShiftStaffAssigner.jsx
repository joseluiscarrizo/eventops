import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, AlertTriangle, Check, Trash2 } from "lucide-react";

const PROFILE_LABELS = {
  camarero: "Camarero/a",
  cocinero: "Cocinero/a",
  ayudante_cocina: "Ayudante cocina",
  coctelero: "Coctelero/a",
  azafata: "Azafata/o",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ShiftStaffAssigner({ shift, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, [shift.id]);

  const load = async () => {
    setLoading(true);
    const [assigns, pers, abs] = await Promise.all([
      base44.entities.ShiftAssignment.filter({ shift_id: shift.id }),
      base44.entities.Personal.filter({ status: "active" }),
      base44.entities.Absence.filter({ status: "approved" }),
    ]);
    setAssignments(assigns);
    setPersonal(pers);
    setAbsences(abs);
    setLoading(false);
  };

  const isAbsent = (p) => {
    const d = shift.date;
    if (p.unavailable_until && p.unavailable_until >= d) return p.unavailable_reason || "No disponible";
    const abs = absences.find(a => a.personal_id === p.id && a.date_start <= d && a.date_end >= d);
    if (abs) {
      const t = { vacaciones: "Vacaciones", baja_medica: "Baja médica", permiso: "Permiso", otros: "Ausente" };
      return abs.reason || t[abs.type] || "Ausente";
    }
    return null;
  };

  const assignedIds = new Set(assignments.filter(a => a.status !== "cancelled").map(a => a.personal_id));

  const available = personal.filter(p => {
    const profiles = [p.profile_type, ...(p.extra_profiles || [])];
    const matchProfile = profiles.includes(shift.profile_required);
    const matchSearch = !search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase());
    return matchProfile && matchSearch;
  });

  const handleAssign = async (p) => {
    await base44.entities.ShiftAssignment.create({
      shift_id: shift.id,
      personal_id: p.id,
      personal_name: `${p.first_name} ${p.last_name}`,
      profile_type: shift.profile_required,
      status: "pending",
    });
    load();
  };

  const handleStatusChange = async (a, status) => {
    await base44.entities.ShiftAssignment.update(a.id, { status });
    load();
  };

  const handleRemove = async (a) => {
    await base44.entities.ShiftAssignment.delete(a.id);
    load();
  };

  const confirmed = assignments.filter(a => a.status === "confirmed").length;
  const isFull = assignedIds.size >= (shift.slots || 1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-lg">{shift.title || `Turno ${shift.date}`}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {shift.date} · {shift.time_start}–{shift.time_end} · {PROFILE_LABELS[shift.profile_required]}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{confirmed}/{shift.slots || 1} confirmados</Badge>
              {isFull && <Badge className="bg-green-100 text-green-800">Turno completo</Badge>}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Assigned */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">Personal asignado ({assignments.length})</h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin asignaciones aún</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">{a.personal_name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                        {a.status === "pending" ? "Pendiente" : a.status === "confirmed" ? "Confirmado" : "Cancelado"}
                      </span>
                      {a.status !== "confirmed" && (
                        <button onClick={() => handleStatusChange(a, "confirmed")} className="text-green-600 hover:text-green-700" title="Confirmar">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleRemove(a)} className="text-red-400 hover:text-red-600" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available to assign */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">Personal disponible – {PROFILE_LABELS[shift.profile_required]}</h3>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {loading ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : available.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay personal con este perfil</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {available.map(p => {
                  const alreadyAssigned = assignedIds.has(p.id);
                  const absenceReason = isAbsent(p);
                  return (
                    <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${absenceReason ? "bg-amber-50 border-amber-200" : alreadyAssigned ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200"}`}>
                      <div>
                        <span className="text-sm font-medium">{p.first_name} {p.last_name}</span>
                        {absenceReason && (
                          <div className="flex items-center gap-1 text-xs text-amber-700 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {absenceReason}
                          </div>
                        )}
                        {alreadyAssigned && !absenceReason && (
                          <div className="text-xs text-indigo-600 mt-0.5">Ya asignado</div>
                        )}
                      </div>
                      {!alreadyAssigned && !absenceReason && (
                        <button
                          onClick={() => handleAssign(p)}
                          disabled={isFull}
                          className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                        >
                          <UserPlus className="w-3 h-3" /> Asignar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}