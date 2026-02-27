import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Phone, Mail, User, CheckCircle2 } from "lucide-react";
import ClientForm from "@/components/clients/ClientForm";
import HubSpotPanel from "@/components/clients/HubSpotPanel";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [hubspotClient, setHubspotClient] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Client.list("-created_date", 200).then(data => {
      setClients(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    await base44.entities.Client.delete(id);
    load();
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person_1?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">{clients.length} clientes registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay clientes</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(client => (
            <div key={client.id} className="bg-white rounded-xl border hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mb-1 inline-block">{client.code}</span>
                    <h3 className="font-semibold text-gray-900 leading-tight">{client.name}</h3>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-500">
                  {client.contact_person_1 && (
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{client.contact_person_1}</div>
                  )}
                  {client.phone_1 && (
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone_1}</div>
                  )}
                  {client.email_1 && (
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email_1}</div>
                  )}
                  {client.notes && (
                    <div className="text-xs text-gray-400 mt-2 italic">{client.notes}</div>
                  )}
                </div>
              </div>
              <div className="border-t px-5 py-3 flex items-center justify-end gap-2">
                <button onClick={() => { setEditing(client); setShowForm(true); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ClientForm
          client={editing}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}