import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Calendar, MapPin, Clock, User, Navigation, CheckCircle2, BellRing } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import NotificacionesCamarero from '../components/camareros/NotificacionesCamarero';
import MapaEventos from '../components/mapa/MapaEventos';
import TareasPendientes from '../components/camareros/TareasPendientes';
import useWebPushNotifications from '../components/notificaciones/WebPushService';
import { useNotificationPolling } from '../components/notificaciones/NotificationPolling';
import NotificacionesAutomaticas from '../components/notificaciones/NotificacionesAutomaticas';

export default function VistaMovil() {
  const [selectedCamarero, setSelectedCamarero] = useState(null);
  const [activeTab, setActiveTab] = useState('notificaciones');
  const { showNotification, permission, requestPermission, canNotify } = useWebPushNotifications();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 200),
    enabled: !!selectedCamarero
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const { data: notificacionesPendientes = [] } = useQuery({
    queryKey: ['notificaciones-camarero', selectedCamarero?.id],
    queryFn: () => base44.entities.NotificacionCamarero.filter(
      { camarero_id: selectedCamarero?.id, respondida: false },
      '-created_date',
      50
    ),
    enabled: !!selectedCamarero?.id
  });

  // Activar polling de notificaciones
  useNotificationPolling(selectedCamarero?.id, !!selectedCamarero?.id);

  // Auto-seleccionar camarero desde localStorage
  useEffect(() => {
    const savedCamareroId = localStorage.getItem('selectedCamareroId');
    if (savedCamareroId && camareros.length > 0) {
      const camarero = camareros.find(c => c.id === savedCamareroId);
      if (camarero) {
        setSelectedCamarero(camarero);
      }
    }
  }, [camareros]);

  // Guardar selección
  useEffect(() => {
    if (selectedCamarero?.id) {
      localStorage.setItem('selectedCamareroId', selectedCamarero.id);
    }
  }, [selectedCamarero]);

  // Obtener pedidos del camarero
  const misPedidos = selectedCamarero ? asignaciones
    .filter(a => a.camarero_id === selectedCamarero.id)
    .map(a => {
      const pedido = pedidos.find(p => p.id === a.pedido_id);
      return pedido ? { ...pedido, asignacion: a } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.dia || '').localeCompare(b.dia || '')) : [];

  // Próximos pedidos (próximos 7 días)
  const hoy = new Date();
  const proximosPedidos = misPedidos.filter(p => {
    if (!p.dia) return false;
    const fecha = parseISO(p.dia);
    const diff = (fecha - hoy) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sistema de Notificaciones Automáticas */}
      {selectedCamarero && (
        <NotificacionesAutomaticas 
          showPushNotifications={canNotify ? showNotification : null}
        />
      )}
      
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Portal Camarero</h1>
              <p className="text-slate-500 text-sm">Gestiona tus asignaciones</p>
            </div>
            {selectedCamarero && !canNotify && permission !== 'denied' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestPermission}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <BellRing className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Push</span>
              </Button>
            )}
          </div>
          {canNotify && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-700">Notificaciones activas</span>
            </div>
          )}
        </div>

        {/* Selector de Camarero */}
        <Card className="p-4 mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Selecciona tu perfil</label>
          <Select 
            value={selectedCamarero?.id || ''} 
            onValueChange={(id) => setSelectedCamarero(camareros.find(c => c.id === id))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu nombre..." />
            </SelectTrigger>
            <SelectContent>
              {camareros.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {c.nombre} <span className="text-slate-400">#{c.codigo}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {selectedCamarero ? (
          <>
            {/* Badge de notificaciones pendientes */}
            {notificacionesPendientes.length > 0 && (
              <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">
                      {notificacionesPendientes.length} pedido(s) pendiente(s)
                    </p>
                    <p className="text-sm text-amber-600">Requieren tu respuesta</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="notificaciones" className="relative text-xs sm:text-sm">
                  <Bell className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Alertas</span>
                  {notificacionesPendientes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificacionesPendientes.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tareas" className="text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Tareas</span>
                </TabsTrigger>
                <TabsTrigger value="pedidos" className="text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Pedidos</span>
                </TabsTrigger>
                <TabsTrigger value="mapa" className="text-xs sm:text-sm">
                  <Navigation className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Mapa</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notificaciones">
                <NotificacionesCamarero 
                  camareroId={selectedCamarero.id} 
                  camareroNombre={selectedCamarero.nombre}
                />
              </TabsContent>

              <TabsContent value="tareas">
                <TareasPendientes camareroId={selectedCamarero.id} />
              </TabsContent>

              <TabsContent value="pedidos">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">Próximos Pedidos ({proximosPedidos.length})</h3>
                  
                  {proximosPedidos.length === 0 ? (
                    <Card className="p-8 text-center text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No tienes pedidos próximos</p>
                    </Card>
                  ) : (
                    proximosPedidos.map(pedido => (
                      <Card key={pedido.id} className={`p-4 ${
                        pedido.asignacion?.estado === 'confirmado' ? 'border-l-4 border-l-emerald-500' :
                        pedido.asignacion?.estado === 'alta' ? 'border-l-4 border-l-blue-500' :
                        pedido.asignacion?.estado === 'enviado' ? 'border-l-4 border-l-orange-500' :
                        'border-l-4 border-l-slate-300'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-slate-800">{pedido.cliente}</h4>
                          <Badge className={
                            pedido.asignacion?.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                            pedido.asignacion?.estado === 'alta' ? 'bg-blue-100 text-blue-700' :
                            pedido.asignacion?.estado === 'enviado' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {pedido.asignacion?.estado || 'pendiente'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{pedido.dia ? format(parseISO(pedido.dia), 'EEEE dd MMMM', { locale: es }) : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{pedido.entrada || '-'} - {pedido.salida || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{pedido.lugar_evento || 'Sin ubicación'}</span>
                          </div>
                          {pedido.camisa && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                Camisa: {pedido.camisa}
                              </span>
                            </div>
                          )}
                        </div>

                        {pedido.direccion_completa && (
                          <Button 
                            variant="outline" 
                            className="w-full mt-3"
                            onClick={() => globalThis.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pedido.direccion_completa)}`, '_blank')}
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            Cómo llegar
                          </Button>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="mapa">
                <MapaEventos 
                  pedidos={proximosPedidos} 
                  camareroNombre={selectedCamarero.nombre}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="p-8 text-center text-slate-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Selecciona tu perfil para ver tus asignaciones</p>
          </Card>
        )}
      </div>
    </div>
  );
}