import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, MapPin, Clock, Calendar, AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function NotificacionesCamarero({ camareroId, camareroNombre }) {
  const [showRechazoDialog, setShowRechazoDialog] = useState(false);
  const [notificacionActual, setNotificacionActual] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [detalleNotificacion, setDetalleNotificacion] = useState(null);

  const queryClient = useQueryClient();

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const { data: notificaciones = [], isLoading } = useQuery({
    queryKey: ['notificaciones-camarero', camareroId],
    queryFn: () => base44.entities.NotificacionCamarero.filter({ camarero_id: camareroId }, '-created_date', 50),
    enabled: !!camareroId
  });

  // Marcar como leídas automáticamente después de 3 segundos
  useEffect(() => {
    const noLeidas = notificaciones.filter(n => !n.leida && n.tipo !== 'nueva_asignacion');
    if (noLeidas.length > 0) {
      const timer = setTimeout(async () => {
        for (const notif of noLeidas) {
          try {
            await base44.entities.NotificacionCamarero.update(notif.id, { leida: true });
          } catch (error) {
            console.error('Error marking as read:', error);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero', camareroId] });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notificaciones, camareroId, queryClient]);

  const pendientes = notificaciones.filter(n => !n.respondida && n.tipo === 'nueva_asignacion');
  const historial = notificaciones.filter(n => n.respondida || n.tipo !== 'nueva_asignacion');

  const marcarVistaMutation = useMutation({
    mutationFn: async (notificacionId) => {
      await base44.entities.NotificacionCamarero.update(notificacionId, {
        leida: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      toast.success('Notificación marcada como vista');
    }
  });

  const responderMutation = useMutation({
    mutationFn: async ({ notificacionId, respuesta, motivo }) => {
      // Actualizar notificación
      await base44.entities.NotificacionCamarero.update(notificacionId, {
        respondida: true,
        respuesta,
        motivo_rechazo: motivo || null,
        leida: true
      });

      const notif = notificaciones.find(n => n.id === notificacionId);
      
      // Obtener información del camarero y coordinador
      const camarero = await base44.entities.Camarero.filter({ id: camareroId });
      const coordinadorId = camarero[0]?.coordinador_id;
      let coordinador = null;
      
      if (coordinadorId) {
        const coords = await base44.entities.Coordinador.filter({ id: coordinadorId });
        coordinador = coords[0];
      }
      
      if (respuesta === 'aceptado') {
        // Actualizar asignación a confirmado
        if (notif?.asignacion_id) {
          await base44.entities.AsignacionCamarero.update(notif.asignacion_id, {
            estado: 'confirmado'
          });
        }
        
        // Cambiar estado del camarero a ocupado
        await base44.entities.Camarero.update(camareroId, {
          estado_actual: 'ocupado'
        });
        
        const mensajeNotif = `${camareroNombre} ha aceptado el servicio de ${notif?.cliente} para el ${notif?.fecha ? format(new Date(notif.fecha), 'dd/MM/yyyy', { locale: es }) : 'fecha pendiente'}`;
        
        // Notificar al coordinador in-app
        await base44.entities.Notificacion.create({
          tipo: 'estado_cambio',
          titulo: '✅ Asignación Aceptada',
          mensaje: mensajeNotif,
          prioridad: 'media',
          pedido_id: notif?.pedido_id,
          coordinador: coordinador?.nombre,
          email_enviado: false
        });
        
        // Enviar email al coordinador si tiene email configurado
        if (coordinador?.email && coordinador?.notificaciones_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: coordinador.email,
              subject: `✅ Asignación Aceptada - ${notif?.cliente}`,
              body: `
Hola ${coordinador.nombre},

El camarero ${camareroNombre} ha ACEPTADO el servicio:

📋 Cliente: ${notif?.cliente}
📅 Fecha: ${notif?.fecha ? format(new Date(notif.fecha), "dd 'de' MMMM yyyy", { locale: es }) : 'Pendiente'}
🕐 Horario: ${notif?.hora_entrada || '-'} - ${notif?.hora_salida || '-'}
📍 Ubicación: ${notif?.lugar_evento || 'Por confirmar'}

El camarero ya está confirmado y su estado ha cambiado a "Ocupado".

Saludos,
Sistema de Gestión de Camareros
              `
            });
            
            // Marcar email como enviado
            const notifCreada = await base44.entities.Notificacion.filter({ 
              mensaje: mensajeNotif 
            });
            if (notifCreada[0]) {
              await base44.entities.Notificacion.update(notifCreada[0].id, { 
                email_enviado: true 
              });
            }
          } catch (emailError) {
            console.error('Error enviando email:', emailError);
          }
        }
      } else if (respuesta === 'rechazado') {
        // Eliminar asignación
        if (notif?.asignacion_id) {
          await base44.entities.AsignacionCamarero.delete(notif.asignacion_id);
        }
        
        // Cambiar estado del camarero a disponible
        await base44.entities.Camarero.update(camareroId, {
          estado_actual: 'disponible'
        });
        
        const mensajeNotif = `${camareroNombre} ha rechazado el servicio de ${notif?.cliente}${motivo ? `. Motivo: ${motivo}` : ' (sin motivo especificado)'}`;
        
        // Notificar al coordinador in-app
        await base44.entities.Notificacion.create({
          tipo: 'alerta',
          titulo: '❌ Asignación Rechazada',
          mensaje: mensajeNotif,
          prioridad: 'alta',
          pedido_id: notif?.pedido_id,
          coordinador: coordinador?.nombre,
          email_enviado: false
        });
        
        // Enviar email al coordinador si tiene email configurado
        if (coordinador?.email && coordinador?.notificaciones_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: coordinador.email,
              subject: `❌ URGENTE: Asignación Rechazada - ${notif?.cliente}`,
              body: `
Hola ${coordinador.nombre},

⚠️ ATENCIÓN: El camarero ${camareroNombre} ha RECHAZADO el servicio:

📋 Cliente: ${notif?.cliente}
📅 Fecha: ${notif?.fecha ? format(new Date(notif.fecha), "dd 'de' MMMM yyyy", { locale: es }) : 'Pendiente'}
🕐 Horario: ${notif?.hora_entrada || '-'} - ${notif?.hora_salida || '-'}
📍 Ubicación: ${notif?.lugar_evento || 'Por confirmar'}

${motivo ? `💬 Motivo del rechazo: "${motivo}"` : '💬 No se proporcionó motivo del rechazo'}

El camarero está ahora disponible para otras asignaciones. Se recomienda buscar un reemplazo lo antes posible.

Saludos,
Sistema de Gestión de Camareros
              `
            });
            
            // Marcar email como enviado
            const notifCreada = await base44.entities.Notificacion.filter({ 
              mensaje: mensajeNotif 
            });
            if (notifCreada[0]) {
              await base44.entities.Notificacion.update(notifCreada[0].id, { 
                email_enviado: true 
              });
            }
          } catch (emailError) {
            console.error('Error enviando email:', emailError);
          }
        }
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      
      if (variables.respuesta === 'aceptado') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      
      // Eliminar notificación después de responder
      const notif = notificaciones.find(n => n.id === variables.notificacionId);
      if (notif?.id) {
        try {
          await base44.entities.NotificacionCamarero.delete(notif.id);
          queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
        } catch (error) {
          console.error('Error eliminando notificación:', error);
        }
      }
      
      setShowRechazoDialog(false);
      setMotivoRechazo('');
    }
  });

  const handleAceptar = (notificacion) => {
    responderMutation.mutate({ 
      notificacionId: notificacion.id, 
      respuesta: 'aceptado' 
    });
    toast.success('Pedido aceptado');
  };

  const handleRechazar = (notificacion) => {
    setNotificacionActual(notificacion);
    setShowRechazoDialog(true);
  };

  const confirmarRechazo = () => {
    if (notificacionActual) {
      responderMutation.mutate({
        notificacionId: notificacionActual.id,
        respuesta: 'rechazado',
        motivo: motivoRechazo
      });
      toast.info('Pedido rechazado');
    }
  };

  const verDetalle = (notificacion) => {
    const pedido = pedidos.find(p => p.id === notificacion.pedido_id);
    setDetalleNotificacion({ ...notificacion, pedido });
    setShowDetalleDialog(true);
  };

  const marcarComoVista = (notificacion) => {
    marcarVistaMutation.mutate(notificacion.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificaciones Pendientes */}
      {pendientes.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pendientes de Respuesta ({pendientes.length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {pendientes.map(notif => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card className={`p-5 border-l-4 ${
                    notif.prioridad === 'urgente' ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-white' :
                    notif.prioridad === 'importante' ? 'border-l-orange-500 bg-gradient-to-r from-orange-50 to-white' :
                    'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white'
                  } shadow-lg`}>
                    <div className="space-y-4">
                      {/* Título Principal */}
                      <div className="text-center pb-3 border-b border-slate-200">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {notif.prioridad === 'urgente' && (
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                          )}
                          {notif.prioridad === 'importante' && (
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                          )}
                          <h4 className="text-xl font-bold text-slate-800">
                            {notif.prioridad === 'urgente' ? '⚠️ URGENTE: ' : notif.prioridad === 'importante' ? '⚡ IMPORTANTE: ' : '🔔 '}
                            {notif.titulo || 'Nueva Asignación de Servicio'}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-600">
                          Has sido seleccionado para el siguiente evento
                        </p>
                      </div>

                      {/* Información del Evento - Mensaje Completo */}
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                          {notif.mensaje}
                        </div>
                      </div>

                      {/* Mensaje de Confirmación */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="font-semibold text-amber-900 mb-1">
                          ⚠️ Confirma tu asistencia
                        </p>
                        <p className="text-xs text-amber-700">
                          Por favor, confirma si puedes asistir a este servicio
                        </p>
                      </div>

                      {/* Botones de Acción */}
                      <div className="space-y-3 pt-2">
                        <Button
                          onClick={() => verDetalle(notif)}
                          variant="outline"
                          className="w-full h-10 text-sm"
                        >
                          Ver detalles completos
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => handleAceptar(notif)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold shadow-md"
                            disabled={responderMutation.isPending}
                          >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Confirmar
                          </Button>
                          <Button
                            onClick={() => handleRechazar(notif)}
                            className="bg-red-600 hover:bg-red-700 text-white h-12 text-base font-semibold shadow-md"
                            disabled={responderMutation.isPending}
                          >
                            <XCircle className="w-5 h-5 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Historial */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-500" />
          Historial de Notificaciones
        </h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {historial.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No hay notificaciones</p>
            ) : (
              historial.map(notif => (
                <Card key={notif.id} className={`p-3 cursor-pointer hover:bg-slate-100 transition-colors ${notif.leida ? 'bg-slate-50' : 'bg-white border-l-2 border-l-blue-500'} ${
                  notif.prioridad === 'urgente' ? 'border-2 border-red-300' :
                  notif.prioridad === 'importante' ? 'border-2 border-orange-300' : ''
                }`}
                onClick={() => verDetalle(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notif.respuesta === 'aceptado' ? 'bg-emerald-100' :
                      notif.respuesta === 'rechazado' ? 'bg-red-100' : 
                      notif.prioridad === 'urgente' ? 'bg-red-100' :
                      notif.prioridad === 'importante' ? 'bg-orange-100' : 'bg-slate-100'
                    }`}>
                      {notif.respuesta === 'aceptado' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                       notif.respuesta === 'rechazado' ? <XCircle className="w-4 h-4 text-red-600" /> :
                       (notif.prioridad === 'urgente' || notif.prioridad === 'importante') ? 
                       <AlertTriangle className={`w-4 h-4 ${notif.prioridad === 'urgente' ? 'text-red-600' : 'text-orange-600'}`} /> :
                       <Bell className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!notif.leida && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        )}
                        <span className="font-medium text-sm text-slate-800">{notif.titulo}</span>
                        {notif.prioridad === 'urgente' && (
                          <Badge className="bg-red-500 text-white text-xs">URGENTE</Badge>
                        )}
                        {notif.prioridad === 'importante' && (
                          <Badge className="bg-orange-500 text-white text-xs">IMPORTANTE</Badge>
                        )}
                        {notif.respuesta && notif.respuesta !== 'pendiente' && (
                          <Badge className={
                            notif.respuesta === 'aceptado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }>
                            {notif.respuesta}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.mensaje}</p>
                      {notif.motivo_rechazo && (
                        <p className="text-xs text-red-500 mt-1">Motivo: {notif.motivo_rechazo}</p>
                      )}
                      {!notif.leida && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarComoVista(notif);
                          }}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Marcar como vista
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Dialog de Rechazo */}
      <Dialog open={showRechazoDialog} onOpenChange={setShowRechazoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de rechazar este pedido? El coordinador será notificado.
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700">Motivo del rechazo (opcional)</label>
              <Textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Indica el motivo..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRechazoDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmarRechazo}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={responderMutation.isPending}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalle */}
      <Dialog open={showDetalleDialog} onOpenChange={setShowDetalleDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Servicio</DialogTitle>
          </DialogHeader>
          {detalleNotificacion && (
            <div className="space-y-4">
              {/* Información del Evento */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1e3a5f]" />
                  <div>
                    <p className="text-xs text-slate-500">Cliente</p>
                    <p className="font-semibold text-slate-800">{detalleNotificacion.cliente || '-'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1e3a5f]" />
                  <div>
                    <p className="text-xs text-slate-500">Fecha</p>
                    <p className="font-medium text-slate-800">
                      {detalleNotificacion.fecha ? format(new Date(detalleNotificacion.fecha), "EEEE, dd 'de' MMMM yyyy", { locale: es }) : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1e3a5f]" />
                  <div>
                    <p className="text-xs text-slate-500">Horario</p>
                    <p className="font-medium text-slate-800">
                      {detalleNotificacion.hora_entrada || '-'} - {detalleNotificacion.hora_salida || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Lugar del Evento</p>
                    <p className="font-medium text-slate-800">{detalleNotificacion.lugar_evento || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Mensaje Completo */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Información del Servicio</p>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {detalleNotificacion.mensaje}
                  </p>
                </div>
              </div>

              {/* Detalles Adicionales del Pedido */}
              {detalleNotificacion.pedido && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Detalles Adicionales</p>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    {detalleNotificacion.pedido.camisa && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Camisa:</span>
                        <span className="font-medium text-slate-800 capitalize">{detalleNotificacion.pedido.camisa}</span>
                      </div>
                    )}
                    {detalleNotificacion.pedido.extra_transporte !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Transporte:</span>
                        <span className="font-medium text-slate-800">
                          {detalleNotificacion.pedido.extra_transporte ? '✓ Incluido' : 'No incluido'}
                        </span>
                      </div>
                    )}
                    {detalleNotificacion.pedido.notas && (
                      <div>
                        <span className="text-slate-600">Notas:</span>
                        <p className="mt-1 text-slate-800">{detalleNotificacion.pedido.notas}</p>
                      </div>
                    )}
                    {detalleNotificacion.pedido.link_ubicacion && (
                      <div>
                        <span className="text-slate-600">Ubicación:</span>
                        <a 
                          href={detalleNotificacion.pedido.link_ubicacion} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mt-1 text-blue-600 hover:underline break-all"
                        >
                          Ver en Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estado */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  {detalleNotificacion.respuesta === 'aceptado' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">Servicio Aceptado</span>
                    </>
                  )}
                  {detalleNotificacion.respuesta === 'rechazado' && (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Servicio Rechazado</span>
                    </>
                  )}
                  {detalleNotificacion.respuesta === 'pendiente' && (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">Pendiente de Respuesta</span>
                    </>
                  )}
                </div>
                {!detalleNotificacion.leida && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      marcarComoVista(detalleNotificacion);
                      setShowDetalleDialog(false);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marcar como vista
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}