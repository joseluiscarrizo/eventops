import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtener todos los camareros con documentos
    const camareros = await base44.asServiceRole.entities.Camarero.list();

    const notificacionesCreadas = [];
    const hoy = new Date();

    for (const camarero of camareros) {
      if (!camarero.documentos || camarero.documentos.length === 0) continue;

      for (const doc of camarero.documentos) {
        if (!doc.fecha_expiracion || doc.estado !== 'aprobado') continue;

        const fechaExpiracion = new Date(doc.fecha_expiracion);
        const diasRestantes = Math.ceil((fechaExpiracion - hoy) / (1000 * 60 * 60 * 24));

        // Notificar si expira en 30, 15, 7 días o ya expiró
        const debeNotificar = 
          diasRestantes === 30 || 
          diasRestantes === 15 || 
          diasRestantes === 7 ||
          diasRestantes === 0 ||
          (diasRestantes < 0 && diasRestantes % 7 === 0); // Cada semana después de expirar

        if (debeNotificar) {
          let titulo, mensaje, prioridad;

          if (diasRestantes < 0) {
            titulo = `⚠️ Documento Expirado`;
            mensaje = `Tu documento "${doc.nombre}" expiró hace ${Math.abs(diasRestantes)} días. Por favor, renuévalo urgentemente.`;
            prioridad = 'urgente';
          } else if (diasRestantes === 0) {
            titulo = `⚠️ Documento Expira Hoy`;
            mensaje = `Tu documento "${doc.nombre}" expira hoy. Renuévalo lo antes posible.`;
            prioridad = 'urgente';
          } else if (diasRestantes <= 7) {
            titulo = `⏰ Documento Próximo a Expirar`;
            mensaje = `Tu documento "${doc.nombre}" expirará en ${diasRestantes} días. Por favor, renuévalo pronto.`;
            prioridad = 'importante';
          } else {
            titulo = `📅 Recordatorio de Renovación`;
            mensaje = `Tu documento "${doc.nombre}" expirará en ${diasRestantes} días. Es hora de comenzar el proceso de renovación.`;
            prioridad = 'normal';
          }

          // Crear notificación para el camarero
          try {
            await base44.asServiceRole.entities.NotificacionCamarero.create({
              camarero_id: camarero.id,
              camarero_nombre: camarero.nombre,
              tipo: 'nueva_asignacion', // Reutilizamos tipo existente
              titulo: titulo,
              mensaje: mensaje,
              leida: false,
              prioridad: prioridad
            });

            notificacionesCreadas.push({
              camarero: camarero.nombre,
              documento: doc.nombre,
              diasRestantes: diasRestantes
            });

            // Enviar WhatsApp si es urgente y el camarero tiene teléfono
            if (diasRestantes <= 7 && camarero.telefono) {
              try {
                await base44.asServiceRole.functions.invoke('enviarWhatsAppDirecto', {
                  telefono: camarero.telefono,
                  mensaje: `${titulo}\n\n${mensaje}\n\nPor favor, sube el documento renovado desde tu perfil en la aplicación.`,
                  camarero_id: camarero.id,
                  camarero_nombre: camarero.nombre,
                  plantilla_usada: 'Expiración Documento'
                });
              } catch (e) {
                console.error('Error enviando WhatsApp:', e);
              }
            }

            // Notificar al coordinador si es crítico
            if (diasRestantes <= 0 && camarero.coordinador_id) {
              const coordinadores = await base44.asServiceRole.entities.Coordinador.filter({
                id: camarero.coordinador_id
              });
              
              if (coordinadores.length > 0 && coordinadores[0].email) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: coordinadores[0].email,
                    subject: `⚠️ Documento Expirado: ${camarero.nombre}`,
                    body: `
Atención,

El documento "${doc.nombre}" del camarero ${camarero.nombre} ha expirado${diasRestantes < 0 ? ` hace ${Math.abs(diasRestantes)} días` : ' hoy'}.

Tipo: ${doc.tipo}
Fecha de expiración: ${fechaExpiracion.toLocaleDateString('es-ES')}

Por favor, coordina con el camarero para que renueve este documento lo antes posible.

Saludos,
Sistema de Gestión de Camareros
                    `
                  });
                } catch (e) {
                  console.error('Error enviando email:', e);
                }
              }
            }
          } catch (e) {
            console.error('Error creando notificación:', e);
          }
        }
      }
    }

    return Response.json({
      success: true,
      notificaciones_creadas: notificacionesCreadas.length,
      detalles: notificacionesCreadas,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en verificarDocumentosExpirados:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});