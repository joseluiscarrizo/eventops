import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, MapPin, Clock, Shirt, Download, Calendar, List, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import OrderForm from "@/components/orders/OrderForm";
import OrderCalendar from "@/components/orders/OrderCalendar";
import OrderStaffManager from "@/components/orders/OrderStaffManager";
import AltasTab from "@/components/orders/AltasTab";
import ShiftForm from "@/components/shifts/ShiftForm";
import ShiftStaffAssigner from "@/components/shifts/ShiftStaffAssigner";
import ShiftCalendar from "@/components/shifts/ShiftCalendar";

const SHIFT_PROFILE_LABELS = {
  camarero: "Camarero/a",
  cocinero: "Cocinero/a",
  ayudante_cocina: "Ayudante cocina",
  coctelero: "Coctelero/a",
  azafata: "Azafata/o",
};
const SHIFT_STATUS_LABELS = { draft: "Borrador", published: "Publicado", completed: "Completado", cancelled: "Cancelado" };
const SHIFT_STATUS_COLORS = { draft: "bg-gray-100 text-gray-700", published: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
const SHIFT_PROFILE_COLORS = { camarero: "bg-blue-100 text-blue-800", cocinero: "bg-orange-100 text-orange-800", ayudante_cocina: "bg-yellow-100 text-yellow-800", coctelero: "bg-purple-100 text-purple-800", azafata: "bg-pink-100 text-pink-800" };

const STATUS_LABELS = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En curso", cls: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completado", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
};

const SHIRT_LABELS = { white: "Blanca", black: "Negra" };
const EVENT_TYPE_LABELS = { restauracion: "Restauración", catering: "Catering" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Order.list("-created_date", 200),
      base44.entities.OrderAssignment.list("-created_date", 500),
    ]).then(([ordersData, assignmentsData]) => {
      setOrders(ordersData);
      setAssignments(assignmentsData);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    await base44.entities.Order.delete(id);
    load();
  };

  const handleStatusChange = async (order, status) => {
    const oldStatus = order.status;
    await base44.entities.Order.update(order.id, { status });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
    base44.functions.invoke("notifyOrderChange", {
      type: "status_change",
      order_id: order.id,
      order_number: order.order_number,
      client_name: order.client_name,
      event_place: order.event_place,
      event_date: order.event_date,
      old_status: oldStatus,
      new_status: status,
    }).catch(() => {});
  };

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.event_place?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1">{orders.length} pedidos registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo pedido
        </Button>
      </div>

      <Tabs defaultValue="entrada">
        <TabsList className="mb-4">
          <TabsTrigger value="entrada">Entrada de pedidos</TabsTrigger>
          <TabsTrigger value="gestion">Gestión de pedidos</TabsTrigger>
          <TabsTrigger value="altas">Altas</TabsTrigger>
        </TabsList>

        {/* ── ENTRADA DE PEDIDOS ── */}
        <TabsContent value="entrada">
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar pedido..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {loading ? (
              <div className="divide-y">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex gap-4 animate-pulse">
                    <div className="w-16 h-5 bg-gray-100 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No hay pedidos</div>
            ) : (
              <div className="divide-y">
                {filtered.map(order => {
                  const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                  const mapsUrl = order.location
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`
                    : null;
                  const times = [order.entry_time_1, order.entry_time_2, order.entry_time_3].filter(Boolean);
                  return (
                    <div key={order.id} className="p-4 flex items-start gap-4">
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-20">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{order.order_number}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-semibold text-gray-900">{order.client_name || "—"}</div>
                        <div className="text-sm font-medium text-gray-700">{order.event_place}</div>
                        {mapsUrl ? (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                            <MapPin className="w-3 h-3" />{order.location}
                          </a>
                        ) : order.location ? (
                          <div className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{order.location}</div>
                        ) : null}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {order.event_date && (
                            <span className="text-xs text-gray-500">{format(new Date(order.event_date), "d MMM yyyy", { locale: es })}</span>
                          )}
                          {times.length > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{times.join(" / ")}</span>
                          )}
                          {order.shirt_color && (
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Shirt className="w-3 h-3" />Camisa {SHIRT_LABELS[order.shirt_color]}</span>
                          )}
                          {order.event_type && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{EVENT_TYPE_LABELS[order.event_type]}</span>
                          )}
                          {order.displacement && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Desplazamiento</span>
                          )}
                        </div>
                        {order.notes && <p className="text-xs text-gray-400 italic">{order.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(order); setShowForm(true); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(order.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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

        {/* ── GESTIÓN DE PEDIDOS ── */}
        <TabsContent value="gestion">
          <OrderCalendar
            orders={orders}
            assignments={assignments}
            onSelectOrder={setSelectedOrder}
          />
        </TabsContent>

        {/* ── ALTAS ── */}
        <TabsContent value="altas">
          <AltasTab />
        </TabsContent>
      </Tabs>

      {showForm && (
        <OrderForm
          order={editing}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {selectedOrder && (
        <OrderStaffManager
          order={selectedOrder}
          onClose={() => { setSelectedOrder(null); load(); }}
        />
      )}
    </div>
  );
}