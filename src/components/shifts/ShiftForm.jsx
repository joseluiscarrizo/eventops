import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const PROFILES = [
  { value: "camarero", label: "Camarero/a" },
  { value: "cocinero", label: "Cocinero/a" },
  { value: "ayudante_cocina", label: "Ayudante de cocina" },
  { value: "coctelero", label: "Coctelero/a" },
  { value: "azafata", label: "Azafata/o" },
];

export default function ShiftForm({ shift, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    time_start: "",
    time_end: "",
    profile_required: "camarero",
    slots: 1,
    order_id: "",
    order_name: "",
    location: "",
    notes: "",
    status: "draft",
    ...shift,
  });
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Order.list("-event_date", 100).then(setOrders);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleOrderChange = (orderId) => {
    if (!orderId) { set("order_id", ""); set("order_name", ""); return; }
    const o = orders.find(o => o.id === orderId);
    set("order_id", orderId);
    set("order_name", o?.event_place || o?.order_number || "");
    if (o?.event_date) set("date", o.event_date);
    if (o?.event_place) set("location", o.event_place);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, slots: Number(form.slots) || 1 };
    if (!data.order_id) { delete data.order_id; delete data.order_name; }
    if (shift?.id) {
      await base44.entities.Shift.update(shift.id, data);
    } else {
      await base44.entities.Shift.create(data);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">{shift?.id ? "Editar turno" : "Nuevo turno"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título (opcional)</label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ej: Servicio tarde" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
              <Select value={form.profile_required} onValueChange={v => set("profile_required", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROFILES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio *</label>
              <Input type="time" value={form.time_start} onChange={e => set("time_start", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin *</label>
              <Input type="time" value={form.time_end} onChange={e => set("time_end", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plazas</label>
              <Input type="number" min={1} value={form.slots} onChange={e => set("slots", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pedido vinculado (opcional)</label>
            <Select value={form.order_id || "none"} onValueChange={v => handleOrderChange(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin pedido" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin pedido</SelectItem>
                {orders.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number} – {o.event_place} ({o.event_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
            <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ej: Salón principal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observaciones..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.date || !form.time_start || !form.time_end}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}