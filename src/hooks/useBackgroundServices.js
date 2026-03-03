/**
 * useBackgroundServices
 *
 * Hook unificado que reemplaza los 3 componentes de servicios background
 * montados independientemente en Layout.jsx:
 *   - NotificacionesAutomaticas (refetch 10-15 min)
 *   - ServicioRecordatorios     (refetch 60s, causa saturación en móviles)
 *   - RecordatoriosProactivos   (refetch 60s, duplica llamadas de ServicioRecordatorios)
 *
 * Mejoras implementadas:
 *  - Una sola fuente de datos compartida (pedidos, asignaciones, camareros)
 *  - Guard isRunning para evitar ejecuciones solapadas
 *  - Intervalo único configurable (por defecto 5 min) con visibilitychange
 *  - Los recordatorios WhatsApp solo se disparan si el tab está visible
 *    (evita abrir wa.me en background)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  differenceInHours,
  differenceInDays,
  format,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// ─── Intervalos ────────────────────────────────────────────────────────────────
const REFETCH_PEDIDOS_MS        = 10 * 60 * 1000;  // 10 min
const REFETCH_ASIGNACIONES_MS   = 15 * 60 * 1000;  // 15 min
const REFETCH_CAMAREROS_MS      = 15 * 60 * 1000;  // 15 min
const REFETCH_RECORDATORIOS_MS  = 5  * 60 * 1000;  // 5 min (antes 60s × 3 servicios)
const RUN_INTERVAL_MS           = 5  * 60 * 1000;  // ciclo de verificación global

export function useBackgroundServices({ showPushNotifications } = {}) {
  const _queryClient  = useQueryClient();
  const isRunningRef  = useRef(false);
  const lastRunRef    = useRef(null);
  const intervalRef   = useRef(null);

  // ─── Datos compartidos ───────────────────────────────────────────────────────
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-bg'],
    queryFn: () => base44.entities.Pedido.list('dia', 500),
    refetchInterval: REFETCH_PEDIDOS_MS,
    staleTime: 8 * 60 * 1000,
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-bg'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000),
    refetchInterval: REFETCH_ASIGNACIONES_MS,
    staleTime: 12 * 60 * 1000,
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros-bg'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    refetchInterval: REFETCH_CAMAREROS_MS,
    staleTime: 12 * 60 * 1000,
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores-bg'],
    queryFn: () => base44.entities.Coordinador.list('nombre'),
    staleTime: 30 * 60 * 1000,
  });

  const { data: tareas = [] } = useQuery({
    queryKey: ['tareas-bg'],
    queryFn: () => base44.entities.Tarea.list('-created_date', 1000),
    refetchInterval: REFETCH_ASIGNACIONES_MS,
    staleTime: 12 * 60 * 1000,
  });

  const { data: configRecordatorios } = useQuery({
    queryKey: ['config-recordatorios-bg'],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracionRecordatorios.list();
      return configs[0] || null;
    },
    refetchInterval: REFETCH_RECORDATORIOS_MS,
    staleTime: 4 * 60 * 1000,
  });

  const { data: recordatoriosEnviados = [] } = useQuery({
    queryKey: ['recordatorios-enviados-bg'],
    queryFn: () => base44.entities.RecordatorioEnviado.list('-created_date', 500),
    refetchInterval: REFETCH_RECORDATORIOS_MS,
    staleTime: 4 * 60 * 1000,
  });

  const { data: historialWhatsApp = [] } = useQuery({
    queryKey: ['historial-whatsapp-bg'],
    queryFn: () => base44.entities.HistorialWhatsApp.list('-created_date', 100),
    refetchInterval: REFETCH_RECORDATORIOS_MS,
    staleTime: 4 * 60 * 1000,
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getNotifConfig = () => {
    try {
      return JSON.parse(localStorage.getItem('notif_config') || '{}');
    } catch {
      return {};
    }
  };

  // ─── 1. Notificaciones automáticas (in-app + push) ───────────────────────────
  const verificarNotificacionesAutomaticas = useCallback(async () => {
    if (pedidos.length === 0) return;
    const ahora = new Date();
    const notifConfig = getNotifConfig();

    for (const pedido of pedidos) {
      if (!pedido.dia) continue;

      const fechaEvento = parseISO(pedido.dia);
      const horasHasta  = differenceInHours(fechaEvento, ahora);
      const _diasHasta  = differenceInDays(fechaEvento, ahora);

      // 1a. Eventos próximos — 24h antes
      if (horasHasta > 23 && horasHasta < 25) {
        const asignsPedido = asignaciones.filter(a => a.pedido_id === pedido.id);

        for (const asign of asignsPedido) {
          try {
            const existentes = await base44.entities.NotificacionCamarero.filter({
              camarero_id: asign.camarero_id,
              pedido_id: pedido.id,
              tipo: 'recordatorio',
            });
            const reciente = existentes.some(n =>
              differenceInHours(ahora, new Date(n.created_date)) < 12
            );
            if (reciente) continue;

            await base44.entities.NotificacionCamarero.create({
              camarero_id: asign.camarero_id,
              camarero_nombre: asign.camarero_nombre,
              pedido_id: pedido.id,
              tipo: 'recordatorio',
              titulo: '⏰ Recordatorio: Servicio Mañana',
              mensaje: `Tienes un servicio mañana con ${pedido.cliente}`,
              cliente: pedido.cliente,
              lugar_evento: pedido.lugar_evento,
              fecha: pedido.dia,
              hora_entrada: pedido.entrada,
              hora_salida: pedido.salida,
              leida: false,
            });

            if (showPushNotifications && notifConfig.recordatorios !== false) {
              showPushNotifications('⏰ Servicio Mañana', {
                body: `Servicio con ${pedido.cliente} en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
                tag: 'recordatorio-evento',
              });
            }
          } catch (err) {
            console.error('Error notificación evento próximo:', err);
          }
        }

        // Notificar coordinador
        try {
          const existentesCoord = await base44.entities.Notificacion.filter({
            pedido_id: pedido.id,
            tipo: 'evento_proximo',
          });
          const recienteCoord = existentesCoord.some(n =>
            differenceInHours(ahora, new Date(n.created_date)) < 12
          );
          if (!recienteCoord) {
            await base44.entities.Notificacion.create({
              tipo: 'evento_proximo',
              titulo: '📅 Evento Mañana',
              mensaje: `El evento de ${pedido.cliente} es mañana en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
              pedido_id: pedido.id,
              prioridad: 'media',
              leida: false,
            });
          }
        } catch (err) {
          console.error('Error notificando coordinador evento próximo:', err);
        }
      }

      // 1b. Pedidos incompletos — 12h antes
      if (horasHasta > 11 && horasHasta < 13) {
        const asignsPedido    = asignaciones.filter(a => a.pedido_id === pedido.id);
        const necesarios      = pedido.turnos?.length > 0
          ? pedido.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
          : (pedido.cantidad_camareros || 0);

        if (asignsPedido.length < necesarios) {
          try {
            const alertas = await base44.entities.Notificacion.filter({
              pedido_id: pedido.id,
              tipo: 'alerta',
            });
            const alertaReciente = alertas.some(n =>
              differenceInHours(ahora, new Date(n.created_date)) < 6
            );
            if (alertaReciente) continue;

            const faltantes = necesarios - asignsPedido.length;
            const msg = `⚠️ URGENTE: ${pedido.cliente} mañana necesita ${necesarios} camareros — faltan ${faltantes}`;

            if (notifConfig.alertasUrgentes?.pedidoIncompleto !== false) {
              await base44.entities.Notificacion.create({
                tipo: 'alerta',
                titulo: '🚨 Pedido Incompleto — Acción Requerida',
                mensaje: msg,
                pedido_id: pedido.id,
                prioridad: 'urgente',
                leida: false,
              });

              if (showPushNotifications && notifConfig.habilitadas !== false) {
                showPushNotifications('🚨 Pedido Incompleto', msg);
              }
              toast.error(msg, { duration: 10000, icon: '🚨' });

              for (const coord of coordinadores) {
                if (!coord.email || !coord.notificaciones_email) continue;
                try {
                  await base44.integrations.Core.SendEmail({
                    to: coord.email,
                    subject: `🚨 URGENTE: Pedido Incompleto — ${pedido.cliente}`,
                    body: `Hola ${coord.nombre},\n\n⚠️ El evento de ${pedido.cliente} del ${format(fechaEvento, "dd 'de' MMMM yyyy", { locale: es })} necesita ${necesarios} camareros y solo tiene ${asignsPedido.length}. Faltan ${faltantes}.\n\nSaludos,\nSistema de Gestión`,
                  });
                } catch (emailErr) {
                  console.error('Error email urgente:', emailErr);
                }
              }
            }
          } catch (err) {
            console.error('Error alerta pedido incompleto:', err);
          }
        }
      }
    }

    // 1c. Tareas pendientes
    for (const tarea of tareas.filter(t => !t.completada && t.fecha_limite)) {
      const diasHasta = differenceInDays(parseISO(tarea.fecha_limite), new Date());
      if (diasHasta < 0 || diasHasta > 1) continue;

      try {
        const notifsTarea = await base44.entities.NotificacionCamarero.filter({
          camarero_id: tarea.camarero_id,
          tipo: 'recordatorio',
        });
        const reciente = notifsTarea.some(n =>
          differenceInHours(new Date(), new Date(n.created_date)) < 24 &&
          n.mensaje?.includes(tarea.titulo)
        );
        if (reciente) continue;

        const urgencia = diasHasta === 0 ? '🔴 HOY' : '⚠️ MAÑANA';
        await base44.entities.NotificacionCamarero.create({
          camarero_id: tarea.camarero_id,
          camarero_nombre: tarea.camarero_nombre,
          pedido_id: tarea.pedido_id,
          tipo: 'recordatorio',
          titulo: `${urgencia}: Tarea Pendiente`,
          mensaje: `Recuerda: ${tarea.titulo}`,
          leida: false,
        });

        if (showPushNotifications && notifConfig?.tareasPendientes !== false) {
          showPushNotifications(`${urgencia}: Tarea Pendiente`, {
            body: tarea.titulo,
            tag: 'tarea-pendiente',
          });
        }
      } catch (err) {
        console.error('Error recordatorio tarea:', err);
      }
    }
  }, [pedidos, asignaciones, tareas, coordinadores, showPushNotifications]);

  // ─── 2. Recordatorios WhatsApp (solo si el tab está visible) ─────────────────
  const verificarRecordatoriosWhatsApp = useCallback(async () => {
    // No abrir wa.me si el usuario no está mirando la pantalla
    if (document.visibilityState !== 'visible') return;

    const ahora = new Date();

    // 2a. ServicioRecordatorios — controlado por ConfiguracionRecordatorios
    if (configRecordatorios) {
      const asignsConfirmadas = asignaciones.filter(a => a.estado === 'confirmado');

      for (const asign of asignsConfirmadas) {
        try {
          const pedidosMatch = await base44.entities.Pedido.filter({ id: asign.pedido_id });
          const pedido = pedidosMatch[0];
          if (!pedido?.dia || !asign.hora_entrada) continue;

          const [h, m]        = asign.hora_entrada.split(':').map(Number);
          const fechaEvento   = parseISO(pedido.dia);
          fechaEvento.setHours(h, m, 0, 0);
          const horasHasta    = differenceInHours(fechaEvento, ahora);

          const enviar = async (tipo) => {
            const yaEnviado = recordatoriosEnviados.find(r =>
              r.asignacion_id === asign.id && r.tipo_recordatorio === tipo
            );
            if (yaEnviado) return;

            const camarero = camareros.find(c => c.id === asign.camarero_id);
            if (!camarero?.telefono) return;

            const horasAntes = tipo === '24h' ? 24 : 2;
            const emoji      = tipo === '24h' ? '🔔' : '⏰';
            const mensaje    = `${emoji} *RECORDATORIO DE SERVICIO*\n\nTu servicio es en ${horasAntes} horas\n\n📅 *Fecha:* ${format(parseISO(pedido.dia), "dd 'de' MMMM yyyy", { locale: es })}\n👤 *Cliente:* ${pedido.cliente}\n📍 *Lugar:* ${pedido.lugar_evento || 'Por confirmar'}\n🕐 *Hora de entrada:* ${asign.hora_entrada || '-'}\n\n👔 *Uniforme:* Zapatos, pantalón y delantal negro\n👕 *Camisa:* ${pedido.camisa || 'blanca'}\n\n${tipo === '2h' ? '⚠️ *RECORDATORIO FINAL* — Preséntate 15 minutos antes.' : '📝 Recuerda preparar tu uniforme y confirmar tu disponibilidad.'}\n\n¡Te esperamos! 👍`;

            const tel = camarero.telefono.replace(/\D/g, '');
            const num = (!tel.startsWith('34') && tel.length === 9) ? '34' + tel : tel;
            globalThis.open(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`, '_blank');

            await base44.entities.RecordatorioEnviado.create({
              asignacion_id: asign.id,
              camarero_id: camarero.id,
              pedido_id: pedido.id,
              tipo_recordatorio: tipo,
              fecha_envio: new Date().toISOString(),
              exito: true,
            });
          };

          if (configRecordatorios.recordatorio_24h_activo) {
            const h24 = configRecordatorios.recordatorio_24h_horas || 24;
            if (horasHasta <= h24 && horasHasta > h24 - 1) await enviar('24h');
          }
          if (configRecordatorios.recordatorio_2h_activo) {
            const h2 = configRecordatorios.recordatorio_2h_horas || 2;
            if (horasHasta <= h2 && horasHasta > h2 - 0.5) await enviar('2h');
          }
        } catch (err) {
          console.error('Error verificando recordatorio ServicioRecordatorios:', err);
        }
      }
    }

    // 2b. RecordatoriosProactivos — lógica complementaria
    const asignsConfirmadas = asignaciones.filter(a => a.estado === 'confirmado');
    for (const asign of asignsConfirmadas) {
      const pedido   = pedidos.find(p => p.id === asign.pedido_id);
      const camarero = camareros.find(c => c.id === asign.camarero_id);
      if (!pedido?.dia || !camarero?.telefono) continue;

      const [h, m]      = (asign.hora_entrada || pedido.entrada || '00:00').split(':').map(Number);
      const fechaEvento = parseISO(pedido.dia);
      fechaEvento.setHours(h, m, 0, 0);
      const horasHasta  = differenceInHours(fechaEvento, ahora);

      const checkYaEnviado = (tipo) => historialWhatsApp.some(hh =>
        hh.asignacion_id === asign.id &&
        hh.mensaje?.includes(tipo === '24h' ? '24 horas' : '2 horas') &&
        (Date.now() - new Date(hh.created_date)) < 3600000
      );

      const enviarProactivo = async (tipo) => {
        if (checkYaEnviado(tipo)) return;
        const horasAntes = tipo === '24h' ? 24 : 2;
        const emoji      = tipo === '24h' ? '🔔' : '⏰';
        const mensaje    = `${emoji} RECORDATORIO: Servicio en ${horasAntes} horas\n\n👤 Cliente: ${pedido.cliente}\n📅 Fecha: ${format(parseISO(pedido.dia), "EEEE dd 'de' MMMM yyyy", { locale: es })}\n🕐 Horario: ${asign.hora_entrada || pedido.entrada} - ${asign.hora_salida || pedido.salida}\n📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n${pedido.link_ubicacion ? `🗺️ Ubicación: ${pedido.link_ubicacion}` : ''}\n${pedido.camisa ? `👔 Uniforme: Camisa ${pedido.camisa}` : ''}\n\n${tipo === '2h' ? '⚠️ Recuerda salir con tiempo suficiente.' : 'No olvides confirmar tu asistencia.'}`;

        const tel = camarero.telefono.replace(/\D/g, '');
        const num = (!tel.startsWith('34') && tel.length === 9) ? '34' + tel : tel;
        globalThis.open(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`, '_blank');

        await base44.entities.HistorialWhatsApp.create({
          destinatario_id: camarero.id,
          destinatario_nombre: camarero.nombre,
          telefono: num,
          mensaje,
          pedido_id: pedido.id,
          asignacion_id: asign.id,
          estado: 'enviado',
          proveedor: 'whatsapp_web',
          plantilla_usada: `Recordatorio ${horasAntes}h`,
        });
      };

      if (horasHasta >= 23 && horasHasta <= 25) await enviarProactivo('24h');
      if (horasHasta >= 1.5 && horasHasta <= 2.5) await enviarProactivo('2h');
    }
  }, [asignaciones, pedidos, camareros, configRecordatorios, recordatoriosEnviados, historialWhatsApp]);

  // ─── Ciclo principal unificado ───────────────────────────────────────────────
  const runAll = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    lastRunRef.current   = new Date();

    try {
      await verificarNotificacionesAutomaticas();
      await verificarRecordatoriosWhatsApp();
    } catch (err) {
      console.error('useBackgroundServices error:', err);
    } finally {
      isRunningRef.current = false;
    }
  }, [verificarNotificacionesAutomaticas, verificarRecordatoriosWhatsApp]);

  useEffect(() => {
    if (pedidos.length === 0) return;

    runAll();
    intervalRef.current = setInterval(runAll, RUN_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') runAll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [runAll, pedidos.length]);

  return null;
}

export default useBackgroundServices;
