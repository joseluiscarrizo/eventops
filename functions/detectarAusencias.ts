/**
 * detectarAusencias.js
 * Función programada (cada 30 min durante el día) que detecta camareros que no han
 * fichado entrada siendo que ya debería haber empezado su servicio (tolerancia 30 min).
 * Crea una Notificacion de alta prioridad para el coordinador.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar admin (cuando se llama manualmente desde frontend)
    // Para el scheduler, usamos serviceRole directamente
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    const horaActual = hoy.getHours() * 60 + hoy.getMinutes(); // en minutos desde medianoche

    // Obtener asignaciones de hoy que no tengan fichaje de entrada
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
      fecha_pedido: fechaHoy,
      estado: { $in: ['pendiente', 'enviado', 'confirmado'] }
    });

    const ausencias = [];

    for (const asig of asignaciones) {
      // Si ya tiene hora real de entrada, está presente
      if (asig.hora_entrada_real || asig.fichaje_entrada_timestamp) continue;

      // Calcular minutos de la hora de entrada prevista
      if (!asig.hora_entrada) continue;
      const [h, m] = asig.hora_entrada.split(':').map(Number);
      const minutosEntrada = h * 60 + m;

      // Si no han pasado 30 minutos desde la entrada prevista, aún no es ausencia
      if (horaActual < minutosEntrada + 30) continue;

      // Verificar que no hayamos ya notificado esta ausencia hoy
      const notifExistente = await base44.asServiceRole.entities.Notificacion.filter({
        pedido_id: asig.pedido_id,
        tipo: 'alerta',
        titulo: { $regex: `No presentado.*${asig.camarero_nombre}` }
      });

      if (notifExistente.length > 0) continue;

      // Obtener datos del pedido
      let nombreCliente = 'Evento sin nombre';
      let lugarEvento = '';
      try {
        const pedidos = await base44.asServiceRole.entities.Pedido.filter({ id: asig.pedido_id });
        if (pedidos[0]) {
          nombreCliente = pedidos[0].cliente || nombreCliente;
          lugarEvento = pedidos[0].lugar_evento || '';
        }
      } catch (_) { /* empty */ }

      ausencias.push(asig);

      // Crear notificación de alta prioridad para el coordinador
      await base44.asServiceRole.entities.Notificacion.create({
        tipo: 'alerta',
        titulo: `⚠️ No presentado: ${asig.camarero_nombre}`,
        mensaje: `${asig.camarero_nombre} no ha fichado entrada para el servicio de "${nombreCliente}"${lugarEvento ? ` en ${lugarEvento}` : ''}. Entrada prevista: ${asig.hora_entrada}. Han pasado más de 30 minutos sin registro.`,
        prioridad: 'urgente',
        pedido_id: asig.pedido_id,
        asignacion_id: asig.id,
        leida: false
      });

      // Actualizar estado de la asignación para marcarla como incidencia
      await base44.asServiceRole.entities.AsignacionCamarero.update(asig.id, {
        estado: 'pendiente' // vuelve a pendiente para que requiera atención
      });
    }

    return Response.json({
      success: true,
      fecha: fechaHoy,
      hora_actual: `${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, '0')}`,
      asignaciones_revisadas: asignaciones.length,
      ausencias_detectadas: ausencias.length,
      ausentes: ausencias.map(a => ({
        camarero: a.camarero_nombre,
        hora_entrada_prevista: a.hora_entrada,
        pedido_id: a.pedido_id
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});