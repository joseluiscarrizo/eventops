import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data) return Response.json({ ok: true, skipped: 'no data' });

    // Trigger when absence is created (solicitud) or when status changes to approved/rejected
    const isNew = event?.type === 'create';
    const statusChanged = event?.type === 'update' && old_data?.status !== data.status &&
      (data.status === 'approved' || data.status === 'rejected');

    if (!isNew && !statusChanged) return Response.json({ ok: true, skipped: 'no relevant change' });

    const personList = await base44.asServiceRole.entities.Personal.filter({ id: data.personal_id });
    const person = personList[0];
    const absenceTypeLabels = {
      vacaciones: 'Vacaciones',
      baja_medica: 'Baja médica',
      permiso: 'Permiso',
      otros: 'Otros',
    };
    const typeLabel = absenceTypeLabels[data.type] || data.type;

    if (isNew) {
      // Notify admins of new absence request
      const users = await base44.asServiceRole.entities.User.list();
      const admins = users.filter(u => u.role === 'admin' || u.role === 'planificador');
      const title = `🗓️ Solicitud de ausencia: ${data.personal_name || person?.first_name || 'Personal'}`;
      const message = `${data.personal_name || (person ? `${person.first_name} ${person.last_name}` : 'Personal')} ha solicitado ${typeLabel.toLowerCase()} del ${data.date_start} al ${data.date_end}${data.reason ? `. Motivo: ${data.reason}` : ''}.`;

      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: admin.email,
          recipient_name: admin.full_name,
          type: 'general',
          title,
          message,
          related_id: data.id || event?.entity_id,
          related_type: 'absence',
          read: false,
          email_sent: false,
        });
      }
    } else if (statusChanged && person?.email) {
      // Notify employee of approval/rejection
      const approved = data.status === 'approved';
      const title = `${approved ? '✅' : '❌'} Ausencia ${approved ? 'aprobada' : 'rechazada'}`;
      const message = `Tu solicitud de ${typeLabel.toLowerCase()} del ${data.date_start} al ${data.date_end} ha sido ${approved ? 'aprobada' : 'rechazada'}.`;

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: person.email,
        recipient_name: `${person.first_name} ${person.last_name}`,
        type: 'general',
        title,
        message,
        related_id: data.id || event?.entity_id,
        related_type: 'absence',
        read: false,
        email_sent: false,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: person.email,
        subject: title,
        body: `<p>Hola ${person.first_name},</p><p>${message}</p>`,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});