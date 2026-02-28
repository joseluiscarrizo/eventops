import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const PROFILE_CONFIG = {
  camarero:        { label: "Camarero",       color: "bg-blue-100 text-blue-700" },
  cocinero:        { label: "Cocinero",        color: "bg-orange-100 text-orange-700" },
  ayudante_cocina: { label: "Ayudante cocina", color: "bg-yellow-100 text-yellow-700" },
  coctelero:       { label: "Coctelero",       color: "bg-purple-100 text-purple-700" },
  azafata:         { label: "Azafata",         color: "bg-pink-100 text-pink-700" },
};

export default function ApercibidosTab({ personnel, onReload }) {
  const [search, setSearch] = useState("");
  const [reactivating, setReactivating] = useState({});

  const apercibidos = personnel.filter(p => p.status === "apercibido" || (p.apercibimiento_count > 0 && p.status === "apercibido"));

  const filtered = apercibidos.filter(p => {
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q)
    );
  });

  const handleReactivate = async (person) => {
    if (!confirm(`¿Reactivar a ${person.first_name} ${person.last_name}?`)) return;
    setReactivating(prev => ({ ...prev, [person.id]: true }));
    await base44.entities.Personal.update(person.id, { status: "active" });
    setReactivating(prev => ({ ...prev, [person.id]: false }));
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-700">{apercibidos.length} perfil{apercibidos.length !== 1 ? "es" : ""} apercibido{apercibidos.length !== 1 ? "s" : ""}</p>
          <p className="text-xs text-red-500">Estos perfiles han recibido un apercibimiento y están suspendidos.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar apercibido..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No hay perfiles apercibidos
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(person => {
              const cfg = PROFILE_CONFIG[person.profile_type];
              return (
                <div key={person.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(person.first_name?.[0] || "") + (person.last_name?.[0] || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{person.first_name} {person.last_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color || "bg-gray-100 text-gray-600"}`}>{cfg?.label}</span>
                      <span className="font-mono text-xs text-gray-400">{person.code}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {person.apercibimiento_count || 1} apercibimiento{(person.apercibimiento_count || 1) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                      {person.apercibimiento_reason && (
                        <p><span className="font-medium">Motivo:</span> {person.apercibimiento_reason}</p>
                      )}
                      {person.apercibimiento_date && (
                        <p><span className="font-medium">Fecha:</span> {format(new Date(person.apercibimiento_date), "d 'de' MMMM yyyy", { locale: es })}</p>
                      )}
                      {person.phone && <p>{person.phone}</p>}
                      {person.email && <p>{person.email}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleReactivate(person)}
                    disabled={reactivating[person.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {reactivating[person.id] ? (
                      <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Reactivar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}