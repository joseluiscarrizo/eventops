import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle2, Users, Phone, Mail, X, ExternalLink, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HubSpotPanel({ client, onSynced, onClose }) {
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hubData, setHubData] = useState(null);
  const [appEvents, setAppEvents] = useState([]);
  const [appOrders, setAppOrders] = useState([]);

  useEffect(() => {
    // Load event/order history from app
    Promise.all([
      base44.entities.Order.filter({ client_id: client.id }, "-event_date", 20),
      base44.entities.Event.list("-date_start", 50),
    ]).then(([orders, events]) => {
      setAppOrders(orders);
      setAppEvents(events);
    });

    if (client.hubspot_company_id) {
      loadHubSpotData(client.hubspot_company_id);
    }
  }, [client]);

  const loadHubSpotData = async (companyId) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('hubspotGetCompany', { company_id: companyId });
      setHubData(res.data);
    } catch (e) {}
    setLoading(false);
  };

  const syncToHubSpot = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('hubspotSync', { action: 'sync_client', client_id: client.id });
      if (res.data?.hubspot_company_id) {
        await loadHubSpotData(res.data.hubspot_company_id);
        onSynced?.();
      }
    } catch (e) {
      alert("Error al sincronizar: " + e.message);
    }
    setSyncing(false);
  };

  const ordersByEvent = appOrders.reduce((acc, order) => {
    const key = order.event_place || "Sin evento";
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});

  const statusLabels = { pending: "Pendiente", confirmed: "Confirmado", in_progress: "En curso", completed: "Completado", cancelled: "Cancelado" };
  const statusColors = { pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700", in_progress: "bg-purple-100 text-purple-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700" };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900">{client.name}</h2>
            <p className="text-xs text-gray-400">{client.code}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* HubSpot Sync Section */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img src="https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_approved-sprocket-web.png" alt="HubSpot" className="w-5 h-5" onError={(e) => e.target.style.display='none'} />
                <span className="font-semibold text-sm text-gray-900">HubSpot CRM</span>
                {client.hubspot_company_id && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizado
                  </span>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={syncToHubSpot} disabled={syncing} className="h-7 text-xs gap-1.5">
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {client.hubspot_company_id ? "Actualizar" : "Sincronizar"}
              </Button>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-orange-100 rounded w-2/3" />
                <div className="h-3 bg-orange-100 rounded w-1/2" />
              </div>
            ) : hubData ? (
              <div className="space-y-3">
                <div className="space-y-1.5 text-sm text-gray-600">
                  {hubData.company?.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{hubData.company.phone}</div>}
                  {hubData.company?.description && <div className="text-xs text-gray-400 italic">{hubData.company.description}</div>}
                </div>
                {hubData.contacts?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><Users className="w-3 h-3" />Contactos en HubSpot</p>
                    <div className="space-y-1.5">
                      {hubData.contacts.map(c => (
                        <div key={c.id} className="bg-white rounded-lg border px-3 py-2 text-xs flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700">{c.properties?.firstname} {c.properties?.lastname}</div>
                            {c.properties?.email && <div className="text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{c.properties.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {client.hubspot_company_id && (
                  <a
                    href={`https://app.hubspot.com/contacts/companies/${client.hubspot_company_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver en HubSpot
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sincroniza para ver datos del CRM</p>
            )}
          </div>

          {/* Event History */}
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Historial de pedidos ({appOrders.length})
            </h3>
            {appOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin pedidos registrados</p>
            ) : (
              <div className="space-y-2">
                {appOrders.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-lg border px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-800">{order.event_place}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {order.event_date || "Sin fecha"} · {order.event_type} · #{order.order_number}
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    {order.notes && <div className="text-xs text-gray-400 mt-1 italic">{order.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}