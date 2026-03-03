import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id requerido' }, { status: 400 });
    }

    // Obtener el pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe un grupo para este pedido
    const gruposExistentes = await base44.asServiceRole.entities.GrupoChat.filter({ 
      pedido_id: pedido_id,
      activo: true 
    });

    if (gruposExistentes.length > 0) {
      return Response.json({ 
        success: true, 
        grupo: gruposExistentes[0],
        mensaje: 'El grupo ya existe'
      });
    }

    // Obtener asignaciones confirmadas
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
      pedido_id: pedido_id,
      estado: 'confirmado'
    });

    if (asignaciones.length === 0) {
      return Response.json({ 
        error: 'No hay camareros confirmados para crear el grupo' 
      }, { status: 400 });
    }

    // Obtener camareros y coordinadores
    const camareros = await base44.asServiceRole.entities.Camarero.list();
    const coordinadores = await base44.asServiceRole.entities.Coordinador.list();

    // Construir lista de miembros
    const miembros = [];
    
    // Añadir camareros confirmados
    for (const asig of asignaciones) {
      const camarero = camareros.find(c => c.id === asig.camarero_id);
      if (camarero) {
        miembros.push({
          user_id: camarero.id,
          nombre: camarero.nombre,
          rol: 'camarero'
        });
      }
    }

    // Añadir coordinador del pedido si existe
    if (pedido.coordinador_id) {
      const coordinador = coordinadores.find(c => c.id === pedido.coordinador_id);
      if (coordinador) {
        miembros.push({
          user_id: coordinador.id,
          nombre: coordinador.nombre,
          rol: 'coordinador'
        });
      }
    }

    // Calcular fecha de eliminación (24h después del evento)
    const fechaEvento = new Date(pedido.dia);
    const horaSalida = pedido.salida || '23:59';
    const [horas, minutos] = horaSalida.split(':').map(Number);
    fechaEvento.setHours(horas, minutos, 0);
    const fechaEliminacion = new Date(fechaEvento.getTime() + 24 * 60 * 60 * 1000);

    // Crear grupo
    const grupo = await base44.asServiceRole.entities.GrupoChat.create({
      pedido_id: pedido_id,
      nombre: `${pedido.cliente} - ${pedido.dia}`,
      descripcion: pedido.lugar_evento,
      fecha_evento: pedido.dia,
      hora_fin_evento: pedido.salida,
      miembros: miembros,
      activo: true,
      fecha_eliminacion_programada: fechaEliminacion.toISOString()
    });

    // Crear mensaje de sistema
    await base44.asServiceRole.entities.MensajeChat.create({
      grupo_id: grupo.id,
      user_id: 'sistema',
      nombre_usuario: 'Sistema',
      rol_usuario: 'admin',
      mensaje: `¡Grupo creado! ${miembros.length} miembros añadidos al chat del evento.`,
      tipo: 'sistema',
      leido_por: []
    });

    return Response.json({
      success: true,
      grupo: grupo,
      mensaje: 'Grupo creado exitosamente'
    });

  } catch (error) {
    console.error('Error creando grupo:', error);
    return Response.json({ 
      error: error.message || 'Error al crear grupo' 
    }, { status: 500 });
  }
});