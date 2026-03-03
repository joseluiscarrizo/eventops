/**
 * eliminarGruposExpirados
 * Elimina (desactiva) grupos de chat cuya fecha_eliminacion_programada ya ha pasado.
 * Limpia también los mensajes asociados para evitar acumulación de datos.
 * Diseñado para ejecutarse como cron job periódico.
 */
import { createClientFromRequest } from '@base44/sdk';
import Logger from '../utils/logger.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const ahora = new Date().toISOString();

    Logger.info('Iniciando eliminación de grupos expirados', { timestamp: ahora });

    const gruposActivos = await base44.asServiceRole.entities.GrupoChat.filter({ activo: true });

    const gruposExpirados = gruposActivos.filter(grupo => {
      if (!grupo.fecha_eliminacion_programada) return false;
      return grupo.fecha_eliminacion_programada <= ahora;
    });

    Logger.info(`Grupos activos: ${gruposActivos.length}, Grupos expirados: ${gruposExpirados.length}`);

    if (gruposExpirados.length === 0) {
      return Response.json({ ok: true, eliminados: 0, mensaje: 'No hay grupos expirados para eliminar' });
    }

    const resultados = [];
    const errores = [];

    for (const grupo of gruposExpirados) {
      try {
        await base44.asServiceRole.entities.GrupoChat.update(grupo.id, {
          activo: false,
          fecha_eliminacion_real: ahora
        });

        let mensajesEliminados = 0;
        try {
          const mensajes = await base44.asServiceRole.entities.MensajeChat.filter({ grupo_id: grupo.id });
          for (const mensaje of mensajes) {
            await base44.asServiceRole.entities.MensajeChat.delete(mensaje.id);
            mensajesEliminados++;
          }
        } catch (msgError) {
          Logger.error(`Error eliminando mensajes del grupo ${grupo.id}`, { error: msgError?.message || String(msgError) });
        }

        Logger.info(`Grupo eliminado correctamente`, {
          grupo_id: grupo.id,
          nombre: grupo.nombre,
          pedido_id: grupo.pedido_id,
          mensajes_eliminados: mensajesEliminados
        });

        resultados.push({ grupo_id: grupo.id, nombre: grupo.nombre, pedido_id: grupo.pedido_id, mensajes_eliminados: mensajesEliminados });

      } catch (grupoError) {
        Logger.error(`Error eliminando grupo ${grupo.id}`, { error: grupoError.message });
        errores.push({ grupo_id: grupo.id, nombre: grupo.nombre, error: grupoError.message });
      }
    }

    Logger.info('Proceso de eliminación completado', { eliminados: resultados.length, errores: errores.length });

    return Response.json({
      ok: true,
      eliminados: resultados.length,
      errores: errores.length,
      detalle: resultados,
      ...(errores.length > 0 && { detalle_errores: errores })
    });

  } catch (error) {
    Logger.error('Error crítico en eliminarGruposExpirados', { error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
});

