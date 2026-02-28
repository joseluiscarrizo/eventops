import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Notifica cambios en pedidos (cambio de estado) y altas/bajas de asignaciones
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { type, order_id, order_number, client_name, event_place, event_date, old_status, new_status, personal_name, profile_type, assignment_action } = body;

    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(u => u.role === 'admin' || u.role === 'planificador');

    const STATUS_LABELS = {
      pending: 'Pendiente', confirmed: 'Confirmado', in_progress: 'En curso',
      completed: 'Completado', cancelled: 'Cancelado',
    };

    let title = '';
    let message = '';
    let notifType = 'order_alert';

    if (type === 'status_change') {
      title = `Cambio de estado: Pedido ${order_number || order_id}`;
      message = `El pedido${client_name ? ` de "${client_name}"` : ''}${event_place ? ` (${event_place})` : ''} ha cambiado de estado: ${STATUS_LABELS[old_status] || old_status} → ${STATUS_LABELS[new_status] || new_status}.`;
      notifType = 'order_alert';
    } else if (type === 'assignment_change') {
      const actionLabel = assignment_action === 'confirmed' ? '✅ ALTA confirmada' : '❌ BAJA registrada';
      title = `${actionLabel}: ${personal_name || 'Personal'}`;
      message = `${personal_name || 'Un miembro del personal'} (${profile_type || 'perfil'}) ha sido dado de ${assignment_action === 'confirmed' ? 'alta' : 'baja'} en el pedido${client_name ? ` de "${client_name}"` : ''}${event_place ? ` – ${event_place}` : ''}${event_date ? ` el ${event_date}` : ''}.`;
      notifType = 'assignment';
    }

    if (!title) return Response.json({ error: 'Invalid type' }, { status: 400 });

    for (const user of recipients) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        recipient_name: user.full_name,
        type: notifType,
        title,
        message,
        related_id: order_id,
        related_type: 'order',
        read: false,
        email_sent: false,
      });
    }

    return Response.json({ ok: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});