import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function NotificacionesAutomaticas({ showPushNotifications }) {
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-automaticas'],
    queryFn: () => base44.entities.Pedido.list('dia', 500),
    refetchInterval: 10 * 60 * 1000, // Reducido a 10 minutos
    staleTime: 8 * 60 * 1000
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-automaticas'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000),
    refetchInterval: 15 * 60 * 1000, // Reducido a 15 minutos
    staleTime: 12 * 60 * 1000
  });

  const { data: tareas = [] } = useQuery({
    queryKey: ['tareas-automaticas'],
    queryFn: () => base44.entities.Tarea.list('-created_date', 1000),
    refetchInterval: 15 * 60 * 1000, // Reducido a 15 minutos
    staleTime: 12 * 60 * 1000
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores-automaticas'],
    queryFn: () => base44.entities.Coordinador.list('nombre'),
    staleTime: 30 * 60 * 1000, // Los coordinadores no cambian frecuentemente
    cacheTime: 60 * 60 * 1000
  });

  useEffect(() => {
    if (pedidos.length === 0) return;
    
    const verificarNotificaciones = async () => {
      const ahora = new Date();
      
      // 1. EVENTOS PRÓXIMOS (24 horas antes)
      for (const pedido of pedidos) {
        if (!pedido.dia) continue;
        
        const fechaEvento = new Date(pedido.dia);
        const horasHastaEvento = differenceInHours(fechaEvento, ahora);
        const diasHastaEvento = differenceInDays(fechaEvento, ahora);
        
        // Notificar 24 horas antes (entre 23 y 25 horas para dar margen)
        if (horasHastaEvento > 23 && horasHastaEvento < 25) {
          const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
          
          // Notificar a cada camarero asignado
          for (const asignacion of asignacionesPedido) {
            try {
              // Verificar si ya existe notificación reciente
              const notificacionesExistentes = await base44.entities.NotificacionCamarero.filter({
                camarero_id: asignacion.camarero_id,
                pedido_id: pedido.id,
                tipo: 'recordatorio'
              });
              
              const tieneNotificacionReciente = notificacionesExistentes.some(n => {
                const fechaNotif = new Date(n.created_date);
                return differenceInHours(ahora, fechaNotif) < 12;
              });
              
              if (!tieneNotificacionReciente) {
                await base44.entities.NotificacionCamarero.create({
                  camarero_id: asignacion.camarero_id,
                  camarero_nombre: asignacion.camarero_nombre,
                  pedido_id: pedido.id,
                  tipo: 'recordatorio',
                  titulo: '⏰ Recordatorio: Servicio Mañana',
                  mensaje: `Tienes un servicio mañana con ${pedido.cliente}`,
                  cliente: pedido.cliente,
                  lugar_evento: pedido.lugar_evento,
                  fecha: pedido.dia,
                  hora_entrada: pedido.entrada,
                  hora_salida: pedido.salida,
                  leida: false
                });
                
                // Push notification
                const config = JSON.parse(localStorage.getItem('notif_config') || '{}');
                if (showPushNotifications && config.recordatorios !== false) {
                  showPushNotifications(
                    '⏰ Servicio Mañana',
                    { 
                      body: `Tienes un servicio con ${pedido.cliente} en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
                      tag: 'recordatorio-evento'
                    }
                  );
                }
              }
            } catch (error) {
              console.error('Error creando notificación evento próximo:', error);
            }
          }
          
          // Notificar al coordinador
          try {
            const notificacionesCoord = await base44.entities.Notificacion.filter({
              pedido_id: pedido.id,
              tipo: 'evento_proximo'
            });
            
            const tieneNotificacionCoordReciente = notificacionesCoord.some(n => {
              const fechaNotif = new Date(n.created_date);
              return differenceInHours(ahora, fechaNotif) < 12;
            });
            
            if (!tieneNotificacionCoordReciente) {
              await base44.entities.Notificacion.create({
                tipo: 'evento_proximo',
                titulo: '📅 Evento Mañana',
                mensaje: `El evento de ${pedido.cliente} es mañana en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
                pedido_id: pedido.id,
                prioridad: 'media',
                leida: false
              });
            }
          } catch (error) {
            console.error('Error notificando coordinador:', error);
          }
        }
        
        // 2. PEDIDOS INCOMPLETOS (12 horas antes)
        if (horasHastaEvento > 11 && horasHastaEvento < 13) {
          const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
          const cantidadAsignados = asignacionesPedido.length;
          const cantidadNecesaria = pedido.turnos?.length > 0
            ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
            : (pedido.cantidad_camareros || 0);
          
          if (cantidadAsignados < cantidadNecesaria) {
            try {
              const notificacionesIncompleto = await base44.entities.Notificacion.filter({
                pedido_id: pedido.id,
                tipo: 'alerta'
              });
              
              const tieneAlertaReciente = notificacionesIncompleto.some(n => {
                const fechaNotif = new Date(n.created_date);
                return differenceInHours(ahora, fechaNotif) < 6;
              });
              
              if (!tieneAlertaReciente) {
                const mensaje = `⚠️ URGENTE: El evento de ${pedido.cliente} mañana necesita ${cantidadNecesaria} camareros pero solo tiene ${cantidadAsignados} asignados`;
                
                // Verificar configuración del usuario
                const config = JSON.parse(localStorage.getItem('notif_config') || '{}');
                
                if (config.alertasUrgentes?.pedidoIncompleto !== false) {
                  await base44.entities.Notificacion.create({
                    tipo: 'alerta',
                    titulo: '🚨 Pedido Incompleto - Acción Requerida',
                    mensaje,
                    pedido_id: pedido.id,
                    prioridad: 'urgente',
                    leida: false
                  });
                  
                  // Push notification urgente
                  if (showPushNotifications && config.habilitadas !== false) {
                    showPushNotifications('🚨 Pedido Incompleto', mensaje);
                  }

                  // Toast visual
                  toast.error(mensaje, {
                    duration: 10000,
                    icon: '🚨'
                  });
                }
                
                // Enviar email a coordinadores
                for (const coord of coordinadores) {
                  if (coord.email && coord.notificaciones_email) {
                    try {
                      await base44.integrations.Core.SendEmail({
                        to: coord.email,
                        subject: `🚨 URGENTE: Pedido Incompleto - ${pedido.cliente}`,
                        body: `
Hola ${coord.nombre},

⚠️ ALERTA URGENTE: Se requiere acción inmediata

📋 Cliente: ${pedido.cliente}
📅 Fecha: ${format(fechaEvento, "dd 'de' MMMM yyyy", { locale: es })} (MAÑANA)
🕐 Horario: ${pedido.entrada || '-'} - ${pedido.salida || '-'}
📍 Ubicación: ${pedido.lugar_evento || 'Por confirmar'}

👥 Camareros necesarios: ${cantidadNecesaria}
✅ Camareros asignados: ${cantidadAsignados}
❌ FALTAN: ${cantidadNecesaria - cantidadAsignados}

Por favor, asigna los camareros faltantes lo antes posible.

Saludos,
Sistema de Gestión de Camareros
                        `
                      });
                    } catch (emailError) {
                      console.error('Error enviando email urgente:', emailError);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error creando alerta pedido incompleto:', error);
            }
          }
        }
      }
      
      // 3. TAREAS PENDIENTES (recordatorio diario)
      const tareasPendientes = tareas.filter(t => !t.completada && t.fecha_limite);
      
      for (const tarea of tareasPendientes) {
        const fechaLimite = new Date(tarea.fecha_limite);
        const diasHastaLimite = differenceInDays(fechaLimite, ahora);
        
        // Recordar tareas que vencen hoy o mañana
        if (diasHastaLimite >= 0 && diasHastaLimite <= 1) {
          try {
            const notificacionesTarea = await base44.entities.NotificacionCamarero.filter({
              camarero_id: tarea.camarero_id,
              tipo: 'recordatorio'
            });
            
            const tieneRecordatorioReciente = notificacionesTarea.some(n => {
              const fechaNotif = new Date(n.created_date);
              return differenceInHours(ahora, fechaNotif) < 24 && 
                     n.mensaje?.includes(tarea.titulo);
            });
            
            if (!tieneRecordatorioReciente) {
              const urgencia = diasHastaLimite === 0 ? '🔴 HOY' : '⚠️ MAÑANA';
              
              await base44.entities.NotificacionCamarero.create({
                camarero_id: tarea.camarero_id,
                camarero_nombre: tarea.camarero_nombre,
                pedido_id: tarea.pedido_id,
                tipo: 'recordatorio',
                titulo: `${urgencia}: Tarea Pendiente`,
                mensaje: `Recuerda: ${tarea.titulo}`,
                leida: false
              });
              
              const config = JSON.parse(localStorage.getItem('notif_config') || '{}');
              if (showPushNotifications && config.tareasPendientes !== false) {
                showPushNotifications(
                  `${urgencia}: Tarea Pendiente`,
                  { 
                    body: tarea.titulo,
                    tag: 'tarea-pendiente'
                  }
                );
              }
            }
          } catch (error) {
            console.error('Error recordatorio tarea:', error);
          }
        }
      }
    };
    
    verificarNotificaciones();
  }, [pedidos, asignaciones, tareas, coordinadores, showPushNotifications]);

  return null;
}