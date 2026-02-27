import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Called with: { personal_id, event_id, event_name, event_date, event_place }
    const { personal_id, event_id, event_name, event_date, event_place } = body;

    if (!personal_id || !event_id) {
      return Response.json({ error: 'Missing personal_id or event_id' }, { status: 400 });
    }

    // Get personal member
    const members = await base44.asServiceRole.entities.Personal.filter({ id: personal_id });
    const person = members[0];
    if (!person) return Response.json({ error: 'Personal not found' }, { status: 404 });

    const title = `Nueva asignación: ${event_name || 'Evento'}`;
    const message = `Hola ${person.first_name}, has sido asignado/a al evento "${event_name || 'Evento'}"${event_place ? ` en ${event_place}` : ''}${event_date ? ` el ${event_date}` : ''}.`;

    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: person.email || '',
      recipient_name: `${person.first_name} ${person.last_name}`,
      type: 'assignment',
      title,
      message,
      related_id: event_id,
      related_type: 'event',
      read: false,
      email_sent: false,
    });

    // Send email if person has email
    if (person.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: person.email,
        subject: title,
        body: `<p>${message}</p><p>Por favor, confirma tu asistencia.</p>`,
      });

      // Mark email sent
      const notifs = await base44.asServiceRole.entities.Notification.filter({ related_id: event_id, recipient_email: person.email, type: 'assignment' });
      if (notifs[0]) {
        await base44.asServiceRole.entities.Notification.update(notifs[0].id, { email_sent: true });
      }
    }

    // Notify coordinator if assigned
    if (person.coordinator) {
      const coords = await base44.asServiceRole.entities.Personal.filter({ first_name: person.coordinator });
      const coord = coords.find(c => c.email);
      if (coord?.email) {
        const coordMsg = `El personal ${person.first_name} ${person.last_name} (${person.code}) ha sido asignado al evento "${event_name}".`;
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: coord.email,
          recipient_name: `${coord.first_name} ${coord.last_name}`,
          type: 'assignment',
          title: `Asignación de personal - ${event_name}`,
          message: coordMsg,
          related_id: event_id,
          related_type: 'event',
          read: false,
          email_sent: false,
        });
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: coord.email,
          subject: `Asignación de personal - ${event_name}`,
          body: `<p>${coordMsg}</p>`,
        });
      }
    }

    return Response.json({ ok: true, message: 'Notifications sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});