import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event_id, action } = body; // action: 'create' | 'update' | 'delete'

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Get the event
    const events = await base44.entities.Event.filter({ id: event_id });
    const event = events[0];

    if (!event && action !== 'delete') {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const calendarId = 'primary';

    if (action === 'delete' && event?.gcal_event_id) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.gcal_event_id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok && res.status !== 404) {
        const err = await res.text();
        return Response.json({ error: err }, { status: res.status });
      }
      await base44.entities.Event.update(event_id, { gcal_event_id: null, gcal_synced: false });
      return Response.json({ success: true, action: 'deleted' });
    }

    const gcalEvent = {
      summary: event.name,
      description: event.description || '',
      location: event.location || '',
      start: { dateTime: event.date_start, timeZone: 'Europe/Madrid' },
      end: { dateTime: event.date_end || event.date_start, timeZone: 'Europe/Madrid' },
    };

    let gcalEventId = event.gcal_event_id;
    let method = 'POST';
    let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    if (action === 'update' && gcalEventId) {
      method = 'PUT';
      url = `${url}/${gcalEventId}`;
    }

    const res = await fetch(url, {
      method,
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
    await base44.entities.Event.update(event_id, {
      gcal_event_id: created.id,
      gcal_synced: true,
    });

    return Response.json({ success: true, gcal_event_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});