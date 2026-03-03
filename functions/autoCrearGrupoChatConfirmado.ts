import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Logger from '../utils/logger.ts';
import { retryWithExponentialBackoff } from '../utils/retryHandler.ts';
import {
  executeDbOperation,
  executeWhatsAppOperation,
  DatabaseError,
  WhatsAppApiError
} from '../utils/webhookImprovements.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();
    
    // Solo procesar actualizaciones donde el estado cambia a 'confirmado'
    if (event.type !== 'update' || data.estado !== 'confirmado' || old_data?.estado === 'confirmado') {
      return Response.json({ skipped: true, reason: 'No es cambio a confirmado' });
    }

    const asignacion = data;
    const pedidoId = asignacion.pedido_id;

    if (!pedidoId) {
      Logger.error('Asignación sin pedido_id');
      return Response.json({ error: 'Asignación sin pedido_id' }, { status: 400 });
    }

    Logger.info(`Procesando confirmación de asignación. pedido_id=${pedidoId}, camarero_id=${asignacion.camarero_id}`);

    // Obtener el pedido
    const pedido = await executeDbOperation(() =>
      base44.asServiceRole.entities.Pedido.get(pedidoId)
    );
    if (!pedido) {
      Logger.error(`Pedido no encontrado. pedido_id=${pedidoId}`);
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe un grupo activo para este pedido
    const gruposExistentes = await executeDbOperation(() =>
      base44.asServiceRole.entities.GrupoChat.filter({
        pedido_id: pedidoId,
        activo: true
      })
    );

    const partialFailures: string[] = [];
    let grupo;
    let nuevoGrupo = false;

    if (gruposExistentes.length > 0) {
      grupo = gruposExistentes[0];
      Logger.info(`Grupo existente encontrado: ${grupo.nombre}. grupo_id=${grupo.id}, pedido_id=${pedidoId}`);
    } else {
      // Obtener TODAS las asignaciones del pedido (confirmadas y no confirmadas)
      const todasAsignaciones = await executeDbOperation(() =>
        base44.asServiceRole.entities.AsignacionCamarero.filter({
          pedido_id: pedidoId
        })
      );

      const asignacionesConfirmadas = todasAsignaciones.filter(a => a.estado === 'confirmado');

      if (todasAsignaciones.length === 0) {
        return Response.json({ 
          skipped: true, 
          reason: 'No hay asignaciones para este pedido' 
        });
      }

      // SOLO CREAR GRUPO SI TODOS LOS CAMAREROS ESTÁN CONFIRMADOS
      if (asignacionesConfirmadas.length !== todasAsignaciones.length) {
        return Response.json({ 
          skipped: true, 
          reason: `Solo ${asignacionesConfirmadas.length}/${todasAsignaciones.length} camareros confirmados. Se necesita confirmación total.`,
          confirmados: asignacionesConfirmadas.length,
          total: todasAsignaciones.length
        });
      }

      Logger.info(`Todos los camareros confirmados (${asignacionesConfirmadas.length}/${todasAsignaciones.length}). Creando grupo... pedido_id=${pedidoId}`);

      // Obtener datos de camareros y coordinadores
      const [camareros, coordinadores, usuarios] = await Promise.all([
        executeDbOperation(() => base44.asServiceRole.entities.Camarero.list()),
        executeDbOperation(() => base44.asServiceRole.entities.Coordinador.list()),
        executeDbOperation(() => base44.asServiceRole.entities.User.list())
      ]);

      const miembros = [];

      // Añadir camareros confirmados
      for (const asig of asignacionesConfirmadas) {
        const cam = camareros.find(c => c.id === asig.camarero_id);
        if (cam) {
          // Buscar usuario del camarero
          const usuarioCamarero = usuarios.find(u => u.camarero_id === cam.id);
          
          miembros.push({
            user_id: usuarioCamarero?.id || cam.id,
            nombre: cam.nombre,
            rol: 'camarero'
          });
        }
      }

      // Añadir coordinador del pedido. Fallback al primero disponible.
      const coordinadorDelPedido = pedido.coordinador_id
        ? coordinadores.find(c => c.id === pedido.coordinador_id)
        : coordinadores[0];

      if (coordinadorDelPedido) {
        const usuarioCoord = usuarios.find(u => u.coordinador_id === coordinadorDelPedido.id);

        miembros.push({
          user_id: usuarioCoord?.id || coordinadorDelPedido.id,
          nombre: coordinadorDelPedido.nombre,
          rol: 'coordinador'
        });
      }

      // Validar datos mínimos para crear el grupo
      if (!pedido.cliente || !pedido.dia) {
        Logger.error(`Datos insuficientes para crear grupo. pedido_id=${pedidoId}, cliente=${pedido.cliente}, dia=${pedido.dia}`);
        return Response.json({
          error: `Datos insuficientes en el pedido para crear grupo (pedido_id=${pedidoId})`,
          error_code: 'VALIDATION_ERROR'
        }, { status: 422 });
      }

      // Calcular fecha de eliminación (6 horas después de terminar el evento)
      let fechaEliminacion = null;
      if (pedido.dia) {
        const fechaEvento = new Date(pedido.dia);
        const horaSalida = pedido.salida || pedido.turnos?.[0]?.salida || '23:59';
        const [horas, minutos] = horaSalida.split(':').map(Number);
        fechaEvento.setHours(horas + 6, minutos, 0, 0); // 6 horas después de la salida
        fechaEliminacion = fechaEvento.toISOString();
      }

      // Crear grupo con reintentos (idempotente: verifica existencia antes de crear)
      try {
        const isDuplicateKeyError = (error: unknown): boolean => {
          const message = error instanceof Error ? error.message : String(error);
          return /duplicate key|unique constraint|UNIQUE constraint/i.test(message);
        };

        let seCreoNuevoGrupo = false;

        grupo = await retryWithExponentialBackoff(() =>
          executeDbOperation(async () => {
            // Re-verificar si ya existe un grupo activo (idempotencia ante reintentos)
            const existentes = await base44.asServiceRole.entities.GrupoChat.filter({
              pedido_id: pedidoId,
              activo: true
            });
            if (Array.isArray(existentes) && existentes.length > 0) {
              return existentes[0];
            }

            try {
              const nuevo = await base44.asServiceRole.entities.GrupoChat.create({
                pedido_id: pedidoId,
                nombre: `${pedido.cliente} - ${pedido.dia}`,
                descripcion: `Evento en ${pedido.lugar_evento || 'ubicación por confirmar'}`,
                fecha_evento: pedido.dia,
                hora_fin_evento: pedido.salida || pedido.turnos?.[0]?.salida,
                miembros: miembros,
                activo: true,
                fecha_eliminacion_programada: fechaEliminacion
              });
              seCreoNuevoGrupo = true;
              return nuevo;
            } catch (createErr) {
              // Si hay conflicto de clave duplicada, recuperar el grupo existente
              if (isDuplicateKeyError(createErr)) {
                const existentesDespues = await base44.asServiceRole.entities.GrupoChat.filter({
                  pedido_id: pedidoId,
                  activo: true
                });
                if (Array.isArray(existentesDespues) && existentesDespues.length > 0) {
                  return existentesDespues[0];
                }
              }
              throw createErr;
            }
          })
        );
        nuevoGrupo = seCreoNuevoGrupo;
        Logger.info(`Grupo de chat ${nuevoGrupo ? 'creado' : 'recuperado'}: ${grupo.nombre}. grupo_id=${grupo.id}, pedido_id=${pedidoId}`);
      } catch (dbErr) {
        if (dbErr instanceof DatabaseError) {
          Logger.error(`Error de base de datos al crear grupo. pedido_id=${pedidoId}: ${dbErr.message}`);
        } else {
          Logger.error(`Error inesperado al crear grupo. pedido_id=${pedidoId}: ${dbErr}`);
        }
        throw dbErr;
      }

      // Crear mensaje inicial del sistema
      try {
        const mensajeInicial = `👋 Bienvenidos al grupo del evento "${pedido.cliente}"\n📅 Fecha: ${pedido.dia}\n📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n⏰ Horario: ${pedido.entrada || '-'} - ${pedido.salida || '-'}`;
        if (!mensajeInicial.trim()) {
          throw new Error('Contenido del mensaje inicial vacío');
        }
        await executeDbOperation(() =>
          base44.asServiceRole.entities.MensajeChat.create({
            grupo_id: grupo.id,
            user_id: 'sistema',
            nombre_usuario: 'Sistema',
            rol_usuario: 'admin',
            mensaje: mensajeInicial,
            tipo: 'sistema'
          })
        );
        Logger.info(`Mensaje inicial creado en grupo. grupo_id=${grupo.id}, pedido_id=${pedidoId}`);
      } catch (msgErr) {
        Logger.error(`Error al crear mensaje inicial en grupo. grupo_id=${grupo.id}: ${msgErr}`);
        throw msgErr;
      }
    }

    // Notificar a los camareros del grupo sobre la confirmación
    const camarero = asignacion.camarero_id
      ? await executeDbOperation(() =>
          base44.asServiceRole.entities.Camarero.get(asignacion.camarero_id)
        )
      : null;
    
    if (camarero) {
      Logger.info(`Notificando a camarero. camarero_id=${camarero.id}, grupo_id=${grupo.id}, pedido_id=${pedidoId}`);

      // Enviar mensaje al grupo notificando la confirmación
      try {
        await executeDbOperation(() =>
          base44.asServiceRole.entities.MensajeChat.create({
            grupo_id: grupo.id,
            user_id: 'sistema',
            nombre_usuario: 'Sistema',
            rol_usuario: 'admin',
            mensaje: `✅ ${camarero.nombre} ha confirmado su asistencia al servicio`,
            tipo: 'sistema'
          })
        );
        Logger.info(`Mensaje de confirmación creado en grupo. camarero_id=${camarero.id}, grupo_id=${grupo.id}`);
      } catch (msgErr) {
        Logger.error(`Error al crear mensaje de confirmación en grupo. camarero_id=${camarero.id}, grupo_id=${grupo.id}: ${msgErr}`);
        partialFailures.push('mensaje_confirmacion_grupo');
      }

      // Enviar WhatsApp al camarero con link al grupo
      const mensajeWhatsApp = `✅ *Confirmación Recibida*\n\n` +
        `Hola ${camarero.nombre}, tu asistencia al evento "${pedido.cliente}" ha sido confirmada.\n\n` +
        `📱 *Se ha creado un grupo de chat* para coordinar el servicio.\n` +
        `Accede desde la app en la sección "Chat" para comunicarte con el equipo.\n\n` +
        `📅 Fecha: ${pedido.dia}\n` +
        `📍 Lugar: ${pedido.lugar_evento || 'Por confirmar'}\n` +
        `⏰ Entrada: ${asignacion.hora_entrada || pedido.entrada || '-'}`;

      if (camarero.telefono) {
        try {
          await executeWhatsAppOperation(() =>
            base44.asServiceRole.functions.invoke('enviarWhatsAppDirecto', {
              telefono: camarero.telefono,
              mensaje: mensajeWhatsApp,
              camarero_id: camarero.id,
              camarero_nombre: camarero.nombre,
              pedido_id: pedidoId,
              asignacion_id: asignacion.id,
              plantilla_usada: 'Notificación Grupo Chat'
            })
          );
          Logger.info(`WhatsApp enviado a ${camarero.nombre}. camarero_id=${camarero.id}, pedido_id=${pedidoId}`);
        } catch (waErr) {
          if (waErr instanceof WhatsAppApiError) {
            Logger.error(`Error de WhatsApp API al notificar camarero. camarero_id=${camarero.id}: ${waErr.message}`);
          } else {
            Logger.error(`Error inesperado al enviar WhatsApp. camarero_id=${camarero.id}: ${waErr}`);
          }
          partialFailures.push('whatsapp_camarero');
        }

        // Crear notificación de WhatsApp en la base de datos
        try {
          await executeDbOperation(() =>
            base44.asServiceRole.entities.NotificacionCamarero.create({
              camarero_id: camarero.id,
              camarero_nombre: camarero.nombre,
              asignacion_id: asignacion.id,
              pedido_id: pedidoId,
              tipo: 'whatsapp_enviado',
              titulo: 'WhatsApp de confirmación enviado',
              mensaje: mensajeWhatsApp,
              leida: false,
              prioridad: 'normal'
            })
          );
        } catch (dbErr) {
          Logger.error(`Error al registrar notificación WhatsApp en BD. camarero_id=${camarero.id}: ${dbErr}`);
          partialFailures.push('registro_notificacion_whatsapp');
        }
      }

      // Crear notificación push
      try {
        const camareroId = camarero.id;
        const camareroNombre = camarero.nombre;
        if (!camareroId || !camareroNombre) {
          throw new Error('camarero_id o camarero_nombre requeridos para la notificación push');
        }
        await executeDbOperation(() =>
          base44.asServiceRole.entities.NotificacionCamarero.create({
            camarero_id: camareroId,
            camarero_nombre: camareroNombre,
            asignacion_id: asignacion.id,
            pedido_id: pedidoId,
            tipo: 'nueva_asignacion',
            titulo: `Grupo de Chat Creado`,
            mensaje: `Se ha creado un grupo de chat para el evento "${pedido.cliente}". Accede desde la sección Chat.`,
            cliente: pedido.cliente,
            lugar_evento: pedido.lugar_evento,
            fecha: pedido.dia,
            hora_entrada: asignacion.hora_entrada,
            leida: false,
            prioridad: 'importante'
          })
        );
        Logger.info(`Notificación push creada. camarero_id=${camarero.id}, pedido_id=${pedidoId}`);
      } catch (pushErr) {
        Logger.error(`Error al crear notificación push. camarero_id=${camarero.id}, pedido_id=${pedidoId}: ${pushErr}`);
        partialFailures.push('notificacion_push');
      }
    }

    const response: Record<string, unknown> = {
      success: true,
      grupo_id: grupo.id,
      grupo_nombre: grupo.nombre,
      nuevo_grupo: nuevoGrupo,
      miembros_count: grupo.miembros?.length || 0
    };

    if (partialFailures.length > 0) {
      response.partial_failures = partialFailures;
      Logger.warn(`Proceso completado con fallos parciales. grupo_id=${grupo.id}, pedido_id=${pedidoId}, fallos=${partialFailures.join(',')}`);
    }

    return Response.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof DatabaseError
      ? 'DB_ERROR'
      : error instanceof WhatsAppApiError
        ? 'WHATSAPP_ERROR'
        : 'INTERNAL_ERROR';

    Logger.error(`Error en autoCrearGrupoChatConfirmado [${errorCode}]: ${errorMessage}`);

    return Response.json({ 
      error: errorMessage,
      error_code: errorCode
    }, { status: 500 });
  }
});