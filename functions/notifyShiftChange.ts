import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // event: { type: 'create'|'update'|'delete', entity_name, entity_id }
    // data: shift data, old_data: previous shift data
    const { event, data, old_data } = body;

    if (!data) return Response.json({ ok: true, skipped: 'no data' });

    // Only notify when shift becomes 'published' or when status changes
    const isNewPublish = event?.type === 'update' &&
      old_data?.status !== 'published' && data.status === 'published';
    const isNew = event?.type === 'create' && data.status === 'published';
    const isCancelled = event?.type === 'update' &&
      old_data?.status !== 'cancelled' && data.status === 'cancelled';

    if (!isNewPublish && !isNew && !isCancelled) {
      return Response.json({ ok: true, skipped: 'no relevant change' });
    }

    // Get assignments for this shift
    const assignments = await base44.asServiceRole.entities.ShiftAssignment.filter({
      shift_id: data.id || event?.entity_id,
      status: 'confirmed',
    });

    if (assignments.length === 0) return Response.json({ ok: true, notified: 0 });

    const shiftLabel = `${data.date || ''} ${data.time_start || ''}–${data.time_end || ''}`;
    const actionLabel = isCancelled ? '❌ cancelado' : (isNew || isNewPublish) ? '✅ publicado' : 'actualizado';
    const title = `Turno ${actionLabel}: ${data.title || shiftLabel}`;

    let notified = 0;
    for (const assignment of assignments) {
      const personList = await base44.asServiceRole.entities.Personal.filter({ id: assignment.personal_id });
      const person = personList[0];
      if (!person) continue;

      const message = `Tu turno del ${shiftLabel}${data.location ? ` en ${data.location}` : ''} ha sido ${actionLabel.replace(/[^\w\s]/gi, '').trim()}.`;

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: person.email || '',
        recipient_name: `${person.first_name} ${person.last_name}`,
        type: 'assignment',
        title,
        message,
        related_id: data.id || event?.entity_id,
        related_type: 'shift',
        read: false,
        email_sent: false,
      });

      if (person.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: person.email,
          subject: title,
          body: `<p>Hola ${person.first_name},</p><p>${message}</p>`,
        });
        notified++;
      }
    }

    return Response.json({ ok: true, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});