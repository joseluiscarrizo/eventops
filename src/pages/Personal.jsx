import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Users, AlertTriangle, Calendar, Clock, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import PersonalForm from "@/components/personal/PersonalForm";
import ApercibidosTab from "@/components/personal/ApercibidosTab";
import { useAppRole } from "@/components/auth/useAppRole";

const PROFILE_CONFIG = {
  camarero:        { label: "Camarero",        prefix: "CAM", color: "bg-blue-100 text-blue-700" },
  cocinero:        { label: "Cocinero",         prefix: "COC", color: "bg-orange-100 text-orange-700" },
  ayudante_cocina: { label: "Ayudante cocina",  prefix: "AYU", color: "bg-yellow-100 text-yellow-700" },
  coctelero:       { label: "Coctelero",        prefix: "DRI", color: "bg-purple-100 text-purple-700" },
  azafata:         { label: "Azafata",          prefix: "AZA", color: "bg-pink-100 text-pink-700" },
};

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
  apercibido: "bg-red-100 text-red-700",
};

const PROFILE_LABELS = {
  camarero: "Camarero/a", cocinero: "Cocinero/a",
  ayudante_cocina: "Ayudante cocina", coctelero: "Coctelero/a", azafata: "Azafata/o",
};
const SHIFT_STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-700" };
const SHIFT_STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };
const ABS_TYPES = { vacaciones: "Vacaciones", baja_medica: "Baja médica", permiso: "Permiso", otros: "Otros" };

const isUnavailable = (p) => {
  if (!p.unavailable_until) return false;
  return p.unavailable_until >= new Date().toISOString().slice(0, 10);
};

