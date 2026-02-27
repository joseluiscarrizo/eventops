import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Calendar, ClipboardList, Users, Truck } from "lucide-react";
import { format, startOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PROFILE_LABELS = {
  camarero: "Camarero",
  cocinero: "Cocinero",
  ayudante_cocina: "Ayudante cocina",
  coctelero: "Coctelero",
  azafata: "Azafata",
};

const STATUS_LABELS_ORDER = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
};

function StatCard({ icon: Icon, label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Informes() {
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Event.list("-date_start", 500),
      base44.entities.Order.list("-created_date", 500),
      base44.entities.Personal.list("-created_date", 500),
    ]).then(([ev, ord, per]) => {
      setEvents(ev);
      setOrders(ord);
      setPersonal(per);
      setLoading(false);
    });
  }, []);

  // ── Eventos por mes (últimos 6 meses) ──
  const eventosPorMes = (() => {
    const map = {};
    events.forEach(e => {
      if (!e.date_start) return;
      const key = format(new Date(e.date_start), "MMM yy", { locale: es });
      map[key] = (map[key] || 0) + 1;
    });
    const sorted = Object.entries(map).map(([mes, total]) => ({ mes, total }));
    return sorted.slice(-6);
  })();

  // ── Pedidos por estado ──
  const pedidosPorEstado = (() => {
    const map = {};
    orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, value]) => ({
      name: STATUS_LABELS_ORDER[status] || status,
      value,
    }));
  })();

  // ── Personal por perfil ──
  const personalPorPerfil = (() => {
    const map = {};
    personal.forEach(p => { map[p.profile_type] = (map[p.profile_type] || 0) + 1; });
    return Object.entries(map).map(([key, value]) => ({
      name: PROFILE_LABELS[key] || key,
      value,
    }));
  })();

  // ── Desplazamiento ──
  const conDesplazamiento = orders.filter(o => o.displacement).length;
  const sinDesplazamiento = orders.length - conDesplazamiento;

  // ── Stats resumen ──
  const completados = orders.filter(o => o.status === "completed").length;
  const pendientes = orders.filter(o => o.status === "pending").length;
  const evActivos = events.filter(e => e.status === "in_progress" || e.status === "published").length;
  const personalActivo = personal.filter(p => p.status === "active").length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-1/4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
        <p className="text-gray-500 mt-1">Métricas clave del negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Eventos activos" value={evActivos} sub={`${events.length} en total`} color="indigo" />
        <StatCard icon={ClipboardList} label="Pedidos completados" value={completados} sub={`${pendientes} pendientes`} color="emerald" />
        <StatCard icon={Users} label="Personal activo" value={personalActivo} sub={`${personal.length} en total`} color="blue" />
        <StatCard icon={Truck} label="Con desplazamiento" value={conDesplazamiento} sub={`${orders.length > 0 ? Math.round(conDesplazamiento / orders.length * 100) : 0}% de los pedidos`} color="amber" />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Eventos por mes */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Eventos por mes</h2>
          {eventosPorMes.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={eventosPorMes} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pedidos por estado */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Pedidos por estado</h2>
          {pedidosPorEstado.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pedidosPorEstado} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pedidosPorEstado.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Personal por perfil */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Personal por tipo de perfil</h2>
          {personalPorPerfil.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={personalPorPerfil} barSize={28} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Desplazamiento */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Costes de desplazamiento</h2>
          {orders.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Con desplazamiento", value: conDesplazamiento },
                      { name: "Sin desplazamiento", value: sinDesplazamiento },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    <Cell fill="#f59e0b" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-700">{conDesplazamiento}</div>
                  <div className="text-xs text-amber-600">Con desplazamiento</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-700">{sinDesplazamiento}</div>
                  <div className="text-xs text-gray-500">Sin desplazamiento</div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}