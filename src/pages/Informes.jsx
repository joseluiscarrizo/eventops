import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Calendar, ClipboardList, Users, Truck, Building2, UserCog, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PROFILE_LABELS = {
  camarero: "Camarero",
  cocinero: "Cocinero",
  ayudante_cocina: "Ayudante cocina",
  coctelero: "Coctelero",
  azafata: "Azafata",
};

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
};

const TABS = [
  { id: "general", label: "General", icon: BarChart },
  { id: "cliente", label: "Por cliente", icon: Building2 },
  { id: "perfil", label: "Por perfil", icon: UserCog },
  { id: "coordinador", label: "Por coordinador", icon: User },
];

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

function EmptyChart() {
  return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>;
}

export default function Informes() {
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("general");

  // Filtros
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [selectedCoord, setSelectedCoord] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.Event.list("-date_start", 500),
      base44.entities.Order.list("-created_date", 500),
      base44.entities.Personal.list("-created_date", 500),
      base44.entities.Client.list("-created_date", 500),
    ]).then(([ev, ord, per, cli]) => {
      setEvents(ev);
      setOrders(ord);
      setPersonal(per);
      setClients(cli);
      setLoading(false);
    });
  }, []);

  // Coordinadores únicos
  const coordinators = useMemo(() => {
    const set = new Set(personal.map(p => p.coordinator).filter(Boolean));
    return Array.from(set).sort();
  }, [personal]);

  // ── Filtros aplicados ──
  const filteredOrders = useMemo(() => {
    if (tab === "cliente" && selectedClient !== "all")
      return orders.filter(o => o.client_id === selectedClient);
    return orders;
  }, [orders, tab, selectedClient]);

  const filteredPersonal = useMemo(() => {
    if (tab === "perfil" && selectedProfile !== "all")
      return personal.filter(p => p.profile_type === selectedProfile);
    if (tab === "coordinador" && selectedCoord !== "all")
      return personal.filter(p => p.coordinator === selectedCoord);
    return personal;
  }, [personal, tab, selectedProfile, selectedCoord]);

  // ── Datos derivados ──
  const eventosPorMes = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (!e.date_start) return;
      const key = format(new Date(e.date_start), "MMM yy", { locale: es });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([mes, total]) => ({ mes, total })).slice(-6);
  }, [events]);

  const pedidosPorEstado = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status, value,
    }));
  }, [filteredOrders]);

  const pedidosPorCliente = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const name = o.client_name || "Sin cliente";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [orders]);

  const personalPorPerfil = useMemo(() => {
    const map = {};
    filteredPersonal.forEach(p => { map[p.profile_type] = (map[p.profile_type] || 0) + 1; });
    return Object.entries(map).map(([key, value]) => ({
      name: PROFILE_LABELS[key] || key, value,
    }));
  }, [filteredPersonal]);

  const personalPorCoord = useMemo(() => {
    const map = {};
    personal.forEach(p => {
      const coord = p.coordinator || "Sin asignar";
      map[coord] = (map[coord] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [personal]);

  const conDesplazamiento = filteredOrders.filter(o => o.displacement).length;
  const sinDesplazamiento = filteredOrders.length - conDesplazamiento;
  const completados = filteredOrders.filter(o => o.status === "completed").length;
  const pendientes = filteredOrders.filter(o => o.status === "pending").length;
  const evActivos = events.filter(e => e.status === "in_progress" || e.status === "published").length;
  const personalActivo = filteredPersonal.filter(p => p.status === "active").length;

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
        <p className="text-gray-500 mt-1">Analytics y métricas del negocio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros contextuales */}
      {tab === "cliente" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Filtrar por cliente:</span>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {tab === "perfil" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Filtrar por perfil:</span>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los perfiles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los perfiles</SelectItem>
              {Object.entries(PROFILE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {tab === "coordinador" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Filtrar por coordinador:</span>
          <Select value={selectedCoord} onValueChange={setSelectedCoord}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos los coordinadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {coordinators.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Eventos activos" value={evActivos} sub={`${events.length} en total`} color="indigo" />
        <StatCard icon={ClipboardList} label="Pedidos completados" value={completados} sub={`${pendientes} pendientes`} color="emerald" />
        <StatCard icon={Users} label="Personal activo" value={personalActivo} sub={`${filteredPersonal.length} en total`} color="blue" />
        <StatCard icon={Truck} label="Con desplazamiento" value={conDesplazamiento} sub={`${filteredOrders.length > 0 ? Math.round(conDesplazamiento / filteredOrders.length * 100) : 0}% de los pedidos`} color="amber" />
      </div>

      {/* ── GENERAL ── */}
      {tab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Eventos por mes</h2>
            {eventosPorMes.length === 0 ? <EmptyChart /> : (
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
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Pedidos por estado</h2>
            {pedidosPorEstado.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pedidosPorEstado} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>
                    {pedidosPorEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Personal por perfil</h2>
            {personalPorPerfil.length === 0 ? <EmptyChart /> : (
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
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Desplazamiento</h2>
            {orders.length === 0 ? <EmptyChart /> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{ name: "Con desplazamiento", value: conDesplazamiento }, { name: "Sin desplazamiento", value: sinDesplazamiento }]}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      <Cell fill="#f59e0b" /><Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip /><Legend />
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
      )}

      {/* ── POR CLIENTE ── */}
      {tab === "cliente" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Pedidos por cliente</h2>
            {pedidosPorCliente.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pedidosPorCliente} barSize={28} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Estado de pedidos</h2>
            {pedidosPorEstado.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pedidosPorEstado} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>
                    {pedidosPorEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Desplazamiento en pedidos</h2>
            {filteredOrders.length === 0 ? <EmptyChart /> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{ name: "Con desplazamiento", value: conDesplazamiento }, { name: "Sin desplazamiento", value: sinDesplazamiento }]}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      <Cell fill="#f59e0b" /><Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip /><Legend />
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
      )}

      {/* ── POR PERFIL ── */}
      {tab === "perfil" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Personal por tipo de perfil</h2>
            {personalPorPerfil.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={personalPorPerfil} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Tabla detalle por perfil */}
          <div className="bg-white rounded-xl border p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Detalle por perfil</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Perfil</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Activos</th>
                    <th className="pb-2 font-medium">Inactivos</th>
                    <th className="pb-2 font-medium">% Activos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(PROFILE_LABELS).map(([k, label]) => {
                    const total = filteredPersonal.filter(p => p.profile_type === k).length;
                    const activos = filteredPersonal.filter(p => p.profile_type === k && p.status === "active").length;
                    const inactivos = total - activos;
                    const pct = total > 0 ? Math.round(activos / total * 100) : 0;
                    if (total === 0) return null;
                    return (
                      <tr key={k} className="text-gray-700">
                        <td className="py-2 font-medium">{label}</td>
                        <td className="py-2">{total}</td>
                        <td className="py-2 text-emerald-600">{activos}</td>
                        <td className="py-2 text-gray-400">{inactivos}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-24">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── POR COORDINADOR ── */}
      {tab === "coordinador" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Personal por coordinador</h2>
            {personalPorCoord.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={Math.max(220, personalPorCoord.length * 40)}>
                <BarChart data={personalPorCoord} barSize={24} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Tabla detalle coordinadores */}
          <div className="bg-white rounded-xl border p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Detalle por coordinador</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Coordinador</th>
                    <th className="pb-2 font-medium">Total personal</th>
                    <th className="pb-2 font-medium">Activos</th>
                    <th className="pb-2 font-medium">Perfiles</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {personalPorCoord.map(({ name, value }) => {
                    const coords = filteredPersonal.filter(p => (p.coordinator || "Sin asignar") === name);
                    const activos = coords.filter(p => p.status === "active").length;
                    const perfiles = [...new Set(coords.map(p => PROFILE_LABELS[p.profile_type] || p.profile_type))].join(", ");
                    return (
                      <tr key={name} className="text-gray-700">
                        <td className="py-2 font-medium">{name}</td>
                        <td className="py-2">{value}</td>
                        <td className="py-2 text-emerald-600">{activos}</td>
                        <td className="py-2 text-gray-500 text-xs">{perfiles || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}