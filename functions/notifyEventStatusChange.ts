import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event_id, old_status, new_status } = await req.json();

    if (!event_id || !new_status) {
      return Response.json({ error: 'Missing event_id or new_status' }, { status: 400 });
    }

    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    const event = events[0];
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const STATUS_LABELS = {
      draft: 'Borrador',
      published: 'Publicado',
      in_progress: 'En curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };

    const oldLabel = STATUS_LABELS[old_status] || old_status;
    const newLabel = STATUS_LABELS[new_status] || new_status;

    const title = `Evento actualizado: ${event.name}`;
    const message = `El evento "${event.name}"${event.location ? ` en ${event.location}` : ''} ha cambiado de estado: ${oldLabel} → ${newLabel}.`;

    // Get all staff assigned to this event via Assignments
    const assignments = await base44.asServiceRole.entities.Assignment.filter({ event_id });
    const staffIds = [...new Set(assignments.map(a => a.staff_member_id).filter(Boolean))];

    // Notify each assigned staff member
    for (const staffId of staffIds) {
      const staffList = await base44.asServiceRole.entities.StaffMember.filter({ id: staffId });
      const staff = staffList[0];
      if (!staff?.email) continue;

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: staff.email,
        recipient_name: staff.full_name,
        type: 'event_reminder',
        title,
        message,
        related_id: event_id,
        related_type: 'event',
        read: false,
        email_sent: false,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: staff.email,
        subject: title,
        body: `<p>${message}</p>`,
      });
    }

    // Also notify via Personal assigned (through ShiftAssignments linked to this event)
    const shifts = await base44.asServiceRole.entities.Shift.filter({ order_id: event_id });
    const shiftIds = shifts.map(s => s.id);
    const personalNotified = new Set();

    for (const shiftId of shiftIds) {
      const shiftAssignments = await base44.asServiceRole.entities.ShiftAssignment.filter({ shift_id: shiftId });
      for (const sa of shiftAssignments) {
        if (!sa.personal_id || personalNotified.has(sa.personal_id)) continue;
        personalNotified.add(sa.personal_id);
        const pList = await base44.asServiceRole.entities.Personal.filter({ id: sa.personal_id });
        const p = pList[0];
        if (!p?.email) continue;

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: p.email,
          recipient_name: `${p.first_name} ${p.last_name}`,
          type: 'event_reminder',
          title,
          message,
          related_id: event_id,
          related_type: 'event',
          read: false,
          email_sent: false,
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: p.email,
          subject: title,
          body: `<p>${message}</p>`,
        });
      }
    }

    // Notify all admin users
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');
    for (const admin of admins) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        recipient_name: admin.full_name || admin.email,
        type: 'event_reminder',
        title,
        message,
        related_id: event_id,
        related_type: 'event',
        read: false,
        email_sent: false,
      });
    }

    return Response.json({ ok: true, staffNotified: staffIds.length + personalNotified.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});