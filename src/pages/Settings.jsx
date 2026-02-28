import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAppRole, ROLE_LABELS, CAN } from "@/components/auth/useAppRole";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, Save, AlertTriangle } from "lucide-react";

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-800",
  planificador: "bg-blue-100 text-blue-800",
  empleado: "bg-gray-100 text-gray-700",
};

const ROLE_PERMISSIONS = {
  admin: [
    "Control total de la aplicación",
    "Gestión de usuarios y roles",
    "Gestión de personal, pedidos, turnos y eventos",
    "Acceso a informes y configuración",
  ],
  planificador: [
    "Gestión de personal y turnos",
    "Gestión de pedidos y eventos",
    "Asignación de personal a turnos",
    "Acceso a informes",
  ],
  empleado: [
    "Ver su propio horario de turnos",
    "Registrar ausencias propias",
    "Sin acceso a gestión ni informes",
  ],
};

export default function Settings() {
  const { role: myRole } = useAppRole();
  const [users, setUsers] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [changes, setChanges] = useState({});

  useEffect(() => {
    if (!CAN.manageUsers(myRole)) return;
    Promise.all([
      base44.entities.User.list(),
      base44.entities.Personal.list("-created_date", 300),
    ]).then(([u, p]) => {
      setUsers(u);
      setPersonal(p);
      setLoading(false);
    });
  }, [myRole]);

  const setChange = (userId, field, value) => {
    setChanges(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const handleSave = async (user) => {
    const update = changes[user.id];
    if (!update) return;
    setSaving(s => ({ ...s, [user.id]: true }));
    await base44.auth.updateMe ? null : null; // no-op
    await base44.entities.User.update(user.id, update);
    setSaving(s => ({ ...s, [user.id]: false }));
    setChanges(prev => { const n = { ...prev }; delete n[user.id]; return n; });
    // reload
    base44.entities.User.list().then(setUsers);
  };

  if (!CAN.manageUsers(myRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-800">Acceso restringido</h2>
        <p className="text-gray-500 mt-1">Solo los administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          Configuración y Roles
        </h1>
        <p className="text-gray-500 mt-1">Gestiona los roles y permisos de los usuarios</p>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(ROLE_LABELS).map(([roleKey, label]) => (
          <div key={roleKey} className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[roleKey]}`}>{label}</span>
            </div>
            <ul className="space-y-1.5">
              {ROLE_PERMISSIONS[roleKey].map((perm, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span> {perm}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Users className="w-4 h-4 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Usuarios registrados</h2>
          <span className="ml-auto text-sm text-gray-400">{users.length} usuarios</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando usuarios...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Usuario</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Rol actual</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Cambiar rol</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Personal vinculado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const currentRole = changes[u.id]?.role ?? u.role ?? "empleado";
                const currentPersonalId = changes[u.id]?.personal_id ?? u.personal_id ?? "";
                const isDirty = !!changes[u.id];
                return (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{u.full_name || "—"}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role || "empleado"]}`}>
                        {ROLE_LABELS[u.role || "empleado"]}
                      </span>
                    </td>
                    <td className="px-5 py-3 min-w-40">
                      <Select
                        value={currentRole}
                        onValueChange={v => setChange(u.id, "role", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([k, l]) => (
                            <SelectItem key={k} value={k}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3 min-w-48">
                      <Select
                        value={currentPersonalId || "none"}
                        onValueChange={v => setChange(u.id, "personal_id", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sin vincular" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vincular</SelectItem>
                          {personal.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.first_name} {p.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3">
                      {isDirty && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSave(u)}
                          disabled={saving[u.id]}
                        >
                          <Save className="w-3 h-3" />
                          {saving[u.id] ? "Guardando..." : "Guardar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}