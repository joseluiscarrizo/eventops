import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let alertsSent = 0;

    // ── 1. Pedidos pendientes con event_date en las próximas 24h ──
    const orders = await base44.asServiceRole.entities.Order.list('-event_date', 200);
    const pendingOrders = orders.filter(o => {
      if (!o.event_date || o.status === 'completed' || o.status === 'cancelled') return false;
      const eventDate = new Date(o.event_date);
      return eventDate >= now && eventDate <= in24h;
    });

    for (const order of pendingOrders) {
      // Avoid duplicate notifications (check if already notified today)
      const existing = await base44.asServiceRole.entities.Notification.filter({
        related_id: order.id,
        type: 'order_alert',
      });
      const alreadyToday = existing.some(n => {
        const d = new Date(n.created_date);
        return d >= new Date(now.toDateString());
      });
      if (alreadyToday) continue;

      const title = `⚠️ Pedido pendiente: ${order.order_number || order.id}`;
      const message = `El pedido ${order.order_number || order.id} para el cliente "${order.client_name || 'Desconocido'}" en "${order.event_place}" tiene fecha ${order.event_date} y está en estado "${order.status}". Requiere atención.`;

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: '',
        recipient_name: 'Equipo',
        type: 'order_alert',
        title,
        message,
        related_id: order.id,
        related_type: 'order',
        read: false,
        email_sent: false,
      });
      alertsSent++;
    }

    // ── 2. Eventos próximos en 24h → notificar personal asignado y admins ──
    const events = await base44.asServiceRole.entities.Event.list('-date_start', 200);
    const upcomingEvents = events.filter(e => {
      if (!e.date_start || e.status === 'completed' || e.status === 'cancelled') return false;
      const start = new Date(e.date_start);
      return start >= now && start <= in24h;
    });

    for (const event of upcomingEvents) {
      const title = `📅 Evento próximo: ${event.name}`;
      const message = `El evento "${event.name}" comienza en menos de 24 horas${event.location ? ` en ${event.location}` : ''}. Por favor, verifica que todo esté preparado.`;

      const notifiedEmails = new Set();

      // Notify staff assigned via StaffMember assignments
      const assignments = await base44.asServiceRole.entities.Assignment.filter({ event_id: event.id });
      const staffIds = [...new Set(assignments.map(a => a.staff_member_id).filter(Boolean))];
      for (const staffId of staffIds) {
        const staffList = await base44.asServiceRole.entities.StaffMember.filter({ id: staffId });
        const staff = staffList[0];
        if (!staff?.email || notifiedEmails.has(staff.email)) continue;

        const existing = await base44.asServiceRole.entities.Notification.filter({ related_id: event.id, type: 'event_reminder', recipient_email: staff.email });
        if (existing.length > 0) { notifiedEmails.add(staff.email); continue; }

        notifiedEmails.add(staff.email);
        await base44.asServiceRole.entities.Notification.create({ recipient_email: staff.email, recipient_name: staff.full_name, type: 'event_reminder', title, message, related_id: event.id, related_type: 'event', read: false, email_sent: false });
        await base44.asServiceRole.integrations.Core.SendEmail({ to: staff.email, subject: title, body: `<p>${message}</p>` });
        alertsSent++;
      }

      // Notify admins
      const users = await base44.asServiceRole.entities.User.list();
      const admins = users.filter(u => u.role === 'admin');
      for (const admin of admins) {
        if (!admin.email || notifiedEmails.has(admin.email)) continue;
        const existing = await base44.asServiceRole.entities.Notification.filter({ related_id: event.id, type: 'event_reminder', recipient_email: admin.email });
        if (existing.length > 0) { notifiedEmails.add(admin.email); continue; }

        notifiedEmails.add(admin.email);
        await base44.asServiceRole.entities.Notification.create({ recipient_email: admin.email, recipient_name: admin.full_name || admin.email, type: 'event_reminder', title, message, related_id: event.id, related_type: 'event', read: false, email_sent: false });
        alertsSent++;
      }
    }

    return Response.json({ ok: true, alertsSent, pendingOrders: pendingOrders.length, upcomingEvents: upcomingEvents.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});