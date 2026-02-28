import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { shift_id, personal_id, action } = body; // action: 'create' | 'delete'

    // Get shift and personal details
    const shifts = await base44.entities.Shift.filter({ id: shift_id });
    const shift = shifts[0];

    if (!shift) {
      return Response.json({ error: 'Shift not found' }, { status: 404 });
    }

    const personalData = await base44.entities.Personal.filter({ id: personal_id });
    const personal = personalData[0];

    if (!personal || !personal.email) {
      return Response.json({ error: 'Personal email not found' }, { status: 404 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    const calendarId = 'primary';

    // Calculate shift start and end times
    const [startHour, startMin] = shift.time_start.split(':');
    const [endHour, endMin] = shift.time_end.split(':');
    
    const startDt = new Date(shift.date);
    startDt.setHours(parseInt(startHour), parseInt(startMin), 0);
    
    const endDt = new Date(shift.date);
    endDt.setHours(parseInt(endHour), parseInt(endMin), 0);

    if (action === 'delete') {
      // Find and delete the shift event from Google Calendar
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?q=${encodeURIComponent(shift_id)}`;
      const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      
      if (listRes.ok) {
        const data = await listRes.json();
        const event = data.items?.find(e => e.description?.includes(shift_id));
        if (event?.id) {
          const delRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!delRes.ok && delRes.status !== 404) {
            const err = await delRes.text();
            return Response.json({ error: err }, { status: delRes.status });
          }
        }
      }

      return Response.json({ success: true, action: 'deleted' });
    }

    const gcalEvent = {
      summary: `Turno: ${shift.title || 'Sin título'}`,
      description: `ID Turno: ${shift_id}\nPerfil: ${shift.profile_required}\nUbicación: ${shift.location || 'No especificada'}${shift.notes ? '\nNotas: ' + shift.notes : ''}`,
      location: shift.location || '',
      start: { dateTime: startDt.toISOString(), timeZone: 'Europe/Madrid' },
      end: { dateTime: endDt.toISOString(), timeZone: 'Europe/Madrid' },
      attendees: [{ email: personal.email }],
    };

    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendNotifications=true`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gcalEvent),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const created = await res.json();
    return Response.json({ success: true, gcal_event_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});