import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInHours, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RecordatoriosProactivos() {
  // Obtener asignaciones confirmadas
  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-recordatorios'],
    queryFn: async () => {
      return await base44.entities.AsignacionCamarero.filter({ estado: 'confirmado' });
    },
    refetchInterval: 60000 // Cada minuto
  });

  // Obtener pedidos
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-recordatorios'],
    queryFn: async () => {
      return await base44.entities.Pedido.list();
    },
    refetchInterval: 60000
  });

  // Obtener camareros
  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros-recordatorios'],
    queryFn: async () => {
      return await base44.entities.Camarero.list();
    },
    refetchInterval: 300000 // Cada 5 minutos
  });

  // Obtener historial para no duplicar
  const { data: historial = [] } = useQuery({
    queryKey: ['historial-recordatorios'],
    queryFn: async () => {
      const hace24h = new Date();
      hace24h.setHours(hace24h.getHours() - 24);
      return await base44.entities.HistorialWhatsApp.list('-created_date', 100);
    },
    refetchInterval: 60000
  });

  const enviarRecordatorio = async (asignacion, pedido, camarero, tipo) => {
    try {
      // Verificar si ya se envió un recordatorio similar recientemente
      const yaEnviado = historial.some(h => 
        h.asignacion_id === asignacion.id &&
        h.mensaje?.includes(tipo === '24h' ? '24 horas' : '2 horas') &&
        (new Date() - new Date(h.created_date)) < 3600000 // Última hora
      );

      if (yaEnviado) {
        return;
      }

      const horasAntes = tipo === '24h' ? 24 : 2;
      const emoji = tipo === '24h' ? '🔔' : '⏰';
      
      const mensaje = `${emoji} RECORDATORIO: Servicio en ${horasAntes} horas

👤 Cliente: ${pedido.cliente}
📅 Fecha: ${format(parseISO(pedido.dia), "EEEE dd 'de' MMMM yyyy", { locale: es })}
🕐 Horario: ${asignacion.hora_entrada || pedido.entrada} - ${asignacion.hora_salida || pedido.salida}
📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}
${pedido.link_ubicacion ? `🗺️ Ubicación: ${pedido.link_ubicacion}` : ''}
${pedido.camisa ? `👔 Uniforme: Camisa ${pedido.camisa}` : ''}

${tipo === '2h' ? '⚠️ Recuerda salir con tiempo suficiente para llegar puntual.' : 'No olvides confirmar tu asistencia si aún no lo has hecho.'}`;

      const telefonoLimpio = camarero.telefono?.replace(/\D/g, '');
      let numeroWhatsApp = telefonoLimpio;
      if (!numeroWhatsApp?.startsWith('34') && numeroWhatsApp?.length === 9) {
        numeroWhatsApp = '34' + numeroWhatsApp;
      }

      if (!numeroWhatsApp) return;

      const mensajeCodificado = encodeURIComponent(mensaje);
      const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
      
      // Abrir WhatsApp
      globalThis.open(whatsappUrl, '_blank');

      // Registrar en historial
      await base44.entities.HistorialWhatsApp.create({
        destinatario_id: camarero.id,
        destinatario_nombre: camarero.nombre,
        telefono: numeroWhatsApp,
        mensaje: mensaje,
        pedido_id: pedido.id,
        asignacion_id: asignacion.id,
        estado: 'enviado',
        proveedor: 'whatsapp_web',
        plantilla_usada: `Recordatorio ${horasAntes}h`
      });

      console.log(`✅ Recordatorio ${tipo} enviado a ${camarero.nombre}`);
    } catch (error) {
      console.error('Error enviando recordatorio:', error);
    }
  };

  const verificarRecordatorios = () => {
    const ahora = new Date();

    asignaciones.forEach(asignacion => {
      const pedido = pedidos.find(p => p.id === asignacion.pedido_id);
      if (!pedido || !pedido.dia) return;

      const camarero = camareros.find(c => c.id === asignacion.camarero_id);
      if (!camarero || !camarero.telefono) return;

      // Combinar fecha y hora
      const fechaEvento = parseISO(pedido.dia);
      const horaEntrada = asignacion.hora_entrada || pedido.entrada || '00:00';
      const [horas, minutos] = horaEntrada.split(':');
      const fechaHoraEvento = new Date(fechaEvento);
      fechaHoraEvento.setHours(parseInt(horas), parseInt(minutos), 0);

      const horasRestantes = differenceInHours(fechaHoraEvento, ahora);

      // Recordatorio 24h antes (entre 23 y 25 horas)
      if (horasRestantes >= 23 && horasRestantes <= 25) {
        enviarRecordatorio(asignacion, pedido, camarero, '24h');
      }

      // Recordatorio 2h antes (entre 1.5 y 2.5 horas)
      if (horasRestantes >= 1.5 && horasRestantes <= 2.5) {
        enviarRecordatorio(asignacion, pedido, camarero, '2h');
      }
    });
  };

  useEffect(() => {
    if (asignaciones.length > 0 && pedidos.length > 0 && camareros.length > 0) {
      verificarRecordatorios();
    }
  }, [asignaciones, pedidos, camareros]);

  return null; // Componente invisible que trabaja en segundo plano
}