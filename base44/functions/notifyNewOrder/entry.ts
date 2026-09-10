import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id, order_number, client_name, event_place, event_date } = body;

    if (!order_id) return Response.json({ error: 'Missing order_id' }, { status: 400 });

    // Get all admin users to notify
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin' || u.role === 'planificador');

    const title = `📦 Nuevo pedido: ${order_number || order_id}`;
    const message = `Se ha creado un nuevo pedido${client_name ? ` para "${client_name}"` : ''}${event_place ? ` en ${event_place}` : ''}${event_date ? ` el ${event_date}` : ''}.`;

    for (const admin of admins) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        recipient_name: admin.full_name,
        type: 'order_alert',
        title,
        message,
        related_id: order_id,
        related_type: 'order',
        read: false,
        email_sent: false,
      });

      if (admin.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: title,
          body: `<p>${message}</p><p>Entra en la app para gestionar el pedido.</p>`,
        });
      }
    }

    return Response.json({ ok: true, notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});