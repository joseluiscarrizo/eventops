import { createClientFromRequest } from '@base44/sdk';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtener todos los pedidos activos
    const pedidos = await base44.asServiceRole.entities.Pedido.list();
    
    // Obtener todas las asignaciones
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.list();
    
    // Obtener grupos existentes
    const gruposExistentes = await base44.asServiceRole.entities.GrupoChat.filter({ activo: true });
    const pedidosConGrupo = new Set(gruposExistentes.map(g => g.pedido_id));

    const resultados = {
      pedidos_revisados: 0,
      pedidos_todos_confirmados: [],
      grupos_creados: [],
      grupos_existentes: [],
      errores: []
    };

    for (const pedido of pedidos) {
      resultados.pedidos_revisados++;

      // Obtener asignaciones de este pedido
      const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
      
      if (asignacionesPedido.length === 0) {
        continue; // Sin asignaciones, saltar
      }

      const confirmadas = asignacionesPedido.filter(a => a.estado === 'confirmado');
      const todosConfirmados = confirmadas.length === asignacionesPedido.length;

      if (todosConfirmados) {
        resultados.pedidos_todos_confirmados.push({
          pedido_id: pedido.id,
          cliente: pedido.cliente,
          fecha: pedido.dia,
          confirmados: confirmadas.length,
          total: asignacionesPedido.length
        });

        // Verificar si ya existe grupo
        if (pedidosConGrupo.has(pedido.id)) {
          resultados.grupos_existentes.push({
            pedido_id: pedido.id,
            cliente: pedido.cliente
          });
          continue; // Ya tiene grupo, saltar
        }

        // CREAR GRUPO
        try {
          // Obtener camareros y coordinadores
          const camareros = await base44.asServiceRole.entities.Camarero.list();
          const coordinadores = await base44.asServiceRole.entities.Coordinador.list();
          const usuarios = await base44.asServiceRole.entities.User.list();

          const miembros = [];

          // Añadir camareros confirmados
          for (const asig of confirmadas) {
            const camarero = camareros.find(c => c.id === asig.camarero_id);
            if (camarero) {
              const usuarioCamarero = usuarios.find(u => u.camarero_id === camarero.id);
              
              miembros.push({
                user_id: usuarioCamarero?.id || camarero.id,
                nombre: camarero.nombre,
                rol: 'camarero'
              });
            }
          }

          // Añadir coordinador
          if (coordinadores.length > 0) {
            const coordinador = coordinadores[0];
            const usuarioCoord = usuarios.find(u => u.coordinador_id === coordinador.id);
            
            miembros.push({
              user_id: usuarioCoord?.id || coordinador.id,
              nombre: coordinador.nombre,
              rol: 'coordinador'
            });
          }

          // Calcular fecha de eliminación (6 horas después del evento)
          let fechaEliminacion = null;
          if (pedido.dia) {
            const fechaEvento = new Date(pedido.dia);
            const horaSalida = pedido.salida || pedido.turnos?.[0]?.salida || '23:59';
            const [horas, minutos] = horaSalida.split(':').map(Number);
            fechaEvento.setHours(horas + 6, minutos, 0, 0);
            fechaEliminacion = fechaEvento.toISOString();
          }

          // Crear grupo
          const grupo = await base44.asServiceRole.entities.GrupoChat.create({
            pedido_id: pedido.id,
            nombre: `${pedido.cliente} - ${pedido.dia}`,
            descripcion: `Evento en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
            fecha_evento: pedido.dia,
            hora_fin_evento: pedido.salida || pedido.turnos?.[0]?.salida,
            miembros: miembros,
            activo: true,
            fecha_eliminacion_programada: fechaEliminacion
          });

          // Crear mensaje inicial
          await base44.asServiceRole.entities.MensajeChat.create({
            grupo_id: grupo.id,
            user_id: 'sistema',
            nombre_usuario: 'Sistema',
            rol_usuario: 'admin',
            mensaje: `👋 Bienvenidos al grupo del evento "${pedido.cliente}"\n📅 Fecha: ${pedido.dia}\n📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n⏰ Horario: ${pedido.entrada || '-'} - ${pedido.salida || '-'}`,
            tipo: 'sistema'
          });

          resultados.grupos_creados.push({
            grupo_id: grupo.id,
            nombre: grupo.nombre,
            pedido_id: pedido.id,
            cliente: pedido.cliente,
            miembros: miembros.length
          });

        } catch (error) {
          resultados.errores.push({
            pedido_id: pedido.id,
            cliente: pedido.cliente,
            error: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      ...resultados
    });

  } catch (error) {
    console.error('Error verificando y creando grupos:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});