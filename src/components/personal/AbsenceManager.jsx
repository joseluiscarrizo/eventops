import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, CalendarOff, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const ABSENCE_TYPES = {
  vacaciones:  { label: "Vacaciones",   color: "bg-blue-100 text-blue-700 border-blue-200" },
  baja_medica: { label: "Baja médica",  color: "bg-red-100 text-red-700 border-red-200" },
  permiso:     { label: "Permiso",      color: "bg-purple-100 text-purple-700 border-purple-200" },
  otros:       { label: "Otros",        color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const STATUS_CONFIG = {
  approved: { label: "Aprobada", icon: CheckCircle2, cls: "text-emerald-600" },
  pending:  { label: "Pendiente", icon: Clock, cls: "text-amber-600" },
  rejected: { label: "Rechazada", icon: XCircle, cls: "text-red-500" },
};

export default function AbsenceManager({ person }) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "vacaciones", date_start: "", date_end: "", reason: "", status: "approved" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Absence.filter({ personal_id: person.id });
    setAbsences(data.sort((a, b) => b.date_start.localeCompare(a.date_start)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [person.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Absence.create({
      ...form,
      personal_id: person.id,
      personal_name: `${person.first_name} ${person.last_name}`,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ type: "vacaciones", date_start: "", date_end: "", reason: "", status: "approved" });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    await base44.entities.Absence.delete(id);
    load();
  };

  const updateStatus = async (id, status) => {
    await base44.entities.Absence.update(id, { status });
    setAbsences(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const today = new Date().toISOString().slice(0, 10);
  const activeAbsence = absences.find(a =>
    a.status === "approved" && a.date_start <= today && a.date_end >= today
  );

  const formatDate = (d) => {
    try { return format(parseISO(d), "d MMM yyyy", { locale: es }); }
    catch { return d; }
  };

  return (
    <div className="space-y-3">
      {/* Active absence banner */}
      {activeAbsence && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
          <CalendarOff className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Ausente ahora:</span>
          <span>{ABSENCE_TYPES[activeAbsence.type]?.label} hasta {formatDate(activeAbsence.date_end)}</span>
          {activeAbsence.reason && <span className="text-amber-600">· {activeAbsence.reason}</span>}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <CalendarOff className="w-4 h-4 text-gray-400" />
          Ausencias ({absences.length})
        </h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowForm(v => !v)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" /> Registrar
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSave} className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Tipo *</label>
              <select
                required
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full h-8 text-xs border rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
              >
                {Object.entries(ABSENCE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Inicio *</label>
              <Input
                type="date"
                required
                value={form.date_start}
                onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fin *</label>
              <Input
                type="date"
                required
                min={form.date_start}
                value={form.date_end}
                onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Motivo</label>
              <Input
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Descripción opcional..."
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Estado</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full h-8 text-xs border rounded-md px-2 bg-white focus:outline-none"
              >
                <option value="approved">Aprobada</option>
                <option value="pending">Pendiente</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-1.5">
          {[1,2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : absences.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4 border border-dashed rounded-lg">Sin ausencias registradas</p>
      ) : (
        <div className="space-y-1.5">
          {absences.map(a => {
            const typeCfg = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.otros;
            const stCfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.approved;
            const Icon = stCfg.icon;
            const isActive = a.status === "approved" && a.date_start <= today && a.date_end >= today;
            return (
              <div key={a.id} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${isActive ? "bg-amber-50 border-amber-200" : "bg-white"}`}>
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${stCfg.cls}`} />
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${typeCfg.color}`}>{typeCfg.label}</span>
                <span className="flex-1 text-gray-700 text-xs">{formatDate(a.date_start)} → {formatDate(a.date_end)}</span>
                {a.reason && <span className="text-xs text-gray-400 truncate max-w-[120px]">{a.reason}</span>}
                <select
                  value={a.status}
                  onChange={e => updateStatus(a.id, e.target.value)}
                  className={`text-xs border-0 rounded-full px-2 py-0.5 focus:outline-none cursor-pointer ${
                    a.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    a.status === 'rejected' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}
                >
                  <option value="approved">Aprobada</option>
                  <option value="pending">Pendiente</option>
                  <option value="rejected">Rechazada</option>
                </select>
                <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}