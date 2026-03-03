import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3.6.0';
import { es } from 'npm:date-fns@3.6.0/locale';
import { validateUserAccess, RBACError } from '../utils/rbacValidator.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    validateUserAccess(user, ['admin', 'coordinador']);

    const { asignacion_id } = await req.json();

    if (!asignacion_id) {
      return Response.json({ error: 'asignacion_id requerido' }, { status: 400 });
    }

    // Obtener asignación
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({ id: asignacion_id });
    const asignacion = asignaciones[0];

    if (!asignacion) {
      return Response.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Obtener pedido
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({ id: asignacion.pedido_id });
    const pedido = pedidos[0];

    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // 1. Actualizar estado de asignación a confirmado
    await base44.asServiceRole.entities.AsignacionCamarero.update(asignacion_id, {
      estado: 'confirmado'
    });

    // 2. Crear o verificar grupo de chat
    const gruposExistentes = await base44.asServiceRole.entities.GrupoChat.filter({
      pedido_id: asignacion.pedido_id,
      activo: true
    });

    if (gruposExistentes.length === 0) {
      await base44.asServiceRole.functions.invoke('crearGrupoChat', { 
        pedido_id: asignacion.pedido_id 
      });
    }

    // 3. Actualizar estado del camarero
    if (asignacion.camarero_id) {
      await base44.asServiceRole.entities.Camarero.update(asignacion.camarero_id, {
        estado_actual: 'ocupado'
      });
    }

    // 4. Crear notificación para el camarero
    const camareros = await base44.asServiceRole.entities.Camarero.filter({ id: asignacion.camarero_id });
    const camarero = camareros[0];

    if (camarero) {
      await base44.asServiceRole.entities.NotificacionCamarero.create({
        camarero_id: asignacion.camarero_id,
        camarero_nombre: asignacion.camarero_nombre,
        asignacion_id: asignacion_id,
        pedido_id: asignacion.pedido_id,
        tipo: 'nueva_asignacion',
        titulo: '✅ Servicio Confirmado',
        mensaje: `Tu servicio ha sido confirmado para ${pedido.cliente}`,
        cliente: pedido.cliente,
        lugar_evento: pedido.lugar_evento,
        fecha: pedido.dia,
        hora_entrada: asignacion.hora_entrada || pedido.entrada,
        hora_salida: asignacion.hora_salida || pedido.salida,
        leida: false,
        respondida: true,
        respuesta: 'aceptado',
        prioridad: 'importante'
      });

      // 5. Enviar WhatsApp de confirmación
      if (camarero.telefono) {
        const fechaFormateada = pedido.dia ? format(new Date(pedido.dia), "EEEE dd 'de' MMMM", { locale: es }) : 'Fecha por confirmar';
        
        const mensaje = `✅ *SERVICIO CONFIRMADO*

Hola ${camarero.nombre}!

Tu servicio ha sido confirmado por el coordinador:

📋 *Cliente:* ${pedido.cliente}
📅 *Día:* ${fechaFormateada}
🕐 *Hora:* ${asignacion.hora_entrada || pedido.entrada || '-'} - ${asignacion.hora_salida || pedido.salida || '-'}
📍 *Lugar:* ${pedido.lugar_evento || 'Por confirmar'}
👔 *Camisa:* ${pedido.camisa || 'Por confirmar'}

¡Nos vemos allí!`;

        try {
          const telefonoLimpio = camarero.telefono.replace(/\D/g, '');
          let numeroWhatsApp = telefonoLimpio;
          if (!numeroWhatsApp.startsWith('34') && numeroWhatsApp.length === 9) {
            numeroWhatsApp = '34' + numeroWhatsApp;
          }

          const mensajeCodificado = encodeURIComponent(mensaje);
          const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

          // Registrar en historial
          await base44.asServiceRole.entities.HistorialWhatsApp.create({
            destinatario_id: camarero.id,
            destinatario_nombre: camarero.nombre,
            telefono: numeroWhatsApp,
            mensaje: mensaje,
            pedido_id: pedido.id,
            asignacion_id: asignacion_id,
            estado: 'enviado',
            proveedor: 'automatico',
            plantilla_usada: 'Confirmación Automática'
          });

          return Response.json({
            success: true,
            whatsapp_url: whatsappUrl,
            mensaje: 'Servicio confirmado. Grupo de chat creado y notificación enviada.',
            grupo_creado: gruposExistentes.length === 0
          });
        } catch (e) {
          console.error('Error enviando WhatsApp:', e);
        }
      }
    }

    // Verificar si todos los camareros están confirmados
    const todasAsignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({ 
      pedido_id: asignacion.pedido_id 
    });

    const cantidadNecesaria = pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0);

    const todosConfirmados = todasAsignaciones.length >= cantidadNecesaria && 
                            todasAsignaciones.every(a => a.estado === 'confirmado');

    // Si todos están confirmados, enviar parte automáticamente
    if (todosConfirmados) {
      try {
        await base44.asServiceRole.functions.invoke('enviarParteAutomatico', { 
          pedido_id: asignacion.pedido_id 
        });
      } catch (e) {
        console.error('Error enviando parte automático:', e);
      }
    }

    return Response.json({
      success: true,
      mensaje: 'Servicio confirmado. Grupo de chat creado y notificación enviada.',
      grupo_creado: gruposExistentes.length === 0,
      parte_enviado: todosConfirmados
    });

  } catch (error) {
    if (error instanceof RBACError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en confirmarServicioAutomatico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});