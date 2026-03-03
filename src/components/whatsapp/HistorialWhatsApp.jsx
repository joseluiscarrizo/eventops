import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, CheckCircle, XCircle, Clock, Search, User, Calendar, MapPin, Phone, RefreshCw, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function HistorialWhatsApp() {
  const [filtro, setFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const queryClient = useQueryClient();

  const { data: historial = [], isLoading } = useQuery({
    queryKey: ['historial-whatsapp'],
    queryFn: () => base44.entities.HistorialWhatsApp.list('-created_date', 100),
    refetchInterval: 10000
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-whatsapp'],
    queryFn: async () => {
      return await base44.entities.AsignacionCamarero.list();
    }
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-whatsapp'],
    queryFn: async () => {
      return await base44.entities.Pedido.list();
    }
  });

  const marcarConfirmadoMutation = useMutation({
    mutationFn: async ({ asignacionId }) => {
      await base44.entities.AsignacionCamarero.update(asignacionId, {
        estado: 'confirmado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-whatsapp'] });
      toast.success('Asignación marcada como confirmada');
    }
  });

  const reenviarMutation = useMutation({
    mutationFn: async ({ telefono, mensaje }) => {
      const telefonoLimpio = telefono.replace(/\D/g, '');
      let numeroWhatsApp = telefonoLimpio;
      if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
        numeroWhatsApp = '34' + numeroWhatsApp;
      }
      
      const mensajeCodificado = encodeURIComponent(mensaje);
      const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
      
      globalThis.open(whatsappUrl, '_blank');
      
      await base44.entities.HistorialWhatsApp.create({
        telefono: numeroWhatsApp,
        mensaje: mensaje,
        destinatario_nombre: telefono,
        estado: 'enviado',
        proveedor: 'whatsapp_web'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial-whatsapp'] });
      toast.success('Mensaje reenviado');
    }
  });

  const historialFiltrado = historial.filter(item => {
    const coincideFiltro = 
      item.destinatario_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
      item.telefono?.includes(filtro) ||
      item.mensaje?.toLowerCase().includes(filtro.toLowerCase());
    
    const coincideEstado = estadoFiltro === 'todos' || item.estado === estadoFiltro;
    
    return coincideFiltro && coincideEstado;
  });

  const estadisticas = {
    total: historial.length,
    enviados: historial.filter(h => h.estado === 'enviado').length,
    fallidos: historial.filter(h => h.estado === 'fallido').length,
    pendientes: historial.filter(h => h.estado === 'pendiente').length
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'enviado':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case 'fallido':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Fallido</Badge>;
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const obtenerDetallesPedido = (pedidoId) => {
    return pedidos.find(p => p.id === pedidoId);
  };

  const obtenerAsignacion = (asignacionId) => {
    return asignaciones.find(a => a.id === asignacionId);
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-800">{estadisticas.total}</p>
              <p className="text-sm text-slate-500">Total Mensajes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{estadisticas.enviados}</p>
              <p className="text-sm text-slate-500">Enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{estadisticas.fallidos}</p>
              <p className="text-sm text-slate-500">Fallidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{estadisticas.pendientes}</p>
              <p className="text-sm text-slate-500">Pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#1e3a5f]" />
            Historial de Mensajes WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o mensaje..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={estadoFiltro === 'todos' ? 'default' : 'outline'}
                onClick={() => setEstadoFiltro('todos')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={estadoFiltro === 'enviado' ? 'default' : 'outline'}
                onClick={() => setEstadoFiltro('enviado')}
                size="sm"
              >
                Enviados
              </Button>
              <Button
                variant={estadoFiltro === 'fallido' ? 'default' : 'outline'}
                onClick={() => setEstadoFiltro('fallido')}
                size="sm"
              >
                Fallidos
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-center text-slate-400 py-8">Cargando...</p>
              ) : historialFiltrado.length === 0 ? (
                <p className="text-center text-slate-400 py-8">
                  No se encontraron mensajes
                </p>
              ) : (
                historialFiltrado.map(item => {
                  const pedido = item.pedido_id ? obtenerDetallesPedido(item.pedido_id) : null;
                  const asignacion = item.asignacion_id ? obtenerAsignacion(item.asignacion_id) : null;

                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-slate-500" />
                            <h4 className="font-semibold text-slate-800">
                              {item.destinatario_nombre}
                            </h4>
                            {getEstadoBadge(item.estado)}
                            {item.proveedor && (
                              <Badge variant="outline" className="text-xs">
                                {item.proveedor}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                            <Phone className="w-4 h-4" />
                            <span>{item.telefono}</span>
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-slate-400">
                          {format(new Date(item.created_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </div>
                      </div>

                      {/* Detalles del servicio */}
                      {pedido && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
                          <h4 className="font-semibold text-sm text-blue-900 mb-2">📋 Detalles del Servicio</h4>
                          <div className="space-y-1 text-xs text-blue-800">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              <span className="font-medium">{pedido.cliente}</span>
                            </div>
                            {pedido.dia && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(pedido.dia), 'EEEE dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                            {pedido.entrada && pedido.salida && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span>{pedido.entrada} - {pedido.salida}</span>
                              </div>
                            )}
                            {pedido.lugar_evento && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                <span>{pedido.lugar_evento}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {item.mensaje}
                        </p>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2 mb-2">
                        {asignacion && asignacion.estado !== 'confirmado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => marcarConfirmadoMutation.mutate({ asignacionId: asignacion.id })}
                            disabled={marcarConfirmadoMutation.isPending}
                            className="text-xs"
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Marcar Confirmado
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reenviarMutation.mutate({ telefono: item.telefono, mensaje: item.mensaje })}
                          disabled={reenviarMutation.isPending}
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reenviar
                        </Button>
                      </div>
                      
                      {item.plantilla_usada && (
                        <p className="text-xs text-slate-500">
                          Plantilla: {item.plantilla_usada}
                        </p>
                      )}
                      
                      {item.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {item.error}
                        </p>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}