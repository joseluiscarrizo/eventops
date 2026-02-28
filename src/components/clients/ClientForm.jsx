import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, RefreshCw, CheckCircle2 } from "lucide-react";

export default function ClientForm({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    name: "",
    contact_person_1: "",
    contact_person_2: "",
    phone_1: "",
    phone_2: "",
    email_1: "",
    email_2: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) setForm({ ...form, ...client });
  }, [client]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (client) {
      await base44.entities.Client.update(client.id, form);
    } else {
      // Generate code: get count then assign CLIXXX
      const all = await base44.entities.Client.list("-created_date", 500);
      const num = String(all.length + 1).padStart(3, "0");
      await base44.entities.Client.create({ ...form, code: `CLI${num}` });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{client ? "Editar cliente" : "Nuevo cliente"}</h2>
          {client?.code && <span className="text-sm font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{client.code}</span>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del Cliente *</label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Razón social o nombre" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Persona de contacto 1</label>
              <Input value={form.contact_person_1} onChange={e => set("contact_person_1", e.target.value)} placeholder="Nombre" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Persona de contacto 2</label>
              <Input value={form.contact_person_2} onChange={e => set("contact_person_2", e.target.value)} placeholder="Nombre" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono 1</label>
              <Input value={form.phone_1} onChange={e => set("phone_1", e.target.value)} placeholder="+54 11..." />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono 2</label>
              <Input value={form.phone_2} onChange={e => set("phone_2", e.target.value)} placeholder="+54 11..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mail 1</label>
              <Input type="email" value={form.email_1} onChange={e => set("email_1", e.target.value)} placeholder="email@ejemplo.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mail 2</label>
              <Input type="email" value={form.email_2} onChange={e => set("email_2", e.target.value)} placeholder="email@ejemplo.com" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observaciones</label>
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