export default function Personal() {
  const { user } = useAppRole();
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProfile, setFilterProfile] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [apercibiendo, setApercibiendo] = useState({});
  const [activeTab, setActiveTab] = useState("lista");
  const [showReasonModal, setShowReasonModal] = useState(null);
  const [apercibimientoReason, setApercibimientoReason] = useState("");
  
  // Mi horario state
  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [myPersonal, setMyPersonal] = useState(null);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absForm, setAbsForm] = useState({ type: "vacaciones", date_start: "", date_end: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    await base44.entities.Personal.list("-created_date", 300).then(data => {
      setPersonnel(data);
    });
    // Load current user's schedule data
    if (user?.personal_id) {
      const [assigns, allShifts, abs] = await Promise.all([
        base44.entities.ShiftAssignment.filter({ personal_id: user.personal_id }),
        base44.entities.Shift.list("-date", 200),
        base44.entities.Absence.filter({ personal_id: user.personal_id }),
      ]);
      setAssignments(assigns.filter(a => a.status !== "cancelled"));
      setShifts(allShifts);
      setAbsences(abs);
      const pers = await base44.entities.Personal.filter({ id: user.personal_id });
      if (pers.length) setMyPersonal(pers[0]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este miembro del personal?")) return;
    await base44.entities.Personal.delete(id);
    load();
  };

  const handleApercibir = async (person) => {
    setShowReasonModal(person);
    setApercibimientoReason("");
  };

  const confirmApercibimiento = async () => {
    const person = showReasonModal;
    setApercibiendo(prev => ({ ...prev, [person.id]: true }));
    const newCount = (person.apercibimiento_count || 0) + 1;
    await base44.entities.Personal.update(person.id, {
      status: "apercibido",
      apercibimiento_count: newCount,
      apercibimiento_reason: apercibimientoReason || "",
      apercibimiento_date: new Date().toISOString().slice(0, 10),
    });
    setApercibiendo(prev => ({ ...prev, [person.id]: false }));
    setShowReasonModal(null);
    setApercibimientoReason("");
    load();
    setActiveTab("apercibidos");
  };

  const filtered = personnel.filter(p => {
    const matchSearch =
      p.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchProfile = filterProfile === "all" || p.profile_type === filterProfile;
    return matchSearch && matchProfile && p.status !== "apercibido";
  });

  const apercibidosCount = personnel.filter(p => p.status === "apercibido").length;

  const stats = Object.entries(PROFILE_CONFIG).map(([key, cfg]) => ({
    key, label: cfg.label, color: cfg.color,
    total: personnel.filter(p => p.profile_type === key).length,
    active: personnel.filter(p => p.profile_type === key && p.status === "active").length,
  }));

  // Mi horario logic
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
      personal_name: myPersonal ? `${myPersonal.first_name} ${myPersonal.last_name}` : user.full_name,
      type: absForm.type,
      date_start: absForm.date_start,
      date_end: absForm.date_end,
      reason: absForm.reason,
      status: "pending",
    });
    setSaving(false);
    setShowAbsenceForm(false);
    setAbsForm({ type: "vacaciones", date_start: "", date_end: "", reason: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
          <p className="text-gray-500 mt-1">{personnel.length} miembros registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo personal
        </Button>
      </div>

      {/* Métricas por perfil */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(s => (
          <button
            key={s.key}
            onClick={() => setFilterProfile(filterProfile === s.key ? "all" : s.key)}
            className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${filterProfile === s.key ? "ring-2 ring-blue-500 border-blue-300" : ""}`}
          >
            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full mb-2 ${s.color}`}>
              <Users className="w-3 h-3" />{s.label}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.total}</div>
            <div className="text-xs text-gray-400">{s.active} activos</div>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="lista">Lista de Personal</TabsTrigger>
          <TabsTrigger value="apercibidos" className="relative">
            Apercibidos
            {apercibidosCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {apercibidosCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mihorario">Mi horario</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          {/* Buscador y filtros */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Buscar personal..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterProfile("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterProfile === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
                Todos
              </button>
              {Object.entries(PROFILE_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setFilterProfile(filterProfile === k ? "all" : k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterProfile === k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            {loading ? (
              <div className="divide-y">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex gap-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-100 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No hay personal registrado</div>
            ) : (
              <div className="divide-y">
                {filtered.map(person => {
                  const cfg = PROFILE_CONFIG[person.profile_type];
                  return (
                    <div key={person.id} className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg?.color || "bg-gray-100 text-gray-600"}`}>
                        {(person.first_name?.[0] || "") + (person.last_name?.[0] || "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{person.first_name} {person.last_name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color || "bg-gray-100 text-gray-600"}`}>{cfg?.label}</span>
                          {person.extra_profiles?.map(ep => (
                            <span key={ep} className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROFILE_CONFIG[ep]?.color || "bg-gray-100 text-gray-600"}`}>
                              +{PROFILE_CONFIG[ep]?.label || ep}
                            </span>
                          ))}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[person.status] || STATUS_COLORS.active}`}>
                            {person.status === "active" ? "Activo" : person.status === "apercibido" ? "Apercibido" : "Inactivo"}
                          </span>
                          {person.apercibimiento_count > 0 && (
                            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                              {person.apercibimiento_count} aperc.
                            </span>
                          )}
                          {isUnavailable(person) && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />No disponible hasta {person.unavailable_until}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                          <span className="font-mono">{person.code}</span>
                          {person.phone && <span>{person.phone}</span>}
                          {person.email && <span>{person.email}</span>}
                          {person.experience_years && <span>{person.experience_years} años exp.</span>}
                        </div>
                        {person.specialties?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {person.specialties.map(s => (
                              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 items-center">
                        <button
                          onClick={() => handleApercibir(person)}
                          disabled={!!apercibiendo[person.id]}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          {apercibiendo[person.id] ? (
                            <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          Apercibir
                        </button>
                        <button onClick={() => { setEditing(person); setShowForm(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(person.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="apercibidos">
          <ApercibidosTab personnel={personnel} onReload={load} />
        </TabsContent>

        <TabsContent value="mihorario" className="space-y-6 max-w-3xl">
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

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Mi horario</h2>
                <p className="text-gray-500 text-sm mt-1">{user?.full_name}</p>
              </div>
              <button
                onClick={() => setShowAbsenceForm(!showAbsenceForm)}
                className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-100"
              >
                <Plus className="w-4 h-4" /> Solicitar ausencia
              </button>
            </div>

            {/* Upcoming shifts */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" /> Próximos turnos ({upcoming.length})
              </h3>
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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${SHIFT_STATUS_COLORS[s.assignStatus]}`}>
                        {SHIFT_STATUS_LABELS[s.assignStatus]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Absences */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Mis ausencias ({absences.length})
              </h3>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SHIFT_STATUS_COLORS[s.assignStatus]}`}>{SHIFT_STATUS_LABELS[s.assignStatus]}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modal motivo apercibimiento */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Apercibir a {showReasonModal.first_name} {showReasonModal.last_name}</h3>
                <p className="text-xs text-gray-400">Apercibimiento #{(showReasonModal.apercibimiento_count || 0) + 1}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Motivo (opcional)</label>
              <textarea
                value={apercibimientoReason}
                onChange={e => setApercibimientoReason(e.target.value)}
                rows={3}
                placeholder="Describe el motivo del apercibimiento..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReasonModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmApercibimiento} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold">
                Confirmar apercibimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <PersonalForm
          person={editing}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}