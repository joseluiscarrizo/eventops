import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import StaffForm from "../components/staff/StaffForm";

const ROLE_LABELS = {
  security: "Seguridad",
  logistics: "Logística",
  hospitality: "Hospitalidad",
  tech: "Técnico",
  coordinator: "Coordinador",
  other: "Otro",
};

const STATUS_CLS = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

const STATUS_LABELS = { active: "Activo", inactive: "Inactivo", suspended: "Suspendido" };

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.StaffMember.list("-created_date", 200).then(data => {
      setStaff(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este miembro?")) return;
    await base44.entities.StaffMember.delete(id);
    load();
  };

  const filtered = staff.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-1">{staff.length} miembros registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo miembro
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border divide-y">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay miembros de staff</div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {filtered.map(member => (
            <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-700">
                  {member.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{member.full_name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" />{member.email}
                  </span>
                  {member.phone && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{member.phone}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500 hidden sm:block">{ROLE_LABELS[member.role] || member.role}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full hidden sm:block ${STATUS_CLS[member.status] || ""}`}>
                {STATUS_LABELS[member.status]}
              </span>
              <button onClick={() => { setEditing(member); setShowForm(true); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(member.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <StaffForm
          member={editing}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}