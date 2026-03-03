/**
 * sugerirYNotificarPedido
 * Triggered automatically when a new Pedido is created.
 * Runs AI suggestions and notifies coordinators with the top candidates.
 */

import { createClientFromRequest } from '@base44/sdk';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id requerido' }, { status: 400 });
    }

    // Call the existing AI suggestion function via SDK
    const resultado = await base44.asServiceRole.functions.invoke('sugerirCamarerosInteligente', {
      pedido_id,
      limite: 5
    });

    const sugerencias = resultado?.data?.sugerencias || [];
    const pedido = resultado?.data?.evento || {};

    if (sugerencias.length === 0) {
      return Response.json({ ok: true, mensaje: 'Sin sugerencias disponibles' });
    }

    // Build notification message
    const topCandidatos = sugerencias
      .slice(0, 5)
      .map((s, i) => `${i + 1}. ${s.nombre} — Score: ${s.score}/100 (${s.nivel_recomendacion?.replace('_', ' ')})`)
      .join('\n');

    const titulo = `🤖 IA: Sugerencias de camareros para ${pedido.cliente || 'nuevo pedido'}`;
    const mensaje = `Evento: ${pedido.cliente} · ${pedido.fecha} · ${pedido.lugar || ''}\n\n🏆 Top candidatos sugeridos por IA:\n${topCandidatos}\n\nAccede a Asignación → Sugerencias IA para asignarlos.`;

    // Create notification for coordinators
    await base44.asServiceRole.entities.Notificacion.create({
      tipo: 'alerta',
      titulo,
      mensaje,
      pedido_id,
      prioridad: 'media'
    });

    // Email coordinators if they have email enabled
    const coordinadores = await base44.asServiceRole.entities.Coordinador.list();
    for (const coord of coordinadores) {
      if (coord.email && coord.notificaciones_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: coord.email,
          subject: titulo,
          body: `Hola ${coord.nombre},\n\n${mensaje}\n\nSaludos,\nSistema de Gestión de Camareros`
        });
      }
    }

    return Response.json({ ok: true, sugerencias_count: sugerencias.length });

  } catch (error) {
    console.error('Error en sugerirYNotificarPedido:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});