import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserCheck, UserX, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const PROFILE_LABELS = {
  camarero: "Camarero",
  cocinero: "Cocinero",
  ayudante_cocina: "Ayudante Cocina",
  coctelero: "Coctelero",
  azafata: "Azafata",
};

const STATUS_COLORS = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };

export default function AltasTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [assignments, orders, personal] = await Promise.all([
      base44.entities.OrderAssignment.list("-created_date", 500),
      base44.entities.Order.list("-created_date", 500),
      base44.entities.Personal.list("first_name", 500),
    ]);

    const ordersMap = Object.fromEntries(orders.map(o => [o.id, o]));
    const personalMap = Object.fromEntries(personal.map(p => [p.id, p]));

    const enriched = assignments.map(a => {
      const order = ordersMap[a.order_id] || {};
      const person = personalMap[a.personal_id] || {};
      return { ...a, order, person };
    });

    setRows(enriched);
    setLoading(false);
  };

  const handleAlta = async (row) => {
    setActionLoading(prev => ({ ...prev, [row.id]: "alta" }));
    await base44.entities.OrderAssignment.update(row.id, { status: "confirmed" });
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "confirmed" } : r));
    setActionLoading(prev => ({ ...prev, [row.id]: null }));
  };

  const handleBaja = async (row) => {
    setActionLoading(prev => ({ ...prev, [row.id]: "baja" }));
    await base44.entities.OrderAssignment.update(row.id, { status: "cancelled" });
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "cancelled" } : r));
    setActionLoading(prev => ({ ...prev, [row.id]: null }));
  };

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.order?.client_name?.toLowerCase().includes(q) ||
      r.order?.event_place?.toLowerCase().includes(q) ||
      r.person?.first_name?.toLowerCase().includes(q) ||
      r.person?.last_name?.toLowerCase().includes(q) ||
      r.person?.code?.toLowerCase().includes(q) ||
      r.profile_type?.toLowerCase().includes(q)
    );
  });

  const getDayName = (dateStr) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "EEEE", { locale: es });
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Día</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Evento</th>
              <th className="px-4 py-3 text-left">Cód. Perfil</th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-center">Alta</th>
              <th className="px-4 py-3 text-center">Baja</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array(9).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-gray-100 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">No hay registros</td>
              </tr>
            ) : filtered.map(row => {
              const dateStr = row.order?.event_date;
              const isAltaLoading = actionLoading[row.id] === "alta";
              const isBajaLoading = actionLoading[row.id] === "baja";
              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {dateStr ? format(new Date(dateStr), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">
                    {getDayName(dateStr)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {row.order?.client_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {row.order?.event_place || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-700 bg-indigo-50 rounded whitespace-nowrap">
                    {row.person?.code || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {PROFILE_LABELS[row.profile_type] || row.profile_type || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status] || STATUS_COLORS.pending}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleAlta(row)}
                      disabled={row.status === "confirmed" || !!actionLoading[row.id]}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${row.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-700 cursor-default opacity-60"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow active:scale-95"
                        } disabled:opacity-50`}
                    >
                      {isAltaLoading ? (
                        <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      Alta
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleBaja(row)}
                      disabled={row.status === "cancelled" || !!actionLoading[row.id]}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${row.status === "cancelled"
                          ? "bg-red-100 text-red-500 cursor-default opacity-60"
                          : "bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow active:scale-95"
                        } disabled:opacity-50`}
                    >
                      {isBajaLoading ? (
                        <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                      Baja
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}