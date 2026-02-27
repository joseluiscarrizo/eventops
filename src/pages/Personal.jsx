import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Users, AlertTriangle } from "lucide-react";
import PersonalForm from "@/components/personal/PersonalForm";

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
};

const isUnavailable = (p) => {
  if (!p.unavailable_until) return false;
  return p.unavailable_until >= new Date().toISOString().slice(0, 10);
};

export default function Personal() {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProfile, setFilterProfile] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Personal.list("-created_date", 300).then(data => {
      setPersonnel(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este miembro del personal?")) return;
    await base44.entities.Personal.delete(id);
    load();
  };

  const filtered = personnel.filter(p => {
    const matchSearch =
      p.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchProfile = filterProfile === "all" || p.profile_type === filterProfile;
    return matchSearch && matchProfile;
  });

  // Stats por perfil
  const stats = Object.entries(PROFILE_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    color: cfg.color,
    total: personnel.filter(p => p.profile_type === key).length,
    active: personnel.filter(p => p.profile_type === key && p.status === "active").length,
  }));

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

      {/* Buscador y filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar personal..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterProfile("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterProfile === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
          >
            Todos
          </button>
          {Object.entries(PROFILE_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterProfile(filterProfile === k ? "all" : k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterProfile === k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado */}
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
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg?.color || "bg-gray-100 text-gray-600"}`}>
                    {(person.first_name?.[0] || "") + (person.last_name?.[0] || "")}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{person.first_name} {person.last_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color || "bg-gray-100 text-gray-600"}`}>{cfg?.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[person.status] || STATUS_COLORS.active}`}>
                        {person.status === "active" ? "Activo" : "Inactivo"}
                      </span>
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

                  {/* Acciones */}
                  <div className="flex gap-1 flex-shrink-0">
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