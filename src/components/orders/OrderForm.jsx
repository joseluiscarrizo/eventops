import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, MapPin } from "lucide-react";

export default function OrderForm({ order, onSave, onClose }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: "",
    client_name: "",
    event_place: "",
    location: "",
    shirt_color: "",
    entry_time_1: "",
    entry_time_2: "",
    entry_time_3: "",
    event_type: "",
    displacement: false,
    notes: "",
    status: "pending",
    event_date: "",
  });
  const [showTime2, setShowTime2] = useState(false);
  const [showTime3, setShowTime3] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Client.list("-created_date", 200).then(setClients);
    if (order) {
      setForm({ ...form, ...order });
      if (order.entry_time_2) setShowTime2(true);
      if (order.entry_time_3) setShowTime3(true);
    }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientChange = (id) => {
    const client = clients.find(c => c.id === id);
    set("client_id", id);
    set("client_name", client?.name || "");
  };

  const mapsUrl = form.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    if (!showTime2) { data.entry_time_2 = ""; }
    if (!showTime3) { data.entry_time_3 = ""; }

    if (order) {
      await base44.entities.Order.update(order.id, data);
    } else {
      const all = await base44.entities.Order.list("-created_date", 500);
      const num = String(all.length + 1).padStart(3, "0");
      await base44.entities.Order.create({ ...data, order_number: `PED${num}` });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{order ? "Editar pedido" : "Nuevo pedido"}</h2>
            {order?.order_number && (
              <span className="text-sm font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{order.order_number}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cliente *</label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Fecha del evento</label>
              <Input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)} />
            </div>
          </div>

          {/* Lugar del evento */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Lugar del evento *</label>
            <Input
              value={form.event_place}
              onChange={e => set("event_place", e.target.value)}
              required
              placeholder="Nombre del local o espacio"
            />
          </div>

          {/* Ubicación con Google Maps */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Ubicación</label>
            <Input
              value={form.location}
              onChange={e => set("location", e.target.value)}
              placeholder="Dirección completa..."
            />
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs text-indigo-600 hover:underline"
              >
                <MapPin className="w-3 h-3" /> Ver en Google Maps
              </a>
            )}
          </div>

          {/* Camisa y Tipo de evento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Camisa</label>
              <Select value={form.shirt_color} onValueChange={v => set("shirt_color", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Color..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">Blanca</SelectItem>
                  <SelectItem value="black">Negra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de evento</label>
              <Select value={form.event_type} onValueChange={v => set("event_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restauracion">Restauración</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Horas de entrada */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Hora de entrada *</label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={form.entry_time_1}
                onChange={e => set("entry_time_1", e.target.value)}
                required
                className="w-36"
              />
              {!showTime2 && (
                <button type="button" onClick={() => setShowTime2(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Añadir hora
                </button>
              )}
            </div>
            {showTime2 && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={form.entry_time_2}
                  onChange={e => set("entry_time_2", e.target.value)}
                  className="w-36"
                  placeholder="Hora 2"
                />
                <span className="text-xs text-gray-400">Hora 2</span>
                {!showTime3 && (
                  <button type="button" onClick={() => setShowTime3(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 ml-1">
                    <Plus className="w-3 h-3" /> Añadir hora
                  </button>
                )}
                <button type="button" onClick={() => { setShowTime2(false); setShowTime3(false); set("entry_time_2", ""); set("entry_time_3", ""); }} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {showTime3 && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={form.entry_time_3}
                  onChange={e => set("entry_time_3", e.target.value)}
                  className="w-36"
                  placeholder="Hora 3"
                />
                <span className="text-xs text-gray-400">Hora 3</span>
                <button type="button" onClick={() => { setShowTime3(false); set("entry_time_3", ""); }} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Desplazamiento */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Desplazamiento</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set("displacement", true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.displacement ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => set("displacement", false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.displacement ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
              >
                No
              </button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={3}
              placeholder="Notas adicionales..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}