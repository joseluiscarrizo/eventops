import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInHours, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ServicioRecordatorios() {
  const { data: config } = useQuery({
    queryKey: ['config-recordatorios'],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracionRecordatorios.list();
      return configs[0] || null;
    },
    refetchInterval: 60000 // Revisar cada minuto
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-confirmadas'],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ estado: 'confirmado' }),
    refetchInterval: 60000
  });

  const { data: recordatoriosEnviados = [] } = useQuery({
    queryKey: ['recordatorios-enviados'],
    queryFn: () => base44.entities.RecordatorioEnviado.list('-created_date', 500),
    refetchInterval: 60000
  });

  const generarMensajeRecordatorio = async (asignacion, pedido, camarero, tipo) => {
    const horasRestantes = tipo === '24h' ? 24 : 2;
    const emoji = tipo === '24h' ? '🔔' : '⏰';
    
    let mensaje = `${emoji} *RECORDATORIO DE SERVICIO*\n\n`;
    mensaje += `⏰ Tu servicio es en ${horasRestantes} horas\n\n`;
    mensaje += `📅 *Fecha:* ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar'}\n`;
    mensaje += `👤 *Cliente:* ${pedido.cliente}\n`;
    mensaje += `📍 *Lugar:* ${pedido.lugar_evento || 'Por confirmar'}\n`;
    mensaje += `🕐 *Hora de entrada:* ${asignacion.hora_entrada || pedido.entrada || '-'}\n\n`;

    if (pedido.extra_transporte) {
      const puntoEncuentro = 'https://maps.app.goo.gl/hrR4eHSq4Q7dLcaV7';
      
      if (pedido.link_ubicacion) {
        try {
          const resultadoDistancia = await base44.integrations.Core.InvokeLLM({
            prompt: `Calcula el tiempo de viaje en transporte desde ${puntoEncuentro} hasta ${pedido.link_ubicacion}. Devuelve solo el tiempo estimado en minutos como número.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                minutos: { type: "number" }
              }
            }
          });
          
          const minutosViaje = resultadoDistancia?.minutos || 30;
          const horaEntrada = asignacion.hora_entrada || pedido.entrada;
          if (horaEntrada) {
            const [horas, minutos] = horaEntrada.split(':').map(Number);
            const horaEntradaDate = new Date();
            horaEntradaDate.setHours(horas, minutos, 0);
            horaEntradaDate.setMinutes(horaEntradaDate.getMinutes() - minutosViaje - 15);
            
            mensaje += `🚗 *Hora de encuentro:* ${horaEntradaDate.getHours().toString().padStart(2, '0')}:${horaEntradaDate.getMinutes().toString().padStart(2, '0')}\n`;
          }
        } catch (e) {
          console.error('Error calculando distancia:', e);
        }
      }
      
      mensaje += `📌 *Punto de encuentro:* ${puntoEncuentro}\n\n`;
    } else if (pedido.link_ubicacion) {
      mensaje += `🗺️ *Ubicación:* ${pedido.link_ubicacion}\n\n`;
    }

    mensaje += `👔 *Uniforme:* Zapatos, pantalón y delantal negro\n`;
    mensaje += `👕 *Camisa:* ${pedido.camisa || 'blanca'}\n\n`;
    
    if (tipo === '24h') {
      mensaje += `📝 Recuerda preparar tu uniforme y confirmar tu disponibilidad.\n`;
    } else {
      mensaje += `⚠️ *RECORDATORIO FINAL* - Preséntate 15 minutos antes.\n`;
    }
    
    mensaje += `\n¡Te esperamos! 👍`;

    return mensaje;
  };

  const enviarRecordatorio = async (asignacion, tipo) => {
    try {
      // Verificar si ya se envió este recordatorio
      const yaEnviado = recordatoriosEnviados.find(r => 
        r.asignacion_id === asignacion.id && 
        r.tipo_recordatorio === tipo
      );
      
      if (yaEnviado) return;

      // Obtener datos necesarios
      const [pedidos, camareros, coordinadores] = await Promise.all([
        base44.entities.Pedido.list(),
        base44.entities.Camarero.list(),
        base44.entities.Coordinador.list()
      ]);

      const pedido = pedidos.find(p => p.id === asignacion.pedido_id);
      const camarero = camareros.find(c => c.id === asignacion.camarero_id);
      
      if (!pedido || !camarero || !camarero.telefono || !config?.coordinador_id) {
        console.log('Faltan datos para enviar recordatorio:', { pedido: !!pedido, camarero: !!camarero, tel: !!camarero?.telefono });
        return;
      }

      const coordinador = coordinadores.find(c => c.id === config.coordinador_id);
      if (!coordinador?.telefono) {
        console.log('Coordinador no tiene teléfono configurado');
        return;
      }

      // Generar mensaje
      const mensaje = await generarMensajeRecordatorio(asignacion, pedido, camarero, tipo);
      
      // Crear URL de WhatsApp
      const telefonoCamarero = camarero.telefono.replace(/\D/g, '');
      const mensajeEncoded = encodeURIComponent(mensaje);
      const whatsappURL = `https://wa.me/${telefonoCamarero}?text=${mensajeEncoded}`;
      
      // Abrir WhatsApp
      globalThis.open(whatsappURL, '_blank');
      
      // Registrar recordatorio enviado
      await base44.entities.RecordatorioEnviado.create({
        asignacion_id: asignacion.id,
        camarero_id: camarero.id,
        pedido_id: pedido.id,
        tipo_recordatorio: tipo,
        fecha_envio: new Date().toISOString(),
        exito: true
      });

      console.log(`✅ Recordatorio ${tipo} enviado a ${camarero.nombre}`);

    } catch (error) {
      console.error('Error enviando recordatorio:', error);
      
      // Registrar fallo
      try {
        await base44.entities.RecordatorioEnviado.create({
          asignacion_id: asignacion.id,
          camarero_id: asignacion.camarero_id,
          pedido_id: asignacion.pedido_id,
          tipo_recordatorio: tipo,
          fecha_envio: new Date().toISOString(),
          exito: false
        });
      } catch (e) {
        console.error('Error registrando fallo:', e);
      }
    }
  };

  const verificarRecordatorios = async () => {
    if (!config) return;

    const ahora = new Date();

    for (const asignacion of asignaciones) {
      try {
        const pedidos = await base44.entities.Pedido.filter({ id: asignacion.pedido_id });
        const pedido = pedidos[0];
        
        if (!pedido?.dia || !asignacion.hora_entrada) continue;

        // Construir fecha y hora del evento
        const [horas, minutos] = asignacion.hora_entrada.split(':').map(Number);
        const fechaEvento = parseISO(pedido.dia);
        fechaEvento.setHours(horas, minutos, 0, 0);

        const horasHastaEvento = differenceInHours(fechaEvento, ahora);

        // Verificar si debe enviar recordatorio 24h
        if (config.recordatorio_24h_activo) {
          const horasConfig24 = config.recordatorio_24h_horas || 24;
          if (horasHastaEvento <= horasConfig24 && horasHastaEvento > (horasConfig24 - 1)) {
            await enviarRecordatorio(asignacion, '24h');
          }
        }

        // Verificar si debe enviar recordatorio 2h
        if (config.recordatorio_2h_activo) {
          const horasConfig2 = config.recordatorio_2h_horas || 2;
          if (horasHastaEvento <= horasConfig2 && horasHastaEvento > (horasConfig2 - 0.5)) {
            await enviarRecordatorio(asignacion, '2h');
          }
        }

      } catch (error) {
        console.error('Error verificando asignación:', error);
      }
    }
  };

  useEffect(() => {
    if (config && asignaciones.length > 0) {
      verificarRecordatorios();
    }
  }, [config, asignaciones, recordatoriosEnviados]);

  return null; // Componente invisible que trabaja en segundo plano
}