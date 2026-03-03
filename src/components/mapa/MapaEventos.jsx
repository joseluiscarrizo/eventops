import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Calendar, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapaEventos({ pedidos, camareroNombre }) {
  // Filtrar pedidos con coordenadas
  const pedidosConUbicacion = pedidos.filter(p => p.latitud && p.longitud);
  const pedidosSinUbicacion = pedidos.filter(p => !p.latitud || !p.longitud);

  // Centro del mapa (España por defecto o primer pedido con ubicación)
  const center = pedidosConUbicacion.length > 0
    ? [pedidosConUbicacion[0].latitud, pedidosConUbicacion[0].longitud]
    : [40.4168, -3.7038]; // Madrid

  const abrirNavegacion = (pedido) => {
    if (pedido.latitud && pedido.longitud) {
      globalThis.open(`https://www.google.com/maps/dir/?api=1&destination=${pedido.latitud},${pedido.longitud}`, '_blank');
    } else if (pedido.direccion_completa) {
      globalThis.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pedido.direccion_completa)}`, '_blank');
    } else if (pedido.lugar_evento) {
      globalThis.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.lugar_evento)}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mapa */}
      {pedidosConUbicacion.length > 0 ? (
        <Card className="overflow-hidden h-[300px]">
          <MapContainer center={center} zoom={10} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pedidosConUbicacion.map(pedido => (
              <Marker key={pedido.id} position={[pedido.latitud, pedido.longitud]}>
                <Popup>
                  <div className="text-sm">
                    <strong>{pedido.cliente}</strong>
                    <br />
                    {pedido.lugar_evento}
                    <br />
                    {pedido.dia ? format(new Date(pedido.dia), 'dd MMM', { locale: es }) : ''} | {pedido.entrada}-{pedido.salida}
                    <br />
                    <button 
                      onClick={() => abrirNavegacion(pedido)}
                      className="text-blue-600 underline mt-1"
                    >
                      Navegar
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Card>
      ) : (
        <Card className="p-8 text-center text-slate-400">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay eventos con ubicación configurada</p>
        </Card>
      )}

      {/* Lista de eventos */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-3">Eventos con Transporte</h4>
        <div className="space-y-2">
          {pedidos.filter(p => p.extra_transporte).length === 0 ? (
            <p className="text-sm text-slate-400">No hay eventos con transporte</p>
          ) : (
            pedidos.filter(p => p.extra_transporte).map(pedido => (
              <Card key={pedido.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{pedido.cliente}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {pedido.dia ? format(new Date(pedido.dia), 'dd MMM', { locale: es }) : '-'}
                      <Clock className="w-3 h-3 ml-2" />
                      {pedido.entrada}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      {pedido.lugar_evento || 'Sin ubicación'}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => abrirNavegacion(pedido)}
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Eventos sin ubicación */}
      {pedidosSinUbicacion.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="text-amber-500">⚠</span>
            Sin coordenadas ({pedidosSinUbicacion.length})
          </h4>
          <div className="space-y-2">
            {pedidosSinUbicacion.map(pedido => (
              <Card key={pedido.id} className="p-3 bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{pedido.cliente}</p>
                    <p className="text-xs text-slate-500">{pedido.lugar_evento || 'Sin ubicación'}</p>
                  </div>
                  {pedido.lugar_evento && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => globalThis.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.lugar_evento)}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}