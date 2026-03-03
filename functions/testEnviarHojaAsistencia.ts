import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'No autorizado - Token inválido o expirado' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'coordinador') {
      return Response.json({ error: 'No autorizado - Rol insuficiente' }, { status: 403 });
    }

    // Obtener un pedido con asignaciones confirmadas (Grupo Valera - 14/02)
    const pedido = await base44.asServiceRole.entities.Pedido.get('6989c6136b2403e88b6af96f');
    const asignaciones = await base44.asServiceRole.entities.AsignacionCamarero.filter({
      pedido_id: pedido.id
    });
    const camareros = await base44.asServiceRole.entities.Camarero.list();
    
    // Obtener cliente para emails
    const _cliente = await base44.asServiceRole.entities.Cliente.get(pedido.cliente_id);
    
    // Generar HTML de la hoja
    const camarerosList = asignaciones
      .map(a => camareros.find(c => c.id === a.camarero_id))
      .filter(Boolean);

    const hojaHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .header div { flex: 1; }
          h2 { margin: 0; color: #1e3a5f; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th, td { border: 1px solid #333; padding: 12px; text-align: left; }
          th { background-color: #1e3a5f; color: white; font-weight: bold; }
          .firma-box { 
            width: 300px; 
            height: 100px; 
            border: 2px solid #333; 
            margin-left: auto; 
            margin-top: 40px;
            padding: 10px;
          }
          .firma-label { font-weight: bold; margin-bottom: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <strong>Cliente:</strong> ${pedido.cliente}<br>
            <strong>Día:</strong> ${pedido.dia}
          </div>
          <div style="text-align: right;">
            <strong>Evento:</strong> ${pedido.lugar_evento || 'No especificado'}<br>
            <strong>Horario:</strong> ${pedido.entrada} - ${pedido.salida || 'Por confirmar'}
          </div>
        </div>

        <h3>Lista de Camareros</h3>
        <table>
          <thead>
            <tr>
              <th>Camarero</th>
              <th>Hora Entrada</th>
              <th>Hora Salida</th>
              <th>Total Horas</th>
              <th>Firma</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${camarerosList.map(c => `
              <tr>
                <td>${c.nombre}</td>
                <td>${pedido.entrada || ''}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="firma-box">
          <div class="firma-label">Firma del Responsable:</div>
        </div>
      </body>
      </html>
    `;
    
    // Para pruebas, enviamos al coordinador (usuario autenticado)
    const usuario = await base44.asServiceRole.entities.User.list();
    const coordinador = usuario.find(u => u.role === 'coordinador' || u.role === 'admin');
    
    if (!coordinador) {
      return Response.json({ 
        error: 'No se encontró un coordinador para enviar la prueba',
        usuarios_count: usuario.length
      }, { status: 400 });
    }
    
    // Enviar email
    console.log('📧 Enviando hoja de asistencia (TEST) a:', coordinador.email);
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: coordinador.email,
      subject: `[TEST] Hoja de Asistencia - ${pedido.cliente} - ${pedido.dia}`,
      body: hojaHTML
    });
    
    return Response.json({
      success: true,
      message: '✅ Hoja de asistencia enviada exitosamente',
      pedido: {
        id: pedido.id,
        cliente: pedido.cliente,
        fecha: pedido.dia,
        lugar: pedido.lugar_evento
      },
      email_enviado_a: coordinador.email,
      camareros_incluidos: camarerosList.map(c => c.nombre),
      asignaciones_count: asignaciones.length
    });
    
  } catch (error) {
    console.error('❌ Error enviando hoja:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});