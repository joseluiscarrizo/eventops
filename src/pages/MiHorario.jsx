import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAppRole } from "@/components/auth/useAppRole";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, AlertTriangle, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const PROFILE_LABELS = {
  camarero: "Camarero/a", cocinero: "Cocinero/a",
  ayudante_cocina: "Ayudante cocina", coctelero: "Coctelero/a", azafata: "Azafata/o",
};
const STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-700" };
const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };

const ABS_TYPES = { vacaciones: "Vacaciones", baja_medica: "Baja médica", permiso: "Permiso", otros: "Otros" };

export default function MiHorario() {
  const { user } = useAppRole();
  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [personal, setPersonal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absForm, setAbsForm] = useState({ type: "vacaciones", date_start: "", date_end: "", reason: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    // Find linked personal record from user.personal_id
    const personalId = user?.personal_id;
    if (personalId) {
      const [assigns, allShifts, abs] = await Promise.all([
        base44.entities.ShiftAssignment.filter({ personal_id: personalId }),
        base44.entities.Shift.list("-date", 200),
        base44.entities.Absence.filter({ personal_id: personalId }),
      ]);
      setAssignments(assigns.filter(a => a.status !== "cancelled"));
      setShifts(allShifts);
      setAbsences(abs);
      // try to load personal record
      const pers = await base44.entities.Personal.filter({ id: personalId });
      if (pers.length) setPersonal(pers[0]);
    }
    setLoading(false);
  };

  const myShifts = assignments.map(a => {
    const shift = shifts.find(s => s.id === a.shift_id);
    return shift ? { ...shift, assignStatus: a.status, assignId: a.id } : null;
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = myShifts.filter(s => s.date >= new Date().toISOString().slice(0, 10));
  const past = myShifts.filter(s => s.date < new Date().toISOString().slice(0, 10));

  const handleAbsenceSave = async () => {
    if (!absForm.date_start || !absForm.date_end || !user?.personal_id) return;
    setSaving(true);
    await base44.entities.Absence.create({
      personal_id: user.personal_id,
      personal_name: personal ? `${personal.first_name} ${personal.last_name}` : user.full_name,
      type: absForm.type,
      date_start: absForm.date_start,
      date_end: absForm.date_end,
      reason: absForm.reason,
      status: "pending",
    });
    setSaving(false);
    setShowAbsenceForm(false);
    setAbsForm({ type: "vacaciones", date_start: "", date_end: "", reason: "" });
    loadData();
  };

  if (!user?.personal_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-800">Sin perfil vinculado</h2>
        <p className="text-gray-500 mt-1">Un administrador debe vincular tu cuenta a un registro de personal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi horario</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.full_name}</p>
        </div>
        <button
          onClick={() => setShowAbsenceForm(!showAbsenceForm)}
          className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-100"
        >
          <Plus className="w-4 h-4" /> Solicitar ausencia
        </button>
      </div>

      {/* Absence form */}
      {showAbsenceForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <h3 className="font-medium text-amber-800">Nueva solicitud de ausencia</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={absForm.type}
                onChange={e => setAbsForm(f => ({ ...f, type: e.target.value }))}
              >
                {Object.entries(ABS_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Opcional"
                value={absForm.reason}
                onChange={e => setAbsForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={absForm.date_start} onChange={e => setAbsForm(f => ({ ...f, date_start: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={absForm.date_end} onChange={e => setAbsForm(f => ({ ...f, date_end: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAbsenceForm(false)} className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={handleAbsenceSave} disabled={saving} className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {saving ? "Enviando..." : "Solicitar"}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming shifts */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" /> Próximos turnos ({upcoming.length})
        </h2>
        {loading ? <p className="text-gray-400 text-sm">Cargando...</p> : upcoming.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border p-8 text-center text-gray-400 text-sm">No tienes turnos próximos asignados</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => (
              <div key={s.id} className="bg-white rounded-xl border p-4 flex items-start gap-4">
                <div className="bg-indigo-50 rounded-lg p-3 text-center min-w-14">
                  <div className="text-xs font-bold text-indigo-600 uppercase">
                    {format(parseISO(s.date), "MMM", { locale: es })}
                  </div>
                  <div className="text-2xl font-bold text-indigo-700 leading-none">
                    {format(parseISO(s.date), "d")}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{s.title || PROFILE_LABELS[s.profile_required]}</div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.time_start} – {s.time_end}</span>
                    {s.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.location}</span>}
                  </div>
                  {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[s.assignStatus]}`}>
                  {STATUS_LABELS[s.assignStatus]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Absences */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Mis ausencias ({absences.length})
        </h2>
        {absences.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border p-6 text-center text-gray-400 text-sm">Sin ausencias registradas</div>
        ) : (
          <div className="space-y-2">
            {absences.map(a => (
              <div key={a.id} className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-gray-800">{ABS_TYPES[a.type]}</span>
                  <span className="text-xs text-gray-500 ml-2">{a.date_start} → {a.date_end}</span>
                  {a.reason && <span className="text-xs text-gray-400 ml-2">· {a.reason}</span>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.status === "approved" ? "bg-green-100 text-green-700" :
                  a.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {a.status === "approved" ? "Aprobada" : a.status === "rejected" ? "Rechazada" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past shifts (collapsed) */}
      {past.length > 0 && (
        <details className="bg-gray-50 rounded-xl border">
          <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-600">
            Turnos pasados ({past.length})
          </summary>
          <div className="px-5 pb-4 space-y-2">
            {past.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="text-sm text-gray-700">{s.date} · {s.time_start}–{s.time_end} · {s.title || PROFILE_LABELS[s.profile_required]}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.assignStatus]}`}>{STATUS_LABELS[s.assignStatus]}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}